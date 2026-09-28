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

**Garment for the line** (front, no hanger — it is clipped on the site):
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
