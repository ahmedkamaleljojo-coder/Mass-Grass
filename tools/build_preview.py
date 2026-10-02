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


def catalog_source():
    """The content catalog.js builds the shop list from (search, basket), for pages that don't load it all."""
    j = lambda n: json.loads(read(f"content/{n}.json"))
    paintings = j("paintings")
    if paintings.get("itemsFile"):
        paintings["items"] = j(paintings["itemsFile"]).get("items", [])
    return {"site": {**j("site"), **j("settings")}, "paintings": paintings, "stickers": j("stickers"),
            "calendar": j("calendar"), "cloth": j("cloth"), "postcards": j("postcards")}


def bundle(page, site_links=None):
    """site_links: map of site paths to sibling files when building the whole site as one artifact."""
    html = read(page)
    html = re.sub(
        r'<link rel="stylesheet" href="(/assets/[^"]+\.css)">',
        lambda m: "<style>\n" + re.sub(
            r"url\('(/assets/[^']+)'\)",
            lambda u: f"url('{inline_assets(u.group(1))}')",
            read(m.group(1)),
        ) + "\n</style>",
        html,
    )
    html = re.sub(
        r'<script src="(/assets/[^"]+\.js)"></script>',
        lambda m: f"<script>\n{read(m.group(1))}\n</script>",
        html,
    )
    html = re.sub(
        r'(<img [^>]*src=")(/assets/[^"]+)"',
        lambda m: m.group(1) + inline_assets(m.group(2)) + '"',
        html,
    )
    source = read(page)
    content = None
    if "/assets/js/app.js" in source:
        content = {
            "site": {**json.loads(read("content/site.json")), **json.loads(read("content/settings.json"))},
            "home": json.loads(read("content/home.json")),
        }
    else:
        meta = re.search(r'<meta name="mg-content" content="([\w,-]+)">', source)
        if meta:
            names = meta.group(1).split(",")
            def load(n):
                d = json.loads(read(f"content/{n}.json"))
                if d.get("itemsFile"):   # the list of pieces lives in its own file
                    d["items"] = json.loads(read(f"content/{d['itemsFile']}.json")).get("items", [])
                return d
            content = {
                "site": {**json.loads(read("content/site.json")), **json.loads(read("content/settings.json"))},
                "page": load(names[0]),
                "more": {n: load(n) for n in names[1:]},
            }
    if content:
        content = inline_assets(content)
        data = json.dumps(content, ensure_ascii=False).replace("</", "<\\/")
        html = html.replace("<script>\n", f"<script>window.__CONTENT__={data};</script>\n<script>\n", 1)

    if "/assets/js/catalog.js" in source and "paintings,stickers,calendar,cloth,postcards" not in source:
        data = json.dumps(catalog_source(), ensure_ascii=False).replace("</", "<\\/")
        html = html.replace("<script>\n", f"<script>window.__CATALOG_SRC__={data};</script>\n<script>\n", 1)

    # Site paths don't exist inside a preview: send them to the matching
    # preview page instead, and ignore the rest.
    links = site_links or json.loads(read("tools/preview_links.json"))
    same_tab = "" if site_links else "a.target='_blank';a.rel='noopener';"
    router = (
        "<script>(function(){var M=" + json.dumps(links) + ";"
        "document.addEventListener('click',function(e){"
        "var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;"
        "var h=a.getAttribute('href');if(!h||h.charAt(0)!=='/')return;"
        "var p=h.split('#')[0]||'/';"
        "if(M[p]){a.href=M[p]+(h.indexOf('#')>0?h.slice(h.indexOf('#')):'');" + same_tab + "}"
        "else e.preventDefault();},true);})();</script>\n"
    )
    html = html.replace("</body>", router + "</body>", 1) if "</body>" in html else html + router

    if site_links:
        return html   # each page of the site keeps its own document shell
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
