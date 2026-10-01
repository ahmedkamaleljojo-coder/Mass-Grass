/* Mass & Grass — light / dark theme.
   Loaded in <head> so the page never flashes the wrong colours. The site is
   white (light) by default, whatever the device prefers; the header button
   (#themeBtn) switches to dark and remembers the choice. */
(function () {
  'use strict';
  var KEY = 'mg-theme', root = document.documentElement, saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
  function apply(mode) { root.setAttribute('data-theme', mode); }
  apply(saved === 'dark' ? 'dark' : 'light');

  function sync(btn) {
    var dark = root.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('title', dark ? 'الوضع الفاتح · Light mode' : 'الوضع الداكن · Dark mode');
  }
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('themeBtn'); if (!btn) return;
    sync(btn);
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* ignore */ }
      sync(btn);
    });
  });
})();
