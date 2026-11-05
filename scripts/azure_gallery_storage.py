"""Configure the approved shared photo store and upload exact originals.

Azure credentials and upload SAS values remain in process memory only.
"""
import base64
import concurrent.futures
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
ACCOUNT = "devanshbirthdayphotos26"
GROUP = "devansh-carnival_first-rg"
CONTAINER = "birthday-originals"
AZ = r"C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
SITES = ["devansh-carnival-Swarup", "devansh-carnival-Meenakshi"]


def az(*args, env=None):
    result = subprocess.run([AZ, *args, "--only-show-errors", "-o", "json"], capture_output=True, text=True, env=env)
    if result.returncode:
        # Never echo credential-bearing results or command output.
        raise RuntimeError(f"Azure command {' '.join(args[:3])} failed (exit {result.returncode})")
    return json.loads(result.stdout) if result.stdout.strip() else None


def main():
    account = az("storage", "account", "show", "--name", ACCOUNT, "--resource-group", GROUP)
    if account["provisioningState"] != "Succeeded":
        raise RuntimeError("The storage account is not ready")
    key = az("storage", "account", "keys", "list", "--account-name", ACCOUNT, "--resource-group", GROUP)[0]["value"]
    storage_env = {**os.environ, "AZURE_STORAGE_ACCOUNT": ACCOUNT, "AZURE_STORAGE_KEY": key}
    az("storage", "container", "create", "--name", CONTAINER, "--public-access", "off", "--auth-mode", "key", env=storage_env)
    base_url = account["primaryEndpoints"]["blob"].rstrip("/") + "/" + CONTAINER
    scope = account["id"] + "/blobServices/default/containers/" + CONTAINER
    for site in ([] if "--upload-only" in sys.argv else SITES):
        identity = az("webapp", "identity", "assign", "--resource-group", GROUP, "--name", site)
        az("role", "assignment", "create", "--assignee-object-id", identity["principalId"],
           "--assignee-principal-type", "ServicePrincipal", "--role", "Storage Blob Data Reader", "--scope", scope)
        az("webapp", "config", "appsettings", "set", "--resource-group", GROUP, "--name", site,
           "--settings", "BIRTHDAY_ORIGINALS_BASE_URL=" + base_url)
        print(f"Configured read-only photo access for {site}", flush=True)
    expiry = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=6)).strftime("%Y-%m-%dT%H:%MZ")
    sas = az("storage", "account", "generate-sas", "--services", "b", "--resource-types", "co",
             "--permissions", "aclrw", "--expiry", expiry, "--https-only", env=storage_env)
    photos = json.loads((ROOT / "frontend/src/config/devanshBirthdayGallery.json").read_text(encoding="utf-8"))

    def upload(photo):
        url = base_url + "/" + urllib.parse.quote(photo["filename"]) + "?" + sas
        for attempt in range(4):
            try:
                try:
                    with urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=30) as response:
                        if int(response.headers.get("Content-Length", 0)) == photo["bytes"] and response.headers.get("x-ms-meta-sha256") == photo["sha256"]:
                            return photo["bytes"]
                except urllib.error.HTTPError as error:
                    if error.code != 404:
                        raise
                source = ROOT / "frontend/public" / photo["originalUrl"].lstrip("/")
                checksum = hashlib.md5(usedforsecurity=False)
                with source.open("rb") as stream:
                    for block in iter(lambda: stream.read(1024 * 1024), b""):
                        checksum.update(block)
                md5 = base64.b64encode(checksum.digest()).decode("ascii")
                headers = {
                    "x-ms-blob-type": "BlockBlob", "x-ms-version": "2023-11-03",
                    "Content-Length": str(photo["bytes"]), "Content-Type": "image/jpeg",
                    "Content-MD5": md5, "x-ms-meta-sha256": photo["sha256"],
                    "x-ms-blob-cache-control": "public, max-age=3600",
                }
                with source.open("rb") as stream:
                    request = urllib.request.Request(url, data=stream, headers=headers, method="PUT")
                    with urllib.request.urlopen(request, timeout=180) as response:
                        if response.status != 201:
                            raise RuntimeError("Upload returned an unexpected status")
                with urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=30) as response:
                    if int(response.headers["Content-Length"]) != photo["bytes"] or response.headers.get("Content-MD5") != md5:
                        raise RuntimeError("Uploaded photo failed its integrity check")
                return photo["bytes"]
            except Exception as error:
                status = error.code if isinstance(error, urllib.error.HTTPError) else type(error).__name__
                if attempt == 3:
                    raise RuntimeError(f"Upload failed for {photo['filename']} ({status})") from None
                time.sleep(2 ** (attempt + 1))

    print(f"Uploading {len(photos)} untouched originals to the shared private container", flush=True)
    started = time.monotonic()
    uploaded_bytes = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
        futures = [executor.submit(upload, photo) for photo in photos]
        for count, future in enumerate(concurrent.futures.as_completed(futures), 1):
            uploaded_bytes += future.result()
            if count % 10 == 0 or count == len(photos):
                seconds = max(1, time.monotonic() - started)
                print(f"Originals ready: {count}/{len(photos)} ({uploaded_bytes / 1024**3:.2f} GiB; {uploaded_bytes / 1024**2 / seconds:.1f} MiB/s)", flush=True)
    output = ROOT / ".deployment"
    output.mkdir(exist_ok=True)
    (output / "storage-upload-summary.json").write_text(json.dumps({
        "account": ACCOUNT, "container": CONTAINER, "originalsBaseUrl": base_url,
        "photos": len(photos), "bytes": uploaded_bytes, "verified": True,
    }, indent=2), encoding="utf-8")
    print("All 200 original uploads verified; both sites have read-only storage access.", flush=True)


if __name__ == "__main__":
    main()
