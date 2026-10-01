/* Mass & Grass — light / dark theme.
   Loaded in <head> so the page never flashes the wrong colours. The site opens on light paper
   whatever the device prefers; any [data-theme-toggle] button (footer, phone menu) switches to
   dark and remembers the choice. */
(function () {
  'use strict';
  var KEY = 'mg-theme2', root = document.documentElement, saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
  function apply(mode) { root.setAttribute('data-mg-theme', mode); }
  apply(saved === 'dark' ? 'dark' : 'light');

  function sync() {
    var dark = root.getAttribute('data-mg-theme') === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(dark));
      b.setAttribute('title', dark ? 'الوضع الفاتح · Light mode' : 'الوضع الداكن · Dark mode');
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-toggle]'); if (!b) return;
    var next = root.getAttribute('data-mg-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch (err) { /* ignore */ }
    sync();
  });
  document.addEventListener('DOMContentLoaded', sync);
  window.MGThemeSync = sync;
})();
