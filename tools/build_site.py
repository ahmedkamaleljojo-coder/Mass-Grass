#!/usr/bin/env python3
"""Build the whole site as one set of self-contained pages that link to each other,
for publishing as a single multi-page artifact (index.html + one file per page).

Usage: python3 tools/build_site.py OUT_DIR
"""
import pathlib
import sys

from build_preview import bundle

PAGES = {
    "/": ("index.html", "index.html"),
    "/paintings/": ("paintings/index.html", "paintings.html"),
    "/stickers/": ("stickers/index.html", "stickers.html"),
    "/calendars/": ("calendars/index.html", "calendars.html"),
    "/cloth/": ("cloth/index.html", "cloth.html"),
    "/postcards/": ("postcards/index.html", "postcards.html"),
    "/story/": ("story/index.html", "story.html"),
}
LINKS = {path: out for path, (_, out) in PAGES.items()}
LINKS["/hoodies/"] = "cloth.html"

if __name__ == "__main__":
    out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "site-build")
    out.mkdir(parents=True, exist_ok=True)
    for path, (src, name) in PAGES.items():
        html = bundle(src, site_links=LINKS)
        (out / name).write_text(html, encoding="utf-8")
        print(f"{path:14} -> {name} ({len(html) // 1024} KB)")
