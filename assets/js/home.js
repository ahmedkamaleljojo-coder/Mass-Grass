/* Mass & Grass — home page.
   A flat lay: the work lies on the paper like a styled photo (paintings on deckled paper, a sticker,
   a tote with a print, the calendar, postcard stamps) between olive branches and a swallow. Every
   piece is a real photo with its painting and shadow built in (tools/home_pieces.py). Under the
   flat lay, Farah waves. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const P = MG.page, T = P.table, site = MG.site;

  const img = (src, cls = '', alt = '') => `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  // The flat lay: each entry of home.json → table is a real photo with its shadow, placed at
  // x/y/w (% of the table) and tilted r degrees; m holds the same four numbers for phones.
  // Pieces with a collection (col) open its page; the rest (branches, the swallow) only decorate.
  // A piece's name stays hidden and appears small under it when you point at it or, on a
  // touch screen, on the first tap (the second tap opens the page).
  function renderTable() {
    const byId = Object.fromEntries(site.collections.map(c => [c.id, c]));
    $('#table').innerHTML = T.map((p, i) => {
      const m = p.m || [p.x, p.y, p.w, p.r];
      const vars = `--i:${i};--x:${p.x ?? m[0]}%;--y:${p.y ?? m[1]}%;--w:${p.w ?? m[2]}%;--r:${p.r ?? m[3]}deg;--mx:${m[0]}%;--my:${m[1]}%;--mw:${m[2]}%;--mr:${m[3]}deg;--z:${p.z || 1}`;
      const hide = p.hide ? ` hide-${p.hide}` : '';
      const c = p.col && byId[p.col];
      if (!c) return `<span class="pc deco${hide}" style="${vars}" aria-hidden="true">${img(p.img)}</span>`;
      return `<a class="pc${hide}" href="${MG.colLink(c)}" data-col="${c.id}" style="${vars}" aria-label="${esc(L(c.title))}">
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
