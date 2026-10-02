/* Mass & Grass — every piece in the shop as one list, for search, the "all products" page and the basket.
   Built from the same content files the pages use. Each piece has a stable id ("paintings:the-boat"),
   its section, a link to its page, a title in both languages, a price when one is set, and either an
   image or what is needed to paint one (a sample painting, or a garment with a painting printed on it). */
(function (global) {
  'use strict';
  const FILES = ['site', 'paintings', 'stickers', 'calendar', 'cloth', 'postcards'];

  // the content of the six files → one list
  function build(src) {
    const site = src.site || {}, out = [];
    const sec = id => (site.collections || []).find(c => c.id === id) || { id, title: { ar: id, en: id } };
    const paintings = (src.paintings && src.paintings.items) || [];
    const byPainting = id => paintings.find(p => p.id === id) || paintings[0] || null;
    const add = (s, id, it) => out.push(Object.assign({ id: `${s}:${id}`, sec: s, secTitle: sec(s).title, href: `/${s}/`, price: null, img: null }, it));

    paintings.forEach((p, i) => add('paintings', p.id || 'piece-' + (i + 1), { title: p.title, price: p.price || null, img: p.image || null, spec: p.image ? null : p }));
    ((src.stickers && src.stickers.items) || []).forEach(s => add('stickers', s.id, { title: s.title, img: s.src }));
    const year = src.calendar && src.calendar.year;
    ((src.calendar && src.calendar.months) || []).forEach(m => add('calendars', m.id, {
      title: { ar: `${m.name.ar}${year ? ' ' + year : ''}`, en: `${m.name.en}${year ? ' ' + year : ''}` }, img: m.art, extra: m.folk }));
    const prod = (src.cloth && src.cloth.products) || {};
    ((src.cloth && src.cloth.items) || []).forEach(c => {
      const p = prod[c.type] || {}, art = byPainting(c.painting);
      add('cloth', c.id, { title: c.title, price: c.price || null,
        garment: p.colors ? { photo: p.colors[c.color] || Object.values(p.colors)[0], print: p.print, art: art && (art.image || null), spec: art && !art.image ? art : null } : null });
    });
    ((src.postcards && src.postcards.cards) || []).forEach(c => add('postcards', c.id, { title: c.title, img: c.art, extra: c.city }));
    return out;
  }

  let ready = null;
  function load() {
    if (ready) return ready;
    const pre = global.__CATALOG_SRC__;
    if (pre) return (ready = Promise.resolve(build(pre)));
    const M = global.MG;
    if (M && M.site && M.more && FILES.slice(1).every(n => M.more[n])) {   // a page that already loaded them all
      return (ready = Promise.resolve(build(Object.assign({ site: M.site }, M.more))));
    }
    const get = u => fetch(u).then(r => r.json()).catch(() => null);
    ready = Promise.all([...FILES.map(n => get(`/content/${n}.json`)), get('/content/settings.json')]).then(async ([site, paintings, ...rest]) => {
      if (paintings && paintings.itemsFile) paintings.items = ((await get(`/content/${paintings.itemsFile}.json`)) || {}).items || [];
      const [stickers, calendar, cloth, postcards] = rest;
      return build({ site, paintings, stickers, calendar, cloth, postcards });
    });
    return ready;
  }

  // a picture for a piece: its own image, or one painted on the spot (needs watercolor.js)
  const thumbs = new Map();
  const loadImg = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  function thumb(it, size) {
    if (it.img) return Promise.resolve(it.img);
    const W = global.Watercolor;
    if (!W) return Promise.resolve(null);
    if (thumbs.has(it.id)) return thumbs.get(it.id);
    let p;
    if (it.spec) p = Promise.resolve(W.sample(tidy(it.spec), size || 600));
    else if (it.garment) {
      const g = it.garment;
      p = Promise.all([loadImg(g.photo), g.art ? loadImg(g.art) : g.spec ? loadImg(W.sample(tidy(g.spec), 600, { transparent: true })) : null])
        .then(([photo, art]) => {
          const w = photo.naturalWidth, h = photo.naturalHeight, c = document.createElement('canvas');
          c.width = w; c.height = h;
          const x = c.getContext('2d');
          x.drawImage(photo, 0, 0);
          if (art && g.print) {   // the painting multiplied into the cloth, fitted in the print area
            const r = { x: g.print.x * w, y: g.print.y * h, w: g.print.w * w, h: g.print.h * h };
            const sc = Math.min(r.w / art.naturalWidth, r.h / art.naturalHeight), dw = art.naturalWidth * sc, dh = art.naturalHeight * sc;
            x.globalCompositeOperation = 'multiply'; x.globalAlpha = .95;
            x.drawImage(art, r.x + (r.w - dw) / 2, r.y + (r.h - dh) / 2, dw, dh);
          }
          return c.toDataURL('image/webp', .85);
        }).catch(() => g.photo);
    } else p = Promise.resolve(null);
    thumbs.set(it.id, p);
    return p;
  }
  // what a panel entry may leave out (same as tidyItem in shell.js)
  function tidy(it) {
    it = Object.assign({}, it);
    if (typeof it.ratio === 'string') it.ratio = it.ratio.split(':').map(Number);
    if (!Array.isArray(it.ratio) || it.ratio.length !== 2) it.ratio = [4, 5];
    if (!Array.isArray(it.palette) || it.palette.length < 3) it.palette = ['#9FB0B8', '#C79A45', '#7F8F5A', '#6B7A48', '#B0603A'];
    if (!it.motif) it.motif = 'landscape';
    return it;
  }

  // "10$" → 10; anything without a number has no price yet
  const priceNum = p => { const s = p && (typeof p === 'object' ? (p.en || p.ar) : p); const m = s && String(s).match(/[\d.]+/); return m ? parseFloat(m[0]) : null; };

  // Arabic and English folded the same way for matching: no diacritics, one alef, ya and ta marbuta
  const fold = s => String(s || '').toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  global.MGCatalog = { load, build, thumb, priceNum, fold };
})(window);
