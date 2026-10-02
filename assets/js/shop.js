/* Mass & Grass — all products: every piece from every section in one grid, with the sections as
   plain-text filters on top. Each piece links to its page and can go straight into the basket. */
MG.ready(async ({ $, $$, L, t, esc }) => {
  const items = await MGCatalog.load();
  const secs = [];
  items.forEach(it => { if (!secs.find(s => s.id === it.sec)) secs.push({ id: it.sec, title: it.secTitle }); });
  let cur = (location.hash.slice(1) && secs.find(s => s.id === location.hash.slice(1))) ? location.hash.slice(1) : 'all';

  function tabs() {
    $('#shopTabs').innerHTML = [{ id: 'all', title: MG.page.shop.all }, ...secs].map(s =>
      `<button type="button" data-sec="${s.id}" aria-pressed="${s.id === cur}">${esc(L(s.title))}</button>`).join('');
  }
  $('#shopTabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    cur = b.dataset.sec;
    history.replaceState(null, '', cur === 'all' ? location.pathname : '#' + cur);
    tabs(); grid();
  });

  let io;
  function grid() {
    const list = items.filter(it => cur === 'all' || it.sec === cur);
    $('#shopGrid').innerHTML = list.length ? list.map((it, i) => `
      <article class="sp${it.garment ? ' sp-cloth' : ''}" data-id="${esc(it.id)}" style="--i:${i % 12}">
        <a class="sp-img" href="${esc(it.href)}" aria-label="${esc(L(it.title))}"><img alt="" loading="lazy" decoding="async"></a>
        <div class="sp-body">
          <span class="sp-sec">${esc(L(it.secTitle))}</span>
          <h2 class="sp-title"><a href="${esc(it.href)}">${esc(L(it.title))}</a></h2>
          ${it.price ? `<span class="sp-price">${esc(L(it.price))}</span>` : ''}
          <button class="sp-add" type="button" data-add="${esc(it.id)}">${esc(t('shop.add'))} <span aria-hidden="true">+</span></button>
        </div>
      </article>`).join('') : `<p class="sp-none">${esc(t('shop.none'))}</p>`;
    // pictures arrive as each card comes near the screen (samples and garments are painted on the spot)
    if (io) io.disconnect();
    io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const it = items.find(x => x.id === e.target.dataset.id), img = $('img', e.target);
      MGCatalog.thumb(it, 600).then(src => { if (src) { img.src = src; img.onload = () => e.target.classList.add('in'); } else e.target.classList.add('in'); });
    }), { rootMargin: '300px' });
    $$('.sp', $('#shopGrid')).forEach(el => io.observe(el));
  }

  $('#shopGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    const it = items.find(x => x.id === b.dataset.add);
    MGCart.add({ key: `${it.id}|`, id: it.id, title: it.title, opt: '' });
    MGCart.notify(L(it.title));
    b.classList.add('done'); setTimeout(() => b.classList.remove('done'), 900);
  });

  tabs(); grid();
  MG.onLang(() => { tabs(); grid(); });
});
