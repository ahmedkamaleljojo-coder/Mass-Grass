/* Mass & Grass — story page: Farah's chapters along a painted thread. */
MG.ready(function (MG) {
  'use strict';
  const { $, $$, L, t, esc } = MG;
  const chapters = MG.page.chapters;

  function render() {
    $('#road').innerHTML = chapters.map((c, i) => `
      <li class="chap rv" style="--c:${c.color};--rd:${i ? 0 : 0}s">
        <span class="chap-tag">${esc(L(c.tag))}</span>
        <h2 class="display">${esc(L(c.title))}</h2>
        ${c.quote ? `<blockquote>${esc(L(c.quote))}</blockquote>` : ''}
        <p>${esc(L(c.text))}</p>
      </li>`).join('');
    $('#portraitImg').alt = t('hero.portraitAlt');
    document.title = `${t('meta.title')} | Mass & Grass`;
    observe($$('#road .rv'));
  }

  let io;
  function observe(els) {
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    els.forEach(e => io.observe(e));
  }
  io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15 });

  render();
  MG.onLang(render);
  $$('.rv, .stroke').forEach(el => io.observe(el));
  io.observe($('#road'));

  // the portrait spreads like a wet wash once its image has arrived
  const paper = $('.portrait-paper'), img = $('#portraitImg');
  const go = () => paper.classList.add('wet');
  img.complete ? go() : img.addEventListener('load', go, { once: true });
});
