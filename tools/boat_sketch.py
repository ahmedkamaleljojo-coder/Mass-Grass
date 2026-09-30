#!/usr/bin/env python3
"""Turn a real photo from Farah's life into an ink drawing on paper for the story page,
in the spirit of SBS's "The Boat": loose ink lines, a few flat grey-brown washes, paper grain.

Usage: python3 tools/boat_sketch.py IN.jpg assets/products/story/photos/NAME.webp [--width 1100]
Then add it to the step in content/story.json:  "photos": [{"src": "/assets/products/story/photos/NAME.webp"}]
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
    w = min(a.width, w0); h = int(h0 * w / w0)
    img = cv2.resize(img, (w, h), interpolation=cv2.INTER_AREA)
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    g = cv2.bilateralFilter(g, 7, .12, 5)

    # ink lines: extended difference of Gaussians, thresholded softly
    s = 1.1 * w / 1100
    d = gaussian_filter(g, s) - .985 * gaussian_filter(g, s * 1.6)
    ink = 1 - np.clip(np.tanh(np.maximum(0, -d) * 90), 0, 1)
    ink = np.minimum(ink, 1 - .55 * (gaussian_filter(g, 1.2) < .16))   # deepest shadows fill in

    # washes: the tones posterised into three flat layers, soft-edged like wet ink
    tone = gaussian_filter(g, 2.2 * s)
    wash = np.full_like(tone, 1.0)
    wash[tone < .62] = .80
    wash[tone < .38] = .62
    wash[tone < .18] = .46
    wash = gaussian_filter(wash, 1.5) * (.94 + .1 * noise(h, w, 40, 2))

    v = np.clip(np.minimum(ink, 1) * wash, 0, 1)
    # warm paper and sepia ink
    paper = np.array([248, 243, 233], np.float32) / 255
    inkc = np.array([52, 38, 28], np.float32) / 255
    grain = .97 + .05 * noise(h, w, 2, 5)
    rgb = (inkc + (paper - inkc) * v[..., None]) * grain[..., None]
    Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).save(a.dst, quality=86, method=6)
    print("wrote", a.dst, w, "x", h)


if __name__ == "__main__":
    main()
