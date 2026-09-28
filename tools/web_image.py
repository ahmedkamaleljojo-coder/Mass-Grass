#!/usr/bin/env python3
"""Turn a full-size export (PNG from Canva) into a web image.

Optionally trims transparent margins (for cut-outs), resizes to a width and
writes WebP. Keeps the alpha channel.

Usage: python3 tools/web_image.py IN.png OUT.webp [--width 900] [--trim] [--pad 6]
Needs: pip install pillow
"""
import argparse

from PIL import Image


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src"); p.add_argument("dst")
    p.add_argument("--width", type=int, default=900)
    p.add_argument("--trim", action="store_true", help="crop to the non-transparent area")
    p.add_argument("--pad", type=int, default=6, help="margin kept around a trimmed subject (px)")
    p.add_argument("--quality", type=int, default=86)
    a = p.parse_args()

    im = Image.open(a.src)
    im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
    if a.trim and im.mode == "RGBA":
        box = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
        if box:
            l, t, r, b = box
            im = im.crop((max(0, l - a.pad), max(0, t - a.pad), min(im.width, r + a.pad), min(im.height, b + a.pad)))
    if im.width > a.width:
        im = im.resize((a.width, round(im.height * a.width / im.width)), Image.LANCZOS)
    im.save(a.dst, "WEBP", quality=a.quality, method=6, alpha_quality=95)
    print(f"{a.dst}: {im.width}x{im.height}")


if __name__ == "__main__":
    main()
