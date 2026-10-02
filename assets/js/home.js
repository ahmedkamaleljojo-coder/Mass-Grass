/* Mass & Grass — home page.
   A collage of Farah's own work: her paintings printed and pinned, the real postcards, her drawings
   cut out as stickers, illustrations from the book she drew painted straight on the page, the
   calendar, the tote and a folded hoodie, real pins and clips (tools/collage_pieces.py and
   tools/home_pieces.py). Pieces can be moved around; under the collage, Farah waves. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const P = MG.page, T = P.table, site = MG.site;

  const img = (src, cls = '', alt = '') => `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  // The collage: each entry of home.json → table is a real piece (a print, a postcard, a sticker,
  // a drawing, a pin) placed on a board of fixed proportions (1600×900 units wide, 900×1800 on
  // phones) at [x, y, width, tilt]; the board scales as a whole. Things clipped or pinned to a piece
  // (on) travel with it. Every piece can be picked up and moved; it stays where it is dropped (kept
  // in this browser). A short press without moving opens the piece's page. Pointing at a piece
  // writes a small note next to it in blue pen, with a hand-drawn arrow.
  const BOARD = { d: [1600, 900], m: [900, 1800] };
  const KEY = 'mg-collage-1';
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  const phone = () => matchMedia('(max-width: 760px)').matches;
  const pct = (v, k) => [v[0] / BOARD[k][0] * 100, v[1] / BOARD[k][1] * 100, v[2] / BOARD[k][0] * 100, v[3]];
  // a pen arrow from the note toward the piece, one per side
  const ARROW = {
    top: 'M8 4 C 14 18, 22 30, 34 38 M26 37 L34 38 L31 30',
    bottom: 'M30 40 C 22 28, 16 16, 6 6 M14 5 L6 6 L7 14',
    left: 'M4 10 C 16 8, 28 14, 38 26 M30 25 L38 26 L37 18',
    right: 'M40 10 C 28 8, 16 14, 6 26 M14 25 L6 26 L7 18',
  };
  function renderTable() {
    const byId = Object.fromEntries(site.collections.map(c => [c.id, c]));
    const k = phone() ? 'm' : 'd';
    $('#table').innerHTML = T.map((p, i) => {
      const v = p[k];
      if (!v) return '';
      const [x, y, w, r] = pct(v, k), at = (saved[k] || {})[p.id];
      const c = p.col && byId[p.col];
      const note = p.note ? L(p.note) : c ? L(c.title) : '';
      const on = (p.on || []).map(o => `<img class="pc-on" src="${esc(o.img)}" alt="" style="left:${o.x}%;top:${o.y}%;width:${o.w}%;rotate:${o.r}deg" draggable="false">`).join('');
      const text = p.text ? `<span class="pc-text">${esc(t('note'))}</span>` : '';
      const nt = note ? `<span class="nt nt-${p.side || 'top'}" aria-hidden="true"><svg viewBox="0 0 44 44"><path d="${ARROW[p.side || 'top']}"/></svg><b>${esc(note)}</b></span>` : '';
      const tag = c ? 'a' : 'span', href = c ? ` href="${MG.colLink(c)}"` : '';
      return `<${tag} class="pc${c ? ' pc-a' : ''}"${href} data-id="${p.id}" style="--i:${i};--z:${p.z ?? 1};left:${at ? at[0] : x}%;top:${at ? at[1] : y}%;width:${w}%;--r:${r}deg"${c ? ` aria-label="${esc(note)}"` : ''} draggable="false">
        <span class="pc-in"><img src="${esc(p.img)}" alt="" draggable="false">${on}${text}</span>${nt}</${tag}>`;
    }).join('');
    $('#tableReset').hidden = !Object.keys(saved[k] || {}).length;
  }

  // pick up, move, drop: the piece stays where it is left
  let drag = null, top = 50;
  $('#table').addEventListener('pointerdown', e => {
    const el = e.target.closest('.pc');
    if (!el || e.button > 0) return;
    const box = $('#table').getBoundingClientRect(), r = el.getBoundingClientRect();
    drag = { el, id: el.dataset.id, box, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false };
    el.setPointerCapture(e.pointerId);
  });
  $('#table').addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
    if (!drag.moved) { drag.moved = true; drag.el.classList.add('held'); drag.el.style.zIndex = ++top; }
    const b = drag.box, x = (e.clientX - drag.dx - b.left) / b.width * 100, y = (e.clientY - drag.dy - b.top) / b.height * 100;
    drag.el.style.left = Math.max(-8, Math.min(98, x)) + '%';
    drag.el.style.top = Math.max(-8, Math.min(96, y)) + '%';
  });
  const drop = () => {
    if (!drag) return;
    const d = drag; drag = null;
    d.el.classList.remove('held');
    if (!d.moved) return;
    d.el.dataset.justMoved = '1';
    const k = phone() ? 'm' : 'd';
    saved[k] = saved[k] || {};
    saved[k][d.id] = [parseFloat(d.el.style.left), parseFloat(d.el.style.top)];
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* private mode: it still stays for this visit */ }
    $('#tableReset').hidden = false;
  };
  $('#table').addEventListener('pointerup', drop);
  $('#table').addEventListener('pointercancel', drop);
  // a drag is not a click; a tap on a touch screen first shows the note, the second opens the page
  $('#table').addEventListener('click', e => {
    const a = e.target.closest('a.pc');
    if (!a) return;
    if (a.dataset.justMoved) { e.preventDefault(); delete a.dataset.justMoved; return; }
    if (!matchMedia('(hover: hover)').matches && !a.classList.contains('on')) {
      e.preventDefault();
      $$('#table .pc.on').forEach(o => o.classList.remove('on'));
      a.classList.add('on');
    }
  });
  $('#tableReset').addEventListener('click', () => {
    delete saved[phone() ? 'm' : 'd'];
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* ignore */ }
    renderTable();
  });
  let lastMode = phone();
  addEventListener('resize', () => { if (phone() !== lastMode) { lastMode = phone(); renderTable(); } });

  function render() {
    renderTable();
    $('#storyFace .f-stand').src = P.story.portrait; $('#storyFace .f-wave').src = P.story.wave;
    document.title = L(P.meta.title);
  }
  render();
  MG.onLang(render);

  // very smooth scrolling (Lenis); the browser's own scroll when motion is reduced
  if (window.Lenis && !MG.reduced) {
    const lenis = new Lenis({ lerp: .075, wheelMultiplier: .9, smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  // the story note settles in as it comes on screen
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .2 });
  $$('.h-story-in').forEach(el => io.observe(el));
});
