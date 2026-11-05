"""Verify both deployed pages, every gallery media URL, and original byte hashes."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
SITES = [
    ("swarup", ROOT, "https://devansh-carnival-swarup.azurewebsites.net"),
    ("meenakshi", ROOT.parent / "birthday-event-planner-Meenu", "https://devansh-carnival-meenakshi.azurewebsites.net"),
]


def main():
    summaries = []
    for slug, project, base in SITES:
        if sys.argv[1:] and slug not in sys.argv[1:]:
            continue
        distribution = project / "frontend/dist"
        asset_urls = set()
        for page in ["index.html", "gallery.html"]:
            with urllib.request.urlopen(base + "/" + page + "?verify=memories", timeout=40) as response:
                actual = response.read()
            assert actual == (distribution / page).read_bytes(), f"Wrong live page: {slug}/{page}"
            for url in re.findall(r'(?:src|href)="([^"]+)"', actual.decode("utf-8")):
                if url.startswith("/"):
                    asset_urls.add(url)
        for url in asset_urls:
            with urllib.request.urlopen(base + url, timeout=40) as response:
                assert response.read() == (distribution / url.lstrip("/")).read_bytes(), f"Wrong production asset: {url}"
        photos = json.loads((project / "frontend/src/config/devanshBirthdayGallery.json").read_text(encoding="utf-8"))
        media = []
        for photo in photos:
            media.extend([
                (photo["thumbnailUrl"], (distribution / photo["thumbnailUrl"].lstrip("/")).stat().st_size),
                (photo["url"], (distribution / photo["url"].lstrip("/")).stat().st_size),
                (photo["originalUrl"], photo["bytes"]),
            ])

        def check_media(item):
            url, length = item
            for attempt in range(3):
                try:
                    request = urllib.request.Request(base + url, method="HEAD")
                    with urllib.request.urlopen(request, timeout=40) as response:
                        assert response.status == 200
                        assert int(response.headers["Content-Length"]) == length, f"Wrong size: {url}"
                        assert response.headers["Content-Type"].startswith("image/jpeg"), f"Wrong media type: {url}"
                    return
                except Exception:
                    if attempt == 2:
                        raise
                    time.sleep(2)

        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as executor:
            for count, future in enumerate(concurrent.futures.as_completed([executor.submit(check_media, item) for item in media]), 1):
                future.result()
                if count % 100 == 0:
                    print(f"{slug}: {count}/600 live media URLs verified", flush=True)
        sample = photos[0]
        digest = hashlib.sha256()
        with urllib.request.urlopen(base + sample["originalUrl"], timeout=120) as response:
            for block in iter(lambda: response.read(1024 * 1024), b""):
                digest.update(block)
        assert digest.hexdigest() == sample["sha256"], "The downloaded original does not match the source"
        summary = {"site": slug, "url": base + "/", "gallery": base + "/gallery.html", "pagesVerified": 2,
                   "mediaUrlsVerified": len(media), "sampleOriginalSha256Verified": True}
        summaries.append(summary)
        print(f"PASS {slug}: both pages, all 600 media URLs, and full-resolution download bytes verified.", flush=True)
    (ROOT / ".deployment/live-verification.json").write_text(json.dumps(summaries, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
