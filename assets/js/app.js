/* Mass & Grass — home page.
   All text and lists come from /content/*.json so the dashboard (and Claude)
   can change the site without touching this file. Every picture on the page is a
   real photo of a piece or one of Farah's paintings (content/home.json). */
(async function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
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

  /* ---------------- i18n ---------------- */
  function fillText() {
    $$('[data-t]').forEach(el => {
      const v = t(el.dataset.t);
      if (/[<]/.test(v)) el.innerHTML = v.replace(/<wash>(.*?)<\/wash>/g, '<span class="wash">$1</span>');
      else el.textContent = v;
    });
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
    $('#bloom').setAttribute('aria-label', t('hero.art'));
    renderNav(); renderCollections(); renderJourneyText(); renderMonths(); renderSteps(); renderFooter();
    if (!first) { showMonth(calMonth, true); onJourneyScroll(); }
    store.set('mg-lang', l);
  }
  $('#langBtn').addEventListener('click', () => applyLang(lang === 'ar' ? 'en' : 'ar'));

  /* ---------------- toast ---------------- */
  let toastT;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('on'), 2600);
  }

  /* ---------------- nav ---------------- */
  function colLink(c) { return `/${c.id}/`; }
  const navItems = () => { const pg = C.site.pages || []; return [...pg.filter(c => c.first), ...C.site.collections, ...pg.filter(c => !c.first)].filter(c => !c.hidden); };
  function onColClick(e, c) {
    if (!c || c.ready) return;
    e.preventDefault();
    toast(`${L(c.title)}: ${t('collectionsHead.soon')}`);
  }
  function renderNav() {
    const html = navItems().map(c => `<a href="${colLink(c)}" data-col="${c.id}">${esc(L(c.title))}</a>`).join('');
    $('#nav').innerHTML = html;
    $$('#nav a').forEach(a => {
      const c = navItems().find(x => x.id === a.dataset.col);
      a.addEventListener('click', e => onColClick(e, c));
    });
  }

  /* ---------------- hero: Farah's boat in pencil, coloured wherever the pointer goes ----------------
     The pencil copy sits on the painting's own paper; watercolour blooms open under the pointer
     (or a finger) on a hidden mask, and the real painting shows through them with its own
     colours, so a fully coloured board is the original painting. What is coloured stays. */
  const W = window.Watercolor;
  const BL = C.home.hero.bloom || {};
  const bloomEl = $('#bloom'), pencil = $('#bloomPencil'), cv = $('#bloomPaint');
  if (BL.ratio) bloomEl.style.aspectRatio = BL.ratio.join('/');
  pencil.src = BL.pencil;
  const colour = new Image(); colour.src = BL.colour;
  const mask = document.createElement('canvas'), mk = mask.getContext('2d'), pctx = cv.getContext('2d');
  let bw = 0, bh = 0, blooms = [], painting = false, lastPt = null;
  function sizeBoard() {
    let old = null;
    if (mask.width) { old = document.createElement('canvas'); old.width = mask.width; old.height = mask.height; old.getContext('2d').drawImage(mask, 0, 0); }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    bw = bloomEl.clientWidth; bh = bloomEl.clientHeight;
    cv.width = mask.width = Math.max(1, Math.round(bw * dpr)); cv.height = mask.height = Math.max(1, Math.round(bh * dpr));
    mk.setTransform(1, 0, 0, 1, 0, 0);
    if (old) mk.drawImage(old, 0, 0, mask.width, mask.height);   // keep what is already coloured
    mk.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBoard();
  }
  const pencilImg = new Image(); pencilImg.src = BL.pencil;
  function drawBoard() {
    // the coloured patches, then the pencil drawing underneath the rest (one layer, multiplied onto the page)
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, cv.width, cv.height);
    pctx.globalCompositeOperation = 'source-over'; pctx.drawImage(mask, 0, 0);
    pctx.globalCompositeOperation = 'source-in';
    if (colour.complete && colour.naturalWidth) pctx.drawImage(colour, 0, 0, cv.width, cv.height);
    pctx.globalCompositeOperation = 'destination-over';
    if (pencilImg.complete && pencilImg.naturalWidth) { pctx.drawImage(pencilImg, 0, 0, cv.width, cv.height); bloomEl.classList.add('live'); }
    pctx.globalCompositeOperation = 'source-over';
  }
  function paintLoop() {
    blooms = blooms.filter(b => !b.step(1));                       // each open bloom spreads a layer a frame
    drawBoard();
    if (blooms.length) requestAnimationFrame(paintLoop); else painting = false;
  }
  function dab(x, y, big) {
    if (!W) return;
    const r = Math.max(bw, bh) * (big ? .09 : .06) * (.75 + Math.random() * .5);
    blooms.push(W.bloom(mk, { x, y, radius: r, color: '#000000', layers: big ? 14 : 12, alpha: big ? .28 : .26,
      spread: .5, sides: 8, edges: false, blend: 'source-over' }));
    if (!painting) { painting = true; requestAnimationFrame(paintLoop); }
  }
  // the board is tilted: offsetX/Y are measured in its own (unrotated) box
  const boardPt = e => e.target === cv ? { x: e.offsetX, y: e.offsetY }
    : (r => ({ x: (e.clientX - r.left) * bw / r.width, y: (e.clientY - r.top) * bh / r.height }))(bloomEl.getBoundingClientRect());
  bloomEl.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' && !e.buttons) return;
    const pt = boardPt(e);
    if (!lastPt || Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) > Math.max(bw, bh) * .018) { dab(pt.x, pt.y, false); lastPt = pt; }
  });
  bloomEl.addEventListener('pointerdown', e => { const pt = boardPt(e); dab(pt.x, pt.y, true); lastPt = pt; });
  bloomEl.addEventListener('pointerleave', () => { lastPt = null; });
  colour.addEventListener('load', drawBoard);
  pencilImg.addEventListener('load', drawBoard);
  window.addEventListener('resize', sizeBoard);
  // On opening the page the painting colours itself: the brush crosses the board row by row
  // (from the start of the line), then the last uncoloured specks fill in softly.
  async function autoPaint() {
    await (colour.decode ? colour.decode().catch(() => {}) : null);
    if (reduced || !W) { mk.save(); mk.setTransform(1, 0, 0, 1, 0, 0); mk.fillRect(0, 0, mask.width, mask.height); mk.restore(); drawBoard(); return; }
    const rows = 5, cols = 8, rtl = document.documentElement.dir === 'rtl', path = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cc = (r % 2 ? c : cols - 1 - c), x = (rtl ? cc : cols - 1 - cc);
      path.push([(x + .5) / cols, (r + .5) / rows]);
    }
    for (const [u, v] of path) {
      dab((u + (Math.random() - .5) * .05) * bw, (v + (Math.random() - .5) * .06) * bh, true);
      await new Promise(res => setTimeout(res, 70));
    }
    await new Promise(res => setTimeout(res, 900));
    for (let k = 1; k <= 24; k++) {                                  // fill what the brush missed
      mk.save(); mk.setTransform(1, 0, 0, 1, 0, 0); mk.globalAlpha = .12; mk.fillRect(0, 0, mask.width, mask.height); mk.restore();
      drawBoard();
      await new Promise(res => requestAnimationFrame(res));
    }
  }

  /* ---------------- collections ---------------- */
  function renderCollections() {
    const imgs = C.home.collectionImages || {};
    $('#cols').innerHTML = C.site.collections.map((c, i) => c.hidden ? '' : `
      <a class="col rv" href="${colLink(c)}" data-i="${i}" style="--rd:${(i % 4) * .07}s">
        <div class="col-art">${imgs[c.id] ? `<img src="${esc(imgs[c.id])}" alt="" loading="lazy" decoding="async">` : ''}
          ${c.ready ? '' : `<span class="soon">${esc(t('collectionsHead.soon'))}</span>`}
        </div>
        <div class="col-body">
          <div class="col-top"><span class="col-kick">${esc(L(c.kicker))}</span></div>
          <h3>${esc(L(c.title))}</h3>
          <p>${esc(L(c.text))}</p>
          <span class="col-go">${esc(t('collectionsHead.explore'))} <span aria-hidden="true">${lang === 'ar' ? '←' : '→'}</span></span>
        </div>
      </a>`).join('');
    $$('#cols .col').forEach(a => a.addEventListener('click', e => onColClick(e, C.site.collections[+a.dataset.i])));
    observeReveals();
  }

  /* ---------------- journey: one painting, many pieces (real photos, one after another) ---------------- */
  const STAGES = C.home.journey.stages;
  function buildJourney() {
    $('#jScene').innerHTML = STAGES.map((s, i) => `<img class="j-img" data-i="${i}" src="${esc(s.img)}" alt="" loading="lazy" decoding="async">`).join('');
    $('#jBar').innerHTML = STAGES.map(() => '<i></i>').join('');
  }
  function renderJourneyText() {
    $('#jStages').innerHTML = STAGES.map((s, i) =>
      `<div class="j-stage" data-i="${i}"><b>${esc(L(s.title))}</b><span>${esc(L(s.text))}</span></div>`).join('');
    jActive = -1;
  }
  let jActive = -1, jTick = false;
  function onJourneyScroll() {
    jTick = false;
    const sec = $('#journey');
    const rect = sec.getBoundingClientRect();
    const span = sec.offsetHeight - innerHeight;
    const prog = reduced ? 0 : Math.min(1, Math.max(0, -rect.top / Math.max(1, span)));
    const f = prog * (STAGES.length - 1);
    const i = Math.min(STAGES.length - 2, Math.floor(f));
    const k = Math.min(1, Math.max(0, (f - i - .3) / .4));
    $$('.j-img').forEach(el => {
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

  /* ---------------- calendar: the month's real painting under the wire-o binding ---------------- */
  const YEAR = +C.home.calendar.year;
  let calMonth = 0, calAuto = null, calTouched = false;
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
  function showMonth(m, force) {
    if (m === calMonth && !force) return;
    calMonth = m;
    $$('#months button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.m === m)));
    $('#calMonth').textContent = C.home.calendar.months[lang][m];
    $('#calYear').textContent = num(YEAR);
    const art = (C.home.calendar.art || [])[m];
    if (art) $('#calImg').src = art;
    const heads = lang === 'ar' ? ['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'] : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const first = (new Date(YEAR, m, 1).getDay() + 1) % 7;   // Saturday-first week
    const total = new Date(YEAR, m + 1, 0).getDate();
    let html = heads.map((d, i) => `<span class="dn${i === 6 ? ' fri' : ''}">${d}</span>`).join('');
    for (let i = 0; i < first; i++) html += '<span></span>';
    for (let d = 1; d <= total; d++) html += `<span class="d${(first + d - 1) % 7 === 6 ? ' fri' : ''}">${num(d)}</span>`;
    $('#calDays').innerHTML = html;
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
        <div class="step-no"><span>${num(i + 1)}</span></div>
        <h3>${esc(L(s.title))}</h3><p>${esc(L(s.text))}</p>
      </li>`).join('');
    observeReveals();
  }

  /* ---------------- Farah ---------------- */
  const F = C.home.story.farah || {};
  if (F.stand) { $('.farah .f-stand').src = F.stand; $('.farah .f-wave').src = F.wave || F.stand; }

  /* ---------------- footer ---------------- */
  function renderFooter() {
    $('#footCols').innerHTML = navItems().map(c => `<li><a href="${colLink(c)}" data-col="${c.id}">${esc(L(c.title))}</a></li>`).join('');
    $$('#footCols a').forEach(a => a.addEventListener('click', e => onColClick(e, navItems().find(x => x.id === a.dataset.col))));
    const k = C.site.contact || {}, items = [];
    if (k.instagram) items.push(`<li><a href="https://instagram.com/${esc(k.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener">Instagram · @${esc(k.instagram.replace(/^@/, ''))}</a></li>`);
    if (k.whatsapp) items.push(`<li><a href="https://wa.me/${esc(k.whatsapp)}" target="_blank" rel="noopener">WhatsApp · <span dir="ltr">+${esc(k.whatsapp)}</span></a></li>`);
    if (k.email) items.push(`<li><span dir="ltr">${esc(k.email)}</span></li>`);
    $('#footContact').innerHTML = items.length ? items.join('') : `<li>${esc(t('footer.contactSoon'))}</li>`;
    $('#yr').textContent = new Date().getFullYear();
  }

  /* ---------------- reveal on scroll ---------------- */
  let revIO;
  function observeReveals() {
    if (!('IntersectionObserver' in window)) { $$('.rv').forEach(e => e.classList.add('in')); return; }
    if (!revIO) revIO = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); revIO.unobserve(e.target); }
    }), { threshold: .12 });
    $$('.rv:not(.in)').forEach(el => revIO.observe(el));
  }

  /* ---------------- boot ---------------- */
  buildJourney();
  applyLang(lang, true);
  showMonth(0, true);
  onJourneyScroll();
  sizeBoard();
  setTimeout(autoPaint, 500);
})();
