/* Mass & Grass — hoodies & sweatshirts page.
   Pieces are clipped with wooden pegs on a jute line (see the hanging-display
   skill): the chosen one is large and lit, the rest shrink and dim by
   distance, all sway gently. Every colour is its own photo of the same
   mockup; the chosen painting is printed on the chest in the browser. The
   model photos of the piece (standing, seated, close on the print) sit in a
   photo card beside the details. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const W = window.Watercolor;
  const C = MG.page, items = C.items, N = items.length, COLORS = C.colors, PROD = C.products;
  const rtl = () => document.documentElement.dir === 'rtl';
  const AUTO = 6000;
  const VIEWS = ['stand', 'sit', 'zoom'];
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
  const st = items.map(it => ({ color: it.color, art: artIndex(it.painting), size: it.sizes[Math.min(1, it.sizes.length - 1)], view: 'stand' }));
  const srcOf = (i, kind) => {
    const c = st[i].color;
    if (kind === 'piece') { const p = PROD[items[i].type]; return { image: p.colors[c], print: p.print }; }
    const l = items[i].looks[kind === 'zoom' ? 'stand' : kind];
    return { image: l.colors[c], print: l.print };
  };
  const cache = new Map();
  const remember = (k, v) => { cache.set(k, v); if (cache.size > 48) cache.delete(cache.keys().next().value); return v; };
  function render(i, kind) {
    const s = srcOf(i, kind), a = ARTS[st[i].art], key = `${s.image}|${kind}|${a.id}`;
    if (cache.has(key)) return cache.get(key);
    return remember(key, (async () => {
      const [ph, art] = await Promise.all([load(s.image), load(artURL(a))]);
      if (kind !== 'zoom') return { canvas: printOn(ph, s.print, art), print: s.print };
      // close on the print: crop the standing photo around the chest, print the painting at that resolution
      const w = ph.naturalWidth, h = ph.naturalHeight, R = region(s.print, w, h);
      const cw = Math.min(w, R.w * 2), ch = Math.min(h, cw * 1.25);
      const cx = Math.max(0, Math.min(w - cw, R.x + R.w / 2 - cw / 2)), cy = Math.max(0, Math.min(h - ch, R.y + R.h / 2 - ch * .46));
      const sc = Math.min(2.6, 1100 / cw), crop = canvas(cw * sc, ch * sc);
      crop.getContext('2d').drawImage(ph, cx, cy, cw, ch, 0, 0, crop.width, crop.height);
      const pr = { x: (R.x - cx) / cw, y: (R.y - cy) / ch, w: R.w / cw, h: R.h / ch };
      return { canvas: printOn(crop, pr, art), print: pr };
    })());
  }
  const toURL = c => c.toDataURL('image/webp', .9);
  const shrink = (c, w) => { const s = canvas(w, w * c.height / c.width); s.getContext('2d').drawImage(c, 0, 0, s.width, s.height); return s; };

  let cur = -1, timer = null, engaged = false, printing = 0;
  const hero = $('#wr'), line = $('#line');

  /* ---------------- the line: pieces clipped with pegs ---------------- */
  function buildLine() {
    line.innerHTML = items.map((it, i) =>
      `<button class="hang" type="button" role="tab" data-i="${i}" aria-selected="false" aria-label="${esc(L(it.title))}"` +
      ` style="--sw:${(4.9 + (i % 4) * .55).toFixed(2)}s;--swd:-${(i * .73).toFixed(2)}s">` +
      `<img class="peg" src="${C.page.peg}" alt="" draggable="false"><span class="pc"><img alt="" draggable="false"><img alt="" draggable="false"></span></button>`).join('');
    line.addEventListener('click', e => {
      const b = e.target.closest('.hang'); if (!b) return;
      engaged = true; +b.dataset.i === cur ? openBox(cur) : show(+b.dataset.i);
    });
    items.forEach((_, i) => refreshHang(i));
  }
  // two stacked images, so a colour or painting change crossfades
  async function refreshHang(i) {
    const r = await render(i, 'piece'), url = toURL(r.canvas);
    const b = $(`.hang[data-i="${i}"]`, line), [a, z] = $$('.pc img', b);
    const back = a.classList.contains('on') ? z : a;
    back.src = url; await back.decode().catch(() => {});
    back.classList.add('on'); (back === a ? z : a).classList.remove('on');
  }
  function markLine() {
    $$('.hang', line).forEach((b, k) => {
      let o = k - cur; if (o > N / 2) o -= N; if (o < -N / 2) o += N;
      const a = Math.abs(o);
      b.classList.toggle('on', a === 0); b.classList.toggle('n1', a === 1); b.classList.toggle('n2', a === 2);
      b.setAttribute('aria-selected', String(a === 0));
    });
  }

  /* ---------------- showing a piece ---------------- */
  function show(i) {
    i = (i + N) % N;
    if (i === cur) return;
    cur = i;
    const it = items[i];
    hero.style.setProperty('--acc', it.accent);
    markLine();
    const g = $('#ghost'); g.classList.add('sw');
    setTimeout(() => { g.textContent = L(it.title); g.classList.remove('sw'); }, 230);
    $('#count').innerHTML = `<b>${MG.pad(i + 1)}</b> / ${MG.pad(N)}`;
    fillInfo(); drawLook(); drawCard();
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
      engaged = true; st[cur].color = b.dataset.c; refresh();
    }));
    $('#artName').textContent = L(a.title);
    $('#arts').innerHTML = ARTS.map((x, ai) =>
      `<button class="art-b" type="button" role="radio" data-a="${ai}" aria-checked="${ai === s.art}" aria-label="${esc(L(x.title))}"><img alt="" src="${artURL(x)}"></button>`).join('');
    $$('#arts .art-b').forEach(b => b.addEventListener('click', () => {
      const ai = +b.dataset.a; if (ai === st[cur].art) return;
      engaged = true; st[cur].art = ai; refresh(true);
    }));
    $('#sizes').innerHTML = it.sizes.map(z => `<button class="sz" type="button" role="radio" data-s="${z}" aria-checked="${z === s.size}">${z}</button>`).join('');
    $$('#sizes .sz').forEach(b => b.addEventListener('click', () => { engaged = true; st[cur].size = b.dataset.s; fillInfo(); }));
    $('#orderBtn').href = MG.order(`${L(it.title)} · ${L(a.title)} · ${L(COLORS[s.color].name)} · ${s.size}`);
    $('#printCard').setAttribute('aria-label', L(a.title));
  }
  // the colour or the painting of the chosen piece changed
  async function refresh(newArt) {
    clearTimeout(timer); $('#timerBar').classList.remove('run');
    fillInfo();
    if (newArt) await printSequence(cur); else drawCard();
    refreshHang(cur); drawLook(); refreshCard(cur);
  }

  /* ---------------- the painting on paper, and its flight onto the piece ---------------- */
  const card = $('#printCard'), cardCanvas = $('#printCanvas');
  function drawCover(ctx, img, w, h) {
    ctx.fillStyle = '#FBF7EF'; ctx.fillRect(0, 0, w, h);
    const f = coverFit(img.naturalWidth, img.naturalHeight, { w, h });
    ctx.drawImage(img, f.ox, f.oy, img.naturalWidth * f.sc, img.naturalHeight * f.sc);
  }
  async function drawCard() {
    const img = await load(artURL(ARTS[st[cur].art]));
    drawCover(cardCanvas.getContext('2d'), img, cardCanvas.width, cardCanvas.height);
  }
  async function paintIn(img, run) {
    const cv = cardCanvas, w = cv.width, h = cv.height, ctx = cv.getContext('2d');
    if (MG.reduced) { drawCover(ctx, img, w, h); return; }
    const mask = canvas(w, h), p = W.painter(mask.getContext('2d'), 7), r = W.rng(w + run);
    const spots = [[.5, .5, .42], [.3, .3, .3], [.72, .32, .3], [.28, .72, .3], [.72, .74, .3], [.5, .15, .22], [.5, .88, .22], [.12, .5, .22], [.88, .5, .22]];
    spots.forEach(([x, y, rad], n) => p.add({ x: x * w, y: y * h, radius: rad * w, color: '#000000', layers: 16, alpha: .16, rand: r, spread: .45, blend: 'source-over', edges: false }, n * 60));
    const art = canvas(w, h), f = coverFit(img.naturalWidth, img.naturalHeight, { w, h });
    art.getContext('2d').drawImage(img, f.ox, f.oy, img.naturalWidth * f.sc, img.naturalHeight * f.sc);
    const t0 = performance.now(), tmp = canvas(w, h), tc = tmp.getContext('2d');
    await new Promise(res => {
      const tick = () => {
        if (run !== printing) return res();
        ctx.fillStyle = '#FBF7EF'; ctx.fillRect(0, 0, w, h);
        tc.globalCompositeOperation = 'copy'; tc.drawImage(art, 0, 0);
        tc.globalCompositeOperation = 'destination-in'; tc.drawImage(mask, 0, 0);
        ctx.drawImage(tmp, 0, 0);
        if (p.busy && performance.now() - t0 < 1800) requestAnimationFrame(tick); else { drawCover(ctx, img, w, h); res(); }
      };
      requestAnimationFrame(tick);
    });
  }
  function contentRect(el, cw, ch) {                       // the drawn picture inside a contained image
    const b = el.getBoundingClientRect(), k = Math.min(b.width / cw, b.height / ch);
    const w = cw * k, h = ch * k;
    return { left: b.left + (b.width - w) / 2, top: b.top + (b.height - h) / 2, width: w, height: h };
  }
  async function printSequence(i) {
    const run = ++printing;
    const img = await load(artURL(ARTS[st[i].art]));
    card.classList.add('painting');
    await paintIn(img, run);
    const target = $('.hang.on .pc img.on', line);
    if (run !== printing || cur !== i || MG.reduced || !target) { card.classList.remove('painting'); return; }
    const pr = PROD[items[i].type].print, cr = contentRect(target, target.naturalWidth, target.naturalHeight);
    const from = cardCanvas.getBoundingClientRect();
    const to = { left: cr.left + pr.x * cr.width, top: cr.top + pr.y * cr.height, width: pr.w * cr.width, height: pr.h * cr.height };
    const fly = document.createElement('div'); fly.className = 'fly-sheet';
    const fc = canvas(cardCanvas.width, cardCanvas.height); fc.getContext('2d').drawImage(cardCanvas, 0, 0); fly.appendChild(fc);
    Object.assign(fly.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' });
    document.body.appendChild(fly); card.classList.add('lifted');
    const dx = to.left - from.left, dy = to.top - from.top, sx = to.width / from.width, sy = to.height / from.height;
    await fly.animate([
      { transform: 'translate(0,0) rotate(3deg) scale(1)' },
      { transform: `translate(${dx * .5}px,${dy * .5 - 80}px) rotate(-8deg) scale(${(1 + sx) / 2},${(1 + sy) / 2})`, offset: .55 },
      { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity: 1, offset: .85 },
      { transform: `translate(${dx}px,${dy - 20}px) scale(${sx},${sy}) perspective(500px) rotateX(-70deg)`, opacity: 0 }
    ], { duration: 1500, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' }).finished;
    fly.remove(); card.classList.remove('lifted', 'painting');
  }

  /* ---------------- the look: model photos of the chosen piece ---------------- */
  let lookSeq = 0;
  const lookData = { canvas: null, print: null };
  async function drawLook() {
    const i = cur, kind = st[i].view, n = ++lookSeq;
    const r = await render(i, kind);
    if (n !== lookSeq) return;
    const box = $('#look'), old = $$('.lk', box);
    const c = canvas(r.canvas.width, r.canvas.height); c.className = 'lk'; c.getContext('2d').drawImage(r.canvas, 0, 0);
    box.appendChild(c); requestAnimationFrame(() => c.classList.add('on'));
    old.forEach(o => { o.classList.remove('on'); setTimeout(() => o.remove(), 500); });
    lookData.canvas = c; lookData.print = r.print;
    $$('#thumbs .th').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === kind)));
    for (const b of $$('#thumbs .th')) {                     // thumbnails follow the colour and painting
      const tr = await render(i, b.dataset.v); if (i !== cur) return;
      $('img', b).src = toURL(shrink(tr.canvas, 150));
    }
  }
  function buildThumbs() {
    $('#thumbs').innerHTML = VIEWS.map(v => `<button class="th" type="button" role="tab" data-v="${v}" aria-selected="false"><img alt=""><span></span></button>`).join('');
    $$('#thumbs .th').forEach(b => b.addEventListener('click', () => { engaged = true; st[cur].view = b.dataset.v; drawLook(); }));
    labelThumbs();
  }
  const labelThumbs = () => $$('#thumbs .th').forEach(b => { $('span', b).textContent = t(`page.views.${b.dataset.v}`); });

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
    e.preventDefault(); engaged = true; show(cur + (e.key === fwd ? 1 : -1)); $('.hang.on', line).focus();
  });

  /* ---------------- lightbox: the painting and the piece worn ---------------- */
  const lb = $('#lb');
  let lbI = 0;
  async function lbShow(kind) {
    const r = await render(lbI, kind);
    $('#lbPiece').src = toURL(r.canvas);
    $('#lbTag').textContent = t(`page.views.${kind}`);
    $$('#lbThumbs .th').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === kind)));
  }
  async function openBox(i) {
    lbI = i;
    const it = items[i], s = st[i], a = ARTS[s.art];
    $('#lbArt').src = artURL(a); $('#lbArt').alt = L(a.title);
    $('#lbPiece').alt = L(it.title);
    $('#lbThumbs').innerHTML = [...VIEWS, 'piece'].map(v => `<button class="th" type="button" data-v="${v}" aria-label="${esc(t(`page.views.${v}`))}"><img alt=""></button>`).join('');
    $$('#lbThumbs .th').forEach(b => {
      b.addEventListener('click', () => lbShow(b.dataset.v));
      render(i, b.dataset.v).then(r => { $('img', b).src = toURL(shrink(r.canvas, 110)); });
    });
    await lbShow(i === cur ? st[i].view : 'stand');
    $('#lbKick').textContent = `${L(C.page.types[it.type])} · ${MG.pad(i + 1)} / ${MG.pad(N)}`;
    $('#lbName').textContent = L(it.title);
    $('#lbStory').textContent = L(it.story);
    $('#lbSpecs').innerHTML = [
      [t('page.artwork'), L(a.title)], [t('page.fabric'), L(it.fabric)], [t('page.color'), L(COLORS[s.color].name)],
      [t('page.size'), it.sizes.join(' · ')], [t('page.price'), it.price ? L(it.price) : t('page.priceOnRequest')]
    ].map(([k, val]) => `<dt>${esc(k)}</dt><dd>${esc(val)}</dd>`).join('');
    $('#lbNote').textContent = it.sample ? t('page.sampleNote') : '';
    $('#lbOrder').href = MG.order(`${L(it.title)} · ${L(a.title)} · ${L(COLORS[s.color].name)} · ${s.size}`);
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
    renderCards(); labelThumbs();
    if (cur >= 0) { fillInfo(); $('#ghost').textContent = L(items[cur].title); }
  });

  buildLine(); buildThumbs(); renderCards();
  show(0);
});
