/* Mass & Grass — stickers page.
   1. A sticker is born: the watercolour paints itself onto paper in blooms,
      a cut line runs around it, and it peels up off the sheet.
   2. Try it on: peel stickers off a kiss-cut sheet and stick them on real
      things (laptop, bottle, notebook, phone). Stickers are clipped to the
      object's silhouette, can be moved, turned, resized and removed, are
      remembered, and the ones used can be ordered or saved as an image.
   3. The collection: each sticker tilts toward the pointer and catches the
      light like glossy vinyl, or sits flat like matte paper.
   Artwork and objects are Canva photos (see the canva-product-photos skill). */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const W = window.Watercolor;
  const C = MG.page, items = C.items, OBJ = C.objects, N = items.length;
  const byId = Object.fromEntries(items.map(s => [s.id, s]));
  const imgCache = new Map();
  const load = src => {
    if (!imgCache.has(src)) imgCache.set(src, new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = src; }));
    return imgCache.get(src);
  };
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cssURL = src => `url('${src}')`;

  function fillTitle() {
    $('#bornTitle').innerHTML = esc(t('page.title')).replace('&lt;em&gt;', '<em>').replace('&lt;/em&gt;', '</em>');
  }

  /* ================= 1. a sticker is born ================= */
  const cv = $('#bornCanvas'), stk = $('#bornStk'), stkImg = $('img', stk), paper = $('.born-paper');
  let bornI = 0, run = 0;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const frames = (ms, fn) => new Promise(res => {             // call fn(progress 0..1) every frame for ms
    const t0 = performance.now();
    const tick = now => { const k = Math.min(1, (now - t0) / ms); if (fn(k) === false) return res(false); k < 1 ? requestAnimationFrame(tick) : res(true); };
    requestAnimationFrame(tick);
  });

  async function born(i) {
    const my = ++run, s = items[i];
    const im = await load(s.src).catch(() => null);
    if (!im || my !== run) return;
    const { ctx, w, h } = W.fit(cv);
    const dpr = cv.width / w;
    const k = Math.min(w * .64 / im.naturalWidth, h * .64 / im.naturalHeight);
    const sw = im.naturalWidth * k, sh = im.naturalHeight * k, sx = (w - sw) / 2, sy = (h - sh) / 2;
    stk.className = 'born-stk'; stk.style.width = sw + 'px'; stk.style.visibility = '';
    stk.style.removeProperty('--rx'); stk.style.removeProperty('--ry');
    stkImg.src = s.src; stk.style.setProperty('--m', cssURL(s.src));
    const name = $('#bornName'); name.style.opacity = 0;
    setTimeout(() => { name.textContent = L(s.title); name.style.opacity = 1; }, 300);
    ctx.clearRect(0, 0, w, h);

    // the outline the cutter follows, and the solid shape (for the groove it leaves)
    const shape = canvas(sw * dpr, sh * dpr), sc = shape.getContext('2d');
    sc.drawImage(im, 0, 0, shape.width, shape.height);
    sc.globalCompositeOperation = 'source-in'; sc.fillStyle = '#5a4330'; sc.fillRect(0, 0, shape.width, shape.height);
    const ring = canvas(w * dpr, h * dpr), rc = ring.getContext('2d'), o = 1.6 * dpr;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) rc.drawImage(shape, sx * dpr + Math.cos(a) * o, sy * dpr + Math.sin(a) * o);
    rc.globalCompositeOperation = 'destination-out'; rc.drawImage(shape, sx * dpr, sy * dpr);

    if (MG.reduced) { stk.classList.add('up'); return; }

    // 1. paint: the picture appears where watercolour blooms spread
    const mask = canvas(w * dpr, h * dpr), mc = mask.getContext('2d'); mc.setTransform(dpr, 0, 0, dpr, 0, 0);
    const p = W.painter(mc, 4), rnd = W.rng(11 + i * 7), m = Math.min(sw, sh), spots = [];
    for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 5; gx++)
      spots.push([(gx + .5 + (rnd() - .5) * .7) / 5, (gy + .5 + (rnd() - .5) * .7) / 5]);
    spots.sort((a, b) => (a[1] + a[0] * .25) - (b[1] + b[0] * .25));
    spots.forEach(([u, v]) => p.add({ x: sx + u * sw, y: sy + v * sh, radius: m * (.17 + rnd() * .07), color: '#000000', layers: 14, alpha: .16, rand: rnd, spread: .6, blend: 'source-over', edges: false }, 60));
    const draw = full => {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(im, sx, sy, sw, sh);
      if (!full) { ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(mask, 0, 0, w, h); ctx.globalCompositeOperation = 'source-over'; }
    };
    const t0 = performance.now();
    if (!await frames(4200, () => { if (my !== run) return false; draw(false); if (!p.busy || performance.now() - t0 > 3600) return false; })) { if (my !== run) return; }
    // let the last washes settle in
    await frames(500, k2 => { if (my !== run) return false; draw(false); ctx.globalAlpha = k2; ctx.drawImage(im, sx, sy, sw, sh); ctx.globalAlpha = 1; });
    if (my !== run) return;
    draw(true);

    // 2. cut: a line runs once around the shape
    const cx = w / 2, cy = h / 2, R = Math.hypot(w, h);
    if (!await frames(1500, k2 => {
      if (my !== run) return false;
      draw(true);
      const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * (1 - Math.pow(1 - k2, 2));
      ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath(); ctx.clip();
      ctx.drawImage(ring, 0, 0, w, h); ctx.restore();
    })) return;
    await wait(250);
    if (my !== run) return;

    // 3. peel: the sticker lifts off, leaving its kiss-cut in the paper
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = .07; ctx.drawImage(shape, sx, sy, sw, sh); ctx.globalAlpha = .5; ctx.drawImage(ring, 0, 0, w, h); ctx.globalAlpha = 1;
    stk.classList.add('flat');
    await wait(40);
    stk.classList.add('up');
    await wait(900);
  }
  $('#againBtn').addEventListener('click', () => { bornI = (bornI + 1) % N; born(bornI); });
  paper.addEventListener('pointermove', e => {
    if (!stk.classList.contains('up') || drag) return;
    const r = paper.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
    stk.style.setProperty('--ry', (px * 18).toFixed(1) + 'deg'); stk.style.setProperty('--rx', (-py * 18).toFixed(1) + 'deg');
    stk.style.setProperty('--sx', ((px + .5) * 100).toFixed(0) + '%');
  });
  paper.addEventListener('pointerleave', () => { stk.style.removeProperty('--rx'); stk.style.removeProperty('--ry'); });
  let bornStarted = false;
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !bornStarted) { bornStarted = true; born(bornI); } }), { threshold: .35 }).observe(paper);

  /* ================= 2. the sheet and the desk ================= */
  const sheet = $('#sheet');
  function renderSheet() {
    sheet.innerHTML = items.map(s =>
      `<button class="slot" type="button" role="listitem" data-id="${s.id}" aria-label="${esc(L(s.title))}">` +
      `<img class="cut" src="${s.src}" alt=""><span class="peel"><img src="${s.src}" alt="" draggable="false"></span></button>`).join('');
  }

  const KEY = 'mg-stickers';
  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
  OBJ.forEach(o => { if (!Array.isArray(state[o.id])) state[o.id] = []; state[o.id] = state[o.id].filter(p => byId[p.id]); });
  const saveState = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ } };

  const desk = $('#desk'), objEl = $('#obj'), objImg = $('#objImg'), layer = $('#objStk'), shade = $('#objShade');
  let objI = 0, sel = -1;
  const cur = () => OBJ[objI];
  const hit = new Map();                                     // object alpha, for "did it land on the object?"
  async function hitmap(o) {
    if (hit.has(o.id)) return hit.get(o.id);
    const im = await load(o.src), c = canvas(160, 160 * im.naturalHeight / im.naturalWidth), x = c.getContext('2d');
    x.drawImage(im, 0, 0, c.width, c.height);
    let data = null; try { data = x.getImageData(0, 0, c.width, c.height); } catch (e) { /* tainted: accept the box */ }
    const hm = { w: c.width, h: c.height, data, ar: im.naturalWidth / im.naturalHeight };
    hit.set(o.id, hm); return hm;
  }
  function onObject(px, py) {
    const r = objEl.getBoundingClientRect(), hm = hit.get(cur().id);
    const u = (px - r.left) / r.width, v = (py - r.top) / r.height;
    if (u < 0 || v < 0 || u > 1 || v > 1) return null;
    if (hm && hm.data) {
      const ix = Math.floor(u * (hm.w - 1)), iy = Math.floor(v * (hm.h - 1));
      if (hm.data.data[(iy * hm.w + ix) * 4 + 3] < 120) return null;
    }
    return { u, v };
  }
  function sizeObj() {
    const hm = hit.get(cur().id); if (!hm) return;
    const cs = getComputedStyle(desk), pw = desk.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ph = desk.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 30;
    let ow = pw, oh = ow / hm.ar;
    if (oh > ph) { oh = ph; ow = oh * hm.ar; }
    objEl.style.width = ow + 'px'; objEl.style.height = oh + 'px';
  }
  const stickerAR = {};
  items.forEach(s => load(s.src).then(im => { stickerAR[s.id] = im.naturalWidth / im.naturalHeight; }).catch(() => {}));
  const defaultW = id => cur().scale * 100 * Math.min(1, stickerAR[id] || 1);   // % of the object's width

  function renderTabs() {
    $('#objTabs').innerHTML = OBJ.map((o, i) =>
      `<button type="button" role="tab" data-i="${i}" aria-selected="${i === objI}">${esc(L(o.title))}<b>${state[o.id].length || ''}</b></button>`).join('');
    $$('#objTabs button').forEach(b => b.addEventListener('click', () => showObj(+b.dataset.i)));
  }
  async function showObj(i, first) {
    objI = i; select(-1);
    $$('#objTabs button').forEach(b => b.setAttribute('aria-selected', String(+b.dataset.i === i)));
    const o = cur();
    if (!first) { objEl.classList.add('swap'); await wait(220); }
    await hitmap(o);
    if (objI !== i) return;
    objImg.src = o.src;
    objEl.style.setProperty('--om', cssURL(o.src));
    shade.className = 'obj-shade' + (o.shade ? ' ' + o.shade : '');
    sizeObj(); renderPlaced();
    await objImg.decode().catch(() => {});
    objEl.classList.remove('swap');
  }
  function renderPlaced(slapIndex) {
    layer.innerHTML = '';
    state[cur().id].forEach((p, k) => {
      const d = document.createElement('div');
      d.className = 'placed' + (k === slapIndex ? ' slap' : '') + (k === sel ? ' sel' : '');
      d.dataset.k = k;
      d.style.left = p.x + '%'; d.style.top = p.y + '%'; d.style.width = p.w + '%'; d.style.setProperty('--r', p.r + 'deg');
      d.innerHTML = `<img src="${byId[p.id].src}" alt="">`;
      d.addEventListener('pointerdown', e => pressPlaced(e, k, d));
      layer.appendChild(d);
    });
    refreshMeta();
  }
  function refreshMeta() {
    const used = [...new Set(OBJ.flatMap(o => state[o.id].map(p => p.id)))];
    const b = $('#orderUsed');
    b.disabled = !used.length;
    b.textContent = used.length ? `${t('page.orderUsed')} (${MG.num(used.length)})` : t('page.orderNone');
    $$('#objTabs button').forEach(bt => { $('b', bt).textContent = state[OBJ[+bt.dataset.i].id].length || ''; });
    $('#deskHint').textContent = t(MG.finePointer ? 'page.hintDrag' : 'page.hintTap');
    $('#deskHint').classList.toggle('gone', state[cur().id].length > 0);
  }
  function select(k) {
    sel = k;
    $$('.placed', layer).forEach(d => d.classList.toggle('sel', +d.dataset.k === k));
    $('#tools').hidden = k < 0;
  }
  function stick(id, u, v, extra) {
    const list = state[cur().id];
    list.push(Object.assign({ id, x: +(u * 100).toFixed(2), y: +(v * 100).toFixed(2), w: +defaultW(id).toFixed(2), r: Math.round((Math.random() - .5) * 16) }, extra || {}));
    saveState(); sel = list.length - 1; renderPlaced(list.length - 1); select(sel);
  }

  /* dragging: a sticker in your hand follows the pointer, leans with the motion and grows to its real size over the object */
  const fly = $('#fly'), flyImg = $('img', fly);
  let drag = null;
  function beginFly(e, id, fromEl, opts) {
    const r = fromEl.getBoundingClientRect();
    drag = Object.assign({ id, x: e.clientX, y: e.clientY, vx: 0, lx: e.clientX, lean: 0, w: r.width, sw: r.width, r: 0, from: fromEl, over: false }, opts || {});
    flyImg.src = byId[id].src; fly.classList.add('on');
    placeFly(); requestAnimationFrame(flyFrame);
  }
  function placeFly() {
    fly.style.width = drag.w.toFixed(1) + 'px';
    fly.style.transform = `translate3d(${drag.x}px,${drag.y}px,0) translate(-50%,-50%) rotate(${(drag.r + drag.lean).toFixed(2)}deg)`;
  }
  function flyFrame() {
    if (!drag || drag.done) return;
    const target = drag.over ? objEl.getBoundingClientRect().width * (drag.pw || defaultW(drag.id)) / 100 : drag.sw * 1.12;
    drag.w += (target - drag.w) * .18;
    drag.vx *= .85; drag.lean += (clamp(drag.vx * .6, -18, 18) - drag.lean) * .15;
    const edge = Math.min(90, innerHeight * .14);           // near the top or bottom: the page scrolls with you
    const push = drag.y > innerHeight - edge ? (drag.y - (innerHeight - edge)) / edge : drag.y < edge ? -(edge - drag.y) / edge : 0;
    if (push) { scrollBy(0, push * 14); drag.over = !!onObject(drag.x, drag.y); desk.classList.toggle('over', drag.over); }
    placeFly();
    requestAnimationFrame(flyFrame);
  }
  addEventListener('pointermove', e => {
    if (press && !drag && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) press.start(e);
    if (!drag) return;
    drag.vx += (e.clientX - drag.lx) * .5; drag.lx = e.clientX;
    drag.x = e.clientX; drag.y = e.clientY;
    drag.over = !!onObject(e.clientX, e.clientY);
    desk.classList.toggle('over', drag.over);
  });
  function release(e, cancelled) {
    const p = press; press = null;
    if (!drag) { if (p && p.tap && !cancelled) p.tap(); return; }
    const d = drag; drag.done = true; drag = null; desk.classList.remove('over');
    const at = cancelled ? onObject(d.x, d.y) : onObject(e.clientX, e.clientY);
    if (at) {
      fly.classList.remove('on');
      if (d.k != null) {                                     // moved a placed sticker
        const q = state[cur().id][d.k]; q.x = +(at.u * 100).toFixed(2); q.y = +(at.v * 100).toFixed(2); q.r = Math.round(d.r + d.lean * .3);
        saveState(); sel = d.k; renderPlaced(d.k); select(d.k);
      } else stick(d.id, at.u, at.v, { r: Math.round(d.lean * .4 + (Math.random() - .5) * 8) });
      if (d.slot) { d.slot.classList.remove('gone'); d.slot.classList.add('back'); setTimeout(() => d.slot.classList.remove('back'), 700); }
      if (d.born) setTimeout(() => { bornI = (bornI + 1) % N; born(bornI); }, 700);   // a new one is painted in its place
      return;
    }
    if (d.k != null) {                                       // pulled off the object: it falls away
      state[cur().id].splice(d.k, 1); saveState(); sel = -1; renderPlaced(); select(-1);
      fly.animate([{ transform: fly.style.transform, opacity: 1 }, { transform: fly.style.transform + ' translateY(140px) rotate(40deg)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.5,0,.9,.5)' })
        .onfinish = () => fly.classList.remove('on');
      return;
    }
    // dropped elsewhere: back onto the sheet
    const r = d.from.getBoundingClientRect();
    fly.animate([{ transform: fly.style.transform, width: fly.style.width }, { transform: `translate3d(${r.left + r.width / 2}px,${r.top + r.height / 2}px,0) translate(-50%,-50%)`, width: r.width + 'px' }],
      { duration: 420, easing: 'cubic-bezier(.2,.8,.25,1)' }).onfinish = () => { fly.classList.remove('on'); if (d.slot) d.slot.classList.remove('gone'); if (d.born) stk.style.visibility = ''; };
  }
  addEventListener('pointerup', e => release(e, false));
  addEventListener('pointercancel', e => release(e, true));

  let press = null;
  sheet.addEventListener('pointerdown', e => {
    const slot = e.target.closest('.slot'); if (!slot || e.button > 0) return;
    e.preventDefault();
    const id = slot.dataset.id;
    press = {
      x: e.clientX, y: e.clientY,
      start: ev => { beginFly(ev, id, $('.peel img', slot), { slot }); slot.classList.add('gone'); },
      tap: () => tapAdd(id)
    };
  });
  sheet.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const s = e.target.closest('.slot'); if (s) { e.preventDefault(); tapAdd(s.dataset.id); } } });
  const SPOTS = [[.5, .45], [.28, .3], [.72, .66], [.7, .28], [.3, .7], [.5, .82], [.5, .18], [.18, .5], [.82, .48], [.38, .56], [.62, .38]];
  function tapAdd(id) {
    const n = state[cur().id].length, [u, v] = SPOTS[n % SPOTS.length];   // spread out, like stickers really collect
    stick(id, u + (Math.random() - .5) * .04, v + (Math.random() - .5) * .04);
    if (!MG.finePointer) desk.scrollIntoView({ behavior: MG.reduced ? 'auto' : 'smooth', block: 'center' });
  }
  stk.addEventListener('pointerdown', e => {                // the freshly peeled sticker can be dragged too
    if (!stk.classList.contains('up')) return;
    e.preventDefault();
    const id = items[bornI].id;
    press = { x: e.clientX, y: e.clientY, start: ev => { beginFly(ev, id, stkImg, { r: -5, born: true }); stk.style.visibility = 'hidden'; }, tap: () => { tapAdd(id); $('#try').scrollIntoView({ behavior: MG.reduced ? 'auto' : 'smooth' }); } };
  });
  function pressPlaced(e, k, el) {
    e.preventDefault(); e.stopPropagation();
    select(k);
    const q = state[cur().id][k];
    press = {
      x: e.clientX, y: e.clientY,
      start: ev => { el.style.visibility = 'hidden'; beginFly(ev, q.id, el, { k, r: q.r, pw: q.w, sw: el.getBoundingClientRect().width }); drag.w = drag.sw; },
      tap: () => {}
    };
  }
  layer.addEventListener('wheel', e => {
    if (sel < 0) return;
    e.preventDefault();
    const q = state[cur().id][sel]; q.r = Math.round(q.r + Math.sign(e.deltaY) * 6); saveState();
    const d = $(`.placed[data-k="${sel}"]`, layer); if (d) d.style.setProperty('--r', q.r + 'deg');
  }, { passive: false });
  desk.addEventListener('pointerdown', e => { if (!e.target.closest('.placed,.tools')) select(-1); });
  $('#tools').addEventListener('click', e => {
    const a = e.target.closest('button'); if (!a || sel < 0) return;
    const list = state[cur().id], q = list[sel];
    if (a.dataset.a === 'rl') q.r -= 15;
    if (a.dataset.a === 'rr') q.r += 15;
    if (a.dataset.a === 'bg') q.w = clamp(q.w * 1.12, 4, 95);
    if (a.dataset.a === 'sm') q.w = clamp(q.w / 1.12, 4, 95);
    if (a.dataset.a === 'rm') { list.splice(sel, 1); sel = -1; }
    saveState(); renderPlaced(); select(sel);
  });
  $('#clearAll').addEventListener('click', () => { state[cur().id] = []; saveState(); sel = -1; renderPlaced(); select(-1); });
  $('#orderUsed').addEventListener('click', () => {
    const used = [...new Set(OBJ.flatMap(o => state[o.id].map(p => p.id)))];
    if (used.length) MG.openOrder(used.map(id => L(byId[id].title)).join(MG.lang === 'ar' ? '، ' : ', '));
  });
  $('#saveImg').addEventListener('click', async () => {       // the object with its stickers, on paper, as a PNG
    const o = cur(), oi = await load(o.src), ow = oi.naturalWidth, oh = oi.naturalHeight;
    const layerC = canvas(ow, oh), lx = layerC.getContext('2d');
    lx.drawImage(oi, 0, 0);
    lx.globalCompositeOperation = 'source-atop';
    for (const q of state[o.id]) {
      const si = await load(byId[q.id].src), w = q.w / 100 * ow, h = w * si.naturalHeight / si.naturalWidth;
      lx.save(); lx.translate(q.x / 100 * ow, q.y / 100 * oh); lx.rotate(q.r * Math.PI / 180); lx.drawImage(si, -w / 2, -h / 2, w, h); lx.restore();
    }
    const pad = Math.round(Math.max(ow, oh) * .14), out = canvas(ow + pad * 2, oh + pad * 2), x = out.getContext('2d');
    x.fillStyle = '#F4F1EC'; x.fillRect(0, 0, out.width, out.height);
    x.shadowColor = 'rgba(40,26,12,.25)'; x.shadowBlur = pad * .35; x.shadowOffsetY = pad * .12;
    x.drawImage(layerC, pad, pad);
    const a = document.createElement('a');
    a.href = out.toDataURL('image/png'); a.download = `mass-grass-${o.id}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    MG.toast(t('page.saved'));
  });
  addEventListener('resize', () => requestAnimationFrame(sizeObj));

  /* ================= 3. the collection ================= */
  function renderGrid() {
    $('#stkGrid').innerHTML = items.map(s => `
      <div class="stk-card rv in" data-id="${s.id}">
        <div class="stk-art"><div class="stk-tilt" style="--m:${cssURL(s.src)}"><img src="${s.src}" alt="${esc(L(s.title))}" loading="lazy" draggable="false"><i class="sheen"></i></div></div>
        <b>${esc(L(s.title))}</b>
        <div class="stk-acts"><button type="button" data-try>${esc(t('page.tryOne'))}</button><a href="#order" data-order="${esc(L(s.title))}" data-checkout="${esc(s.checkout || '')}">${esc(t('page.order'))}</a></div>
      </div>`).join('');
    $$('#stkGrid .stk-card').forEach(card => {
      const tilt = $('.stk-tilt', card);
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        tilt.style.setProperty('--ry', (px * 26).toFixed(1) + 'deg'); tilt.style.setProperty('--rx', (-py * 26).toFixed(1) + 'deg');
        tilt.style.setProperty('--sx', ((px + .5) * 100).toFixed(0) + '%');
      });
      card.addEventListener('pointerleave', () => { tilt.style.removeProperty('--rx'); tilt.style.removeProperty('--ry'); });
      $('[data-try]', card).addEventListener('click', () => {
        tapAdd(card.dataset.id);
        $('#try').scrollIntoView({ behavior: MG.reduced ? 'auto' : 'smooth' });
      });
    });
  }
  $$('#finish button').forEach(b => b.addEventListener('click', () => {
    $$('#finish button').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    document.body.classList.toggle('matte', b.dataset.f === 'matte');
  }));

  /* ================= language + boot ================= */
  function relabel() {
    fillTitle();
    $$('[data-tt]').forEach(b => { b.title = t(b.dataset.tt); b.setAttribute('aria-label', t(b.dataset.tt)); });
    $('#bornName').textContent = L(items[bornI].title);
  }
  MG.onLang(() => { relabel(); renderSheet(); renderTabs(); refreshMeta(); renderGrid(); });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.rv, .stroke').forEach(el => io.observe(el));
  relabel(); renderSheet(); renderTabs(); renderGrid(); showObj(0, true);
});
