"""Resumable original uploads and server-side ZIP64 archives; secrets stay in memory."""
import argparse
import base64
import concurrent.futures as futures
import datetime as dt
import hashlib
import io
import json
import mimetypes
from pathlib import Path
import struct
import threading
import time
import zipfile
import zlib

from azure.core.exceptions import ResourceNotFoundError
from azure.storage.blob import BlobServiceClient, ContentSettings, generate_blob_sas, BlobSasPermissions
from PIL import Image, ImageOps
from azure_gallery_storage import az, ACCOUNT, GROUP, CONTAINER, ROOT

SOURCES = [
    ("birthday-collection", "Devansh Birthday Collection", Path(r"C:\Users\swaru\OneDrive\Desktop\Devansh Birthday Collection")),
    ("devansh-karthikeya", "Devansh Karthikeya", Path(r"H:\Devansh Karthikeya")),
]
STATE = ROOT / ".deployment/collections"
BLOCK = 16 * 1024**2
COPY_BLOCK = 128 * 1024**2
lock = threading.Lock()
stats = {"bytesSent": 0, "filesReady": 0, "started": time.time(), "phase": "starting"}


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


class RemoteBlob(io.RawIOBase):
    """Seekable range reader for checking ZIP directories without downloading the archive."""
    def __init__(self, blob, size):
        self.blob, self.size, self.position = blob, size, 0

    def seekable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, offset, whence=0):
        self.position = offset if whence == 0 else self.position + offset if whence == 1 else self.size + offset
        return self.position

    def read(self, size=-1):
        length = min(self.size - self.position, self.size if size < 0 else size)
        if length <= 0:
            return b""
        data = self.blob.download_blob(offset=self.position, length=length).readall()
        self.position += len(data)
        return data


def inventory():
    collections = []
    for ident, title, source in SOURCES:
        entries = []
        for file in sorted(source.rglob("*"), key=lambda p: str(p).casefold()):
            if not file.is_file():
                continue
            relative = file.relative_to(source).as_posix()
            size = file.stat().st_size
            suffix = file.suffix.lower()
            kind = "photo" if suffix in (".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp") else "video" if suffix in (".mp4", ".mpeg", ".mov", ".m4v") else "audio" if suffix in (".mp3", ".wav", ".m4a") else "file"
            token = hashlib.sha256(relative.encode()).hexdigest()[:24]
            entry = {"id": token, "filename": file.name, "path": relative, "folder": str(Path(relative).parent).replace("\\", "/"), "group": relative.split("/")[0] if "/" in relative else "Other files", "kind": kind, "bytes": size, "mtimeNs": file.stat().st_mtime_ns, "blob": f"collections/{ident}/originals/{relative}"}
            if kind == "photo":
                entry.update(thumbnailBlob=f"collections/{ident}/thumbnails/{token}.jpg", previewBlob=f"collections/{ident}/previews/{token}.jpg")
            entries.append(entry)
        collections.append({"id": ident, "title": title, "files": entries, "bytes": sum(f["bytes"] for f in entries), "archiveBlob": f"collections/{ident}/archives/{title}.zip"})
    save(STATE / "inventory.json", collections)
    return collections


def source_for(collection, entry):
    root = next(source for ident, _, source in SOURCES if ident == collection["id"])
    return root / entry["path"]


def block_id(index, digest):
    return base64.b64encode(struct.pack(">Q", index) + bytes.fromhex(digest[:32])).decode()


def existing_blocks(blob):
    try:
        committed, uncommitted = blob.get_block_list("all")
        return {b.id: b.size for b in committed + uncommitted}
    except ResourceNotFoundError:
        return {}


