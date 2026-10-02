"""Build the home page's flat-lay pieces (assets/products/home/) from the raw mockups.

Each piece is a real photo (Canva generations, cut out) with the painting multiplied onto it,
then given a soft shadow as if it lies on the paper under light from the top left: the shadow
falls down and to the right. Things that sit higher (the olive branches, the tote) cast a
longer, softer shadow; the swallow, painted as if in flight, casts a faint far one.

Run: python3 tools/home_pieces.py   (sources: docs/design/home-flatlay/assets, assets/products)
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs/design/home-flatlay/assets"
OUT = ROOT / "assets/products/home"
FONT = ROOT / "assets/fonts/thmanyah-sans-400.woff2"
FONT_M = ROOT / "assets/fonts/thmanyah-sans-500.woff2"


def multiply(base, art, box, opacity=1.0):
    """Print art into box (x0, y0, x1, y1) of base by multiplying, so the base's texture shows."""
    x0, y0, x1, y1 = box
    a = ImageOps.fit(art.convert("RGBA"), (x1 - x0, y1 - y0), Image.LANCZOS)
    reg = np.asarray(base.crop(box)).astype(float)
    ar = np.asarray(a).astype(float)
    al = ar[..., 3:] / 255 * opacity
    out = reg.copy()
    out[..., :3] = reg[..., :3] * (1 - al) + reg[..., :3] * ar[..., :3] / 255 * al
    base = base.copy()
    base.paste(Image.fromarray(out.astype("uint8"), "RGBA"), (x0, y0))
    return base


def shadow(im, lift=1.0, strength=0.34):
    """Add a contact shadow and a soft cast shadow (down-right); lift scales the distance."""
    im = im.convert("RGBA")
    w, h = im.size
    s = max(w, h)
    pad = int(s * (0.06 + 0.06 * lift))
    canvas = (w + 2 * pad, h + 2 * pad)
    alpha = im.split()[3]

    def layer(dx, dy, blur, k):
        m = Image.new("L", canvas, 0)
        m.paste(alpha, (pad + int(s * dx), pad + int(s * dy)))
        return np.asarray(m.filter(ImageFilter.GaussianBlur(s * blur))).astype(float) / 255 * k

    cast = layer(0.018 * lift, 0.026 * lift, 0.022 * lift + 0.004, strength)
    contact = layer(0.002, 0.003, 0.003, 0.22 if lift < 1.5 else 0.0)
    a = 1 - (1 - cast) * (1 - contact)
    sh = np.zeros((canvas[1], canvas[0], 4))
    sh[..., :3] = (48, 38, 28)
    sh[..., 3] = a * 255
    out = Image.fromarray(sh.astype("uint8"), "RGBA")
    out.alpha_composite(im, (pad, pad))
    return out


def save(im, name, width=900):
    im = im.copy()
    im.thumbnail((width, width), Image.LANCZOS)
    im.save(OUT / f"{name}.webp", quality=86)
    print(name, im.size)


def calendar():
    cal = Image.open(SRC / "calendar-blank.webp").convert("RGBA")
    w, h = cal.size
    cal = multiply(cal, Image.open(ROOT / "assets/products/calendar/apr.webp"),
                   (int(w * .08), int(h * .12), int(w * .92), int(h * .53)))
    d = ImageDraw.Draw(cal)
    fm = ImageFont.truetype(str(FONT_M), int(w * .05))
    fr = ImageFont.truetype(str(FONT), int(w * .03))
    ink, muted, red = (46, 41, 37, 235), (46, 41, 37, 165), (169, 88, 58, 235)
    y = int(h * .565)
    d.text((int(w * .92), y), "نيسان", font=fm, fill=ink, anchor="ra", direction="rtl", language="ar")
    d.text((int(w * .08), y + int(w * .012)), "2027", font=fr, fill=muted, anchor="la")
    x0, x1 = w * .1, w * .9
    cw, rh, yy, first = (x1 - x0) / 7, w * .048, y + int(w * .085), 4   # 1 April 2027 is a Thursday
    for day in range(1, 31):
        k = first + day - 1
        col, row = k % 7, k // 7                                         # Sunday on the right
        d.text((x1 - cw * (col + .5), yy + row * rh), str(day), font=fr,
               fill=red if col == 5 else muted, anchor="ma")
    return cal


def tote():
    t = Image.open(SRC / "tote.webp").convert("RGBA")
    w, h = t.size
    lem = Image.open(ROOT / "assets/products/stickers/lemon.webp")
    lw = int(w * .42)
    lh = int(lw * lem.height / lem.width)
    x0, y0 = (w - lw) // 2, int(h * .44)
    return multiply(t, lem, (x0, y0, x0 + lw, y0 + lh), .95)


def hoodie():
    hd = Image.open(SRC / "hoodie-sand-folded.webp").convert("RGBA")
    w, h = hd.size
    pw = int(w * .42)
    ph = int(pw * 3 / 4)
    x0, y0 = (w - pw) // 2, int(h * .6)
    return multiply(hd, Image.open(ROOT / "assets/products/calendar/may.webp"), (x0, y0, x0 + pw, y0 + ph), .92)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    save(shadow(Image.open(SRC / "print-boat.webp")), "print-boat", 1000)
    save(shadow(Image.open(SRC / "print-quds.webp")), "print-quds", 700)
    for c in ("jaffa", "nablus", "gaza"):
        save(shadow(Image.open(SRC / f"stamp-{c}.webp"), .7), f"stamp-{c}", 420)
    save(shadow(Image.open(ROOT / "assets/products/stickers/window.webp"), .8), "st-window", 500)
    save(shadow(Image.open(ROOT / "assets/products/stickers/lemon.webp"), .8), "st-lemon", 500)
    save(shadow(calendar(), 1.1), "calendar", 900)
    save(shadow(tote(), 1.6), "tote-lemon", 800)
    save(shadow(hoodie(), 1.3), "hoodie-folded", 800)
    save(shadow(Image.open(SRC / "olive.webp"), 2.2, .3), "olive", 700)
    save(shadow(Image.open(SRC / "swallow.webp"), 4.5, .16), "swallow", 500)
    save(shadow(Image.open(SRC / "oranges.webp"), 1.6), "oranges", 600)
    save(shadow(Image.open(SRC / "tape.webp"), .3, .15), "tape", 300)
