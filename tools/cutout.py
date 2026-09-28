#!/usr/bin/env python3
"""Cut a product photo out of a solid background (chroma key or white).

The background colour is sampled from the image border, pixels close to it
become transparent with a soft edge, colour spill on the edges is removed,
and the result is trimmed to the product and saved as WebP with alpha.

Usage: python3 tools/cutout.py IN.png OUT.webp [--width 900]
Needs: pip install pillow numpy
"""
import argparse

import numpy as np
from PIL import Image, ImageFilter


def cutout(src, dst, width):
    im = Image.open(src).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    h, w, _ = a.shape
    border = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3),
                             a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    key = np.median(border, axis=0)

    kd = key - key.mean()
    if np.linalg.norm(kd) > 40:
        # Coloured key (green/magenta): measure how far each pixel's chroma
        # leans toward the key hue, so shadows on the backdrop still key out.
        u = kd / np.linalg.norm(kd)
        score = ((a - a.mean(axis=2, keepdims=True)) * u).sum(axis=2)
        bg = np.median(((border - border.mean(axis=1, keepdims=True)) * u).sum(axis=1))
        alpha = np.clip((bg * .5 - score) / (bg * .35), 0, 1)
    else:
        # Neutral key (white/grey): plain colour distance.
        dist = np.linalg.norm(a - key, axis=2)
        spread = np.percentile(np.linalg.norm(border - key, axis=1), 98)
        lo, hi = spread + 12, spread + 70
        alpha = np.clip((dist - lo) / (hi - lo), 0, 1)

    # Keep only regions connected to the product (drop specks of background noise).
    m = Image.fromarray((alpha * 255).astype(np.uint8))
    m = m.filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    alpha = np.asarray(m).astype(np.float32) / 255

    # Despill: pull the key colour's dominant channel back toward the others.
    ch = int(np.argmax(key))
    others = [c for c in range(3) if c != ch]
    limit = a[..., others].max(axis=2)
    edge = alpha < .98
    a[..., ch] = np.where(edge & (a[..., ch] > limit), limit, a[..., ch])

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
