# Home page: collage sketch (not built yet)

The owner asked to agree on the design before coding. Preview: https://claude.ai/artifact/Gwbo9cYjzjMy7FazuHf3U1

- Background: the owner's paper photo, mirrored into a seamless tile and faded 40% (`assets/paper.jpg`).
- Landing: a sheet with the logo crumples (`half.webp`) into a ball (`ball.webp`) that is tossed aside to reveal the home.
- Home: every collection small and on the first screen, as a collage: the painting and postcards painted straight onto the
  paper (`painted.py` gives them a watercolour edge; shown with `multiply`), a tossed hoodie with the print,
  a real calendar seen from above, small stickers, a sketchbook for "more designs", brush and palette, handwritten labels
  (Aref Ruqaa / Caveat). Farah below: the figure alone (no circle) with a taped note.
- Photos are Canva generations, cut out with remove-background (export page 44 of `DAHWgLZfDEc`).
- `comp.src.html` + `build.py` make the self-contained sketch (fonts: `fonts.css` URLs are downloaded and inlined).
