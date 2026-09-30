/* Mass & Grass — story page.
   Farah is a layered-paper cut-out, drawn as a real sheet of paper (WebGL,
   paperfold.js) that folds and unfolds with the scroll. In the hero she says
   hello and folds away as you scroll on. On desktop she then travels with the
   story: while a chapter is read she stands beside it; halfway to the next one
   she folds up like a letter (top over bottom, then in half again), slides
   across to the side the text leaves empty and unfolds as the next pose. On
   phones each chapter has its own Farah, unfolding as it comes up the screen
   and folding again as it leaves. Tap her for a line. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const P = MG.page;
  const reduced = MG.reduced;
  const src = pose => P.poses[pose];   // paths live in content so previews can inline them
  const rtl = () => document.documentElement.dir === 'rtl';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = x => x * x * (3 - 2 * x);

  /* ---------------- a paper fold ----------------
     Each cut-out is a WebGL sheet (paperfold.js) laid over its box with room
     around it for the flaps to swing toward you. Without WebGL the picture
     simply shows. */
  function Fold(host, image) {
    const cv = document.createElement('canvas');
    cv.className = 'paper';
    cv.setAttribute('aria-hidden', 'true');
    host.appendChild(cv);
    const pf = window.PaperFold && PaperFold(cv, { margin: [.35, .25] });
    if (!pf) {
      cv.remove(); host.classList.add('nogl');
      const show = img => { const s = $('.sizer', host); if (s) s.src = img; else host.style.backgroundImage = `url("${img}")`; };
      show(image);
      return { set: show, angle() {}, mirror: b => host.classList.toggle('flip', !!b) };
    }
    pf.image(image);
    Object.values(P.poses).forEach(u => pf.preload(u));
    return { set: img => pf.image(img), angle: deg => pf.fold(reduced ? 0 : deg / 90), mirror: b => pf.mirror(b) };
  }

  /* ---------------- chapters ---------------- */
  // phones: no room for her to walk beside the text, so she stands at the head of each scene
  const inline = p => `<button class="chap-farah" type="button" tabindex="-1" aria-hidden="true" data-pose="${p}"><img class="sizer" src="${src(p)}" alt="" draggable="false"><span class="bubble"></span></button>`;
  $$('section[data-pose] .wrap').forEach(w => w.insertAdjacentHTML('afterbegin', inline(w.parentNode.dataset.pose)));

  let inlines = [];
  function render() {
    $('#road').innerHTML = P.chapters.map(c => `
      <li class="chap rv" data-side="${c.side}" data-pose="${c.pose}" data-id="${c.id}" style="--c:${c.color}">
        ${inline(c.pose)}
        <span class="chap-tag">${esc(L(c.tag))}</span>
        <h2 class="display ink">${esc(L(c.title))}</h2>
        ${c.quote ? `<blockquote class="ink">${esc(L(c.quote))}</blockquote>` : ''}
        <p class="ink">${esc(L(c.text))}</p>
      </li>`).join('');
    $('#heroImg').alt = t('hero.portraitAlt');
    document.title = `${t('meta.title')} | Mass & Grass`;
    $$('#road .rv').forEach(el => reveal.observe(el));
    inlines = $$('.chap-farah').map(b => ({ el: b }));   // their folds are made once they are visible (phones only)
    inkAll();
    $$('#road .chap').forEach(g => pen.observe(g));
    measure();
  }
  const sayFor = el => {
    if (el.dataset.say) return t(el.dataset.say);
    const c = P.chapters.find(x => x.id === el.dataset.id);
    return c ? L(c.say) : '';
  };
  function say(text, where, ms = 3200) {
    if (!text) return;
    where.textContent = text;
    where.classList.add('on');
    clearTimeout(where._t); where._t = setTimeout(() => where.classList.remove('on'), ms);
  }
  function hush(where) { clearTimeout(where._t); where.classList.remove('on'); }
  function hop(el) {
    el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop');
    setTimeout(() => el.classList.remove('hop'), 620);
  }

  /* ---------------- Farah writes the words ----------------
     Every .ink element is split into words; when its scene reaches the middle
     of the screen the words are revealed one after another in the direction of
     writing, each taking time by its length, while a wet brush tip (#nib)
     moves along the line. */
  const nib = $('#nib');
  const written = new WeakSet();
  function inkify(el) {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map(w => `<span class="w" aria-hidden="true">${esc(w)}</span>`).join(' ');
  }
  function inkAll() { $$('.ink').forEach(el => { if (!el.querySelector('.w')) inkify(el); }); }
  let penRun = 0;
  function write(g, instant) {
    if (!g || (written.has(g) && !instant)) return;
    written.add(g);
    const words = $$('.ink .w', g);
    if (reduced || instant) { words.forEach(w => { w.style.removeProperty('--d'); w.style.removeProperty('--t'); }); g.classList.add('inked'); return; }
    // each word takes time by its length; a long passage is sped up so no scene takes much over 7s
    const cost = w => 40 + w.textContent.length * 26;
    const raw = words.reduce((a, w) => a + cost(w), 0);
    const k = Math.min(1, 7000 / raw);
    let t0 = 0, prev = null;
    const plan = words.map(w => {
      const block = w.parentNode;
      if (prev && block !== prev) t0 += 260;          // lifts the brush between lines of thought
      prev = block;
      const d = cost(w) * k;
      w.style.setProperty('--d', t0 + 'ms'); w.style.setProperty('--t', d + 'ms');
      const step = [t0, d, w]; t0 += d; return step;
    });
    g.classList.add('inked');
    const run = ++penRun, start = performance.now();
    const writer = g.closest('.chap, section, .hero') && !g.closest('.hero') ? farah : null;
    if (writer) writer.classList.add('writing');
    nib.classList.add('on');
    (function tick(now) {
      if (run !== penRun) return;
      const e = now - start;
      const step = plan.find(([a, d]) => e < a + d) || plan[plan.length - 1];
      const r = step[2].getBoundingClientRect();
      const f = clamp((e - step[0]) / step[1]);
      const x = rtl() ? r.right - f * r.width : r.left + f * r.width;
      nib.style.transform = `translate3d(${x}px,${r.top + r.height * .6}px,0)`;
      if (e < t0 + 120) requestAnimationFrame(tick);
      else { nib.classList.remove('on'); if (writer) writer.classList.remove('writing'); }
    })(start);
  }
  const pen = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { write(e.target); pen.unobserve(e.target); }
  }), { rootMargin: '-22% 0px -30% 0px' });

  /* ---------------- hero ---------------- */
  const heroBtn = $('#heroFarah'), heroBubble = $('#heroBubble');
  const heroFold = Fold(heroBtn, src('hello'));
  heroFold.mirror(!rtl());
  $('#heroImg').src = src('hello');
  heroBtn.addEventListener('click', () => { hop(heroBtn); say(t('hero.say'), heroBubble); });

  /* ---------------- the travelling cut-out (desktop) ---------------- */
  const farah = $('#farah'), card = $('#farahCard'), bubble = $('#bubble');
  const cardFold = Fold(card, src(P.chapters[0].pose));
  const ratio = {};
  Object.entries(P.poses).forEach(([k, u]) => {
    const im = new Image();
    im.onload = () => { ratio[k] = im.naturalWidth / im.naturalHeight; frame(); };
    im.src = u;
  });

  let scenes = [], anchors = [], heroEnd = 0, shown = -1, cardPose = null;
  // Farah stands on the side the text leaves empty
  function physical(textSide) { return ((textSide === 'start') === rtl()) ? 'left' : 'right'; }
  function xFor(s) {
    const w = farah.offsetWidth, g = Math.max(12, innerWidth * .04);
    return s === 'left' ? g : innerWidth - w - g;
  }
  const docTop = el => el.getBoundingClientRect().top + scrollY;
  function measure() {
    scenes = [...$$('#road .chap'), ...$$('section[data-pose]')];
    anchors = scenes.map(el => docTop(el) + el.offsetHeight / 2 - innerHeight / 2);
    const hs = $('.hero');
    heroEnd = docTop(hs) + hs.offsetHeight * .62;
    frame();
  }
  // the poses face left; on the left of the page she turns to face the text
  let cardMirror = null;
  function showPose(p, side) {
    const m = side === 'left';
    if (m !== cardMirror) { cardMirror = m; cardFold.mirror(m); }
    if (p === cardPose) return;
    cardPose = p;
    cardFold.set(src(p));
    if (ratio[p]) card.style.setProperty('--ar', ratio[p]);
  }

  let footOn = false;
  function frame() {
    const y = scrollY;
    // the hero cut-out folds away as the hero leaves
    heroFold.angle(90 * ease(clamp(y / heroEnd)));
    if (heroFold._hushed !== y > 40) { heroFold._hushed = y > 40; if (y > 40) hush(heroBubble); }

    // phones: each chapter's Farah unfolds on the way in and folds on the way out
    for (const it of inlines) {
      const el = it.el;
      if (!el.offsetWidth) continue;
      const fold = it.fold || (it.fold = el._fold || (el._fold = Fold(el, src(el.dataset.pose))));
      const r = el.getBoundingClientRect();
      fold.mirror(r.left + r.width / 2 < innerWidth / 2);
      const inP = clamp((innerHeight - r.top) / (innerHeight * .4));
      const outP = clamp(r.bottom / (innerHeight * .28));
      fold.angle(90 * (1 - ease(Math.min(inP, outP))));
    }

    if (!farah.offsetWidth || !anchors.length) return;
    const phys = scenes.map(el => physical(el.dataset.side || 'end'));
    const sides = phys.map(xFor);
    let pose, deg, x, settled = -1, face;
    const start = heroEnd, a0 = anchors[0];
    if (y < a0) {
      // coming out of the hero: the first pose unfolds
      const q = clamp((y - start) / Math.max(1, (a0 - start) * .7));
      pose = scenes[0].dataset.pose; deg = 90 * (1 - ease(q)); x = sides[0]; face = phys[0];
      farah.classList.toggle('away', y < start - 4);
      if (q >= 1) settled = 0;
    } else {
      farah.classList.remove('away');
      let i = anchors.length - 1;
      for (let k = 0; k < anchors.length - 1; k++) if (y < anchors[k + 1]) { i = k; break; }
      if (i === anchors.length - 1) { pose = scenes[i].dataset.pose; deg = 0; x = sides[i]; face = phys[i]; settled = i; }
      else {
        // hold each pose while its chapter is read; fold in the middle of the way between
        const p = (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
        const q = clamp((p - .22) / .56);
        const first = q < .5;
        pose = scenes[first ? i : i + 1].dataset.pose;
        face = phys[first ? i : i + 1];
        deg = 90 * ease(first ? q / .5 : (1 - q) / .5);
        x = sides[i] + (sides[i + 1] - sides[i]) * ease(clamp((q - .3) / .4));   // crosses while nearly flat
        if (q === 0) settled = i; else if (q === 1) settled = i + 1;
      }
    }
    if (footOn) farah.classList.add('away');
    showPose(pose, face);
    cardFold.angle(deg);
    farah.style.setProperty('--x', x + 'px');
    farah.classList.toggle('bub-left', x < innerWidth / 2);
    farah.classList.toggle('bub-right', x >= innerWidth / 2);
    if (deg > 8) hush(bubble);
    shown = settled;
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { ticking = false; frame(); });
  }, { passive: true });
  addEventListener('resize', measure, { passive: true });
  if (document.fonts) document.fonts.ready.then(measure);
  addEventListener('load', measure);

  card.addEventListener('click', () => {
    hop(farah);
    if (shown >= 0) say(sayFor(scenes[shown]), bubble);
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('.chap-farah'); if (!b) return;
    hop(b); say(sayFor(b.closest('[data-pose]:not(.chap-farah)')), $('.bubble', b));
  });

  new IntersectionObserver(([e]) => { footOn = e.isIntersecting; frame(); },
    { rootMargin: '0px 0px -35% 0px' }).observe($('.foot'));

  /* ---------------- reveal on scroll ---------------- */
  const reveal = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); }
  }), { threshold: .15 });
  $$('.rv, .stroke').forEach(el => reveal.observe(el));
  reveal.observe($('#road'));

  render();
  MG.onLang(() => {
    render();
    heroFold.mirror(!rtl());
    // what she already wrote stays written in the other language
    [$('.hero-copy'), $('section.name .wrap'), $('section.close .wrap')].forEach(g => { if (written.has(g)) write(g, true); });
  });
  farah.classList.add('away');
  [$('.hero-copy'), $('section.name .wrap'), $('section.close .wrap')].forEach(g => pen.observe(g));
});