def upload_original(service, collection, entry):
    blob = service.get_blob_client(CONTAINER, entry["blob"])
    source = source_for(collection, entry)
    assert source.stat().st_size == entry["bytes"] and source.stat().st_mtime_ns == entry["mtimeNs"], f"Source changed: {entry['path']}"
    try:
        properties = blob.get_blob_properties()
        if properties.size == entry["bytes"] and properties.metadata.get("mtime_ns") == str(entry["mtimeNs"]) and properties.metadata.get("sha256") and properties.metadata.get("crc32"):
            result = dict(properties.metadata)
            with lock:
                stats["filesReady"] += 1
            return collection["id"], entry["id"], result
    except ResourceNotFoundError:
        pass
    existing = existing_blocks(blob)
    sha = hashlib.sha256()
    md5 = hashlib.md5(usedforsecurity=False)
    crc = 0
    blocks = []
    with source.open("rb") as stream:
        index = 0
        while chunk := stream.read(BLOCK):
            sha.update(chunk)
            md5.update(chunk)
            crc = zlib.crc32(chunk, crc)
            bid = block_id(index, hashlib.sha256(chunk).hexdigest())
            if existing.get(bid) != len(chunk):
                blob.stage_block(bid, chunk, length=len(chunk), validate_content=True, timeout=180)
                with lock:
                    stats["bytesSent"] += len(chunk)
            blocks.append(bid)
            index += 1
    if source.stat().st_size != entry["bytes"] or source.stat().st_mtime_ns != entry["mtimeNs"]:
        raise RuntimeError(f"Source changed during upload: {entry['path']}")
    metadata = {"sha256": sha.hexdigest(), "crc32": f"{crc:08x}", "mtime_ns": str(entry["mtimeNs"])}
    blob.commit_block_list(blocks, metadata=metadata, content_settings=ContentSettings(content_type=mimetypes.guess_type(source.name)[0] or "application/octet-stream", content_md5=md5.digest()), timeout=180)
    properties = blob.get_blob_properties()
    assert properties.size == entry["bytes"] and properties.content_settings.content_md5 == md5.digest()
    with lock:
        stats["filesReady"] += 1
    return collection["id"], entry["id"], metadata


def originals(service, collections, workers):
    stats["phase"] = "originals"
    all_files = [(c, e) for c in collections for e in c["files"]]
    # Photos and smaller files become available first; original folder order is retained in the manifest.
    all_files.sort(key=lambda pair: (pair[1]["kind"] != "photo", pair[1]["bytes"]))
    completed = {}
    with futures.ThreadPoolExecutor(max_workers=workers) as executor:
        pending = [executor.submit(upload_original, service, c, e) for c, e in all_files]
        for future in futures.as_completed(pending):
            ident, token, metadata = future.result()
            completed[f"{ident}/{token}"] = metadata
            if len(completed) % 20 == 0:
                save(STATE / "originals.json", completed)
    save(STATE / "originals.json", completed)
    print(f"All {len(completed)} originals committed and integrity-verified.", flush=True)


def derivatives(service, collections, workers):
    stats["phase"] = "previews"
    def process(collection, entry):
        if entry["kind"] != "photo":
            return
        local = STATE / "derivatives" / collection["id"]
        local.mkdir(parents=True, exist_ok=True)
        thumb = local / (entry["id"] + "-thumbnail.jpg")
        preview = local / (entry["id"] + "-preview.jpg")
        if not thumb.exists() or not preview.exists():
            with Image.open(source_for(collection, entry)) as image:
                image.draft("RGB", (1920, 1920))
                image = ImageOps.exif_transpose(image).convert("RGB")
                image.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
                image.save(preview, quality=86, optimize=True)
                image.thumbnail((240, 240), Image.Resampling.LANCZOS)
                image.save(thumb, quality=78, optimize=True)
        for file, field in [(thumb, "thumbnailBlob"), (preview, "previewBlob")]:
            data = file.read_bytes()
            blob = service.get_blob_client(CONTAINER, entry[field])
            try:
                if blob.get_blob_properties().size == len(data):
                    continue
            except ResourceNotFoundError:
                pass
            blob.upload_blob(data, overwrite=True, validate_content=True, content_settings=ContentSettings(content_type="image/jpeg", cache_control="public, max-age=86400"))
    photos = [(c, e) for c in collections for e in c["files"] if e["kind"] == "photo"]
    with futures.ThreadPoolExecutor(max_workers=min(workers, 6)) as executor:
        pending = [executor.submit(process, c, e) for c, e in photos]
        for count, future in enumerate(futures.as_completed(pending), 1):
            future.result()
            if count % 100 == 0:
                print(f"Previews ready: {count}/{len(photos)}", flush=True)


