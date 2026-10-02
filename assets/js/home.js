/* Mass & Grass — home page.
   A collage: the work laid on the paper like a scrapbook page (the painting taped on torn kraft
   paper, postcards and a stamp, the calendar, a print, stickers, the tote and a folded hoodie, a
   note, olive branches, brushes and a swallow). Every piece is a real photo with its painting and
   shadow built in (tools/home_pieces.py). Under the collage, Farah waves. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const P = MG.page, T = P.table, site = MG.site;

  const img = (src, cls = '', alt = '') => `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  // The collage: each entry of home.json → table is a real photo with its shadow, placed on a
  // board of fixed proportions (1600×860 units on wide screens, 900×1700 on phones) at [x, y,
  // width, tilt]; the board scales as a whole, so nothing shifts or overlaps differently from one
  // screen to another. Pieces with a collection (col) open its page; the rest only dress the table.
  // A piece's name stays hidden and appears small under it when you point at it or, on a touch
  // screen, on the first tap (the second tap opens the page).
  const BOARD = { d: [1600, 860], m: [900, 1700] };
  function place(p, k) {
    const b = BOARD[k], v = p[k];
    if (!v) return `--${k}show:none;`;
    return `--${k}x:${(v[0] / b[0] * 100).toFixed(2)}%;--${k}y:${(v[1] / b[1] * 100).toFixed(2)}%;--${k}w:${(v[2] / b[0] * 100).toFixed(2)}%;--${k}r:${v[3]}deg;`;
  }
  function renderTable() {
    const byId = Object.fromEntries(site.collections.map(c => [c.id, c]));
    $('#table').innerHTML = T.map((p, i) => {
      const vars = `--i:${i};--z:${p.z ?? 1};${place(p, 'd')}${place(p, 'm')}`;
      const note = p.note ? `<span class="pc-note">${esc(t('note'))}</span>` : '';
      const c = p.col && byId[p.col];
      if (!c) return `<span class="pc deco" style="${vars}" aria-hidden="${p.note ? 'false' : 'true'}">${img(p.img)}${note}</span>`;
      return `<a class="pc" href="${MG.colLink(c)}" data-col="${c.id}" style="${vars}" aria-label="${esc(L(c.title))}">
        ${img(p.img, '', L(c.title))}<span class="pc-name">${esc(L(c.title))}</span></a>`;
    }).join('');
    // touch: first tap shows the name, the second opens the page
    $$('#table a.pc').forEach(a => a.addEventListener('click', e => {
      if (matchMedia('(hover: hover)').matches || a.classList.contains('on')) return;
      e.preventDefault();
      $$('#table a.pc.on').forEach(o => o.classList.remove('on'));
      a.classList.add('on');
    }));
  }

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
