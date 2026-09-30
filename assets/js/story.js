/* Mass & Grass — story page.
   Farah is a paper cut-out. In the hero she says hello; once you scroll into
   the story she comes along at the bottom of the screen, and for every
   chapter she changes pose (turning like a paper doll) and walks across to
   the side the text leaves empty. Tap her and she hops and says a line. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const P = MG.page;
  const reduced = MG.reduced;
  const src = pose => `/assets/products/story/farah-${pose}.webp`;
  const rtl = () => document.documentElement.dir === 'rtl';

  /* ---------------- chapters ---------------- */
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
    $$('#road .chap').forEach(el => watch.observe(el));
  }
  // phones: no room for her to walk beside the text, so she stands at the head of each scene
  const inline = p => `<button class="chap-farah" type="button" tabindex="-1" aria-hidden="true"><img src="${src(p)}" alt="" draggable="false"><span class="bubble"></span></button>`;
  $$('section[data-pose] .wrap').forEach(w => w.insertAdjacentHTML('afterbegin', inline(w.parentNode.dataset.pose)));
  document.addEventListener('click', e => {
    const b = e.target.closest('.chap-farah'); if (!b) return;
    hop(b); say(sayFor(b.closest('[data-pose]')), $('.bubble', b));
  });
  const sayFor = el => {
    if (el.dataset.say) return t(el.dataset.say);
    const c = P.chapters.find(x => x.id === el.dataset.id);
    return c ? L(c.say) : '';
  };

  /* ---------------- the travelling cut-out ---------------- */
  const farah = $('#farah'), card = $('#farahCard'), bubble = $('#bubble');
  const imgs = {};
  P.poses.forEach(p => {
    const im = new Image();
    im.src = src(p); im.alt = ''; im.draggable = false; im.decoding = 'async';
    im.onload = () => { if (p === pose) fitCard(); };
    card.appendChild(im); imgs[p] = im;
  });

  let pose = null, side = null, scene = null, walkT, turnT, bubT;
  function fitCard() {
    const im = imgs[pose];
    if (im && im.naturalWidth) card.style.setProperty('--ar', im.naturalWidth / im.naturalHeight);
  }
  function setPose(p) {
    if (p === pose) return;
    const first = pose === null;
    pose = p;
    const swap = () => { Object.entries(imgs).forEach(([k, im]) => im.classList.toggle('on', k === p)); fitCard(); };
    if (first || reduced) return swap();
    farah.classList.remove('turn'); void farah.offsetWidth; farah.classList.add('turn');
    clearTimeout(turnT); turnT = setTimeout(swap, 190);   // swap while the paper is edge-on
    setTimeout(() => farah.classList.remove('turn'), 450);
  }
  // Farah stands on the side the text leaves empty
  function physical(textSide) {
    const textRight = (textSide === 'start') === rtl();
    return textRight ? 'left' : 'right';
  }
  function xFor(s) {
    const w = farah.offsetWidth, g = Math.max(12, innerWidth * .04);
    return s === 'left' ? g : innerWidth - w - g;
  }
  function setSide(s, instant) {
    const from = side; side = s;
    const x = xFor(s);
    farah.classList.toggle('bub-left', s === 'left');
    farah.classList.toggle('bub-right', s === 'right');
    if (instant || from === null || reduced) {
      farah.style.setProperty('--walk', '0s');
      farah.style.setProperty('--x', x + 'px');
      void farah.offsetWidth; farah.style.removeProperty('--walk');
      return;
    }
    if (from === s) return;
    // walk across, facing the way she goes (the cut-outs face right by default)
    const dur = Math.min(1.8, .7 + Math.abs(x - xFor(from)) / 900);
    farah.style.setProperty('--walk', dur + 's');
    farah.classList.toggle('left', s === 'left');
    farah.classList.add('walking');
    farah.style.setProperty('--x', x + 'px');
    clearTimeout(walkT);
    walkT = setTimeout(() => { farah.classList.remove('walking', 'left'); }, dur * 1000);
  }
  function say(text, where = bubble, ms = 3200) {
    if (!text) return;
    where.textContent = text;
    where.classList.add('on');
    clearTimeout(where._t); where._t = setTimeout(() => where.classList.remove('on'), ms);
  }
  function hop(el) {
    el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop');
    setTimeout(() => el.classList.remove('hop'), 620);
  }
  function enter(el) {
    if (scene === el) return;
    scene = el;
    setPose(el.dataset.pose);
    setSide(physical(el.dataset.side || 'end'));
    clearTimeout(bubT);
    bubT = setTimeout(() => say(sayFor(el)), reduced ? 0 : 900);
    vis();
  }

  card.addEventListener('click', () => { hop(farah); if (scene) say(sayFor(scene)); });

  /* hero: the big cut-out says hello */
  const heroBtn = $('#heroFarah'), heroBubble = $('#heroBubble');
  heroBtn.addEventListener('click', () => {
    heroBtn.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-26px) rotate(-3deg)' }, { transform: 'none' }],
      { duration: reduced ? 0 : 520, easing: 'cubic-bezier(.2,.8,.3,1)' });
    say(t('hero.say'), heroBubble);
  });
  setTimeout(() => say(t('hero.say'), heroBubble, 3600), reduced ? 0 : 900);

  /* which scene is on screen: the one crossing the middle of the viewport */
  const watch = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) enter(e.target); }),
    { rootMargin: '-45% 0px -45% 0px' });
  $$('[data-pose]').filter(el => el.tagName === 'SECTION').forEach(el => watch.observe(el));

  /* she hides while the big hello is on screen, and before the footer */
  let heroOn = true, footOn = false;
  const vis = () => farah.classList.toggle('away', heroOn || footOn || !scene);
  new IntersectionObserver(([e]) => { heroOn = e.isIntersecting; vis(); }, { threshold: .5 }).observe($('#heroFarah'));
  new IntersectionObserver(([e]) => { footOn = e.isIntersecting; vis(); }, { rootMargin: '0px 0px -35% 0px' }).observe($('.foot'));

  addEventListener('resize', () => { if (side) setSide(side, true); }, { passive: true });

  /* ---------------- reveal on scroll ---------------- */
  const reveal = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); }
  }), { threshold: .15 });
  $$('.rv, .stroke').forEach(el => reveal.observe(el));
  reveal.observe($('#road'));

  render();
  MG.onLang(() => { render(); if (side) setSide(side, true); });
  farah.classList.add('away');
});
