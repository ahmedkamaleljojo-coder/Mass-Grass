/* Mass & Grass — hoodies & sweatshirts page.
   Pieces are real product photos (transparent cut-outs) hanging on a real rod.
   Picking one takes it down, then the chosen painting paints itself on a sheet
   of paper, flies onto the chest, presses and peels away, leaving the print on
   the fabric. Any painting from the collection can go on any piece. A lens over
   the piece shows the original painting under the print. Below, the same prints
   are shown worn by models, with the same lens. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const W = window.Watercolor;
  const C = MG.page, items = C.items, N = items.length;
  const rtl = () => document.documentElement.dir === 'rtl';
  const AUTO = 9000;
  const wait = ms => new Promise(r => setTimeout(r, ms));

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

  /* ---------------- images ---------------- */
  const imgCache = new Map();
  const load = src => {
    if (!imgCache.has(src)) imgCache.set(src, new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = src; }));
    return imgCache.get(src);
  };
  const region = (v, w, h) => ({ x: Math.round(v.print.x * w), y: Math.round(v.print.y * h), w: Math.round(v.print.w * w), h: Math.round(v.print.h * h) });
  const coverFit = (aw, ah, r) => { const sc = Math.max(r.w / aw, r.h / ah); return { sc, ox: (r.w - aw * sc) / 2, oy: (r.h - ah * sc) / 2 }; };

  // Print a painting onto a garment photo: clipped to the garment, shaded by its folds, soft-edged.
  async function compose(v, a) {
    const [ph, art] = await Promise.all([load(v.image), load(artURL(a))]);
    const w = ph.naturalWidth, h = ph.naturalHeight;
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const o = out.getContext('2d');
    o.drawImage(ph, 0, 0);
    const r = region(v, w, h);
    const px = o.getImageData(r.x, r.y, r.w, r.h), d = px.data;
    let sum = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { sum += .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]; n++; }
    const mean = sum / Math.max(1, n), dark = mean < 95;
    for (let i = 0; i < d.length; i += 4) {
      const l = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = Math.min(255, Math.round(255 * Math.pow(l / mean, dark ? .6 : .9)));
    }
    const shade = document.createElement('canvas'); shade.width = r.w; shade.height = r.h;
    shade.getContext('2d').putImageData(px, 0, 0);
    const ink = document.createElement('canvas'); ink.width = r.w; ink.height = r.h;
    const k = ink.getContext('2d'), fit = coverFit(art.naturalWidth, art.naturalHeight, r);
    k.drawImage(art, fit.ox, fit.oy, art.naturalWidth * fit.sc, art.naturalHeight * fit.sc);
    const mask = document.createElement('canvas'); mask.width = r.w; mask.height = r.h;
    const mk = mask.getContext('2d'), f = Math.min(r.w, r.h) * (v.print.feather || .09);
    mk.filter = `blur(${f.toFixed(1)}px)`; mk.fillStyle = '#000';
    mk.beginPath(); mk.roundRect(f * 1.2, f * 1.2, r.w - f * 2.4, r.h - f * 2.4, f); mk.fill();
    k.globalCompositeOperation = 'multiply'; k.drawImage(shade, 0, 0);     // folds first: multiply fills empty pixels too,
    k.globalCompositeOperation = 'destination-in'; k.drawImage(art, fit.ox, fit.oy, art.naturalWidth * fit.sc, art.naturalHeight * fit.sc);
    k.drawImage(mask, 0, 0);                                                // so cut back to the paint, then feather
    k.globalCompositeOperation = 'destination-in'; k.drawImage(ph, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    o.save(); o.globalCompositeOperation = dark ? 'source-over' : 'multiply'; o.globalAlpha = dark ? .9 : .95;
    o.drawImage(ink, r.x, r.y); o.restore();
    return out;
  }

  /* ---------------- state ---------------- */
  const st = items.map(it => ({ v: 0, art: artIndex(it.painting), size: it.sizes[Math.min(1, it.sizes.length - 1)] }));
  const done = new Map();                                  // "piece:variant:art" -> {canvas, url}
  const keyOf = i => `${i}:${st[i].v}:${st[i].art}`;
  async function composed(i) {
    const key = keyOf(i);
    if (!done.has(key)) {
      const c = await compose(items[i].variants[st[i].v], ARTS[st[i].art]);
      done.set(key, { canvas: c, url: c.toDataURL('image/webp', .9) });
    }
    return done.get(key);
  }
  const printed = i => (done.get(keyOf(i)) || {}).url;
  let cur = -1, busy = false, timer = null, printing = 0;
  const stage = $('#stage'), wrap = $('#pieceWrap');

  /* ---------------- the rack ----------------
     Pieces hang on a real rod. Dragging moves the whole group along the rod;
     each piece follows on its own spring (so they bunch and trail like real
     clothes) and swings on its hook from its own motion. */
  const rack = $('#rack'), hangersEl = $('#hangers');
  $('#rod').style.borderImageSource = `url("${C.page.rail}")`;
  const rackSrc = i => printed(i) || items[i].variants[st[i].v].image;
  let H = [], RW = 0, HW = 0, gap = 0, group = 0, gVel = 0, gMin = 0, gMax = 0, rackRun = false, rackDrag = false;
  function buildRack() {
    hangersEl.innerHTML = items.map((it, i) =>
      `<div class="hanger" role="tab" data-i="${i}" aria-selected="${i === cur}" aria-label="${esc(L(it.title))}">` +
      `<div class="idle" style="--it:${(5.4 + (i % 3) * .8).toFixed(1)}s;--id:${(-i * 1.1).toFixed(1)}s"><img alt="" draggable="false" src="${rackSrc(i)}"></div></div>`).join('');
    H = $$('.hanger', hangersEl).map(el => ({ el, img: $('img', el), x: 0, v: 0, th: 0, om: 0, hover: false }));
    H.forEach(h => {
      h.el.addEventListener('pointerenter', () => { h.hover = true; kickRack(); });
      h.el.addEventListener('pointerleave', () => { h.hover = false; kickRack(); });
    });
    layoutRack(true);
  }
  function refreshRackImages() { H.forEach((h, i) => { h.img.src = rackSrc(i); }); }
  function layoutRack(reset) {
    RW = rack.clientWidth;
    HW = Math.round(Math.min(240, Math.max(120, rack.clientHeight * .6)));
    gap = HW * (RW < 640 ? .7 : .82);
    rack.style.setProperty('--hw', HW + 'px');
    const span = gap * (N - 1), rodL = RW * .03 + 30 + HW / 2, rodR = RW * .97 - 30 - HW / 2;
    gMin = rodL; gMax = rodR - span;
    if (gMax < gMin) { const t = gMin; gMin = gMax; gMax = t; }
    if (reset) { group = (gMin + gMax) / 2; H.forEach((h, i) => { h.x = group + i * gap; }); }
    kickRack();
  }
  function rackFrame() {
    if (!rackDrag) {
      group += gVel; gVel *= .93;
      if (group < gMin) { group += (gMin - group) * .18; gVel *= .6; }
      else if (group > gMax) { group += (gMax - group) * .18; gVel *= .6; }
    }
    let moving = rackDrag || Math.abs(gVel) > .03;
    const mirror = rtl();
    H.forEach((h, i) => {
      const k = .11 / (1 + i * .12);                       // pieces further along trail a little
      h.v += (group + i * gap - h.x) * k; h.v *= .74; h.x += h.v;
      const sv = mirror ? -h.v : h.v;                      // on-screen velocity
      const eq = Math.max(-15, Math.min(15, sv * 1.3));    // bottom trails behind the motion
      h.om += (eq - h.th) * .05 - h.om * .075; h.th += h.om;
      if (Math.abs(h.v) > .02 || Math.abs(h.om) > .004 || Math.abs(eq - h.th) > .05) moving = true;
      const x = mirror ? RW - h.x : h.x;
      h.el.style.transform = `translate3d(${(x - HW / 2).toFixed(1)}px,0,0) rotate(${h.th.toFixed(2)}deg)`;
      h.el.style.zIndex = h.hover ? 50 : 10 + i;
    });
    if (moving) requestAnimationFrame(rackFrame); else rackRun = false;
  }
  function kickRack() { if (!rackRun) { rackRun = true; requestAnimationFrame(rackFrame); } }

  let rsx = 0, rg0 = 0, rlx = 0, rlt = 0, rflick = 0, rmoved = 0;
  rack.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    rackDrag = true; rsx = rlx = e.clientX; rg0 = group; rlt = performance.now(); rflick = 0; rmoved = 0;
    rack.setPointerCapture(e.pointerId); rack.classList.add('dragging'); $('#rackHint').classList.add('gone'); kickRack();
  });
  rack.addEventListener('pointermove', e => {
    if (!rackDrag) return;
    let g = rg0 + (e.clientX - rsx) * (rtl() ? -1 : 1);
    if (g < gMin) g = gMin - (gMin - g) * .35; else if (g > gMax) g = gMax + (g - gMax) * .35;
    const now = performance.now();
    rflick = (g - group) / Math.max(8, now - rlt) * 16; rlt = now;
    rmoved += Math.abs(e.clientX - rlx); rlx = e.clientX;
    group = g;
  });
  const rackUp = e => {
    if (!rackDrag) return;
    rackDrag = false; rack.classList.remove('dragging');
    if (rmoved < 6) {
      const hit = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.classList && el.classList.contains('hanger'));
      if (hit) show(+hit.dataset.i);
    } else gVel = rflick;
    kickRack();
  };
  rack.addEventListener('pointerup', rackUp);
  rack.addEventListener('pointercancel', rackUp);
  rack.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); gVel -= e.deltaX * .06 * (rtl() ? -1 : 1); $('#rackHint').classList.add('gone'); kickRack();
  }, { passive: false });

  /* ---------------- showing a piece ---------------- */
  async function show(i) {
    i = (i + N) % N;
    if (i === cur || busy) return;
    busy = true;
    let d = cur < 0 ? 1 : i - cur;                         // shortest way round the rail
    if (d > N / 2) d -= N; else if (d < -N / 2) d += N;
    const dir = d >= 0 ? 1 : -1;
    const it = items[i], v = it.variants[st[i].v];
    const photo = await load(v.image);
    const old = $('.piece:not(.out)', wrap);
    if (old) {
      old.style.setProperty('--ox', ((rtl() ? 1 : -1) * dir * 90) + 'px');
      old.style.setProperty('--or', ((rtl() ? 1 : -1) * dir * 7) + 'deg');
      old.classList.add('out');
      setTimeout(() => old.remove(), 600);
    }
    const p = document.createElement('div');
    p.className = 'piece' + (MG.reduced ? '' : ' in');
    p.style.setProperty('--r0', ((rtl() ? -1 : 1) * dir * 7) + 'deg');
    const c = document.createElement('canvas'); c.width = photo.naturalWidth; c.height = photo.naturalHeight;
    c.getContext('2d').drawImage(photo, 0, 0);               // hangs blank, then gets printed
    p.appendChild(c);
    wrap.appendChild(p);
    wrap.setAttribute('aria-label', L(it.title));
    cur = i;
    fillInfo();
    H.forEach((h, n) => { h.el.classList.toggle('taken', n === i); h.el.setAttribute('aria-selected', String(n === i)); });
    stage.style.setProperty('--acc', it.accent);
    const g = $('#ghost'); g.classList.add('swap');
    setTimeout(() => { g.textContent = L(C.page.types[it.type]); g.classList.remove('swap'); }, 240);
    paintBloom(it);
    setTimeout(() => { busy = false; }, 450);
    await wait(MG.reduced ? 0 : 900);
    if (cur === i) await printSequence(i);
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
    const mask = document.createElement('canvas'); mask.width = w; mask.height = h;
    const mctx = mask.getContext('2d'), p = W.painter(mctx, 7), r = W.rng(w + run);
    const spots = [[.5, .5, .42], [.3, .3, .3], [.72, .32, .3], [.28, .72, .3], [.72, .74, .3], [.5, .15, .22], [.5, .88, .22], [.12, .5, .22], [.88, .5, .22]];
    spots.forEach(([x, y, rad], n) => p.add({ x: x * w, y: y * h, radius: rad * w, color: '#000000', layers: 16, alpha: .16, rand: r, spread: .45, blend: 'source-over', edges: false }, n * 70));
    const art = document.createElement('canvas'); art.width = w; art.height = h;
    const actx = art.getContext('2d'); const f = coverFit(img.naturalWidth, img.naturalHeight, { w, h });
    actx.drawImage(img, f.ox, f.oy, img.naturalWidth * f.sc, img.naturalHeight * f.sc);
    const t0 = performance.now();
    await new Promise(res => {
      const tick = () => {
        if (run !== printing) return res();
        ctx.fillStyle = '#FBF7EF'; ctx.fillRect(0, 0, w, h);
        const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
        const tc = tmp.getContext('2d'); tc.drawImage(art, 0, 0); tc.globalCompositeOperation = 'destination-in'; tc.drawImage(mask, 0, 0);
        ctx.drawImage(tmp, 0, 0);
        if (p.busy && performance.now() - t0 < 2600) requestAnimationFrame(tick);
        else { drawCover(ctx, img, w, h); res(); }
      };
      requestAnimationFrame(tick);
    });
  }
  function contentRect(canvas) {                          // the drawn image inside an object-fit: contain canvas
    const b = canvas.getBoundingClientRect(), k = Math.min(b.width / canvas.width, b.height / canvas.height);
    const w = canvas.width * k, h = canvas.height * k;
    return { left: b.left + (b.width - w) / 2, top: b.top + (b.height - h) / 2, width: w, height: h };
  }
  async function printSequence(i) {
    const run = ++printing;
    clearTimeout(timer);
    const a = ARTS[st[i].art], v = items[i].variants[st[i].v];
    const [img, result] = await Promise.all([load(artURL(a)), composed(i)]);
    if (run !== printing || cur !== i) return;
    card.classList.add('painting');
    await paintIn(img, run);
    if (run !== printing || cur !== i) return;
    const pieceCanvas = $('.piece:not(.out) canvas', wrap);
    const lay = () => pieceCanvas.getContext('2d').drawImage(result.canvas, 0, 0);
    if (MG.reduced || !pieceCanvas) { if (pieceCanvas) lay(); card.classList.remove('painting'); afterPrint(i); return; }

    const from = cardCanvas.getBoundingClientRect(), cr = contentRect(pieceCanvas);
    const to = { left: cr.left + v.print.x * cr.width, top: cr.top + v.print.y * cr.height, width: v.print.w * cr.width, height: v.print.h * cr.height };
    const fly = document.createElement('div'); fly.className = 'fly-sheet';
    const fc = document.createElement('canvas'); fc.width = cardCanvas.width; fc.height = cardCanvas.height;
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
    if (run !== printing) { fly.remove(); return; }
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
  function afterPrint(i) { refreshRackImages(); renderCards(); refreshLooks(); restartTimer(); }
  function reprint() {
    const pc = $('.piece:not(.out) canvas', wrap);
    load(items[cur].variants[st[cur].v].image).then(ph => { if (pc) { const x = pc.getContext('2d'); x.clearRect(0, 0, pc.width, pc.height); x.drawImage(ph, 0, 0); } printSequence(cur); });
  }

  function fillInfo() {
    const it = items[cur], s = st[cur], v = it.variants[s.v], a = ARTS[s.art];
    $('#count').innerHTML = `<b>${MG.pad(cur + 1)}</b> / ${MG.pad(N)}`;
    $('#kick').textContent = `${L(C.page.types[it.type])} · ${MG.pad(cur + 1)}`;
    $('#name').textContent = L(it.title);
    $('#story').textContent = L(it.story);
    $('#colorName').textContent = L(C.colors[v.color].name);
    $('#swatches').innerHTML = it.variants.map((x, vi) =>
      `<button class="sw" type="button" role="radio" data-v="${vi}" aria-checked="${vi === s.v}" aria-label="${esc(L(C.colors[x.color].name))}" style="--c:${C.colors[x.color].hex}"></button>`).join('');
    $$('#swatches .sw').forEach(b => b.addEventListener('click', () => {
      const vi = +b.dataset.v; if (vi === s.v) return;
      s.v = vi; const c0 = cur; cur = -1; show(c0);
    }));
    $('#artName').textContent = L(a.title);
    $('#arts').innerHTML = ARTS.map((x, ai) =>
      `<button class="art-b" type="button" role="radio" data-a="${ai}" aria-checked="${ai === s.art}" aria-label="${esc(L(x.title))}"><img alt="" src="${artURL(x)}"></button>`).join('');
    $$('#arts .art-b').forEach(b => b.addEventListener('click', () => {
      const ai = +b.dataset.a; if (ai === s.art) return;
      s.art = ai; fillInfo(); reprint();
    }));
    $('#sizes').innerHTML = it.sizes.map(z => `<button class="sz" type="button" role="radio" data-s="${z}" aria-checked="${z === s.size}">${z}</button>`).join('');
    $$('#sizes .sz').forEach(b => b.addEventListener('click', () => { s.size = b.dataset.s; fillInfo(); }));
    $('#orderBtn').href = MG.order(`${L(it.title)} · ${L(a.title)} · ${L(C.colors[v.color].name)} · ${s.size}`);
    card.setAttribute('aria-label', L(a.title));
  }

  let bloomFlip = false;
  function paintBloom(it) {
    if (MG.reduced) return;
    bloomFlip = !bloomFlip;
    const on = $(bloomFlip ? '#bloomA' : '#bloomB'), off = $(bloomFlip ? '#bloomB' : '#bloomA');
    const { ctx, w, h } = W.fit(on);
    ctx.clearRect(0, 0, w, h);
    const p = W.painter(ctx, 6), r = W.rng(it.id.length * 131), m = Math.min(w, h);
    p.add({ x: w * .5, y: h * .5, radius: m * .36, color: it.accent, layers: 26, alpha: .028, rand: r, spread: .3, blend: 'source-over' });
    p.add({ x: w * .42, y: h * .66, radius: m * .2, color: ARTS[st[cur].art].spec.palette[1], layers: 20, alpha: .03, rand: r, blend: 'source-over' }, 120);
    on.classList.add('on'); off.classList.remove('on');
  }

  /* ---------------- auto-advance ---------------- */
  let paused = false;
  function restartTimer() {
    clearTimeout(timer);
    const bar = $('#timerBar');
    bar.classList.remove('run'); void bar.offsetWidth;
    if (MG.reduced || paused || N < 2) return;
    bar.style.setProperty('--dur', AUTO + 'ms'); bar.classList.add('run');
    timer = setTimeout(() => { if (document.visibilityState === 'visible' && !$('#lb').open) show(cur + 1); else restartTimer(); }, AUTO);
  }
  stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { paused = true; clearTimeout(timer); $('#timerBar').classList.remove('run'); } });
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { paused = false; restartTimer(); } });
  new IntersectionObserver(es => es.forEach(e => { paused = !e.isIntersecting; paused ? clearTimeout(timer) : restartTimer(); }), { threshold: .25 }).observe(stage);

  /* ---------------- controls ---------------- */
  $('#prevBtn').addEventListener('click', () => show(cur - 1));
  $('#nextBtn').addEventListener('click', () => show(cur + 1));
  document.addEventListener('keydown', e => {
    if ($('#lb').open || /input|textarea|select/i.test(document.activeElement.tagName)) return;
    const fwd = rtl() ? 'ArrowLeft' : 'ArrowRight', back = rtl() ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd) show(cur + 1); else if (e.key === back) show(cur - 1);
  });
  let sx0 = null;
  wrap.addEventListener('pointerdown', e => { sx0 = e.clientX; });
  wrap.addEventListener('pointerup', e => {
    if (sx0 == null) return;
    const dx = e.clientX - sx0; sx0 = null;
    if (Math.abs(dx) < 50) { openBox(cur); return; }
    show(cur + ((dx < 0) === rtl() ? -1 : 1));
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
      const s = source(); if (!s) return hide();
      const pc = s.canvas, cr = contentRect(pc);
      const u = (cx - cr.left) / cr.width, v = (cy - cr.top) / cr.height;
      if (u < 0 || u > 1 || v < 0 || v > 1) return hide();
      if (!LS) { LS = lensEl.offsetWidth || 170; cv.width = cv.height = LS * 2; }
      const b = host.getBoundingClientRect();
      lensEl.style.transform = `translate(${cx - b.left - LS / 2}px,${cy - b.top - LS / 2}px)`;
      lensEl.classList.add('on');
      const R = region(s.v, pc.width, pc.height);
      const x = u * pc.width, y = v * pc.height, inside = x > R.x && x < R.x + R.w && y > R.y && y < R.y + R.h;
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
      host.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') at(e.clientX, e.clientY); });
      host.addEventListener('pointerleave', hide);
    }
    return { at, hide };
  }
  makeLens(wrap, $('#lens'), () => {
    const pc = $('.piece:not(.out) canvas', wrap);
    return pc && cur >= 0 ? { canvas: pc, v: items[cur].variants[st[cur].v], art: ARTS[st[cur].art] } : null;
  });

  /* ---------------- see it worn ----------------
     A model photo per piece, printed with the painting picked for it above.
     Hover (or tap, on touch) for the lens. */
  const looksEl = $('#looks');
  const worn = items.map((it, i) => ({ it, i })).filter(x => x.it.worn);
  const wornDone = new Map();                             // "piece:art" -> canvas
  let looksLive = false;
  async function wornCanvas(i) {
    const key = `${i}:${st[i].art}`;
    if (!wornDone.has(key)) wornDone.set(key, compose(items[i].worn, ARTS[st[i].art]));
    return wornDone.get(key);
  }
  function buildLooks() {
    if (!worn.length) { $('#worn').hidden = true; return; }
    looksEl.innerHTML = worn.map(({ it, i }) => `
      <figure class="look rv" data-i="${i}" style="--acc:${it.accent}">
        <div class="look-photo">
          <canvas class="look-cv" role="img"></canvas>
          <div class="lens" aria-hidden="true"><canvas></canvas>
            <span class="lens-tag"><span class="t-art"></span><span class="t-fab"></span></span></div>
          <span class="look-hint" aria-hidden="true"><span class="lh-ic">◎</span> <span class="lh-t"></span></span>
        </div>
        <figcaption class="look-cap">
          <span class="look-k"></span>
          <b class="look-n"></b>
          <span class="look-a"></span>
          <button class="look-try" type="button"></button>
        </figcaption>
      </figure>`).join('');
    $$('.look', looksEl).forEach(fig => {
      const i = +fig.dataset.i, photo = $('.look-photo', fig), cv = $('.look-cv', fig);
      const lens = makeLens(photo, $('.lens', fig), () => cv.width ? { canvas: cv, v: items[i].worn, art: ARTS[st[i].art] } : null);
      if (!MG.finePointer) {                               // touch: tap to drop the lens, tap outside to lift it
        photo.addEventListener('click', e => { lens.at(e.clientX, e.clientY); fig.classList.add('used'); });
        document.addEventListener('pointerdown', e => { if (!photo.contains(e.target)) lens.hide(); });
      } else photo.addEventListener('pointerenter', () => fig.classList.add('used'));
      $('.look-try', fig).addEventListener('click', () => { show(i); $('#wr').scrollIntoView({ behavior: MG.reduced ? 'auto' : 'smooth', block: 'start' }); });
    });
    labelLooks();
    $$('.look', looksEl).forEach(el => io.observe(el));
    new IntersectionObserver((es, ob) => { if (es.some(e => e.isIntersecting)) { looksLive = true; refreshLooks(); ob.disconnect(); } },
      { rootMargin: '400px 0px' }).observe(looksEl);
  }
  function labelLooks() {
    $$('.look', looksEl).forEach(fig => {
      const i = +fig.dataset.i, it = items[i];
      $('.look-k', fig).textContent = `${L(C.page.types[it.type])} · ${MG.pad(i + 1)}`;
      $('.look-n', fig).textContent = L(it.title);
      $('.look-a', fig).textContent = `${t('page.pickArt')}: ${L(ARTS[st[i].art].title)}`;
      $('.look-try', fig).textContent = t('page.wornPick');
      $('.lh-t', fig).textContent = t(MG.finePointer ? 'page.wornHintFine' : 'page.wornHintTouch');
      $('.t-art', fig).textContent = t('page.lensArt');
      $('.t-fab', fig).textContent = t('page.lensFabric');
      $('.look-cv', fig).setAttribute('aria-label', `${L(it.title)} · ${L(ARTS[st[i].art].title)}`);
    });
  }
  async function refreshLooks() {
    if (!looksLive) return;
    labelLooks();
    for (const fig of $$('.look', looksEl)) {
      const i = +fig.dataset.i, key = `${i}:${st[i].art}`;
      if (fig.dataset.key === key) continue;
      const src = await wornCanvas(i), cv = $('.look-cv', fig);
      if (`${i}:${st[i].art}` !== key) continue;
      cv.width = src.width; cv.height = src.height;
      cv.getContext('2d').drawImage(src, 0, 0);
      fig.dataset.key = key;
      fig.classList.remove('fresh'); void fig.offsetWidth; fig.classList.add('fresh');
    }
  }

  /* ---------------- lightbox ---------------- */
  const lb = $('#lb');
  async function openBox(i) {
    const it = items[i], s = st[i], v = it.variants[s.v], a = ARTS[s.art];
    const res = await composed(i);
    $('#lbArt').src = artURL(a); $('#lbArt').alt = L(a.title);
    $('#lbPiece').src = res.url; $('#lbPiece').alt = L(it.title);
    $('#lbKick').textContent = `${L(C.page.types[it.type])} · ${MG.pad(i + 1)} / ${MG.pad(N)}`;
    $('#lbName').textContent = L(it.title);
    $('#lbStory').textContent = L(it.story);
    $('#lbSpecs').innerHTML = [
      [t('page.artwork'), L(a.title)], [t('page.fabric'), L(it.fabric)], [t('page.color'), L(C.colors[v.color].name)],
      [t('page.size'), it.sizes.join(' · ')], [t('page.price'), it.price ? L(it.price) : t('page.priceOnRequest')]
    ].map(([k, val]) => `<dt>${esc(k)}</dt><dd>${esc(val)}</dd>`).join('');
    $('#lbNote').textContent = it.sample ? t('page.sampleNote') : '';
    $('#lbOrder').href = MG.order(`${L(it.title)} · ${L(a.title)} · ${L(C.colors[v.color].name)} · ${s.size}`);
    if (!lb.open) lb.showModal();
    clearTimeout(timer);
  }
  $('#lbClose').addEventListener('click', () => lb.close());
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  lb.addEventListener('close', () => restartTimer());

  /* ---------------- collection cards ---------------- */
  function renderCards() {
    $('#cards').innerHTML = items.map((it, i) => `
      <button class="card rv in" type="button" data-i="${i}" style="--acc:${it.accent}">
        <span class="card-media">
          <img class="art" src="${artURL(ARTS[st[i].art])}" alt="${esc(L(it.title))}" loading="lazy">
          <img class="pc" src="${printed(i) || ''}" alt="" loading="lazy">
          <span class="card-hint">${esc(t('page.hover'))}</span>
        </span>
        <span class="card-body"><span>${MG.pad(i + 1)} · ${esc(L(C.page.types[it.type]))}</span><b>${esc(L(it.title))}</b></span>
      </button>`).join('');
    $$('#cards .card').forEach(b => b.addEventListener('click', () => openBox(+b.dataset.i)));
  }

  /* ---------------- boot ---------------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.rv, .stroke').forEach(el => io.observe(el));
  MG.onLang(() => { H.forEach((h, i) => h.el.setAttribute('aria-label', L(items[i].title))); layoutRack(false); renderCards(); labelLooks(); if (cur >= 0) { fillInfo(); $('#ghost').textContent = L(C.page.types[items[cur].type]); } });

  buildRack(); renderCards(); buildLooks();
  window.addEventListener('resize', () => layoutRack(false));
  (async () => {
    for (let i = 0; i < N; i++) await composed(i);         // print every piece for the rail and cards
    refreshRackImages(); renderCards();
  })();
  show(0);
});
