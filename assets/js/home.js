/* Mass & Grass — home page.
   1. hero: a real painting bleeds onto wet paper, and the pointer is a wet brush that paints more of it
   2. one painting, many lives: the section pins and the same painting travels from the paper into
      the frame, the wall calendar and the hoodie (real product photos, the art laid into each)
   3. the collections as a big index; each name shows its real product beside the pointer
   4. Farah's route on the real map of Gaza draws itself as the page scrolls
   5. the year of calendar paintings drifting past (faster while the page scrolls)
   6. how we work: a brush stroke paints itself through the four steps
   Scroll-linked parts run in one rAF loop that only works while a part is on screen. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const P = MG.page, S = P.scenes, site = MG.site;
  const reduced = MG.reduced;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const lerp = (a, b, k) => a + (b - a) * k;

  /* ---------------- intro: the logo in a drop of paint (once per visit) ---------------- */
  (function intro() {
    const el = $('#intro'); if (!el) return;
    let seen = false;
    try { seen = sessionStorage.getItem('mg-intro') === '1'; sessionStorage.setItem('mg-intro', '1'); } catch (e) { /* ignore */ }
    if (seen || reduced || !window.Watercolor) return;
    el.hidden = false;
    const c = $('#introCanvas'), ctx = c.getContext('2d'), W = window.Watercolor, r = W.rng(11), pal = site.palette;
    c.width = innerWidth; c.height = innerHeight;
    const cx = innerWidth / 2, cy = innerHeight / 2, R = Math.min(innerWidth, innerHeight) * .26;
    [[pal.clay, 0, 0, 1], [pal.sage, -.45, .25, .7], [pal.rose, .4, -.2, .75], [pal.ochre, .25, .35, .6]].forEach(([col, dx, dy, s], i) =>
      setTimeout(() => W.paintNow(ctx, { x: cx + dx * R, y: cy + dy * R, radius: R * s, color: col, layers: 26, alpha: .05, rand: r, sides: 8 }), i * 140));
    requestAnimationFrame(() => el.classList.add('show'));
    const close = () => { el.classList.add('out'); document.body.classList.add('intro-done'); setTimeout(() => { el.hidden = true; }, 1000); };
    setTimeout(close, 1700);
    el.addEventListener('click', close, { once: true });
  })();

  /* ---------------- 1. hero ---------------- */
  // the title carries <wash> marks for the painted word and <br> line breaks; everything else is text
  const rich = s => esc(s).replace(/&lt;wash&gt;/g, '<span class="wash">').replace(/&lt;\/wash&gt;/g, '</span>');
  function renderHero() {
    $('#heroTitle').innerHTML = L(P.hero.title).split('<br>').map((line, i) =>
      `<span class="x-line"><span style="--i:${i}">${rich(line)}</span></span>`).join('');
  }

  const hero = (function () {
    const fig = $('#heroArt'), base = $('#heroBase'), cv = $('#heroPaint');
    const W = window.Watercolor;
    const img = new Image();
    let ctx, mask, mctx, w = 0, h = 0, dirty = false, ready = false, queue = [];
    base.src = img.src = P.hero.art;

    function size() {
      const r = fig.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
      const nw = Math.round(r.width * dpr), nh = Math.round(r.height * dpr);
      if (!nw || !nh || (nw === w && nh === h)) return;
      // keep what was painted when the size changes
      const old = mask && w ? mask : null;
      w = cv.width = nw; h = cv.height = nh;
      ctx = cv.getContext('2d');
      const m = document.createElement('canvas'); m.width = w; m.height = h;
      const mc = m.getContext('2d');
      if (old) mc.drawImage(old, 0, 0, w, h);
      mask = m; mctx = mc; dirty = true;
    }
    // a bloom of water on the mask; the painting shows through wherever the mask is wet
    function bloom(x, y, rad, layers = 18, alpha = .06, seed) {
      if (!W || !mctx) return;
      W.paintNow(mctx, { x: x * w, y: y * h, radius: rad * Math.max(w, h), color: '#000000', layers, alpha, rand: W.rng(seed ?? (Math.random() * 1e9)), sides: 9 });
      dirty = true;
    }
    function draw() {
      if (!dirty || !ready || !ctx) return;
      dirty = false;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
      ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    }
    // the opening: blooms land one after another and spread, like water dropped on paper
    const plan = [[.52, .5, .2], [.3, .32, .16], [.74, .3, .15], [.28, .72, .15], [.72, .74, .16], [.5, .14, .12], [.5, .88, .12], [.12, .5, .12], [.9, .52, .12]];
    function opening() {
      if (reduced || !W) { mctx.fillRect(0, 0, w, h); dirty = true; return; }
      plan.forEach(([x, y, r], i) => {
        for (let k = 0; k < 6; k++) queue.push({ at: performance.now() + 250 + i * 170 + k * 70, x, y, r: r * (.45 + k * .13), seed: i * 31 + k });
      });
    }
    function step(now) {
      while (queue.length && queue[0].at <= now) {
        const b = queue.shift(); bloom(b.x, b.y, b.r, 12, .07, b.seed);
      }
      draw();
    }
    img.onload = () => { ready = true; size(); opening(); dirty = true; };
    new ResizeObserver(() => { size(); draw(); }).observe(fig);

    // the pointer is a wet brush
    let last = 0, lx = -1, ly = -1;
    fig.addEventListener('pointermove', e => {
      const r = fig.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const now = performance.now();
      if (now - last < 28 || (Math.abs(x - lx) < .012 && Math.abs(y - ly) < .012)) return;
      last = now; lx = x; ly = y;
      bloom(x, y, .055, 7, .07);
      fig.classList.add('painted');
    });
    fig.addEventListener('pointerdown', e => {
      const r = fig.getBoundingClientRect();
      bloom((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, .11, 14, .07);
      fig.classList.add('painted');
    });
    return { step };
  })();

  /* ---------------- 2. one painting, many lives ---------------- */
  const lives = (function () {
    const sec = $('#lives'), stage = $('#stage'), art = $('#stageArt'), bar = $('#livesBar');
    const ST = P.lives.stages, N = ST.length;
    let photos = [], items = [], cur = -1;
    $('img', art).src = P.lives.art;
    $('#stagePhotos').innerHTML = ST.map(s => `<img src="${esc(s.photo)}" alt="" loading="lazy" decoding="async">`).join('');
    photos = $$('#stagePhotos img');

    function renderCopy() {
      $('#stages').innerHTML = ST.map((s, i) => `
        <li class="x-st" data-i="${i}">
          <button type="button" class="x-st-b"><b>${esc(L(s.title))}</b><span>${esc(L(s.text))}</span></button>
          ${s.id !== 'paper' ? `<a class="x-st-go" href="/${s.id}/">${esc(t('collections.go'))} <span aria-hidden="true">${document.documentElement.dir === 'rtl' ? '←' : '→'}</span></a>` : ''}
        </li>`).join('');
      items = $$('#stages .x-st');
      // a stage name takes the page to that point of the pinned section
      items.forEach((li, i) => $('.x-st-b', li).addEventListener('click', () => {
        const top = sec.getBoundingClientRect().top + scrollY, span = sec.offsetHeight - innerHeight;
        scrollTo({ top: top + span * (i / (N - 1)), behavior: reduced ? 'auto' : 'smooth' });
      }));
      cur = -1;
    }

    // the stage sits still on each product for a while, then the painting travels to the next one
    function place(s) {
      const i = Math.min(N - 2, Math.floor(s)), raw = s - i;
      const k = ease(clamp((raw - .3) / .4));
      const a = ST[i].window, b = ST[i + 1].window;
      art.style.left = lerp(a.x, b.x, k) * 100 + '%';
      art.style.top = lerp(a.y, b.y, k) * 100 + '%';
      art.style.width = lerp(a.w, b.w, k) * 100 + '%';
      art.style.height = lerp(a.h, b.h, k) * 100 + '%';
      art.style.setProperty('--tilt', (Math.sin(k * Math.PI) * -5).toFixed(2) + 'deg');
      art.style.setProperty('--lift', Math.sin(k * Math.PI).toFixed(3));
      const pos = i + k;
      photos.forEach((p, j) => { p.style.opacity = clamp(1 - Math.abs(pos - j) * 1.15).toFixed(3); });
      const on = Math.round(pos);
      if (on !== cur) {
        cur = on;
        items.forEach((li, j) => li.classList.toggle('on', j === on));
        stage.dataset.on = ST[on].id;
      }
    }
    function step() {
      const r = sec.getBoundingClientRect(), span = sec.offsetHeight - innerHeight;
      const p = clamp(-r.top / (span || 1));
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
      place(p * (N - 1));
    }
    if (reduced) sec.classList.add('x-static');
    return { sec, step, renderCopy };
  })();

  /* ---------------- 3. the collections index ---------------- */
  const win = (w, inner) => `<span class="h-win" style="left:${w.x * 100}%;top:${w.y * 100}%;width:${w.w * 100}%;height:${w.h * 100}%">${inner}</span>`;
  const SCENE = {
    paintings: () => `<div class="h-photo"><img src="${S.paintings.photo}" alt="" loading="lazy">${win(S.paintings.window, `<img src="${S.paintings.art}" alt="" loading="lazy">`)}</div>`,
    calendars: () => `<div class="h-photo"><img src="${S.calendars.photo}" alt="" loading="lazy">${win(S.calendars.window, `<img src="${S.calendars.art}" alt="" loading="lazy">`)}</div>`,
    cloth: () => `<div class="h-photo h-clothp"><img class="h-look" src="${S.cloth.look}" alt="" loading="lazy"></div>`,
    stickers: () => `<div class="h-photo h-stk"><img class="h-nb" src="${S.stickers.photo}" alt="" loading="lazy">
      ${S.stickers.stickers.map((s, i) => `<img class="h-sticker s${i}" src="${s}" alt="" loading="lazy">`).join('')}</div>`,
    postcards: () => `<div class="h-photo h-env"><img class="h-env-back" src="${S.postcards.back}" alt="" loading="lazy">
      ${S.postcards.cards.map((c, i) => `<img class="h-pc c${i}" src="${c}" alt="" loading="lazy">`).join('')}
      <img class="h-env-front" src="${S.postcards.front}" alt="" loading="lazy"></div>`,
  };
  const scene = c => SCENE[c.id] ? SCENE[c.id]() : `<div class="h-photo h-soon"><span class="h-blob" style="--c:${c.color}"></span></div>`;
  function renderIndex() {
    const arrow = document.documentElement.dir === 'rtl' ? '←' : '→';
    $('#colList').innerHTML = site.collections.map((c, i) => `
      <li class="x-row" style="--c:${c.color};--rd:${i * .06}s">
        <a href="${MG.colLink(c)}" data-col="${c.id}"${c.ready ? '' : ' aria-disabled="true"'}>
          <span class="x-thumb" aria-hidden="true">${scene(c)}</span>
          <span class="x-name display">${esc(L(c.title))}</span>
          <span class="x-meta"><span>${esc(L(c.kicker || ''))}</span><b>${esc(c.ready ? t('collections.go') : t('collections.soon'))} <span aria-hidden="true">${arrow}</span></b></span>
        </a>
      </li>`).join('');
    $$('#colList a[aria-disabled]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault(); MG.toast(`${$('.x-name', a).textContent}: ${t('collections.soon')}`);
    }));
    $$('#colList .x-row').forEach(el => reveal.observe(el));
  }
  // the product follows the pointer, leaning with its speed
  const peek = (function () {
    const el = $('#peek'), list = $('#colList');
    const cache = {};
    let on = false, x = 0, y = 0, tx = 0, ty = 0, vx = 0, cur = '';
    if (!MG.finePointer || reduced) return { step() {} };
    list.addEventListener('pointerover', e => {
      const a = e.target.closest('a[data-col]'); if (!a) return;
      const id = a.dataset.col;
      if (id !== cur) {
        cur = id;
        const c = site.collections.find(k => k.id === id);
        if (!cache[id]) { const d = document.createElement('div'); d.className = 'x-peek-in'; d.innerHTML = scene(c); cache[id] = d; }
        el.replaceChildren(cache[id]);
        el.style.setProperty('--c', c.color);
      }
      if (!on) { x = tx; y = ty; }
      on = true; el.classList.add('on');
    });
    list.addEventListener('pointerleave', () => { on = false; el.classList.remove('on'); });
    list.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
    return {
      step() {
        if (!on && !el.classList.contains('on')) return;
        const nx = lerp(x, tx, .16), ny = lerp(y, ty, .16);
        vx = lerp(vx, nx - x, .2); x = nx; y = ny;
        el.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-55%) rotate(${clamp(vx * .6, -12, 12).toFixed(2)}deg)`;
      }
    };
  })();

  /* ---------------- 4. Farah's route draws itself ---------------- */
  const map = (function () {
    const sec = $('#storyBand'), svg = $('#miniMap');
    let path, face, len = 0, k = 1;
    function render() {
      const st = MG.more.story; if (!st) return;
      const K = Math.cos(31.4 * Math.PI / 180), Sx = 2250;
      const proj = (lo, la) => [(lo - 34.19) * K * Sx + 6, (31.62 - la) * Sx + 28];
      const ring = st.strip.map(([lo, la]) => proj(lo, la));
      const d = 'M' + ring.map(p => p.map(v => v.toFixed(1)).join(',')).join(' L') + 'Z';
      const pl = k => proj(st.places[k].lon, st.places[k].lat);
      const route = ['jalaa', 'zawaida', 'jalaa', 'office', 'deir', 'jalaa', 'telhawa', 'office'].map(pl);
      let rd = `M${route[0].join(',')}`;
      for (let i = 1; i < route.length; i++) {
        const [x1, y1] = route[i - 1], [x2, y2] = route[i], dx = x2 - x1, dy = y2 - y1, ln = Math.hypot(dx, dy) || 1;
        let nx = -dy / ln, ny = dx / ln; if (nx < 0) { nx = -nx; ny = -ny; }
        const k = Math.min(30, ln * .16) * (1 + (i % 3) * .5);
        rd += ` Q${(x1 + x2) / 2 + nx * k},${(y1 + y2) / 2 + ny * k} ${x2},${y2}`;
      }
      // frame the part of the strip the story walks through; marks and labels keep their size
      const xs = route.map(p => p[0]), ys = route.map(p => p[1]);
      const x0 = Math.min(...xs) - 120, x1 = Math.max(...xs) + 110, y0 = Math.min(...ys) - 80, y1 = Math.max(...ys) + 60;
      const h = Math.max(y1 - y0, (x1 - x0) * 420 / 330), w = h * 330 / 420, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      k = h / 420; svg.style.setProperty('--k', k.toFixed(3));
      svg.setAttribute('viewBox', `${(cx - w / 2).toFixed(0)} ${(cy - h / 2).toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}`);
      const lbl = id => {
        const [x, y] = pl(id), west = st.places[id].labelWest;
        return `<circle cx="${x}" cy="${y}" r="${4 * k}" fill="#fff" stroke="#6B4A36" stroke-width="${1.6 * k}"/>
          <text x="${x + (west ? -9 : 9) * k}" y="${y + 4 * k}" class="x-pl${west ? ' w' : ''}">${esc(L(st.places[id].name))}</text>`;
      };
      svg.innerHTML = `
        <defs>
          <mask id="mmReveal" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="5000" height="5000"><path id="mmMask" d="${rd}" pathLength="1" fill="none" stroke="#fff" stroke-width="${40 * k}" stroke-linecap="round" stroke-dasharray="1 1" stroke-dashoffset="1"/></mask>
          <clipPath id="mmFace"><circle cx="0" cy="0" r="22"/></clipPath>
        </defs>
        <rect x="-200" y="-200" width="1400" height="1600" fill="#B9D0D6" opacity=".55"/>
        <path d="${d}" fill="#EBD9B4" stroke="#8C6A45" stroke-opacity=".5" stroke-width="${2 * k}"/>
        <path class="x-route" d="${rd}" mask="url(#mmReveal)"/>
        ${['jalaa', 'zawaida', 'deir', 'telhawa'].map(lbl).join('')}
        <path id="mmPath" d="${rd}" fill="none" stroke="none"/>
        <g id="mmFaceG">
          <circle r="25" fill="#FFFDF8"/>
          <image href="${st.faces.farah.joy || st.faces.farah.calm}" x="-22" y="-22" width="44" height="44" clip-path="url(#mmFace)"/>
        </g>`;
      path = $('#mmPath'); face = $('#mmFaceG'); len = path.getTotalLength();
    }
    function step() {
      if (!path) return;
      const r = sec.getBoundingClientRect();
      const p = reduced ? 1 : clamp((innerHeight * .85 - r.top) / (r.height * .9));
      $('#mmMask').setAttribute('stroke-dashoffset', (1 - p).toFixed(4));
      const pt = path.getPointAtLength(len * p);
      face.setAttribute('transform', `translate(${pt.x.toFixed(1)},${(pt.y - 30 * k).toFixed(1)}) scale(${k.toFixed(3)})`);
    }
    return { sec, render, step };
  })();

  /* ---------------- 5. the year drifting past ---------------- */
  const year = (function () {
    const sec = $('#marquee'), track = $('#track');
    let anim = null, lastY = scrollY, boost = 0;
    function render() {
      const one = P.calendar.months.map((m, i) => `
        <figure class="x-month"><img src="${esc(m.src)}" alt="${esc(L(m.name))}" loading="lazy" decoding="async">
          <figcaption><b>${MG.pad(i + 1)}</b> ${esc(L(m.name))}</figcaption></figure>`).join('');
      track.innerHTML = one + one.replace(/<figure class="x-month">/g, '<figure class="x-month" aria-hidden="true">').replace(/alt="[^"]*"/g, 'alt=""');
      if (reduced) return;
      if (anim) anim.cancel();
      anim = track.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], { duration: 70000, iterations: Infinity });
    }
    sec.addEventListener('pointerenter', () => { if (anim) anim.updatePlaybackRate(.15); });
    sec.addEventListener('pointerleave', () => { if (anim) anim.updatePlaybackRate(1); });
    function step() {
      if (!anim || sec.matches(':hover')) { lastY = scrollY; return; }
      const v = Math.abs(scrollY - lastY); lastY = scrollY;
      boost = lerp(boost, Math.min(v * .35, 9), .1);
      anim.updatePlaybackRate(1 + boost);
    }
    return { sec, render, step };
  })();

  /* ---------------- 6. how we work ---------------- */
  const proc = (function () {
    const sec = $('#process'), path = $('#brushPath');
    let steps = [];
    function render() {
      $('#steps').innerHTML = P.process.steps.map((s, i) => `
        <li class="x-step" style="--i:${i}"><span class="x-step-no">${MG.num(i + 1)}</span><h3>${esc(L(s.title))}</h3><p>${esc(L(s.text))}</p></li>`).join('');
      steps = $$('#steps .x-step');
    }
    function step() {
      const r = sec.getBoundingClientRect();
      const p = reduced ? 1 : clamp((innerHeight * .8 - r.top) / (r.height * .75));
      path.style.strokeDashoffset = (1 - p).toFixed(4);
      steps.forEach((el, i) => el.classList.toggle('on', p > (i + .35) / steps.length));
    }
    return { sec, render, step };
  })();

  /* ---------------- reveal on scroll ---------------- */
  const reveal = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); }
  }), { threshold: .15 });

  /* ---------------- one loop for everything tied to the scroll ---------------- */
  const live = new Set();
  const watch = new IntersectionObserver(es => es.forEach(e => {
    const part = parts.find(p => p.sec === e.target);
    if (e.isIntersecting) live.add(part); else live.delete(part);
  }), { rootMargin: '20% 0px' });
  const parts = [lives, map, year, proc];
  parts.forEach(p => watch.observe(p.sec));
  (function loop(now) {
    hero.step(now);
    live.forEach(p => p.step());
    peek.step();
    requestAnimationFrame(loop);
  })(performance.now());

  function render() {
    renderHero(); lives.renderCopy(); renderIndex(); map.render(); year.render(); proc.render();
    parts.forEach(p => p.step());
    document.title = L(P.meta.title);
  }
  render();
  $$('.rv').forEach(el => reveal.observe(el));
  MG.onLang(render);
});