def zip_records(name, size, crc, offset, modified):
    """Stored ZIP64 records; exact source bytes are copied inside Azure, never downloaded again."""
    name = name.encode("utf-8")
    date = dt.datetime.fromtimestamp(modified / 1e9)
    year = max(1980, min(2107, date.year))
    dos_time = (date.hour << 11) | (date.minute << 5) | (date.second // 2)
    dos_date = ((year - 1980) << 9) | (date.month << 5) | date.day
    large = size >= 0xffffffff
    shifted = offset >= 0xffffffff
    extra_data = (struct.pack("<QQ", size, size) if large else b"") + (struct.pack("<Q", offset) if shifted else b"")
    central_extra = struct.pack("<HH", 1, len(extra_data)) + extra_data if extra_data else b""
    local_extra = struct.pack("<HHQQ", 1, 16, size, size) if large else b""
    size32 = 0xffffffff if large else size
    version = 45 if large or shifted else 20
    local = struct.pack("<IHHHHHIIIHH", 0x04034b50, version, 0x800, 0, dos_time, dos_date, crc, size32, size32, len(name), len(local_extra)) + name + local_extra
    central = struct.pack("<IHHHHHHIIIHHHHHII", 0x02014b50, 45, version, 0x800, 0, dos_time, dos_date, crc, size32, size32, len(name), len(central_extra), 0, 0, 0, 0, 0xffffffff if shifted else offset) + name + central_extra
    return local, central


def archive(service, key, collection, metadata):
    blob = service.get_blob_client(CONTAINER, collection["archiveBlob"])
    fingerprint = hashlib.sha256(json.dumps([(e["path"], metadata[f"{collection['id']}/{e['id']}"]["sha256"]) for e in collection["files"]]).encode()).hexdigest()
    try:
        properties = blob.get_blob_properties()
        if properties.metadata.get("inventory_sha256") == fingerprint and properties.metadata.get("verified") == "true":
            collection["archiveBytes"] = properties.size
            print(f"ZIP already verified: {collection['title']}", flush=True)
            return
    except ResourceNotFoundError:
        pass
    existing = existing_blocks(blob)
    operations, blocks, central = [], [], []
    position = 0
    def add(data=None, source=None, offset=0, length=0):
        nonlocal position
        identity = hashlib.sha256(data if data is not None else f"{source.split('?')[0]}|{offset}|{length}|{fingerprint}".encode()).hexdigest()
        bid = block_id(len(blocks), identity)
        size = len(data) if data is not None else length
        blocks.append(bid)
        operations.append((bid, size, data, source, offset))
        position += size
    for entry in collection["files"]:
        crc = int(metadata[f"{collection['id']}/{entry['id']}"]["crc32"], 16)
        local, directory = zip_records(collection["title"] + "/" + entry["path"], entry["bytes"], crc, position, entry["mtimeNs"])
        central.append(directory)
        add(data=local)
        sas = generate_blob_sas(ACCOUNT, CONTAINER, entry["blob"], account_key=key, permission=BlobSasPermissions(read=True), expiry=dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=12), protocol="https")
        source = service.get_blob_client(CONTAINER, entry["blob"]).url + "?" + sas
        for offset in range(0, entry["bytes"], COPY_BLOCK):
            add(source=source, offset=offset, length=min(COPY_BLOCK, entry["bytes"] - offset))
    start = position
    directory = b"".join(central)
    count = len(collection["files"])
    end = struct.pack("<IQHHIIQQQQ", 0x06064b50, 44, 45, 45, 0, 0, count, count, len(directory), start)
    end += struct.pack("<IIQI", 0x07064b50, 0, start + len(directory), 1)
    end += struct.pack("<IHHHHIIH", 0x06054b50, 0, 0, min(count, 0xffff), min(count, 0xffff), min(len(directory), 0xffffffff), min(start, 0xffffffff), 0)
    add(data=directory + end)
    assert len(blocks) <= 50000
    def stage(operation):
        bid, size, data, source, offset = operation
        if existing.get(bid) == size:
            return
        if data is not None:
            blob.stage_block(bid, data, length=size, validate_content=True, timeout=180)
        else:
            blob.stage_block_from_url(bid, source, source_offset=offset, source_length=size, timeout=180)
    with futures.ThreadPoolExecutor(max_workers=12) as executor:
        pending = [executor.submit(stage, operation) for operation in operations]
        for count_ready, future in enumerate(futures.as_completed(pending), 1):
            future.result()
            if count_ready % 300 == 0:
                print(f"{collection['title']} ZIP: {count_ready}/{len(operations)} server-side blocks ready", flush=True)
    blob.commit_block_list(blocks, metadata={"inventory_sha256": fingerprint, "files": str(count), "verified": "false"}, content_settings=ContentSettings(content_type="application/zip", content_disposition=f'attachment; filename="{collection["title"]}.zip"'), timeout=180)
    assert blob.get_blob_properties().size == position
    collection["archiveBytes"] = position
    with zipfile.ZipFile(RemoteBlob(blob, position)) as check:
        assert len(check.infolist()) == len(collection["files"])
        for entry in collection["files"]:
            info = check.getinfo(collection["title"] + "/" + entry["path"])
            expected = metadata[f"{collection['id']}/{entry['id']}"]
            assert info.file_size == entry["bytes"] and info.CRC == int(expected["crc32"], 16)
        sample = min(collection["files"], key=lambda entry: entry["bytes"])
        data = check.read(collection["title"] + "/" + sample["path"])
        assert hashlib.sha256(data).hexdigest() == metadata[f"{collection['id']}/{sample['id']}"]["sha256"]
    blob.set_blob_metadata({"inventory_sha256": fingerprint, "files": str(count), "verified": "true"})
    print(f"ZIP ready: {collection['title']} ({position / 1024**3:.2f} GiB; {count} files)", flush=True)


