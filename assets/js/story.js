/* Mass & Grass — story page: Farah's map.
   A painted map of the Gaza Strip stays on screen while the story scrolls past
   it (after Codrops' "animated map path for interactive storytelling"). Farah
   is a small watercolour face on the map: as each part of the story reaches the
   reader, a dashed route draws itself and her face walks along it to the next
   place, and the map follows her. Ahmed's face joins when she meets him. The
   story panels are captions in the spirit of SBS's "The Boat": ink-bordered
   paper frames that rock gently in the hardest chapters, with room for real
   photos from Farah's life (drawn over in ink with tools/boat_sketch.py). */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const P = MG.page;
  const reduced = MG.reduced;
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = x => x * x * (3 - 2 * x);
  const lerp = (a, b, k) => a + (b - a) * k;

  /* ---------------- map geometry ---------------- */
  // lon/lat → the 800×1000 map (equirectangular, x scaled by cos(lat))
  const S = 2250, K = Math.cos(31.4 * Math.PI / 180);
  const proj = (lon, lat) => [(lon - 34.19) * K * S + 6, (31.62 - lat) * S + 28];
  // the real outline of the Gaza Strip (OpenStreetMap), from the north tip down the eastern line,
  // along the border with Egypt and back up the coast
  const RING = P.strip;
  const STRIP = RING.map(([lo, la]) => proj(lo, la));
  const coastFrom = RING.findIndex(([lo]) => lo === Math.min(...RING.map(c => c[0])));   // the south-west corner at Rafah
  const COAST = STRIP.slice(coastFrom);                                                    // south → north
  // a closed Catmull-Rom curve through the points, so the outline reads as painted, not plotted
  function smooth(pts) {
    const n = pts.length, p = i => pts[(i + n) % n];
    let d = `M${p(0)[0].toFixed(1)},${p(0)[1].toFixed(1)}`;
    for (let i = 0; i < n; i++) {
      const [a, b, c, e] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
      d += ` C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)},${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)},${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;
    }
    return d + 'Z';
  }
  const place = id => { const p = P.places[id]; return proj(p.lon, p.lat); };

  const svg = $('#mapSvg'), world = $('#world'), defs = svg.querySelector('defs');
  const el = (tag, attrs = {}, parent = world) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent.appendChild(n); return n;
  };

  /* ---------------- the painted map ---------------- */
  const outline = smooth(STRIP);
  const base = el('g', { class: 'm-base' });
  el('rect', { x: -900, y: -900, width: 2600, height: 2800, class: 'm-paper' }, base);
  // the sea: everything west of the coast
  const c0 = COAST[0], c1 = COAST[COAST.length - 1];
  el('path', { d: `M-900,1900 L${c0[0] - 420},1900 L${COAST.map(p => p.join(',')).join(' L')} L${c1[0] + 330},-900 L-900,-900 Z`, class: 'm-sea', filter: 'url(#wash)' }, base);
  el('path', { d: outline, class: 'm-land-bleed', filter: 'url(#wash)' }, base);
  el('path', { d: outline, class: 'm-land', filter: 'url(#wash)' }, base);
  el('path', { d: outline, class: 'm-coast' }, base);
  el('rect', { x: -900, y: -900, width: 2600, height: 2800, class: 'm-grain', filter: 'url(#grain)' }, base);
  const seaLabel = el('text', { class: 'm-sea-label', transform: `translate(${proj(34.27, 31.47).join(',')}) rotate(-56)` });
  const stripLabel = el('text', { class: 'm-strip-label', transform: `translate(${proj(34.345, 31.30).join(',')}) rotate(-56)` });
  const townLabels = P.towns.map(tw => {
    const [x, y] = proj(tw.lon, tw.lat);
    if (tw.city) return [el('text', { x: x + 10, y: y + 20, class: 'm-city-label', direction: 'ltr' }, base), tw];
    el('circle', { cx: x, cy: y, r: 2.4, class: 'm-town' }, base);
    return [el('text', { x: x + 7, y: y + 3, class: 'm-town-label', direction: 'ltr' }, base), tw];
  });
  // in the hardest chapters the painting darkens, as if the light went out of it
  const dim = el('rect', { x: -900, y: -900, width: 2600, height: 2800, class: 'm-dim', opacity: 0 });
  const routes = el('g', { class: 'm-routes' });
  const ruin = el('g', { class: 'm-ruin', opacity: 0 });
  const marks = el('g', { class: 'm-marks' });
  const placeLabels = Object.keys(P.places).map(k => {
    const [x, y] = place(k);
    el('circle', { cx: x, cy: y, r: 3.6, class: 'm-place' }, marks);
    const west = P.places[k].labelWest;
    return [el('text', { x: west ? x - 7 : x + 7, y: y - 6, class: 'm-place-label', 'text-anchor': west ? 'end' : 'start', direction: 'ltr' }, marks), k];
  });

  // the bombed house: a dark bloom with ragged edges over al-Jalaa
  {
    const [x, y] = place('jalaa');
    el('path', { d: `M${x - 13},${y - 3} q4,-11 13,-10 q12,-3 12,8 q6,9 -4,14 q-7,8 -15,1 q-10,-2 -6,-13z`, class: 'm-ruin-blot', filter: 'url(#wash)' }, ruin);
    el('path', { d: `M${x - 7},${y - 6} l14,13 M${x + 7},${y - 6} l-14,13`, class: 'm-ruin-x' }, ruin);
  }

  // the two faces
  function token(who) {
    const g = el('g', { class: `m-token m-${who}`, opacity: 0 });
    el('circle', { r: 22, cy: 3, class: 'm-token-shadow' }, g);
    const img = el('image', { href: P.faces[who].calm, x: -19, y: -19, width: 38, height: 38, 'clip-path': 'url(#faceClip)', preserveAspectRatio: 'xMidYMid slice' }, g);
    el('circle', { r: 19.5, class: 'm-token-ring' }, g);
    const label = el('text', { y: 38, class: 'm-token-label' }, g);
    // the face changes with the story: happy, worried, sad, overjoyed
    let mood = 'calm';
    const setMood = m => { m = P.faces[who][m] ? m : 'calm'; if (m !== mood) { mood = m; img.setAttribute('href', P.faces[who][m]); } };
    return { g, label, x: 0, y: 0, setMood };
  }
  const farahT = token('farah'), ahmedT = token('ahmed');

  /* ---------------- routes between places ----------------
     A gentle curve from place to place. The dashed line is shown through a
     mask whose solid stroke grows along the curve, so the dashes appear as
     if drawn by hand in the direction of travel. */
  let maskN = 0;
  function route(from, to, who, bend) {
    const [x1, y1] = place(from), [x2, y2] = place(to);
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    // bow toward the land (east), never out over the sea; a second route between the same places bows a little more
    let nx = -dy / len, ny = dx / len;
    if (nx < 0) { nx = -nx; ny = -ny; }
    const k = Math.min(34, len * .16) * (1 + (Math.abs(bend) - 1) * .7);
    const cx = (x1 + x2) / 2 + nx * k, cy = (y1 + y2) / 2 + ny * k;
    const d = `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
    const id = 'rm' + (++maskN);
    const mask = el('mask', { id, maskUnits: 'userSpaceOnUse', x: -900, y: -900, width: 2600, height: 2800 }, defs);
    const reveal = el('path', { d, class: 'm-route-reveal' }, mask);
    const line = el('path', { d, class: `m-route m-route-${who}`, mask: `url(#${id})` }, routes);
    const len2 = line.getTotalLength();
    reveal.style.strokeDasharray = len2;
    reveal.style.strokeDashoffset = len2;
    return { line, reveal, len: len2, at: f => { const p = line.getPointAtLength(f * len2); return [p.x, p.y]; } };
  }

  // each step: where each face goes, and the routes that take them there
  const steps = [];
  {
    let fAt = null, aAt = null;
    const trips = {};
    const bendFor = (a, b) => { const key = [a, b].sort().join('|'); return (trips[key] = (trips[key] || 0) + 1); };
    P.steps.forEach(s => {
      const st = { s, legsF: [], legsA: [] };
      [].concat(s.farah || []).forEach(to => {
        if (fAt && fAt !== to) st.legsF.push(route(fAt, to, 'farah', bendFor(fAt, to)));
        fAt = to;
      });
      if (s.ahmed) {
        st.ahmedAppears = !aAt;
        if (!aAt) st.ahmedStart = [].concat(s.ahmed)[0];
        [].concat(s.ahmed).forEach(to => {
          if (aAt && aAt !== to) st.legsA.push(route(aAt, to, 'ahmed', bendFor(aAt, to) + .5));
          aAt = to;
        });
      }
      st.fEnd = fAt; st.aEnd = aAt;
      steps.push(st);
    });
  }

  /* ---------------- story panels ---------------- */
  const photoSlot = () => `<div class="shot empty" aria-hidden="true"><span>${esc(t('photoSlot'))}</span></div>`;
  const shot = ph => {
    const src = typeof ph === 'string' ? ph : ph.src;
    return `<figure class="shot"><img src="${esc(src)}" alt="${esc(L(ph.alt) || '')}" loading="lazy">${ph.caption ? `<figcaption>${esc(L(ph.caption))}</figcaption>` : ''}</figure>`;
  };
  let stepEls = [];
  function renderSteps() {
    $('#steps').innerHTML = P.steps.map((s, i) => `
      <li class="j-step${s.sway ? ' sway' : ''}" data-i="${i}">
        <article class="panel">
          <span class="panel-tag">${esc(L(s.tag))}</span>
          <h2 class="display">${esc(L(s.title))}</h2>
          ${s.quote ? `<blockquote>${esc(L(s.quote))}</blockquote>` : ''}
          <p>${esc(L(s.text))}</p>
          <div class="shots">${(s.photos && s.photos.length) ? s.photos.map(shot).join('') : photoSlot()}</div>
        </article>
      </li>`).join('');
    stepEls = $$('#steps .j-step');
    stepEls.forEach(e => seen.observe(e));
  }
  function renderPeople() {
    $('#people').innerHTML = P.people.list.map(p => `
      <article class="person">
        <img src="${esc(p.img)}" alt="${esc(L(p.name))}" width="680" height="680" loading="lazy">
        <h3 class="display">${esc(L(p.name))}</h3>
        <span class="person-role">${esc(L(p.role))}</span>
        <p>${esc(L(p.bio))}</p>
      </article>`).join('');
  }
  function renderSupport() {
    const k = MG.site.support || {};
    $('#supWays').innerHTML = P.support.ways.map(w => `<li>${esc(L(w))}</li>`).join('');
    $('#supActs').innerHTML = [
      ['donate', k.donate, 'btn sup-donate', '♥'],
      ['kofi', k.kofi, 'btn btn-ghost sup-kofi', '☕']
    ].map(([id, href, cls, ic]) => `<a class="${cls}" data-sup="${id}" href="${href ? esc(href) : '#support'}"${href ? ' target="_blank" rel="noopener"' : ''}><span aria-hidden="true">${ic}</span>${esc(t('support.' + id))}</a>`).join('');
    $$('#supActs a').forEach(a => a.addEventListener('click', e => {
      if (a.getAttribute('href') === '#support') { e.preventDefault(); MG.toast(t('site:ui.supportSoon')); }
    }));
  }
  function renderMapText() {
    $('#mapTitle').textContent = L(P.hero.title);
    seaLabel.textContent = t('map.sea');
    stripLabel.textContent = t('map.strip');
    townLabels.forEach(([n, tw]) => { n.textContent = L(tw.name); });
    placeLabels.forEach(([n, k]) => { n.textContent = L(P.places[k].name); });
    farahT.label.textContent = t('map.farah');
    ahmedT.label.textContent = t('map.ahmed');
    $('#heroImg').alt = t('hero.portraitAlt');
    document.title = `${t('meta.title')} | Mass & Grass`;
  }

  // the panels that rock like a boat only move while they are on screen
  const seen = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('seen', e.isIntersecting)), { threshold: .15 });

  /* ---------------- scroll → journey ---------------- */
  const cam = { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1, ready: false };
  let lastNote = null;
  function frame() {
    const vh = innerHeight, narrow = innerWidth < 900;
    // a step plays while its panel rises from the bottom of the screen toward the middle
    const top0 = narrow ? vh * .98 : vh * .88, span = narrow ? vh * .4 : vh * .42;
    let fPos = null, aPos = null, aOn = 0, cur = 0, fMood = 'calm', aMood = 'calm', dark = 0;
    const focus = [];
    steps.forEach((st, i) => {
      const e = stepEls[i]; if (!e) return;
      const r = e.querySelector('.panel').getBoundingClientRect();
      const p = i === 0 ? 1 : clamp((top0 - r.top) / span);
      const q = reduced ? (p > 0 ? 1 : 0) : ease(p);
      if (p > 0) cur = i;
      const past = p >= 1 && i < steps.length - 1 && stepEls[i + 1] && clamp((top0 - stepEls[i + 1].querySelector('.panel').getBoundingClientRect().top) / span) >= 1;
      [...st.legsF, ...st.legsA].forEach(lg => lg.line.classList.toggle('old', past));
      const n = st.legsF.length;
      st.legsF.forEach((lg, k) => {
        const f = clamp(q * n - k);
        lg.reveal.style.strokeDashoffset = lg.len * (1 - f);
        if (p > 0 && f > 0) fPos = lg.at(f);
      });
      if (p > 0 && (!n || q >= 1)) fPos = place(st.fEnd);
      if (p > 0 && p < 1 && n) focus.push(place(st.fEnd));
      // Ahmed: when he first appears he fades in where he starts, then walks his legs
      const na = st.legsA.length, qa = st.ahmedAppears && na ? clamp((q - .35) / .65) : q;
      st.legsA.forEach((lg, k) => {
        const f = clamp(qa * na - k);
        lg.reveal.style.strokeDashoffset = lg.len * (1 - f);
        if (p > 0 && f > 0) aPos = lg.at(f);
      });
      if (st.s.ahmed && p > 0) {
        if (!na || qa >= 1) aPos = place(st.aEnd);
        else if (st.ahmedAppears && qa <= 0) aPos = place(st.ahmedStart);
        if (p < 1) focus.push(place(st.aEnd));
        aOn = st.ahmedAppears ? clamp(q / .35) : 1;
      }
      // mood and darkness follow the step that is taking over
      if (p > .45) { fMood = st.s.mood || fMood; aMood = st.s.ahmedMood || aMood; }
      if (p > 0) dark = lerp(dark, st.s.dark || 0, q);
      if (st.s.bombed) ruin.setAttribute('opacity', (p > 0 ? q : 0).toFixed(3));
    });
    farahT.setMood(fMood); ahmedT.setMood(aMood);
    dim.setAttribute('opacity', (dark * .42).toFixed(3));
    $('.gz-journey').style.setProperty('--dark', dark.toFixed(3));
    show(farahT, fPos, fPos ? 1 : 0);
    show(ahmedT, aPos, aPos ? aOn : 0);

    // the camera frames whoever is on the map and where they are heading
    const pts = [fPos, aOn > .5 ? aPos : null, ...focus].filter(Boolean);
    if (pts.length) {
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const box = svg.getBoundingClientRect(), aspect = box.width / Math.max(1, box.height);
      // units of the 800×1000 viewBox actually visible across and down (xMidYMid meet)
      const visW = aspect > .8 ? 1000 * aspect : 800, visH = visW / aspect;
      const needW = Math.max(...xs) - Math.min(...xs) + 180, needH = Math.max(...ys) - Math.min(...ys) + 200;
      cam.tz = clamp(Math.min(visW / needW, visH / needH), 1, 3.2);
      cam.tx = (Math.min(...xs) + Math.max(...xs)) / 2; cam.ty = (Math.min(...ys) + Math.max(...ys)) / 2;
      if (!cam.ready) { cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; cam.ready = true; }
    }
    if (cur !== lastNote) { lastNote = cur; $('#mapNote').textContent = L(P.steps[cur].tag); }
    kick();
  }
  function show(tk, pos, on) {
    if (pos) { tk.x = pos[0]; tk.y = pos[1]; }
    tk.g.setAttribute('opacity', on.toFixed(3));
  }

  // the camera eases toward its target every frame until it settles
  let raf = 0;
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }
  function tick() {
    raf = 0;
    const k = reduced ? 1 : .12;
    cam.x = lerp(cam.x, cam.tx, k); cam.y = lerp(cam.y, cam.ty, k); cam.z = lerp(cam.z, cam.tz, k);
    world.setAttribute('transform', `translate(400 500) scale(${cam.z.toFixed(4)}) translate(${(-cam.x).toFixed(2)} ${(-cam.y).toFixed(2)})`);
    // faces and labels keep their size while the map zooms in
    // one map unit on screen is cam.z × (how much the 800×1000 view is scaled to fit the pane)
    const box = svg.getBoundingClientRect(), fitS = Math.min(box.width / 800, box.height / 1000) || 1;
    const inv = 1 / (cam.z * fitS);
    const face = (innerWidth < 900 ? 46 : 58) / 38;   // the faces are ~46–58px across on screen
    // when both stand in one place they stand side by side, not on top of each other
    const both = +farahT.g.getAttribute('opacity') > .5 && +ahmedT.g.getAttribute('opacity') > .5;
    const gap = Math.hypot(farahT.x - ahmedT.x, farahT.y - ahmedT.y) / inv;   // in screen px
    const push = both ? Math.max(0, 62 - gap) / 2 * inv : 0;
    const side = farahT.x <= ahmedT.x ? -1 : 1;
    [[farahT, side], [ahmedT, -side]].forEach(([tk, d]) => tk.g.setAttribute('transform', `translate(${(tk.x + d * push).toFixed(2)} ${tk.y.toFixed(2)}) scale(${(inv * face).toFixed(4)})`));
    ruin.setAttribute('transform', `translate(${place('jalaa').join(' ')}) scale(${(inv * 1.6).toFixed(4)}) translate(${place('jalaa').map(v => -v).join(' ')})`);
    svg.style.setProperty('--inv', inv.toFixed(4));
    // a place's name steps aside (fades) while a face stands on it
    placeLabels.forEach(([n, k]) => {
      const [x, y] = place(k);
      const near = [farahT, ahmedT].some(tk => +tk.g.getAttribute('opacity') > .3 && Math.hypot(tk.x - x, tk.y - y) / inv < 44);
      n.style.opacity = near ? .15 : '';
    });
    if (Math.abs(cam.x - cam.tx) + Math.abs(cam.y - cam.ty) > .05 || Math.abs(cam.z - cam.tz) > .001) kick();
  }

  function sizeHead() {
    const h = $('.site-head'); if (h) document.documentElement.style.setProperty('--head', h.offsetHeight + 'px');
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { ticking = false; frame(); });
  }, { passive: true });
  addEventListener('resize', () => { sizeHead(); frame(); }, { passive: true });

  /* ---------------- reveal on scroll ---------------- */
  const reveal = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); }
  }), { threshold: .15 });
  $$('.rv, .stroke').forEach(n => reveal.observe(n));

  function render() { renderMapText(); renderSteps(); renderPeople(); renderSupport(); frame(); }
  sizeHead();
  render();
  MG.onLang(render);
});
