/* Mass & Grass — the basket.
   Every "order" button on the site (data-order="<title>", or MG.openOrder(title) from page code)
   puts the piece in the basket instead: the title is matched to a piece in catalog.js, and
   whatever follows the piece's own title (a colour, chosen months, dates) is kept as its option.
   The basket lives in localStorage, the count shows on the basket link in the header, and the
   basket page (/cart/) ends with payment or sending the order. */
(function (global) {
  'use strict';
  const KEY = 'mg-cart';
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'ar');
  const L = v => (v && typeof v === 'object') ? (v[lang()] ?? v.ar ?? '') : (v ?? '');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function read() { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function write(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* storage blocked: the basket lasts this page only */ } mem = list; emit(); }
  let mem = read();
  const subs = [];
  const emit = () => { badge(); subs.forEach(fn => fn(mem)); };

  const Cart = {
    items: () => mem.slice(),
    count: () => mem.reduce((n, e) => n + (e.qty || 1), 0),
    on(fn) { subs.push(fn); },
    add(entry) {
      const list = read(), hit = list.find(e => e.key === entry.key);
      if (hit) hit.qty = (hit.qty || 1) + 1; else list.push(Object.assign({ qty: 1 }, entry));
      write(list);
    },
    setQty(key, q) { write(read().map(e => e.key === key ? Object.assign(e, { qty: Math.max(1, Math.min(99, q)) }) : e)); },
    remove(key) { write(read().filter(e => e.key !== key)); },
    clear() { write([]); },
    notify(name) { toast(name); },
    // a title from an order button → a basket entry
    async addByTitle(text) {
      const F = global.MGCatalog.fold, items = await global.MGCatalog.load(), t = F(text);
      let it = items.find(x => F(x.title.ar) === t || F(x.title.en) === t), opt = '';
      if (!it) {   // the piece's title followed by its options ("هودي بستان الزيتون · أبيض")
        const hits = items.filter(x => [x.title.ar, x.title.en].some(s => s && t.startsWith(F(s))))
          .sort((a, b) => F(L(b.title)).length - F(L(a.title)).length);
        if (hits[0]) {
          it = hits[0];
          const own = [it.title.ar, it.title.en].find(s => s && t.startsWith(F(s)));
          opt = String(text).trim().slice(own.length).replace(/^[\s·:،,—–-]+/, '').trim();
        }
      }
      const entry = it ? { key: `${it.id}|${opt}`, id: it.id, title: it.title, opt }
        : { key: `custom|${text}`, id: null, title: { ar: text, en: text }, opt: '' };
      Cart.add(entry);
      toast(L(entry.title));
    }
  };

  // the site's own words for the basket (site.json → ui.cart)
  let words = null;
  async function ui() {
    if (words) return words;
    const site = (global.MG && global.MG.site) || (global.__CONTENT__ && global.__CONTENT__.site)
      || await fetch('/content/site.json').then(r => r.json()).catch(() => ({}));
    return (words = (site.ui && site.ui.cart) || {});
  }

  function badge() {
    const n = Cart.count();
    document.querySelectorAll('.cart-n').forEach(b => { b.textContent = String(n); b.hidden = !n; });
  }

  let toastEl, toastT;
  async function toast(name) {
    const w = await ui();
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'cart-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = `<span><b>${esc(name)}</b> ${esc(L(w.added))}</span><a href="/cart/">${esc(L(w.view))}</a>`;
    toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 3200);
  }

  // order buttons add to the basket (caught before the order sheet in shell.js)
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-order]');
    if (!a || !a.dataset.order) return;
    e.preventDefault(); e.stopImmediatePropagation();
    Cart.addByTitle(a.dataset.order);
  }, true);
  if (global.MG) global.MG.openOrder = title => Cart.addByTitle(title);

  // another tab changed the basket
  addEventListener('storage', e => { if (e.key === KEY) { mem = read(); emit(); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', badge); else badge();

  global.MGCart = Cart;
})(window);
