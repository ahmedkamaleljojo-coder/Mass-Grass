/* Mass & Grass — home page.
   The work is laid out on the paper like objects on a table: a taped print, a few cut-out
   stickers, a wall calendar, a printed hoodie, two postcards and a sketchbook. Each piece is a link
   to its own page; under them, a short note about Farah's story. All images are real photos or
   scans; the only things drawn in code are the paper tape and the calendar's day numbers. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const P = MG.page, T = P.table, site = MG.site;

  const img = (src, cls = '', alt = '') => `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  // the month grid under the calendar painting: day numbers set as type, Friday in clay
  function monthGrid(first, days) {
    let h = '';
    for (let i = 0; i < first; i++) h += '<i></i>';
    for (let d = 1; d <= days; d++) h += `<i${(first + d - 1) % 7 === 5 ? ' class="f"' : ''}>${d}</i>`;
    return h;
  }
  const ART = {
    paintings: () => `<span class="o-print">${img(T.paintings.art)}<span class="tape t1"></span><span class="tape t2"></span></span>`,
    stickers: () => `<span class="o-stickers">${T.stickers.items.map((s, i) => img(s, `s s${i}`)).join('')}</span>`,
    calendars: () => `<span class="o-cal">${img(T.calendars.binding, 'o-cal-bind')}<span class="o-cal-page">${img(T.calendars.art, 'o-cal-art')}
      <span class="o-cal-name">${esc(L(T.calendars.month))}</span><span class="o-cal-days" aria-hidden="true">${monthGrid(T.calendars.firstDay, T.calendars.days)}</span></span></span>`,
    cloth: () => { const p = T.cloth.print; return `<span class="o-garment">${img(T.cloth.garment)}
      <span class="o-printwin" style="left:${p.x * 100}%;top:${p.y * 100}%;width:${p.w * 100}%;height:${p.h * 100}%">${img(T.cloth.art)}</span></span>`; },
    postcards: () => `<span class="o-cards">${T.postcards.cards.map((c, i) => `<span class="o-card c${i}">${img(c)}</span>`).join('')}</span>`,
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
    const face = $('#storyFace'); face.src = P.story.portrait; face.alt = L(P.story.title);
    document.title = L(P.meta.title);
  }
  render();
  MG.onLang(render);

  // the story note settles in as it comes on screen
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .2 });
  $$('.h-story-in').forEach(el => io.observe(el));
});
