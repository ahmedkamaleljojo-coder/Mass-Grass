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
- Style: simple paper. The whole site sits on one real paper texture (`assets/paper/paper.webp`, a
  seamless tile; `paper-dark.webp` in dark mode), and the work is laid on it like objects on a table
  (prints with a white border, cut-out stickers, garments). Light type: IBM Plex Sans Arabic, weights
  200–600, headings at 300. Ink buttons with 3px corners; tabs and filters are plain text with an
  underline, never pills or coloured chips; dialogs are paper sheets. Clay is only an accent. Earlier
  looks the owner replaced: Marhey + Rubik fonts, a glass theme, the big animated home.
- Sales are digital: every product has an order button that opens the order sheet. Pay by card comes
  first (the piece's own `checkout` link, else `content/settings.json` → `shop.link`; empty = "coming
  soon"), then WhatsApp / e-mail / Instagram. Contact and shop links in `settings.json` are still empty.
- Copy is standard Arabic (فصحى بسيطة), never colloquial, with the usual shop terms: اللوحات، الملصقات،
  التقويم السنوي، الملابس والحقائب، البطاقات البريدية (not ستيكرات / كاليندر / بوست كارد). Keep text short and
  skip instructions: let people explore (hints and eyebrows are empty strings, and `[data-t]:empty`
  hides them). Imperatives are plural (اطلبوها، الصقوها), never feminine singular. Story narration
  stays in Farah's first person; the calendar's folk proverbs stay as they are.
- Numbers are Western digits (0-9) in both languages: `MG.num`/`MG.pad` never localise, and content
  JSON has no Arabic-Indic digits.
- Header: the logo in the middle; on wide screens the sections run in a line under it that sticks to
  the top (a small logo appears in it once the big one scrolls away), with the story link and EN at
  the sides. On phones (≤900px) the logo bar sticks and a three-line button opens a full-screen paper
  menu (`renderMenu()` in `shell.js`: home, the sections, the story, support, theme). The story is
  not a collection; the story page ends with a support section. Donation and Ko-fi links go in
  `content/settings.json` → `support` (`donate`, `kofi`); empty means "coming soon".

## Where the work stands

> **Current design (branch `claude/wonderful-ramanujan-fwocbj`, not yet on `main`):** the watercolour layout of Oct 1
> (commit 37afc28) brought back and reworked with the owner, on top of ac22aec (Ahmed removed, domain files, content panel):
> - Header: the brand logo alone on top; under it the menu in the middle ("جميع المنتجات" first), the basket and search
>   on the right, EN and the theme on the left, all bare icons (no frames). Type: IBM Plex Sans Arabic only.
> - Background: the owner's paper photo as a seamless tile (`assets/paper/paper.webp`, dark version too).
> - Home opens with Farah's boat painting in pencil (`assets/products/home/boat-pencil.webp`, the pencil drawn on the
>   painting's own paper tone); wherever the pointer (or a finger) goes, watercolour blooms (watercolor.js `bloom` on a
>   hidden mask) let the real painting through (`boat-colour.webp`, the scan as it is), so a fully coloured board is the
>   original. Coloured patches stay. On opening it paints itself (`autoPaint()` in app.js, ~4 s). It has no frame: both
>   layers have white paper and a ragged soft alpha edge baked in and are multiplied onto the site's paper, so it looks
>   painted on the page; pencil and colour are composited in one canvas. Max 820px. No title, buttons or numbers above it.
> - Vox touches on the home page (`assets/css/vox.css`, the end of `app.js`): a marker stroke draws under one key word
>   per title (`<wash>…</wash>` in home.json), an editor's pen rings the boat and points to a black caption tag with a
>   note (`hero.note`), the collections are cut-out photos with black title tags that drift at different depths, the
>   process numbers are black tags, and a small map of Gaza (`story.map`, same data as the story page) draws Farah's road.
> - Type: minimal and light. html/body 15px, body weight 300, headings 300 (h3/b 500, nothing heavier), large clamps
>   scaled to ~0.76 of their old size.
> - No colour system: no painted blobs, washes, brush cursor, painted dividers or colour per section. Every other picture on
>   the home page is a real photo (`assets/products/home/`, chosen in `content/home.json`); the home calendar uses the real
>   wire-o binding and month paintings; Farah (no circle, waves on hover) sits over the story section. Home code: `assets/js/app.js`.
> - Shop: `/shop/` (all products, filters), `/cart/` (basket). `catalog.js` is the one product list (search, shop, basket);
>   `cart.js` turns every order button (`data-order`, `MG.openOrder`) into "add to basket" (localStorage `mg-cart`);
>   `basket.js` ends with card payment (`settings.json` → `shop.link`) or the order sent on WhatsApp / e-mail / Instagram.
> Notes below about the paper style describe `main` until this is approved and merged.

