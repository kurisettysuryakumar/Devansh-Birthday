"""Deploy one explicitly mapped birthday site using the existing Azure login."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
AZ = r"C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
GROUP = "devansh-carnival_first-rg"
TARGETS = {
    "swarup": ("devansh-carnival-Swarup", ROOT),
    "meenakshi": ("devansh-carnival-Meenakshi", ROOT.parent / "birthday-event-planner-Meenu"),
}


def az(*args):
    result = subprocess.run([AZ, *args, "--only-show-errors", "-o", "json"], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f"Azure command {' '.join(args[:3])} failed (exit {result.returncode})")
    return json.loads(result.stdout) if result.stdout.strip() else None


def main():
    slug = sys.argv[1]
    site, project = TARGETS[slug]
    prepare_only = "--prepare-runtime" in sys.argv
    home_only = not (project / "frontend/gallery.html").exists()
    if not prepare_only and not home_only:
        upload = json.loads((ROOT / ".deployment/storage-upload-summary.json").read_text())
        assert upload["photos"] == 200 and upload["verified"]
    patch_only = "--patch" in sys.argv
    if home_only and patch_only:
        raise RuntimeError("Use a full deployment to remove the old gallery page and media")
    archive = ROOT / ".deployment" / (slug + ("-downloads-patch.zip" if patch_only else "-memories.zip"))
    assert archive.is_file() and archive.stat().st_size < 200 * 1024**2
    base = "https://" + site.lower() + ".azurewebsites.net"
    scm = "https://" + site.lower() + ".scm.azurewebsites.net"
    token = az("account", "get-access-token")["accessToken"]

    def kudu(path, data=None, method="GET", content_type="application/json"):
        request = urllib.request.Request(scm + path, data=data, method=method, headers={
            "Authorization": "Bearer " + token, "Content-Type": content_type, "If-Match": "*",
        })
        return urllib.request.urlopen(request, timeout=60)

    backup = ROOT / ".deployment/backups" / slug
    backup.mkdir(parents=True, exist_ok=True)
    if not (backup / "index.html").exists():
        with kudu("/api/vfs/site/wwwroot/index.html") as response:
            (backup / "index.html").write_bytes(response.read())
        config = az("webapp", "config", "show", "--resource-group", GROUP, "--name", site)
        (backup / "startup.json").write_text(json.dumps({"appCommandLine": config["appCommandLine"]}), encoding="utf-8")
    old_startup = json.loads((backup / "startup.json").read_text())["appCommandLine"]
    runtime = (ROOT / "deployment/server.mjs").read_bytes()
    with kudu("/api/vfs/site/wwwroot/server.mjs", runtime, "PUT", "text/javascript") as response:
        assert response.status in (200, 201, 204)
    with kudu("/api/vfs/site/wwwroot/server.mjs") as response:
        assert hashlib.sha256(response.read()).digest() == hashlib.sha256(runtime).digest()
    current_startup = az("webapp", "config", "show", "--resource-group", GROUP, "--name", site, "--query", "appCommandLine")
    if current_startup != "node /home/site/wwwroot/server.mjs":
        az("webapp", "config", "set", "--resource-group", GROUP, "--name", site,
           "--startup-file", "node /home/site/wwwroot/server.mjs", "--query", "appCommandLine")
    print(f"{slug}: download runtime installed; waiting for startup", flush=True)
    photos = [] if home_only else json.loads((project / "frontend/src/config/devanshBirthdayGallery.json").read_text(encoding="utf-8"))
    for attempt in range(36):
        try:
            with urllib.request.urlopen(base + "/healthz", timeout=15) as response:
                assert json.load(response)["status"] == "ok"
            if photos:
                request = urllib.request.Request(base + photos[0]["originalUrl"], method="HEAD")
                with urllib.request.urlopen(request, timeout=20) as response:
                    assert int(response.headers["Content-Length"]) == photos[0]["bytes"]
            break
        except Exception:
            if attempt == 35:
                az("webapp", "config", "set", "--resource-group", GROUP, "--name", site,
                   "--startup-file", old_startup, "--query", "appCommandLine")
                raise RuntimeError("Download runtime did not become healthy; previous startup was restored") from None
            if attempt % 3 == 0:
                print(f"{slug}: waiting for the site and storage identity ({attempt + 1}/36)", flush=True)
            time.sleep(5)
    if prepare_only:
        print(f"{slug}: live original download route verified; current design remains available until the gallery upload finishes", flush=True)
        return
    print(f"{slug}: live original download route verified; publishing the completed design", flush=True)
    result = az("webapp", "deploy", "--resource-group", GROUP, "--name", site,
                "--src-path", str(archive), "--type", "zip", "--clean", "true" if home_only else "false", "--restart", "false",
                "--async", "true", "--track-status", "false", "--enable-kudu-warmup", "false", "--timeout", "600000")
    deployment_id = result.get("id") or result.get("deploymentId")
    print(f"{slug}: deployment accepted" + (f" ({deployment_id})" if deployment_id else ""), flush=True)
    status_path = "/api/deployments/" + str(deployment_id or "latest")
    for attempt in range(60):
        with kudu(status_path) as response:
            status = json.load(response)
        if status["status"] == 4:
            break
        if status["status"] == 3:
            raise RuntimeError(f"Azure reported deployment failure for {slug}")
        if attempt == 59:
            raise RuntimeError(f"Deployment for {slug} is still running; resume polling instead of redeploying")
        if attempt % 3 == 0:
            print(f"{slug}: Azure deployment status {status['status']}", flush=True)
        time.sleep(5)
    for filename in (["index.html"] if home_only else ["index.html", "gallery.html"]):
        expected = (project / "frontend/dist" / filename).read_bytes()
        request = urllib.request.Request(base + "/" + filename + "?deployment=memories", headers={"Cache-Control": "no-cache"})
        with urllib.request.urlopen(request, timeout=30) as response:
            assert response.read() == expected, f"Live {filename} does not match the built site"
    summary = {"site": site, "url": base + "/", "deploymentId": status["id"], "status": "succeeded", "pagesVerified": True}
    (ROOT / ".deployment" / (slug + "-deployment-result.json")).write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"{slug}: DEPLOYED and verified {'home page' if home_only else 'home + gallery'} at {base}", flush=True)


if __name__ == "__main__":
    main()
