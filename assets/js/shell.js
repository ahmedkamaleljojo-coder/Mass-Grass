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
    // numbers stay in Western digits in both languages
    num(n) { return String(n); },
    pad(n) { return String(n).padStart(2, '0'); },
    colLink(c) { return `/${c.id}/`; },
    // the menu holds the collections; the story stands apart (its own link and the support button)
    navItems() { return MG.site.collections; },
    supportLinks() {
      const k = MG.site.support || {};
      return [
        { id: 'donate', href: k.donate, label: MG.t('site:ui.supportDonate') },
        { id: 'kofi', href: k.kofi, label: 'Ko-fi' }
      ];
    },
    contactHref() {
      const k = MG.site.contact || {};
      if (k.whatsapp) return `https://wa.me/${k.whatsapp}`;
      if (k.instagram) return `https://instagram.com/${k.instagram.replace(/^@/, '')}`;
      return '#contact';
    },
    // Sales are digital: an order is a message on WhatsApp, e-mail or Instagram,
    // and the file is sent back on the same channel. Any element with
    // data-order="<product>" opens the order sheet.
    order(title) { return `#order:${encodeURIComponent(title)}`; },
    orderMessage(title) {
      return MG.t('site:ui.order.message').replace('{product}', title);
    },
    openOrder(title) {
      const k = MG.site.contact || {}, msg = MG.orderMessage(title), ig = (k.instagram || '').replace(/^@/, '');
      const ch = [
        { id: 'whatsapp', on: !!k.whatsapp, href: `https://wa.me/${k.whatsapp}?text=${encodeURIComponent(msg)}` },
        { id: 'email', on: !!k.email, href: `mailto:${k.email}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(msg)}` },
        { id: 'instagram', on: !!ig, href: `https://ig.me/m/${ig}` }
      ];
      let d = $('#orderSheet');
      if (!d) {
        d = document.createElement('dialog'); d.id = 'orderSheet'; d.className = 'order-sheet';
        document.body.appendChild(d);
        d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
      }
      d.innerHTML = `<div class="os-in">
          <button class="os-x" type="button" data-close aria-label="${MG.esc(MG.t('site:ui.order.close'))}">✕</button>
          <span class="os-kick">${MG.esc(MG.t('site:ui.order.kick'))}</span>
          <h3 class="display">${MG.esc(title)}</h3>
          <p>${MG.esc(MG.t('site:ui.order.note'))}</p>
          <div class="os-ch">${ch.map(c => `<a class="os-b os-${c.id}${c.on ? '' : ' off'}" data-ch="${c.id}" href="${c.on ? MG.esc(c.href) : '#'}" target="_blank" rel="noopener"${c.on ? '' : ' aria-disabled="true"'}>
            <b>${MG.esc(MG.t(`site:ui.order.${c.id}`))}</b><i>${MG.esc(c.on ? MG.t(`site:ui.order.${c.id}Hint`) : MG.t('site:ui.order.soon'))}</i></a>`).join('')}</div>
        </div>`;
      $$('.os-b', d).forEach(a => a.addEventListener('click', e => {
        if (a.classList.contains('off')) { e.preventDefault(); MG.toast(MG.t('site:ui.contactSoon')); return; }
        if (a.dataset.ch === 'instagram' && navigator.clipboard) {   // Instagram can't pre-fill a message: copy it
          navigator.clipboard.writeText(msg).then(() => MG.toast(MG.t('site:ui.order.copied'))).catch(() => {});
        }
      }));
      if (!d.open) d.showModal();
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
    const html = MG.navItems().map(c =>
      `<a href="${MG.colLink(c)}" data-col="${c.id}" style="--c:${c.color}"${c.id === cur ? ' aria-current="page"' : ''}>${MG.esc(MG.L(c.title))}</a>`).join('');
    ['#nav', '#chips'].forEach(s => { const el = $(s); if (el) el.innerHTML = html; });
    $$('#nav a, #chips a, #footCols a').forEach(bindCol);
    const chip = $('#chips [aria-current]');
    if (chip) setTimeout(() => chip.scrollIntoView({ block: 'nearest', inline: 'center' }), 60);
    $$('[data-contact]').forEach(a => { a.href = MG.contactHref(); a.textContent = MG.t('site:ui.contact'); });
  }
  function bindCol(a) {
    const c = MG.navItems().find(x => x.id === a.dataset.col);
    if (!c || c.ready || a.dataset.bound) return;
    a.dataset.bound = '1';
    a.addEventListener('click', e => { e.preventDefault(); MG.toast(`${MG.L(c.title)}: ${MG.t('site:ui.soon')}`); });
  }
  function renderFooter() {
    const cols = $('#footCols');
    if (cols) {
      cols.innerHTML = MG.navItems().map(c => `<li><a href="${MG.colLink(c)}" data-col="${c.id}">${MG.esc(MG.L(c.title))}</a></li>`).join('');
      $$('a', cols).forEach(bindCol);
    }
    const k = MG.site.contact || {}, items = [];
    if (k.instagram) items.push(`<li><a href="https://instagram.com/${MG.esc(k.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener">Instagram · @${MG.esc(k.instagram.replace(/^@/, ''))}</a></li>`);
    if (k.whatsapp) items.push(`<li><a href="https://wa.me/${MG.esc(k.whatsapp)}" target="_blank" rel="noopener">WhatsApp · <span dir="ltr">+${MG.esc(k.whatsapp)}</span></a></li>`);
    if (k.email) items.push(`<li><span dir="ltr">${MG.esc(k.email)}</span></li>`);
    let fs = $('#footStory');
    if (!fs && cols) {
      const d = document.createElement('div');
      d.innerHTML = `<h4 data-t="site:ui.story"></h4><ul id="footStory"></ul>`;
      cols.closest('.foot-grid').appendChild(d); fs = $('#footStory');
    }
    if (fs) {
      fs.previousElementSibling.textContent = MG.t('site:ui.story');
      fs.innerHTML = `<li><a href="/story/">${MG.esc(MG.t('site:ui.storyRead'))}</a></li>` +
        MG.supportLinks().map(l => `<li><a href="${l.href ? MG.esc(l.href) : '/story/#support'}"${l.href ? ' target="_blank" rel="noopener"' : ''}>${MG.esc(l.label)}</a></li>`).join('');
    }
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

  // Pieces added from the content panel may leave out what the code needs:
  // the ratio comes as "4:5", and the id and colours can be empty.
  const DEFAULT_PALETTE = ['#9FB0B8', '#C79A45', '#7F8F5A', '#6B7A48', '#B0603A'];
  function tidyItem(it, i) {
    it = Object.assign({}, it);
    if (typeof it.ratio === 'string') it.ratio = it.ratio.split(':').map(Number);
    if (!Array.isArray(it.ratio) || it.ratio.length !== 2 || !it.ratio.every(n => n > 0)) it.ratio = [4, 5];
    if (!Array.isArray(it.palette) || it.palette.length < 3) it.palette = DEFAULT_PALETTE;
    if (!it.id) it.id = 'piece-' + (i + 1);
    if (!it.motif) it.motif = 'landscape';
    if (!it.available) it.available = { original: false, print: true };
    if (it.image === '') it.image = null;
    return it;
  }

  // <meta name="mg-content" content="hoodies,paintings">: the first file is
  // the page's own content, the rest are available as MG.more[name].
  async function load() {
    if (global.__CONTENT__) {
      const c = global.__CONTENT__;
      [c.page, ...Object.values(c.more || {})].forEach(d => { if (d && Array.isArray(d.items) && d.itemsFile) d.items = d.items.map(tidyItem); });
      return c;
    }
    const names = (($('meta[name="mg-content"]') || {}).content || '').split(',').map(s => s.trim()).filter(Boolean);
    const get = u => fetch(u).then(r => r.json());
    // a content file may keep its list of pieces in its own file (edited from the content panel)
    const withItems = async d => { if (d && d.itemsFile) d.items = ((await get(`/content/${d.itemsFile}.json`)).items || []).map(tidyItem); return d; };
    // contact and support links live in settings.json, which the content panel edits
    const [site, settings, ...files] = await Promise.all([get('/content/site.json'), get('/content/settings.json').catch(() => ({})),
      ...names.map(n => get(`/content/${n}.json`).then(withItems))]);
    Object.assign(site, settings);
    const more = {};
    names.slice(1).forEach((n, i) => { more[n] = files[i + 1]; });
    return { site, page: files[0] || null, more };
  }

  const readyCbs = [];
  let booted = false;
  MG.ready = fn => { booted ? fn(MG) : readyCbs.push(fn); };

  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-order]');
    if (!a || !MG.site) return;
    e.preventDefault(); MG.openOrder(a.dataset.order);
  });

  load().then(data => {
    MG.site = data.site; MG.page = data.page; MG.more = data.more || {};
    const btn = $('#langBtn');
    if (btn) btn.addEventListener('click', () => MG.setLang(MG.lang === 'ar' ? 'en' : 'ar'));
    paintLogo();
    // the header's height, for anything that sticks below it
    const head = $('.site-head');
    if (head) new ResizeObserver(() => document.documentElement.style.setProperty('--head', head.offsetHeight + 'px')).observe(head);
    booted = true;
    readyCbs.forEach(fn => fn(MG));
    MG.setLang(MG.lang);
  });

  global.MG = MG;
})(window);