def publish_manifest(collections):
    public = []
    for collection in collections:
        item = {k: v for k, v in collection.items() if k != "files"}
        item["files"] = [{k: v for k, v in entry.items() if k != "mtimeNs"} for entry in collection["files"]]
        public.append(item)
    save(ROOT / "frontend/public/collections.json", public)


def ready_manifest(service, collections):
    """Publish only committed, verified originals and completed derivative pairs."""
    blobs = {blob.name: blob for blob in service.get_container_client(CONTAINER).list_blobs(name_starts_with="collections/", include=["metadata"])}
    for collection in collections:
        for entry in collection["files"]:
            original = blobs.get(entry["blob"])
            entry["ready"] = bool(original and original.size == entry["bytes"] and original.metadata.get("sha256") and original.metadata.get("crc32"))
            if entry["kind"] == "photo":
                entry["previewReady"] = bool(blobs.get(entry["thumbnailBlob"]) and blobs.get(entry["previewBlob"]))
        archive_blob = blobs.get(collection["archiveBlob"])
        collection["archiveReady"] = bool(archive_blob and archive_blob.metadata.get("inventory_sha256") and archive_blob.metadata.get("verified") == "true")
        if archive_blob:
            collection["archiveBytes"] = archive_blob.size
    publish_manifest(collections)
    return collections


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", choices=["all", "originals", "previews", "archives", "inventory", "manifest"], default="all")
    parser.add_argument("--workers", type=int, default=16)
    args = parser.parse_args()
    collections = inventory()
    print(f"Inventory: {sum(len(c['files']) for c in collections)} files, {sum(c['bytes'] for c in collections)/1024**3:.2f} GiB", flush=True)
    if args.phase == "inventory":
        publish_manifest(collections)
        return
    key = az("storage", "account", "keys", "list", "--account-name", ACCOUNT, "--resource-group", GROUP)[0]["value"]
    service = BlobServiceClient(f"https://{ACCOUNT}.blob.core.windows.net", credential=key, connection_timeout=30, read_timeout=240, retry_total=6)
    stop = threading.Event()
    def heartbeat():
        while not stop.wait(20):
            with lock:
                snapshot = dict(stats)
            elapsed = time.time() - stats["started"]
            print(f"{snapshot['phase']}: {snapshot['filesReady']} files ready; {snapshot['bytesSent']/1024**3:.2f} GiB sent ({snapshot['bytesSent']/1024**2/max(1,elapsed):.1f} MiB/s)", flush=True)
            save(STATE / "progress.json", snapshot)
    threading.Thread(target=heartbeat, daemon=True).start()
    try:
        if args.phase in ("all", "originals"):
            originals(service, collections, args.workers)
        if args.phase in ("all", "previews"):
            derivatives(service, collections, args.workers)
        if args.phase in ("all", "archives"):
            stats["phase"] = "archives"
            metadata = json.loads((STATE / "originals.json").read_text(encoding="utf-8"))
            for collection in collections:
                archive(service, key, collection, metadata)
        ready_manifest(service, collections)
        save(STATE / "completion.json", {"phase": args.phase, "verified": True, "files": sum(len(c['files']) for c in collections), "bytes": sum(c['bytes'] for c in collections)})
        save(STATE / f"{args.phase}-complete.json", {"verified": True, "time": time.time()})
        print(f"Completed phase: {args.phase}", flush=True)
    finally:
        stop.set()
        service.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # SDK exceptions can contain signed request URLs: do not emit them.
        status = getattr(error, "status_code", None)
        code = getattr(error, "error_code", None)
        print(f"Collection upload stopped ({type(error).__name__}, status={status}, code={code}); completed files and blocks are resumable.", flush=True)
        raise SystemExit(1)
