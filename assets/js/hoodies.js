/* Mass & Grass — hoodies & sweatshirts page.
   Pieces hang on a line (see the hanging-display skill): dragging it left
   and right, the piece passing the middle grows and lit while the rest
   shrink and dim by distance, and the pieces swing with the motion. Every colour is its
   own photo of the same mockup. Picking a painting paints it straight onto
   the chosen piece. Beside the details, a model photo shows it worn.
   What is sold is the digital file; orders go through the order sheet. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const W = window.Watercolor;
  const C = MG.page, items = C.items, N = items.length, COLORS = C.colors, PROD = C.products;
  const rtl = () => document.documentElement.dir === 'rtl';
  const AUTO = 6000;
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; };

  /* ---------------- paintings you can print ---------------- */
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
  const region = (pr, w, h) => ({ x: Math.round(pr.x * w), y: Math.round(pr.y * h), w: Math.round(pr.w * w), h: Math.round(pr.h * h) });
  const coverFit = (aw, ah, r) => { const sc = Math.max(r.w / aw, r.h / ah); return { sc, ox: (r.w - aw * sc) / 2, oy: (r.h - ah * sc) / 2 }; };

  // The painting as ink: paper and faint washes carry no ink, so only the
  // painted strokes are printed (ink strength follows how dark and how
  // coloured the paint is), like a real print with no white underbase.
  const inkCache = new Map();
  function inkOf(img) {
    if (inkCache.has(img.src)) return inkCache.get(img.src);
    const w = img.naturalWidth, h = img.naturalHeight, c = canvas(w, h), x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const id = x.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2];
      const sat = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
      d[i + 3] = Math.round(d[i + 3] * Math.max(0, Math.min(1, ((255 - lum) + sat * .8 - 48) / 80)));
    }
    x.putImageData(id, 0, 0);
    inkCache.set(img.src, c);
    return c;
  }

  // An organic watercolour edge for the print (so it never reads as a pasted box),
  // painted once per size with the site's watercolour engine.
  const edgeCache = new Map();
  function edgeOf(w, h) {
    const key = `${w}x${h}`;
    if (edgeCache.has(key)) return edgeCache.get(key);
    const c = canvas(w, h), x = c.getContext('2d'), r = W.rng(29), m = Math.min(w, h);
    [[.5, .5, .3], [.38, .4, .22], [.62, .4, .22], [.38, .62, .22], [.62, .62, .22], [.5, .28, .18], [.5, .74, .18], [.3, .5, .17], [.7, .5, .17]]
      .forEach(([u, v, rad]) => W.paintNow(x, { x: u * w, y: v * h, radius: rad * m, color: '#000000', layers: 18, alpha: .2, rand: r, spread: .3, blend: 'source-over', edges: false }));
    const id = x.getImageData(0, 0, w, h), d = id.data;                     // firm up the middle, keep the ragged rim
    for (let i = 3; i < d.length; i += 4) d[i] = Math.min(255, d[i] * 1.8);
    x.putImageData(id, 0, 0);
    edgeCache.set(key, c);
    return c;
  }

  // Print a painting on the chest of a photo: only the paint, shaded by the
  // folds, multiplied into light cloth, laid on top of mid and dark cloth.
  function printOn(photo, pr, art) {
    const w = photo.width || photo.naturalWidth, h = photo.height || photo.naturalHeight;
    const out = canvas(w, h), o = out.getContext('2d');
    o.drawImage(photo, 0, 0, w, h);
    if (!art) return out;
    const r = region(pr, w, h);
    const px = o.getImageData(r.x, r.y, r.w, r.h), d = px.data;
    let sum = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { sum += .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]; n++; }
    const mean = sum / Math.max(1, n), light = mean > 170;
    for (let i = 0; i < d.length; i += 4) {
      const lum = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = Math.min(255, Math.round(255 * Math.pow(lum / mean, light ? .9 : .6)));
    }
    const shade = canvas(r.w, r.h); shade.getContext('2d').putImageData(px, 0, 0);
    const src = inkOf(art), ink = canvas(r.w, r.h), k = ink.getContext('2d');
    const sc = Math.min(r.w / src.width, r.h / src.height);
    const dw = src.width * sc, dh = src.height * sc, paint = () => k.drawImage(src, (r.w - dw) / 2, (r.h - dh) / 2, dw, dh);   // whole painting, fitted
    paint();
    k.globalCompositeOperation = 'multiply'; k.drawImage(shade, 0, 0);     // folds (multiply fills empty pixels too),
    k.globalCompositeOperation = 'destination-in'; paint();                   // so cut back to the paint,
    k.drawImage(edgeOf(r.w, r.h), 0, 0);                                      // let it bleed out like watercolour,
    k.drawImage(photo, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);                   // and keep it on the piece
    o.save(); o.globalCompositeOperation = light ? 'multiply' : 'source-over'; o.globalAlpha = light ? .96 : .9;
    o.drawImage(ink, r.x, r.y); o.restore();
    return out;
  }

  /* ---------------- state and rendered photos ---------------- */
  const st = items.map(it => ({ color: it.color, art: artIndex(it.painting) }));
  const srcOf = (i, kind) => {
    const c = st[i].color, p = kind === 'piece' ? PROD[items[i].type] : items[i].looks.stand;
    return { image: p.colors[c], print: p.print };
  };
  const cache = new Map();
  const remember = (k, v) => { cache.set(k, v); if (cache.size > 40) cache.delete(cache.keys().next().value); return v; };
  function render(i, kind) {
    const s = srcOf(i, kind), a = ARTS[st[i].art], key = `${s.image}|${a.id}`;
    if (cache.has(key)) return cache.get(key);
    return remember(key, (async () => {
      const [ph, art] = await Promise.all([load(s.image), load(artURL(a))]);
      return { canvas: printOn(ph, s.print, art), photo: ph, print: s.print };
    })());
  }
  const toURL = c => c.toDataURL('image/webp', .9);
  const shrink = (c, w) => { const s = canvas(w, w * c.height / c.width); s.getContext('2d').drawImage(c, 0, 0, s.width, s.height); return s; };
  const orderName = i => `${L(items[i].title)} · ${L(ARTS[st[i].art].title)} · ${L(COLORS[st[i].color].name)}`;

  let cur = -1, timer = null, engaged = false;
  const hero = $('#wr'), line = $('#line');
  const painted = new Set();                               // "piece|painting" already painted in once

  /* ---------------- the line ----------------
     The pieces sit on a line that the visitor drags left and right. `pos` is
     a float index: the piece at `pos` is in the middle. Each piece's size,
     brightness and place follow its distance from the middle continuously,
     so the one passing in front of you grows and the rest shrink as you drag. */
  let pos = 0, vel = 0, target = 0, dragging = false, dragged = false, running = false;
  let small = 120, big = 380, gap = 20, lineW = 0, prevShift = null;
  const H = [];                                            // per piece: element and swing state
  function buildLine() {
    line.innerHTML = items.map((it, i) =>
      `<button class="hang" type="button" role="tab" data-i="${i}" aria-selected="false" aria-label="${esc(L(it.title))}"` +
      ` style="--sw:${(4.9 + (i % 4) * .55).toFixed(2)}s;--swd:-${(i * .73).toFixed(2)}s">` +
      `<span class="pc"><img alt="" draggable="false"><canvas class="paint"></canvas></span></button>`).join('');
    $$('.hang', line).forEach(el => H.push({ el, a: 0, v: 0 }));
    line.addEventListener('click', e => {
      const b = e.target.closest('.hang'); if (!b || dragged) return;
      engaged = true; +b.dataset.i === cur ? openBox(cur) : show(+b.dataset.i);
    });
    items.forEach((_, i) => refreshHang(i));
    sizeLine();
  }
  const hangOf = i => H[i] && H[i].el;
  function sizeLine() {
    lineW = line.clientWidth;
    const vw = innerWidth, phone = vw <= 640;
    small = phone ? vw * .2 : Math.min(160, Math.max(80, vw * .1));
    big = phone ? Math.min(vw * .62, 300) : Math.min(410, Math.max(240, vw * .27));
    gap = Math.min(30, Math.max(10, vw * .018));
    line.style.height = Math.round(big * 1.26 + 100) + 'px';
    prevShift = null; kick();
  }
  const ease = d => { const k = Math.max(0, 1 - Math.abs(d)); return k * k * (3 - 2 * k); };
  const widthAt = (k, p) => small + (big - small) * ease(k - p);
  function place(p) {                                      // centre of each piece, with piece p in the middle
    const w = H.map((_, k) => widthAt(k, p)), c = [];
    let acc = 0;
    w.forEach((x, k) => { c[k] = acc + x / 2; acc += x + gap; });
    const f = Math.max(0, Math.min(N - 1, p)), i = Math.min(N - 2, Math.floor(f));
    const mid = N > 1 ? c[i] + (c[i + 1] - c[i]) * (f - i) : c[0];
    const over = p < 0 ? p : p > N - 1 ? p - (N - 1) : 0;   // rubber band past the ends
    return { w, c, shift: lineW / 2 - mid - over * (small + gap) };
  }
  function frame() {
    if (!dragging) { vel += (target - pos) * .07; vel *= .74; pos += vel; }
    const { w, c, shift } = place(pos);
    const moveV = prevShift == null ? 0 : (shift - prevShift) * (rtl() ? -1 : 1); prevShift = shift;
    let busy = dragging || Math.abs(target - pos) > .0005 || Math.abs(vel) > .0005;
    H.forEach((o, k) => {
      const d = Math.abs(k - pos);
      let x = c[k] + shift - w[k] / 2;
      if (rtl()) x = lineW - x - w[k];
      const goal = MG.reduced ? 0 : Math.max(-12, Math.min(12, -moveV * .5 * (1 + (k % 3) * .12)));
      o.v += (goal - o.a) * .09; o.v *= .86; o.a += o.v;       // each piece lags behind the line and swings back
      if (Math.abs(o.a) > .02 || Math.abs(o.v) > .02) busy = true;
      o.el.style.width = w[k].toFixed(1) + 'px';
      o.el.style.transform = `translate3d(${x.toFixed(1)}px,0,0) rotate(${o.a.toFixed(2)}deg)`;
      o.el.style.opacity = Math.max(.35, 1 - Math.min(d, 3) * .22).toFixed(2);
      o.el.style.filter = d < .02 ? 'none' : `grayscale(${Math.min(d, 2) * .25}) brightness(${1 - Math.min(d, 2) * .025})`;
      o.el.style.zIndex = 50 - Math.round(d * 10);
    });
    const near = Math.max(0, Math.min(N - 1, Math.round(pos)));
    if (dragging && near !== cur) show(near, true);
    if (busy) requestAnimationFrame(frame); else running = false;
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
  const center = (i, smooth = true) => { target = i; if (!smooth || MG.reduced) { pos = i; vel = 0; } kick(); };
  addEventListener('resize', () => requestAnimationFrame(sizeLine));

  /* dragging: the line follows the hand; a flick carries on and settles on the nearest piece */
  let x0 = 0, p0 = 0, lastX = 0, lastT = 0, flick = 0;
  const step = () => (small + big) / 2 + gap;
  line.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    dragging = true; dragged = false; x0 = lastX = e.clientX; p0 = pos; lastT = performance.now(); flick = 0; vel = 0;
    line.classList.add('dragging'); takeOver(); kick();
  });
  function takeOver() { engaged = true; clearTimeout(timer); const t = $('#timerBar'); if (t) t.classList.remove('run'); }
  addEventListener('pointermove', e => {
    if (!dragging) return;
    if (Math.abs(e.clientX - x0) > 6 && !dragged) { dragged = true; $('#dragHint').classList.add('gone'); }
    const dir = rtl() ? -1 : 1;
    let p = p0 - dir * (e.clientX - x0) / step();
    if (p < 0) p *= .3; else if (p > N - 1) p = N - 1 + (p - N + 1) * .3;
    const now = performance.now(); flick = (p - pos) / Math.max(8, now - lastT) * 16; lastX = e.clientX; lastT = now;
    pos = p;
  });
  const release = () => {
    if (!dragging) return;
    dragging = false; line.classList.remove('dragging');
    const to = Math.max(0, Math.min(N - 1, Math.round(pos + (dragged ? flick * 8 : 0))));
    vel = dragged ? flick : 0; target = to;
    if (to !== cur) show(to, true);
    kick(); setTimeout(() => { dragged = false; }, 0);
  };
  addEventListener('pointerup', release); addEventListener('pointercancel', release);
  let wheelAcc = 0, wheelT;
  line.addEventListener('wheel', e => {                     // trackpads swipe sideways
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); takeOver();
    wheelAcc += e.deltaX * (rtl() ? -1 : 1);
    clearTimeout(wheelT); wheelT = setTimeout(() => { wheelAcc = 0; }, 160);
    if (Math.abs(wheelAcc) > 50) { show(Math.max(0, Math.min(N - 1, cur + Math.sign(wheelAcc)))); wheelAcc = 0; $('#dragHint').classList.add('gone'); }
  }, { passive: false });

  // Show a piece on its hanger. With `paint`, the chosen painting paints itself
  // onto the chest: the plain piece first, then the print grows in watercolour blooms.
  let paintRun = 0;
  async function refreshHang(i, paint) {
    const r = await render(i, 'piece'), b = hangOf(i), img = $('.pc img', b), cv = $('.paint', b);
    const done = () => { img.src = toURL(r.canvas); cv.classList.remove('on'); };
    if (!paint || MG.reduced) return done();
    const run = ++paintRun;
    img.src = r.photo.src;                                 // the plain piece
    await img.decode().catch(() => {});
    const w = r.canvas.width, h = r.canvas.height, R = region(r.print, w, h);
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d'), mask = canvas(w, h), p = W.painter(mask.getContext('2d'), 3), rnd = W.rng(7 + i * 13 + st[i].art);
    const m = Math.min(R.w, R.h), spots = [];
    for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 5; gx++)          // small blooms on a loose grid…
      spots.push([(gx + .5 + (rnd() - .5) * .6) / 5, (gy + .5 + (rnd() - .5) * .6) / 5]);
    spots.sort((a, b) => (a[1] + a[0] * .3) - (b[1] + b[0] * .3));        // …laid down from the top, like brush strokes
    spots.forEach(([u, v]) => p.add({ x: R.x + u * R.w, y: R.y + v * R.h, radius: m * (.15 + rnd() * .06), color: '#000000', layers: 14, alpha: .17, rand: rnd, spread: .55, blend: 'source-over', edges: false }, 70));
    cv.classList.add('on');
    const t0 = performance.now();
    await new Promise(res => {
      const tick = () => {
        if (run !== paintRun) return res();
        ctx.globalCompositeOperation = 'copy'; ctx.drawImage(r.canvas, 0, 0);
        ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(mask, 0, 0);
        if (p.busy && performance.now() - t0 < 4200) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    if (run === paintRun) done();
  }
  function markLine() {
    H.forEach((o, k) => { o.el.classList.toggle('on', k === cur); o.el.setAttribute('aria-selected', String(k === cur)); });
  }

  /* ---------------- showing a piece ---------------- */
  function show(i, fromLine) {                             // fromLine: the drag already moved it there
    i = (i + N) % N;
    if (i === cur) return;
    const first = cur < 0;
    cur = i;
    const it = items[i];
    hero.style.setProperty('--acc', it.accent);
    markLine();
    if (!fromLine) center(i, !first);
    const g = $('#ghost'); g.classList.add('sw');
    setTimeout(() => { g.textContent = L(it.title); g.classList.remove('sw'); }, 230);
    $('#count').innerHTML = `<b>${MG.pad(i + 1)}</b> / ${MG.pad(N)}`;
    fillInfo(); drawLook(); drawCard();
    const key = `${i}|${st[i].art}`;
    if (!painted.has(key)) { painted.add(key); setTimeout(() => { if (cur === i) refreshHang(i, true); }, 450); }
    restartTimer();
  }

  function fillInfo() {
    const it = items[cur], s = st[cur], a = ARTS[s.art];
    $('#kick').textContent = `${L(C.page.types[it.type])} · ${MG.pad(cur + 1)}`;
    $('#name').textContent = L(it.title);
    $('#story').textContent = L(it.story);
    $('#colorName').textContent = L(COLORS[s.color].name);
    $('#swatches').innerHTML = Object.entries(COLORS).map(([k, c]) =>
      `<button class="sw" type="button" role="radio" data-c="${k}" aria-checked="${k === s.color}" aria-label="${esc(L(c.name))}" style="--c:${c.hex}"></button>`).join('');
    $$('#swatches .sw').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.c === st[cur].color) return;
      engaged = true; st[cur].color = b.dataset.c; refresh(false);
    }));
    $('#artName').textContent = L(a.title);
    $('#arts').innerHTML = ARTS.map((x, ai) =>
      `<button class="art-b" type="button" role="radio" data-a="${ai}" aria-checked="${ai === s.art}" aria-label="${esc(L(x.title))}"><img alt="" src="${artURL(x)}"></button>`).join('');
    $$('#arts .art-b').forEach(b => b.addEventListener('click', () => {
      const ai = +b.dataset.a; if (ai === st[cur].art) return;
      engaged = true; st[cur].art = ai; painted.add(`${cur}|${ai}`); refresh(true);
    }));
    $('#formats').textContent = MG.t('site:sales.formats') || L((MG.site.sales || {}).formats);
    $('#orderBtn').dataset.order = orderName(cur);
    $('#printCard').setAttribute('aria-label', L(a.title));
  }
  // the colour or the painting of the chosen piece changed
  function refresh(newArt) {
    clearTimeout(timer); $('#timerBar').classList.remove('run');
    fillInfo(); drawCard(); drawLook(); refreshCard(cur);
    refreshHang(cur, newArt);                              // a new painting paints itself onto the piece
  }

  /* ---------------- the original painting, on paper ---------------- */
  const card = $('#printCard'), cardCanvas = $('#printCanvas');
  async function drawCard() {
    const img = await load(artURL(ARTS[st[cur].art])), ctx = cardCanvas.getContext('2d'), w = cardCanvas.width, h = cardCanvas.height;
    ctx.fillStyle = '#FBF7EF'; ctx.fillRect(0, 0, w, h);
    const f = coverFit(img.naturalWidth, img.naturalHeight, { w, h });
    ctx.drawImage(img, f.ox, f.oy, img.naturalWidth * f.sc, img.naturalHeight * f.sc);
  }
  function contentRect(el, cw, ch) {                       // the drawn picture inside a contained image
    const b = el.getBoundingClientRect(), k = Math.min(b.width / cw, b.height / ch);
    const w = cw * k, h = ch * k;
    return { left: b.left + (b.width - w) / 2, top: b.top + (b.height - h) / 2, width: w, height: h };
  }

  /* ---------------- the look: the chosen piece, worn ---------------- */
  let lookSeq = 0;
  const lookData = { canvas: null, print: null };
  async function drawLook() {
    const i = cur, n = ++lookSeq;
    const r = await render(i, 'stand');
    if (n !== lookSeq) return;
    const box = $('#look'), old = $$('.lk', box);
    const c = canvas(r.canvas.width, r.canvas.height); c.className = 'lk'; c.getContext('2d').drawImage(r.canvas, 0, 0);
    box.appendChild(c); requestAnimationFrame(() => c.classList.add('on'));
    old.forEach(o => { o.classList.remove('on'); setTimeout(() => o.remove(), 500); });
    lookData.canvas = c; lookData.print = r.print;
    box.setAttribute('aria-label', L(items[i].title));
  }

  /* ---------------- the lens: the original painting under the print ---------------- */
  function makeLens(host, lensEl, source) {
    const cv = $('canvas', lensEl), ctx = cv.getContext('2d'), ZOOM = 2.2;
    let LS = 0, seq = 0;
    const hide = () => lensEl.classList.remove('on');
    async function at(cx, cy) {
      const s = source(); if (!s || !s.canvas) return hide();
      const pc = s.canvas, cr = contentRect(pc, pc.width, pc.height);
      const u = (cx - cr.left) / cr.width, v = (cy - cr.top) / cr.height;
      if (u < 0 || u > 1 || v < 0 || v > 1) return hide();
      if (!LS) { LS = lensEl.offsetWidth || 160; cv.width = cv.height = LS * 2; }
      const b = host.getBoundingClientRect();
      lensEl.style.transform = `translate(${cx - b.left - LS / 2}px,${cy - b.top - LS / 2}px)`;
      lensEl.classList.add('on');
      const x = u * pc.width, y = v * pc.height, R = region(s.print, pc.width, pc.height);
      const inside = x > R.x && x < R.x + R.w && y > R.y && y < R.y + R.h;
      lensEl.classList.toggle('art', inside);
      const size = pc.width * (LS / cr.width) / ZOOM, n = ++seq;
      const img = inside ? await load(artURL(ARTS[st[cur].art])) : null;
      if (n !== seq) return;
      ctx.fillStyle = '#FBF7EF'; ctx.fillRect(0, 0, LS * 2, LS * 2);
      if (inside) {
        const k = Math.min(R.w / img.naturalWidth, R.h / img.naturalHeight), as = size / k;   // the painting is fitted, not cropped
        const ox = (R.w - img.naturalWidth * k) / 2, oy = (R.h - img.naturalHeight * k) / 2;
        ctx.drawImage(img, (x - R.x - ox) / k - as / 2, (y - R.y - oy) / k - as / 2, as, as, 0, 0, LS * 2, LS * 2);
      } else ctx.drawImage(pc, x - size / 2, y - size / 2, size, size, 0, 0, LS * 2, LS * 2);
    }
    if (MG.finePointer) {
      host.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') at(e.clientX, e.clientY); });
      host.addEventListener('pointerleave', hide);
    } else host.addEventListener('click', e => at(e.clientX, e.clientY));   // touch: tap for the lens
    document.addEventListener('pointerdown', e => { if (!host.contains(e.target)) hide(); });
  }
  makeLens($('#look'), $('#lens'), () => lookData);
  $('#look').addEventListener('click', () => { if (MG.finePointer) openBox(cur); });

  /* ---------------- auto-advance, until the visitor takes over ---------------- */
  let paused = false;
  function restartTimer() {
    clearTimeout(timer);
    const bar = $('#timerBar'); bar.classList.remove('run'); void bar.offsetWidth;
    if (MG.reduced || paused || engaged) return;
    bar.style.setProperty('--dur', AUTO + 'ms'); bar.classList.add('run');
    timer = setTimeout(() => { if (document.visibilityState === 'visible' && !$('#lb').open) show(cur + 1); else restartTimer(); }, AUTO);
  }
  new IntersectionObserver(es => es.forEach(e => {
    paused = !e.isIntersecting; line.classList.toggle('motion-paused', paused);
    paused ? clearTimeout(timer) : restartTimer();
  }), { threshold: .2 }).observe(hero);

  /* ---------------- controls ---------------- */
  $('#prevBtn').addEventListener('click', () => { engaged = true; show(cur - 1); });
  $('#nextBtn').addEventListener('click', () => { engaged = true; show(cur + 1); });
  $('#detailBtn').addEventListener('click', () => openBox(cur));
  card.addEventListener('click', () => openBox(cur));
  line.addEventListener('keydown', e => {
    const fwd = rtl() ? 'ArrowLeft' : 'ArrowRight', back = rtl() ? 'ArrowRight' : 'ArrowLeft';
    if (e.key !== fwd && e.key !== back) return;
    e.preventDefault(); engaged = true; show(cur + (e.key === fwd ? 1 : -1)); $('.hang.on', line).focus({ preventScroll: true });
  });

  /* ---------------- lightbox: the painting and the piece worn ---------------- */
  const lb = $('#lb');
  async function openBox(i) {
    const it = items[i], s = st[i], a = ARTS[s.art];
    $('#lbArt').src = artURL(a); $('#lbArt').alt = L(a.title);
    const r = await render(i, 'stand');
    $('#lbPiece').src = toURL(r.canvas); $('#lbPiece').alt = L(it.title);
    $('#lbTag').textContent = t('page.onGarment');
    $('#lbKick').textContent = `${L(C.page.types[it.type])} · ${MG.pad(i + 1)} / ${MG.pad(N)}`;
    $('#lbName').textContent = L(it.title);
    $('#lbStory').textContent = L(it.story);
    $('#lbSpecs').innerHTML = [
      [t('page.artwork'), L(a.title)], [t('page.color'), L(COLORS[s.color].name)],
      [t('page.youGet'), L((MG.site.sales || {}).formats)], [t('page.delivery'), t('page.deliveryText')],
      [t('page.price'), it.price ? L(it.price) : t('page.priceOnRequest')]
    ].map(([k, val]) => `<dt>${esc(k)}</dt><dd>${esc(val)}</dd>`).join('');
    $('#lbNote').textContent = it.sample ? t('page.sampleNote') : '';
    $('#lbOrder').dataset.order = orderName(i);
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
          <img class="pc" alt="">
          <span class="card-hint">${esc(t('page.hover'))}</span>
        </span>
        <span class="card-body"><span>${MG.pad(i + 1)} · ${esc(L(C.page.types[it.type]))}</span><b>${esc(L(it.title))}</b></span>
      </button>`).join('');
    $$('#cards .card').forEach(b => b.addEventListener('click', () => openBox(+b.dataset.i)));
    new IntersectionObserver((es, ob) => { if (es.some(e => e.isIntersecting)) { items.forEach((_, i) => refreshCard(i)); ob.disconnect(); } },
      { rootMargin: '300px 0px' }).observe($('#cards'));
  }
  async function refreshCard(i) {
    const b = $(`#cards .card[data-i="${i}"]`); if (!b) return;
    $('.art', b).src = artURL(ARTS[st[i].art]);
    const r = await render(i, 'stand');
    $('.pc', b).src = toURL(shrink(r.canvas, 560));
  }

  /* ---------------- boot ---------------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.rv, .stroke').forEach(el => io.observe(el));
  MG.onLang(() => {
    $$('.hang', line).forEach((b, i) => b.setAttribute('aria-label', L(items[i].title)));
    renderCards();
    if (cur >= 0) { fillInfo(); $('#ghost').textContent = L(items[cur].title); }
  });

  buildLine(); renderCards();
  show(0);
});
