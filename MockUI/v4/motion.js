/* PROTOTYPE, throwaway. Fade, finger-follow back, sheet-follow. Reduced motion is a 120ms fade. */
(function (g) {
  'use strict';
  function reduced() {
    var mode = Store.proto.motion;
    if (mode === 'reduced') return true;
    if (mode === 'full') return false;
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function applyMode() {
    document.documentElement.classList.toggle('reduced', reduced());
  }
  function fade(el) {
    if (!el) return;
    el.classList.remove('is-fade');
    void el.offsetWidth;
    el.classList.add('is-fade');
  }
  function bindBack(host, onBack) {
    var startX = 0, startY = 0, active = false, dx = 0;
    host.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      startX = e.clientX; startY = e.clientY; active = true; dx = 0;
    });
    host.addEventListener('pointermove', function (e) {
      if (!active) return;
      var raw = e.clientX - startX;
      var rtl = document.documentElement.dir === 'rtl';
      dx = rtl ? -raw : raw;
      if (dx < 0 || Math.abs(e.clientY - startY) > 40) return;
      var dist = reduced() ? 0 : Math.min(dx, 16);
      host.style.transform = 'translateX(' + (rtl ? -dist : dist) + 'px)';
    });
    function end() {
      if (!active) return;
      active = false;
      host.style.transform = '';
      if (dx > 12 && onBack) onBack();
    }
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);
  }
  function bindSheet(sheet) {
    var handle = sheet.querySelector('.sheet-handle');
    if (!handle) return;
    var startY = 0, dy = 0, active = false;
    handle.addEventListener('pointerdown', function (e) { active = true; startY = e.clientY; dy = 0; });
    handle.addEventListener('pointermove', function (e) {
      if (!active) return;
      dy = Math.max(0, e.clientY - startY);
      sheet.style.transform = 'translateY(' + (reduced() ? 0 : dy) + 'px)';
    });
    function end() {
      if (!active) return;
      active = false;
      sheet.style.transform = '';
      if (dy > 80) Ui.closeSheet();
    }
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }
  g.Motion = { reduced: reduced, applyMode: applyMode, fade: fade, bindBack: bindBack, bindSheet: bindSheet };
})(typeof globalThis !== 'undefined' ? globalThis : this);
