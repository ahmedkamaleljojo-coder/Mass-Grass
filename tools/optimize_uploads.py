#!/usr/bin/env python3
"""Make images uploaded from the content panel light enough for the web.

Every JPG / PNG / HEIC in assets/uploads/ becomes a WebP no longer than 2000 px on its
long edge (turned the right way up), the original is removed, and every content file
that pointed at the original now points at the WebP. WebP files that are too large are
resized in place. Runs on GitHub Actions after each upload (.github/workflows/optimize-uploads.yml);
it can also be run by hand: python3 tools/optimize_uploads.py
Needs: pip install pillow pillow-heif
"""
import pathlib

from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:  # HEIC photos are skipped without it
    pass

ROOT = pathlib.Path(__file__).resolve().parent.parent
UPLOADS = ROOT / "assets" / "uploads"
LONG_EDGE = 2000
CONVERT = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".tif", ".tiff", ".bmp"}


def web_name(src):
    dst = src.with_suffix(".webp")
    n = 2
    while dst.exists():
        dst = src.with_name(f"{src.stem}-{n}.webp")
        n += 1
    return dst


def shrink(im):
    im = ImageOps.exif_transpose(im)
    if max(im.size) > LONG_EDGE:
        im.thumbnail((LONG_EDGE, LONG_EDGE), Image.LANCZOS)
    return im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")


def main():
    renamed = {}
    for src in sorted(UPLOADS.rglob("*")):
        if not src.is_file():
            continue
        ext = src.suffix.lower()
        try:
            if ext in CONVERT:
                dst = web_name(src)
                shrink(Image.open(src)).save(dst, "WEBP", quality=86, method=6)
                renamed["/" + src.relative_to(ROOT).as_posix()] = "/" + dst.relative_to(ROOT).as_posix()
                src.unlink()
                print(f"{src.name} -> {dst.name}")
            elif ext == ".webp":
                im = Image.open(src)
                if max(im.size) > LONG_EDGE:
                    shrink(im).save(src, "WEBP", quality=86, method=6)
                    print(f"{src.name} resized")
        except Exception as e:  # a broken upload must not stop the others
            print(f"skipped {src.name}: {e}")
    if not renamed:
        return
    for f in (ROOT / "content").rglob("*.json"):
        text = f.read_text(encoding="utf-8")
        new = text
        for old, nw in renamed.items():
            new = new.replace(f'"{old}"', f'"{nw}"')
        if new != text:
            f.write_text(new, encoding="utf-8")
            print(f"updated {f.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
