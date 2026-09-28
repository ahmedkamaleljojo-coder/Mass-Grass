/* Mass & Grass — calendar page.
   1. The wheel of the year: twelve painted discs; turn it by hand, the month
      at the top is chosen.
   2. The calendar on the wall: each page is drawn here (painting, month,
      the land's folk calendar, the days). Pull the page up to turn the
      month; the new painting paints itself in, and the light and weather
      of the season change behind it.
   3. Your own dates: tap a day, write what happens; a watercolour mark is
      painted on it, remembered, and sent with the order.
   4. At home: the chosen month laid onto a wall calendar and a desk calendar
      photographed in a room (Canva photos, blank page measured). */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const W = window.Watercolor;
  const C = MG.page, M = C.months, Y = C.year, N = M.length;
  const rtl = () => document.documentElement.dir === 'rtl';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const imgCache = new Map();
  const load = src => {
    if (!imgCache.has(src)) imgCache.set(src, new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = src; }));
    return imgCache.get(src);
  };
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const easeOut = k => 1 - Math.pow(1 - k, 3);
  const tween = (ms, fn) => new Promise(res => {
    const t0 = performance.now();
    const tick = now => { const k = Math.min(1, (now - t0) / ms); fn(easeOut(k), k); k < 1 ? requestAnimationFrame(tick) : res(); };
    requestAnimationFrame(tick);
  });

  let cur = 0;
  const KEY = 'mg-cal-dates';
  let marks = {};
  try { marks = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { marks = {}; }
  const saveMarks = () => { try { localStorage.setItem(KEY, JSON.stringify(marks)); } catch (e) { /* storage blocked */ } };

  $('#yrTitle').innerHTML = '';
  function fillTitle() { $('#yrTitle').innerHTML = esc(t('page.title')).replace('&lt;em&gt;', '<em>').replace('&lt;/em&gt;', '</em>'); }

  /* ================= the page, drawn ================= */
  const firstDay = m => (new Date(Y, m, 1).getDay() + 1) % 7;          // Saturday-first week
  const daysIn = m => new Date(Y, m + 1, 0).getDate();
  const markRng = (m, d) => W.rng(1000 + m * 40 + d);
  // Draws one month onto ctx (w×h in px). Returns the day cells for tapping.
  function drawPage(ctx, w, h, m, art, opts) {
    const o = opts || {}, land = w > h, ar = MG.lang === 'ar', mo = M[m];
    const FD = css('--f-disp') || 'serif', FB = css('--f-body') || 'sans-serif';
    ctx.save();
    ctx.fillStyle = '#FBF7EF'; ctx.fillRect(0, 0, w, h);
    const pad = Math.min(w, h) * (land ? .06 : .065);
    let artBox, textBox;
    if (land) {
      const aw = (w - pad * 3) * .5;
      artBox = { x: ar ? w - pad - aw : pad, y: pad, w: aw, h: h - pad * 2 };
      textBox = { x: ar ? pad : pad * 2 + aw, y: pad, w: w - pad * 3 - aw, h: h - pad * 2 };
    } else {
      const top = pad + h * .025;
      artBox = { x: pad, y: top, w: w - pad * 2, h: (w - pad * 2) * .62 };
      textBox = { x: pad, y: artBox.y + artBox.h + pad * .55, w: w - pad * 2, h: h - (artBox.y + artBox.h + pad * .55) - pad };
    }
    if (art && !o.noArt) {
      const sc = Math.max(artBox.w / art.naturalWidth, artBox.h / art.naturalHeight), iw = art.naturalWidth * sc, ih = art.naturalHeight * sc;
      ctx.save(); ctx.beginPath(); ctx.rect(artBox.x, artBox.y, artBox.w, artBox.h); ctx.clip();
      ctx.drawImage(art, artBox.x + (artBox.w - iw) / 2, artBox.y + (artBox.h - ih) / 2, iw, ih); ctx.restore();
    }
    // month and year
    const u = textBox.w / 100, start = ar ? textBox.x + textBox.w : textBox.x, end = ar ? textBox.x : textBox.x + textBox.w;
    ctx.fillStyle = '#33251B'; ctx.textBaseline = 'alphabetic';
    const nameSize = u * (land ? 11 : 8.4);
    ctx.font = `700 ${nameSize}px ${FD}`; ctx.textAlign = ar ? 'right' : 'left';
    let y = textBox.y + nameSize * 1.02;
    ctx.fillText(L(mo.name), start, y);
    ctx.font = `700 ${nameSize * .62}px ${FD}`; ctx.fillStyle = mo.acc; ctx.textAlign = ar ? 'left' : 'right';
    ctx.fillText(MG.num(Y), end, y);
    ctx.font = `700 ${u * (land ? 4.2 : 3.3)}px ${FB}`; ctx.fillStyle = mo.acc; ctx.textAlign = ar ? 'right' : 'left';
    y += u * (land ? 6.2 : 5);
    ctx.fillText(L(mo.folk), start, y);
    // the folk saying at the foot of the page
    const noteSize = u * (land ? 3.8 : 3.15);
    ctx.font = `italic 500 ${noteSize}px ${FD}`; ctx.fillStyle = 'rgba(51,37,27,.62)'; ctx.textAlign = 'center';
    ctx.fillText(L(mo.note), textBox.x + textBox.w / 2, textBox.y + textBox.h - noteSize * .2, textBox.w);
    // the days
    const gTop = y + u * (land ? 4 : 3.4), gBot = textBox.y + textBox.h - noteSize * 1.9;
    const f = firstDay(m), n = daysIn(m), rows = Math.ceil((f + n) / 7);
    const cw = textBox.w / 7, headH = u * (land ? 5 : 4), rh = (gBot - gTop - headH) / rows;
    const colX = c => ar ? textBox.x + textBox.w - (c + .5) * cw : textBox.x + (c + .5) * cw;
    const heads = C.page.days[MG.lang] || C.page.days.ar;
    ctx.font = `700 ${u * (land ? 3.4 : 2.9)}px ${FB}`; ctx.textAlign = 'center';
    heads.forEach((d, c) => { ctx.fillStyle = c === 6 ? mo.acc : 'rgba(51,37,27,.5)'; ctx.fillText(d, colX(c), gTop + headH * .6); });
    ctx.strokeStyle = 'rgba(51,37,27,.12)'; ctx.lineWidth = Math.max(1, u * .15);
    ctx.beginPath(); ctx.moveTo(textBox.x, gTop + headH * .85); ctx.lineTo(textBox.x + textBox.w, gTop + headH * .85); ctx.stroke();
    const cells = [], numSize = Math.min(rh * .46, u * (land ? 5.2 : 4.7));
    for (let d = 1; d <= n; d++) {
      const i = f + d - 1, c = i % 7, r = Math.floor(i / 7);
      const cx = colX(c), cy = gTop + headH + (r + .5) * rh;
      const mk = marks[`${m}-${d}`];
      if (mk != null) {                                        // a watercolour mark painted on the day
        W.paintNow(ctx, { x: cx, y: cy - numSize * .05, radius: Math.min(cw, rh) * .4, color: mo.acc, layers: 16, alpha: .06, rand: markRng(m, d), sides: 7, spread: .25, blend: 'multiply' });
      }
      ctx.font = `${mk != null ? 700 : 500} ${numSize}px ${FB}`;
      ctx.fillStyle = c === 6 ? mo.acc : '#33251B'; ctx.textBaseline = 'middle';
      ctx.fillText(MG.num(d), cx, cy);
      ctx.textBaseline = 'alphabetic';
      cells.push({ d, x: cx - cw / 2, y: cy - rh / 2, w: cw, h: rh });
    }
    ctx.restore();
    return { cells, artBox };
  }

  /* ================= 2. the calendar on the wall ================= */
  const pages = $('#pages'), flip = $('#flip'), top = $('#pgTop'), under = $('#pgUnder');
  const painted = new Set();
  let pageW = 0, pageH = 0, dpr = 1, frontCells = [], frontMonth = 0;
  function sizePages() {
    pageW = pages.clientWidth; pageH = Math.round(pageW * 1.36); dpr = Math.min(2, devicePixelRatio || 1);
    [top, under].forEach(c => { c.width = pageW * dpr; c.height = pageH * dpr; c.style.height = pageH + 'px'; });
    pages.style.height = pageH + 'px';
  }
  async function paint(cv, m, withArt) {
    const art = await load(M[m].art).catch(() => null), x = cv.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    return Object.assign(drawPage(x, pageW, pageH, m, art, { noArt: !withArt }), { art });
  }
  let revealRun = 0;
  async function showFront(m, reveal) {
    frontMonth = m;
    const run = ++revealRun;
    if (!reveal || painted.has(m) || MG.reduced) { const r = await paint(top, m, true); frontCells = r.cells; painted.add(m); return; }
    painted.add(m);
    // paint the month's picture in: blooms spread over the art box, top to bottom
    const full = canvas(pageW * dpr, pageH * dpr), blank = canvas(pageW * dpr, pageH * dpr);
    const fx = full.getContext('2d'), bx = blank.getContext('2d');
    fx.setTransform(dpr, 0, 0, dpr, 0, 0); bx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const art = await load(M[m].art).catch(() => null);
    const r = drawPage(fx, pageW, pageH, m, art); drawPage(bx, pageW, pageH, m, art, { noArt: true });
    frontCells = r.cells;
    const mask = canvas(pageW * dpr, pageH * dpr), mx = mask.getContext('2d'); mx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const b = r.artBox, p = W.painter(mx, 5), rnd = W.rng(77 + m * 13), spots = [];
    for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 6; gx++) spots.push([(gx + .5 + (rnd() - .5) * .7) / 6, (gy + .5 + (rnd() - .5) * .7) / 4]);
    spots.sort((a, c) => (a[1] + a[0] * .2) - (c[1] + c[0] * .2));
    spots.forEach(([u, v]) => p.add({ x: b.x + u * b.w, y: b.y + v * b.h, radius: Math.min(b.w, b.h) * (.2 + rnd() * .08), color: '#000000', layers: 12, alpha: .18, rand: rnd, spread: .6, blend: 'source-over', edges: false }, 50));
    const tmp = canvas(pageW * dpr, pageH * dpr), tx = tmp.getContext('2d');
    const x = top.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0);
    const t0 = performance.now();
    await new Promise(res => {
      const tick = () => {
        if (run !== revealRun) return res();
        tx.globalCompositeOperation = 'copy'; tx.drawImage(full, 0, 0);
        tx.globalCompositeOperation = 'destination-in'; tx.drawImage(mask, 0, 0);
        x.drawImage(blank, 0, 0); x.drawImage(tmp, 0, 0);
        if (p.busy && performance.now() - t0 < 3200) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    if (run === revealRun) { x.drawImage(full, 0, 0); }
  }

  /* turning the page: hinged at the top; pull up for the next month, down for the one before */
  let ang = 0, mode = null, dragY = 0, lastY = 0, lastT = 0, vy = 0, busy = false, moved = 0;
  const setAng = a => { ang = a; flip.style.transform = `rotateX(${a.toFixed(2)}deg)`; flip.style.setProperty('--shade', (Math.sin(a * Math.PI / 180) * .28).toFixed(3)); };
  async function prepare(dir) {                               // dir +1: next under the page; -1: the previous page comes down
    if (dir > 0) { await paint(under, Math.min(N - 1, cur + 1), true); }
    else { await paint(under, cur, true); await paint(top, cur - 1, true); setAng(180); }
  }
  async function finish(dir, done) {
    busy = true;
    const from = ang, to = dir > 0 ? (done ? 180 : 0) : (done ? 0 : 180);
    await tween(done ? 520 : 380, k => setAng(from + (to - from) * k));
    if (dir > 0 && done) { await paint(top, cur + 1, false); setAng(0); busy = false; mode = null; select(cur + 1, 'wall'); return; }   // the new page paints in while you carry on
    else if (dir < 0 && done) { await select(cur - 1, 'wall', true); }
    else if (dir < 0 && !done) { setAng(0); await showFront(cur, false); }
    busy = false; mode = null;
  }
  pages.addEventListener('pointerdown', e => {
    if (busy || e.button > 0) return;
    dragY = lastY = e.clientY; lastT = performance.now(); vy = 0; moved = 0; mode = 'wait';
    pages.setPointerCapture(e.pointerId); pages.classList.add('dragging');
  });
  pages.addEventListener('pointermove', async e => {
    if (!mode) return;
    const dy = e.clientY - dragY; moved = Math.max(moved, Math.abs(dy));
    const now = performance.now(); vy = (e.clientY - lastY) / Math.max(8, now - lastT); lastY = e.clientY; lastT = now;
    if (mode === 'wait' && Math.abs(dy) > 6) {
      $('#flipHint').classList.add('gone'); closePop();
      if (dy < 0) { mode = 'next'; await prepare(1); } else if (cur > 0) { mode = 'prev'; await prepare(-1); } else mode = 'none';
    }
    const k = Math.abs(dy) / (pageH * .9) * 180;
    if (mode === 'next') setAng(cur < N - 1 ? clamp(k, 0, 180) : clamp(k * .15, 0, 20));
    if (mode === 'prev') setAng(clamp(180 - k, 0, 180));
  });
  const endFlip = async e => {
    pages.classList.remove('dragging');
    const md = mode; mode = null;
    if (md === 'wait' && moved < 6) { openPop(e); return; }
    if (md === 'next') await finish(1, cur < N - 1 && (ang > 70 || vy < -.6));
    else if (md === 'prev') await finish(-1, ang < 110 || vy > .6);
  };
  pages.addEventListener('pointerup', endFlip);
  pages.addEventListener('pointercancel', endFlip);
  $('#nextBtn').addEventListener('click', async () => { if (busy || cur >= N - 1) return; closePop(); await prepare(1); await finish(1, true); });
  $('#prevBtn').addEventListener('click', async () => { if (busy || cur <= 0) return; closePop(); await prepare(-1); await finish(-1, true); });

  /* the season's weather behind the calendar */
  const fxc = $('#fx'), wallSec = $('.wall-sec');
  let parts = [], fxType = '', fxOn = false, fxW = 0, fxH = 0;
  function fxInit(type) {
    fxType = type; const r = W.rng(5);
    const nMap = { rain: 70, petals: 34, anemone: 26, breeze: 22, pollen: 40, chaff: 30, sun: 26, leaves: 22 };
    parts = Array.from({ length: MG.reduced ? 0 : (nMap[type] || 0) }, () => ({ x: Math.random(), y: Math.random(), s: .5 + Math.random(), p: Math.random() * 6.28, r: Math.random() * 6.28 }));
  }
  function fxFrame(now) {
    if (!fxOn) return;
    const x = fxc.getContext('2d'); x.clearRect(0, 0, fxW, fxH);
    const acc = M[cur].acc, tt = now / 1000;
    parts.forEach(p => {
      const px = p.x * fxW, py = p.y * fxH;
      if (fxType === 'rain') {
        p.y += .012 * p.s; p.x -= .0022 * p.s;
        x.strokeStyle = `rgba(110,130,150,${.18 + p.s * .12})`; x.lineWidth = 1; x.beginPath(); x.moveTo(px, py); x.lineTo(px - 5 * p.s, py + 18 * p.s); x.stroke();
      } else if (fxType === 'petals' || fxType === 'anemone') {
        p.y += .0012 * p.s; p.x += Math.sin(tt * .8 + p.p) * .0009; p.r += .02;
        x.save(); x.translate(px, py); x.rotate(p.r); x.fillStyle = fxType === 'anemone' ? `rgba(190,60,55,${.35 + p.s * .2})` : `rgba(240,205,210,${.55 + p.s * .2})`;
        x.beginPath(); x.ellipse(0, 0, 5 * p.s, 3 * p.s, 0, 0, 7); x.fill(); x.restore();
      } else if (fxType === 'leaves') {
        p.y += .0014 * p.s; p.x += Math.sin(tt * .7 + p.p) * .0012; p.r += .015 * Math.sin(tt + p.p);
        x.save(); x.translate(px, py); x.rotate(p.r + .6); x.fillStyle = `rgba(110,125,90,${.4 + p.s * .2})`;
        x.beginPath(); x.ellipse(0, 0, 11 * p.s, 3 * p.s, 0, 0, 7); x.fill(); x.restore();
      } else if (fxType === 'chaff') {
        p.y += .0008 * p.s; p.x += .0012 * p.s + Math.sin(tt + p.p) * .0005; p.r += .03;
        x.save(); x.translate(px, py); x.rotate(p.r); x.strokeStyle = `rgba(200,160,80,${.45 + p.s * .2})`; x.lineWidth = 1.4;
        x.beginPath(); x.moveTo(-6 * p.s, 0); x.lineTo(6 * p.s, 0); x.stroke(); x.restore();
      } else if (fxType === 'pollen' || fxType === 'breeze') {
        p.y -= .0005 * p.s; p.x += (fxType === 'breeze' ? .0016 : .0004) * p.s + Math.sin(tt * .6 + p.p) * .0005;
        x.fillStyle = fxType === 'pollen' ? `rgba(215,180,80,${.35 + .3 * Math.sin(tt * 2 + p.p) ** 2})` : `rgba(255,255,255,${.5 + .3 * Math.sin(tt + p.p)})`;
        x.beginPath(); x.arc(px, py, (fxType === 'pollen' ? 2 : 3) * p.s, 0, 7); x.fill();
      } else if (fxType === 'sun') {
        p.y -= .0003 * p.s; p.x += Math.sin(tt * .4 + p.p) * .0003;
        x.fillStyle = `rgba(255,235,200,${.25 + .35 * Math.sin(tt * 1.5 + p.p) ** 2})`; x.beginPath(); x.arc(px, py, 2.5 * p.s, 0, 7); x.fill();
      }
      if (p.y > 1.05) { p.y = -.05; p.x = Math.random(); } if (p.y < -.05) { p.y = 1.05; p.x = Math.random(); }
      if (p.x < -.05) p.x = 1.05; if (p.x > 1.05) p.x = -.05;
    });
    if (fxType === 'sun') {                                   // a slow, warm glow
      const g = x.createRadialGradient(fxW * .8, fxH * .1, 0, fxW * .8, fxH * .1, fxH * .9);
      g.addColorStop(0, `rgba(255,220,170,${.22 + .06 * Math.sin(tt * .7)})`); g.addColorStop(1, 'rgba(255,220,170,0)');
      x.fillStyle = g; x.fillRect(0, 0, fxW, fxH);
    }
    requestAnimationFrame(fxFrame);
  }
  function fxSize() { const r = W.fit(fxc); fxW = r.w; fxH = r.h; }
  new IntersectionObserver(es => es.forEach(e => {
    const was = fxOn; fxOn = e.isIntersecting && !MG.reduced;
    if (fxOn && !was) { fxSize(); requestAnimationFrame(fxFrame); }
  }), { threshold: .05 }).observe(wallSec);

  /* ================= 1. the wheel of the year ================= */
  const wheel = $('#wheel');
  wheel.insertAdjacentHTML('beforeend', M.map((m, i) =>
    `<button class="disc" type="button" role="option" data-i="${i}" tabindex="-1"><img src="${m.art}" alt="" draggable="false"><span></span></button>`).join(''));
  const discs = $$('.disc', wheel);
  let theta = 0, wheelRun = 0, wheelDrag = null, shown = -1;
  const angDist = (a, b) => { let d = ((a - b) % 360 + 540) % 360 - 180; return Math.abs(d); };
  const topIndex = th => ((Math.round(-th / 30) % N) + N) % N;
  function placeWheel() {
    const R = wheel.clientWidth * .37;
    discs.forEach((d, i) => {
      const a = i * 30 + theta - 90, rad = a * Math.PI / 180;
      const close = Math.max(0, 1 - angDist(a, -90) / 55);
      const s = .72 + close * .62;
      d.style.transform = `translate(${(Math.cos(rad) * R).toFixed(1)}px,${(Math.sin(rad) * R).toFixed(1)}px) scale(${s.toFixed(3)})`;
      d.style.zIndex = Math.round(close * 10) + 1;
      d.style.setProperty('--lbl', close > .85 ? 1 : 0);
      d.classList.toggle('on', close > .85);
    });
    const ti = topIndex(theta);
    if (ti !== shown) { shown = ti; showInfo(ti); }
  }
  function spinTo(th, then) {
    const run = ++wheelRun, from = theta;
    return tween(MG.reduced ? 1 : 700, k => { if (run === wheelRun) { theta = from + (th - from) * k; placeWheel(); } }).then(() => { if (run === wheelRun && then) then(); });
  }
  const thetaFor = i => { const want = -i * 30; return theta + (((want - theta) % 360 + 540) % 360 - 180); };
  const wheelAngle = e => { const r = wheel.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
  wheel.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    wheelRun++; wheelDrag = { a: wheelAngle(e), th: theta, moved: 0, disc: e.target.closest('.disc') };
    wheel.setPointerCapture(e.pointerId); wheel.classList.add('dragging');
  });
  wheel.addEventListener('pointermove', e => {
    if (!wheelDrag) return;
    let d = wheelAngle(e) - wheelDrag.a; d = ((d % 360) + 540) % 360 - 180;
    wheelDrag.moved = Math.max(wheelDrag.moved, Math.abs(d));
    theta = wheelDrag.th + d; placeWheel();
  });
  const wheelUp = () => {
    if (!wheelDrag) return;
    const wd = wheelDrag; wheelDrag = null; wheel.classList.remove('dragging');
    const i = wd.moved < 3 && wd.disc ? +wd.disc.dataset.i : topIndex(theta);
    spinTo(thetaFor(i), () => select(i, 'wheel'));
  };
  wheel.addEventListener('pointerup', wheelUp);
  wheel.addEventListener('pointercancel', wheelUp);
  wheel.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const i = (cur + ((e.key === 'ArrowLeft') === rtl() ? 1 : -1) + N) % N;
    spinTo(thetaFor(i), () => select(i, 'wheel'));
  });

  /* ================= the chosen month ================= */
  function showInfo(i) {
    const box = $('.yr-month'), mo = M[i];
    box.classList.add('sw');
    setTimeout(() => {
      $('#yrName').textContent = L(mo.name); $('#yrFolk').textContent = L(mo.folk); $('#yrNote').textContent = L(mo.note);
      $('#yrCur').textContent = L(mo.name);
      box.classList.remove('sw');
    }, 180);
    document.documentElement.style.setProperty('--acc', mo.acc);
  }
  async function select(i, from, fromPrevFlip) {
    i = clamp(i, 0, N - 1);
    const changed = i !== cur; cur = i;
    const mo = M[i];
    wallSec.style.setProperty('--light', mo.light);
    document.documentElement.style.setProperty('--acc', mo.acc);
    if (from !== 'wheel') spinTo(thetaFor(i));
    if (fxType !== mo.fx) fxInit(mo.fx);
    $('#prevBtn').disabled = i === 0; $('#nextBtn').disabled = i === N - 1;
    if (from === 'wall' && fromPrevFlip) { frontMonth = i; const r = await paint(top, i, true); frontCells = r.cells; }
    else if (changed || from === 'boot') await showFront(i, from !== 'boot');
    drawMock();
  }

  /* ================= 3. your own dates ================= */
  const pop = $('#dpop');
  let popKey = null;
  const dayName = (m, d) => `${MG.num(d)} ${L(M[m].name)}`;
  function openPop(e) {
    const r = pages.getBoundingClientRect(), px = (e.clientX - r.left), py = (e.clientY - r.top);
    const c = frontCells.find(c => px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h);
    if (!c) { closePop(); return; }
    popKey = `${frontMonth}-${c.d}`;
    $('#dpopDay').textContent = dayName(frontMonth, c.d);
    const inp = $('#dpopText'); inp.placeholder = t('page.notePh'); inp.value = marks[popKey] || '';
    $('#dpopDel').hidden = marks[popKey] == null;
    pop.hidden = false;
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    pop.style.left = clamp(e.clientX - pw / 2, 10, innerWidth - pw - 10) + 'px';
    pop.style.top = clamp(e.clientY + 18, 10, innerHeight - ph - 10) + 'px';
    setTimeout(() => inp.focus({ preventScroll: true }), 30);
  }
  function closePop() { pop.hidden = true; popKey = null; }
  async function commitMarks() { saveMarks(); renderDates(); const r = await paint(top, frontMonth, true); frontCells = r.cells; drawMock(); }
  $('#dpopAdd').addEventListener('click', () => { if (!popKey) return; marks[popKey] = $('#dpopText').value.trim(); closePop(); commitMarks(); });
  $('#dpopText').addEventListener('keydown', e => { if (e.key === 'Enter') $('#dpopAdd').click(); if (e.key === 'Escape') closePop(); });
  $('#dpopDel').addEventListener('click', () => { if (!popKey) return; delete marks[popKey]; closePop(); commitMarks(); });
  $('#dpopX').addEventListener('click', closePop);
  document.addEventListener('pointerdown', e => { if (!pop.hidden && !pop.contains(e.target) && !pages.contains(e.target)) closePop(); });

  const sortedMarks = () => Object.keys(marks).map(k => k.split('-').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  function renderDates() {
    const list = sortedMarks(), ul = $('#dates');
    ul.innerHTML = list.length ? list.map(([m, d]) =>
      `<li data-m="${m}"><i style="--c:${M[m].acc}"></i><b>${esc(dayName(m, d))}</b><span>${esc(marks[`${m}-${d}`] || '')}</span></li>`).join('')
      : `<li class="empty">${esc(t('page.none'))}</li>`;
    $$('li[data-m]', ul).forEach(li => li.addEventListener('click', () => {
      select(+li.dataset.m, 'list');
      $('#wall').scrollIntoView({ behavior: MG.reduced ? 'auto' : 'smooth' });
    }));
    const b = $('#orderBtn');
    b.textContent = list.length ? `${t('page.orderMine')} (${MG.num(list.length)})` : t('page.orderPlain');
  }
  $('#orderBtn').addEventListener('click', () => {
    const list = sortedMarks(), sep = MG.lang === 'ar' ? '، ' : ', ';
    let title = `${L(C.page.eyebrow).split('·')[0].trim()}`;
    if (list.length) title += ` ${t('page.withDates')}: ` + list.map(([m, d]) => dayName(m, d) + (marks[`${m}-${d}`] ? ` (${marks[`${m}-${d}`]})` : '')).join(sep);
    MG.openOrder(title);
  });

  /* ================= 4. at home ================= */
  const mockCv = $('#mockCanvas');
  let fmt = 'wall', mockRun = 0;
  async function drawMock() {
    const mk = (C.mockups || {})[fmt]; if (!mk) return;
    const run = ++mockRun;
    const [ph, art] = await Promise.all([load(mk.src), load(M[cur].art)]).catch(() => [null, null]);
    if (!ph || run !== mockRun) return;
    const w = ph.naturalWidth, h = ph.naturalHeight;
    mockCv.width = w; mockCv.height = h;
    const x = mockCv.getContext('2d');
    x.drawImage(ph, 0, 0);
    const win = { x: mk.window.x * w, y: mk.window.y * h, w: mk.window.w * w, h: mk.window.h * h };
    const page = canvas(win.w * 2, win.h * 2), px = page.getContext('2d'); px.setTransform(2, 0, 0, 2, 0, 0);
    drawPage(px, win.w, win.h, cur, art);
    x.save(); x.globalCompositeOperation = 'multiply'; x.drawImage(page, win.x, win.y, win.w, win.h); x.restore();
    mockCv.classList.remove('sw');
  }
  $$('#fmtTabs button').forEach(b => b.addEventListener('click', () => {
    fmt = b.dataset.f;
    $$('#fmtTabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    mockCv.classList.add('sw'); drawMock();
  }));

  /* ================= language + boot ================= */
  MG.onLang(async () => {
    fillTitle(); $('#yrNum').textContent = MG.num(Y); shown = -1; placeWheel(); renderDates();
    $$('.disc span').forEach((s, i) => { s.textContent = L(M[i].name); });
    if (pageW) { const r = await paint(top, frontMonth, true); frontCells = r.cells; drawMock(); }
  });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.rv, .stroke').forEach(el => io.observe(el));
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(async () => { placeWheel(); fxSize(); sizePages(); const r = await paint(top, frontMonth, true); frontCells = r.cells; }, 150); });

  fillTitle();
  $('#yrNum').textContent = MG.num(Y);
  $$('.disc span').forEach((s, i) => { s.textContent = L(M[i].name); });
  renderDates();
  const startMonth = Y === new Date().getFullYear() ? new Date().getMonth() : 0;
  theta = -startMonth * 30; placeWheel();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    sizePages(); fxInit(M[startMonth].fx); cur = startMonth;
    select(startMonth, 'boot');
    const wio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { wio.disconnect(); painted.delete(cur); showFront(cur, true); } }), { threshold: .4 });
    wio.observe(pages);
  });
});
