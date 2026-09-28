#!/usr/bin/env python3
"""Make a white garment recolourable.

Takes a cut-out photo (RGBA, from tools/cutout.py) of a white piece and:
1. Finds the fabric: pale, colourless pixels connected to one or more seed
   points on the garment (so skin, hair, a wooden hanger or a white wall
   elsewhere never join in).
2. Writes the fabric as a soft mask (in the alpha channel), NAME-mask.webp.
3. Turns the fabric in the photo neutral grey (keeping its folds), so the
   browser can multiply any colour onto it cleanly.

Usage: python3 tools/garment_mask.py IN.webp OUT.webp --seed .5,.45 [--seed .3,.6]
Needs: pip install pillow numpy
"""
import argparse

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def mask(src, dst, seeds, sat_max, lum_min):
    im = Image.open(src).convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    lum = rgb @ np.array([.299, .587, .114], np.float32)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    fabric = (alpha > 128) & (sat < sat_max) & (lum > lum_min)

    m = Image.fromarray(np.where(fabric, 255, 0).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))
    w, h = m.size
    for sx, sy in seeds:
        x, y = round(sx * w), round(sy * h)
        if m.getpixel((x, y)) == 128:
            continue                                   # already reached from an earlier seed
        if m.getpixel((x, y)) != 255:
            raise SystemExit(f"seed {sx},{sy} is not on the fabric (lum {lum[y, x]:.0f}, sat {sat[y, x]:.0f})")
        ImageDraw.floodfill(m, (x, y), 128)
    keep = Image.fromarray(np.where(np.asarray(m) == 128, 255, 0).astype(np.uint8))
    # close seams and small holes (stitching, shadows in folds), then soften the edge
    keep = keep.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    soft = np.asarray(keep.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
    soft *= alpha / 255

    # neutral grey fabric, lifted so its bright folds sit near white
    top = np.percentile(lum[soft > .9], 98) if (soft > .9).any() else 255
    grey = np.repeat(np.clip(lum * 250 / top, 0, 255)[..., None], 3, axis=2)
    out = rgb * (1 - soft[..., None]) + grey * soft[..., None]
    Image.fromarray(np.dstack([out, alpha]).clip(0, 255).astype(np.uint8), "RGBA").save(dst, "WEBP", quality=88, method=6)
    mpath = dst.rsplit(".", 1)[0] + "-mask.webp"
    black = np.zeros(soft.shape + (3,), np.uint8)       # the mask lives in the alpha channel
    Image.fromarray(np.dstack([black, (soft * 255).astype(np.uint8)]), "RGBA").save(mpath, "WEBP", lossless=True, method=6)
    print(f"{dst} + {mpath}: fabric {soft.mean() * 100:.1f}% of the frame")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("src"); p.add_argument("dst")
    p.add_argument("--seed", action="append", required=True, help="x,y as fractions of the image")
    p.add_argument("--sat", type=float, default=30, help="max colourfulness of fabric (0-255)")
    p.add_argument("--lum", type=float, default=70, help="min brightness of fabric (0-255)")
    args = p.parse_args()
    mask(args.src, args.dst, [tuple(map(float, s.split(","))) for s in args.seed], args.sat, args.lum)
