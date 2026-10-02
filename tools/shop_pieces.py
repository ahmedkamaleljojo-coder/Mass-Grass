"""Build the home page catalogue (assets/products/shop/ and content/home.json → shop).

Every product shown under the collage, by category, made from Farah's real paintings:
paintings as prints, stickers as cut-outs, postcards, the calendar months, and clothes and bags
with a painting printed on the real garment photos (multiplied into each type's print box).

Run after tools/collage_pieces.py: python3 tools/shop_pieces.py
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/products/shop"
SRC = ROOT / "docs/design/collage/src"
C = "/assets/products/collage/"

PAINTINGS = [  # id, file, Arabic title, English title
    ("tent-coast", "print-tent-coast", "ساحل غزة", "Gaza Coast"),
    ("boat", "/assets/products/home/print-boat.webp", "قارب على الطريق", "Boat on the Road"),
    ("girl-birds", "print-girl-birds", "الفتاة التي أرادت الطائر", "The Girl Who Wanted the Bird"),
    ("girl-oud", "print-girl-oud", "تأمّل", "Soul Reflection"),
    ("alley", "print-alley", "مخيم المغازي", "Al-Maghazi Camp"),
    ("cart", "print-cart", "كل ما استطعنا حمله", "Everything We Could Save"),
    ("fishing", "print-fishing", "صيد في بحر غزة", "Fishing, Gaza Sea"),
    ("ramadan", "print-ramadan", "شرارات رمضان", "Ramadan Sparks"),
    ("house", "print-house", "بيت النزوح", "The Displacement House"),
]
DRAWN = [("bluebird", "الطائر الأزرق", "The Blue Bird"), ("crate", "صندوق الخضار", "The Vegetable Crate"),
         ("leaf", "ورقة خريف", "Autumn Leaf"), ("tent", "خيمة", "Tent"),
         ("candle", "شمعة", "Candle"), ("jar", "جرّة", "Clay Jar")]
GARMENTS = [  # type, colour, painting file in src, Arabic, English
    ("hoodie", "sand", "art-girl-oud", "هودي «تأمّل»", "“Soul Reflection” hoodie"),
    ("hoodie", "white", "art-tent-coast", "هودي «ساحل غزة»", "“Gaza Coast” hoodie"),
    ("crewneck", "white", "art-girl-birds", "سويت شيرت «الفتاة والطائر»", "“The Girl and the Bird” sweatshirt"),
    ("crewneck", "sage", "art-house", "سويت شيرت «بيت النزوح»", "“Displacement House” sweatshirt"),
    ("tote", "white", "art-cart", "حقيبة «كل ما استطعنا حمله»", "“Everything We Could Save” tote"),
    ("tote", "sand", "art-ramadan", "حقيبة «شرارات رمضان»", "“Ramadan Sparks” tote"),
    ("cap", "sand", "art-fishing", "قبعة «صيد»", "“Fishing” cap"),
]


def garment(kind, colour, art, box):
    base = Image.open(ROOT / ("assets/products/hoodies" if kind in ("hoodie", "crewneck") else "assets/products/cloth")
                      / kind / f"{colour}.webp").convert("RGBA")
    w, h = base.size
    x0, y0 = int(box["x"] * w), int(box["y"] * h)
    x1, y1 = x0 + int(box["w"] * w), y0 + int(box["h"] * h)
    a = ImageOps.fit(Image.open(art).convert("RGB"), (x1 - x0, y1 - y0), Image.LANCZOS)
    reg = np.asarray(base.crop((x0, y0, x1, y1))).astype(float)
    out = reg.copy()
    out[..., :3] = reg[..., :3] * np.asarray(a).astype(float) / 255 * .95 + reg[..., :3] * .05
    base.paste(Image.fromarray(out.astype("uint8"), "RGBA"), (x0, y0))
    return base


def save(im, name, width=640):
    im = im.copy()
    im.thumbnail((width, width), Image.LANCZOS)
    im.save(OUT / f"{name}.webp", quality=84)
    return f"/assets/products/shop/{name}.webp"


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    cloth = json.loads((ROOT / "content/cloth.json").read_text())["products"]
    stickers = json.loads((ROOT / "content/stickers.json").read_text())["items"]
    cards = json.loads((ROOT / "content/postcards.json").read_text())["cards"]
    months = json.loads((ROOT / "content/calendar.json").read_text())["months"]

    shop = []
    shop.append({"id": "paintings", "items": [
        {"img": f if f.startswith("/") else C + f + ".webp", "title": {"ar": ar, "en": en}}
        for _, f, ar, en in PAINTINGS]})
    shop.append({"id": "stickers", "items":
        [{"img": f"{C}st-{i}.webp", "title": {"ar": ar, "en": en}} for i, ar, en in DRAWN] +
        [{"img": s["src"], "title": s["title"]} for s in stickers]})
    shop.append({"id": "postcards", "items":
        [{"img": C + "postcard-front.webp", "title": {"ar": "قارب على الطريق", "en": "Boat on the Road"}, "card": True}] +
        [{"img": c["art"], "title": c["title"], "card": True} for c in cards]})
    shop.append({"id": "calendars", "items":
        [{"img": m["art"], "title": {"ar": m["name"]["ar"] + " 2027", "en": m["name"]["en"] + " 2027"}, "month": True} for m in months]})
    items = []
    for kind, colour, art, ar, en in GARMENTS:
        src = next(SRC.glob(art + ".*"))
        items.append({"img": save(garment(kind, colour, src, cloth[kind]["print"]), f"{kind}-{colour}-{art[4:]}"),
                      "title": {"ar": ar, "en": en}, "cut": True})
    shop.append({"id": "cloth", "items": items})

    p = ROOT / "content/home.json"
    d = json.loads(p.read_text())
    d["shop"] = shop
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    print({c["id"]: len(c["items"]) for c in shop})
