---
name: canva-product-photos
description: Produce professional product photos for Mass & Grass with the Canva connector — garment mockups, the same mockup in several colours, model photos, clean transparent cut-outs, full-resolution export and web-ready WebP. Use whenever the site needs new product, garment, mockup, model or colour-variant images, or when existing ones look cut out, recoloured or low quality.
---

# Product photos with Canva

The bar is the reference site (madeeingaza.com): real-looking photos, clean
edges, a colour change that is a *different photo*, never a tint painted in
code. Everything below exists because a shortcut failed once:

- A home-made chroma-key (`tools/cutout.py`) left fringes and green spill on
  white fabric → **cut out with Canva `remove-background`**, not our script.
- Recolouring white fabric in the browser (multiply + mask) looked painted →
  **every colour is its own generated photo** of the same mockup.
- Models cut out and floated on the page looked pasted → **models stay in
  their photo** (studio backdrop), shown as a photo card.

## Tools (Canva connector)

| Step | Tool | Notes |
|---|---|---|
| Generate | `generate-image` | `aspectRatio` from the enum (`PORTRAIT_4_5` for garments/models). **Max 10 calls/minute** — batch 8–9, then poll. |
| Poll | `get-generate-image-job` | Returns a 161×200 *thumbnail* + the media id. The thumbnail is for review only. |
| Same photo, other colour / pose | `generate-image` with `imageReferences: [{type:"MEDIA", id}]` | Say what must stay identical (see prompts). |
| Cut out | `remove-background` with `sourceMedia: {type:"MEDIA", id}` | New media id with alpha. Only for pieces that float on the page (garments on the line), never for models. |
| Full resolution | holder design → `edit-design` `insert_fill` per page → `commit` → `export-design` | The only way to get full-size pixels. See "Export". |

## Prompts

Write prompts as a photographer's brief. Always state: subject, colour
(name + hex), what is blank, framing, light, backdrop, and what must *not*
appear.

**Garment for the line — current style: ghost mannequin** (the owner wants
the puffy, "worn by an invisible person" 3D look; flat laid-out garments were
replaced). White masters in use: hoodie `MAHWgzxBKKk`, crewneck `MAHWg9H8peU`.
> Professional e-commerce ghost mannequin (invisible mannequin) product photo
> of a plain white (#F4F1EA) heavyweight cotton {pullover hoodie with hood and
> drawstrings and kangaroo pocket | crewneck sweatshirt with ribbed round
> collar, cuffs and hem}, 3D volume as if worn by an invisible person, full
> rounded shoulders and chest, sleeves hanging naturally down the sides with
> soft folds, perfectly front view and symmetrical, completely blank chest, no
> print, no logo, no label, whole garment in frame with even margin, floating,
> soft diffused studio light, plain light warm grey seamless backdrop, no
> person, no mannequin visible, no hanger

Older flat style (kept for reference):
> Professional e-commerce product photo of a plain {colour} ({hex}) heavyweight
> cotton {hoodie with hood and kangaroo pocket | crewneck sweatshirt with ribbed
> collar and cuffs}, no print, no logo, no label, blank chest, laid perfectly
> symmetrical as if hanging straight, front view, sleeves relaxed down the sides,
> whole garment in frame with even margin, soft diffused studio light with gentle
> natural fabric folds, plain light warm grey seamless backdrop, no hanger, no
> clip, no person, no shadow on the backdrop

**Colour variant of that exact photo** (reference = the white one):
> Recolour only the garment to {colour} ({hex}). Keep everything else identical:
> same garment shape, same folds and creases, same framing and scale, same light
> and backdrop. No print, no logo.

**Model** (standing, then seated with the standing photo as reference):
> Editorial fashion photo of {person}, wearing a plain {colour} ({hex}) {garment}
> with a completely blank chest, no print or logo, {trousers}, standing relaxed
> facing the camera, framed from head to mid-thigh, soft window light, warm
> beige plaster studio wall, calm natural expression, 50mm lens look

> The same person from the reference photo, same clothes, now sitting on a
> simple light-wood stool, full body with shoes, same backdrop and light

**Colour variant of a model photo** (reference = that pose in white):
> Recolour only the {garment} to {colour} ({hex}). Keep the person, face, pose,
> hands, framing, backdrop and light identical. Blank chest, no print or logo.

Rules that matter:
- Backdrop for garments: **light warm grey**, never chroma green (green spill
  on white fabric).
- Keep the chest blank: the site prints the chosen painting there.
- Generate the white master first, review it, then derive every colour from it.
- Review each thumbnail before moving on. Reject: logo/print on chest, extra
  hands, cropped sleeves, hanger or clip in a garment shot, different pose or
  framing in a colour variant (the print position is shared across colours).

## Painting mockups (held frame)

The owner rejected paintings shown in floating frames on the line: the line
stays paper + pegs on a rope. The framed look is a **hover mockup** in the
collection and the lightbox: a person in cream/beige linen against a warm
plaster wall holding an empty light-oak frame with a white mat, perfectly
straight-on (no tilt), blank white paper inside — one photo per ratio
(`assets/products/paintings/held-{4x5,3x4,5x4,1x1}.webp`). The paper window of
each photo is measured (brightest large region; tune the threshold per photo
so it stops at the mat bevel, then check it drawn on the image) and stored in
`content/paintings.json` → `mockups`. `paintings.js` lays the painting into
the window (cover fit, multiply, bevel shadow, faint glass sheen).

