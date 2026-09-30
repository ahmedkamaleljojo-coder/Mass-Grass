/* Mass & Grass — story page.
   Farah is a paper cut-out that folds and unfolds with the scroll. Every
   picture of her is cut into strips that fold like an accordion toward her
   feet: as you scroll from one chapter to the next, the current pose folds
   flat, slides across to the side the text leaves empty, and the next pose
   unfolds there. On phones each chapter has its own Farah, unfolding as it
   comes up the screen and folding again as it leaves. Tap her for a line. */
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
     n horizontal strips of one image. Strip j (counted from the bottom) folds
     about its bottom edge, alternately away from and toward you, so the sheet
     zig-zags down onto the ground line like an accordion. */
  const STRIPS = 4;
  function Fold(host, image) {
    const layer = document.createElement('span');
    layer.className = 'fold';
    const strips = [];
    for (let k = 0; k < STRIPS; k++) {
      const s = document.createElement('i');
      s.style.cssText = `top:${k * 100 / STRIPS}%;height:${100 / STRIPS + .6}%;background-position:50% ${k / (STRIPS - 1) * 100}%;background-size:100% ${STRIPS * 100}%`;
      layer.appendChild(s); strips.unshift(s);        // strips[0] is the bottom one
    }
    host.appendChild(layer);
    let h = 0, cur = null, last = -1;
    const size = () => { h = layer.offsetHeight / STRIPS; last = -1; };
    new ResizeObserver(size).observe(layer);
    const api = {
      set(img) {
        if (img === cur) return;
        cur = img;
        strips.forEach(s => { s.style.backgroundImage = `url("${img}")`; });
      },
      angle(deg) {
        deg = reduced ? 0 : clamp(deg, 0, 90);
        if (Math.abs(deg - last) < .05) return;
        last = deg;
        const r = deg * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r);
        layer.style.visibility = deg > 89.5 ? 'hidden' : '';
        strips.forEach((s, j) => {
          const odd = j % 2 === 1;
          if (deg < .05) { s.style.transform = s.style.filter = ''; return; }   // flat sheet: no seams
          s.style.transform = `translate3d(0,${j * h * (1 - c)}px,${odd ? -h * sn : 0}px) rotateX(${odd ? -deg : deg}deg)`;
          // the strips tipped away catch the light, the ones tipped toward you fall into shade
          s.style.filter = `brightness(${odd ? 1 - .55 * sn : 1 + .06 * sn})`;
        });
      },
    };
    size(); api.set(image); api.angle(0);
    return api;
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
        <h2 class="display">${esc(L(c.title))}</h2>
        ${c.quote ? `<blockquote>${esc(L(c.quote))}</blockquote>` : ''}
        <p>${esc(L(c.text))}</p>
      </li>`).join('');
    $('#heroImg').alt = t('hero.portraitAlt');
    document.title = `${t('meta.title')} | Mass & Grass`;
    $$('#road .rv').forEach(el => reveal.observe(el));
    inlines = $$('.chap-farah').map(b => ({ el: b, fold: b._fold || (b._fold = Fold(b, src(b.dataset.pose))) }));
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

  /* ---------------- hero ---------------- */
  const heroBtn = $('#heroFarah'), heroBubble = $('#heroBubble');
  const heroFold = Fold(heroBtn, src('hello'));
  $('#heroImg').src = src('hello');
  heroBtn.addEventListener('click', () => { hop(heroBtn); say(t('hero.say'), heroBubble); });
  setTimeout(() => say(t('hero.say'), heroBubble, 3600), reduced ? 0 : 900);

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
  function showPose(p) {
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
    for (const { el, fold } of inlines) {
      if (!el.offsetWidth) continue;
      const r = el.getBoundingClientRect();
      const inP = clamp((innerHeight - r.top) / (innerHeight * .4));
      const outP = clamp(r.bottom / (innerHeight * .28));
      fold.angle(90 * (1 - ease(Math.min(inP, outP))));
    }

    if (!farah.offsetWidth || !anchors.length) return;
    const sides = scenes.map(el => xFor(physical(el.dataset.side || 'end')));
    let pose, deg, x, settled = -1;
    const start = heroEnd, a0 = anchors[0];
    if (y < a0) {
      // coming out of the hero: the first pose unfolds
      const q = clamp((y - start) / Math.max(1, (a0 - start) * .7));
      pose = scenes[0].dataset.pose; deg = 90 * (1 - ease(q)); x = sides[0];
      farah.classList.toggle('away', y < start - 4);
      if (q >= 1) settled = 0;
    } else {
      farah.classList.remove('away');
      let i = anchors.length - 1;
      for (let k = 0; k < anchors.length - 1; k++) if (y < anchors[k + 1]) { i = k; break; }
      if (i === anchors.length - 1) { pose = scenes[i].dataset.pose; deg = 0; x = sides[i]; settled = i; }
      else {
        // hold each pose while its chapter is read; fold in the middle of the way between
        const p = (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
        const q = clamp((p - .22) / .56);
        const first = q < .5;
        pose = scenes[first ? i : i + 1].dataset.pose;
        deg = 90 * ease(first ? q / .5 : (1 - q) / .5);
        x = sides[i] + (sides[i + 1] - sides[i]) * ease(clamp((q - .3) / .4));   // crosses while nearly flat
        if (q === 0) settled = i; else if (q === 1) settled = i + 1;
      }
    }
    if (footOn) farah.classList.add('away');
    showPose(pose);
    cardFold.angle(deg);
    farah.style.setProperty('--x', x + 'px');
    farah.classList.toggle('bub-left', x < innerWidth / 2);
    farah.classList.toggle('bub-right', x >= innerWidth / 2);
    if (deg > 8) hush(bubble);
    if (settled !== shown) {
      shown = settled;
      if (settled >= 0) setTimeout(() => { if (shown === settled) say(sayFor(scenes[settled]), bubble); }, 350);
    }
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
  MG.onLang(render);
  farah.classList.add('away');
});
