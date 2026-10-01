/* Mass & Grass — home page.
   Brings together what the other pages built: paintings pegged on a rope,
   each collection shown with its own real product photo (the painting laid
   into the held frame, the calendar on the wall, the print on the hoodie,
   stickers on the notebook, cards in the envelope), a corner of Farah's map
   of Gaza with her face on it, the year of calendar paintings in a strip,
   and how a piece is made. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const P = MG.page, S = P.scenes, site = MG.site;
  const reduced = MG.reduced;

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
    const close = () => { el.classList.add('out'); setTimeout(() => { el.hidden = true; }, 1000); };
    setTimeout(close, 1900);
    el.addEventListener('click', close, { once: true });
  })();

  /* ---------------- hero ---------------- */
  // the title carries <wash> marks for the painted word and <br> line breaks; everything else is text
  const rich = s => esc(s).replace(/&lt;wash&gt;/g, '<span class="wash">').replace(/&lt;\/wash&gt;/g, '</span>').replace(/&lt;br&gt;/g, '<br>');
  function renderHero() {
    $('#heroTitle').innerHTML = rich(L(P.hero.title));
    $('#facts').innerHTML = (P.hero.facts || []).map(f => `<div><dt>${esc(L(f.value))}</dt><dd>${esc(L(f.label))}</dd></div>`).join('');
    $('#lineCards').innerHTML = P.hero.line.map((it, i) => `
      <figure class="h-card" style="--i:${i}">
        <svg class="h-peg" aria-hidden="true"><use href="#peg"/></svg>
        <img src="${esc(it.src)}" alt="" loading="${i < 3 ? 'eager' : 'lazy'}">
        <figcaption>${esc(L(it.name))}</figcaption>
      </figure>`).join('');
  }

  /* ---------------- collections with their real products ---------------- */
  const win = (w, inner) => `<span class="h-win" style="left:${w.x * 100}%;top:${w.y * 100}%;width:${w.w * 100}%;height:${w.h * 100}%">${inner}</span>`;
  const SCENE = {
    paintings: () => `<div class="h-photo"><img src="${S.paintings.photo}" alt="" loading="lazy">${win(S.paintings.window, `<img src="${S.paintings.art}" alt="" loading="lazy">`)}</div>`,
    calendars: () => `<div class="h-photo"><img src="${S.calendars.photo}" alt="" loading="lazy">${win(S.calendars.window, `<img src="${S.calendars.art}" alt="" loading="lazy">`)}</div>`,
    cloth: () => `<div class="h-photo h-clothp"><img class="h-look" src="${S.cloth.look}" alt="" loading="lazy">
      <span class="h-garment"><img src="${S.cloth.photo}" alt="" loading="lazy">${win(S.cloth.window, `<img class="h-print" src="${S.cloth.art}" alt="" loading="lazy">`)}</span></div>`,
    stickers: () => `<div class="h-photo h-stk"><img class="h-nb" src="${S.stickers.photo}" alt="" loading="lazy">
      ${S.stickers.stickers.map((s, i) => `<img class="h-sticker s${i}" src="${s}" alt="" loading="lazy">`).join('')}</div>`,
    postcards: () => `<div class="h-photo h-env"><img class="h-env-back" src="${S.postcards.back}" alt="" loading="lazy">
      ${S.postcards.cards.map((c, i) => `<img class="h-pc c${i}" src="${c}" alt="" loading="lazy">`).join('')}
      <img class="h-env-front" src="${S.postcards.front}" alt="" loading="lazy"></div>`,
    story: () => `<div class="h-photo h-duo"><img src="${S.story.farah}" alt="" loading="lazy"><img src="${S.story.ahmed}" alt="" loading="lazy"></div>`,
  };
  function renderBento() {
    const items = [...site.collections, ...(site.pages || [])];
    $('#bento').innerHTML = items.map(c => {
      const scene = SCENE[c.id] ? SCENE[c.id]() : `<div class="h-photo h-soon"><span class="h-blob" style="--c:${c.color}"></span></div>`;
      const href = MG.colLink(c);
      return `
      <a class="h-col hc-${c.id}${c.ready ? '' : ' is-soon'} rv" href="${href}" data-col="${c.id}" style="--c:${c.color}">
        ${scene}
        <span class="h-col-body">
          <span class="h-col-kicker">${esc(L(c.kicker || ''))}</span>
          <b class="display">${esc(L(c.title))}</b>
          <span class="h-col-text">${esc(L(c.text || ''))}</span>
          <span class="h-col-go">${esc(c.ready ? t('collections.go') : t('collections.soon'))}<span aria-hidden="true">${document.documentElement.dir === 'rtl' ? ' ←' : ' →'}</span></span>
        </span>
      </a>`;
    }).join('');
    $$('#bento .rv').forEach(el => reveal.observe(el));
    $$('#bento .is-soon').forEach(a => a.addEventListener('click', e => { e.preventDefault(); MG.toast && MG.toast(`${a.querySelector('b').textContent}: ${t('collections.soon')}`); }));
  }

  /* ---------------- a corner of Farah's map ---------------- */
  function renderMap() {
    const st = MG.more.story; if (!st) return;
    const svg = $('#miniMap'), NS = 'http://www.w3.org/2000/svg';
    const K = Math.cos(31.4 * Math.PI / 180), Sx = 2250;
    const proj = (lo, la) => [(lo - 34.19) * K * Sx + 6, (31.62 - la) * Sx + 28];
    const ring = st.strip.map(([lo, la]) => proj(lo, la));
    const d = 'M' + ring.map(p => p.map(v => v.toFixed(1)).join(',')).join(' L') + 'Z';
    const pl = k => proj(st.places[k].lon, st.places[k].lat);
    const route = ['jalaa', 'zawaida', 'jalaa', 'office', 'deir', 'jalaa', 'telhawa', 'office'].map(pl);
    let rd = `M${route[0].join(',')}`;
    for (let i = 1; i < route.length; i++) {
      const [x1, y1] = route[i - 1], [x2, y2] = route[i], dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      let nx = -dy / len, ny = dx / len; if (nx < 0) { nx = -nx; ny = -ny; }
      const k = Math.min(30, len * .16) * (1 + (i % 3) * .5);
      rd += ` Q${(x1 + x2) / 2 + nx * k},${(y1 + y2) / 2 + ny * k} ${x2},${y2}`;
    }
    const [fx, fy] = pl('office');
    svg.innerHTML = `
      <rect x="-200" y="-200" width="1200" height="1400" fill="#B9D0D6" opacity=".55"/>
      <path d="${d}" fill="#EBD9B4" stroke="#8C6A45" stroke-opacity=".5" stroke-width="2"/>
      <path class="h-route" d="${rd}" pathLength="1"/>
      ${['jalaa', 'zawaida', 'deir', 'telhawa', 'office'].map(k => { const [x, y] = pl(k); return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="#6B4A36" stroke-width="1.6"/>`; }).join('')}
      <defs><clipPath id="mmFace"><circle cx="${fx}" cy="${fy - 34}" r="26"/></clipPath></defs>
      <circle cx="${fx}" cy="${fy - 34}" r="29" fill="#FFFDF8"/>
      <image href="${st.faces.farah.joy || st.faces.farah.calm}" x="${fx - 26}" y="${fy - 60}" width="52" height="52" clip-path="url(#mmFace)"/>`;
    // show the part of the strip where the story happened
    svg.setAttribute('viewBox', '330 120 330 420');
  }
  function renderPair() {
    $('#pair').innerHTML = MG.more.story ? MG.more.story.people.list.map(p => `
      <span class="h-person"><img src="${esc(p.img)}" alt="" loading="lazy"><span><b>${esc(L(p.name))}</b><small>${esc(L(p.role))}</small></span></span>`).join('') : '';
  }

  /* ---------------- the year of calendar paintings ---------------- */
  function renderStrip() {
    $('#strip').innerHTML = `<div class="h-strip-in">${P.calendar.months.map((m, i) => `
      <figure class="h-month"><img src="${esc(m.src)}" alt="${esc(L(m.name))}" loading="lazy"><figcaption><b>${MG.pad ? MG.pad(i + 1) : i + 1}</b> ${esc(L(m.name))}</figcaption></figure>`).join('')}</div>`;
  }
  // drag to scroll the strip with a mouse
  (function drag() {
    const s = $('#strip'); let down = false, x0 = 0, s0 = 0;
    s.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; x0 = e.clientX; s0 = s.scrollLeft; s.classList.add('drag'); });
    addEventListener('pointerup', () => { down = false; s.classList.remove('drag'); });
    addEventListener('pointermove', e => { if (down) s.scrollLeft = s0 - (e.clientX - x0); });
  })();

  /* ---------------- how we work ---------------- */
  function renderSteps() {
    $('#steps').innerHTML = P.process.steps.map((s, i) => `
      <li class="h-step rv" style="--rd:${i * .08}s"><span class="h-step-no">${MG.num(i + 1)}</span><h3>${esc(L(s.title))}</h3><p>${esc(L(s.text))}</p></li>`).join('');
    $$('#steps .rv').forEach(el => reveal.observe(el));
  }

  /* ---------------- reveal on scroll ---------------- */
  const reveal = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); }
  }), { threshold: .12 });

  function render() {
    renderHero(); renderBento(); renderMap(); renderPair(); renderStrip(); renderSteps();
    document.title = L(P.meta.title);
  }
  render();
  $$('.rv, .stroke').forEach(el => reveal.observe(el));
  MG.onLang(render);
});
