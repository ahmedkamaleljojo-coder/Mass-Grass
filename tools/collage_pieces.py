"""Build the home collage pieces (assets/products/collage/) from Farah's own work.

Sources (docs/design/collage/src): paintings from her postcard set, the postcard pages themselves,
illustrations from the "Zero Waste" book she illustrated, loose drawings she sent, and photos of
real pins and clips. Each source becomes one kind of piece:

  print    a painting printed with a white border, lying on the paper (shadow)
  sticker  a drawing cut out with a white die-cut edge (shadow)
  painted  a drawing painted straight onto the page: white becomes transparent, no shadow
  photo    a real object or a postcard page as it is (shadow)

Run: python3 tools/collage_pieces.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs/design/collage/src"
OUT = ROOT / "assets/products/collage"


def shadow(im, lift=1.0, strength=0.32):
    """Contact shadow plus a soft cast shadow falling down and to the right."""
    im = im.convert("RGBA")
    w, h = im.size
    s = max(w, h)
    pad = int(s * (0.05 + 0.05 * lift))
    size = (w + 2 * pad, h + 2 * pad)
    alpha = im.split()[3]

    def layer(dx, dy, blur, k):
        m = Image.new("L", size, 0)
        m.paste(alpha, (pad + int(s * dx), pad + int(s * dy)))
        return np.asarray(m.filter(ImageFilter.GaussianBlur(max(1, s * blur)))).astype(float) / 255 * k

    a = 1 - (1 - layer(.014 * lift, .022 * lift, .018 * lift + .004, strength)) * (1 - layer(.002, .003, .003, .2))
    sh = np.zeros((size[1], size[0], 4))
    sh[..., :3] = (46, 36, 26)
    sh[..., 3] = a * 255
    out = Image.fromarray(sh.astype("uint8"), "RGBA")
    out.alpha_composite(im, (pad, pad))
    return out


def ink_mask(im, thresh=236):
    """Where the drawing is: anything clearly darker or more coloured than the white paper."""
    a = np.asarray(im.convert("RGB")).astype(float)
    sat = a.max(2) - a.min(2)
    ink = (a.min(2) < thresh) | (sat > 18)
    ink = ndimage.binary_opening(ink, iterations=1)
    return ndimage.binary_fill_holes(ndimage.binary_closing(ink, iterations=4))


def print_(src, border=.04, tone=(250, 248, 242)):
    art = Image.open(src).convert("RGB")
    w, h = art.size
    b = int(max(w, h) * border)
    sheet = Image.new("RGB", (w + 2 * b, h + 2 * b), tone)
    sheet.paste(art, (b, b))
    return sheet.convert("RGBA")


def sticker(im, edge=.022):
    """Die-cut: the drawing's silhouette grown by a white edge."""
    im = im.convert("RGB")
    w, h = im.size
    ink = ink_mask(im)
    grow = max(4, int(max(w, h) * edge))
    cut = ndimage.binary_dilation(ink, iterations=grow)
    cut = ndimage.binary_fill_holes(cut)
    soft = Image.fromarray((cut * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(1.2))
    white = Image.new("RGB", (w, h), (253, 252, 249))
    a = np.asarray(im).astype(float)
    k = ink[..., None] | (a.min(2, keepdims=True) < 250)
    body = np.where(k, a, 253)
    out = Image.fromarray(body.astype("uint8")).convert("RGBA")
    out.putalpha(soft)
    white.putalpha(soft)
    white.alpha_composite(out)
    return white.crop(white.getbbox())


def painted(src):
    """A drawing straight on the page: paper white turns transparent, light washes stay soft."""
    im = Image.open(src).convert("RGBA")
    a = np.asarray(im).astype(float)
    lum = a[..., :3].min(2)
    alpha = np.clip((252 - lum) / 34, 0, 1)
    if im.mode == "RGBA":
        alpha = np.minimum(alpha, a[..., 3] / 255)
    a[..., 3] = alpha * 255
    out = Image.fromarray(a.astype("uint8"), "RGBA")
    return out.crop(out.getbbox())


def split(im, min_area=.01):
    """The separate drawings on one sheet, largest first."""
    ink = ink_mask(im)
    lab, n = ndimage.label(ndimage.binary_dilation(ink, iterations=12))
    parts = []
    for sl in ndimage.find_objects(lab):
        ys, xs = sl
        if (ys.stop - ys.start) * (xs.stop - xs.start) < min_area * im.width * im.height:
            continue
        pad = 30
        parts.append(im.crop((max(0, xs.start - pad), max(0, ys.start - pad),
                              min(im.width, xs.stop + pad), min(im.height, ys.stop + pad))))
    return parts


def save(im, name, width=900):
    im = im.copy()
    im.thumbnail((width, width), Image.LANCZOS)
    im.save(OUT / f"{name}.webp", quality=86)
    print(name, im.size)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    # paintings as prints
    for n in ("tent-coast", "girl-birds", "girl-oud", "alley", "cart", "fishing", "ramadan", "house"):
        f = next(SRC.glob(f"art-{n}.*"))
        save(shadow(print_(f), .9), f"print-{n}", 900)
    # the real postcards, front and back
    for n in ("front", "back"):
        save(shadow(Image.open(SRC / f"postcard-{n}.jpg"), .8), f"postcard-{n}", 900)
    # Farah's loose drawings as stickers
    sheet = Image.open(SRC / "dr-leaf-tent-candle.jpg")
    for name, part in zip(("st-leaf", "st-tent", "st-candle"), split(sheet)):
        save(shadow(sticker(part), .7), name, 600)
    for n in ("bluebird", "crate"):
        save(shadow(sticker(Image.open(SRC / f"dr-{n}.jpg")), .7), f"st-{n}", 700)
    jar = Image.open(SRC / "bk-jar.png").convert("RGBA")
    flat = Image.new("RGBA", jar.size, (255, 255, 255, 255))
    flat.alpha_composite(jar)
    save(shadow(sticker(flat), .7), "st-jar", 500)
    # drawings painted straight on the page
    save(painted(SRC / "dr-woman-doves.jpg"), "pt-woman-doves", 1000)
    save(painted(SRC / "dr-boating.jpg"), "pt-boating", 1000)
    for n in ("laundry", "olive", "fig", "lavender", "oranges", "towel", "soap", "basket", "bread"):
        f = next(SRC.glob(f"bk-{n}.*"))
        save(painted(f), f"pt-{n}", 900)
    # real pins and clips
    for n in ("pin-red", "pin-white", "pin-brass", "peg", "clip-red", "clip-gold", "clip-silver", "binder"):
        save(shadow(Image.open(SRC / f"{n}.png"), .5, .35), n, 260)
