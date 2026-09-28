#!/usr/bin/env python3
"""Bundle the site into one self-contained HTML file for previewing.

Inlines the stylesheet, scripts and /content/*.json so the page works
without a server (used for the shareable preview link).

Usage: python3 tools/build_preview.py OUTPUT.html
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def main(out):
    html = read("index.html")
    content = {
        "site": json.loads(read("content/site.json")),
        "home": json.loads(read("content/home.json")),
    }
    css = read("assets/css/main.css")
    html = html.replace(
        '<link rel="stylesheet" href="/assets/css/main.css">', f"<style>\n{css}\n</style>"
    )
    data = json.dumps(content, ensure_ascii=False).replace("</", "<\\/")
    scripts = (
        f"<script>window.__CONTENT__={data};</script>\n"
        f"<script>\n{read('assets/js/watercolor.js')}\n</script>\n"
        f"<script>\n{read('assets/js/app.js')}\n</script>"
    )
    html = re.sub(
        r'<script src="/assets/js/watercolor.js"></script>\s*<script src="/assets/js/app.js"></script>',
        lambda _: scripts,
        html,
    )
    # The preview host supplies its own document shell.
    html = re.sub(r"<!DOCTYPE html>\s*", "", html, flags=re.I)
    html = re.sub(r"</?(html|body)[^>]*>|</?head>", "", html)
    html = html.replace('<meta charset="utf-8">', "").replace(
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">', ""
    )
    # Keep the layout direction the real page sets on <html>/<body>.
    html = html.replace(
        "<script>document.documentElement.classList.add('js')</script>",
        "<script>document.documentElement.classList.add('js');"
        "document.documentElement.lang='ar';document.documentElement.dir='rtl';"
        "document.addEventListener('DOMContentLoaded',()=>document.body.classList.add('lang-ar'));</script>",
    )
    pathlib.Path(out).write_text(html.strip() + "\n", encoding="utf-8")
    print(f"wrote {out} ({len(html) // 1024} KB)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "preview.html")
