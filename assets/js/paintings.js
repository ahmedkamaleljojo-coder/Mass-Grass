/* Mass & Grass — paintings page.
   Paintings hang from wooden pegs on a rope. The line is dragged left and
   right: the painting passing the middle grows while the rest shrink and
   fade, and the line eases to a stop without bouncing (same motion as the
   hoodies). In the collection, hovering a painting shows it framed and held
   by a person (Canva photos, the painting laid into the frame's window). */
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

  /* ---------------- mockup: the painting framed and held by a person ---------------- */
  const MOCKS = MG.page.mockups;
  const mockOf = it => MOCKS[(it.ratio || [4, 5]).join(':')] || MOCKS['4:5'];
  const mockCache = new Map();
  function mockup(it) {
    if (mockCache.has(it.id)) return mockCache.get(it.id);
    const job = (async () => {
      const m = mockOf(it), [ph, art] = await Promise.all([load(m.src), load(artFor(it, 900))]);
      const cw = ph.naturalWidth, ch = ph.naturalHeight;
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const x = c.getContext('2d');
      x.drawImage(ph, 0, 0);
      const win = { x: m.window.x * cw, y: m.window.y * ch, w: m.window.w * cw, h: m.window.h * ch };
      const sc = Math.max(win.w / art.naturalWidth, win.h / art.naturalHeight);    // fill the window, like a print under the mat
      const aw = art.naturalWidth * sc, ah = art.naturalHeight * sc;
      x.save(); x.beginPath(); x.rect(win.x, win.y, win.w, win.h); x.clip();
      x.globalCompositeOperation = 'multiply';               // keeps the photo's light on the paper
      x.drawImage(art, win.x + (win.w - aw) / 2, win.y + (win.h - ah) / 2, aw, ah);
      x.globalCompositeOperation = 'source-over';
      let g = x.createLinearGradient(0, win.y, 0, win.y + win.h * .035);          // the mat's bevel shadow
      g.addColorStop(0, 'rgba(60,45,30,.16)'); g.addColorStop(1, 'rgba(60,45,30,0)');
      x.fillStyle = g; x.fillRect(win.x, win.y, win.w, win.h * .035);
      g = x.createLinearGradient(win.x, 0, win.x + win.w * .03, 0);
      g.addColorStop(0, 'rgba(60,45,30,.09)'); g.addColorStop(1, 'rgba(60,45,30,0)');
      x.fillStyle = g; x.fillRect(win.x, win.y, win.w * .03, win.h);
      g = x.createLinearGradient(win.x, win.y, win.x + win.w, win.y + win.h);       // a faint reflection on the glass
      g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(.4, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(win.x, win.y, win.w, win.h);
      x.restore();
      const blob = await new Promise(res => c.toBlob(res, 'image/webp', .9));
      return URL.createObjectURL(blob);
    })();
    mockCache.set(it.id, job);
    return job;
  }

  /* ---------------- the line: paintings pegged to a rope ---------------- */
  const stage = $('#stage'), hangs = $('#hangs'), rope = $('#rope');
  const ropePaths = $$('path', rope);
  const ratioOf = it => { const [rw, rh] = it.ratio || [4, 5]; return rw / rh; };
  hangs.innerHTML = items.map((it, i) => {
    const wide = ratioOf(it) > 1;
    const pegs = wide ? '<svg class="peg p1"><use href="#peg"/></svg><svg class="peg p2"><use href="#peg"/></svg>' : '<svg class="peg p0"><use href="#peg"/></svg>';
    return `<div class="hang" data-i="${i}"><div class="idle" style="--it:${(5.2 + (i % 4) * .8).toFixed(1)}s;--id:${(-i * 1.3).toFixed(1)}s">` +
      `${pegs}<div class="paper"><img src="${artFor(it, 900)}" alt="" draggable="false"></div></div></div>`;
  }).join('');
  const PAD_X = 24, PAD_Y = 28 + 14;                        // paper padding + the drop below the rope
  const H = $$('.hang', hangs).map((el, i) => ({ el, a: ratioOf(items[i]), lean: 0, bw: 0 }));

  let SW = 0, SH = 0, big = 420, small = 180, gap = 36, ropeTop = 0, sag = 0;
  function layout() {
    SW = stage.clientWidth; SH = stage.clientHeight;
    const phone = innerWidth <= 640;
    ropeTop = SH * .14; sag = SH * .045;
    big = Math.min((SH - ropeTop) * (phone ? .66 : .72), 500);   // height of the painting in the middle
    small = big * (phone ? .5 : .44);
    gap = Math.max(18, Math.min(48, SW * .03));
    H.forEach(o => { o.bw = big * o.a + PAD_X; o.el.style.width = o.bw.toFixed(1) + 'px'; });
    const d = `M -20 ${ropeY(-20).toFixed(1)} Q ${SW / 2} ${(ropeTop + sag * 2).toFixed(1)} ${SW + 20} ${ropeY(SW + 20).toFixed(1)}`;
    ropePaths.forEach(p => p.setAttribute('d', d));
    rope.setAttribute('viewBox', `0 0 ${SW} ${SH}`);
    kick();
  }
  const ropeY = x => ropeTop + sag * (1 - Math.pow((x - SW / 2) / (SW / 2), 2));
  const ease = d => { const k = Math.max(0, 1 - Math.abs(d)); return k * k * (3 - 2 * k); };
  function place(p) {                                      // scale and centre of each painting, with painting p in the middle
    const s = H.map((o, k) => (small + (big - small) * ease(k - p)) / big);
    const w = H.map((o, k) => o.bw * s[k]), c = [];
    let acc = 0;
    w.forEach((x, k) => { c[k] = acc + x / 2; acc += x + gap; });
    const f = Math.max(0, Math.min(N - 1, p)), i = Math.min(N - 2, Math.floor(f));
    const mid = N > 1 ? c[i] + (c[i + 1] - c[i]) * (f - i) : c[0];
    const over = p < 0 ? p : p > N - 1 ? p - (N - 1) : 0;   // rubber band past the ends
    return { s, c, shift: SW / 2 - mid - over * (small + gap) };
  }

  let pos = 0, target = 0, dragging = false, running = false, active = -1, prevShift = null;
  function frame() {
    if (!dragging) { const d = target - pos; pos += Math.abs(d) < .0008 ? d : d * .085; }   // ease out, never overshoot
    const { s, c, shift } = place(pos);
    const moveV = prevShift == null ? 0 : (shift - prevShift) * (rtl() ? -1 : 1); prevShift = shift;
    let busy = dragging || pos !== target;
    H.forEach((o, k) => {
      const d = Math.abs(k - pos);
      let x = c[k] + shift;
      if (rtl()) x = SW - x;
      const lean = MG.reduced ? 0 : Math.max(-3, Math.min(3, -moveV * .12));
      o.lean += (lean - o.lean) * .08;                      // leans softly from its peg with the motion, settles without swinging
      if (Math.abs(o.lean) > .01) busy = true;
      o.el.style.transform = `translate3d(${(x - o.bw / 2).toFixed(2)}px,${(ropeY(x) - 12).toFixed(2)}px,0) scale(${s[k].toFixed(4)}) rotate(${o.lean.toFixed(2)}deg)`;
      o.el.style.opacity = Math.max(.35, 1 - Math.min(d, 3) * .22).toFixed(3);
      o.el.style.zIndex = 50 - Math.round(d * 10);
    });
    const a = Math.max(0, Math.min(N - 1, Math.round(pos)));
    if (a !== active) setActive(a);
    if (busy) requestAnimationFrame(frame); else { running = false; prevShift = null; }
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
  function go(i, now) { target = Math.max(0, Math.min(N - 1, i)); if (now || MG.reduced) pos = target; kick(); }

  /* ---------------- dragging, wheel, keys ---------------- */
  let startX = 0, startPos = 0, lastT = 0, moved = 0, flick = 0;
  const step = () => (small + big) / 2 * .85 + gap;
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

  /* ---------------- active painting: info and name ---------------- */
  let ghostT;
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
  }
  function tags(it) {
    const a = it.available || {};
    return (a.original ? `<span class="tag">${esc(t('page.original'))}</span>` : `<span class="tag off">${esc(t('page.sold'))}</span>`) +
      (a.print ? `<span class="tag">${esc(t('page.print'))}</span>` : '');
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
        <div class="pmedia"><img class="art" src="${artFor(it, 600)}" alt="${esc(L(it.title))}" loading="lazy"><img class="mock" alt=""></div>
        <b>${esc(L(it.title))}</b><span>${esc(seriesName(it.series))} · ${esc(L(it.size))}</span>
      </button>`).join('');
    $$('#pgrid .pcard').forEach(b => {
      const i = +b.dataset.i;
      const warm = () => mockup(items[i]).then(u => { $('.mock', b).src = u; });
      if (MG.finePointer) { b.addEventListener('pointerenter', warm, { once: true }); setTimeout(warm, 1200 + i * 150); }
      b.addEventListener('click', () => openBox(i));
    });
  }

  /* ---------------- lightbox ---------------- */
  const box = $('#plb');
  let boxI = 0;
  function fillBox(i) {
    boxI = i; const it = items[i];
    const img = $('#plbImg'); img.alt = L(it.title);
    img.src = ''; mockup(it).then(u => { if (boxI === i) img.src = u; });
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
    if (active >= 0) { const a = active; active = -1; setActive(a); }
    if (box.open) fillBox(boxI);
    kick();
  });

  renderGrid(); layout(); go(0, true);
  let rz;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 120); });
  // pause the idle sway while the line is off screen
  new IntersectionObserver(es => es.forEach(e => stage.classList.toggle('paused', !e.isIntersecting))).observe(stage);
});
