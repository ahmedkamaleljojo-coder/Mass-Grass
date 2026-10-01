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
- Copy speaks to everyone: Arabic imperatives are plural (اطلبوها، شوفوا، اسحبوا), never feminine
  singular. Story narration stays in Farah's first person.
- Numbers are Western digits (0-9) in both languages: `MG.num`/`MG.pad` never localise, and content
  JSON has no Arabic-Indic digits.
- The story is not in the collections menu: the header has its own story link (Farah's face) and a
  "ادعموا الحكاية" support button; the story page ends with a support section. Donation and Ko-fi
  links go in `content/site.json` → `support` (`donate`, `kofi`); empty means "coming soon".

## Where the work stands

Branch with all the work: `claude/clever-brown-tvlhfo` (there is no `main` yet).

| Page | Path | State |
|---|---|---|
| Home | `/` (`index.html`) | ready (redesigned again): hero where a real painting bleeds onto wet paper and the pointer paints more of it (canvas mask of Watercolor blooms); "one painting, many lives" pinned section where the same painting travels from paper into the held frame, wall calendar and hoodie; big collections index with the real product following the pointer (thumbnails on phones); Farah's route on the real map draws itself on scroll; marquee of the 12 calendar months (speeds up while scrolling); brush stroke that paints through the four steps. One rAF loop gated by IntersectionObserver. Code: `assets/js/home.js`, `assets/css/home.css`, `content/home.json` (`lives.stages` hold each product photo and the art window). |
| Paintings (لوحات) | `/paintings/` | ready |
| Stickers (ستيكرات) | `/stickers/` | ready |
| Calendar (كاليندر) | `/calendars/` | ready: real wire-o binding photo, WebGL page flip (page swings behind the calendar), no sound |
| On cloth (على القماش) | `/cloth/` | ready: hoodies, sweatshirts, tote bags, caps in one display, kinds row on top. `/hoodies/` redirects here |
| Postcards (بوست كارد) | `/postcards/` | ready: cards rise from an envelope as a column, flip to the back (stamp + postmark), write-your-own-card, grid |
| Story (الحكاية) | `/story/` | ready: "Farah's map". A painted SVG map of the Gaza Strip (real OSM outline) stays on screen (sticky; on phones on top) while ink-bordered story panels scroll past (after Codrops' animated map path + SBS "The Boat"). Farah's watercolour face walks dashed routes between real places: al-Jalaa → az-Zawayda 2023 → al-Jalaa 2025 → the office at al-Saraya where she meets Ahmed (from al-Mina) in 2025 → Deir al-Balah / Ahmed az-Zawayda → bombed home → Tel al-Hawa → the office. Faces change mood (happy, worried, sad, joyful) and the map darkens in the hard chapters. Each step has `photos` (empty = a placeholder frame). Portraits with bios at the end (Farah: painter; Ahmed: graphic designer). |
| More designs (تصاميم متنوعة) | `/designs/` | not started (`ready:false` in site.json) |

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
- Phones get the same plain text menu as the web (a scrolling row, no pill boxes).
- Page-to-page transitions use cross-document View Transitions (`@view-transition` in `main.css`).
- `--head` (header height) is set by `shell.js` for anything sticky under the header.
- Run locally: `python3 -m http.server 8765` and open `http://localhost:8765/`.
- Test with Playwright (Chromium is preinstalled in cloud sessions), desktop and mobile widths,
  and check the console for JS errors before pushing.

## Previews

Whole site as one linked artifact: `python3 tools/build_site.py OUT_DIR` bundles every page
(home, paintings, stickers, calendars, cloth, postcards, story) into self-contained files whose nav
links point at each other (`index.html`, `paintings.html`, …); publish `index.html` with the others
as `files`. Current link: https://claude.ai/artifact/GJLaXvWzK6iE6MJmD5XbTK. Inside the artifact
viewer the Thmanyah fonts (cdn.jsdelivr.net) are blocked and fall back to Amiri / IBM Plex Sans
Arabic; on real hosting they load normally. To embed them, put the woff2 files in `assets/fonts/`
(jsdelivr is blocked from cloud sessions too).

Single pages:

`python3 tools/build_preview.py <page path> <out.html>` inlines the page, its CSS/JS/JSON and
`/assets/...` images into one HTML file, then publish it as an artifact.
`tools/preview_links.json` maps site paths to artifact URLs so nav links jump between previews.
Artifacts belong to the account that published them: on a new account publish new ones and
update `tools/preview_links.json` with the new URLs, then rebuild all pages so links point right.

## Brand logo

`assets/brand/logo.svg` is the owner's logo (MASS& / GRASS lettering, #463928), used as a CSS mask
(`.logo-svg` in `main.css`) so it follows the text colour: brown on light, light on dark. It is in
the header, the footer and the home intro of every page, and is the favicon. The site opens in the
light theme by default; dark only when the visitor picks it (`theme.js`). The theme attribute is
`data-mg-theme` (not `data-theme`, which the artifact viewer sets from claude.ai's own theme).

## Product photos

See `.claude/skills/canva-product-photos/SKILL.md` (Canva generate-image → remove-background →
export → `tools/web_image.py` to WebP) and `.claude/skills/hanging-display/SKILL.md`
(the garment display). Photos live in `assets/products/<collection>/`.
The Canva connector must be connected on the account for new photos.

## Story page notes (`assets/js/story.js`, `content/story.json`)

- Places are lat/lon in `story.json` → `places` (projected onto an 800×1000 map); `labelWest` puts a
  label on the left of its dot. Steps say where Farah (`farah`, a place or a list of places) and
  Ahmed (`ahmed`) are; routes between consecutive places are built automatically. `bombed` marks
  a place as destroyed; `sway` makes the panel rock.
- The owner's watercolour portraits (Farah and Ahmed, one image) are cropped into
  `assets/products/story/portrait-*.webp` and the face tokens `face-*.webp`.
- Real photos: run `python3 tools/boat_sketch.py IN.jpg assets/products/story/photos/NAME.webp`
  (ink lines + flat washes on warm paper) and add `{"src": "/assets/products/story/photos/NAME.webp"}`
  to that step's `photos`.
- `strip` in `story.json` is the real outline of the Gaza Strip (OpenStreetMap data from the npm
  package `@geo-maps/countries-land-100m`); places use real coordinates (office at al-Saraya,
  Ahmed's home at al-Mina/the port).
- Steps carry `mood` / `ahmedMood` (faces in `faces` → `farah`/`ahmed` → calm, happy, joy,
  worried, sad; generated in Canva from the owner's portraits, page 42 of `DAHWgLZfDEc`) and
  `dark` (0–1) which darkens the map and the section background.
- Earlier experiments (paper fold in WebGL, handwriting, watercolour/paper cut-out poses) were
  replaced; their Canva images are on pages 39-41 of the holder design `DAHWgLZfDEc`.

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
