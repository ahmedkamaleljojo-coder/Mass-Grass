/* Mass & Grass — search across every piece in the shop.
   The search button in the header opens a paper sheet with one field; typing lists the matching
   paintings, stickers, calendar months, clothes and postcards (in either language) with a link
   to their page. The list is built from the same content files the pages use, the first time
   the sheet opens (a preview supplies it ready-made as window.__SEARCH__). */
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

  // Arabic and English folded the same way: no diacritics, one form of alef, ya and ta marbuta
  const fold = s => String(s || '').toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

  let index = null;
  async function build() {
    if (window.__SEARCH__) return window.__SEARCH__;
    const get = u => fetch(u).then(r => r.json()).catch(() => null);
    const [site, paintings, catalog, stickers, calendar, cloth, postcards] = await Promise.all(
      ['site', 'paintings', 'catalog/paintings', 'stickers', 'calendar', 'cloth', 'postcards'].map(n => get(`/content/${n}.json`)));
    const sec = id => ((site && site.collections) || []).find(c => c.id === id) || { id, title: { ar: id, en: id } };
    const out = [];
    const add = (id, title, img, extra) => title && out.push({ sec: sec(id).title, href: `/${id}/`, title, img: img || '', extra: extra || null });
    const pItems = (paintings && paintings.itemsFile ? catalog && catalog.items : paintings && paintings.items) || [];
    pItems.forEach(p => add('paintings', p.title, p.image || p.src));
    ((stickers && stickers.items) || []).forEach(s => add('stickers', s.title, s.src));
    ((calendar && calendar.months) || []).forEach(m => add('calendars', m.name, m.art, m.folk));
    ((cloth && cloth.items) || []).forEach(c => add('cloth', c.title, ''));
    ((postcards && postcards.cards) || []).forEach(c => add('postcards', c.title, c.art, c.city));
    // the sections themselves, so "ملصقات" or "calendar" finds the page
    ((site && site.collections) || []).filter(c => c.ready && !c.hidden).forEach(c => out.push({ sec: null, href: `/${c.id}/`, title: c.title, img: '' }));
    return out;
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
        ${it.img ? `<img src="${esc(it.img)}" alt="" loading="lazy">` : '<span class="search-dot" aria-hidden="true"></span>'}
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
