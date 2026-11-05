"""Verify private-Blob redirects without printing signed URLs or credentials."""
import concurrent.futures
import datetime
import hashlib
import json
from pathlib import Path
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
STORAGE_HOST = "devanshbirthdayphotos26.blob.core.windows.net"
SITES = ["swarup", "meenakshi"]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, stream, code, message, headers, new_url):
        return None


def location_for(base, photo, download=True):
    endpoint = base + photo["originalUrl"] + ("?download=1" if download else "")
    # A one-byte range keeps a temporary streaming fallback from transferring the whole photo.
    request = urllib.request.Request(endpoint, headers={"Range": "bytes=0-0", "Cache-Control": "no-cache"})
    opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(request, timeout=35) as response:
            response.read(1)
        return None
    except urllib.error.HTTPError as error:
        if error.code != 302:
            raise RuntimeError(f"Website returned HTTP {error.code} for the photo link") from None
        assert error.headers.get("Cache-Control") == "private, no-store"
        target = error.headers["Location"]
    url = urllib.parse.urlparse(target)
    query = urllib.parse.parse_qs(url.query)
    assert url.scheme == "https" and url.hostname == STORAGE_HOST
    assert urllib.parse.unquote(url.path) == "/birthday-originals/" + photo["filename"]
    assert query["sp"] == ["r"] and query["sr"] == ["b"]
    assert query["rscd"] == [f'{"attachment" if download else "inline"}; filename="{photo["filename"]}"']
    expiry = datetime.datetime.fromisoformat(query["se"][0].replace("Z", "+00:00"))
    remaining = (expiry - datetime.datetime.now(datetime.timezone.utc)).total_seconds()
    assert 0 < remaining <= 31 * 60
    assert query.get("sig")
    return target


def verify_blob(target, photo, download=True):
    try:
        with urllib.request.urlopen(urllib.request.Request(target, method="HEAD"), timeout=35) as response:
            assert response.status == 200
            assert int(response.headers["Content-Length"]) == photo["bytes"]
            assert response.headers["Content-Type"].startswith("image/jpeg")
            assert response.headers["Content-Disposition"] == f'{"attachment" if download else "inline"}; filename="{photo["filename"]}"'
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"Blob validation returned HTTP {error.code}") from None


def main():
    photos = json.loads((ROOT / "frontend/src/config/devanshBirthdayGallery.json").read_text(encoding="utf-8"))
    summaries = []
    for slug in SITES:
        base = f"https://devansh-carnival-{slug}.azurewebsites.net"
        for attempt in range(48):
            try:
                first = location_for(base, photos[0])
                if first:
                    verify_blob(first, photos[0])
                    break
            except (RuntimeError, urllib.error.URLError, TimeoutError):
                pass
            if attempt == 47:
                raise RuntimeError(f"Direct downloads on {slug} did not become ready")
            if attempt % 3 == 0:
                print(f"{slug}: waiting for direct downloads and Azure permission propagation", flush=True)
            time.sleep(5)

        def check(photo):
            target = location_for(base, photo)
            assert target, f"Photo is still using the fallback: {photo['filename']}"
            verify_blob(target, photo)

        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            for count, future in enumerate(concurrent.futures.as_completed([executor.submit(check, photo) for photo in photos]), 1):
                future.result()
                if count % 50 == 0:
                    print(f"{slug}: {count}/200 direct download links verified", flush=True)
        for photo in [photos[0], photos[-1]]:
            target = location_for(base, photo, False)
            assert target
            verify_blob(target, photo, False)
        sample = photos[0]
        target = location_for(base, sample)
        digest = hashlib.sha256()
        try:
            with urllib.request.urlopen(target, timeout=120) as response:
                for block in iter(lambda: response.read(1024 * 1024), b""):
                    digest.update(block)
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"Original download returned HTTP {error.code}") from None
        assert digest.hexdigest() == sample["sha256"]
        summaries.append({"site": slug, "directLinksVerified": 200, "sampleOriginalSha256Verified": True,
                          "readOnly": True, "linkLifetimeMinutes": 30, "downloadFilenameVerified": True})
        print(f"PASS {slug}: 200 direct downloads, full-size views, original filenames, and original SHA-256 verified.", flush=True)
    (ROOT / ".deployment/direct-download-verification.json").write_text(json.dumps(summaries, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
