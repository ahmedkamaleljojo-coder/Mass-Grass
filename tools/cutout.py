#!/usr/bin/env python3
"""Cut a product photo out of a solid background (chroma key or white).

1. Sample the backdrop colour from the image border.
2. Mark pixels that look like backdrop, then keep only the backdrop that is
   connected to the border (flood fill), so a garment whose colour is near
   the key is never eaten from the inside.
3. Soften the edge, remove key-colour spill along it, trim, save WebP.

Usage: python3 tools/cutout.py IN.png OUT.webp [--width 900]
Needs: pip install pillow numpy
"""
import argparse

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def cutout(src, dst, width):
    im = Image.open(src).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    h, w, _ = a.shape
    border = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3),
                             a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    key = np.median(border, axis=0)
    kd = key - key.mean()
    coloured = np.linalg.norm(kd) > 40

    if coloured:
        # How far each pixel's chroma leans toward the key hue (shadows included).
        u = kd / np.linalg.norm(kd)
        score = ((a - a.mean(axis=2, keepdims=True)) * u).sum(axis=2)
        bg = np.median(((border - border.mean(axis=1, keepdims=True)) * u).sum(axis=1))
        looks_bg = score > bg * .4
        soft = np.clip((bg * .55 - score) / (bg * .35), 0, 1)
    else:
        dist = np.linalg.norm(a - key, axis=2)
        spread = np.percentile(np.linalg.norm(border - key, axis=1), 98)
        looks_bg = dist < spread + 18
        soft = np.clip((dist - spread - 10) / 50, 0, 1)

    # Backdrop = backdrop-looking pixels reachable from the border.
    m = Image.fromarray(np.where(looks_bg, 255, 0).astype(np.uint8))
    m = m.filter(ImageFilter.MedianFilter(3))
    for x in range(0, w, 8):
        for y in (0, h - 1):
            if m.getpixel((x, y)) == 255:
                ImageDraw.floodfill(m, (x, y), 128)
    for y in range(0, h, 8):
        for x in (0, w - 1):
            if m.getpixel((x, y)) == 255:
                ImageDraw.floodfill(m, (x, y), 128)
    back = np.asarray(m) == 128
    if coloured:
        # Enclosed gaps (inside a hanger, under an arm) that are clearly backdrop.
        strong = Image.fromarray(np.where(score > bg * .45, 255, 0).astype(np.uint8)).filter(ImageFilter.MedianFilter(5))
        back |= np.asarray(strong) > 0
        # Deep shadows in those gaps: dark and still tinted toward the key.
        lum = a.mean(axis=2)
        keyish = np.argmax(a, axis=2) == np.argmax(key)                  # the key's own channel dominates (not dark denim)
        shade = Image.fromarray(np.where((score > bg * .18) & (lum < key.mean() * .75) & keyish, 255, 0).astype(np.uint8)).filter(ImageFilter.MedianFilter(7))
        back |= np.asarray(shade) > 0
    solid = Image.fromarray(np.where(back, 0, 255).astype(np.uint8))
    inner = np.asarray(solid.filter(ImageFilter.MinFilter(5))) > 0      # well inside the piece
    edge_soft = np.asarray(solid.filter(ImageFilter.GaussianBlur(1.1))).astype(np.float32) / 255
    alpha = np.where(inner, 1.0, np.minimum(edge_soft, np.maximum(soft, 0)))

    if coloured:
        # Remove the key hue from edge pixels only.
        edge = alpha < .999
        proj = np.clip(((a - a.mean(axis=2, keepdims=True)) * u).sum(axis=2), 0, None)
        a = np.where(edge[..., None], a - proj[..., None] * u, a)

    rgba = np.dstack([a, alpha * 255]).clip(0, 255).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")
    out = out.crop(out.getbbox())
    if width and out.width > width:
        out = out.resize((width, round(out.height * width / out.width)), Image.LANCZOS)
    out.save(dst, "WEBP", quality=88, method=6)
    print(f"{dst}: {out.width}x{out.height}, key={key.round().astype(int).tolist()}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("src"); p.add_argument("dst")
    p.add_argument("--width", type=int, default=900)
    args = p.parse_args()
    cutout(args.src, args.dst, args.width)