Branch with all the work: `main` (the default branch; renamed from `claude/clever-brown-tvlhfo`). Every push to `main` goes live.

| Page | Path | State |
|---|---|---|
| Home | `/` (`index.html`) | ready (simple, paper): the six collections laid on the paper as real objects in a loose grid (a taped print, scattered stickers, a wall calendar with the real binding, a printed hoodie, two postcards, a sketchbook for "more designs"); each is a link to its page. Under them a short note on Farah's story (portrait, two lines, link); the owner will talk about this part later. Code: `assets/js/home.js`, `assets/css/home.css`, `content/home.json` (`table` holds each object's photos). |
| Paintings (اللوحات) | `/paintings/` | ready: pegged line + text filters + grid; price under the title; `checkout` per painting |
| Stickers (الملصقات) | `/stickers/` | ready |
| Calendar (التقويم السنوي) | `/calendars/` | ready: real wire-o binding photo, WebGL page flip (page swings behind the calendar), no sound |
| Clothes & bags (الملابس والحقائب) | `/cloth/` | ready: hoodies, sweatshirts, tote bags, caps in one display, kinds row on top; grid shows the piece first, the painting on hover. `/hoodies/` redirects here |
| Postcards (البطاقات البريدية) | `/postcards/` | ready: cards rise from an envelope as a column, flip to the back (stamp + postmark), write-your-own-card, grid |
| Story (الحكاية) | `/story/` | ready: "Farah's map". A painted SVG map of the Gaza Strip (real OSM outline) stays on screen (sticky; on phones on top) while ink-bordered story panels scroll past (after Codrops' animated map path + SBS "The Boat"). Farah's watercolour face walks dashed routes between real places: al-Jalaa → az-Zawayda 2023 → al-Jalaa 2025 → a small office at al-Saraya (2025) → Deir al-Balah → bombed home → Tel al-Hawa → the office. Farah is the only person in the story: Ahmed was removed at the owner's request (map token, routes, text, portrait and images). Faces change mood (happy, worried, sad, joyful) and the map darkens in the hard chapters. Each step has `photos` (empty = a placeholder frame). Farah's portrait with her bio at the end, then the support section. |
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
- Type scale tokens in `main.css` (`--fs-hero`, `--fs-h1`, `--fs-h2`, `--fs-h3`, `--fs-body`): page titles use
  `--fs-h1`, section titles `--fs-h2`, item/lightbox titles `--fs-h3`; use the tokens instead of new clamps.
  Surfaces: `--paper` + `--paper-img` (texture; repeat it on anything sticky or a dialog so it matches),
  `--sheet` (white print border), `--lift` / `--lift-hi` (shadows of things resting on paper).
- Global CSS has `img,canvas{max-width:100%}`: give wide canvases `max-width:none`.
- Page-to-page transitions use cross-document View Transitions (`@view-transition` in `main.css`).
- `--head` (header height) is set by `shell.js` for anything sticky under the header.
- Run locally: `python3 -m http.server 8765` and open `http://localhost:8765/`.
- Test with Playwright (Chromium is preinstalled in cloud sessions), desktop and mobile widths,
  and check the console for JS errors before pushing.

## Domain and hosting

- Domain: https://www.massandgrass.com. Every page has a canonical URL and absolute `og:image`/`og:url`
  on that domain; `sitemap.xml`, `robots.txt`, `404.html` and `CNAME` (for GitHub Pages) are at the root.
- Hosting: Cloudflare Pages project `mass-grass` (https://mass-grass.pages.dev) connected to the GitHub repo
  (now `mgmassandgrass-art/Mass-Grass`), production branch `main`, no build command, output = repo root.
  Every push to `main` redeploys the site. The domain massandgrass.com was bought on Cloudflare.
- www.massandgrass.com is live. The bare massandgrass.com had no DNS record yet (add it under Custom domains).
- `_redirects` sends repository-only files (CLAUDE.md, .claude/, tools/, docs/, studio/, .pages.yml) to the
  home page; Pages redirects only allow 3xx codes, not 404.
- The session's network allow-list includes massandgrass.com and mass-grass.pages.dev, so curl can check the
  live site. Chromium through the proxy needs `ignore_https_errors=True` and `wait_until='load'`.

## Content panel (Pages CMS)

- The owner edits content at https://app.pagescms.org (sign in with GitHub, pick Mass-Grass, branch `main`).
  The panel is configured by `.pages.yml`; every save is a commit on `main`, so it goes live.
- What the panel edits lives in files of its own, so a save can never drop page settings:
  `content/catalog/paintings.json` (the paintings; `content/paintings.json` points at it with
  `"itemsFile"`) and `content/settings.json` (contact, shop and support links, merged into `MG.site`).
  `shell.js` and `build_preview.py` both load `itemsFile`; `tidyItem()` in `shell.js` fills what a
  panel entry may leave out (ratio arrives as "4:5", empty id, no palette/motif).
- Uploads go to `assets/uploads/`; `.github/workflows/optimize-uploads.yml` runs
  `tools/optimize_uploads.py` on each upload: JPG/PNG/HEIC become WebP (max 2000 px) and the content
  files are re-pointed; the workflow also runs on `content/**` changes, because a panel save made after
  the conversion can still name the original .jpg. Claude can edit the same JSON files directly.
- When the owner replaces an entry in the panel, fields such as `sample` carry over: check new real
  paintings have `"sample": false`.
- Next sections to add to the panel: stickers, postcards, calendar months, cloth.

## Previews

Whole site as one linked artifact: `python3 tools/build_site.py OUT_DIR` bundles every page
(home, paintings, stickers, calendars, cloth, postcards, story) into self-contained files whose nav
links point at each other (`index.html`, `paintings.html`, …); publish `index.html` with the others
as `files`. Current link: https://claude.ai/artifact/GJLaXvWzK6iE6MJmD5XbTK. Fonts come from Google Fonts,
which the artifact viewer allows. Local Playwright screenshots need `ignore_https_errors=True` for the
fonts to load through the session proxy.

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
  label on the left of its dot. Steps say where Farah is (`farah`, a place or a list of places); routes between consecutive places are built automatically. `bombed` marks
  a place as destroyed; `sway` makes the panel rock.
- The owner's watercolour portrait of Farah is cropped into
  `assets/products/story/portrait-*.webp` and the face tokens `face-*.webp`.
- Real photos: run `python3 tools/boat_sketch.py IN.jpg assets/products/story/photos/NAME.webp`
  (ink lines + flat washes on warm paper) and add `{"src": "/assets/products/story/photos/NAME.webp"}`
  to that step's `photos`.
- `strip` in `story.json` is the real outline of the Gaza Strip (OpenStreetMap data from the npm
  package `@geo-maps/countries-land-100m`); places use real coordinates (office at al-Saraya).
- Steps carry `mood` (faces in `faces` → `farah` → calm, happy, joy, worried, sad; generated in Canva from the owner's portraits, page 42 of `DAHWgLZfDEc`) and
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
5. Connect www.massandgrass.com to the Pages project, then build the content panel.
