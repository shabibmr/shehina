/* Fade, a 16px back move, and a sheet that follows the finger. */
(function (root) {
  "use strict";
  function reduced() {
    return root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function ms(name, fallback) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(name);
    var n = parseFloat(raw);
    return n ? (raw.indexOf("ms") !== -1 ? n : n * (raw.indexOf("s") !== -1 ? 1000 : 1)) : fallback;
  }
  function finishOnTap(anim) {
    function stop() { try { anim.finish(); } catch (err) { /* already finished */ } }
    document.addEventListener("pointerdown", stop, { once: true });
    anim.onfinish = function () { document.removeEventListener("pointerdown", stop); };
  }
  function fade(el) {
    if (!el || !el.animate) return;
    var dur = reduced() ? 120 : ms("--duration-fade", 160);
    var anim = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing: "cubic-bezier(0.2, 0, 0, 1)" });
    finishOnTap(anim);
  }
  function leave(el, done) {
    if (!el || !el.animate || reduced()) {
      if (el && el.animate) el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "linear" }).onfinish = done;
      else done();
      return;
    }
    var anim = el.animate(
      [{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(-16px)", opacity: 0 }],
      { duration: ms("--duration-fade", 160), easing: "cubic-bezier(0.2, 0, 0, 1)" }
    );
    finishOnTap(anim);
    anim.onfinish = done;
  }
  function bindSheet(sheet) {
    var startY = 0;
    var dy = 0;
    sheet.addEventListener("pointerdown", function (ev) {
      if (ev.target.closest("input, select, textarea, button")) return;
      startY = ev.clientY;
      dy = 0;
      sheet.setPointerCapture(ev.pointerId);
    });
    sheet.addEventListener("pointermove", function (ev) {
      if (!startY || reduced()) return;
      dy = Math.max(0, ev.clientY - startY);
      sheet.style.transform = "translateY(" + dy + "px)";
    });
    sheet.addEventListener("pointerup", function () {
      if (dy > 80) {
        sheet.style.transform = "";
        root.ShehnatUI && root.ShehnatUI.closeSheet();
      } else sheet.style.transform = "";
      startY = 0;
      dy = 0;
    });
  }
  root.ShehnatMotion = { reduced: reduced, fade: fade, leave: leave, bindSheet: bindSheet };
})(typeof globalThis !== "undefined" ? globalThis : this);