## Stickers and try-on objects

Sticker art (`assets/products/stickers/<id>.webp`): generate "Die-cut vinyl
sticker of a hand-painted watercolour {subject}, loose soft washes with
visible pigment blooms and paper grain, muted earthy palette, thick clean
white sticker border following the shape, centered, flat front view, on a
plain medium warm grey background, no text, no shadow" (square), then
`remove-background` — the white border survives (check on a dark backdrop).
Objects (`.../stickers/objects/`): blank laptop lid (top-down), bottle (front),
kraft notebook, phone case, very light grey backdrop, cut out. The page clips
stickers to each object's alpha, so the cut-out edge must be clean.

## Calendar

Month paintings (`assets/products/calendar/<jan..dec>.webp`, 4:3): "Hand-painted
loose watercolour illustration, full bleed, of {the month's Palestinian scene},
visible pigment blooms and cold-press paper texture, muted earthy palette,
calm and poetic, no people, no text, no border". Mockups: a blank wall
calendar on a plaster wall and a blank desk calendar, straight-on; the blank
page is measured (edge gradient on a centre row/column, stop below the wire
binding) into `content/calendar.json` → `mockups`, and `calendar.js` draws the
chosen month there. Export grids: a page is at most 8000 px wide.

The live wall calendar stands on its own (no wall). `binding.webp` is a macro
photo of a wire-o strip keyed out by darkness against a max-filtered
background; one loop period (240 px at 4000 wide) is tiled 16× each side of
the hanger hook (whose left half is mirrored so it is symmetric), for a real
pitch of ~34 loops across the page. The wire lies on the paper's top edge,
58.5% down the strip. `paper.webp` is only the fine grain of a paper photo
(the blur-removed high pass), laid over the pages with `multiply`.

## Export (full resolution) — grid pages

Exporting one page per image costs one edit call per image. Instead lay a
whole set out as a grid on one big page and slice it locally:

1. Holder design: "Warm beige Instagram photo holder" (`DAHWgLZfDEc`), or
   `create-design` a blank page.
2. `read-design` `open_transaction: true`; `edit-design` `add_page` at
   **5400×2700** (5 colours × 2 rows of 1080×1350). A page may not exceed
   **25,000,000 px** (5400×5400 is refused).
3. One `edit-design` per page with all its `insert_fill` operations
   (`left = col*1080`, `top = row*1350`, `width 1080`, `height 1350`).
   Columns are the colours in a fixed order (white, charcoal, sage, sand,
   clay), rows are the pieces/models.
4. `edit-design` `finalize:"commit"`.
5. `export-design`: cut-outs as `png` + `transparent_background:true`;
   photos as `jpg` quality 92. `curl` each URL at once (they expire).
6. Slice with PIL (see the history of `assets/products/hoodies/`): for a
   garment type, crop every colour to the **same** box (the union of their
   alpha bounds) so the print lands in the same place on every colour.

If one `remove-background` is unavailable for a **dark** garment on the light
grey backdrop, a luminance key is clean enough (alpha from `bg - lum`, shrink
the edge 1px, then pull semi-transparent edge pixels down to the cloth's
luminance so no light halo shows between sleeve and body). Check it on a dark
background too — halos show there first. Never do this for light garments.

After new garment photos, re-measure `products.<type>.print` in
`content/cloth.json` (draw the box on the white piece and look).

The page is "On cloth" (`/cloth/`, `content/cloth.json`): hoodies, sweatshirts,
tote bags and caps. Totes and caps follow the same recipe: a white ghost
master ("tote bag … 3D volume as if gently filled, two long handles standing up
in a relaxed arch" / "six-panel cotton twill dad cap … seen slightly from above
so the front panels face the camera"), four colour variants from it, cut out,
in `assets/products/cloth/{tote,cap}/`. Their model photos
(`assets/products/cloth/looks/{t1,c1}-stand-<colour>.webp`) keep the bag's blank
front flat toward the camera, and frame the cap wearer close (top of the cap to
mid chest) so the print is large enough to read. White masters: tote
`MAHWkQpH2Po`, cap `MAHWkTiDkos`; models: tote `MAHWkR1uPws`, cap `MAHWkVdQd5k`.

## Rate limits and timing

- `generate-image`: 10 calls per rolling minute. Send 8 at a time, poll the
  previous batch (`get-generate-image-job`) while the window clears.
- `remove-background` is synchronous and was not rate-limited in practice.

## To the web

`python3 tools/web_image.py IN.png OUT.webp --width 900 [--trim]`
trims transparent margins (cut-outs), resizes, and writes WebP. Put garments
in `assets/products/hoodies/<type>/<colour>.webp` and models in
`assets/products/hoodies/looks/<model>-<pose>-<colour>.webp`.

## QA before committing

- Open 3–4 images at 100% (crop with PIL and `Read` them): edges on hair,
  cuffs and hood must be clean, no halo, no grey matte.
- Line up the colours of one mockup (same size, side by side): shape, folds
  and framing must match; if one drifts, regenerate it.
- Look at the page itself (Playwright screenshots, desktop 1400px and mobile
  390px) before saying it is done.
