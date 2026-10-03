/* Mass & Grass — a vision for the home page: the motion.
   One scroll loop reads each scene's progress and hands it to CSS as variables; everything moves
   on transform and opacity only. Lenis smooths the scroll; the boat is coloured in with the
   site's watercolour engine. Without motion (reduced motion) every scene shows its final state. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;

  /* ---------------- content ---------------- */
  const PAINTINGS = [
    ['boat-colour', 'القارب', 'الزوايدة'], ['cart', 'كل ما استطعنا حمله', 'النزوح'], ['girl-birds', 'الفتاة التي أرادت الطائر', 'حلم'],
    ['fishing', 'صيد في بحر غزة', 'البحر', 1], ['tent-coast', 'ساحل غزة', 'الخيمة'], ['alley', 'مخيم المغازي', 'المخيم', 1],
    ['house', 'بيت النزوح', 'البيت'], ['ramadan', 'شرارات رمضان', 'الليل', 1], ['girl-oud', 'تأمّل', 'العود', 1]
  ];
  const LIVES = [
    ['print-boat', 'لوحة مطبوعة', 4], ['card-gaza', 'بطاقة بريدية', -5], ['tote-lemon', 'حقيبة قماشية', 3],
    ['hoodie-folded', 'هودي', -4], ['calendar', 'التقويم السنوي', 5]
  ];
  const SHOP = [
    ['اللوحات', 'print-boat', '9 لوحات'], ['الملصقات', 'st-lemon', '12 ملصقاً'], ['التقويم السنوي', 'calendar', '12 شهراً'],
    ['الملابس والحقائب', 'hoodie-folded', '12 قطعة'], ['البطاقات البريدية', 'card-jaffa', '8 بطاقات']
  ];
  const img = n => `img/${n}.webp`;
  const two = n => String(n).padStart(2, '0');

  /* ---------------- build the scenes ---------------- */
  $('#gTrack').innerHTML = PAINTINGS.map(([f, t, k, tall], i) => `
    <figure class="g-item${tall ? ' tall' : ''}" style="--r:${[-1.2, .8, -.6, 1.1, -.9, .5][i % 6]}deg;--dy:${[0, 24, -10, 14, -4, 30][i % 6]}px">
      <div class="print"><img src="${img(f)}" alt="${t}" loading="lazy" decoding="async"></div>
      <figcaption><span>${t}</span><span class="mono">${two(i + 1)} — ${k}</span></figcaption>
    </figure>`).join('');
  $('#lStage').innerHTML = LIVES.map(([f, , r]) => `<img src="${img(f)}" alt="" style="--r:${r}deg" decoding="async">`).join('');
  $('#lList').innerHTML = LIVES.map(([, t], i) => `<li><span class="mono">${two(i + 1)}</span>${t}</li>`).join('');
  $('#ix').innerHTML = SHOP.map(([t, f, c], i) => `
    <li><a href="#" data-img="${img(f)}" data-link>
      <span class="n mono">${two(i + 1)}</span><span class="t">${t}</span>
      <span class="c mono">${c}</span><img class="thumb" src="${img(f)}" alt="" loading="lazy">
    </a></li>`).join('');
  // the hero title and the manifesto, word by word
  $$('.h-title .w').forEach((w, i) => w.style.setProperty('--i', i));
  const mText = $('#mText');
  mText.innerHTML = mText.textContent.trim().split(/\s+/).map(w => `<span class="mw">${w}</span>`).join(' ');
  const mWords = $$('.mw', mText);
  $$('.reveal-lines').forEach(el => {
    el.innerHTML = el.innerHTML.trim().split(/\s+/).map((w, i) => `<span class="wl" style="--i:${i}">${w}</span>`).join(' ');
  });

  /* ---------------- the boat: pencil, then watercolour ---------------- */
  const W = window.Watercolor, cv = $('#boat'), ctx = cv.getContext('2d');
  const pencil = new Image(), colour = new Image();
  pencil.src = img('boat-pencil'); colour.src = img('boat-colour');
  const mask = document.createElement('canvas'), mk = mask.getContext('2d');
  let bw = 0, bh = 0, blooms = [], painting = false;
  function sizeBoat() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    bw = cv.clientWidth; bh = cv.clientHeight;
    const keep = mask.width ? (() => { const c = document.createElement('canvas'); c.width = mask.width; c.height = mask.height; c.getContext('2d').drawImage(mask, 0, 0); return c; })() : null;
    cv.width = mask.width = Math.max(1, Math.round(bw * dpr)); cv.height = mask.height = Math.max(1, Math.round(bh * dpr));
    mk.setTransform(1, 0, 0, 1, 0, 0); if (keep) mk.drawImage(keep, 0, 0, mask.width, mask.height);
    mk.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBoat();
  }
  function drawBoat() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-in'; if (colour.complete) ctx.drawImage(colour, 0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'destination-over'; if (pencil.complete) ctx.drawImage(pencil, 0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'source-over';
  }
  function bloomLoop() { blooms = blooms.filter(b => !b.step(1)); drawBoat(); if (blooms.length) requestAnimationFrame(bloomLoop); else painting = false; }
  function dab(x, y, big) {
    const r = Math.max(bw, bh) * (big ? .095 : .06) * (.75 + Math.random() * .5);
    blooms.push(W.bloom(mk, { x, y, radius: r, color: '#000000', layers: 13, alpha: .27, spread: .5, sides: 8, edges: false, blend: 'source-over' }));
    if (!painting) { painting = true; requestAnimationFrame(bloomLoop); }
  }
  async function paintBoat() {
    if (reduced) { mk.save(); mk.setTransform(1, 0, 0, 1, 0, 0); mk.fillRect(0, 0, mask.width, mask.height); mk.restore(); drawBoat(); return; }
    const rows = 4, cols = 7;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cc = r % 2 ? c : cols - 1 - c;
      dab(((cc + .5) / cols + (Math.random() - .5) * .05) * bw, ((r + .5) / rows + (Math.random() - .5) * .06) * bh, true);
      await new Promise(res => setTimeout(res, 75));
    }
    await new Promise(res => setTimeout(res, 800));
    for (let k = 0; k < 24; k++) {
      mk.save(); mk.setTransform(1, 0, 0, 1, 0, 0); mk.globalAlpha = .12; mk.fillRect(0, 0, mask.width, mask.height); mk.restore();
      drawBoat(); await new Promise(res => requestAnimationFrame(res));
    }
  }
  let last = null;
  cv.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' && !e.buttons) return;
    const p = { x: e.offsetX, y: e.offsetY };
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > bw * .02) { dab(p.x, p.y, false); last = p; }
  });
  cv.addEventListener('pointerleave', () => { last = null; });
  [pencil, colour].forEach(i => i.addEventListener('load', drawBoat));
  addEventListener('resize', sizeBoat);

  /* ---------------- smooth scroll ---------------- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: .085, wheelMultiplier: .9 });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  $$('[data-link]').forEach(a => a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href.startsWith('#') && href.length > 1) { e.preventDefault(); lenis ? lenis.scrollTo(href, { offset: -20, duration: 1.6 }) : $(href).scrollIntoView({ behavior: 'smooth' }); return; }
    if (href === '#') {   // a collection: ink covers the page, as it would before opening another page
      e.preventDefault(); const w = $('#wipe'); w.classList.add('on'); setTimeout(() => w.classList.remove('on'), 900);
    }
  }));

  /* ---------------- one loop for every scene ---------------- */
  const top = $('#top'), gallery = $('#gallery'), track = $('#gTrack'), lives = $('#lives'), foot = $('.foot-word');
  const liveImgs = $$('#lStage img'), liveItems = $$('#lList li');
  gallery.style.setProperty('--len', 3.2);
  lives.style.setProperty('--len', LIVES.length);
  let lastY = 0;
  const progress = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
  function frame() {
    const y = scrollY;
    // the bar hides going down, comes back going up
    top.classList.toggle('hide', y > lastY && y > 200);
    top.classList.toggle('solid', y > 40);
    lastY = y;
    // manifesto: each word takes ink as the reading line passes it
    const mr = mText.getBoundingClientRect(), mp = clamp((innerHeight * .78 - mr.top) / (mr.height + innerHeight * .25));
    mWords.forEach((w, i) => w.style.setProperty('--o', clamp(mp * mWords.length * 1.08 - i).toFixed(2)));
    // gallery: the track slides across while the section is pinned
    if (innerWidth > 760) {
      const gp = progress(gallery), dist = Math.max(0, track.scrollWidth - innerWidth);
      track.style.setProperty('--gx', `${(gp * dist).toFixed(1)}px`);   // RTL: the track moves right
      $('#gFill').parentElement.style.setProperty('--gp', gp.toFixed(3));
      $('#gFill').style.transform = `scaleX(${gp.toFixed(3)})`;
      $('#gCount').textContent = two(1 + Math.round(gp * (PAINTINGS.length - 1)));
    }
    // lives: one product fades into the next
    const lp = progress(lives) * (LIVES.length - 1);
    liveImgs.forEach((im, i) => im.style.setProperty('--o', clamp(1 - Math.abs(lp - i) * 1.4).toFixed(3)));
    const on = Math.round(lp);
    liveItems.forEach((li, i) => li.classList.toggle('on', i === on));
    $('#lNum').textContent = two(on + 1);
    // the name at the bottom rises into place
    const fr = foot.getBoundingClientRect();
    foot.style.setProperty('--fp', clamp((innerHeight - fr.top) / (fr.height * .9)).toFixed(3));
  }
  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; frame(); }); } };
  if (lenis) lenis.on('scroll', onScroll); else addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  /* ---------------- reveal on entering ---------------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .3 });
  $$('.reveal-lines').forEach(el => io.observe(el));

  /* ---------------- the hero painting leans toward the pointer ---------------- */
  if (fine && !reduced) {
    const art = $('#heroArt');
    addEventListener('pointermove', e => {
      art.style.setProperty('--mx', `${((e.clientX / innerWidth - .5) * -14).toFixed(1)}px`);
      art.style.setProperty('--my', `${((e.clientY / innerHeight - .5) * -10).toFixed(1)}px`);
    }, { passive: true });
  }

  /* ---------------- shop index: the picture follows the pointer ---------------- */
  if (fine) {
    const fl = $('#ixFloat'), flImg = $('img', fl);
    let tx = 0, ty = 0, x = 0, y = 0, vx = 0, run = false;
    const loop = () => {
      const nx = lerp(x, tx, .14), ny = lerp(y, ty, .14); vx = nx - x; x = nx; y = ny;
      fl.style.setProperty('--fx', `${x.toFixed(1)}px`); fl.style.setProperty('--fy', `${y.toFixed(1)}px`);
      fl.style.setProperty('--fr', `${clamp(vx * .6, -12, 12).toFixed(2)}deg`);
      if (run) requestAnimationFrame(loop);
    };
    $$('#ix a').forEach(a => {
      a.addEventListener('pointerenter', e => {
        flImg.src = a.dataset.img; fl.classList.add('on');
        if (!run) { x = tx = e.clientX; y = ty = e.clientY; run = true; requestAnimationFrame(loop); }
      });
      a.addEventListener('pointerleave', () => fl.classList.remove('on'));
    });
    $('#ix').addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
    $('#ix').addEventListener('pointerleave', () => { run = false; });
  }

  /* ---------------- opening ---------------- */
  const ld = $('#loader'), num = $('#ldNum');
  document.body.classList.add('locked'); if (lenis) lenis.stop();
  const t0 = performance.now(), dur = reduced ? 1 : 1500;
  const count = t => {
    const k = clamp((t - t0) / dur);
    num.textContent = two(Math.round(k * 100) === 100 ? 100 : Math.round(k * 99));
    if (k < 1) requestAnimationFrame(count);
    else {
      ld.classList.add('out');
      document.body.classList.remove('locked'); if (lenis) lenis.start();
      document.documentElement.classList.add('ready');
      sizeBoat(); setTimeout(paintBoat, 700);
      setTimeout(() => ld.remove(), 1300);
    }
  };
  requestAnimationFrame(count);
  frame();
})();
