/* Mass & Grass — shared shell for inner pages.
   Loads /content/site.json plus the page's own content file (named in
   <meta name="mg-content">), renders the header and footer, and handles
   the Arabic/English switch. Pages register with MG.ready(fn). */
(function (global) {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  const MG = {
    $, $$, store,
    lang: store.get('mg-lang') === 'en' ? 'en' : 'ar',
    site: null, page: null,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    finePointer: matchMedia('(pointer: fine)').matches,
    L(v) { return (v && typeof v === 'object' && ('ar' in v || 'en' in v)) ? (v[MG.lang] ?? v.ar) : v; },
    t(path) {
      const [src, key] = path.includes(':') ? path.split(':') : ['page', path];
      const v = key.split('.').reduce((o, k) => (o == null ? o : o[k]), src === 'site' ? MG.site : MG.page);
      return MG.L(v) ?? '';
    },
    esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },
    num(n) { return MG.lang === 'ar' ? Number(n).toLocaleString('ar-EG', { useGrouping: false }) : String(n); },
    pad(n) { return MG.num(String(n).padStart(2, '0')).padStart(2, MG.lang === 'ar' ? '٠' : '0'); },
    colLink(c) { return `/${c.id}/`; },
    contactHref() {
      const k = MG.site.contact || {};
      if (k.whatsapp) return `https://wa.me/${k.whatsapp}`;
      if (k.instagram) return `https://instagram.com/${k.instagram.replace(/^@/, '')}`;
      return '#contact';
    },
    order(title) {
      const k = MG.site.contact || {};
      if (k.whatsapp) {
        const msg = MG.lang === 'ar' ? `مرحبا Mass & Grass، مهتمة/مهتم بـ: ${title}` : `Hi Mass & Grass, I'm interested in: ${title}`;
        return `https://wa.me/${k.whatsapp}?text=${encodeURIComponent(msg)}`;
      }
      return MG.contactHref();
    },
    toast(msg) {
      const el = $('#toast'); if (!el) return;
      el.textContent = msg; el.classList.add('on');
      clearTimeout(MG._tt); MG._tt = setTimeout(() => el.classList.remove('on'), 2600);
    },
    _langCbs: [],
    onLang(fn) { MG._langCbs.push(fn); },
    setLang(l) {
      MG.lang = l;
      const ar = l === 'ar';
      document.documentElement.lang = l;
      document.documentElement.dir = ar ? 'rtl' : 'ltr';
      document.body.classList.toggle('lang-ar', ar);
      document.body.classList.toggle('lang-en', !ar);
      const btn = $('#langBtn'); if (btn) btn.textContent = ar ? 'EN' : 'ع';
      $$('[data-t]').forEach(el => { el.textContent = MG.t(el.dataset.t); });
      renderNav(); renderFooter();
      MG._langCbs.forEach(fn => fn(l));
      store.set('mg-lang', l);
    }
  };

  function renderNav() {
    const cur = document.body.dataset.page;
    const html = MG.site.collections.map(c =>
      `<a href="${MG.colLink(c)}" data-col="${c.id}" style="--c:${c.color}"${c.id === cur ? ' aria-current="page"' : ''}>${MG.esc(MG.L(c.title))}</a>`).join('');
    ['#nav', '#chips'].forEach(s => { const el = $(s); if (el) el.innerHTML = html; });
    $$('#nav a, #chips a, #footCols a').forEach(bindCol);
    const chip = $('#chips [aria-current]');
    if (chip) setTimeout(() => chip.scrollIntoView({ block: 'nearest', inline: 'center' }), 60);
    $$('[data-contact]').forEach(a => { a.href = MG.contactHref(); a.textContent = MG.t('site:ui.contact'); });
  }
  function bindCol(a) {
    const c = MG.site.collections.find(x => x.id === a.dataset.col);
    if (!c || c.ready || a.dataset.bound) return;
    a.dataset.bound = '1';
    a.addEventListener('click', e => { e.preventDefault(); MG.toast(`${MG.L(c.title)}: ${MG.t('site:ui.soon')}`); });
  }
  function renderFooter() {
    const cols = $('#footCols');
    if (cols) {
      cols.innerHTML = MG.site.collections.map(c => `<li><a href="${MG.colLink(c)}" data-col="${c.id}">${MG.esc(MG.L(c.title))}</a></li>`).join('');
      $$('a', cols).forEach(bindCol);
    }
    const k = MG.site.contact || {}, items = [];
    if (k.instagram) items.push(`<li><a href="https://instagram.com/${MG.esc(k.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener">Instagram · @${MG.esc(k.instagram.replace(/^@/, ''))}</a></li>`);
    if (k.whatsapp) items.push(`<li><a href="https://wa.me/${MG.esc(k.whatsapp)}" target="_blank" rel="noopener">WhatsApp · <span dir="ltr">+${MG.esc(k.whatsapp)}</span></a></li>`);
    if (k.email) items.push(`<li><span dir="ltr">${MG.esc(k.email)}</span></li>`);
    const fc = $('#footContact');
    if (fc) fc.innerHTML = items.length ? items.join('') : `<li>${MG.esc(MG.t('site:ui.contactSoon'))}</li>`;
    const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
    const tg = $('#footTag'); if (tg) tg.textContent = MG.L(MG.site.brand.tagline);
    const nt = $('#footNote'); if (nt) nt.textContent = MG.L(MG.site.brand.description);
  }
  function paintLogo() {
    const c = $('#logoMark'); if (!c || !global.Watercolor) return;
    const W = global.Watercolor, ctx = c.getContext('2d'), r = W.rng(3), P = MG.site.palette;
    W.paintNow(ctx, { x: 38, y: 40, radius: 26, color: P.clay, layers: 22, alpha: .07, rand: r, sides: 7 });
    W.paintNow(ctx, { x: 54, y: 50, radius: 18, color: P.sage, layers: 18, alpha: .08, rand: r, sides: 7 });
  }

  // <meta name="mg-content" content="hoodies,paintings">: the first file is
  // the page's own content, the rest are available as MG.more[name].
  async function load() {
    if (global.__CONTENT__) return global.__CONTENT__;
    const names = (($('meta[name="mg-content"]') || {}).content || '').split(',').map(s => s.trim()).filter(Boolean);
    const get = u => fetch(u).then(r => r.json());
    const [site, ...files] = await Promise.all([get('/content/site.json'), ...names.map(n => get(`/content/${n}.json`))]);
    const more = {};
    names.slice(1).forEach((n, i) => { more[n] = files[i + 1]; });
    return { site, page: files[0] || null, more };
  }

  const readyCbs = [];
  let booted = false;
  MG.ready = fn => { booted ? fn(MG) : readyCbs.push(fn); };

  load().then(data => {
    MG.site = data.site; MG.page = data.page; MG.more = data.more || {};
    const btn = $('#langBtn');
    if (btn) btn.addEventListener('click', () => MG.setLang(MG.lang === 'ar' ? 'en' : 'ar'));
    paintLogo();
    booted = true;
    readyCbs.forEach(fn => fn(MG));
    MG.setLang(MG.lang);
  });

  global.MG = MG;
})(window);
