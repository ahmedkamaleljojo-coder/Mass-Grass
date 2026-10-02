/* Mass & Grass — the basket page: the chosen pieces with their pictures and quantities, then the
   summary and the last step. Card payment goes to the shop's payment link (content/settings.json →
   shop.link) when one is set; otherwise, and always as an alternative, the whole order is sent as
   one message on WhatsApp, e-mail or Instagram. */
MG.ready(async ({ $, $$, L, t, esc }) => {
  const items = await MGCatalog.load();
  const byId = id => items.find(x => x.id === id);
  const form = { name: '', reach: '', note: '' };

  function lines() {
    return MGCart.items().map(e => {
      const it = e.id && byId(e.id);
      return { e, it, title: it ? L(it.title) : L(e.title), price: it && it.price ? MGCatalog.priceNum(it.price) : null };
    });
  }

  function render() {
    const ls = lines();
    if (!ls.length) {
      $('#cart').classList.add('is-empty');
      $('#cartList').innerHTML = `<div class="cart-empty"><p>${esc(t('cart.empty'))}</p><a class="btn" href="/shop/">${esc(t('cart.browse'))}</a></div>`;
      $('#cartSum').innerHTML = '';
      return;
    }
    $('#cart').classList.remove('is-empty');
    $('#cartList').innerHTML = ls.map(({ e, it, title, price }) => `
      <div class="cl" data-key="${esc(e.key)}">
        <a class="cl-img" href="${esc(it ? it.href : '#')}"><img alt="" decoding="async"></a>
        <div class="cl-body">
          ${it ? `<span class="sp-sec">${esc(L(it.secTitle))}</span>` : ''}
          <b class="cl-title">${esc(title)}</b>
          ${e.opt ? `<span class="cl-opt">${esc(e.opt)}</span>` : ''}
          ${it && it.price ? `<span class="sp-price">${esc(L(it.price))}</span>` : ''}
        </div>
        <div class="cl-qty" role="group" aria-label="${esc(title)}">
          <button type="button" data-q="-1" aria-label="${esc(t('cart.less'))}">−</button>
          <span>${e.qty || 1}</span>
          <button type="button" data-q="1" aria-label="${esc(t('cart.more'))}">+</button>
        </div>
        <button class="cl-x" type="button" data-rm aria-label="${esc(t('cart.remove'))}">${esc(t('cart.remove'))}</button>
      </div>`).join('');
    ls.forEach(({ e, it }) => {
      if (!it) return;
      const img = $(`.cl[data-key="${CSS.escape(e.key)}"] img`);
      MGCatalog.thumb(it, 300).then(src => { if (src && img) img.src = src; });
    });
    summary(ls);
  }

  function summary(ls) {
    const count = ls.reduce((n, l) => n + (l.e.qty || 1), 0);
    const priced = ls.filter(l => l.price != null), unpriced = ls.length - priced.length;
    const total = priced.reduce((s, l) => s + l.price * (l.e.qty || 1), 0);
    const k = MG.site.contact || {}, link = (MG.site.shop || {}).link || '';
    const ch = [
      { id: 'whatsapp', on: !!k.whatsapp },
      { id: 'email', on: !!k.email },
      { id: 'instagram', on: !!k.instagram }
    ];
    $('#cartSum').innerHTML = `
      <h2 class="cs-title" id="sumTitle">${esc(t('cart.summary'))}</h2>
      <dl class="cs-rows">
        <div><dt>${esc(t('cart.pieces'))}</dt><dd>${MG.num(count)}</dd></div>
        ${priced.length ? `<div class="cs-total"><dt>${esc(t('cart.total'))}</dt><dd>${MG.num(+total.toFixed(2))}$</dd></div>` : ''}
      </dl>
      ${unpriced ? `<p class="cs-note">${esc(t('cart.priceLater'))}</p>` : ''}
      <p class="cs-note">${esc(t('cart.format'))}</p>
      <div class="cs-form">
        <label><span>${esc(t('cart.name'))}</span><input name="name" autocomplete="name" value="${esc(form.name)}"></label>
        <label><span>${esc(t('cart.reach'))}</span><input name="reach" autocomplete="email" value="${esc(form.reach)}"></label>
        <label><span>${esc(t('cart.note'))}</span><textarea name="note" rows="2">${esc(form.note)}</textarea></label>
      </div>
      ${link ? `<a class="btn cs-pay" href="${esc(link)}" target="_blank" rel="noopener">${esc(t('cart.pay'))}</a>`
             : `<span class="btn cs-pay off" aria-disabled="true">${esc(t('cart.paySoon'))}</span>`}
      <p class="cs-or">${esc(t('cart.or'))}</p>
      <div class="cs-ch">${ch.map(c => `<button type="button" class="cs-b${c.on ? '' : ' off'}" data-ch="${c.id}">${esc(t('cart.' + c.id))}</button>`).join('')}</div>
      <button class="cs-clear" type="button" data-clear>${esc(t('cart.clear'))}</button>`;
  }

  // the whole order as one message
  function message() {
    const ls = lines(), priced = ls.filter(l => l.price != null);
    const rows = ls.map(l => `• ${l.title}${l.e.opt ? ` (${l.e.opt})` : ''}${(l.e.qty || 1) > 1 ? ` × ${l.e.qty}` : ''}`);
    const out = [t('cart.message'), ...rows];
    if (priced.length) out.push(`${t('cart.msgTotal')}: ${+priced.reduce((s, l) => s + l.price * (l.e.qty || 1), 0).toFixed(2)}$`);
    if (form.name) out.push(`${t('cart.msgName')}: ${form.name}`);
    if (form.reach) out.push(`${t('cart.msgReach')}: ${form.reach}`);
    if (form.note) out.push(`${t('cart.msgNote')}: ${form.note}`);
    return out.join('\n');
  }

  $('#cartList').addEventListener('click', e => {
    const row = e.target.closest('.cl'); if (!row) return;
    const key = row.dataset.key, cur = MGCart.items().find(x => x.key === key);
    const q = e.target.closest('[data-q]');
    if (q && cur) MGCart.setQty(key, (cur.qty || 1) + +q.dataset.q);
    if (e.target.closest('[data-rm]')) MGCart.remove(key);
  });
  $('#cartSum').addEventListener('input', e => { if (e.target.name in form) form[e.target.name] = e.target.value; });
  $('#cartSum').addEventListener('click', e => {
    if (e.target.closest('[data-clear]')) { MGCart.clear(); return; }
    if (e.target.closest('.cs-pay.off')) { MG.toast(t('cart.paySoon')); return; }
    const b = e.target.closest('[data-ch]'); if (!b) return;
    if (b.classList.contains('off')) { MG.toast(t('cart.soon')); return; }
    const k = MG.site.contact || {}, msg = message();
    if (b.dataset.ch === 'whatsapp') open(`https://wa.me/${k.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    if (b.dataset.ch === 'email') location.href = `mailto:${k.email}?subject=${encodeURIComponent('Mass & Grass')}&body=${encodeURIComponent(msg)}`;
    if (b.dataset.ch === 'instagram') {   // Instagram can't pre-fill a message: copy it, then open the chat
      if (navigator.clipboard) navigator.clipboard.writeText(msg).then(() => MG.toast(t('cart.copied'))).catch(() => {});
      open(`https://ig.me/m/${k.instagram.replace(/^@/, '')}`, '_blank', 'noopener');
    }
  });

  MGCart.on(render);
  render();
  MG.onLang(render);
});
