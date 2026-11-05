"""Supervise the long transfer, publish progress, build ZIPs and finish both authorized deployments."""
import argparse
import concurrent.futures
import ctypes
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request

from azure.storage.blob import BlobServiceClient
from azure_gallery_storage import az, ROOT, ACCOUNT, GROUP, CONTAINER

spec = importlib.util.spec_from_file_location("collection_upload", ROOT / "scripts/upload-collections.py")
uploader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(uploader)
STATE = ROOT / ".deployment/collections"
PYTHON = str(ROOT / ".venv/Scripts/python.exe")
TARGETS = {"swarup": ROOT, "meenakshi": ROOT.parent / "birthday-event-planner-Meenu"}
finished = threading.Event()
publication_lock = threading.Lock()


def running(pid):
    if not pid:
        return False
    kernel = ctypes.windll.kernel32
    kernel.OpenProcess.restype = ctypes.c_void_p
    handle = kernel.OpenProcess(0x1000, False, pid)
    if not handle:
        return False
    try:
        code = ctypes.c_ulong()
        kernel.GetExitCodeProcess(ctypes.c_void_p(handle), ctypes.byref(code))
        return code.value == 259
    finally:
        kernel.CloseHandle(ctypes.c_void_p(handle))


def run_step(script, *args):
    result = subprocess.run([PYTHON, str(ROOT / "scripts" / script), *args], cwd=ROOT)
    if result.returncode:
        raise RuntimeError(f"{script} exited {result.returncode}")


def retry_step(script, *args):
    for attempt in range(1, 13):
        try:
            run_step(script, *args)
            return
        except RuntimeError:
            print(f"Retrying {script} after a resumable interruption (attempt {attempt}/12).", flush=True)
            if attempt == 12:
                raise
            time.sleep(60)


def wait_for(pid, description):
    if running(pid):
        print(f"Supervising the existing {description} process {pid}.", flush=True)
    while running(pid):
        time.sleep(20)


def publisher(service, collections):
    token = None
    token_time = 0
    deployed = set()
    last_hash = {}
    previous = None
    completion_error = None
    while True:
        try:
            with publication_lock:
                uploader.ready_manifest(service, collections)
                data = (ROOT / "frontend/public/collections.json").read_bytes()
                for project in TARGETS.values():
                    for path in [project / "frontend/public/collections.json", project / "frontend/dist/collections.json"]:
                        if path != ROOT / "frontend/public/collections.json":
                            path.write_bytes(data)
                digest = hashlib.sha256(data).hexdigest()
            if time.time() - token_time > 2400:
                token = az("account", "get-access-token")["accessToken"]
                token_time = time.time()
            for slug in TARGETS:
                base = f"https://devansh-carnival-{slug}.azurewebsites.net"
                try:
                    with urllib.request.urlopen(base + "/healthz", timeout=15) as response:
                        assert response.status == 200
                    if slug not in deployed:
                        # Packages contain the checked design. The current manifest is updated immediately afterward.
                        run_step("deploy-azure-site.py", slug, "--patch")
                        az("webapp", "restart", "--resource-group", GROUP, "--name", "devansh-carnival-Swarup" if slug == "swarup" else "devansh-carnival-Meenakshi")
                        deployed.add(slug)
                        print(f"{slug}: menu-free gallery design deployed and runtime restarted once.", flush=True)
                    if last_hash.get(slug) != digest:
                        request = urllib.request.Request(f"https://devansh-carnival-{slug}.scm.azurewebsites.net/api/vfs/site/wwwroot/collections.json", data=data, method="PUT", headers={"Authorization": "Bearer " + token, "Content-Type": "application/json", "If-Match": "*"})
                        with urllib.request.urlopen(request, timeout=60) as response:
                            assert response.status in (200, 201, 204)
                        last_hash[slug] = digest
                except Exception as error:
                    # Only status/type are logged; credentials and signed URLs never enter the logs.
                    print(f"{slug}: publication waiting ({type(error).__name__}, HTTP {getattr(error, 'code', 'n/a')}).", flush=True)
            ready = sum(sum(bool(entry["ready"]) for entry in collection["files"]) for collection in collections)
            previews = sum(sum(bool(entry.get("previewReady")) for entry in collection["files"]) for collection in collections)
            archives = sum(bool(collection["archiveReady"]) for collection in collections)
            snapshot = (ready, previews, archives, len(deployed))
            if snapshot != previous:
                print(f"Gallery publication: {ready}/2756 original files, {previews}/2065 photo previews, {archives}/2 ZIPs; {len(deployed)}/2 sites deployed.", flush=True)
                previous = snapshot
            uploader.save(STATE / "workflow-status.json", {"originalsReady": ready, "originalsTotal": 2756, "previewsReady": previews, "previewsTotal": 2065, "archivesReady": archives, "sitesDeployed": sorted(deployed), "finished": False, "updated": time.time()})
            if finished.is_set() and ready == 2756 and previews == 2065 and archives == 2 and len(deployed) == 2 and all(last_hash.get(slug) == digest for slug in TARGETS):
                try:
                    run_step("verify-collection-sites.py")
                    uploader.save(STATE / "workflow-status.json", {"originalsReady": ready, "previewsReady": previews, "archivesReady": archives, "sitesDeployed": sorted(deployed), "finished": True, "verified": True, "updated": time.time()})
                    print("COMPLETE: Both sites have no menu, all collection files, verified ZIP downloads and direct storage links.", flush=True)
                    return
                except Exception as error:
                    completion_error = type(error).__name__
                    print(f"Final live verification will retry ({completion_error}).", flush=True)
        except Exception as error:
            print(f"Progress publication will retry ({type(error).__name__}).", flush=True)
        time.sleep(60)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--originals-pid", type=int)
    parser.add_argument("--previews-pid", type=int)
    args = parser.parse_args()
    collections = json.loads((STATE / "inventory.json").read_text(encoding="utf-8"))
    key = az("storage", "account", "keys", "list", "--account-name", ACCOUNT, "--resource-group", GROUP)[0]["value"]
    service = BlobServiceClient(f"https://{ACCOUNT}.blob.core.windows.net", credential=key, retry_total=6)
    publication = threading.Thread(target=publisher, args=(service, collections))
    publication.start()
    try:
        wait_for(args.originals_pid, "original upload")
        checkpoint = STATE / "originals.json"
        if not checkpoint.exists() or len(json.loads(checkpoint.read_text(encoding="utf-8"))) != 2756:
            retry_step("upload-collections.py", "--phase", "originals")
        wait_for(args.previews_pid, "photo preview upload")
        # The resumable preview step also checks all previously committed derivative pairs.
        retry_step("upload-collections.py", "--phase", "previews", "--workers", "6")
        retry_step("upload-collections.py", "--phase", "archives")
        finished.set()
        publication.join()
    except Exception as error:
        uploader.save(STATE / "workflow-error.json", {"type": type(error).__name__, "time": time.time()})
        print(f"Workflow needs attention ({type(error).__name__}); completed uploads are preserved.", flush=True)
        # Keep publishing completed files even if a transfer requires attention.
        publication.join()


if __name__ == "__main__":
    main()
