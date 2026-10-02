/* Mass & Grass — home page.
   All text and lists come from /content/*.json so the dashboard (and Claude)
   can change the site without touching this file. */
(async function () {
  'use strict';
  const W = window.Watercolor;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  /* ---------------- content ---------------- */
  async function loadContent() {
    if (window.__CONTENT__) return window.__CONTENT__;
    const [site, home, settings] = await Promise.all(
      ['/content/site.json', '/content/home.json', '/content/settings.json'].map(u => fetch(u).then(r => r.json()).catch(() => ({})))
    );
    // contact and support links live in settings.json, which the content panel edits
    return { site: Object.assign(site, settings), home };
  }
  const C = await loadContent();
  const P = C.site.palette;
  const PAINT = [P.clay, P.ochre, P.sage, P.rose, P.slate, P.umber, P.plum];

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  let lang = store.get('mg-lang') === 'en' ? 'en' : 'ar';
  const L = v => (v && typeof v === 'object' && ('ar' in v || 'en' in v)) ? (v[lang] ?? v.ar) : v;
  function pick(path) {
    const [src, key] = path.includes(':') ? path.split(':') : ['home', path];
    return key.split('.').reduce((o, k) => (o == null ? o : o[k]), src === 'site' ? C.site : C.home);
  }
  const t = path => L(pick(path)) ?? '';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // numbers stay in Western digits in both languages
  const num = n => String(n);

  /* ---------------- product drawings (200×200, ink on paper) ---------------- */
  const S = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  const PAPER = 'fill="#F7F0E4"';
  const calGrid = (() => {
    let g = '';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++)
      g += `<rect x="${44 + c * 16.4}" y="${128 + r * 12.5}" width="10" height="7" rx="1" fill="currentColor" opacity=".18"/>`;
    return g;
  })();
  const PRODUCTS = {
    frame: {
      area: { x: 50, y: 42, w: 100, h: 116 },
      svg: `<path ${S} d="M100 9 L64 25 M100 9 L136 25"/><circle cx="100" cy="9" r="3" fill="currentColor"/>
        <rect x="30" y="24" width="140" height="154" rx="2" fill="#E6D3B4" stroke="currentColor" stroke-width="2.4"/>
        <rect x="40" y="34" width="120" height="134" ${PAPER} stroke="currentColor" stroke-width="1.6"/>
        <rect x="50" y="42" width="100" height="116" fill="none" stroke="currentColor" stroke-width=".8" opacity=".35"/>`
    },
    postcard: {
      area: { x: 26, y: 58, w: 92, h: 88 },
      svg: `<rect x="18" y="50" width="164" height="104" rx="3" ${PAPER} stroke="currentColor" stroke-width="2.4"/>
        <line x1="125" y1="62" x2="125" y2="142" ${S} stroke-width="1.2" opacity=".5"/>
        <rect x="148" y="60" width="26" height="30" ${S} stroke-width="1.4" stroke-dasharray="3 2.4"/>
        <path ${S} stroke-width="1.4" opacity=".55" d="M133 106 H174 M133 120 H174 M133 134 H164"/>`
    },
    tote: {
      area: { x: 68, y: 100, w: 64, h: 64 },
      svg: `<path ${S} stroke-width="4" d="M72 80 C72 30 128 30 128 80"/>
        <path d="M42 78 H158 L152 184 H48 Z" ${PAPER} stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
        <path ${S} stroke-width="1.2" opacity=".45" d="M44 88 H156"/>`
    },
    hoodie: {
      area: { x: 76, y: 84, w: 48, h: 48 },
      svg: `<path d="M72 36 C84 28 116 28 128 36 L164 56 L186 124 L166 132 L152 98 L152 184 L48 184 L48 98 L34 132 L14 124 L36 56 Z" ${PAPER} stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
        <path ${S} d="M72 36 C74 64 126 64 128 36"/><path ${S} stroke-width="1.6" d="M94 58 L92 78 M106 58 L108 78"/>
        <path ${S} stroke-width="1.4" opacity=".6" d="M70 150 H130 L138 176 H62 Z"/><path ${S} stroke-width="1.2" opacity=".45" d="M48 177 H152"/>`
    },
    calendar: {
      area: { x: 42, y: 40, w: 116, h: 72 },
      svg: `<rect x="34" y="30" width="132" height="152" rx="3" ${PAPER} stroke="currentColor" stroke-width="2.4"/>
        <g ${S} stroke-width="2"><circle cx="70" cy="30" r="5" fill="#F7F0E4"/><circle cx="100" cy="30" r="5" fill="#F7F0E4"/><circle cx="130" cy="30" r="5" fill="#F7F0E4"/></g>
        ${calGrid}`
    },
    sticker: {
      area: { x: 52, y: 52, w: 96, h: 96, round: true },
      svg: `<circle cx="100" cy="100" r="66" ${PAPER} stroke="currentColor" stroke-width="2.4"/>
        <path d="M146 53 Q 172 72 166 102 Q 138 94 146 53 Z" fill="#E6D3B4" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`
    },
    brush: {
      area: null,
      svg: `<path d="M56 162 C66 142 86 142 94 126 L100 118 L114 128 L108 136 C100 152 84 172 56 162 Z" fill="#E6D3B4" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M100 118 L150 40 L164 49 L114 128" ${PAPER} stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
        <path ${S} stroke-width="1.4" d="M104 112 L118 121"/>`
    }
  };
  const ICON = { frame: 'frame', sticker: 'sticker', calendar: 'calendar', hoodie: 'hoodie', tote: 'tote', postcard: 'postcard', brush: 'brush' };

  /* A small watercolour "landscape" used as the artwork inside products. */
  const sceneCache = new Map();
  function sceneURL(seed, size, palette) {
    const key = seed + ':' + size + ':' + palette.join();
    if (sceneCache.has(key)) return sceneCache.get(key);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#F7F0E4'; ctx.fillRect(0, 0, size, size);
    const r = W.rng(seed);
    const [a, b, d, e, f] = palette;
    const blobs = [
      { x: .5, y: .18, rad: .42, col: a, al: .022 },
      { x: .72, y: .3, rad: .13, col: b, al: .05 },
      { x: .18, y: .78, rad: .34, col: d, al: .035 },
      { x: .7, y: .82, rad: .38, col: d, al: .03 },
      { x: .45, y: .62, rad: .2, col: e, al: .04 },
      { x: .28, y: .5, rad: .08, col: f, al: .045 },
      { x: .82, y: .58, rad: .07, col: f, al: .045 }
    ];
    blobs.forEach(o => W.paintNow(ctx, {
      x: o.x * size, y: o.y * size, radius: o.rad * size, color: o.col,
      layers: 24, alpha: o.al, rand: r, sides: 8, spread: .16
    }));
    const url = c.toDataURL('image/jpeg', .86);
    sceneCache.set(key, url);
    return url;
  }
  const ART_PAL = [P.slate, P.ochre, P.sage, P.clay, P.rose];

  function productSVG(name, artURL, extra) {
    const p = PRODUCTS[name];
    let art = '';
    if (artURL && p.area) {
      const a = p.area;
      const clip = a.round ? `<clipPath id="cp-${extra}"><circle cx="${a.x + a.w / 2}" cy="${a.y + a.h / 2}" r="${a.w / 2}"/></clipPath>` : '';
      art = `${clip}<image href="${artURL}" x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" preserveAspectRatio="xMidYMid slice" style="mix-blend-mode:multiply"${a.round ? ` clip-path="url(#cp-${extra})"` : ''}/>`;
    }
    return `<svg viewBox="0 0 200 200" aria-hidden="true" style="filter:url(#ink)">${p.svg}${art}</svg>`;
  }

  /* ---------------- i18n ---------------- */
  function fillText() {
    $$('[data-t]').forEach(el => {
      const v = t(el.dataset.t);
      if (/[<]/.test(v)) {
        el.innerHTML = v.replace(/<wash>(.*?)<\/wash>/g, '<span class="wash">$1</span>');
      } else el.textContent = v;
    });
    paintWashes();
  }

  function applyLang(l, first) {
    lang = l;
    const ar = l === 'ar';
    document.documentElement.lang = l;
    document.documentElement.dir = ar ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-ar', ar);
    document.body.classList.toggle('lang-en', !ar);
    $('#langBtn').textContent = ar ? 'EN' : 'ع';
    document.title = ar ? 'Mass & Grass | رسومات مائية مرسومة باليد' : 'Mass & Grass | Hand-painted watercolour goods';
    fillText();
    renderNav(); renderFacts(); renderCollections(); renderJourneyText(); renderMonths(); renderSteps(); renderFooter();
    $('#hint').textContent = t(finePointer ? 'hero.hint' : 'hero.hintTouch');
    if (!first) { showMonth(calMonth, true); onJourneyScroll(); }
    store.set('mg-lang', l);
  }
  $('#langBtn').addEventListener('click', () => applyLang(lang === 'ar' ? 'en' : 'ar'));

  /* painted swatch behind the key headline word */
  let washURL = null;
  function paintWashes() {
    if (!washURL) washURL = W.swatch(420, 110, [P.ochre, P.rose, P.ochre], 5);
    $$('.wash').forEach(el => el.style.setProperty('--wash-img', `url(${washURL})`));
  }

  /* ---------------- toast ---------------- */
  let toastT;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('on'), 2600);
  }

  /* ---------------- nav + chips ---------------- */
  function colLink(c) { return `/${c.id}/`; }
  const navItems = () => [...C.site.collections, ...(C.site.pages || [])].filter(c => !c.hidden);
  function onColClick(e, c) {
    if (c.ready) return;
    e.preventDefault();
    toast(`${L(c.title)}: ${t('collectionsHead.soon')}`);
  }
  function renderNav() {
    const html = navItems().map(c =>
      `<a href="${colLink(c)}" data-col="${c.id}" style="--c:${c.color}">${esc(L(c.title))}</a>`).join('');
    $('#nav').innerHTML = html;
    $('#chips').innerHTML = html;
    $$('#nav a, #chips a').forEach(a => {
      const c = navItems().find(x => x.id === a.dataset.col);
      a.addEventListener('click', e => onColClick(e, c));
    });
  }

  function renderFacts() {
    $('#facts').innerHTML = (C.home.hero.facts || []).map(f =>
      `<div class="fact"><b>${esc(L(f.value))}</b><span>${esc(L(f.label))}</span></div>`).join('');
  }

  /* ---------------- logo mark ---------------- */
  (function logo() {
    const c = $('#logoMark'); const ctx = c.getContext('2d');
    const r = W.rng(3);
    W.paintNow(ctx, { x: 38, y: 40, radius: 26, color: P.clay, layers: 22, alpha: .07, rand: r, sides: 7 });
    W.paintNow(ctx, { x: 54, y: 50, radius: 18, color: P.sage, layers: 18, alpha: .08, rand: r, sides: 7 });
  })();

  /* ---------------- intro: a drop of paint ---------------- */
  function runIntro() {
    return new Promise(resolve => {
      const el = $('#intro');
      if (reduced || store.sget('mg-intro')) { el.remove(); return resolve(); }
      store.sset('mg-intro', '1');
      el.hidden = false;
      const cv = $('#introCanvas');
      const { ctx, w, h } = W.fit(cv);
      const p = W.painter(ctx, 6);
      const m = Math.min(w, h);
      const r = W.rng(9);
      p.add({ x: w / 2, y: h / 2, radius: m * .2, color: P.clay, layers: 40, alpha: .035, rand: r, spread: .5 });
      p.add({ x: w / 2 + m * .14, y: h / 2 + m * .06, radius: m * .12, color: P.ochre, layers: 30, alpha: .04, rand: r, spread: .4 });
      p.add({ x: w / 2 - m * .16, y: h / 2 + m * .08, radius: m * .1, color: P.sage, layers: 30, alpha: .04, rand: r, spread: .4 });
      requestAnimationFrame(() => el.classList.add('show'));
      let done = false;
      const finish = () => {
        if (done) return; done = true;
        el.classList.add('out');
        setTimeout(() => el.remove(), 1100);
        resolve();
      };
      el.addEventListener('click', finish);
      setTimeout(finish, 1900);
    });
  }

  /* ---------------- hero: the live sheet ---------------- */
  const sheet = $('#sheet');
  const base = $('#paperBase');
  let heroCtx, heroW, heroH, heroPainter, seed = 12;

  const DROPS = [
    { p: 'postcard', x: 6, y: 8, w: 40, r: -7, depth: .7 },
    { p: 'calendar', x: 60, y: 5, w: 33, r: 6, depth: .5 },
    { p: 'sticker', x: 4, y: 56, w: 27, r: 9, depth: 1.1 },
    { p: 'tote', x: 36, y: 44, w: 34, r: -3, depth: .35 },
    { p: 'hoodie', x: 68, y: 50, w: 30, r: 5, depth: .9 }
  ];

  function setupSheet() {
    const fit = W.fit(base);
    heroCtx = fit.ctx; heroW = fit.w; heroH = fit.h;
    heroCtx.fillStyle = '#F7F0E4'; heroCtx.fillRect(0, 0, heroW, heroH);
    heroPainter = W.painter(heroCtx, reduced ? 400 : 4);
  }

  function paintComposition(s) {
    const r = W.rng(s);
    const m = Math.min(heroW, heroH);
    const layout = [
      { x: .3, y: .28, rad: .2, col: P.ochre },
      { x: .7, y: .24, rad: .17, col: P.rose },
      { x: .52, y: .6, rad: .27, col: P.sage },
      { x: .2, y: .74, rad: .15, col: P.clay },
      { x: .8, y: .72, rad: .16, col: P.slate },
      { x: .48, y: .2, rad: .09, col: P.clay }
    ];
    layout.forEach((o, i) => heroPainter.add({
      x: (o.x + (r() - .5) * .08) * heroW, y: (o.y + (r() - .5) * .08) * heroH,
      radius: o.rad * m, color: o.col, layers: 34, alpha: .03, rand: r, spread: .22
    }, i * 90));
  }

  function renderDrops() {
    const box = $('#drops');
    box.innerHTML = DROPS.map((d, i) => {
      const fx = (d.x < 40 ? -140 : 140) + '%';
      const fy = (d.y < 40 ? -160 : 160) + '%';
      const fr = ((i % 2 ? 1 : -1) * (14 + i * 5)) + 'deg';
      const art = sceneURL(40 + i, 220, i % 2 ? [P.rose, P.ochre, P.sage, P.slate, P.clay] : ART_PAL);
      return `<div class="drop" data-depth="${d.depth}" style="--x:${d.x}%;--y:${d.y}%;--w:${d.w}%">
        <div class="land" style="--d:${(1.1 + i * .16).toFixed(2)}s;--fx:${fx};--fy:${fy};--fr:${fr};--r:${d.r}deg">
          <div class="sway" style="--ft:${(5.4 + i * .7).toFixed(1)}s;--fd:${(-i * .9).toFixed(1)}s">${productSVG(d.p, art, 'd' + i)}</div>
        </div></div>`;
    }).join('');
    $$('.drop', box).forEach(d => d.addEventListener('click', () => {
      const el = document.getElementById('collections');
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    }));
  }

  // Visitors paint on the sheet: the mouse leaves wet blooms, a tap drops colour.
  let lastPt = null, hue = 0;
  function sheetPoint(e) {
    const rect = base.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (heroW / rect.width), y: (e.clientY - rect.top) * (heroH / rect.height) };
  }
  function dab(pt, big) {
    hue = (hue + (big ? 1 : .08)) % PAINT.length;
    heroPainter.add({
      x: pt.x, y: pt.y, radius: big ? 34 + Math.random() * 18 : 12 + Math.random() * 12,
      color: PAINT[Math.floor(hue)], layers: big ? 26 : 12, alpha: big ? .045 : .06,
      spread: .5, edges: big
    });
  }
  sheet.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || e.target.closest('button,.drop')) return;
    const pt = sheetPoint(e);
    if (!lastPt || Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) > 16) { dab(pt, false); lastPt = pt; }
  });
  sheet.addEventListener('pointerleave', () => { lastPt = null; });
  sheet.addEventListener('pointerdown', e => {
    if (e.target.closest('button,.drop')) return;
    dab(sheetPoint(e), true);
  });
  $('#freshSheet').addEventListener('click', () => {
    heroPainter.clear();
    heroCtx.fillStyle = '#F7F0E4'; heroCtx.fillRect(0, 0, heroW, heroH);
    seed += 7; paintComposition(seed);
  });

  // Depth parallax for the products resting on the sheet.
  if (finePointer && !reduced) {
    let pend = false, mx = 0, my = 0;
    window.addEventListener('pointermove', e => {
      mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5;
      if (pend) return; pend = true;
      requestAnimationFrame(() => {
        pend = false;
        $$('#drops .drop').forEach(d => {
          const k = parseFloat(d.dataset.depth) * 22;
          d.style.setProperty('--px', (mx * k).toFixed(1) + 'px');
          d.style.setProperty('--py', (my * k).toFixed(1) + 'px');
        });
      });
    }, { passive: true });
  }

  /* ---------------- brush cursor ---------------- */
  if (finePointer && !reduced) {
    const b = $('#brush');
    let x = -50, y = -50, bx = -50, by = -50, moving = false;
    const loop = () => {
      bx += (x - bx) * .22; by += (y - by) * .22;
      b.style.transform = `translate(${bx}px,${by}px)`;
      if (Math.abs(x - bx) + Math.abs(y - by) > .3) requestAnimationFrame(loop); else moving = false;
    };
    window.addEventListener('pointermove', e => {
      x = e.clientX; y = e.clientY;
      b.classList.add('on');
      b.classList.toggle('big', !!e.target.closest('#sheet'));
      b.style.background = PAINT[Math.floor(hue)];
      if (!moving) { moving = true; requestAnimationFrame(loop); }
    }, { passive: true });
    document.addEventListener('pointerleave', () => b.classList.remove('on'));
  }

  /* ---------------- collections ---------------- */
  let thumbIO;
  function renderCollections() {
    const root = $('#cols');
    root.innerHTML = C.site.collections.map((c, i) => c.hidden ? '' : `
      <a class="col rv" href="${colLink(c)}" data-i="${i}" style="--c:${c.color};--rd:${(i % 4) * .07}s">
        <div class="col-art"><canvas aria-hidden="true"></canvas>
          <div class="col-icon">${productSVG(ICON[c.icon] || 'frame', sceneURL(60 + i, 240, [P.paper, c.color, P.sage, c.color, P.ochre]), 'c' + i)}</div>
          ${c.ready ? '' : `<span class="soon">${esc(t('collectionsHead.soon'))}</span>`}
        </div>
        <div class="col-body">
          <div class="col-top"><span class="col-kick">${esc(L(c.kicker))}</span><span class="col-no">${String(i + 1).padStart(2, '0')}</span></div>
          <h3>${esc(L(c.title))}</h3>
          <p>${esc(L(c.text))}</p>
          <span class="col-go">${esc(t('collectionsHead.explore'))} <span aria-hidden="true">${lang === 'ar' ? '←' : '→'}</span></span>
        </div>
      </a>`).join('');
    $$('.col', root).forEach(a => {
      const c = C.site.collections[+a.dataset.i];
      a.addEventListener('click', e => onColClick(e, c));
    });
    if (!thumbIO) thumbIO = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      thumbIO.unobserve(e.target);
      paintThumb(e.target);
    }), { rootMargin: '200px' });
    $$('.col-art canvas', root).forEach(cv => thumbIO.observe(cv));
    observeReveals();
  }
  function paintThumb(cv) {
    const i = +cv.closest('.col').dataset.i;
    const c = C.site.collections[i];
    const { ctx, w, h } = W.fit(cv);
    ctx.fillStyle = '#EADBC4'; ctx.fillRect(0, 0, w, h);
    const r = W.rng(100 + i * 13);
    const p = W.painter(ctx, reduced ? 400 : 5);
    const m = Math.max(w, h);
    p.add({ x: w * .3, y: h * .35, radius: m * .3, color: c.color, layers: 30, alpha: .035, rand: r, spread: .2 });
    p.add({ x: w * .75, y: h * .7, radius: m * .24, color: PAINT[(i + 2) % PAINT.length], layers: 26, alpha: .03, rand: r }, 120);
    p.add({ x: w * .62, y: h * .2, radius: m * .1, color: c.color, layers: 20, alpha: .05, rand: r }, 240);
  }

  /* ---------------- journey ---------------- */
  const jScene = $('#jScene'), jArt = $('#jArt');
  const STAGES = C.home.journey.stages;
  function buildJourney() {
    jScene.insertAdjacentHTML('afterbegin', STAGES.map((s, i) =>
      `<div class="j-prod" data-i="${i}">${productSVG(s.product, null)}</div>`).join(''));
    jArt.style.backgroundImage = `url(${sceneURL(21, 560, ART_PAL)})`;
    $('#jBar').innerHTML = STAGES.map(() => '<i></i>').join('');
  }
  function renderJourneyText() {
    $('#jStages').innerHTML = STAGES.map((s, i) =>
      `<div class="j-stage" data-i="${i}"><b>${esc(L(s.title))}</b><span>${esc(L(s.text))}</span></div>`).join('');
    jActive = -1;
  }
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = k => k * k * (3 - 2 * k);
  let jActive = -1, jTick = false;
  function onJourneyScroll() {
    jTick = false;
    const sec = $('#journey');
    const rect = sec.getBoundingClientRect();
    const span = sec.offsetHeight - innerHeight;
    const prog = reduced ? 0 : Math.min(1, Math.max(0, -rect.top / Math.max(1, span)));
    const f = prog * (STAGES.length - 1);
    const i = Math.min(STAGES.length - 2, Math.floor(f));
    const k = smooth(Math.min(1, Math.max(0, (f - i - .3) / .4)));
    const A = PRODUCTS[STAGES[i].product].area, B = PRODUCTS[STAGES[i + 1].product].area;
    jArt.style.left = lerp(A.x, B.x, k) / 2 + '%';
    jArt.style.top = lerp(A.y, B.y, k) / 2 + '%';
    jArt.style.width = lerp(A.w, B.w, k) / 2 + '%';
    jArt.style.height = lerp(A.h, B.h, k) / 2 + '%';
    $$('.j-prod', jScene).forEach(el => {
      const n = +el.dataset.i;
      el.style.opacity = n === i ? 1 - k : n === i + 1 ? k : 0;
    });
    const active = k < .5 ? i : i + 1;
    if (active !== jActive) {
      jActive = active;
      $$('.j-stage').forEach(el => el.classList.toggle('on', +el.dataset.i === active));
    }
    $$('#jBar i').forEach((b, n) => b.style.setProperty('--f', Math.min(1, Math.max(0, f - n + 1))));
  }
  window.addEventListener('scroll', () => { if (!jTick) { jTick = true; requestAnimationFrame(onJourneyScroll); } }, { passive: true });
  window.addEventListener('resize', () => requestAnimationFrame(onJourneyScroll));

  /* ---------------- calendar ---------------- */
  const YEAR = +C.home.calendar.year;
  const SEASON = [
    [P.slate, P.sage], [P.slate, P.rose], [P.sage, P.ochre], [P.rose, P.sage],
    [P.ochre, P.rose], [P.ochre, P.clay], [P.clay, P.ochre], [P.clay, P.umber],
    [P.umber, P.ochre], [P.clay, P.plum], [P.umber, P.slate], [P.plum, P.slate]
  ];
  let calMonth = 0, calAuto = null, calTouched = false;
  const calCanvas = $('#calCanvas');
  function renderMonths() {
    const names = C.home.calendar.months[lang];
    $('#months').setAttribute('aria-label', t('calendar.title'));
    $('#months').innerHTML = names.map((n, i) =>
      `<button type="button" data-m="${i}" aria-pressed="${i === calMonth}">${esc(n)}</button>`).join('');
    $$('#months button').forEach(b => {
      const go = () => { calTouched = true; stopCalAuto(); showMonth(+b.dataset.m); };
      b.addEventListener('click', go);
      b.addEventListener('mouseenter', go);
    });
  }
  function paintMonth(m) {
    const { ctx, w, h } = W.fit(calCanvas);
    ctx.fillStyle = '#F7F0E4'; ctx.fillRect(0, 0, w, h);
    const r = W.rng(300 + m * 17);
    const [a, b] = SEASON[m];
    const p = W.painter(ctx, reduced ? 400 : 6);
    p.add({ x: w * .35, y: h * .4, radius: w * .26, color: a, layers: 30, alpha: .035, rand: r, spread: .2 });
    p.add({ x: w * .7, y: h * .62, radius: w * .2, color: b, layers: 26, alpha: .04, rand: r }, 80);
    p.add({ x: w * .6, y: h * .25, radius: w * .07, color: b, layers: 18, alpha: .06, rand: r }, 160);
  }
  function showMonth(m, force) {
    if (m === calMonth && !force) return;
    calMonth = m;
    $$('#months button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.m === m)));
    $('#calMonth').textContent = C.home.calendar.months[lang][m];
    $('#calYear').textContent = num(YEAR);
    const heads = lang === 'ar' ? ['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'] : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const first = (new Date(YEAR, m, 1).getDay() + 1) % 7;   // Saturday-first week
    const total = new Date(YEAR, m + 1, 0).getDate();
    let html = heads.map((d, i) => `<span class="dn${i === 6 ? ' fri' : ''}">${d}</span>`).join('');
    for (let i = 0; i < first; i++) html += '<span></span>';
    for (let d = 1; d <= total; d++) html += `<span class="d${(first + d - 1) % 7 === 6 ? ' fri' : ''}">${num(d)}</span>`;
    $('#calDays').innerHTML = html;
    paintMonth(m);
  }
  function stopCalAuto() { clearInterval(calAuto); calAuto = null; }
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !calTouched && !reduced && !calAuto) calAuto = setInterval(() => showMonth((calMonth + 1) % 12), 2800);
    if (!e.isIntersecting) stopCalAuto();
  }), { threshold: .3 }).observe($('#calendar'));

  /* ---------------- process ---------------- */
  function renderSteps() {
    $('#steps').innerHTML = C.home.process.steps.map((s, i) => `
      <li class="step rv" style="--rd:${i * .1}s">
        <div class="step-no"><canvas width="172" height="172" aria-hidden="true" data-s="${i}"></canvas><span>${num(i + 1)}</span></div>
        <h3>${esc(L(s.title))}</h3><p>${esc(L(s.text))}</p>
      </li>`).join('');
    $$('#steps canvas').forEach(cv => {
      const i = +cv.dataset.s;
      const ctx = cv.getContext('2d');
      W.paintNow(ctx, { x: 86, y: 90, radius: 52, color: [P.ochre, P.rose, P.sage, P.slate][i % 4], layers: 24, alpha: .06, rand: W.rng(50 + i), sides: 7 });
    });
    observeReveals();
  }

  /* ---------------- footer ---------------- */
  function renderFooter() {
    $('#footCols').innerHTML = navItems().map(c => `<li><a href="${colLink(c)}" data-col="${c.id}">${esc(L(c.title))}</a></li>`).join('');
    $$('#footCols a').forEach(a => {
      const c = navItems().find(x => x.id === a.dataset.col);
      a.addEventListener('click', e => onColClick(e, c));
    });
    const k = C.site.contact, items = [];
    if (k.instagram) items.push(`<li><a href="https://instagram.com/${esc(k.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener">Instagram · @${esc(k.instagram.replace(/^@/, ''))}</a></li>`);
    if (k.whatsapp) items.push(`<li><a href="https://wa.me/${esc(k.whatsapp)}" target="_blank" rel="noopener">WhatsApp · <span dir="ltr">+${esc(k.whatsapp)}</span></a></li>`);
    if (k.email) items.push(`<li><span dir="ltr">${esc(k.email)}</span></li>`);
    $('#footContact').innerHTML = items.length ? items.join('') : `<li>${esc(t('footer.contactSoon'))}</li>`;
    $('#yr').textContent = new Date().getFullYear();
  }

  /* ---------------- reveal + brush strokes ---------------- */
  let revIO;
  function observeReveals() {
    if (!('IntersectionObserver' in window)) { $$('.rv').forEach(e => e.classList.add('in')); return; }
    if (!revIO) revIO = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); revIO.unobserve(e.target); }
    }), { threshold: .12 });
    $$('.rv:not(.in), .stroke:not(.in)').forEach(el => revIO.observe(el));
  }

  // Pause looping motion on the sheet while it is off screen.
  new IntersectionObserver(es => es.forEach(e => sheet.classList.toggle('paused', !e.isIntersecting)))
    .observe(sheet);

  /* ---------------- boot ---------------- */
  buildJourney();
  applyLang(lang, true);
  showMonth(0, true);
  onJourneyScroll();
  setupSheet();
  await runIntro();
  renderDrops();
  paintComposition(seed);
  let rz;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      if (Math.abs(base.clientWidth - heroW) < 2) return;
      setupSheet(); paintComposition(seed);
    }, 250);
  });
})();
