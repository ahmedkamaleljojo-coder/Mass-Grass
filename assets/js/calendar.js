/* Mass & Grass — calendar page.
   1. The year as a fan of cards: move it left and right; tap a month for
      its details (painting, folk calendar, the days).
   2. The calendar on the wall: each page is drawn here (painting, month,
      folk calendar, days). Pull the page up and it bends and turns like
      paper: the sheet is cut into thin strips wrapped around a cylinder
      that follows the hand, shaded as it turns, casting a shadow on the
      page beneath. The season's light and weather change behind it.
   3. At home: the chosen month on a wall and a desk calendar photographed
      in a room (Canva photos, blank page measured).
   4. Build your year: pick each month's painting from any edition; your
      picks and your own dates (tap a day on the wall calendar) go with the
      order. */
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
  const pages = $('#pages'), top = $('#pgTop'), under = $('#pgUnder'), curl = $('#curl'), cast = $('#cast');
  const painted = new Set();
  let pageW = 0, pageH = 0, dpr = 1, frontCells = [], frontMonth = 0;
  const STRIPS = 96;
  let strips = [];
  function sizePages() {
    pageW = pages.clientWidth; pageH = Math.round(pageW * 1.39); dpr = Math.min(2, devicePixelRatio || 1);
    [top, under].forEach(c => { c.width = pageW * dpr; c.height = pageH * dpr; c.style.height = pageH + 'px'; });
    pages.style.height = pageH + 'px';
    const sh = pageH / STRIPS;
    curl.innerHTML = '';
    strips = Array.from({ length: STRIPS }, (_, i) => {
      const el = document.createElement('div'); el.className = 'st';
      el.style.height = (sh + 1) + 'px';
      const cv = canvas(pageW * dpr, (sh + 1) * dpr);
      el.appendChild(cv); el.insertAdjacentHTML('beforeend', '<div class="b"></div><i class="sh"></i><i class="bh"></i>');
      curl.appendChild(el);
      return { el, cv, s0: i * sh, sh: $('.sh', el), bh: $('.bh', el) };
    });
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

  /* The turning page. The sheet wraps around a horizontal cylinder of radius R
     whose axis sits at height yc: everything above yc hangs flat; below it the
     paper bends toward you around the cylinder and, past half a turn, runs back
     up flat, its back showing. The lifted edge follows the hand. */
  const R = () => pageH * .062;
  let hand = 0;                                               // where the page's bottom edge is held (px from the top)
  function loadStrips(src) {                                  // cut the turning page into strips
    strips.forEach(st => { const x = st.cv.getContext('2d'); x.clearRect(0, 0, st.cv.width, st.cv.height); x.drawImage(src, 0, Math.round(st.s0 * dpr), src.width, st.cv.height, 0, 0, st.cv.width, st.cv.height); });
  }
  function bend(h) {
    hand = h;
    const r = R(), H = pageH;
    const yc = clamp((h + H - Math.PI * r) / 2, -H * 1.5, H);
    let lowest = 0;
    strips.forEach(st => {
      const a = st.s0 - yc;
      let y, z, th;
      if (a <= 0) { y = st.s0; z = 0; th = 0; }
      else if (a / r <= Math.PI) { th = a / r; y = yc + r * Math.sin(th); z = r * (1 - Math.cos(th)); }
      else { th = Math.PI; y = yc - (a - Math.PI * r); z = 2 * r; }
      lowest = Math.max(lowest, y + (th < Math.PI / 2 ? Math.cos(th) * (H / STRIPS) : 0));
      st.el.style.transform = `translate3d(0,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateX(${(th * 180 / Math.PI).toFixed(2)}deg)`;
      // light from above: the front darkens as it turns away, the back is lit as it faces you
      st.sh.style.opacity = (Math.sin(Math.min(th, Math.PI / 2)) * .32).toFixed(3);
      st.bh.style.opacity = (th > Math.PI / 2 ? Math.max(0, Math.sin(th)) * .3 + .04 : .3).toFixed(3);
    });
    // the curl casts a soft shadow on the page underneath
    const lift = clamp((H - yc) / (H * .5), 0, 1);
    cast.style.top = clamp(lowest - 6, 0, H) + 'px';
    cast.style.opacity = (Math.min(1, lift * 1.4) * (yc > 0 ? 1 : clamp(1 + yc / (H * .3), 0, 1))).toFixed(3);
  }
  const FLAT = () => pageH + Math.PI * R();                  // bottom edge at rest
  const GONE = () => -pageH * 1.6;                           // turned up and over the binding
  let busy = false, mode = null, dragY = 0, lastY = 0, lastT = 0, vy = 0, moved = 0, h0 = 0;
  async function startTurn(dir) {                             // dir +1: the current page goes up; -1: the previous page comes down
    const src = canvas(pageW * dpr, pageH * dpr);
    if (dir > 0) { src.getContext('2d').drawImage(top, 0, 0); await paint(under, Math.min(N - 1, cur + 1), true); }
    else { await paint(under, cur, true); const r = await paint(src, cur - 1, true); }
    loadStrips(src);
    curl.classList.add('on'); top.style.visibility = 'hidden';
    bend(dir > 0 ? FLAT() : GONE());
  }
  async function endTurn(dir, done) {
    busy = true;
    const from = hand, to = dir > 0 ? (done ? GONE() : FLAT()) : (done ? FLAT() : GONE());
    await tween(done ? 620 : 420, k => bend(from + (to - from) * k));
    if (dir > 0 && done) { await paint(top, cur + 1, false); }
    else if (dir < 0 && done) { await paint(top, cur - 1, true); }
    top.style.visibility = ''; curl.classList.remove('on'); cast.style.opacity = 0;
    busy = false; mode = null;
    if (done) select(cur + dir, 'wall', dir < 0);
  }
  const pageY = e => e.clientY - pages.getBoundingClientRect().top;
  pages.addEventListener('pointerdown', e => {
    if (busy || e.button > 0) return;
    dragY = lastY = e.clientY; lastT = performance.now(); vy = 0; moved = 0; mode = 'wait';
    pages.setPointerCapture(e.pointerId); pages.classList.add('dragging');
  });
  pages.addEventListener('pointermove', async e => {
    if (!mode || mode === 'prep') return;
    const dy = e.clientY - dragY; moved = Math.max(moved, Math.abs(dy));
    const now = performance.now(); vy = (e.clientY - lastY) / Math.max(8, now - lastT); lastY = e.clientY; lastT = now;
    if (mode === 'wait' && Math.abs(dy) > 6) {
      $('#flipHint').classList.add('gone'); closePop();
      const want = dy < 0 ? (cur < N - 1 ? 'next' : 'none') : (cur > 0 ? 'prev' : 'none');
      if (want === 'none') { mode = 'none'; return; }
      mode = 'prep'; await startTurn(want === 'next' ? 1 : -1); mode = want;
      h0 = want === 'next' ? FLAT() : pageY(e) - pageH * .15;
    }
    if (mode === 'next') bend(Math.min(FLAT(), FLAT() + (e.clientY - dragY) * 1.6));
    if (mode === 'prev') bend(clamp(GONE() + (e.clientY - dragY) * 2.2, GONE(), FLAT()));
  });
  const endDrag = async e => {
    pages.classList.remove('dragging');
    const md = mode; mode = null;
    if (md === 'wait' && moved < 6) { openPop(e); return; }
    if (md === 'next') await endTurn(1, hand < pageH * .35 || vy < -.5);
    else if (md === 'prev') await endTurn(-1, hand > pageH * .1 || vy > .5);
  };
  pages.addEventListener('pointerup', endDrag);
  pages.addEventListener('pointercancel', endDrag);
  async function turn(dir) {
    if (busy || (dir > 0 ? cur >= N - 1 : cur <= 0)) return;
    closePop(); $('#flipHint').classList.add('gone'); busy = true;
    await startTurn(dir);
    await endTurn(dir, true);
  }
  $('#nextBtn').addEventListener('click', () => turn(1));
  $('#prevBtn').addEventListener('click', () => turn(-1));

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

  /* ================= 1. the year as a fan of cards ================= */
  const fan = $('#fan');
  fan.innerHTML = M.map((m, i) =>
    `<button class="card" type="button" role="option" data-i="${i}" style="--c:${m.acc}"><img src="${m.art}" alt="" draggable="false"><span class="ct"><b></b><span></span></span></button>`).join('');
  const cards = $$('.card', fan);
  let fpos = 0, ftarget = 0, frun = false, fdrag = null, fshown = -1;
  const cardW = () => Math.round(clamp(fan.clientWidth * (innerWidth <= 640 ? .56 : .22), 170, 280));
  function fanFrame() {
    const d0 = ftarget - fpos; fpos += Math.abs(d0) < .0008 ? d0 : d0 * .1;
    const cw = cardW(), step = innerWidth <= 640 ? 15 : 10, Ra = cw * 3.3, sgn = rtl() ? -1 : 1;
    fan.style.setProperty('--cw', cw + 'px');
    cards.forEach((c, k) => {
      const d = k - fpos, a = clamp(d, -7, 7) * step * Math.PI / 180;
      const x = Math.sin(a) * Ra * sgn, y = (1 - Math.cos(a)) * Ra * .6, s = 1 - Math.min(Math.abs(d), 4) * .06;
      c.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${(a * 180 / Math.PI * sgn).toFixed(2)}deg) scale(${s.toFixed(3)})`;
      c.style.zIndex = 100 - Math.round(Math.abs(d) * 10);
      c.style.opacity = Math.abs(d) > 6.5 ? 0 : 1;
    });
    const near = clamp(Math.round(fpos), 0, N - 1);
    if (near !== fshown) { fshown = near; cards.forEach((c, k) => c.classList.toggle('on', k === near)); fanCaption(near); }
    if (fdrag || fpos !== ftarget) requestAnimationFrame(fanFrame); else frun = false;
  }
  const fanKick = () => { if (!frun) { frun = true; requestAnimationFrame(fanFrame); } };
  const fanGo = i => { ftarget = clamp(i, 0, N - 1); fanKick(); };
  function fanCaption(i) {
    const mo = M[i];
    $('#fanName').textContent = L(mo.name); $('#fanFolk').textContent = L(mo.folk);
    document.documentElement.style.setProperty('--acc', mo.acc);
  }
  fan.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    fdrag = { x: e.clientX, p: fpos, moved: 0, card: e.target.closest('.card'), t: performance.now(), v: 0, lx: e.clientX };
    fan.setPointerCapture(e.pointerId); fan.classList.add('dragging'); fanKick();
  });
  fan.addEventListener('pointermove', e => {
    if (!fdrag) return;
    const dx = e.clientX - fdrag.x; fdrag.moved = Math.max(fdrag.moved, Math.abs(dx));
    const now = performance.now(); fdrag.v = (e.clientX - fdrag.lx) / Math.max(8, now - fdrag.t); fdrag.lx = e.clientX; fdrag.t = now;
    let p = fdrag.p - (rtl() ? -1 : 1) * dx / (cardW() * .62);
    if (p < 0) p *= .3; else if (p > N - 1) p = N - 1 + (p - N + 1) * .3;
    fpos = ftarget = p;
  });
  const fanUp = () => {
    if (!fdrag) return;
    const fd = fdrag; fdrag = null; fan.classList.remove('dragging');
    if (fd.moved < 6 && fd.card) { const i = +fd.card.dataset.i; fanGo(i); openMonth(i); return; }
    fanGo(Math.round(fpos - (rtl() ? -1 : 1) * fd.v * 5));
  };
  fan.addEventListener('pointerup', fanUp);
  fan.addEventListener('pointercancel', fanUp);
  fan.addEventListener('keydown', e => {
    const fwd = rtl() ? 'ArrowLeft' : 'ArrowRight', back = rtl() ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd) { e.preventDefault(); fanGo(ftarget + 1); }
    else if (e.key === back) { e.preventDefault(); fanGo(ftarget - 1); }
    else if (e.key === 'Enter') openMonth(Math.round(fpos));
  });
  $('#fanNext').addEventListener('click', () => fanGo(ftarget + 1));
  $('#fanPrev').addEventListener('click', () => fanGo(ftarget - 1));
  let fwheel = 0, fwt;
  fan.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); fwheel += e.deltaX * (rtl() ? -1 : 1);
    clearTimeout(fwt); fwt = setTimeout(() => { fwheel = 0; }, 160);
    if (Math.abs(fwheel) > 50) { fanGo(ftarget + Math.sign(fwheel)); fwheel = 0; }
  }, { passive: false });

  /* a month's details */
  const md = $('#md');
  let mdI = 0;
  function fillMonth(i) {
    mdI = i; const mo = M[i];
    $('#mdImg').src = mo.art; $('#mdImg').alt = L(mo.name);
    $('#mdNum').textContent = `${MG.pad(i + 1)} / ${MG.pad(N)} · ${MG.num(Y)}`;
    $('#mdName').textContent = L(mo.name); $('#mdFolk').textContent = L(mo.folk); $('#mdNote').textContent = L(mo.note);
    const heads = C.page.days[MG.lang] || C.page.days.ar, f = firstDay(i), n = daysIn(i);
    let h = heads.map((d, c) => `<span class="h${c === 6 ? ' f' : ''}">${esc(d)}</span>`).join('');
    for (let k = 0; k < f; k++) h += '<span></span>';
    for (let d = 1; d <= n; d++) h += `<span class="${(f + d - 1) % 7 === 6 ? 'f' : ''}">${MG.num(d)}</span>`;
    $('#mdCal').innerHTML = h;
    md.style.setProperty('--acc', mo.acc);
  }
  function openMonth(i) { fillMonth(i); if (!md.open) md.showModal(); }
  $('#mdX').addEventListener('click', () => md.close());
  md.addEventListener('click', e => { if (e.target === md) md.close(); });
  $('#mdNext').addEventListener('click', () => { const i = Math.min(N - 1, mdI + 1); fillMonth(i); fanGo(i); });
  $('#mdPrev').addEventListener('click', () => { const i = Math.max(0, mdI - 1); fillMonth(i); fanGo(i); });
  $('#mdWall').addEventListener('click', () => {
    md.close(); select(mdI, 'fan');
    $('#wall').scrollIntoView({ behavior: MG.reduced ? 'auto' : 'smooth', block: 'center' });
  });

  /* ================= the chosen month ================= */
  async function select(i, from, alreadyDrawn) {
    i = clamp(i, 0, N - 1);
    const changed = i !== cur; cur = i;
    const mo = M[i];
    wallSec.style.setProperty('--light', mo.light);
    document.documentElement.style.setProperty('--acc', mo.acc);
    if (from !== 'fan-drag') fanGo(i);
    if (fxType !== mo.fx) fxInit(mo.fx);
    $('#prevBtn').disabled = i === 0; $('#nextBtn').disabled = i === N - 1;
    if (from === 'wall' && alreadyDrawn) { frontMonth = i; const r = await paint(top, i, true); frontCells = r.cells; painted.add(i); }
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
      select(+li.dataset.m, 'fan');
      $('#wall').scrollIntoView({ behavior: MG.reduced ? 'auto' : 'smooth' });
    }));
    const b = $('#orderBtn');
    b.textContent = t('page.orderBuild') + (list.length ? ` · ${MG.num(list.length)} ${t('page.yourDates')}` : '');
  }
  /* ================= 4. build your year ================= */
  const ED = C.editions || [{ year: Y, shift: 0, name: C.page.title, status: '' }];
  const edArt = (e, m) => M[(m + e.shift) % N].art;
  const lastEd = ED.length - 1;
  let pick = M.map(() => lastEd);
  try { const s0 = JSON.parse(localStorage.getItem('mg-cal-pick') || 'null'); if (Array.isArray(s0) && s0.length === N) pick = s0.map(v => clamp(+v || 0, 0, lastEd)); } catch (e) { /* storage blocked */ }
  const savePick = () => { try { localStorage.setItem('mg-cal-pick', JSON.stringify(pick)); } catch (e) { /* ignore */ } };
  function renderBuild() {
    $('#whole').innerHTML = ED.map((e, i) => `<button type="button" data-e="${i}">${esc(t('page.wholeYear'))} ${MG.num(e.year)} · ${esc(L(e.name))}</button>`).join('');
    $$('#whole button').forEach(b => b.addEventListener('click', () => { pick = pick.map(() => +b.dataset.e); savePick(); refreshBuild(); }));
    $('#monthsB').innerHTML = M.map((mo, m) => `<div class="mb"><b>${esc(L(mo.name))}</b><div class="opts">${ED.map((e, ei) =>
      `<button class="opt" type="button" data-m="${m}" data-e="${ei}" aria-label="${esc(L(mo.name))} ${esc(t('page.from'))} ${e.year}"><img src="${edArt(e, m)}" alt="" loading="lazy"><small>${MG.num(e.year)}</small></button>`).join('')}</div></div>`).join('');
    $$('#monthsB .opt').forEach(o => o.addEventListener('click', () => { pick[+o.dataset.m] = +o.dataset.e; savePick(); refreshBuild(); }));
    refreshBuild();
  }
  function refreshBuild() {
    $('#chosen').innerHTML = M.map((mo, m) => `<img src="${edArt(ED[pick[m]], m)}" alt="${esc(L(mo.name))}" title="${esc(L(mo.name))} · ${ED[pick[m]].year}">`).join('');
    $$('#monthsB .opt').forEach(o => o.setAttribute('aria-pressed', String(pick[+o.dataset.m] === +o.dataset.e)));
    const cnt = {}; pick.forEach(i => { cnt[ED[i].year] = (cnt[ED[i].year] || 0) + 1; });
    $('#sum').textContent = Object.keys(cnt).sort().map(y => `${MG.num(cnt[y])} ${t('page.from')} ${MG.num(+y)}`).join(' · ');
  }
  $('#orderBtn').addEventListener('click', () => {
    const list = sortedMarks(), sep = MG.lang === 'ar' ? '، ' : ', ';
    const allOne = pick.every(v => v === pick[0]);
    let title = allOne ? `${t('page.wholeYear')} ${ED[pick[0]].year} · ${L(ED[pick[0]].name)}`
      : `${t('page.buildTitle')}: ` + M.map((mo, m) => `${L(mo.name)} ${ED[pick[m]].year}`).join(sep);
    if (list.length) title += ` — ${t('page.withDates')}: ` + list.map(([m, d]) => dayName(m, d) + (marks[`${m}-${d}`] ? ` (${marks[`${m}-${d}`]})` : '')).join(sep);
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
  function relabel() {
    fillTitle();
    cards.forEach((c, i) => { $('b', c).textContent = L(M[i].name); $('.ct span', c).textContent = L(M[i].folk); c.setAttribute('aria-label', L(M[i].name)); });
    fshown = -1; fanKick();
  }
  MG.onLang(async () => {
    relabel(); renderDates(); renderBuild();
    if (md.open) fillMonth(mdI);
    if (pageW) { const r = await paint(top, frontMonth, true); frontCells = r.cells; drawMock(); }
  });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.rv, .stroke').forEach(el => io.observe(el));
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(async () => { fanKick(); fxSize(); sizePages(); const r = await paint(top, frontMonth, true); frontCells = r.cells; }, 150); });

  relabel(); renderDates(); renderBuild();
  const startMonth = Y === new Date().getFullYear() ? new Date().getMonth() : 0;
  fpos = ftarget = startMonth; fanKick();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    sizePages(); fxInit(M[startMonth].fx); cur = startMonth;
    select(startMonth, 'boot');
    const wio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { wio.disconnect(); painted.delete(cur); showFront(cur, true); } }), { threshold: .4 });
    wio.observe(pages);
  });
});
