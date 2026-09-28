/* Mass & Grass — light / dark theme.
   Loaded in <head> so the page never flashes the wrong colours. Follows the
   device setting until the visitor picks one with the header button
   (#themeBtn), then remembers the choice. */
(function () {
  'use strict';
  var KEY = 'mg-theme', root = document.documentElement, saved = null;
  var sys = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
  function apply(mode) { root.setAttribute('data-theme', mode); }
  apply(saved === 'dark' || saved === 'light' ? saved : (sys && sys.matches ? 'dark' : 'light'));

  function sync(btn) {
    var dark = root.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('title', dark ? 'الوضع الفاتح · Light mode' : 'الوضع الداكن · Dark mode');
  }
  if (sys && sys.addEventListener) sys.addEventListener('change', function (e) {
    var chosen = null; try { chosen = localStorage.getItem(KEY); } catch (err) { /* ignore */ }
    if (!chosen) { apply(e.matches ? 'dark' : 'light'); var b = document.getElementById('themeBtn'); if (b) sync(b); }
  });
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
