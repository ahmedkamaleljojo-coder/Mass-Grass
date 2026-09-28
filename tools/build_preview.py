#!/usr/bin/env python3
"""Bundle a site page into one self-contained HTML file for previewing.

Inlines local stylesheets, scripts and /content/*.json so the page works
without a server (used for the shareable preview links).

Usage: python3 tools/build_preview.py PAGE.html OUTPUT.html
       e.g. python3 tools/build_preview.py index.html preview.html
"""
import base64
import json
import mimetypes
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def read(rel):
    return (ROOT / rel.lstrip("/")).read_text(encoding="utf-8")


def inline_assets(value):
    """Swap local image paths in content for data URIs (previews have no server)."""
    if isinstance(value, dict):
        return {k: inline_assets(v) for k, v in value.items()}
    if isinstance(value, list):
        return [inline_assets(v) for v in value]
    if isinstance(value, str) and value.startswith("/assets/"):
        path = ROOT / value.lstrip("/")
        mime = mimetypes.guess_type(path.name)[0]
        if path.is_file() and mime and mime.startswith("image/"):
            return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()
    return value


def bundle(page):
    html = read(page)
    html = re.sub(
        r'<link rel="stylesheet" href="(/assets/[^"]+\.css)">',
        lambda m: f"<style>\n{read(m.group(1))}\n</style>",
        html,
    )
    html = re.sub(
        r'<script src="(/assets/[^"]+\.js)"></script>',
        lambda m: f"<script>\n{read(m.group(1))}\n</script>",
        html,
    )
    source = read(page)
    content = None
    if "/assets/js/app.js" in source:
        content = {
            "site": json.loads(read("content/site.json")),
            "home": json.loads(read("content/home.json")),
        }
    else:
        meta = re.search(r'<meta name="mg-content" content="([\w-]+)">', source)
        if meta:
            content = {
                "site": json.loads(read("content/site.json")),
                "page": json.loads(read(f"content/{meta.group(1)}.json")),
            }
    if content:
        content = inline_assets(content)
        data = json.dumps(content, ensure_ascii=False).replace("</", "<\\/")
        html = html.replace("<script>\n", f"<script>window.__CONTENT__={data};</script>\n<script>\n", 1)

    # Site paths don't exist inside a preview: send them to the matching
    # preview page instead, and ignore the rest.
    links = json.loads(read("tools/preview_links.json"))
    router = (
        "<script>(function(){var M=" + json.dumps(links) + ";"
        "document.addEventListener('click',function(e){"
        "var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;"
        "var h=a.getAttribute('href');if(!h||h.charAt(0)!=='/')return;"
        "var p=h.split('#')[0]||'/';"
        "if(M[p]){a.href=M[p]+(h.indexOf('#')>0?h.slice(h.indexOf('#')):'');a.target='_blank';a.rel='noopener';}"
        "else e.preventDefault();},true);})();</script>\n"
    )
    html = html.replace("</body>", router + "</body>", 1) if "</body>" in html else html + router

    # The preview host supplies its own document shell.
    lang = re.search(r'<html lang="(\w+)" dir="(\w+)"', html)
    html = re.sub(r"<!DOCTYPE html>\s*", "", html, flags=re.I)
    html = re.sub(r"</?(html|body)[^>]*>|</?head>", "", html)
    html = html.replace('<meta charset="utf-8">', "")
    html = re.sub(r'<meta name="viewport"[^>]*>', "", html)
    if lang:
        html = html.replace(
            "<script>document.documentElement.classList.add('js')</script>",
            "<script>document.documentElement.classList.add('js');"
            f"document.documentElement.lang='{lang.group(1)}';document.documentElement.dir='{lang.group(2)}';</script>",
        )
    # Preview titles are just the page name.
    html = re.sub(r"<title>([^<|]+?)\s*\|[^<]*</title>", r"<title>\1</title>", html)
    return html.strip() + "\n"


if __name__ == "__main__":
    page = sys.argv[1] if len(sys.argv) > 1 else "index.html"
    out = sys.argv[2] if len(sys.argv) > 2 else "preview.html"
    html = bundle(page)
    pathlib.Path(out).write_text(html, encoding="utf-8")
    print(f"wrote {out} ({len(html) // 1024} KB)")
