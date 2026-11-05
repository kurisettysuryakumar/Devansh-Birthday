"""Exercise the actual server-side ZIP copy with private, disposable fixture blobs."""
import hashlib
import importlib.util
import time
import uuid
import zlib
from azure.storage.blob import BlobServiceClient
from azure_gallery_storage import ROOT, az, ACCOUNT, GROUP, CONTAINER

spec = importlib.util.spec_from_file_location("collection_upload", ROOT / "scripts/upload-collections.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
key = az("storage", "account", "keys", "list", "--account-name", ACCOUNT, "--resource-group", GROUP)[0]["value"]
service = BlobServiceClient(f"https://{ACCOUNT}.blob.core.windows.net", credential=key)
prefix = "collections/.verification/" + uuid.uuid4().hex
collection = {"id": "fixture", "title": "Archive verification", "archiveBlob": prefix + "/verification.zip", "files": []}
metadata = {}
created = []
try:
    for index, (name, data) in enumerate([("Photos/Devansh’s photo.JPG", b"original-photo-fixture" * 128), ("Videos/Birthday video.mp4", bytes(range(256)) * 4096)]):
        blob_name = prefix + "/originals/" + name
        service.get_blob_client(CONTAINER, blob_name).upload_blob(data, overwrite=False, validate_content=True)
        created.append(blob_name)
        entry = {"id": str(index), "path": name, "blob": blob_name, "bytes": len(data), "mtimeNs": time.time_ns()}
        collection["files"].append(entry)
        metadata[f"fixture/{index}"] = {"sha256": hashlib.sha256(data).hexdigest(), "crc32": f"{zlib.crc32(data):08x}"}
    created.append(collection["archiveBlob"])
    module.archive(service, key, collection, metadata)
    print("PASS: Azure server-side ZIP assembly, ranged ZIP64 verification and Unicode source paths.", flush=True)
finally:
    for blob_name in created:
        service.get_blob_client(CONTAINER, blob_name).delete_blob(delete_snapshots="include")
    service.close()
