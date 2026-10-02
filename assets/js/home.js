/* Mass & Grass — home page.
   The work is scattered on the paper like objects dropped on a table: a painting on deckled paper,
   cut-out stickers, a calendar, a folded hoodie on a tote, two postcards and a sketchbook. Each piece
   is a link to its own page; under them, Farah waves. All images are real photos with the paintings
   printed onto them (assets/products/home/); the only thing drawn in code is the paper tape. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const P = MG.page, T = P.table, site = MG.site;

  const img = (src, cls = '', alt = '') => `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  // every piece is a real photo; the paintings are already printed on them
  const ART = {
    paintings: () => `<span class="o-print">${img(T.paintings.img)}<span class="tape t1"></span><span class="tape t2"></span></span>`,
    stickers: () => `<span class="o-stickers">${T.stickers.items.map((s, i) => img(s, `s s${i}`)).join('')}</span>`,
    calendars: () => `<span class="o-cal">${img(T.calendars.img)}</span>`,
    cloth: () => `<span class="o-cloth">${img(T.cloth.with, 'tote')}${img(T.cloth.img, 'hood')}</span>`,
    postcards: () => `<span class="o-cards">${T.postcards.cards.map((c, i) => img(c, `c c${i}`)).join('')}</span>`,
    designs: () => `<span class="o-book">${img(T.designs.object)}${img(T.designs.sticker, 'o-book-st')}</span>`,
  };

  function renderTable() {
    $('#table').innerHTML = site.collections.map((c, i) => `
      <a class="obj obj-${c.id}${c.ready ? '' : ' is-soon'}" href="${MG.colLink(c)}" data-col="${c.id}" style="--i:${i}"${c.ready ? '' : ' aria-disabled="true"'}>
        <span class="obj-art" aria-hidden="true">${ART[c.id] ? ART[c.id]() : ''}</span>
        <span class="obj-label">${esc(L(c.title))}${c.ready ? '' : ` <small>${esc(t('site:ui.soon'))}</small>`}</span>
      </a>`).join('');
    $$('#table .is-soon').forEach(a => a.addEventListener('click', e => { e.preventDefault(); MG.toast(`${L(site.collections.find(c => c.id === a.dataset.col).title)}: ${t('site:ui.soon')}`); }));
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
