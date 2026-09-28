/* Mass & Grass — paintings page.
   Every painting is shown in a real oak frame with a white mat (photographed
   frames from Canva, the painting laid into the mat window here). The
   paintings sit in a row that is dragged left and right: the one passing the
   middle grows while the rest shrink and fade, and the row eases to a stop
   without bouncing (same motion as the hoodies line). */
MG.ready(async function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const W = window.Watercolor;
  const items = MG.page.items;
  const N = items.length;
  const rtl = () => document.documentElement.dir === 'rtl';

  /* ---------------- artwork (real image, or a generated sample) ---------------- */
  const artCache = new Map();
  function artFor(it, size) {
    if (it.image) return it.image;
    const key = it.id + ':' + size;
    if (!artCache.has(key)) artCache.set(key, W.sample(it, size));
    return artCache.get(key);
  }
  const seriesName = id => L((MG.page.series.find(s => s.id === id) || {}).title) || '';
  const load = src => new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = src; });

  /* ---------------- framing: the painting laid into the mat window ---------------- */
  const FRAMES = MG.page.frames;
  const frameOf = it => FRAMES[(it.ratio || [4, 5]).join(':')] || FRAMES['4:5'];
  const frameImg = new Map();
  await Promise.all(Object.values(FRAMES).map(f => load(f.src).then(im => frameImg.set(f.src, im)).catch(() => {})));
  const framedCache = new Map();
  async function framed(it) {
    if (framedCache.has(it.id)) return framedCache.get(it.id);
    const job = (async () => {
      const f = frameOf(it), fr = frameImg.get(f.src), art = await load(artFor(it, 1100));
      const cw = fr.naturalWidth, ch = fr.naturalHeight;
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const x = c.getContext('2d');
      x.drawImage(fr, 0, 0);
      const win = { x: f.window.x * cw, y: f.window.y * ch, w: f.window.w * cw, h: f.window.h * ch };
      // the sheet floats on the backing paper inside the window, with a small white border
      const pad = Math.min(win.w, win.h) * .075;
      const sc = Math.min((win.w - pad * 2) / art.naturalWidth, (win.h - pad * 2) / art.naturalHeight);
      const aw = art.naturalWidth * sc, ah = art.naturalHeight * sc;
      const ax = win.x + (win.w - aw) / 2, ay = win.y + (win.h - ah) / 2 - win.h * .012;
      x.save(); x.beginPath(); x.rect(win.x, win.y, win.w, win.h); x.clip();
      x.save(); x.shadowColor = 'rgba(60,40,20,.16)'; x.shadowBlur = cw * .006; x.shadowOffsetY = cw * .002;
      x.fillStyle = '#F7F1E6'; x.fillRect(ax, ay, aw, ah); x.restore();
      x.globalCompositeOperation = 'multiply'; x.drawImage(art, ax, ay, aw, ah);
      x.globalCompositeOperation = 'source-over';
      // the mat's bevel throws a soft shadow onto the paper, light comes from the upper left
      let g = x.createLinearGradient(0, win.y, 0, win.y + win.h * .03);
      g.addColorStop(0, 'rgba(70,50,30,.13)'); g.addColorStop(1, 'rgba(70,50,30,0)');
      x.fillStyle = g; x.fillRect(win.x, win.y, win.w, win.h * .03);
      g = x.createLinearGradient(win.x, 0, win.x + win.w * .025, 0);
      g.addColorStop(0, 'rgba(70,50,30,.08)'); g.addColorStop(1, 'rgba(70,50,30,0)');
      x.fillStyle = g; x.fillRect(win.x, win.y, win.w * .025, win.h);
      x.restore();
      // a faint reflection on the glass
      g = x.createLinearGradient(0, 0, cw, ch);
      g.addColorStop(0, 'rgba(255,255,255,.10)'); g.addColorStop(.35, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(win.x, win.y, win.w, win.h);
      const blob = await new Promise(res => c.toBlob(res, 'image/webp', .9));
      return URL.createObjectURL(blob);
    })();
    framedCache.set(it.id, job);
    return job;
  }

  /* ---------------- the row ---------------- */
  const stage = $('#stage'), hangs = $('#hangs');
  const aspect = it => { const im = frameImg.get(frameOf(it).src); return im ? im.naturalWidth / im.naturalHeight : .75; };
  hangs.innerHTML = items.map((it, i) =>
    `<div class="hang" data-i="${i}" role="button" tabindex="-1" aria-label="${esc(L(it.title))}"><img alt="" draggable="false"></div>`).join('');
  const H = $$('.hang', hangs).map((el, i) => ({ el, img: $('img', el), a: aspect(items[i]) }));
  items.forEach((it, i) => framed(it).then(u => { H[i].img.src = u; }));

  let SW = 0, SH = 0, big = 400, small = 170, gap = 30, top0 = 0;
  function layout() {
    SW = stage.clientWidth; SH = stage.clientHeight;
    const phone = innerWidth <= 640;
    big = Math.min(SH * (phone ? .6 : .74), 560);
    small = big * (phone ? .5 : .44);
    gap = Math.max(18, Math.min(44, SW * .03));
    top0 = (SH - big) / 2 + SH * (phone ? 0 : .03);
    H.forEach(o => { o.el.style.width = (big * o.a).toFixed(1) + 'px'; o.el.style.top = top0.toFixed(1) + 'px'; });
    prevShift = null; kick();
  }
  const ease = d => { const k = Math.max(0, 1 - Math.abs(d)); return k * k * (3 - 2 * k); };
  function place(p) {                                      // centre of each painting, with painting p in the middle
    const w = H.map((o, k) => o.a * (small + (big - small) * ease(k - p))), c = [];
    let acc = 0;
    w.forEach((x, k) => { c[k] = acc + x / 2; acc += x + gap; });
    const f = Math.max(0, Math.min(N - 1, p)), i = Math.min(N - 2, Math.floor(f));
    const mid = N > 1 ? c[i] + (c[i + 1] - c[i]) * (f - i) : c[0];
    const over = p < 0 ? p : p > N - 1 ? p - (N - 1) : 0;   // rubber band past the ends
    return { w, c, shift: SW / 2 - mid - over * (small * .8 + gap) };
  }

  let pos = 0, target = 0, dragging = false, running = false, active = -1, prevShift = null;
  function frame() {
    if (!dragging) { const d = target - pos; pos += Math.abs(d) < .0008 ? d : d * .085; }   // ease out, never overshoot
    const { w, c, shift } = place(pos);
    prevShift = shift;
    H.forEach((o, k) => {
      const d = Math.abs(k - pos);
      let x = c[k] + shift;
      if (rtl()) x = SW - x;
      const bw = big * o.a;
      o.el.style.transform = `translate3d(${(x - bw / 2).toFixed(2)}px,0,0) scale(${(w[k] / bw).toFixed(4)})`;
      o.el.style.opacity = Math.max(.3, 1 - Math.min(d, 3) * .24).toFixed(3);
      o.el.style.zIndex = 50 - Math.round(d * 10);
    });
    const a = Math.max(0, Math.min(N - 1, Math.round(pos)));
    if (a !== active) setActive(a);
    if (dragging || pos !== target) requestAnimationFrame(frame); else running = false;
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
  function go(i, now) { target = Math.max(0, Math.min(N - 1, i)); if (now || MG.reduced) pos = target; kick(); }

  /* ---------------- dragging, wheel, keys ---------------- */
  let startX = 0, startPos = 0, lastT = 0, moved = 0, flick = 0;
  const step = () => (small + big) / 2 * .8 + gap;
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    dragging = true; moved = 0; flick = 0;
    startX = e.clientX; startPos = pos; lastT = performance.now();
    stage.setPointerCapture(e.pointerId); stage.classList.add('dragging');
    kick();
  });
  stage.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dir = rtl() ? -1 : 1;
    let p = startPos - dir * (e.clientX - startX) / step();
    if (p < 0) p *= .3; else if (p > N - 1) p = N - 1 + (p - N + 1) * .3;
    const now = performance.now();
    flick = (p - pos) / Math.max(8, now - lastT) * 16; lastT = now;
    moved = Math.max(moved, Math.abs(e.clientX - startX));
    if (moved > 6) hideHint();
    pos = p;
  });
  const endDrag = e => {
    if (!dragging) return;
    dragging = false; stage.classList.remove('dragging');
    if (moved < 6) {                                       // a click, not a drag
      const hit = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.classList && el.classList.contains('hang'));
      if (hit) { const i = +hit.dataset.i; i === active && Math.abs(pos - i) < .05 ? openBox(i) : go(i); return; }
      go(Math.round(pos)); return;
    }
    go(Math.round(pos + flick * 8));
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  let wheelAcc = 0, wheelT;
  stage.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    wheelAcc += e.deltaX * (rtl() ? -1 : 1);
    clearTimeout(wheelT); wheelT = setTimeout(() => { wheelAcc = 0; }, 160);
    if (Math.abs(wheelAcc) > 50) { go(target + Math.sign(wheelAcc)); wheelAcc = 0; hideHint(); }
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

  /* ---------------- active painting: info, name, colour bloom ---------------- */
  let bloomFlip = false, ghostT, bloomT;
  function setActive(i) {
    active = i;
    const it = items[i];
    H.forEach((o, n) => o.el.classList.toggle('active', n === i));
    $('#count').innerHTML = `<b>${MG.pad(i + 1)}</b> / ${MG.pad(N)}`;
    $('#curTitle').textContent = L(it.title);
    $('#curMeta').textContent = [L(it.size), L(it.medium), MG.num(it.year)].filter(Boolean).join(' · ');
    $('#curTags').innerHTML = tags(it);
    $('#orderBtn').dataset.order = L(it.title);
    $('#prevBtn').disabled = i === 0; $('#nextBtn').disabled = i === N - 1;
    $$('#pins .pin').forEach((p, n) => p.setAttribute('aria-selected', String(n === i)));
    stage.setAttribute('aria-label', `${L(it.title)} (${i + 1}/${N})`);
    const g = $('#ghost');
    g.classList.add('swap'); clearTimeout(ghostT);
    ghostT = setTimeout(() => { g.textContent = L(it.title); g.style.setProperty('--c', it.palette[2]); g.classList.remove('swap'); }, 220);
    clearTimeout(bloomT); bloomT = setTimeout(() => { if (active === i) paintBloom(it); }, dragging ? 400 : 60);
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
    p.add({ x: w * .5, y: h * .55, radius: Math.min(w, h) * .36, color: it.palette[1], layers: 26, alpha: .025, rand: r, spread: .3, blend: 'source-over' });
    p.add({ x: w * .34, y: h * .66, radius: Math.min(w, h) * .22, color: it.palette[2], layers: 22, alpha: .025, rand: r, blend: 'source-over' }, 100);
    p.add({ x: w * .68, y: h * .64, radius: Math.min(w, h) * .2, color: it.palette[3], layers: 22, alpha: .025, rand: r, blend: 'source-over' }, 200);
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
      <button class="pcard rv in" type="button" data-i="${i}" ${filter !== 'all' && it.series !== filter ? 'hidden' : ''}>
        <div class="frame"><img alt="${esc(L(it.title))}"></div>
        <b>${esc(L(it.title))}</b><span>${esc(seriesName(it.series))} · ${esc(L(it.size))}</span>
      </button>`).join('');
    $$('#pgrid .pcard').forEach(b => {
      const i = +b.dataset.i;
      framed(items[i]).then(u => { $('img', b).src = u; });
      b.addEventListener('click', () => openBox(i));
    });
  }

  /* ---------------- lightbox ---------------- */
  const box = $('#plb');
  let boxI = 0;
  function fillBox(i) {
    boxI = i; const it = items[i];
    const img = $('#plbImg'); img.alt = L(it.title);
    framed(it).then(u => { if (boxI === i) img.src = u; });
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
    $('#plbOrder').dataset.order = L(it.title);
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
    prevShift = null;
    if (active >= 0) { const a = active; active = -1; setActive(a); }
    if (box.open) fillBox(boxI);
    kick();
  });

  renderGrid(); layout(); go(0, true);
  let rz;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 120); });
});
