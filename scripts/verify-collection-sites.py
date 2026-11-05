"""Check live gallery assets and direct original/ZIP links without logging signed URLs."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
HOST = "devanshbirthdayphotos26.blob.core.windows.net"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, stream, code, message, headers, new_url):
        return None


def direct_link(base, blob, filename, size):
    endpoint = base + "/collection-media/" + urllib.parse.quote(blob, safe="/") + "?download=1"
    opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(urllib.request.Request(endpoint, headers={"Range": "bytes=0-0"}), timeout=35) as response:
            response.read(1)
        raise AssertionError("Expected a direct storage redirect")
    except urllib.error.HTTPError as error:
        assert error.code == 302, f"Website download route returned HTTP {error.code}"
        assert error.headers.get("Cache-Control") == "private, no-store"
        target = error.headers["Location"]
    parsed = urllib.parse.urlsplit(target)
    parameters = urllib.parse.parse_qs(parsed.query)
    assert parsed.hostname == HOST and parsed.scheme == "https"
    assert urllib.parse.unquote(parsed.path) == "/birthday-originals/" + blob
    assert parameters["sp"] == ["r"] and parameters["sr"] == ["b"]
    assert parameters["rscd"][0].startswith("attachment;")
    if filename.isascii():
        assert f'filename="{filename}"' in parameters["rscd"][0]
    else:
        assert "filename*=UTF-8''" in parameters["rscd"][0]
    with urllib.request.urlopen(urllib.request.Request(target, method="HEAD"), timeout=35) as response:
        assert response.status == 200
        assert int(response.headers["Content-Length"]) == size
    return True


def main():
    sample = "--sample" in sys.argv
    expected = json.loads((ROOT / "frontend/public/collections.json").read_text(encoding="utf-8"))
    totals = []
    for slug, project in [("swarup", ROOT), ("meenakshi", ROOT.parent / "birthday-event-planner-Meenu")]:
        base = f"https://devansh-carnival-{slug}.azurewebsites.net"
        for page in ["index.html", "gallery.html"]:
            with urllib.request.urlopen(base + "/" + page, timeout=35) as response:
                body = response.read()
            assert body == (project / "frontend/dist" / page).read_bytes()
            for asset in re.findall(rb'(?:src|href)="(/assets/[^"?#]+\.(?:js|css))"', body):
                asset = asset.decode()
                with urllib.request.urlopen(base + asset, timeout=35) as response:
                    compiled = response.read()
                assert compiled == (project / "frontend/dist" / asset.lstrip("/")).read_bytes()
                assert b"memory-nav" not in compiled, "Unwanted top menu remains in the deployed build"
        with urllib.request.urlopen(base + "/collections.json", timeout=35) as response:
            manifest = json.load(response)
        assert [(c["id"], len(c["files"])) for c in manifest] == [("birthday-collection", 1713), ("devansh-karthikeya", 1043)]
        checks = []
        for collection in manifest:
            ready = [file for file in collection["files"] if file["ready"]]
            if not sample:
                assert len(ready) == len(collection["files"])
                assert collection["archiveReady"]
                assert all(file.get("previewReady") for file in ready if file["kind"] == "photo")
            selected = ready
            if sample:
                groups = {}
                for file in ready:
                    groups.setdefault((file["group"], file["kind"]), file)
                selected = list(groups.values())
            checks.extend((file["blob"], file["filename"], file["bytes"]) for file in selected)
            if collection["archiveReady"]:
                checks.append((collection["archiveBlob"], collection["title"] + ".zip", collection["archiveBytes"]))
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            pending = [executor.submit(direct_link, base, blob, name, size) for blob, name, size in checks]
            for count, future in enumerate(concurrent.futures.as_completed(pending), 1):
                future.result()
                if count % 250 == 0:
                    print(f"{slug}: {count}/{len(checks)} direct storage downloads verified", flush=True)
        totals.append({"site": slug, "linksVerified": len(checks), "sample": sample, "menuAbsent": True, "pagesAndAssetsMatch": True})
        print(f"PASS {slug}: no top menu, both collection folders, {len(checks)} direct original/ZIP download links.", flush=True)
    (ROOT / ".deployment/collections/live-verification.json").write_text(json.dumps(totals, indent=2), encoding="utf-8")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Live verification failed ({type(error).__name__}, HTTP {getattr(error, 'code', 'n/a')}); no signed URLs logged.", flush=True)
        raise SystemExit(1)
