/* Mass & Grass — the endless table.
   Every painting and every piece lies on one surface that repeats in both directions; it is
   dragged by hand (or a finger) and keeps gliding when let go, and it drifts slowly on its own.
   Tiles sit at their own small tilt and depth, so they shift against each other while moving.
   Clicking a piece (not dragging) flies its picture to the middle and opens it. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const img = n => `img/${n}.webp`;

  const PIECES = [
    ['boat-colour', 'القارب', 'لوحة أصلية', 'قارب على طريق الزوايدة أثناء النزوح.'],
    ['card-jaffa', 'ميناء يافا', 'بطاقة بريدية', 'قوارب الصيد في الميناء، والبيوت الحجرية فوق البحر.'],
    ['cart', 'كل ما استطعنا حمله', 'لوحة أصلية', 'كل ما يتسع له صندوق صغير من بيتٍ كامل.'],
    ['hoodie-folded', 'هودي «حقول نيسان»', 'الملابس', 'قطن ثقيل، والرسمة مطبوعة على الصدر.'],
    ['girl-birds', 'الفتاة التي أرادت الطائر', 'لوحة أصلية', 'حلمٌ بالأزرق والأبيض.'],
    ['st-lemon', 'ليمونة', 'ملصق', 'ملصق مقصوص من رسمة مائية.'],
    ['tent-coast', 'ساحل غزة', 'لوحة أصلية', 'خيمة على الشاطئ عند الغروب.'],
    ['calendar', 'التقويم السنوي 2027', 'التقويم', 'اثنتا عشرة لوحة جديدة، لوحة لكل شهر.'],
    ['fishing', 'صيد في بحر غزة', 'لوحة أصلية', 'قاربٌ صغير في الأزرق.'],
    ['tote-lemon', 'حقيبة الليمون', 'الحقائب', 'حقيبة قماشية ترافقكم إلى السوق.'],
    ['alley', 'مخيم المغازي', 'لوحة أصلية', 'زقاق في المخيم، ظهيرة هادئة.'],
    ['card-gaza', 'غروب غزة', 'بطاقة بريدية', 'قوارب على الرمل والشمس تغيب.'],
    ['house', 'بيت النزوح', 'لوحة أصلية', 'البيت الذي آوانا.'],
    ['print-boat', 'القارب، مطبوعة', 'طبعة فنية', 'طبعة على ورق فني بحواف بيضاء.'],
    ['ramadan', 'شرارات رمضان', 'لوحة أصلية', 'أيادٍ صغيرة وشرارات في ليل رمضان.'],
    ['girl-oud', 'تأمّل', 'لوحة أصلية', 'فتاة وعود في حديقة.']
  ];

  const view = $('#view'), plane = $('#plane');
  $('#worldN').textContent = `${String(PIECES.length).padStart(2, '0')} قطعة · اسحبوا`;

  // the pieces on a block that repeats: a loose 4×4 grid with jitter, sizes that vary
  const COLS = 4, ROWS = 4;
  let BW = 0, BH = 0, tiles = [];
  function layout() {
    const vw = view.clientWidth, vh = view.clientHeight;
    BW = Math.max(1800, vw * 1.5); BH = Math.max(1500, vh * 1.9);
    const cw = BW / COLS, ch = BH / ROWS, rnd = mulberry(7);
    plane.innerHTML = '';
    tiles = PIECES.map((p, i) => {
      const c = i % COLS, r = Math.floor(i / COLS);
      const w = Math.round(Math.min(cw, ch) * (.5 + rnd() * .28));
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'tile'; el.dataset.i = i;
      el.innerHTML = `<img src="${img(p[0])}" alt="${p[1]}" draggable="false" loading="lazy" decoding="async"><span class="tile-cap"><b>${p[1]}</b><i class="mono">${p[2]}</i></span>`;
      el.style.width = w + 'px';
      el.style.setProperty('--tilt', `${((rnd() - .5) * 6).toFixed(1)}deg`);
      plane.appendChild(el);
      return { el, x: c * cw + (cw - w) / 2 + (rnd() - .5) * cw * .3, y: r * ch + (rnd() - .5) * ch * .3 + ch * .1, w, depth: .85 + rnd() * .3 };
    });
  }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // the camera: position, velocity, drag
  let ox = 0, oy = 0, vx = reduced ? 0 : -.25, vy = reduced ? 0 : -.12, dragging = false, moved = 0, lx = 0, ly = 0, lt = 0;
  const wrap = (v, m) => ((v % m) + m) % m;
  function place() {
    const vw = view.clientWidth, vh = view.clientHeight;
    for (const t of tiles) {
      // wrap each tile into the band around the view, so the table never ends
      const x = wrap(t.x + ox * t.depth + 300, BW) - 300, y = wrap(t.y + oy * t.depth + 300, BH) - 300;
      t.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      t.el.style.visibility = (x > vw + 50 || y > vh + 50) ? 'hidden' : 'visible';
    }
  }
  function tick() {
    if (!dragging && !opened) {
      ox += vx; oy += vy;
      // glide after a throw, settling back to a slow drift
      vx += ((reduced ? 0 : -.25) - vx) * .03; vy += ((reduced ? 0 : -.12) - vy) * .03;
    }
    place();
    requestAnimationFrame(tick);
  }
  view.addEventListener('pointerdown', e => {
    dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; lt = performance.now();
    view.setPointerCapture(e.pointerId); view.classList.add('grab');
  });
  view.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly, now = performance.now(), dtm = Math.max(1, now - lt);
    ox += dx; oy += dy; moved += Math.abs(dx) + Math.abs(dy);
    vx = dx / dtm * 16; vy = dy / dtm * 16;
    lx = e.clientX; ly = e.clientY; lt = now;
  });
  const end = e => {
    if (!dragging) return;
    dragging = false; view.classList.remove('grab');
    if (moved < 6) {                                  // a click, not a drag
      const t = document.elementFromPoint(e.clientX, e.clientY);
      const tile = t && t.closest('.tile');
      if (tile) openPiece(+tile.dataset.i, tile);
    }
  };
  view.addEventListener('pointerup', end);
  view.addEventListener('pointercancel', () => { dragging = false; view.classList.remove('grab'); });
  view.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); ox -= e.deltaX; } }, { passive: false });
  view.addEventListener('keydown', e => {
    const k = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] }[e.key];
    if (k) { e.preventDefault(); vx = k[0] / 6; vy = k[1] / 6; }
    if (e.key === 'Enter' && document.activeElement.classList.contains('tile')) openPiece(+document.activeElement.dataset.i, document.activeElement);
  });

  /* ---------------- a piece, opened: its picture flies to the middle ---------------- */
  const open = $('#open'), flyer = $('#flyer'), flyImg = flyer.querySelector('img'), box = $('#openImgBox');
  let opened = null, bag = 0;
  function openPiece(i, tile) {
    const p = PIECES[i]; opened = { i, tile };
    $('#openTitle').textContent = p[1]; $('#openKind').textContent = p[2]; $('#openNote').textContent = p[3];
    const from = tile.querySelector('img').getBoundingClientRect();
    flyImg.src = img(p[0]);
    open.classList.add('on'); open.setAttribute('aria-hidden', 'false');
    tile.classList.add('away');
    requestAnimationFrame(() => {
      const to = box.getBoundingClientRect(), ratio = from.width / from.height;
      let w = to.width, h = w / ratio; if (h > to.height) { h = to.height; w = h * ratio; }
      const tx = to.left + (to.width - w) / 2, ty = to.top + (to.height - h) / 2;
      flyer.style.transition = 'none';
      flyer.style.cssText += `;left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;transform:none`;
      flyer.classList.add('on');
      requestAnimationFrame(() => {
        flyer.style.transition = '';
        flyer.style.transform = `translate(${tx - from.left}px,${ty - from.top}px) scale(${w / from.width})`;
      });
    });
    setTimeout(() => $('#openAdd').focus({ preventScroll: true }), 500);
  }
  function closePiece() {
    if (!opened) return;
    const { tile } = opened;
    flyer.style.transform = 'none';
    open.classList.remove('on'); open.setAttribute('aria-hidden', 'true');
    // fly back to wherever the tile is now
    const now = tile.querySelector('img').getBoundingClientRect(), start = flyer.getBoundingClientRect();
    flyer.style.transform = `translate(${now.left - parseFloat(flyer.style.left)}px,${now.top - parseFloat(flyer.style.top)}px)`;
    setTimeout(() => { flyer.classList.remove('on'); tile.classList.remove('away'); opened = null; }, 650);
    void start;
  }
  open.addEventListener('click', e => { if (e.target.closest('[data-close]')) closePiece(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closePiece(); });
  $('#openAdd').addEventListener('click', () => {
    bag++; $('#bagN').textContent = bag;
    const b = $('#openAdd'); b.textContent = 'أُضيفت ✓'; b.classList.add('done');
    setTimeout(() => { b.textContent = 'أضف إلى السلة'; b.classList.remove('done'); }, 1400);
  });

  layout();
  requestAnimationFrame(tick);
  addEventListener('resize', () => { clearTimeout(layout._t); layout._t = setTimeout(layout, 200); });

  // smooth in-page links
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2) { e.preventDefault(); return; }
    const t = document.querySelector(id); if (t) { e.preventDefault(); t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }
  }));
})();
