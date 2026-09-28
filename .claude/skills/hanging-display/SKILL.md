---
name: hanging-display
description: How Mass & Grass shows garments — pieces clipped on a line, the chosen one large and centred, the rest small and dimmed, gentle sway, colour swatches that swap real photos, model photos of the piece. Based on the madeeingaza.com "Cities you wear" display. Use when building or changing the hoodies/tees display, its motion, or its colour and model views.
---

# The hanging display

Reference: madeeingaza.com → designs → "مُدنٌ تُلبَس". Studied from its
`app.js` (`buildCityHero`, `showCity`) and `site.css` (`.cty-*`).

## What makes it feel professional

1. **One clear piece.** The chosen piece is big (≈25vw, max ~390px) and fully
   lit; neighbours are small. Nothing competes with it.
2. **Distance = dimness.** Others fade by distance from the chosen one:
   - chosen: `opacity:1; filter:none`
   - ±1: `opacity:.6; filter:grayscale(.28) brightness(.84)`
   - ±2: `opacity:.42; filter:grayscale(.45) brightness(.74)`
   - rest: `opacity:.3; filter:grayscale(.6) brightness(.66)`
3. **Growth by layout, not by transform.** Pieces are flex items on the line;
   choosing one animates `flex-basis` (small → large), so neighbours slide
   aside naturally: `transition:flex-basis .75s cubic-bezier(.22,.86,.24,1),
   opacity .55s, filter .55s`.
4. **Quiet sway.** Each piece swings from its clip: `transform-origin:50% -6%`,
   `@keyframes sway{from{rotate:-1.15deg}to{rotate:1.15deg}}`, `ease-in-out
   infinite alternate`, duration `4.9s + (i%4)*.55s`, negative delay
   `-(i*.73)s` so they never move in step. No physics engine, no big angles.
5. **The clip.** A small peg at the top centre (≈11×19px, 14×24 on the chosen
   one) above the image; the line/rope runs behind the pegs. The chosen
   piece's image gets a deeper shadow plus a soft glow in its accent colour.
6. **Stage colour.** The section background is a radial glow of the chosen
   piece's accent (`--acc`), transitioned over 1s. A huge outlined name sits
   behind the line and swaps with a short fade/slide.
7. **Auto-advance** every ~4.2s while visible; any click restarts the timer;
   `prefers-reduced-motion` stops sway and auto-advance; pause sway when the
   section is off screen (`IntersectionObserver` → `.motion-paused`).
8. **Mobile:** same line, pieces ~8vw, chosen `min(58vw,300px)`; the line can
   scroll sideways (`overflow-x:auto; scroll-snap`), chosen piece scrolled
   into the centre.

## Our version (Mass & Grass)

- Theme stays ours: paper beige, clay, watercolour. The line is a **jute rope**
  with **wooden clothes pegs** (Canva-generated, cut out), not a wire.
- Pieces are **real photos per colour** (see `canva-product-photos`). A colour
  swatch swaps `src` to the photo of that colour — crossfade two `<img>`s,
  never tint in code.
- The chosen painting is printed on the chest in the browser (it is the one
  thing that changes per visitor). Our paintings are watercolours whose
  washes run to the image edge, so a straight print reads as a pasted box.
  `printOn` in `assets/js/hoodies.js` therefore: turns paper and faint wash
  into no-ink (`inkOf`), shades the ink by the fabric's folds, clips it with
  an organic watercolour rim painted by `Watercolor.paintNow` (`edgeOf`),
  multiplies it into light cloth and lays it over mid/dark cloth.
- Clicking the chosen piece (or "شوفيها ملبوسة") shows the **model photos** of
  that piece in that colour: standing, seated and a close crop on the print,
  as a photo card with thumbnails — the model stays in the photo's own
  backdrop, never cut out.
- Collection cards: painting → on hover the model photo (same colour); click
  opens the same gallery.

## Checklist

- [ ] Only one piece is large; dimming by distance works both directions.
- [ ] Sway is subtle (≤1.2°) and out of phase; stops with reduced motion.
- [ ] Colour swatches swap real photos with a crossfade; print stays aligned.
- [ ] Line and pegs read as real objects at 100% zoom.
- [ ] RTL and LTR both correct; keyboard: arrows move, Enter opens.
- [ ] Screenshots at 1400px and 390px reviewed before calling it done.
