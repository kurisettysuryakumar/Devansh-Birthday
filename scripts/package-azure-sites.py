"""Package the built home page, optionally including the existing sister checkout."""
import hashlib
from pathlib import Path
import zipfile
import sys

site = sys.argv[sys.argv.index("--site") + 1] if "--site" in sys.argv else "all"
if site not in ("all", "swarup", "meenakshi"):
    raise ValueError("--site must be swarup, meenakshi, or all")
root = Path(__file__).resolve().parent.parent
output = root / ".deployment"
output.mkdir(exist_ok=True)
patch_only = "--patch" in sys.argv
for slug, project in [
    ("swarup", root),
    ("meenakshi", root.parent / "birthday-event-planner-Meenu"),
]:
    if site not in ("all", slug):
        continue
    if not project.is_dir():
        continue
    distribution = project / "frontend/dist"
    if not (distribution / "index.html").is_file():
        raise RuntimeError(f"Build {project / 'frontend'} before packaging")
    archive = output / (slug + ("-downloads-patch.zip" if patch_only else "-memories.zip"))
    files = sorted(file for file in distribution.rglob("*") if file.is_file() and "originals" not in file.relative_to(distribution).parts)
    if patch_only:
        files = [file for file in files if file.relative_to(distribution).parts[0] not in ("images", "videos")]
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=1) as package:
        for file in files:
            package.write(file, file.relative_to(distribution).as_posix())
        package.write(root / "deployment/server.mjs", "server.mjs")
    print(f"{slug}: {len(files) + 1} files, {archive.stat().st_size / 1024**2:.1f} MiB, SHA-256 {hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest()}")
