/* Mass & Grass — hoodies & sweatshirts page.
   Each piece is a real product photo (transparent cut-out). The painting is
   printed onto it in the browser: cropped to the chest area, clipped to the
   garment, and shaded with the photo's own folds so it reads as ink on
   fabric. The chosen piece is taken off the rail and hung in the middle;
   the rail keeps an empty spot where it was. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const W = window.Watercolor;
  const C = MG.page, items = C.items, N = items.length;
  const rtl = () => document.documentElement.dir === 'rtl';
  const AUTO = 6500;

  /* ---------------- images ---------------- */
  const load = src => new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
  const artURL = it => it.art.image || W.sample({ id: it.id, ...it.art }, 700, { transparent: true });

  // Print the painting onto the garment photo.
  async function compose(it, v) {
    const [ph, art] = await Promise.all([load(v.image), load(artURL(it))]);
    const w = ph.naturalWidth, h = ph.naturalHeight;
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const o = out.getContext('2d');
    o.drawImage(ph, 0, 0);
    const r = { x: Math.round(v.print.x * w), y: Math.round(v.print.y * h), w: Math.round(v.print.w * w), h: Math.round(v.print.h * h) };

    // shading map from the photo: folds darken the ink, flat fabric leaves it as is
    const px = o.getImageData(r.x, r.y, r.w, r.h), d = px.data;
    let sum = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { sum += .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]; n++; }
    const mean = sum / Math.max(1, n), dark = mean < 95;
    for (let i = 0; i < d.length; i += 4) {
      const l = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2];
      const s = Math.min(255, Math.round(255 * Math.pow(l / mean, dark ? .6 : .9)));
      d[i] = d[i + 1] = d[i + 2] = s;
    }
    const shade = document.createElement('canvas'); shade.width = r.w; shade.height = r.h;
    shade.getContext('2d').putImageData(px, 0, 0);

    const ink = document.createElement('canvas'); ink.width = r.w; ink.height = r.h;
    const k = ink.getContext('2d');
    const aw = art.naturalWidth, ah = art.naturalHeight, sc = Math.max(r.w / aw, r.h / ah);
    k.drawImage(art, (r.w - aw * sc) / 2, (r.h - ah * sc) / 2, aw * sc, ah * sc);
    // watercolour prints have soft, bled edges rather than a hard rectangle
    const mask = document.createElement('canvas'); mask.width = r.w; mask.height = r.h;
    const mk = mask.getContext('2d'), f = Math.min(r.w, r.h) * .09;
    mk.filter = `blur(${f.toFixed(1)}px)`; mk.fillStyle = '#000';
    mk.beginPath(); mk.roundRect(f * 1.2, f * 1.2, r.w - f * 2.4, r.h - f * 2.4, f); mk.fill();
    k.globalCompositeOperation = 'destination-in'; k.drawImage(mask, 0, 0);
    k.globalCompositeOperation = 'multiply'; k.drawImage(shade, 0, 0);          // fabric folds on the ink
    k.globalCompositeOperation = 'destination-in'; k.drawImage(ph, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h); // stay on the garment

    o.save();
    o.globalCompositeOperation = dark ? 'source-over' : 'multiply';
    o.globalAlpha = dark ? .9 : .95;
    o.drawImage(ink, r.x, r.y);
    o.restore();
    return out;
  }

  /* ---------------- state ---------------- */
  const st = items.map(it => ({ v: 0, size: it.sizes[Math.min(1, it.sizes.length - 1)], canvas: [], url: [] }));
  async function composed(i, vi) {
    const s = st[i];
    if (!s.canvas[vi]) {
      s.canvas[vi] = await compose(items[i], items[i].variants[vi]);
      s.url[vi] = s.canvas[vi].toDataURL('image/webp', .9);
    }
    return s.canvas[vi];
  }
  let cur = -1, busy = false, timer = null;
  const stage = $('#stage'), wrap = $('#pieceWrap');

  /* ---------------- the rack ----------------
     Pieces hang on a real rod. Dragging moves the whole group along the rod;
     each piece follows on its own spring (so they bunch and trail like real
     clothes) and swings on its hook from its own motion. */
  const rack = $('#rack'), hangersEl = $('#hangers');
  $('#rod').style.borderImageSource = `url("${C.page.rail}")`;
  const rackSrc = i => st[i].url[st[i].v] || items[i].variants[st[i].v].image;
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
  async function show(i, auto) {
    i = (i + N) % N;
    if (i === cur || busy) return;
    busy = true;
    let d = cur < 0 ? 1 : i - cur;                 // shortest way round the rail
    if (d > N / 2) d -= N; else if (d < -N / 2) d += N;
    const dir = d >= 0 ? 1 : -1;
    const it = items[i], s = st[i];
    const canvas = await composed(i, s.v);
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
    const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
    c.getContext('2d').drawImage(canvas, 0, 0);
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
    restartTimer(auto);
    // warm the next piece so the swap is instant
    composed((i + 1) % N, st[(i + 1) % N].v).then(() => {}, () => {});
  }

  function fillInfo() {
    const it = items[cur], s = st[cur], v = it.variants[s.v];
    $('#count').innerHTML = `<b>${MG.pad(cur + 1)}</b> / ${MG.pad(N)}`;
    $('#kick').textContent = `${L(C.page.types[it.type])} · ${MG.pad(cur + 1)}`;
    $('#name').textContent = L(it.title);
    $('#story').textContent = L(it.story);
    $('#colorName').textContent = L(C.colors[v.color].name);
    $('#swatches').innerHTML = it.variants.map((x, vi) =>
      `<button class="sw" type="button" role="radio" data-v="${vi}" aria-checked="${vi === s.v}" aria-label="${esc(L(C.colors[x.color].name))}" style="--c:${C.colors[x.color].hex}"></button>`).join('');
    $$('#swatches .sw').forEach(b => b.addEventListener('click', async () => {
      const vi = +b.dataset.v; if (vi === s.v) return;
      s.v = vi; const c0 = cur; cur = -1; await show(c0); refreshRackImages(); renderCards();
    }));
    $('#sizes').innerHTML = it.sizes.map(z => `<button class="sz" type="button" role="radio" data-s="${z}" aria-checked="${z === s.size}">${z}</button>`).join('');
    $$('#sizes .sz').forEach(b => b.addEventListener('click', () => { s.size = b.dataset.s; fillInfo(); }));
    $('#orderBtn').href = MG.order(`${L(it.title)} · ${L(C.colors[v.color].name)} · ${s.size}`);
    $('#printImg').src = artURL(it);
    $('#printImg').alt = L(it.title);
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
    p.add({ x: w * .42, y: h * .66, radius: m * .2, color: it.art.palette[1], layers: 20, alpha: .03, rand: r, blend: 'source-over' }, 120);
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
    timer = setTimeout(() => { if (document.visibilityState === 'visible' && !$('#lb').open) show(cur + 1, true); else restartTimer(); }, AUTO);
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
  // swipe the piece itself
  let sx = null;
  wrap.addEventListener('pointerdown', e => { sx = e.clientX; });
  wrap.addEventListener('pointerup', e => {
    if (sx == null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) < 50) { openBox(cur); return; }
    show(cur + ((dx < 0) === rtl() ? -1 : 1));
  });
  // gentle 3D tilt toward the pointer
  if (MG.finePointer && !MG.reduced) {
    wrap.addEventListener('pointermove', e => {
      const b = wrap.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
      const c = $('.piece:not(.out) canvas', wrap); if (c) c.style.transform = `rotateY(${(x * 10).toFixed(2)}deg) rotateX(${(-y * 6).toFixed(2)}deg)`;
    });
    wrap.addEventListener('pointerleave', () => { const c = $('.piece:not(.out) canvas', wrap); if (c) c.style.transform = ''; });
  }
  $('#detailBtn').addEventListener('click', () => openBox(cur));
  $('#printCard').addEventListener('click', () => openBox(cur));

  /* ---------------- lightbox ---------------- */
  const lb = $('#lb');
  let lbI = 0;
  async function openBox(i) {
    lbI = i;
    const it = items[i], s = st[i], v = it.variants[s.v];
    await composed(i, s.v);
    $('#lbArt').src = artURL(it); $('#lbArt').alt = L(it.title);
    $('#lbPiece').src = s.url[s.v]; $('#lbPiece').alt = L(it.title);
    $('#lbKick').textContent = `${L(C.page.types[it.type])} · ${MG.pad(i + 1)} / ${MG.pad(N)}`;
    $('#lbName').textContent = L(it.title);
    $('#lbStory').textContent = L(it.story);
    $('#lbSpecs').innerHTML = [
      [t('page.fabric'), L(it.fabric)], [t('page.color'), L(C.colors[v.color].name)],
      [t('page.size'), it.sizes.join(' · ')], [t('page.price'), it.price ? L(it.price) : t('page.priceOnRequest')]
    ].map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('');
    $('#lbNote').textContent = it.sample ? t('page.sampleNote') : '';
    $('#lbOrder').href = MG.order(`${L(it.title)} · ${L(C.colors[v.color].name)} · ${s.size}`);
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
          <img class="art" src="${artURL(it)}" alt="${esc(L(it.title))}" loading="lazy">
          <img class="pc" src="${st[i].url[st[i].v] || ''}" alt="" loading="lazy">
          <span class="card-hint">${esc(t('page.hover'))}</span>
        </span>
        <span class="card-body"><span>${MG.pad(i + 1)} · ${esc(L(C.page.types[it.type]))}</span><b>${esc(L(it.title))}</b></span>
      </button>`).join('');
    $$('#cards .card').forEach(b => b.addEventListener('click', () => openBox(+b.dataset.i)));
  }

  /* ---------------- boot ---------------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.rv, .stroke').forEach(el => io.observe(el));
  MG.onLang(() => { H.forEach((h, i) => h.el.setAttribute('aria-label', L(items[i].title))); layoutRack(false); renderCards(); if (cur >= 0) { fillInfo(); $('#ghost').textContent = L(C.page.types[items[cur].type]); } });

  buildRack(); renderCards();
  window.addEventListener('resize', () => layoutRack(false));
  show(0).then(async () => {
    for (let i = 0; i < N; i++) await composed(i, st[i].v);   // print every piece, then refresh the rail and cards
    refreshRackImages(); renderCards();
  });
});
