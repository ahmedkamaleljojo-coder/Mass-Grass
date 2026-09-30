#!/usr/bin/env python3
"""Turn a photo into a watercolour-style painting on paper (soft washes, pooled
pigment edges, pencil lines, paper grain, ragged wet edge fading into the page).

Usage: python3 tools/watercolor_portrait.py IN.jpg OUT.webp [--width 1100]
Needs: pip install opencv-python-headless scipy pillow numpy
"""
import argparse

import cv2
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter


def noise(h, w, scale, seed):
    r = np.random.RandomState(seed)
    n = r.rand(max(2, h // scale), max(2, w // scale)).astype(np.float32)
    return cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src"); p.add_argument("dst")
    p.add_argument("--width", type=int, default=1100)
    a = p.parse_args()

    img = cv2.imread(a.src)
    h0, w0 = img.shape[:2]
    w = a.width; h = int(h0 * w / w0)
    img = cv2.resize(img, (w, h), interpolation=cv2.INTER_AREA)

    # 1. flatten into washes
    # soft washes: edge-preserving smoothing, then blended back with the photo so faces keep their features
    soft = img
    for _ in range(2):
        soft = cv2.bilateralFilter(soft, 9, 28, 7)
    soft = cv2.edgePreservingFilter(soft, flags=1, sigma_s=30, sigma_r=.28)
    x = (.72 * soft.astype(np.float32) + .28 * img.astype(np.float32)) / 255
    # lift the lights and warm the shadows, like pigment thinned with water
    x = 1 - (1 - x) * .9
    x[..., 0] *= .985

    # 2. pigment granulation: colour density varies with low-frequency noise
    dens = .55 * noise(h, w, 60, 1) + .3 * noise(h, w, 18, 2) + .15 * noise(h, w, 6, 3)
    x = 1 - (1 - x) * (.78 + .44 * dens[..., None])
    # watercolour is lighter and a touch desaturated
    hsv = cv2.cvtColor((x * 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 1] *= .86
    hsv[..., 2] = 255 - (255 - hsv[..., 2]) * .9
    x = cv2.cvtColor(hsv.clip(0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32) / 255

    # 3. pooled pigment at the edges of each wash, and loose pencil lines
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gs = cv2.GaussianBlur(g, (0, 0), 1.6)
    edge = cv2.Canny(gs, 55, 140).astype(np.float32) / 255
    pool = gaussian_filter(edge, 1.3)
    x *= (1 - .10 * pool[..., None])
    pencil = gaussian_filter(edge, .6) * (.4 + .6 * noise(h, w, 4, 5))
    x *= (1 - .10 * pencil[..., None] * np.array([.75, .8, 1], np.float32))

    # 4. ragged wet edge: the painting fades into bare paper
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - w / 2) / (w * .60)) ** 2 + ((yy - h * .5) / (h * .56)) ** 2)
    wob = (noise(h, w, 120, 7) - .5) * .30 + (noise(h, w, 26, 8) - .5) * .10
    m = np.clip((1.0 + wob - d) / .18, 0, 1)
    m = gaussian_filter(m, 2)
    rim = np.clip(1 - np.abs(m - .45) * 4, 0, 1) * .10  # darker ring where the wash dried
    x *= (1 - rim[..., None])

    # 5. paper
    paper = np.array([.98, .965, .935], np.float32)[::-1]  # BGR warm white
    grain = .965 + .07 * noise(h, w, 2, 9) + .03 * noise(h, w, 5, 10)
    out = (paper * grain[..., None]) * (1 - m[..., None]) + (x * grain[..., None]) * m[..., None]
    out = np.clip(out, 0, 1)
    rgb = cv2.cvtColor((out * 255).astype(np.uint8), cv2.COLOR_BGR2RGB)
    Image.fromarray(rgb).save(a.dst, quality=86, method=6)
    print("wrote", a.dst, w, "x", h)


if __name__ == "__main__":
    main()
