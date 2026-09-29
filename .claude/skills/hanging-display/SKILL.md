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
5. **No visible hold.** The owner removed pegs, hangers, rails, the rope and
   the tape: pieces simply hang from one top line. The chosen piece gets a
   deeper shadow.
6. **The name.** The chosen piece's name sits small, above the rope, and must
   always show in full (never clipped by the stage).
7. **Auto-advance** every ~4.2s while visible; any click restarts the timer;
   `prefers-reduced-motion` stops sway and auto-advance; pause sway when the
   section is off screen (`IntersectionObserver` → `.motion-paused`).
8. **Mobile:** same line, pieces ~8vw, chosen `min(58vw,300px)`; the line can
   scroll sideways (`overflow-x:auto; scroll-snap`), chosen piece scrolled
   into the centre.

## Our version (Mass & Grass)

- Theme stays ours: white paper (dark theme via `data-theme`), clay,
  watercolour. Nothing drawn above the pieces except the small name.
- Ten pieces. The line is **not** native scroll: `cloth.js` keeps a float
  index `pos` and places every piece absolutely each frame. Width, opacity
  and grey follow the distance from `pos` continuously (smoothstep), so
  while dragging the piece passing the middle **grows and the rest shrink**
  — the owner asked for exactly this. Drag with any pointer
  (`touch-action:pan-y`), flick settles on the nearest piece with a spring,
  trackpad sideways swipes step one piece. Pieces swing from the line's
  screen velocity. Any drag stops auto-advance (`takeOver`). RTL mirrors x.
- Pieces are **real photos per colour** (see `canva-product-photos`). A colour
  swatch swaps `src` to the photo of that colour — crossfade two `<img>`s,
  never tint in code.
- The chosen painting is printed on the chest in the browser (it is the one
  thing that changes per visitor). Our paintings are watercolours whose
  washes run to the image edge, so a straight print reads as a pasted box.
  `printOn` in `assets/js/cloth.js` therefore: turns paper and faint wash
  into no-ink (`inkOf`), shades the ink by the fabric's folds, clips it with
  an organic watercolour rim painted by `Watercolor.paintNow` (`edgeOf`),
  multiplies it into light cloth and lays it over mid/dark cloth.
- Picking a painting **paints itself onto the piece** in place (blooms into
  a mask, top-down, ~4s) — it never flies in from elsewhere.
- One standing model photo of the chosen piece/colour beside the info (with
  the lens). No seated/zoom views — the owner removed them.
- Collection cards: painting → on hover the model photo, shown whole
  (`object-fit:contain`), never cropped.
- Sales are digital: the order button opens the WhatsApp / email / Instagram
  sheet (`MG.openOrder`).

## Checklist

- [ ] Only one piece is large; dimming by distance works both directions.
- [ ] Sway is subtle (≤1.2°) and out of phase; stops with reduced motion.
- [ ] Colour swatches swap real photos with a crossfade; print stays aligned.
- [ ] Rope and tape look clean at 100% zoom; the name above the rope is whole.
- [ ] Drag moves the line; light and dark themes both checked.
- [ ] RTL and LTR both correct; keyboard: arrows move, Enter opens.
- [ ] Screenshots at 1400px and 390px reviewed before calling it done.
