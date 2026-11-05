"""Verify generated ZIP headers, Unicode filenames and ZIP64 offsets without Azure."""
import io
import struct
import zipfile
import zlib
import runpy
from pathlib import Path

zip_records = runpy.run_path(str(Path(__file__).with_name("upload-collections.py")))["zip_records"]
output = io.BytesIO()
directories = []
fixtures = {"Birthday Photos/Devansh’s Photo.JPG": b"original photo bytes", "Videos/event.mp4": b"original video bytes" * 100}
for name, data in fixtures.items():
    local, central = zip_records(name, len(data), zlib.crc32(data), output.tell(), 1793500000000000000)
    output.write(local)
    output.write(data)
    directories.append(central)
offset = output.tell()
directory = b"".join(directories)
output.write(directory)
output.write(struct.pack("<IQHHIIQQQQ", 0x06064b50, 44, 45, 45, 0, 0, len(fixtures), len(fixtures), len(directory), offset))
output.write(struct.pack("<IIQI", 0x07064b50, 0, offset + len(directory), 1))
output.write(struct.pack("<IHHHHIIH", 0x06054b50, 0, 0, len(fixtures), len(fixtures), len(directory), offset, 0))
output.seek(0)
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    for name, data in fixtures.items():
        assert archive.read(name) == data
local, central = zip_records("large-video.mp4", 8_724_616_471, 12345, 240_000_000_000, 1793500000000000000)
assert struct.unpack_from("<I", local)[0] == 0x04034b50
assert struct.unpack_from("<II", local, 18) == (0xffffffff, 0xffffffff)
assert struct.pack("<QQ", 8_724_616_471, 8_724_616_471) in local
assert struct.pack("<QQQ", 8_724_616_471, 8_724_616_471, 240_000_000_000) in central
print("PASS: ZIP64 headers, folder structure, Unicode filenames, exact bytes and CRC checks.")
