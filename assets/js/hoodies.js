/* Mass & Grass — hoodies & sweatshirts page.
   Every piece is photographed white and coloured in the browser, so the
   visitor picks any fabric colour. Pieces hang from twine on a wooden rod,
   sway in a light wind and can be slid along it or brushed by hand; the
   chosen one grows, its neighbours make room and its own watercolour fills
   the background. Below, the piece is shown worn (standing, seated, close on
   the print, or on its own). The chosen painting paints itself on paper,
   flies onto the chest and is pressed into the fabric; a lens shows the
   original painting under the print. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const W = window.Watercolor;
  const C = MG.page, items = C.items, N = items.length, COLORS = C.colors, PROD = C.products;
  const rtl = () => document.documentElement.dir === 'rtl';
  const AUTO = 9000;
  const VIEWS = ['stand', 'sit', 'zoom', 'piece'];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; };

  /* ---------------- paintings you can print ----------------
     The same paintings as the paintings page; each piece names its default. */
  const ARTS = ((MG.more.paintings || {}).items || []).map(p => ({ id: p.id, title: p.title, spec: p, image: p.image }));
  const artIndex = id => Math.max(0, ARTS.findIndex(a => a.id === id));
  const artCache = new Map();
  function artURL(a) {
    if (a.image) return a.image;
    if (!artCache.has(a.id)) artCache.set(a.id, W.sample(a.spec, 700, { transparent: true }));
    return artCache.get(a.id);
  }

  /* ---------------- colour ---------------- */
  const hexOf = c => (COLORS[c] ? COLORS[c].hex : c);
  const colorName = c => (COLORS[c] ? L(COLORS[c].name) : `${t('page.custom')} ${c.toUpperCase()}`);
  const isDark = hex => { const n = parseInt(hex.slice(1), 16); return .299 * (n >> 16) + .587 * (n >> 8 & 255) + .114 * (n & 255) < 110; };

  /* ---------------- images ---------------- */
  const imgCache = new Map();
  const load = src => {
    if (!imgCache.has(src)) imgCache.set(src, new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = src; }));
    return imgCache.get(src);
  };
  const region = (pr, w, h) => ({ x: Math.round(pr.x * w), y: Math.round(pr.y * h), w: Math.round(pr.w * w), h: Math.round(pr.h * h) });
  const coverFit = (aw, ah, r) => { const sc = Math.max(r.w / aw, r.h / ah); return { sc, ox: (r.w - aw * sc) / 2, oy: (r.h - ah * sc) / 2 }; };

  // Colour the white fabric: multiply the colour onto the grey folds, only inside the fabric mask.
  function tint(photo, mask, hex) {
    const w = photo.width || photo.naturalWidth, h = photo.height || photo.naturalHeight;
    const out = canvas(w, h), o = out.getContext('2d');
    o.drawImage(photo, 0, 0, w, h);
    const lay = canvas(w, h), l = lay.getContext('2d');
    l.drawImage(photo, 0, 0, w, h);
    l.globalCompositeOperation = 'multiply'; l.fillStyle = hex; l.fillRect(0, 0, w, h);
    l.globalCompositeOperation = 'destination-in'; l.drawImage(mask, 0, 0, w, h);
    o.drawImage(lay, 0, 0);
    return out;
  }

  // Print a painting onto the fabric: shaded by its folds, soft-edged, never off the fabric.
  function printOn(base, mask, pr, art) {
    const w = base.width, h = base.height;
    const out = canvas(w, h), o = out.getContext('2d');
    o.drawImage(base, 0, 0);
    if (!art) return out;
    const r = region(pr, w, h);
    const px = o.getImageData(r.x, r.y, r.w, r.h), d = px.data;
    let sum = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { sum += .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]; n++; }
    const mean = sum / Math.max(1, n), dark = mean < 95;
    for (let i = 0; i < d.length; i += 4) {
      const lum = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = Math.min(255, Math.round(255 * Math.pow(lum / mean, dark ? .6 : .9)));
    }
    const shade = canvas(r.w, r.h); shade.getContext('2d').putImageData(px, 0, 0);
    const ink = canvas(r.w, r.h), k = ink.getContext('2d'), fit = coverFit(art.naturalWidth, art.naturalHeight, r);
    const paint = () => k.drawImage(art, fit.ox, fit.oy, art.naturalWidth * fit.sc, art.naturalHeight * fit.sc);
    paint();
    const feather = canvas(r.w, r.h), fk = feather.getContext('2d'), f = Math.min(r.w, r.h) * .1;
    fk.filter = `blur(${f.toFixed(1)}px)`; fk.fillStyle = '#000';
    fk.beginPath(); fk.roundRect(f * 1.2, f * 1.2, r.w - f * 2.4, r.h - f * 2.4, f); fk.fill();
    k.globalCompositeOperation = 'multiply'; k.drawImage(shade, 0, 0);    // folds first: multiply fills empty pixels too,
    k.globalCompositeOperation = 'destination-in'; paint();                  // so cut back to the paint,
    k.drawImage(feather, 0, 0);                                              // feather it,
    if (dark) {                                                              // on dark cloth the paper stays unprinted:
      const ip = k.getImageData(0, 0, r.w, r.h), q = ip.data;               // light washes thin out, the paint stays
      for (let i = 0; i < q.length; i += 4) {
        const lum = .299 * q[i] + .587 * q[i + 1] + .114 * q[i + 2];
        q[i + 3] *= Math.max(.06, Math.min(1, (238 - lum) / 70));
      }
      k.putImageData(ip, 0, 0);
    }
    k.drawImage(mask, r.x * (mask.width || mask.naturalWidth) / w, r.y * (mask.height || mask.naturalHeight) / h,
      r.w * (mask.width || mask.naturalWidth) / w, r.h * (mask.height || mask.naturalHeight) / h, 0, 0, r.w, r.h); // and keep it on the fabric
    o.save(); o.globalCompositeOperation = dark ? 'source-over' : 'multiply'; o.globalAlpha = dark ? .9 : .95;
    o.drawImage(ink, r.x, r.y); o.restore();
    return out;
  }

  /* ---------------- state ---------------- */
  const st = items.map(it => ({ color: it.color || 'white', art: artIndex(it.painting), size: it.sizes[Math.min(1, it.sizes.length - 1)], view: 'stand' }));
  const srcOf = (i, kind) => kind === 'piece' ? PROD[items[i].type] : items[i].looks[kind === 'zoom' ? 'stand' : kind];

  // One rendered view of a piece, cached by piece, view, colour and painting.
  const cache = new Map();
  const remember = (k, v) => { cache.set(k, v); if (cache.size > 60) cache.delete(cache.keys().next().value); return v; };
  async function render(i, kind, opts = {}) {
    const hex = hexOf(st[i].color), a = opts.blank ? null : ARTS[st[i].art];
    const key = `${i}|${kind}|${hex}|${a ? a.id : '-'}`;
    if (cache.has(key)) return cache.get(key);
    return remember(key, (async () => {
      const s = srcOf(i, kind);
      const [ph, mk, art] = await Promise.all([load(s.image), load(s.mask), a ? load(artURL(a)) : null]);
      if (kind !== 'zoom') return { canvas: printOn(tint(ph, mk, hex), mk, s.print, art), print: s.print, kind };
      // close on the print: crop around the chest and print the painting at the higher resolution
      const w = ph.naturalWidth, h = ph.naturalHeight, R = region(s.print, w, h);
      const cw = Math.min(w, R.w * 1.9), ch = Math.min(h, cw * 1.25);
      const cx = Math.max(0, Math.min(w - cw, R.x + R.w / 2 - cw / 2)), cy = Math.max(0, Math.min(h - ch, R.y + R.h / 2 - ch * .46));
      const sc = Math.min(3, 1100 / cw);
      const crop = src => { const c = canvas(cw * sc, ch * sc); c.getContext('2d').drawImage(src, cx, cy, cw, ch, 0, 0, c.width, c.height); return c; };
      const zp = crop(ph), zm = crop(mk), zc = zp.getContext('2d');
      zc.globalCompositeOperation = 'destination-over'; zc.fillStyle = '#EDE3D2'; zc.fillRect(0, 0, zp.width, zp.height);   // a paper backdrop for the detail
      const pr = { x: (R.x - cx) / cw, y: (R.y - cy) / ch, w: R.w / cw, h: R.h / ch };
      return { canvas: printOn(tint(zp, zm, hex), zm, pr, art), print: pr, kind };
    })());
  }
  const shrink = (c, w) => { const s = canvas(w, w * c.height / c.width); s.getContext('2d').drawImage(c, 0, 0, s.width, s.height); return s; };

  let cur = -1, busy = false, timer = null, printing = 0, engaged = false;
  const printed = new Set();                               // "piece|painting" already pressed once
  const stage = $('#stage'), view = $('#view');

  /* ---------------- the rack ----------------
     Pieces hang from twine on a wooden rod. Dragging slides them along it;
     each follows on its own spring and swings from its own motion, from a
     light wind that travels along the rod, and from a hand brushing past. */
  const rack = $('#rack'), hangersEl = $('#hangers');
  $('#rod').style.borderImageSource = `url("${C.page.rod}")`;
  let H = [], RW = 0, RH = 0, HW = 0, gap = 0, E = 0, group = 0, gVel = 0, gMin = 0, gMax = 0, gTarget = null;
  let rackRun = false, rackDrag = false, rackSeen = true, sel = -1;
  function buildRack() {
    hangersEl.innerHTML = items.map((it, i) =>
      `<div class="hanger" role="tab" data-i="${i}" aria-selected="false" aria-label="${esc(L(it.title))}"><canvas></canvas></div>`).join('');
    H = $$('.hanger', hangersEl).map(el => ({ el, cv: $('canvas', el), x: 0, v: 0, th: 0, om: 0, s: 1, sv: 0 }));
    layoutRack(true);
    H.forEach((h, i) => refreshHanger(i));
  }
  async function refreshHanger(i) {
    const r = await render(i, 'piece'), c = H[i].cv;
    c.width = r.canvas.width; c.height = r.canvas.height;
    c.getContext('2d').drawImage(r.canvas, 0, 0);
  }
  function bounds() {
    const span = gap * (N - 1), e1 = sel > 0 ? E : 0, e2 = sel >= 0 && sel < N - 1 ? E : 0;
    const L0 = RW * .03 + HW * .6, R0 = RW * .97 - HW * .6;
    gMin = L0 + e1; gMax = R0 - span - e2;
    if (gMax < gMin) { const m = gMin; gMin = gMax; gMax = m; }
  }
  function layoutRack(reset) {
    RW = rack.clientWidth; RH = rack.clientHeight;
    HW = Math.round(Math.min(250, Math.max(110, RH * .44)));
    gap = HW * (RW < 640 ? .62 : .78);
    E = HW * .34;
    rack.style.setProperty('--hw', HW + 'px');
    bounds();
    if (reset) { group = (gMin + gMax) / 2; H.forEach((h, i) => { h.x = group + i * gap; }); }
    kickRack();
  }
  const targetX = i => group + i * gap + (sel < 0 || i === sel ? 0 : i < sel ? -E : E);
  const wind = (time, x) => {                                // gusts travelling along the rod
    const p = time - x / 520, gust = .45 + .55 * Math.pow(Math.sin(time * .21), 2);
    return (Math.sin(p * .8) * .6 + Math.sin(p * 2.1 + 1.3) * .28 + Math.sin(p * 4.3 + .4) * .12) * gust;
  };
  function rackFrame(now) {
    if (!rackDrag) {
      if (gTarget != null) { gVel += (gTarget - group) * .012; gVel *= .86; if (Math.abs(gTarget - group) < .5 && Math.abs(gVel) < .05) gTarget = null; }
      group += gVel; gVel *= .93;
      if (group < gMin) { group += (gMin - group) * .18; gVel *= .6; }
      else if (group > gMax) { group += (gMax - group) * .18; gVel *= .6; }
    }
    const mirror = rtl(), time = now / 1000, breeze = !MG.reduced;
    let moving = rackDrag || Math.abs(gVel) > .03 || gTarget != null || breeze;
    H.forEach((h, i) => {
      const k = .1 / (1 + i * .1);                         // pieces further along trail a little
      h.v += (targetX(i) - h.x) * k; h.v *= .74; h.x += h.v;
      const sv = mirror ? -h.v : h.v, x = mirror ? RW - h.x : h.x;
      let eq = Math.max(-15, Math.min(15, sv * 1.3));      // the hem trails behind the motion
      if (breeze) eq += wind(time + i * .37, x) * (i === sel ? 1.2 : 2.4);
      h.om += (eq - h.th) * .04 - h.om * .06; h.th += h.om;
      const s1 = i === sel ? 1.24 : h.hover ? 1.04 : 1;
      h.sv += (s1 - h.s) * .09; h.sv *= .72; h.s += h.sv;
      if (Math.abs(h.v) > .02 || Math.abs(h.om) > .004 || Math.abs(s1 - h.s) > .001) moving = true;
      h.el.style.transform = `translate3d(${(x - HW / 2).toFixed(1)}px,0,0) rotate(${h.th.toFixed(2)}deg) scale(${h.s.toFixed(3)})`;
      h.el.style.zIndex = i === sel ? 60 : h.hover ? 50 : 10 + i;
    });
    if (moving && rackSeen) requestAnimationFrame(rackFrame); else rackRun = false;
  }
  function kickRack() { if (!rackRun && rackSeen) { rackRun = true; requestAnimationFrame(rackFrame); } }
  new IntersectionObserver(es => { rackSeen = es[0].isIntersecting; kickRack(); }).observe(rack);

  // a hand brushing through the clothes: pieces under the pointer get pushed by its motion
  let bx = null, bt = 0;
  function brush(e) {
    const now = performance.now();
    if (bx == null || now - bt > 120) { bx = e.clientX; bt = now; return; }
    const vx = (e.clientX - bx) / Math.max(8, now - bt) * 16; bx = e.clientX; bt = now;
    const b = rack.getBoundingClientRect(), px = e.clientX - b.left, py = e.clientY - b.top, rodY = 34;
    H.forEach((h, i) => {
      const x = rtl() ? RW - h.x : h.x, half = HW * h.s / 2, len = HW * 1.35 * h.s;
      const over = Math.abs(px - x) < half && py > rodY && py < rodY + len;
      if (over !== !!h.hover) { h.hover = over; }
      if (over) h.om -= Math.max(-6, Math.min(6, vx)) * .09 * ((py - rodY) / len + .2);
    });
    kickRack();
  }

  let rsx = 0, rg0 = 0, rlx = 0, rlt = 0, rflick = 0, rmoved = 0;
  rack.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    rackDrag = true; gTarget = null; rsx = rlx = e.clientX; rg0 = group; rlt = performance.now(); rflick = 0; rmoved = 0;
    rack.setPointerCapture(e.pointerId); rack.classList.add('dragging'); $('#rackHint').classList.add('gone'); kickRack();
  });
  rack.addEventListener('pointermove', e => {
    if (!rackDrag) { if (e.pointerType !== 'touch') brush(e); return; }
    let g = rg0 + (e.clientX - rsx) * (rtl() ? -1 : 1);
    if (g < gMin) g = gMin - (gMin - g) * .35; else if (g > gMax) g = gMax + (g - gMax) * .35;
    const now = performance.now();
    rflick = (g - group) / Math.max(8, now - rlt) * 16; rlt = now;
    rmoved += Math.abs(e.clientX - rlx); rlx = e.clientX;
    group = g;
  });
  rack.addEventListener('pointerleave', () => { H.forEach(h => { h.hover = false; }); bx = null; kickRack(); });
  const rackUp = e => {
    if (!rackDrag) return;
    rackDrag = false; rack.classList.remove('dragging');
    if (rmoved < 6) {
      const hit = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.classList && el.classList.contains('hanger'));
      if (hit) { engaged = true; show(+hit.dataset.i); }
    } else gVel = rflick;
    kickRack();
  };
  rack.addEventListener('pointerup', rackUp);
  rack.addEventListener('pointercancel', rackUp);
  rack.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); gTarget = null; gVel -= e.deltaX * .06 * (rtl() ? -1 : 1); $('#rackHint').classList.add('gone'); kickRack();
  }, { passive: false });
  rack.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(cur < 0 ? 0 : cur); }
  });

  function pickOnRack(i) {
    sel = i;
    H.forEach((h, n) => { h.el.classList.toggle('taken', n === i); h.el.setAttribute('aria-selected', String(n === i)); });
    bounds();
    gTarget = Math.max(gMin, Math.min(gMax, RW / 2 - i * gap));   // bring it to the middle of the rod
    kickRack();
  }

  /* ---------------- the view: the piece, worn ---------------- */
  let viewSeq = 0;
  const viewData = { canvas: null, print: null };
  function putView(c, pr, instant) {
    const old = $$('.vc', view);
    c.className = 'vc' + (instant || MG.reduced ? '' : ' in');
    view.dataset.kind = st[cur].view;
    view.appendChild(c);
    old.forEach(o => { o.classList.add('out'); setTimeout(() => o.remove(), 500); });
    viewData.canvas = c; viewData.print = pr;
  }
  async function drawView(opts = {}) {
    const i = cur, kind = st[i].view, n = ++viewSeq;
    const r = await render(i, kind, { blank: opts.blank });
    if (n !== viewSeq || i !== cur) return null;
    const c = canvas(r.canvas.width, r.canvas.height);
    c.getContext('2d').drawImage(r.canvas, 0, 0);
    putView(c, r.print, opts.instant);
    return c;
  }
  function buildThumbs() {
    $('#thumbs').setAttribute('aria-label', t('page.viewsLabel'));
    $('#thumbs').innerHTML = VIEWS.map(v =>
      `<button class="th" type="button" role="tab" data-v="${v}" aria-selected="false"><span class="th-img"><canvas></canvas></span><span class="th-l"></span></button>`).join('');
    $$('#thumbs .th').forEach(b => b.addEventListener('click', () => {
      if (cur < 0) return;
      engaged = true; st[cur].view = b.dataset.v; markThumbs(); drawView(); clearTimeout(timer); $('#timerBar').classList.remove('run');
    }));
  }
  function markThumbs() {
    $$('#thumbs .th').forEach(b => { b.setAttribute('aria-selected', String(b.dataset.v === st[cur].view)); $('.th-l', b).textContent = t(`page.views.${b.dataset.v}`); });
  }
  async function refreshThumbs() {
    const i = cur;
    for (const b of $$('#thumbs .th')) {
      const r = await render(i, b.dataset.v);
      if (i !== cur) return;
      const c = $('canvas', b), s = shrink(r.canvas, 160);
      c.width = s.width; c.height = s.height; c.getContext('2d').drawImage(s, 0, 0);
    }
  }

  /* ---------------- showing a piece ---------------- */
  async function show(i) {
    i = (i + N) % N;
    if (i === cur || busy) return;
    busy = true;
    const it = items[i];
    cur = i;
    pickOnRack(i);
    fillInfo(); markThumbs();
    stage.style.setProperty('--acc', it.accent);
    const g = $('#ghost'); g.classList.add('swap');
    setTimeout(() => { g.textContent = L(C.page.types[it.type]); g.classList.remove('swap'); }, 240);
    paintBloom(it);
    view.setAttribute('aria-label', L(it.title));
    const fresh = !printed.has(`${i}|${st[i].art}`);
    await drawView({ blank: fresh });                      // worn, not printed yet
    refreshThumbs();
    setTimeout(() => { busy = false; }, 350);
    if (fresh && cur === i) { await wait(MG.reduced ? 0 : 500); if (cur === i) await printSequence(i); }
    else restartTimer();
  }

  /* ---------------- the print sequence ----------------
     paint on paper → fly to the chest → press → peel, print left behind */
  const card = $('#printCard'), cardCanvas = $('#printCanvas');
  function drawCover(ctx, img, w, h) {
    ctx.fillStyle = '#FBF7EF'; ctx.fillRect(0, 0, w, h);
    const f = coverFit(img.naturalWidth, img.naturalHeight, { w, h });
    ctx.drawImage(img, f.ox, f.oy, img.naturalWidth * f.sc, img.naturalHeight * f.sc);
  }
  async function paintIn(img, run) {
    const cv = cardCanvas, w = cv.width, h = cv.height, ctx = cv.getContext('2d');
    if (MG.reduced) { drawCover(ctx, img, w, h); return; }
    const mask = canvas(w, h), mctx = mask.getContext('2d'), p = W.painter(mctx, 7), r = W.rng(w + run);
    const spots = [[.5, .5, .42], [.3, .3, .3], [.72, .32, .3], [.28, .72, .3], [.72, .74, .3], [.5, .15, .22], [.5, .88, .22], [.12, .5, .22], [.88, .5, .22]];
    spots.forEach(([x, y, rad], n) => p.add({ x: x * w, y: y * h, radius: rad * w, color: '#000000', layers: 16, alpha: .16, rand: r, spread: .45, blend: 'source-over', edges: false }, n * 70));
    const art = canvas(w, h), actx = art.getContext('2d'), f = coverFit(img.naturalWidth, img.naturalHeight, { w, h });
    actx.drawImage(img, f.ox, f.oy, img.naturalWidth * f.sc, img.naturalHeight * f.sc);
    const t0 = performance.now(), tmp = canvas(w, h), tc = tmp.getContext('2d');
    await new Promise(res => {
      const tick = () => {
        if (run !== printing) return res();
        ctx.fillStyle = '#FBF7EF'; ctx.fillRect(0, 0, w, h);
        tc.globalCompositeOperation = 'copy'; tc.drawImage(art, 0, 0);
        tc.globalCompositeOperation = 'destination-in'; tc.drawImage(mask, 0, 0);
        ctx.drawImage(tmp, 0, 0);
        if (p.busy && performance.now() - t0 < 2400) requestAnimationFrame(tick);
        else { drawCover(ctx, img, w, h); res(); }
      };
      requestAnimationFrame(tick);
    });
  }
  function contentRect(c) {                                // the drawn image inside a contained canvas
    const b = c.getBoundingClientRect(), k = Math.min(b.width / c.width, b.height / c.height);
    const w = c.width * k, h = c.height * k;
    return { left: b.left + (b.width - w) / 2, top: b.top + (b.height - h) / 2, width: w, height: h };
  }
  async function printSequence(i) {
    const run = ++printing;
    clearTimeout(timer);
    const a = ARTS[st[i].art];
    const [img, result] = await Promise.all([load(artURL(a)), render(i, st[i].view)]);
    if (run !== printing || cur !== i) return;
    printed.add(`${i}|${st[i].art}`);
    card.classList.add('painting');
    await paintIn(img, run);
    if (run !== printing || cur !== i) return;
    const target = viewData.canvas, pr = viewData.print;
    const lay = () => { if (target && target.isConnected) target.getContext('2d').drawImage(result.canvas, 0, 0); };
    if (MG.reduced || !target || !pr) { lay(); card.classList.remove('painting'); afterPrint(i); return; }

    const from = cardCanvas.getBoundingClientRect(), cr = contentRect(target);
    const to = { left: cr.left + pr.x * cr.width, top: cr.top + pr.y * cr.height, width: pr.w * cr.width, height: pr.h * cr.height };
    const fly = document.createElement('div'); fly.className = 'fly-sheet';
    const fc = canvas(cardCanvas.width, cardCanvas.height);
    fc.getContext('2d').drawImage(cardCanvas, 0, 0); fly.appendChild(fc);
    Object.assign(fly.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' });
    document.body.appendChild(fly);
    card.classList.add('lifted');
    const dx = to.left - from.left, dy = to.top - from.top, sx = to.width / from.width, sy = to.height / from.height;
    const flight = fly.animate([
      { transform: 'translate(0,0) rotate(3deg) scale(1)', boxShadow: '0 20px 30px -18px rgba(60,36,16,.5)' },
      { transform: `translate(${dx * .5}px,${dy * .5 - 90}px) rotate(-9deg) scale(${(1 + sx) / 2 * 1.08},${(1 + sy) / 2 * 1.08})`, boxShadow: '0 60px 60px -30px rgba(60,36,16,.45)', offset: .55 },
      { transform: `translate(${dx}px,${dy}px) rotate(0) scale(${sx},${sy})`, boxShadow: '0 8px 10px -8px rgba(60,36,16,.4)', offset: .88 },
      { transform: `translate(${dx}px,${dy + 2}px) rotate(0) scale(${sx * .97},${sy * .97})`, boxShadow: '0 2px 3px -2px rgba(60,36,16,.3)' }
    ], { duration: 1150, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
    await flight.finished;
    if (run !== printing) { fly.remove(); card.classList.remove('lifted', 'painting'); return; }
    lay();                                                  // the ink is on the fabric now
    const peel = fly.animate([
      { transform: `translate(${dx}px,${dy + 2}px) scale(${sx * .97},${sy * .97}) perspective(500px) rotateX(0)`, opacity: 1 },
      { transform: `translate(${dx}px,${dy - 30}px) scale(${sx},${sy}) perspective(500px) rotateX(-75deg)`, opacity: 0 }
    ], { duration: 650, easing: 'cubic-bezier(.5,0,.75,.4)', fill: 'forwards' });
    await peel.finished;
    fly.remove();
    card.classList.remove('lifted', 'painting');
    afterPrint(i);
  }
  function afterPrint(i) { refreshHanger(i); refreshThumbs(); refreshCard(i); restartTimer(); }

  /* ---------------- choosing colour, painting, size ---------------- */
  let recolorQueued = false;
  function setColor(c) {
    st[cur].color = c; engaged = true;
    $('#colorName').textContent = colorName(c);
    $$('#swatches .sw').forEach(b => b.setAttribute('aria-checked', String(b.dataset.c === c || (b.dataset.c === 'custom' && !COLORS[c]))));
    $('.sw-custom', $('#swatches')).style.setProperty('--c', COLORS[c] ? 'conic-gradient(from 90deg,#C9826B,#C79A45,#8FA38F,#6F8497,#8E5A66,#C9826B)' : c);
    updateOrder();
    if (recolorQueued) return;
    recolorQueued = true;
    requestAnimationFrame(async () => {                     // redraw at most once a frame while the picker is dragged
      recolorQueued = false;
      const i = cur;
      printing++; card.classList.remove('lifted', 'painting'); $$('.fly-sheet').forEach(f => f.remove());
      printed.add(`${i}|${st[i].art}`);
      await drawView({ instant: true });
      refreshHanger(i); refreshThumbs(); refreshCard(i);
    });
  }
  function updateOrder() {
    const it = items[cur], s = st[cur], a = ARTS[s.art];
    $('#orderBtn').href = MG.order(`${L(it.title)} · ${L(a.title)} · ${colorName(s.color)} · ${s.size}`);
  }
  function fillInfo() {
    const it = items[cur], s = st[cur], a = ARTS[s.art];
    $('#count').innerHTML = `<b>${MG.pad(cur + 1)}</b> / ${MG.pad(N)}`;
    $('#kick').textContent = `${L(C.page.types[it.type])} · ${MG.pad(cur + 1)}`;
    $('#name').textContent = L(it.title);
    $('#story').textContent = L(it.story);
    $('#colorName').textContent = colorName(s.color);
    const custom = COLORS[s.color] ? '#8FA38F' : s.color;
    $('#swatches').innerHTML = Object.entries(COLORS).map(([k, c]) =>
      `<button class="sw" type="button" role="radio" data-c="${k}" aria-checked="${k === s.color}" aria-label="${esc(L(c.name))}" style="--c:${c.hex}"></button>`).join('') +
      `<label class="sw sw-custom" data-c="custom" role="radio" aria-checked="${!COLORS[s.color]}" title="${esc(t('page.custom'))}">` +
      `<input type="color" value="${custom}" aria-label="${esc(t('page.custom'))}"><span aria-hidden="true">+</span></label>`;
    $('.sw-custom', $('#swatches')).style.setProperty('--c', COLORS[s.color] ? 'conic-gradient(from 90deg,#C9826B,#C79A45,#8FA38F,#6F8497,#8E5A66,#C9826B)' : s.color);
    $$('#swatches button.sw').forEach(b => b.addEventListener('click', () => { if (b.dataset.c !== st[cur].color) setColor(b.dataset.c); }));
    $('#swatches input').addEventListener('input', e => setColor(e.target.value.toLowerCase()));
    $('#artName').textContent = L(a.title);
    $('#arts').innerHTML = ARTS.map((x, ai) =>
      `<button class="art-b" type="button" role="radio" data-a="${ai}" aria-checked="${ai === s.art}" aria-label="${esc(L(x.title))}"><img alt="" src="${artURL(x)}"></button>`).join('');
    $$('#arts .art-b').forEach(b => b.addEventListener('click', async () => {
      const ai = +b.dataset.a; if (ai === st[cur].art) return;
      engaged = true; st[cur].art = ai; fillInfo();
      if (st[cur].view === 'piece' || printed.has(`${cur}|${ai}`)) { await drawView({ instant: true }); afterPrint(cur); return; }
      await drawView({ blank: true, instant: true }); printSequence(cur);
    }));
    $('#sizes').innerHTML = it.sizes.map(z => `<button class="sz" type="button" role="radio" data-s="${z}" aria-checked="${z === s.size}">${z}</button>`).join('');
    $$('#sizes .sz').forEach(b => b.addEventListener('click', () => { engaged = true; st[cur].size = b.dataset.s; fillInfo(); }));
    updateOrder();
    card.setAttribute('aria-label', L(a.title));
  }

  /* each piece brings its own watercolour: behind the rack and behind the look */
  let bloomFlip = false;
  function paintBloom(it) {
    if (MG.reduced) return;
    bloomFlip = !bloomFlip;
    const on = $(bloomFlip ? '#bloomA' : '#bloomB'), off = $(bloomFlip ? '#bloomB' : '#bloomA');
    const { ctx, w, h } = W.fit(on);
    ctx.clearRect(0, 0, w, h);
    const p = W.painter(ctx, 6), r = W.rng(it.id.length * 131 + cur * 17);
    const rackY = rack.offsetTop + rack.offsetHeight * .5, lookY = stage.offsetTop + stage.offsetHeight * .45;
    const m = Math.min(w, 1100);
    p.add({ x: w * .5, y: rackY, radius: m * .34, color: it.accent, layers: 24, alpha: .03, rand: r, spread: .35, blend: 'source-over' });
    p.add({ x: w * (rtl() ? .7 : .3), y: lookY, radius: m * .36, color: it.accent, layers: 26, alpha: .03, rand: r, spread: .3, blend: 'source-over' }, 120);
    p.add({ x: w * (rtl() ? .62 : .38), y: lookY + m * .12, radius: m * .18, color: ARTS[st[cur].art].spec.palette[1], layers: 18, alpha: .026, rand: r, blend: 'source-over' }, 260);
    on.classList.add('on'); off.classList.remove('on');
  }

  /* ---------------- auto-advance (until the visitor takes over) ---------------- */
  let paused = false;
  function restartTimer() {
    clearTimeout(timer);
    const bar = $('#timerBar');
    bar.classList.remove('run'); void bar.offsetWidth;
    if (MG.reduced || paused || engaged || N < 2) return;
    bar.style.setProperty('--dur', AUTO + 'ms'); bar.classList.add('run');
    timer = setTimeout(() => { if (document.visibilityState === 'visible' && !$('#lb').open) show(cur + 1); else restartTimer(); }, AUTO);
  }
  stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { paused = true; clearTimeout(timer); $('#timerBar').classList.remove('run'); } });
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { paused = false; restartTimer(); } });
  new IntersectionObserver(es => es.forEach(e => { paused = !e.isIntersecting; paused ? clearTimeout(timer) : restartTimer(); }), { threshold: .25 }).observe(stage);

  /* ---------------- controls ---------------- */
  $('#prevBtn').addEventListener('click', () => { engaged = true; show(cur - 1); });
  $('#nextBtn').addEventListener('click', () => { engaged = true; show(cur + 1); });
  document.addEventListener('keydown', e => {
    if ($('#lb').open || /input|textarea|select/i.test(document.activeElement.tagName)) return;
    const fwd = rtl() ? 'ArrowLeft' : 'ArrowRight', back = rtl() ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd) show(cur + 1); else if (e.key === back) show(cur - 1);
  });
  $('#detailBtn').addEventListener('click', () => openBox(cur));
  card.addEventListener('click', () => openBox(cur));

  /* ---------------- the lens: the original painting under the print ----------------
     Over the print it shows the painting itself; anywhere else it magnifies the fabric. */
  const ZOOM = 2.2;
  function makeLens(host, lensEl, source) {
    const cv = $('canvas', lensEl), ctx = cv.getContext('2d');
    let LS = 0, seq = 0;
    const hide = () => lensEl.classList.remove('on');
    async function at(cx, cy) {
      const s = source(); if (!s || !s.canvas) return hide();
      const pc = s.canvas, cr = contentRect(pc);
      const u = (cx - cr.left) / cr.width, v = (cy - cr.top) / cr.height;
      if (u < 0 || u > 1 || v < 0 || v > 1) return hide();
      const x = u * pc.width, y = v * pc.height;
      if (pc.getContext('2d').getImageData(Math.floor(x), Math.floor(y), 1, 1).data[3] < 40) return hide();   // off the person
      if (!LS) { LS = lensEl.offsetWidth || 170; cv.width = cv.height = LS * 2; }
      const b = host.getBoundingClientRect();
      lensEl.style.transform = `translate(${cx - b.left - LS / 2}px,${cy - b.top - LS / 2}px)`;
      lensEl.classList.add('on');
      const R = region(s.print, pc.width, pc.height);
      const inside = x > R.x && x < R.x + R.w && y > R.y && y < R.y + R.h;
      lensEl.classList.toggle('art', inside);
      const size = pc.width * (LS / cr.width) / ZOOM, n = ++seq;   // source pixels shown in the lens
      const img = inside ? await load(artURL(s.art)) : null;
      if (n !== seq) return;
      ctx.fillStyle = '#FBF7EF'; ctx.fillRect(0, 0, LS * 2, LS * 2);
      if (inside) {
        const f = coverFit(img.naturalWidth, img.naturalHeight, R);
        const ax = (x - R.x - f.ox) / f.sc, ay = (y - R.y - f.oy) / f.sc, as = size / f.sc;
        ctx.drawImage(img, ax - as / 2, ay - as / 2, as, as, 0, 0, LS * 2, LS * 2);
      } else {
        ctx.drawImage(pc, x - size / 2, y - size / 2, size, size, 0, 0, LS * 2, LS * 2);
      }
    }
    if (MG.finePointer) {
      host.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') at(e.clientX, e.clientY); });
      host.addEventListener('pointerleave', hide);
    }
    return { at, hide };
  }
  const lens = makeLens(view, $('#lens'), () => cur < 0 ? null : { canvas: viewData.canvas, print: viewData.print, art: ARTS[st[cur].art] });
  let sx0 = null;
  view.addEventListener('pointerdown', e => { sx0 = e.clientX; });
  view.addEventListener('pointerup', e => {
    if (sx0 == null) return;
    const dx = e.clientX - sx0; sx0 = null;
    if (Math.abs(dx) > 50) { engaged = true; show(cur + ((dx < 0) === rtl() ? -1 : 1)); return; }
    if (MG.finePointer && e.pointerType !== 'touch') openBox(cur); else lens.at(e.clientX, e.clientY);   // touch: tap for the lens
  });
  document.addEventListener('pointerdown', e => { if (!view.contains(e.target)) lens.hide(); });

  /* ---------------- lightbox: the painting and the piece worn ---------------- */
  const lb = $('#lb');
  let lbI = 0;
  async function lbShow(kind) {
    const r = await render(lbI, kind);
    $('#lbPiece').src = r.canvas.toDataURL('image/webp', .9);
    $('#lbPiece').dataset.kind = kind;
    $('#lbTag').textContent = t(`page.views.${kind}`);
    $$('#lbThumbs .th').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === kind)));
  }
  async function openBox(i) {
    lbI = i;
    const it = items[i], s = st[i], a = ARTS[s.art];
    $('#lbArt').src = artURL(a); $('#lbArt').alt = L(a.title);
    $('#lbPiece').alt = L(it.title);
    $('#lbThumbs').innerHTML = VIEWS.map(v => `<button class="th" type="button" data-v="${v}" aria-label="${esc(t(`page.views.${v}`))}"><canvas></canvas></button>`).join('');
    $$('#lbThumbs .th').forEach(b => {
      b.addEventListener('click', () => lbShow(b.dataset.v));
      render(i, b.dataset.v).then(r => { const c = $('canvas', b), sm = shrink(r.canvas, 120); c.width = sm.width; c.height = sm.height; c.getContext('2d').drawImage(sm, 0, 0); });
    });
    await lbShow(i === cur ? st[i].view : 'stand');
    $('#lbKick').textContent = `${L(C.page.types[it.type])} · ${MG.pad(i + 1)} / ${MG.pad(N)}`;
    $('#lbName').textContent = L(it.title);
    $('#lbStory').textContent = L(it.story);
    $('#lbSpecs').innerHTML = [
      [t('page.artwork'), L(a.title)], [t('page.fabric'), L(it.fabric)], [t('page.color'), colorName(s.color)],
      [t('page.size'), it.sizes.join(' · ')], [t('page.price'), it.price ? L(it.price) : t('page.priceOnRequest')]
    ].map(([k, val]) => `<dt>${esc(k)}</dt><dd>${esc(val)}</dd>`).join('');
    $('#lbNote').textContent = it.sample ? t('page.sampleNote') : '';
    $('#lbOrder').href = MG.order(`${L(it.title)} · ${L(a.title)} · ${colorName(s.color)} · ${s.size}`);
    if (!lb.open) lb.showModal();
    clearTimeout(timer);
  }
  $('#lbClose').addEventListener('click', () => lb.close());
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  lb.addEventListener('close', () => restartTimer());

  /* ---------------- collection cards: the painting, then the piece worn ---------------- */
  function renderCards() {
    $('#cards').innerHTML = items.map((it, i) => `
      <button class="card rv in" type="button" data-i="${i}" style="--acc:${it.accent}">
        <span class="card-media">
          <img class="art" src="${artURL(ARTS[st[i].art])}" alt="${esc(L(it.title))}" loading="lazy">
          <canvas class="pc" aria-hidden="true"></canvas>
          <span class="card-hint">${esc(t('page.hover'))}</span>
        </span>
        <span class="card-body"><span>${MG.pad(i + 1)} · ${esc(L(C.page.types[it.type]))}</span><b>${esc(L(it.title))}</b></span>
      </button>`).join('');
    $$('#cards .card').forEach(b => {
      b.addEventListener('click', () => openBox(+b.dataset.i));
      b.addEventListener('pointerenter', () => refreshCard(+b.dataset.i));
    });
    items.forEach((_, i) => refreshCard(i));
  }
  async function refreshCard(i) {
    const b = $(`#cards .card[data-i="${i}"]`); if (!b) return;
    $('.art', b).src = artURL(ARTS[st[i].art]);
    const r = await render(i, 'stand'), c = $('.pc', b), s = shrink(r.canvas, 420);
    c.width = s.width; c.height = s.height; c.getContext('2d').drawImage(s, 0, 0);
  }

  /* ---------------- boot ---------------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.rv, .stroke').forEach(el => io.observe(el));
  MG.onLang(() => {
    H.forEach((h, i) => h.el.setAttribute('aria-label', L(items[i].title)));
    layoutRack(false); renderCards();
    if (cur >= 0) { fillInfo(); markThumbs(); $('#ghost').textContent = L(C.page.types[items[cur].type]); }
  });

  buildThumbs(); buildRack(); renderCards();
  window.addEventListener('resize', () => { layoutRack(false); if (cur >= 0) pickOnRack(cur); });
  show(0);
});
