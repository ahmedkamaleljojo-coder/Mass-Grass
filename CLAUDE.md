# Mass & Grass: handoff notes for Claude

Read this first. It carries everything from the earlier sessions, so a new session (or a new
Claude account) can continue without losing context.

## Working with the owner

- Reply in Palestinian Arabic, short and direct.
- The owner pre-approves routine steps ("وافق على كل اشي"): don't ask for confirmation on
  normal work; commit and push when a change is done and tested.
- Show every change as a preview (a claude.ai artifact built with `tools/build_preview.py`).
- They want real photos, never drawn or code-built imitations of real objects. Code-made 3D
  models and drawn calendar hardware were rejected.
- Keep the site's own style: white/beige paper, clay watercolour palette, Thmanyah fonts. A glass
  theme was tried and rejected ("خلينا على الستايل تاعنا").
- Sales are digital: every product has an "order" button that opens the order sheet
  (WhatsApp / e-mail / Instagram). Contact details in `content/site.json` are still empty.

## Where the work stands

Branch with all the work: `claude/clever-brown-tvlhfo` (there is no `main` yet).

| Page | Path | State |
|---|---|---|
| Home | `/` (`index.html`) | ready |
| Paintings (لوحات) | `/paintings/` | ready |
| Stickers (ستيكرات) | `/stickers/` | ready |
| Calendar (كاليندر) | `/calendars/` | ready: real wire-o binding photo, WebGL page flip (page swings behind the calendar), no sound |
| On cloth (على القماش) | `/cloth/` | ready: hoodies, sweatshirts, tote bags, caps in one display, kinds row on top. `/hoodies/` redirects here |
| Postcards (بوست كارد) | `/postcards/` | ready: cards rise from an envelope as a column, flip to the back (stamp + postmark), write-your-own-card, grid |
| More designs (تصاميم متنوعة) | `/designs/` | not started (`ready:false` in site.json) |

Unused leftovers (glass experiment, rejected): `assets/css/glass.css`, `postcards/glass.html`,
`postcards/glass-white.html`. Safe to delete.

Ideas discussed but dropped: 3D orbit view of products (dropped by the owner).

## How the site is built

- Static site, vanilla JS, Arabic RTL with an English toggle. No build step.
- All text lives in `content/*.json` as `{ "ar": "…", "en": "…" }`; each page points to its file
  with `<meta name="mg-content">`. Nav comes from `content/site.json` → `collections`
  (link is `/${id}/`, `ready:false` shows "قيد التجهيز").
- Shared shell `MG` in `assets/js/shell.js` (`MG.ready`, `$`, `$$`, `L`, `t`, `esc`, `MG.num`,
  `MG.onLang`, `MG.openOrder`, `MG.reduced`, `MG.finePointer`); `a[data-order]` opens the order sheet.
- Page code: `assets/js/<page>.js` + `assets/css/<page>.css`.
- Global CSS has `img,canvas{max-width:100%}`: give wide canvases `max-width:none`.
- Run locally: `python3 -m http.server 8765` and open `http://localhost:8765/`.
- Test with Playwright (Chromium is preinstalled in cloud sessions), desktop and mobile widths,
  and check the console for JS errors before pushing.

## Previews

`python3 tools/build_preview.py <page path> <out.html>` inlines the page, its CSS/JS/JSON and
`/assets/...` images into one HTML file, then publish it as an artifact.
`tools/preview_links.json` maps site paths to artifact URLs so nav links jump between previews.
Artifacts belong to the account that published them: on a new account publish new ones and
update `tools/preview_links.json` with the new URLs, then rebuild all pages so links point right.

## Product photos

See `.claude/skills/canva-product-photos/SKILL.md` (Canva generate-image → remove-background →
export → `tools/web_image.py` to WebP) and `.claude/skills/hanging-display/SKILL.md`
(the garment display). Photos live in `assets/products/<collection>/`.
The Canva connector must be connected on the account for new photos.

## Calendar flip notes (`assets/js/calendar.js`)

WebGL sheet mesh (30×72) hanging from the wire; angle 0→2π with a sag term; a depth-only quad
hides the page once it passes behind; `angleFor(screenY)` maps drag to angle. Next completes past
0.32π or on a fast upward flick. A ResizeObserver on `#pages` repaints; `sizePages()` bumps
`revealRun` so a stale reveal never draws at the old size.

## Next steps

1. Build "تصاميم متنوعة" (`/designs/`).
2. Fill real contact details (WhatsApp, Instagram, e-mail) in `content/site.json`.
3. Replace sample art with real scans; write the story section on the home page.
4. Confirm Thmanyah font licence for commercial use before launch.
5. Merge this branch into a `main` branch and pick hosting (e.g. GitHub Pages / Netlify).
