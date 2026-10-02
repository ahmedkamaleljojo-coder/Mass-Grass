/* Mass & Grass — search across every piece in the shop.
   The search button in the header opens a paper sheet with one field; typing lists the matching
   paintings, stickers, calendar months, clothes and postcards (in either language) with a link
   to their page. The list comes from catalog.js, the first time the sheet opens. */
(function () {
  'use strict';
  const btn = document.getElementById('searchBtn');
  if (!btn) return;

  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'ar');
  const L = v => (v && typeof v === 'object') ? (v[lang()] ?? v.ar ?? '') : (v ?? '');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const UI = {
    label: { ar: 'بحث في المتجر', en: 'Search the shop' },
    place: { ar: 'لوحة، ملصق، مدينة…', en: 'A painting, a sticker, a city…' },
    none: { ar: 'لا توجد نتائج.', en: 'Nothing found.' },
    close: { ar: 'إغلاق', en: 'Close' }
  };

  const fold = s => window.MGCatalog.fold(s);

  let index = null;
  async function build() {
    const items = await window.MGCatalog.load();
    const list = items.map(it => ({ sec: it.secTitle, href: it.href, title: it.title, img: it.img || '', extra: it.extra || null }));
    // the sections themselves, so "ملصقات" or "calendar" finds the page
    const cols = new Map(); items.forEach(it => cols.set(it.sec, it.secTitle));
    cols.forEach((title, id) => list.push({ sec: null, href: `/${id}/`, title, img: '' }));
    return list;
  }

  let sheet, input, list;
  function make() {
    sheet = document.createElement('div');
    sheet.className = 'search';
    sheet.hidden = true;
    sheet.innerHTML = `<div class="search-back" data-close></div>
      <div class="search-sheet" role="dialog" aria-modal="true">
        <div class="search-row">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>
          <input type="search" autocomplete="off" spellcheck="false">
          <button class="search-x" type="button" data-close>✕</button>
        </div>
        <ul class="search-list" role="listbox"></ul>
      </div>`;
    document.body.appendChild(sheet);
    input = sheet.querySelector('input');
    list = sheet.querySelector('.search-list');
    sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
    input.addEventListener('input', show);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const a = list.querySelector('a'); if (a) a.click(); }
    });
  }

  function show() {
    const q = fold(input.value.trim());
    if (!q || !index) { list.innerHTML = ''; return; }
    const words = q.split(/\s+/);
    const hits = index.filter(it => {
      const hay = fold([it.title.ar, it.title.en, it.sec && it.sec.ar, it.sec && it.sec.en, it.extra && it.extra.ar, it.extra && it.extra.en].join(' '));
      return words.every(w => hay.includes(w));
    }).slice(0, 12);
    list.innerHTML = hits.length ? hits.map(it => `<li><a href="${esc(it.href)}">
        ${it.img ? `<img src="${esc(it.img)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<span class="search-dot" aria-hidden="true"></span>'}
        <b>${esc(L(it.title))}</b>${it.sec ? `<i>${esc(L(it.sec))}</i>` : ''}</a></li>`).join('')
      : `<li class="search-none">${esc(L(UI.none))}</li>`;
  }

  async function open() {
    if (!sheet) make();
    sheet.querySelector('.search-sheet').setAttribute('aria-label', L(UI.label));
    sheet.querySelector('.search-x').setAttribute('aria-label', L(UI.close));
    input.placeholder = L(UI.place);
    input.setAttribute('aria-label', L(UI.label));
    sheet.hidden = false;
    document.documentElement.classList.add('search-on');
    input.focus();
    if (!index) { index = await build(); }
    show();
  }
  function close() {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    document.documentElement.classList.remove('search-on');
    btn.focus();
  }

  btn.addEventListener('click', open);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
    else if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
  });
})();
