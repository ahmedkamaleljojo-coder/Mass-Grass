/* Mass & Grass — paintings page.
   Paintings hang from wooden pegs on a sagging rope. The line is dragged,
   swiped or stepped with arrows; each painting is a damped pendulum that
   swings with the rope's motion, and the rope sags deeper as it moves. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const W = window.Watercolor;
  const items = MG.page.items;
  const N = items.length;

  /* ---------------- artwork (real image, or a generated sample) ---------------- */
  const artCache = new Map();
  function paintSample(it, longEdge) {
    const [rw, rh] = it.ratio || [4, 5];
    const k = longEdge / Math.max(rw, rh);
    const w = Math.round(rw * k), h = Math.round(rh * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.fillStyle = '#F7F0E4'; x.fillRect(0, 0, w, h);
    const [p0, p1, p2, p3, p4] = it.palette;
    const seed = [...it.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
    const r = W.rng(seed), m = Math.max(w, h);
    const b = (px, py, rad, col, al, layers, sides) => W.paintNow(x, {
      x: px * w, y: py * h, radius: rad * m, color: col, alpha: al, layers: layers || 22, rand: r, sides: sides || 8, spread: .16
    });
    if (it.motif === 'sea') {
      b(.5, .12, .5, p0, .02); b(.3, .4, .22, p1, .03); b(.72, .36, .08, p4, .06);
      for (let i = 0; i < 6; i++) b(.08 + i * .17, .64 + (i % 2) * .03, .16, p2, .03, 18);
      for (let i = 0; i < 5; i++) b(.15 + i * .18, .84, .17, p3, .035, 18);
    } else if (it.motif === 'flowers') {
      b(.5, .5, .55, p0, .018);
      x.strokeStyle = p3; x.globalAlpha = .55; x.lineWidth = m * .006; x.lineCap = 'round';
      for (let i = 0; i < 7; i++) { const sx = .25 + i * .08; x.beginPath(); x.moveTo(sx * w, h * .95); x.quadraticCurveTo(sx * w + (r() - .5) * m * .2, h * .6, (sx + (r() - .5) * .2) * w, h * (.28 + r() * .25)); x.stroke(); }
      x.globalAlpha = 1;
      for (let i = 0; i < 9; i++) b(.22 + r() * .56, .2 + r() * .4, .06 + r() * .05, i % 3 ? p1 : p2, .06, 18, 6);
      for (let i = 0; i < 5; i++) b(.2 + r() * .6, .55 + r() * .3, .04, p3, .07, 14, 5);
      b(.5, .9, .2, p4, .02);
    } else if (it.motif === 'window') {
      b(.5, .5, .6, p0, .022);
      x.strokeStyle = p4; x.globalAlpha = .6; x.lineWidth = m * .012;
      const wx = .2 * w, wy = .14 * h, ww = .6 * w, wh = .56 * h;
      x.strokeRect(wx, wy, ww, wh); x.beginPath(); x.moveTo(wx + ww / 2, wy); x.lineTo(wx + ww / 2, wy + wh); x.moveTo(wx, wy + wh * .45); x.lineTo(wx + ww, wy + wh * .45); x.stroke();
      x.globalAlpha = 1;
      b(.5, .36, .2, '#C7D0CF', .03);
      b(.5, .8, .1, p1, .06, 20, 6);
      for (let i = 0; i < 6; i++) b(.38 + r() * .24, .62 + r() * .1, .05, p2, .07, 16, 6);
      for (let i = 0; i < 4; i++) b(.34 + r() * .32, .58 + r() * .08, .025, p3, .09, 14, 5);
    } else {
      b(.5, .14, .55, p0, .02); b(.7, .26, .08, p1, .07);
      b(.18, .7, .34, p2, .035); b(.76, .74, .36, p2, .03); b(.5, .9, .4, p3, .03);
      for (let i = 0; i < 6; i++) b(.12 + i * .15, .58 + r() * .06, .045, p3, .08, 16, 6);
      b(.4, .62, .05, p4, .06, 16, 6);
    }
    return c.toDataURL('image/jpeg', .9);
  }
  function artFor(it, size) {
    if (it.image) return it.image;
    const key = it.id + ':' + size;
    if (!artCache.has(key)) artCache.set(key, paintSample(it, size));
    return artCache.get(key);
  }
  const seriesName = id => L((MG.page.series.find(s => s.id === id) || {}).title) || '';

  /* ---------------- build the line ---------------- */
  const stage = $('#stage'), hangs = $('#hangs'), rope = $('#rope');
  const ropePaths = $$('path', rope);
  hangs.innerHTML = items.map((it, i) => {
    const [rw, rh] = it.ratio || [4, 5];
    const pegs = rw > rh ? '<svg class="peg p1"><use href="#peg"/></svg><svg class="peg p2"><use href="#peg"/></svg>' : '<svg class="peg p0"><use href="#peg"/></svg>';
    return `<div class="hang" data-i="${i}"><div class="swing"><div class="idle" style="--it:${(5.2 + (i % 4) * .8).toFixed(1)}s;--id:${(-i * 1.3).toFixed(1)}s">
      ${pegs}<div class="paper"><img src="${artFor(it, 900)}" alt="" draggable="false"></div></div></div></div>`;
  }).join('');
  const H = $$('.hang', hangs).map((el, i) => ({
    el, swing: $('.swing', el), paper: $('.paper', el), img: $('img', el),
    wide: (items[i].ratio || [4, 5])[0] > (items[i].ratio || [4, 5])[1],
    theta: 0, omega: 0, w: 0, c: 0, x: 0
  }));

  let SW = 0, SH = 0, ropeTop = 0, baseSag = 0, gap = 0;
  function layout() {
    SW = stage.clientWidth; SH = stage.clientHeight;
    ropeTop = SH * .1; baseSag = SH * .07;
    const h = Math.min(SH * .6, 520);
    gap = Math.max(36, SW * .05);
    let acc = 0;
    H.forEach((o, i) => {
      const [rw, rh] = items[i].ratio || [4, 5];
      o.w = Math.round(h * rw / rh * (o.wide ? .9 : 1)) + 24;
      o.el.style.width = o.w + 'px';
      o.c = acc + o.w / 2; acc += o.w + gap;
    });
    rope.setAttribute('viewBox', `0 0 ${SW} ${SH}`);
  }
  const rtl = () => document.documentElement.dir === 'rtl';
  function centerAt(p) {
    if (p <= 0) return H[0].c + p * (H[1] ? H[1].c - H[0].c : 300);
    if (p >= N - 1) return H[N - 1].c + (p - N + 1) * (N > 1 ? H[N - 1].c - H[N - 2].c : 300);
    const i = Math.floor(p), f = p - i;
    return H[i].c + (H[i + 1].c - H[i].c) * f;
  }

  /* ---------------- physics ---------------- */
  let pos = MG.reduced ? 0 : -1.4, vel = 0, target = 0;
  let sag = 0, sagV = 0, lastShift = null;
  let dragging = false, running = false, active = -1;

  const ropeY = (x, s) => ropeTop + s * (1 - Math.pow((x - SW / 2) / (SW / 2), 2));
  const ropeSlope = (x, s) => -2 * s * (x - SW / 2) / Math.pow(SW / 2, 2);

  function frame() {
    if (!dragging) {
      vel += (target - pos) * .05;
      vel *= .8;
      pos += vel;
    }
    const shift = SW / 2 - centerAt(pos);                    // where the line sits on screen
    const screenVel = lastShift == null ? 0 : (shift - lastShift) * (rtl() ? -1 : 1);
    lastShift = shift;
    const sagTarget = baseSag + Math.min(Math.abs(screenVel) * 1.6, SH * .09);
    sagV += (sagTarget - sag) * .1; sagV *= .74; sag += sagV;

    let settled = !dragging && Math.abs(target - pos) < .0008 && Math.abs(vel) < .0004 && Math.abs(sagV) < .02;
    H.forEach((o, i) => {
      let x = o.c + shift;
      if (rtl()) x = SW - x;
      const y = ropeY(x, sag);
      const slopeDeg = Math.atan(ropeSlope(x, sag)) * 57.3;
      const eq = Math.max(-16, Math.min(16, screenVel * .9)) + slopeDeg * (o.wide ? .9 : .5);
      o.omega += (eq - o.theta) * (o.wide ? .09 : .055) - o.omega * .085;
      o.theta += o.omega;
      if (Math.abs(o.omega) > .003 || Math.abs(eq - o.theta) > .04) settled = false;
      const d = Math.abs(i - pos);
      const s = 1 - Math.min(d, 1.6) * .15;
      o.el.style.transform = `translate3d(${(x - o.w / 2).toFixed(1)}px,${(y - 14).toFixed(1)}px,0)`;
      o.swing.style.transform = `rotate(${(o.wide ? o.theta * .35 : o.theta).toFixed(2)}deg)`;
      o.paper.style.transform = `scale(${s.toFixed(3)})`;
      o.el.style.opacity = Math.max(.25, 1 - Math.min(d, 3) * .2).toFixed(2);
      o.el.style.zIndex = 100 - Math.round(d * 10);
    });
    drawRope();
    const a = Math.max(0, Math.min(N - 1, Math.round(pos)));
    if (a !== active) setActive(a);
    if (settled) { running = false; return; }
    requestAnimationFrame(frame);
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
  function drawRope() {
    const d = `M -20 ${ropeY(-20, sag).toFixed(1)} Q ${SW / 2} ${(ropeTop + sag * 2).toFixed(1)} ${SW + 20} ${ropeY(SW + 20, sag).toFixed(1)}`;
    ropePaths.forEach(p => p.setAttribute('d', d));
  }
  function go(i) { target = Math.max(0, Math.min(N - 1, i)); kick(); }

  /* ---------------- dragging, wheel, keys ---------------- */
  let startX = 0, startPos = 0, lastX = 0, lastT = 0, moved = 0, flick = 0;
  const avgGap = () => N > 1 ? (H[N - 1].c - H[0].c) / (N - 1) : 400;
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    dragging = true; moved = 0; flick = 0;
    startX = lastX = e.clientX; startPos = pos; lastT = performance.now();
    stage.setPointerCapture(e.pointerId); stage.classList.add('dragging');
    hideHint(); kick();
  });
  stage.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dir = rtl() ? -1 : 1;
    let p = startPos - dir * (e.clientX - startX) / avgGap();
    if (p < 0) p *= .35; else if (p > N - 1) p = N - 1 + (p - N + 1) * .35;
    const now = performance.now();
    flick = (p - pos) / Math.max(8, now - lastT) * 16;
    lastT = now; moved += Math.abs(e.clientX - lastX); lastX = e.clientX;
    pos = p;
  });
  const endDrag = e => {
    if (!dragging) return;
    dragging = false; stage.classList.remove('dragging');
    if (moved < 6) {                       // a click, not a drag
      const hit = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.classList && el.classList.contains('paper'));
      if (hit) {
        const i = +hit.closest('.hang').dataset.i;
        if (i === active) openBox(i); else go(i);
      }
      target = Math.round(target); kick(); return;
    }
    vel = flick;
    go(Math.round(pos + flick * 7));
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  let wheelAcc = 0, wheelT;
  stage.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    wheelAcc += e.deltaX * (rtl() ? -1 : 1);
    clearTimeout(wheelT); wheelT = setTimeout(() => { wheelAcc = 0; }, 180);
    if (Math.abs(wheelAcc) > 60) { go(target + Math.sign(wheelAcc)); wheelAcc = 0; hideHint(); }
  }, { passive: false });
  document.addEventListener('keydown', e => {
    if ($('#plb').open || /input|textarea|select/i.test(document.activeElement.tagName)) return;
    const fwd = rtl() ? 'ArrowLeft' : 'ArrowRight', back = rtl() ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd) { go(target + 1); hideHint(); }
    else if (e.key === back) { go(target - 1); hideHint(); }
    else if (e.key === 'Enter' && document.activeElement === stage) openBox(active);
  });
  $('#prevBtn').addEventListener('click', () => { go(target - 1); hideHint(); });
  $('#nextBtn').addEventListener('click', () => { go(target + 1); hideHint(); });
  function hideHint() { $('#dragHint').classList.add('gone'); }

  /* ---------------- active painting: info, ghost, colour bloom ---------------- */
  let bloomFlip = false, ghostT;
  function setActive(i) {
    active = i;
    const it = items[i];
    H.forEach((o, n) => o.el.classList.toggle('active', n === i));
    $('#count').innerHTML = `<b>${MG.pad(i + 1)}</b> / ${MG.pad(N)}`;
    $('#curTitle').textContent = L(it.title);
    $('#curMeta').textContent = [L(it.size), L(it.medium), MG.num(it.year)].filter(Boolean).join(' · ');
    $('#curTags').innerHTML = tags(it);
    $('#orderBtn').href = MG.order(L(it.title));
    $('#prevBtn').disabled = i === 0; $('#nextBtn').disabled = i === N - 1;
    $$('#pins .pin').forEach((p, n) => p.setAttribute('aria-selected', String(n === i)));
    stage.setAttribute('aria-label', `${L(it.title)} (${i + 1}/${N})`);
    const g = $('#ghost');
    g.classList.add('swap'); clearTimeout(ghostT);
    ghostT = setTimeout(() => { g.textContent = L(it.title); g.style.setProperty('--c', it.palette[2]); g.classList.remove('swap'); }, 220);
    paintBloom(it);
  }
  function tags(it) {
    const a = it.available || {};
    return (a.original ? `<span class="tag">${esc(t('page.original'))}</span>` : `<span class="tag off">${esc(t('page.sold'))}</span>`) +
      (a.print ? `<span class="tag">${esc(t('page.print'))}</span>` : '');
  }
  function paintBloom(it) {
    if (MG.reduced) return;
    bloomFlip = !bloomFlip;
    const on = $(bloomFlip ? '#bloomA' : '#bloomB'), off = $(bloomFlip ? '#bloomB' : '#bloomA');
    const { ctx, w, h } = W.fit(on);
    ctx.clearRect(0, 0, w, h);
    const p = W.painter(ctx, 6), r = W.rng(it.id.length * 97);
    p.add({ x: w * .5, y: h * .6, radius: Math.min(w, h) * .34, color: it.palette[1], layers: 26, alpha: .03, rand: r, spread: .3, blend: 'source-over' });
    p.add({ x: w * .36, y: h * .72, radius: Math.min(w, h) * .22, color: it.palette[2], layers: 22, alpha: .03, rand: r, blend: 'source-over' }, 100);
    p.add({ x: w * .66, y: h * .7, radius: Math.min(w, h) * .2, color: it.palette[3], layers: 22, alpha: .03, rand: r, blend: 'source-over' }, 200);
    on.classList.add('on'); off.classList.remove('on');
  }

  /* ---------------- thumbnails ---------------- */
  $('#pins').innerHTML = items.map((it, i) =>
    `<button class="pin" type="button" role="tab" data-i="${i}"><img src="${artFor(it, 140)}" alt=""></button>`).join('');
  $$('#pins .pin').forEach(b => b.addEventListener('click', () => { go(+b.dataset.i); hideHint(); }));
  $('#detailBtn').addEventListener('click', () => openBox(active));

  /* ---------------- all-paintings grid ---------------- */
  let filter = 'all';
  function renderGrid() {
    $('#filters').innerHTML = [{ id: 'all', title: MG.page.page.filterAll }, ...MG.page.series].map(s =>
      `<button type="button" data-f="${s.id}" aria-pressed="${s.id === filter}">${esc(L(s.title))}</button>`).join('');
    $$('#filters button').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; renderGrid(); }));
    $('#pgrid').innerHTML = items.map((it, i) => `
      <button class="pcard rv in" type="button" data-i="${i}" ${filter !== 'all' && it.series !== filter ? 'hidden' : ''} style="--r:${[-1.5, 1, -.5, 1.8, -1][i % 5]}deg">
        <div class="frame"><img src="${artFor(it, 600)}" alt="${esc(L(it.title))}" loading="lazy"></div>
        <b>${esc(L(it.title))}</b><span>${esc(seriesName(it.series))} · ${esc(L(it.size))}</span>
      </button>`).join('');
    $$('#pgrid .pcard').forEach(b => b.addEventListener('click', () => openBox(+b.dataset.i)));
  }

  /* ---------------- lightbox ---------------- */
  const box = $('#plb');
  let boxI = 0;
  function fillBox(i) {
    boxI = i; const it = items[i];
    $('#plbImg').src = artFor(it, 1400); $('#plbImg').alt = L(it.title);
    $('#plbNote').textContent = it.sample ? t('page.sampleNote') : '';
    $('#plbSeries').textContent = seriesName(it.series);
    $('#plbTitle').textContent = L(it.title);
    $('#plbStory').textContent = L(it.story);
    const a = it.available || {};
    const avail = [a.original ? t('page.original') : t('page.sold'), a.print ? t('page.print') : ''].filter(Boolean).join(' · ');
    $('#plbSpecs').innerHTML = [
      ['size', L(it.size)], ['medium', L(it.medium)], ['year', MG.num(it.year)], ['availability', avail],
      ['price', it.price ? L(it.price) : t('page.priceOnRequest')]
    ].map(([k, v]) => `<dt>${esc(t('page.specs.' + k))}</dt><dd>${esc(v)}</dd>`).join('');
    $('#plbOrder').href = MG.order(L(it.title));
    $('#plbPrev').disabled = i === 0; $('#plbNext').disabled = i === N - 1;
  }
  function openBox(i) { fillBox(i); if (!box.open) box.showModal(); }
  $('#plbClose').addEventListener('click', () => box.close());
  box.addEventListener('click', e => { if (e.target === box) box.close(); });
  $('#plbPrev').addEventListener('click', () => fillBox(Math.max(0, boxI - 1)));
  $('#plbNext').addEventListener('click', () => fillBox(Math.min(N - 1, boxI + 1)));
  box.addEventListener('keydown', e => {
    const fwd = rtl() ? 'ArrowLeft' : 'ArrowRight', back = rtl() ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd) fillBox(Math.min(N - 1, boxI + 1));
    if (e.key === back) fillBox(Math.max(0, boxI - 1));
  });
  $('#plbLine').addEventListener('click', () => {
    box.close(); go(boxI);
    stage.scrollIntoView({ behavior: MG.reduced ? 'auto' : 'smooth', block: 'center' });
  });

  /* ---------------- reveal + language ---------------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.rv, .stroke').forEach(el => io.observe(el));

  MG.onLang(() => {
    renderGrid();
    lastShift = null;
    if (active >= 0) { const a = active; active = -1; setActive(a); }
    if (box.open) fillBox(boxI);
    kick();
  });

  layout(); drawRope();
  let rz;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { layout(); lastShift = null; kick(); }, 120); });
  // Pause the idle sway while the line is off screen.
  new IntersectionObserver(es => es.forEach(e => stage.classList.toggle('paused', !e.isIntersecting))).observe(stage);
  sag = baseSag;
  kick();
});
