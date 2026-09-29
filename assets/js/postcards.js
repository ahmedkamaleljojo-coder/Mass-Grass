/* Mass & Grass — postcards page.
   1. The envelope: a real photo split in two (its back, and its front pocket
      laid over the cards); the cards rise out of the pocket in a column, one
      behind the other. Tap a card behind to bring it forward, tap the front
      one to see it large; tap it again to turn it over.
   2. Every card's back is drawn here: the message in handwriting, the address
      lines, a stamp cut from one of the paintings, and the postmark of the
      card's own city.
   3. Write your message: pick the card and the stamp, write who it is for and
      what to say; the order carries it.
   4. The collection: hover a card to see its back. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const C = MG.page, CARDS = C.cards, N = CARDS.length;
  const rtl = () => document.documentElement.dir === 'rtl';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const byId = id => CARDS.find(c => c.id === id) || CARDS[0];

  $('#pcTitle').innerHTML = '';
  const fillTitle = () => { $('#pcTitle').innerHTML = esc(t('page.title')).replace('&lt;em&gt;', '<em>').replace('&lt;/em&gt;', '</em>'); };

  /* ---------------- a card's back ---------------- */
  let pmSeq = 0;
  function postmark(c) {
    const k = ++pmSeq, city = esc(L(c.city)), date = esc(L(c.date)), year = esc(MG.num(2026));
    return `<svg class="pm" viewBox="0 0 220 110" aria-hidden="true">
      <defs><path id="pmt${k}" d="M22,55 a38,38 0 1,1 76,0"/><path id="pmb${k}" d="M16,55 a44,44 0 0,0 88,0"/></defs>
      <g fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="60" cy="55" r="48"/><circle cx="60" cy="55" r="31"/>
        <path d="M112 34 q13 -7 26 0 t26 0 t26 0 t26 0 M112 48 q13 -7 26 0 t26 0 t26 0 t26 0 M112 62 q13 -7 26 0 t26 0 t26 0 t26 0 M112 76 q13 -7 26 0 t26 0 t26 0 t26 0"/></g>
      <text font-size="13" letter-spacing="1"><textPath href="#pmt${k}" startOffset="50%" text-anchor="middle">${city}</textPath></text>
      <text font-size="9" letter-spacing="1.5"><textPath href="#pmb${k}" startOffset="50%" text-anchor="middle">MASS &amp; GRASS</textPath></text>
      <text x="60" y="53" font-size="11" text-anchor="middle">${date}</text>
      <text x="60" y="68" font-size="11" text-anchor="middle">${year}</text>
    </svg>`;
  }
  function backHTML(c, o) {
    o = o || {};
    const stamp = byId(o.stamp || c.id);
    const msg = o.msg != null ? o.msg : L(c.note);
    return `<div class="bk"><span class="bk-head">${esc(t('page.postcard'))}<i>POST CARD</i></span>
      <div class="bk-msg"><p class="hand">${esc(msg).replace(/\n/g, '<br>')}</p>${o.from ? `<p class="hand sig">${esc(o.from)}</p>` : ''}
        <span class="bk-cap">${esc(L(c.title))} · ${esc(L(c.city))} · Mass &amp; Grass</span></div>
      <div class="bk-rule"></div>
      <div class="bk-addr">
        <div class="stamp"><img src="${stamp.art}" alt=""></div>${postmark(c)}
        <div class="lines"><span class="hand">${o.to ? esc(t('page.to') + ' ' + o.to) : ''}</span><span></span><span></span></div>
      </div></div>`;
  }
  function paintCard(el, c, o) {
    const img = $('.front img', el); img.src = c.art; img.alt = `${L(c.title)} · ${L(c.city)}`;
    $('.back', el).innerHTML = backHTML(c, o);
  }
  const cardHTML = () => '<div class="pc-in"><div class="face front"><img alt="" draggable="false"></div><div class="face back"></div></div>';
  const orderName = c => `${t('page.postcard')}: ${L(c.title)} · ${L(c.city)}`;

  /* ---------------- 1. the envelope and its fan ---------------- */
  const stage = $('#stage'), fan = $('#fan'), envBack = $('.env-back');
  fan.innerHTML = CARDS.map((c, i) => `<button class="pcard" type="button" data-i="${i}" style="--c:${c.acc}">${cardHTML()}</button>`).join('');
  const fanCards = $$('.pcard', fan);
  fanCards.forEach((el, i) => paintCard(el, CARDS[i]));
  /* The cards stand in a column out of the pocket, one behind the other: the
     one in front is lowest and largest, each one behind a little higher and
     smaller, so the top of every card shows. Tap a card behind to bring it to
     the front (the ones before it slip back into the envelope and come up
     behind); tap the front card to open it. */
  let open = false, ord = CARDS.map((_, i) => i), moving = false;
  const posOf = i => ord.indexOf(i);
  let geo = null;
  function layout(sunk) {                                   // sunk: cards sitting down in the pocket for a moment
    const sw = stage.clientWidth, ew = envBack.offsetWidth || Math.min(440, innerWidth * .72);
    const eh = ew * 1.068, cw = ew * .84, ch = cw / 1.5, step = ch * .15, lift0 = ch * .58;
    const sh = Math.ceil(eh * .045 + ch + lift0 + (N - 1) * step + 24);
    if (stage.style.height !== sh + 'px') stage.style.height = sh + 'px';
    geo = { ch };
    fanCards.forEach((el, i) => {
      const p = posOf(i), down = !open || (sunk && sunk.has(i));
      el.style.setProperty('--pw', cw + 'px');
      el.style.left = (sw / 2 - cw / 2) + 'px';
      el.style.top = (sh - eh * .045 - ch) + 'px';
      el.style.transformOrigin = '50% 100%';
      const hov = open && !down && el.matches(':hover,:focus-visible') ? ch * .06 : 0;
      const up = down ? -p * 1.2 : lift0 + p * step + hov;
      const sc = down ? 1 - p * .004 : 1 - p * .035;
      el.style.transform = `translateY(${(-up).toFixed(1)}px) scale(${sc.toFixed(3)})`;
      el.style.zIndex = 100 - p;
      el.tabIndex = open && !down ? 0 : -1;
      el.classList.toggle('front', p === 0);
    });
  }
  function stagger(on) { fanCards.forEach(el => { const p = posOf(+el.dataset.i); el.style.transitionDelay = on ? `${(open ? N - 1 - p : p) * 60}ms` : '0ms'; }); }
  function setOpen(v) {
    open = v; stagger(true); layout(); setTimeout(() => stagger(false), 900);
    const b = $('#envBtn'); b.textContent = t(open ? 'page.back' : 'page.open'); b.setAttribute('aria-pressed', String(open));
    $('#envHint').hidden = !open;
  }
  // bring card i to the front: the ones in front of it dip into the envelope, then come up behind
  function bringFront(i) {
    const p = posOf(i); if (p <= 0 || moving) return;
    moving = true;
    const ahead = new Set(ord.slice(0, p));
    layout(ahead);
    setTimeout(() => {
      ord = ord.slice(p).concat(ord.slice(0, p));
      layout(ahead);                                       // new stacking while they are down in the pocket
      requestAnimationFrame(() => { layout(); setTimeout(() => { moving = false; }, 700); });
    }, 380);
  }
  const step = d => bringFront(ord[(d > 0 ? 1 : N - 1)]);
  fanCards.forEach(el => {
    el.addEventListener('mouseenter', () => { if (open && !moving) layout(); });
    el.addEventListener('mouseleave', () => { if (open && !moving) layout(); });
    el.addEventListener('click', () => {
      if (!open) { setOpen(true); return; }
      const i = +el.dataset.i;
      posOf(i) === 0 ? openView(i) : bringFront(i);
    });
  });
  $('#envNext').addEventListener('click', () => { if (!open) setOpen(true); else step(1); });
  $('#envPrev').addEventListener('click', () => { if (!open) setOpen(true); else step(-1); });
  stage.addEventListener('keydown', e => {
    const fwd = rtl() ? 'ArrowLeft' : 'ArrowRight', back = rtl() ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd || e.key === 'ArrowUp') { e.preventDefault(); step(1); }
    else if (e.key === back || e.key === 'ArrowDown') { e.preventDefault(); step(-1); }
  });
  $('#envBtn').addEventListener('click', () => setOpen(!open));
  new IntersectionObserver((es, ob) => es.forEach(e => { if (e.isIntersecting) { ob.disconnect(); setTimeout(() => { if (!open) setOpen(true); }, MG.reduced ? 0 : 500); } }), { threshold: .45 }).observe(stage);
  addEventListener('resize', () => requestAnimationFrame(() => layout()));
  envBack.decode ? envBack.decode().then(() => layout()).catch(() => layout()) : envBack.addEventListener('load', () => layout());

  /* ---------------- one card, large ---------------- */
  const pv = $('#pv'), pvCard = $('#pvCard');
  let vi = 0;
  function fillView(i) {
    vi = (i + N) % N; const c = CARDS[vi];
    paintCard(pvCard, c); pvCard.classList.remove('flipped');
    $('#pvCity').textContent = `${L(c.city)} · ${MG.pad(vi + 1)} / ${MG.pad(N)}`;
    $('#pvTitle').textContent = L(c.title); $('#pvNote').textContent = L(c.note);
    $('#pvOrder').dataset.order = orderName(c);
  }
  function openView(i) { fillView(i); if (!pv.open) pv.showModal(); }
  const flipView = () => pvCard.classList.toggle('flipped');
  pvCard.addEventListener('click', flipView);
  pvCard.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipView(); } });
  $('#pvFlip').addEventListener('click', flipView);
  $('#pvPrev').addEventListener('click', () => fillView(vi - 1));
  $('#pvNext').addEventListener('click', () => fillView(vi + 1));
  $('#pvX').addEventListener('click', () => pv.close());
  pv.addEventListener('click', e => { if (e.target === pv) pv.close(); });
  pv.addEventListener('keydown', e => {
    const fwd = rtl() ? 'ArrowLeft' : 'ArrowRight', back = rtl() ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd) fillView(vi + 1); else if (e.key === back) fillView(vi - 1);
  });
  $('#pvWrite').addEventListener('click', () => { pv.close(); w.card = CARDS[vi].id; w.stamp = CARDS[vi].id; saveW(); renderWriter(); $('#write').scrollIntoView({ behavior: MG.reduced ? 'auto' : 'smooth', block: 'start' }); });

  /* ---------------- 3. write your message ---------------- */
  const WKEY = 'mg-postcard';
  let w = { card: CARDS[0].id, stamp: CARDS[0].id, to: '', msg: '', from: '', side: 'back' };
  try { Object.assign(w, JSON.parse(localStorage.getItem(WKEY) || '{}')); } catch (e) { /* storage blocked */ }
  const saveW = () => { try { localStorage.setItem(WKEY, JSON.stringify(w)); } catch (e) { /* storage blocked */ } };
  const wCard = $('#wCard');
  function renderWriter() {
    const c = byId(w.card);
    paintCard(wCard, c, { stamp: w.stamp, to: w.to, msg: w.msg || t('page.msgPh'), from: w.from });
    wCard.classList.toggle('flipped', w.side === 'back');
    $('#wFlip').textContent = t(w.side === 'back' ? 'page.showFront' : 'page.showBack');
    $$('#wCards .pick').forEach(b => b.setAttribute('aria-checked', String(b.dataset.id === w.card)));
    $$('#wStamps .pick').forEach(b => b.setAttribute('aria-checked', String(b.dataset.id === w.stamp)));
    $('#wCount').textContent = `(${MG.num(w.msg.length)} / ${MG.num(220)} ${t('page.chars')})`;
    let title = orderName(c);
    if (w.msg.trim() || w.to.trim()) title += ` — ${t('page.withMessage')}: ${w.to ? t('page.to') + ' ' + w.to + ': ' : ''}«${w.msg.trim()}»${w.from ? ' — ' + w.from : ''}`;
    $('#wOrder').dataset.order = title;
  }
  function buildWriter() {
    $('#wCards').innerHTML = CARDS.map(c => `<button class="pick" type="button" role="radio" data-id="${c.id}" aria-label="${esc(L(c.city))}" title="${esc(L(c.city))}"><img src="${c.art}" alt=""></button>`).join('');
    $('#wStamps').innerHTML = CARDS.map(c => `<button class="pick" type="button" role="radio" data-id="${c.id}" aria-label="${esc(L(c.title))}" title="${esc(L(c.title))}"><img src="${c.art}" alt=""></button>`).join('');
    $$('#wCards .pick').forEach(b => b.addEventListener('click', () => { w.card = b.dataset.id; saveW(); renderWriter(); }));
    $$('#wStamps .pick').forEach(b => b.addEventListener('click', () => { w.stamp = b.dataset.id; w.side = 'back'; saveW(); renderWriter(); }));
    $('#wTo').placeholder = t('page.toPh'); $('#wMsg').placeholder = t('page.msgPh'); $('#wFrom').placeholder = t('page.fromPh');
    $('#wTo').value = w.to; $('#wMsg').value = w.msg; $('#wFrom').value = w.from;
  }
  ['to', 'msg', 'from'].forEach(k => $('#w' + k[0].toUpperCase() + k.slice(1)).addEventListener('input', e => { w[k] = e.target.value; w.side = 'back'; saveW(); renderWriter(); }));
  $('#wFlip').addEventListener('click', () => { w.side = w.side === 'back' ? 'front' : 'back'; saveW(); renderWriter(); });
  wCard.addEventListener('click', () => $('#wFlip').click());

  /* ---------------- 4. the collection ---------------- */
  function renderGrid() {
    $('#grid').innerHTML = CARDS.map((c, i) => `<button class="gcell" type="button" data-i="${i}" style="--c:${c.acc}">
      <span class="pcard">${cardHTML()}</span><span>${esc(L(c.city))} · ${esc(L(c.date))}</span><b>${esc(L(c.title))}</b></button>`).join('');
    $$('#grid .gcell').forEach((b, i) => {
      const pc = $('.pcard', b); paintCard(pc, CARDS[i]);
      if (MG.finePointer) { b.addEventListener('mouseenter', () => pc.classList.add('flipped')); b.addEventListener('mouseleave', () => pc.classList.remove('flipped')); }
      b.addEventListener('click', () => openView(i));
    });
    $('#setOrder').dataset.order = `${t('page.orderSet')}: ${CARDS.map(c => L(c.city)).join('، ')}`;
  }

  /* ---------------- boot ---------------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.rv, .stroke').forEach(el => io.observe(el));
  function relabel() {
    fillTitle(); setOpen(open); buildWriter(); renderWriter(); renderGrid();
    fanCards.forEach((el, i) => { paintCard(el, CARDS[i]); el.setAttribute('aria-label', `${L(CARDS[i].title)} · ${L(CARDS[i].city)}`); });
    if (pv.open) fillView(vi);
  }
  MG.onLang(relabel);
  relabel();
});
