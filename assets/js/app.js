/* Mass & Grass — home page.
   All text and lists come from /content/*.json so the dashboard (and Claude)
   can change the site without touching this file. Every picture on the page is a
   real photo of a piece (content/home.json); nothing is painted by code. */
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
    renderNav(); renderFacts(); renderPieces(); renderCollections(); renderJourneyText(); renderMonths(); renderSteps(); renderFooter();
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

  function renderFacts() {
    $('#facts').innerHTML = (C.home.hero.facts || []).map(f =>
      `<div class="fact"><b>${esc(L(f.value))}</b><span>${esc(L(f.label))}</span></div>`).join('');
  }

  /* ---------------- intro: the logo, once a visit ---------------- */
  function runIntro() {
    return new Promise(resolve => {
      const el = $('#intro');
      if (reduced || store.sget('mg-intro')) { el.remove(); return resolve(); }
      store.sset('mg-intro', '1');
      el.hidden = false;
      requestAnimationFrame(() => el.classList.add('show'));
      let done = false;
      const finish = () => {
        if (done) return; done = true;
        el.classList.add('out');
        setTimeout(() => el.remove(), 1100);
        resolve();
      };
      el.addEventListener('click', finish);
      setTimeout(finish, 1500);
    });
  }

  /* ---------------- hero: real pieces laid on a sheet of paper ---------------- */
  function renderPieces() {
    const sec = id => (C.site.collections.find(c => `/${c.id}/` === id) || {}).title;
    $('#pieces').innerHTML = (C.home.hero.pieces || []).map((p, i) => `
      <a class="piece" href="${esc(p.href)}" aria-label="${esc(L(sec(p.href)) || '')}"
         style="--x:${p.x}%;--y:${p.y}%;--w:${p.w}%;--r:${p.r}deg;--d:${(.15 + i * .09).toFixed(2)}s">
        <img src="${esc(p.img)}" alt="" decoding="async">
      </a>`).join('');
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
  await runIntro();
  $('#sheet').classList.add('on');
})();
