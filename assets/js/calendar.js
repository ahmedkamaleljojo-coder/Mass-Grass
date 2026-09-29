/* Mass & Grass — calendar page.
   1. The year as a fan of cards: move it left and right; tap a month for
      its details (painting, folk calendar, the days).
   2. The calendar on the wall: each page is drawn here (painting, month,
      folk calendar, days). Pull the page up and it bends and turns like
      paper: a WebGL sheet hanging from the wire lifts toward you, sags,
      leads with the held corner, goes up over the binding and down behind
      the calendar, lit softly and casting its shadow on the page beneath.
      The season's light and weather change behind it.
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
  const tween = (ms, fn, ease = easeOut) => new Promise(res => {
    const t0 = performance.now();
    const tick = now => { const k = Math.min(1, (now - t0) / ms); fn(ease(k), k); k < 1 ? requestAnimationFrame(tick) : res(); };
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
  const pages = $('#pages'), top = $('#pgTop'), under = $('#pgUnder'), glc = $('#gl');
  const painted = new Set();
  let pageW = 0, pageH = 0, dpr = 1, frontCells = [], frontMonth = 0;
  function sizePages() {
    pageW = pages.clientWidth; pageH = Math.round(pageW * 1.36); dpr = Math.min(2, devicePixelRatio || 1);
    [top, under].forEach(c => { c.width = pageW * dpr; c.height = pageH * dpr; c.style.height = pageH + 'px'; });
    pages.style.height = pageH + 'px';
    if (sheet) sheet.size();
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

  /* ---------- the turning sheet (WebGL) ----------
     The sheet is a fine mesh hanging from the wire. Its top edge wraps round
     the wire loops; the rest of it follows the hand: the angle at the wire
     (a) goes 0 → 2π as the page is lifted toward you, up over the binding and
     down behind the calendar. The paper sags as it rises (the lower part
     lags), the held corner leads, and it is lit by one soft light from above
     the viewer. The next page is drawn under it (HTML); a depth-only copy of
     that page hides the sheet once it passes behind, and the sheet's shadow
     is thrown onto it. */
  const sheet = (() => {
    let gl = null;
    try { gl = glc.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, depth: true }); } catch (e) { gl = null; }
    if (!gl) return null;
    const VS = `
      attribute vec3 p; attribute vec3 n; attribute vec2 uv; attribute float a;
      uniform vec2 page; uniform vec4 box; uniform float D;
      varying vec2 vUv; varying vec3 vN; varying float vA; varying vec2 vP;
      void main() {
        float k = D / (D - p.z);                                   // perspective from the top middle of the page
        vec2 s = vec2(page.x * .5 + (p.x - page.x * .5) * k, p.y * k);
        vec2 c = (s - box.xy) / box.zw;
        gl_Position = vec4(c.x * 2. - 1., 1. - c.y * 2., -p.z / 5000., 1.);
        vUv = uv; vN = n; vA = a; vP = p.xy;
      }`;
    const FS = `
      precision mediump float;
      uniform sampler2D front, back; uniform int mode; uniform vec3 L; uniform vec2 pageF;
      varying vec2 vUv; varying vec3 vN; varying float vA; varying vec2 vP;
      void main() {
        if (mode == 1) {                                           // shadow on the page underneath
          if (vP.x < 0. || vP.x > pageF.x || vP.y < 0. || vP.y > pageF.y) discard;
          gl_FragColor = vec4(0., 0., 0., 1.) * vA; return;
        }
        if (mode == 2) { gl_FragColor = vec4(0.); return; }        // depth only
        vec3 nn = normalize(vN); if (!gl_FrontFacing) nn = -nn;
        float sh = mix(.66, 1., clamp(dot(nn, L) / L.z, 0., 1.)) + .05 * clamp(dot(nn, L) / L.z - 1., 0., 1.);   // room light keeps the paper from going grey
        vec3 c = gl_FrontFacing ? texture2D(front, vUv).rgb : texture2D(back, vUv).rgb;
        gl_FragColor = vec4(c * sh, 1.);
      }`;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('calendar sheet:', gl.getProgramInfoLog(prog), gl.getShaderInfoLog(gl.getAttachedShaders(prog)[0]), gl.getShaderInfoLog(gl.getAttachedShaders(prog)[1])); return null; }
    gl.useProgram(prog);
    const U = n => gl.getUniformLocation(prog, n), A = n => gl.getAttribLocation(prog, n);
    const NX = 30, NY = 72, NV = (NX + 1) * (NY + 1), DIST = 6;   // DIST: how far you stand, in page widths
    const P = new Float32Array(NV * 3), Nn = new Float32Array(NV * 3), UV = new Float32Array(NV * 2), AL = new Float32Array(NV);
    const SP = new Float32Array(NV * 3), SA = new Float32Array(NV);
    for (let i = 0; i <= NY; i++) for (let j = 0; j <= NX; j++) { const v = i * (NX + 1) + j; UV[v * 2] = j / NX; UV[v * 2 + 1] = i / NY; AL[v] = 1; }
    const idx = [];
    for (let i = 0; i < NY; i++) for (let j = 0; j < NX; j++) { const v = i * (NX + 1) + j; idx.push(v, v + NX + 1, v + 1, v + 1, v + NX + 1, v + NX + 2); }
    const IB = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, IB); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    const buf = () => gl.createBuffer();
    const bP = buf(), bN = buf(), bUV = buf(), bA = buf(), bSP = buf(), bSA = buf(), bQ = buf();
    gl.bindBuffer(gl.ARRAY_BUFFER, bUV); gl.bufferData(gl.ARRAY_BUFFER, UV, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bA); gl.bufferData(gl.ARRAY_BUFFER, AL, gl.STATIC_DRAW);
    const attr = (b, name, size) => { const l = A(name); if (l < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0); };
    const tex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); return t; };
    const tF = tex(), tB = tex();
    gl.uniform1i(U('front'), 0); gl.uniform1i(U('back'), 1);
    const Lv = [.12, -.5, 1], Ll = Math.hypot(...Lv); gl.uniform3f(U('L'), Lv[0] / Ll, Lv[1] / Ll, Lv[2] / Ll);
    let box = [0, 0, 1, 1], grab = 1, a = 0;
    const MX = .14, MT = 1.3, MB = .08;                        // room around the page for the sheet to travel
    function size() {
      box = [-pageW * MX, -pageH * MT, pageW * (1 + 2 * MX), pageH * (MT + 1 + MB)];
      Object.assign(glc.style, { left: box[0] + 'px', top: box[1] + 'px', width: box[2] + 'px', height: box[3] + 'px' });
      glc.width = Math.round(box[2] * dpr); glc.height = Math.round(box[3] * dpr);
      gl.viewport(0, 0, glc.width, glc.height);
      gl.uniform2f(U('page'), pageW, pageH); gl.uniform2f(U('pageF'), pageW, pageH); gl.uniform4f(U('box'), ...box); gl.uniform1f(U('D'), pageW * DIST);
      // the page underneath, depth only: it hides whatever goes behind the calendar
      const z = -1.5;
      gl.bindBuffer(gl.ARRAY_BUFFER, bQ); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, z, pageW, 0, z, 0, pageH, z, pageW, pageH, z]), gl.STATIC_DRAW);
    }
    function load(src) {                                     // the turning page: its print, and its back with the print showing through
      const bk = canvas(src.width, src.height), x = bk.getContext('2d');
      const g = x.createLinearGradient(0, 0, bk.width, 0);
      g.addColorStop(0, '#ECE5D8'); g.addColorStop(.3, '#F5EFE5'); g.addColorStop(.7, '#F3EDE2'); g.addColorStop(1, '#E8E0D2');
      x.fillStyle = g; x.fillRect(0, 0, bk.width, bk.height);
      x.globalAlpha = .07; x.drawImage(src, 0, 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tF); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tB); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, bk);
    }
    // the sheet's shape for angle a at the wire
    const rho = () => pageW * .012;                           // radius of the wire loops
    function build(an) {
      const H = pageH, Wd = pageW, ds = H / NY, r = rho(), PI = Math.PI;
      const half = Math.sin(clamp(an, 0, 2 * PI) / 2);
      const sag = -1.05 * half;                               // the lower part lags as the sheet swings
      const tw = .3 * half * (an < PI ? 1 : .6);              // the held corner leads
      for (let j = 0; j <= NX; j++) {
        const u = j / NX, lead = grab ? u : 1 - u;
        const aj = an + tw * (lead - .5) * (an > 0 ? 1 : 0);
        let y = -r * Math.sin(aj / 2), z = -r + r * Math.cos(aj / 2);    // round the wire: front → top → back
        const x = u * Wd;
        for (let i = 0; i <= NY; i++) {
          const v = i * (NX + 1) + j;
          P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z;
          const th = aj + sag * Math.pow((i + .5) / NY, 1.3);
          y += Math.cos(th) * ds; z += Math.sin(th) * ds;
        }
      }
      // normals from the mesh, facing you when the page hangs flat
      for (let i = 0; i <= NY; i++) for (let j = 0; j <= NX; j++) {
        const v = i * (NX + 1) + j, vx = i * (NX + 1) + Math.min(NX, j + 1), vX = i * (NX + 1) + Math.max(0, j - 1);
        const vy = Math.min(NY, i + 1) * (NX + 1) + j, vY = Math.max(0, i - 1) * (NX + 1) + j;
        const ax = P[vx * 3] - P[vX * 3], ay = P[vx * 3 + 1] - P[vX * 3 + 1], az = P[vx * 3 + 2] - P[vX * 3 + 2];
        const bx = P[vy * 3] - P[vY * 3], by = P[vy * 3 + 1] - P[vY * 3 + 1], bz = P[vy * 3 + 2] - P[vY * 3 + 2];
        let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1;
        Nn[v * 3] = nx / l; Nn[v * 3 + 1] = ny / l; Nn[v * 3 + 2] = nz / l;
        // shadow: the sheet thrown down onto the page by the light, softer the higher it is
        const pz = P[v * 3 + 2];
        SP[v * 3] = P[v * 3]; SP[v * 3 + 1] = P[v * 3 + 1] + Math.max(0, pz) * .55; SP[v * 3 + 2] = -.5;
        const edge = Math.min(1, j / NX / .1, (NX - j) / NX / .1, (NY - i) / NY / .12);
        SA[v] = pz > .5 ? .3 * edge * clamp(1 - pz / (H * .6), 0, 1) * clamp(pz / 12, 0, 1) : 0;
      }
    }
    function draw(an) {
      a = an; build(an);
      gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const mode = U('mode');
      // 1. depth of the page underneath
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.colorMask(false, false, false, false);
      gl.uniform1i(mode, 2); attr(bQ, 'p', 3); attr(bN, 'n', 3); attr(bUV, 'uv', 2); attr(bA, 'a', 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.colorMask(true, true, true, true);
      // 2. the shadow on it
      gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindBuffer(gl.ARRAY_BUFFER, bSP); gl.bufferData(gl.ARRAY_BUFFER, SP, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, bSA); gl.bufferData(gl.ARRAY_BUFFER, SA, gl.DYNAMIC_DRAW);
      gl.uniform1i(mode, 1); attr(bSP, 'p', 3); attr(bSA, 'a', 1);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      gl.disable(gl.BLEND);
      // 3. the sheet
      gl.enable(gl.DEPTH_TEST);
      gl.bindBuffer(gl.ARRAY_BUFFER, bP); gl.bufferData(gl.ARRAY_BUFFER, P, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, bN); gl.bufferData(gl.ARRAY_BUFFER, Nn, gl.DYNAMIC_DRAW);
      gl.uniform1i(mode, 0); attr(bP, 'p', 3); attr(bN, 'n', 3); attr(bA, 'a', 1);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    }
    // where the bottom edge's middle shows on screen for a given angle (to follow the hand)
    function tipY(an) {
      const H = pageH, ds = H / NY, r = rho(), half = Math.sin(an / 2), sag = -1.05 * half;
      let y = -r * Math.sin(an / 2), z = -r + r * Math.cos(an / 2);
      for (let i = 0; i < NY; i++) { const th = an + sag * Math.pow((i + .5) / NY, 1.3); y += Math.cos(th) * ds; z += Math.sin(th) * ds; }
      return y * (pageW * DIST) / (pageW * DIST - z);
    }
    function angleFor(screenY) {                              // the angle that brings the bottom edge to screenY
      let lo = 0, hi = Math.PI;
      if (screenY >= tipY(0)) return 0;
      if (screenY <= tipY(Math.PI)) return Math.PI;
      for (let k = 0; k < 24; k++) { const mid = (lo + hi) / 2; if (tipY(mid) > screenY) lo = mid; else hi = mid; }
      return (lo + hi) / 2;
    }
    return { size, load, draw, angleFor, set grab(g) { grab = g; }, get a() { return a; } };
  })();

  // falling back flat: accelerates like a dropped sheet, then a small bounce against the wall
  const drop = k => k < .78 ? Math.pow(k / .78, 2) : 1 - Math.sin((k - .78) / .22 * Math.PI) * .03 * (1 - (k - .78) / .22);
  const swing = k => .35 * k + .65 * (1 - Math.cos(Math.PI * k)) / 2;
  const TWO_PI = Math.PI * 2;
  let busy = false, mode = null, dragY = 0, lastY = 0, lastT = 0, vy = 0, moved = 0, ang = 0;
  async function startTurn(dir) {                             // dir +1: the current page goes up and over; -1: the previous one comes back
    const src = canvas(pageW * dpr, pageH * dpr);
    if (dir > 0) { src.getContext('2d').drawImage(top, 0, 0); await paint(under, Math.min(N - 1, cur + 1), true); }
    else { await paint(under, cur, true); await paint(src, cur - 1, true); }
    if (!sheet) return;
    sheet.load(src);
    ang = dir > 0 ? 0 : TWO_PI; sheet.draw(ang);
    glc.classList.add('on'); top.style.visibility = 'hidden';
  }
  async function endTurn(dir, done) {
    busy = true;
    const from = ang, to = dir > 0 ? (done ? TWO_PI : 0) : (done ? 0 : TWO_PI);
    if (sheet) {
      const landing = to === 0, span = Math.abs(to - from) / Math.PI;
      await tween(landing ? 380 + span * 260 : 360 + span * 380, k => { ang = from + (to - from) * k; sheet.draw(ang); }, landing ? drop : swing);
    }
    if (done) { const r = await paint(top, cur + dir, true); frontCells = r.cells; painted.add(cur + dir); }
    top.style.visibility = ''; glc.classList.remove('on');
    busy = false; mode = null;
    if (done) select(cur + dir, 'wall', true);
  }
  pages.addEventListener('pointerdown', e => {
    if (busy || e.button > 0) return;
    const rc = pages.getBoundingClientRect();
    if (sheet) sheet.grab = e.clientX - rc.left > rc.width / 2 ? 1 : 0;
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
      if (!sheet) { mode = null; await endTurn(want === 'next' ? 1 : -1, true); return; }
    }
    if (!sheet) return;
    if (mode === 'next') { ang = sheet.angleFor(pageH + (e.clientY - dragY) * 1.25); sheet.draw(ang); }
    if (mode === 'prev') { ang = clamp(TWO_PI - (e.clientY - dragY) / (pageH * .75) * Math.PI, 0, TWO_PI); sheet.draw(ang); }
  });
  const endDrag = async e => {
    pages.classList.remove('dragging');
    const md = mode; mode = null;
    if (md === 'wait' && moved < 6) { openPop(e); return; }
    if (md === 'next') await endTurn(1, ang > Math.PI * .5 || vy < -.5);
    else if (md === 'prev') await endTurn(-1, ang < Math.PI * 1.4 || vy > .5);
  };
  pages.addEventListener('pointerup', endDrag);
  pages.addEventListener('pointercancel', endDrag);
  async function turn(dir) {
    if (busy || (dir > 0 ? cur >= N - 1 : cur <= 0)) return;
    closePop(); $('#flipHint').classList.add('gone'); busy = true;
    if (sheet) sheet.grab = rtl() ? 0 : 1;
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
