/* Mass & Grass — hoodies & sweatshirts page.
   Garments hang on hangers along a wooden rail. The rail is dragged,
   swiped or stepped; pieces turn on their hooks as they pass the centre
   and swing with the motion. Tapping the centred piece takes it off the
   rail: it lifts, comes forward, can be recoloured and flipped to its back. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const W = window.Watercolor;
  const C = MG.page;
  const ALL = C.items;
  const rtl = () => document.documentElement.dir === 'rtl';

  /* ---------------- artwork ---------------- */
  const artCache = new Map();
  function artFor(it) {
    if (it.image) return it.image;
    if (!artCache.has(it.id)) artCache.set(it.id, W.sample({ id: it.id, ...it.art }, 520, { transparent: true }));
    return artCache.get(it.id);
  }
  const hex = id => (C.colors[id] || C.colors.oat).hex;
  function isDark(h) {
    const n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < .45;
  }

  /* ---------------- garment drawing (300×400, hook at the top) ---------------- */
  const BODY = 'M110 58 C95 62 80 64 68 72 C52 90 44 150 42 240 L40 318 L80 322 L84 250 C86 190 90 150 94 132 L96 340 L204 340 L206 132 C210 150 214 190 216 250 L220 322 L260 318 L258 240 C256 150 248 90 232 72 C220 64 205 62 190 58 C175 70 125 70 110 58 Z';
  let uid = 0;
  function garment(it, colorId, side) {
    const col = hex(colorId), dark = isDark(col), id = 'g' + (uid++);
    const hood = it.type === 'hoodie';
    const ink = dark ? 'rgba(255,255,255,.16)' : 'rgba(51,37,27,.2)';
    const blend = dark ? 'normal' : 'multiply';
    const art = artFor(it);
    const img = (x, y, w, h, op) => `<image href="${art}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}c)" style="mix-blend-mode:${blend}" opacity="${op || .95}"/>`;
    const mark = (y) => `<text x="150" y="${y}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="9" fill="${dark ? 'rgba(255,255,255,.55)' : 'rgba(51,37,27,.45)'}">Mass &amp; Grass</text>`;
    let print = '';
    if (side === 'front') {
      if (it.print === 'front') print = hood ? img(112, 140, 76, 76) : img(108, 100, 84, 84);
      else if (it.print === 'both') print = img(168, 104, 30, 30);
      else print = mark(112);
    } else {
      if (it.print === 'back' || it.print === 'both') print = img(98, hood ? 124 : 96, 104, hood ? 130 : 150);
      else print = mark(80);
    }
    return `<svg viewBox="0 0 300 400" aria-hidden="true">
      <defs>
        <clipPath id="${id}c"><path d="${BODY}"/></clipPath>
        <linearGradient id="${id}s" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset=".2" stop-color="#000" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient>
        <linearGradient id="${id}v" y1="0" y2="1" x1="0" x2="0"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
        <pattern id="${id}r" width="4" height="10" patternUnits="userSpaceOnUse"><rect width="1.6" height="10" fill="#000" opacity=".12"/></pattern>
      </defs>
      <path d="M150 2 C138 2 136 16 146 18 L150 22 L150 36" fill="none" stroke="#9A958D" stroke-width="3" stroke-linecap="round"/>
      <path d="M84 56 Q150 30 216 56" fill="none" stroke="#B88F60" stroke-width="9" stroke-linecap="round"/>
      ${hood && side === 'front' ? `<path d="M104 62 C94 14 206 14 196 62 Z" fill="${col}"/><path d="M104 62 C94 14 206 14 196 62 Z" fill="#000" opacity=".12"/>` : ''}
      <path d="${BODY}" fill="${col}"/>
      <g fill="${col}" stroke="${ink}" stroke-width="1"><path d="M40 318 L80 322 L79 346 L41 342 Z"/><path d="M260 318 L220 322 L221 346 L259 342 Z"/><path d="M96 340 H204 V364 H96 Z"/></g>
      <g fill="url(#${id}r)"><path d="M40 318 L80 322 L79 346 L41 342 Z"/><path d="M260 318 L220 322 L221 346 L259 342 Z"/><path d="M96 340 H204 V364 H96 Z"/></g>
      ${print}
      <path d="${BODY}" fill="url(#${id}s)"/><path d="${BODY}" fill="url(#${id}v)"/>
      <path d="${BODY}" fill="${col}" filter="url(#fleece)" opacity=".5"/>
      <g fill="none" stroke="#000" stroke-opacity=".07" stroke-width="7" stroke-linecap="round">
        <path d="M70 96 C60 160 58 230 60 312"/><path d="M230 96 C240 160 242 230 240 312"/><path d="M122 214 C126 262 118 300 122 336"/><path d="M182 230 C178 270 186 304 180 336"/>
      </g>
      <g fill="none" stroke="${ink}" stroke-width="1.2"><path d="M94 132 L96 340 M206 132 L204 340"/><path d="M68 72 C74 84 84 104 94 132 M232 72 C226 84 216 104 206 132"/></g>
      ${side === 'front' && hood ? `
        <path d="M112 58 C118 24 182 24 188 58 C172 78 128 78 112 58 Z" fill="${col}"/><path d="M112 58 C118 24 182 24 188 58 C172 78 128 78 112 58 Z" fill="#000" opacity=".3"/>
        <path d="M136 72 L133 132 M164 72 L167 132" stroke="${dark ? '#E9E3D8' : '#F6F1E8'}" stroke-width="3" stroke-linecap="round"/>
        <path d="M131 128 h4 v10 h-4z M165 128 h4 v10 h-4z" fill="#9A958D"/>
        <path d="M108 262 L192 262 L206 318 L94 318 Z" fill="none" stroke="${ink}" stroke-width="1.4"/>
        <path d="M108 262 C104 280 100 300 94 318 M192 262 C196 280 200 300 206 318" fill="none" stroke="${ink}" stroke-width="3"/>` : ''}
      ${side === 'front' && !hood ? `<path d="M110 58 C125 76 175 76 190 58" fill="none" stroke="${col}" stroke-width="8"/><path d="M110 58 C125 76 175 76 190 58" fill="none" stroke="${ink}" stroke-width="8" stroke-dasharray="1.6 2.4"/>` : ''}
      ${side === 'back' && hood ? `<path d="M104 58 C96 122 204 122 196 58 C180 50 120 50 104 58 Z" fill="${col}"/><path d="M104 58 C96 122 204 122 196 58 C180 50 120 50 104 58 Z" fill="#000" opacity=".1"/><path d="M150 54 L150 116" stroke="${ink}" stroke-width="1.2"/>` : ''}
      ${side === 'back' && !hood ? `<path d="M110 58 C125 66 175 66 190 58" fill="none" stroke="${ink}" stroke-width="5"/>` : ''}
    </svg>`;
  }

  /* ---------------- state ---------------- */
  const state = {};                 // chosen colour / size per item
  ALL.forEach(it => { state[it.id] = { color: it.colors[0], size: it.sizes[Math.min(1, it.sizes.length - 1)] }; });
  let filter = 'all', list = ALL.slice(), N = list.length;
  let G = [];                        // rendered garments
  let pos = MG.reduced ? 0 : -2.2, vel = 0, target = 0, active = -1;
  let dragging = false, running = false, pulled = false, lastX = null;

  const closet = $('#closet'), rack = $('#rack');
  let SW = 0, GW = 0, near = 0, step = 0;

  function faces(it) {
    const c = state[it.id].color;
    return `<div class="face front">${garment(it, c, 'front')}</div><div class="face back">${garment(it, c, 'back')}</div>`;
  }
  function buildRack() {
    list = ALL.filter(it => filter === 'all' || it.type === filter);
    N = list.length;
    rack.innerHTML = list.map((it, i) =>
      `<div class="g" data-i="${i}"><div class="lift"><div class="faces">${faces(it)}</div></div></div>`).join('');
    G = $$('.g', rack).map(el => ({ el, theta: 0, omega: 0 }));
    target = Math.min(target, N - 1); pos = Math.min(pos, N - 1);
    active = -1; lastX = null;
    layout(); kick();
  }
  function layout() {
    SW = closet.clientWidth;
    GW = Math.round(Math.max(200, Math.min(330, SW * (SW < 760 ? .56 : .24))));
    near = GW * (SW < 760 ? .62 : .74); step = GW * (SW < 760 ? .14 : .19);
    closet.style.setProperty('--gw', GW + 'px');
    closet.style.setProperty('--pull-x', (SW < 760 ? 0 : (rtl() ? 1 : -1) * SW * .2) + 'px');
  }
  function place(o) {                  // where a piece sits for offset o from the centre
    const a = Math.abs(o), s = Math.sign(o) * (rtl() ? -1 : 1);
    const x = s * (a <= 1 ? a * near : near + (a - 1) * step);
    return { x, ry: -s * Math.min(a, 1) * 66, z: -Math.min(a, 1) * 150 - Math.max(0, a - 1) * 8, a };
  }

  /* ---------------- physics loop ---------------- */
  function frame() {
    if (!dragging) { vel += (target - pos) * .05; vel *= .8; pos += vel; }
    const cx = place(0 - pos).x;             // screen movement of the rack
    const sv = lastX == null ? 0 : cx - lastX; lastX = cx;
    let settled = !dragging && Math.abs(target - pos) < .0008 && Math.abs(vel) < .0004;
    G.forEach((g, i) => {
      const p = place(i - pos);
      const eq = Math.max(-12, Math.min(12, sv * .7));
      g.omega += (eq - g.theta) * .06 - g.omega * .09; g.theta += g.omega;
      if (Math.abs(g.omega) > .003 || Math.abs(eq - g.theta) > .04) settled = false;
      g.el.style.transform = `translate3d(${p.x.toFixed(1)}px,0,${p.z.toFixed(1)}px) rotateY(${p.ry.toFixed(2)}deg) rotateZ(${g.theta.toFixed(2)}deg)`;
      g.el.style.zIndex = 100 - Math.round(p.a * 10);
      if (!pulled) g.el.style.filter = `brightness(${(1 - Math.min(p.a, 1) * .1 - Math.max(0, p.a - 1) * .025).toFixed(3)})`;
      g.el.style.opacity = p.a > 8 ? 0 : '';
    });
    const a = Math.max(0, Math.min(N - 1, Math.round(pos)));
    if (a !== active) setActive(a);
    if (settled) { running = false; return; }
    requestAnimationFrame(frame);
  }
  function kick() { if (!running && N) { running = true; requestAnimationFrame(frame); } }
  function go(i) { target = Math.max(0, Math.min(N - 1, i)); kick(); }

  /* ---------------- input ---------------- */
  let sx = 0, sp = 0, moved = 0, lx = 0, lt = 0, flick = 0;
  const perIndex = () => (near + step) / 2;
  rack.addEventListener('pointerdown', e => {
    if (e.button !== 0 || pulled) return;
    dragging = true; moved = 0; flick = 0; sx = lx = e.clientX; sp = pos; lt = performance.now();
    rack.setPointerCapture(e.pointerId); rack.classList.add('dragging'); hideHint(); kick();
  });
  rack.addEventListener('pointermove', e => {
    if (!dragging) {
      if (e.pointerType === 'mouse' && !pulled) {
        const hit = e.target.closest && e.target.closest('.g');
        G.forEach(g => g.el.classList.toggle('peek', g.el === hit && +hit.dataset.i !== active));
      }
      return;
    }
    let p = sp - (rtl() ? -1 : 1) * (e.clientX - sx) / perIndex();
    if (p < 0) p *= .35; else if (p > N - 1) p = N - 1 + (p - N + 1) * .35;
    const now = performance.now();
    flick = (p - pos) / Math.max(8, now - lt) * 16; lt = now;
    moved += Math.abs(e.clientX - lx); lx = e.clientX; pos = p;
  });
  rack.addEventListener('pointerleave', () => G.forEach(g => g.el.classList.remove('peek')));
  const end = e => {
    if (!dragging) return;
    dragging = false; rack.classList.remove('dragging');
    if (moved < 6) {
      const hit = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.classList && el.classList.contains('g'));
      if (hit) { const i = +hit.dataset.i; i === active ? pull() : go(i); }
      else go(Math.round(target));
      return;
    }
    vel = flick; go(Math.round(pos + flick * 6));
  };
  rack.addEventListener('pointerup', end);
  rack.addEventListener('pointercancel', end);
  closet.addEventListener('click', e => {
    // composedPath still holds buttons that were re-rendered during the click
    const inside = e.composedPath().some(el => el.classList && (el.classList.contains('detail') || el.classList.contains('focus')));
    if (pulled && !inside) putBack();
  });
  let wacc = 0, wt;
  rack.addEventListener('wheel', e => {
    if (pulled || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); wacc += e.deltaX * (rtl() ? -1 : 1);
    clearTimeout(wt); wt = setTimeout(() => { wacc = 0; }, 180);
    if (Math.abs(wacc) > 60) { go(target + Math.sign(wacc)); wacc = 0; hideHint(); }
  }, { passive: false });
  document.addEventListener('keydown', e => {
    if (/input|textarea|select/i.test(document.activeElement.tagName)) return;
    const fwd = rtl() ? 'ArrowLeft' : 'ArrowRight', back = rtl() ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd) { go(target + 1); hideHint(); }
    else if (e.key === back) { go(target - 1); hideHint(); }
    else if (e.key === 'Escape' && pulled) putBack();
    else if (e.key === 'Enter' && document.activeElement === rack) pulled ? putBack() : pull();
  });
  $('#prevBtn').addEventListener('click', () => { go(target - 1); hideHint(); });
  $('#nextBtn').addEventListener('click', () => { go(target + 1); hideHint(); });
  $('#pullBtn').addEventListener('click', () => pulled ? putBack() : pull());
  function hideHint() { $('#dragHint').classList.add('gone'); }

  /* ---------------- active piece ---------------- */
  function setActive(i) {
    active = i;
    const it = list[i];
    G.forEach((g, n) => g.el.classList.toggle('focus', n === i));
    if (pulled) { G.forEach((g, n) => { if (n !== i) g.el.classList.remove('flipped'); }); fillDetail(); }
    $('#count').innerHTML = `<b>${MG.pad(i + 1)}</b> / ${MG.pad(N)}`;
    $('#curTitle').textContent = L(it.title);
    $('#curColors').innerHTML = `${esc(L(C.page.types[it.type]))} · ` + it.colors.map(c => `<i style="--c:${hex(c)}" title="${esc(L(C.colors[c].name))}"></i>`).join('');
    $('#prevBtn').disabled = i === 0; $('#nextBtn').disabled = i === N - 1;
    rack.setAttribute('aria-label', `${L(it.title)} (${i + 1}/${N})`);
  }

  /* ---------------- taking a piece out ---------------- */
  const detail = $('#detail');
  function pull() {
    if (active < 0) return;
    pulled = true;
    closet.classList.add('pulled');
    G.forEach(g => { g.el.classList.remove('peek'); g.el.style.filter = ''; });
    fillDetail();
    detail.hidden = false;
    requestAnimationFrame(() => detail.classList.add('show'));
    $('#pullBtn').textContent = t('page.putBack');
    hideHint();
  }
  function putBack() {
    pulled = false;
    closet.classList.remove('pulled');
    G.forEach(g => g.el.classList.remove('flipped'));
    detail.classList.remove('show');
    setTimeout(() => { if (!pulled) detail.hidden = true; }, 450);
    $('#pullBtn').textContent = t('page.pull');
    kick();
  }
  function fillDetail() {
    const it = list[active], st = state[it.id];
    $('#dType').textContent = L(C.page.types[it.type]);
    $('#dTitle').textContent = L(it.title);
    $('#dStory').textContent = L(it.story);
    $('#dColorName').textContent = L(C.colors[st.color].name);
    $('#dColors').innerHTML = it.colors.map(c =>
      `<button class="sw" type="button" role="radio" aria-checked="${c === st.color}" aria-label="${esc(L(C.colors[c].name))}" data-c="${c}" style="--c:${hex(c)}"></button>`).join('');
    $('#dSizes').innerHTML = it.sizes.map(s =>
      `<button class="sz" type="button" role="radio" aria-checked="${s === st.size}" data-s="${s}">${s}</button>`).join('');
    $('#dPrint').textContent = L(C.page.printPlaces[it.print]);
    $('#dPrice').textContent = it.price ? L(it.price) : t('page.priceOnRequest');
    $('#dNote').textContent = it.sample ? t('page.sampleNote') : '';
    const flipped = G[active].el.classList.contains('flipped');
    $('#dFlip').textContent = t(flipped ? 'page.flipFront' : 'page.flipBack');
    $('#dOrder').href = MG.order(`${L(it.title)} · ${L(C.colors[st.color].name)} · ${st.size}`);
    $$('#dColors .sw').forEach(b => b.addEventListener('click', () => {
      st.color = b.dataset.c;
      const g = G[active].el;
      $('.faces', g).innerHTML = faces(it);
      renderFlat(); fillDetail();
    }));
    $$('#dSizes .sz').forEach(b => b.addEventListener('click', () => { st.size = b.dataset.s; fillDetail(); }));
  }
  $('#dFlip').addEventListener('click', () => { G[active].el.classList.toggle('flipped'); fillDetail(); });
  $('#dBack').addEventListener('click', putBack);

  /* ---------------- filters + flat grid ---------------- */
  function renderFilters() {
    $('#filters').innerHTML = ['all', 'hoodie', 'crewneck'].map(f =>
      `<button type="button" data-f="${f}" aria-pressed="${f === filter}">${esc(L(C.page.filters[f]))}</button>`).join('');
    $$('#filters button').forEach(b => b.addEventListener('click', () => {
      if (pulled) putBack();
      filter = b.dataset.f; target = 0; renderFilters(); buildRack(); renderFlat();
    }));
  }
  function renderFlat() {
    $('#flatGrid').innerHTML = ALL.map((it, n) => `
      <button class="fl" type="button" data-id="${it.id}" ${filter !== 'all' && it.type !== filter ? 'hidden' : ''} style="--r:${[-3, 2, -1.5, 2.5][n % 4]}deg">
        ${garment(it, state[it.id].color, 'front')}
        <b>${esc(L(it.title))}</b><span>${esc(L(C.page.types[it.type]))} · ${esc(L(C.colors[state[it.id].color].name))}</span>
      </button>`).join('');
    $$('#flatGrid .fl').forEach(b => b.addEventListener('click', () => {
      const i = list.findIndex(x => x.id === b.dataset.id);
      if (i < 0) return;
      closet.scrollIntoView({ behavior: MG.reduced ? 'auto' : 'smooth', block: 'center' });
      if (pulled) putBack();
      go(i);
      setTimeout(() => { if (Math.round(pos) === i) pull(); }, MG.reduced ? 50 : 900);
    }));
  }

  /* ---------------- boot ---------------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.rv, .stroke').forEach(el => io.observe(el));
  MG.onLang(() => {
    renderFilters(); renderFlat(); layout(); lastX = null;
    if (active >= 0) { const a = active; active = -1; setActive(a); }
    if (pulled) fillDetail();
    $('#pullBtn').textContent = t(pulled ? 'page.putBack' : 'page.pull');
    kick();
  });
  buildRack();
  let rz;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { layout(); lastX = null; kick(); }, 120); });
});
