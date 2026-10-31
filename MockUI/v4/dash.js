/* Dashboard pieces shared by the investor home (also used by shareholders) and the manager desk.
   Colour comes from tone classes (green, blue, amber, red); every figure is passed in already formatted. */
(function (root) {
  "use strict";
  var UI = root.ShehnatUI;
  function esc(s) { return UI.esc(s); }

  /* tile: { label, value, sub, tone, icon, href } */
  function tile(o) {
    var inner = "<span class=\"dash-ico\">" + UI.badge(o.icon || "chart", "neutral", "") + "</span>" +
      "<span class=\"dash-label\">" + esc(o.label) + "</span><span class=\"dash-value num\">" + o.value + "</span>" +
      (o.sub ? "<span class=\"dash-sub\">" + o.sub + "</span>" : "");
    var cls = "dash-tile dash-" + (o.tone || "green");
    if (o.href) return "<a class=\"" + cls + "\" href=\"" + o.href + "\" data-go=\"" + o.href + "\">" + inner + "</a>";
    return "<div class=\"" + cls + "\">" + inner + "</div>";
  }

  /* A small line chart that draws itself. values: numbers in time order. */
  function spark(values, tone) {
    var v = values.length > 1 ? values : [0, values[0] || 0];
    var min = Math.min.apply(null, v), max = Math.max.apply(null, v);
    var span = max - min || 1;
    var w = 160, h = 48, pad = 4;
    var pts = v.map(function (n, i) {
      return (pad + i * (w - 2 * pad) / (v.length - 1)).toFixed(1) + "," + (h - pad - (n - min) * (h - 2 * pad) / span).toFixed(1);
    });
    var area = pts.join(" ") + " " + (w - pad) + "," + (h - pad) + " " + pad + "," + (h - pad);
    return "<svg class=\"spark spark-" + (tone || "green") + "\" viewBox=\"0 0 " + w + " " + h + "\" preserveAspectRatio=\"none\" aria-hidden=\"true\">" +
      "<polygon class=\"spark-area\" points=\"" + area + "\"/><polyline class=\"spark-line\" pathLength=\"100\" points=\"" + pts.join(" ") + "\"/></svg>";
  }

  /* hero: { label, value, sub, tone, delta, split }
     split: [{ label, value (number, sets the share), text }]; the first item is drawn as a ring around the total. */
  function hero(o) {
    var sp = o.split || [];
    var total = sp.reduce(function (s, i) { return s + i.value; }, 0);
    var pct = total ? Math.round(sp[0].value * 100 / total) : 0;
    var ring = total ? "<div class=\"dash-hero-ring\" style=\"--pct:" + pct + "\" role=\"img\" aria-label=\"" + esc(sp[0].label + " " + pct + "%") + "\"><span class=\"num\">" + pct + "%</span><small>" + esc(sp[0].label) + "</small></div>" : "";
    var stats = total ? "<ul class=\"dash-hero-stats\">" + sp.map(function (i) {
      return "<li><span>" + esc(i.label) + "</span><b class=\"num\">" + i.text + "</b></li>";
    }).join("") + "</ul>" : "";
    return "<section class=\"dash-hero dash-" + (o.tone || "green") + "\"><div class=\"dash-hero-head\"><div class=\"dash-hero-main\">" +
      "<p class=\"dash-label\">" + esc(o.label) + "</p><p class=\"dash-hero-value num\">" + o.value + "</p>" +
      (o.sub ? "<p class=\"dash-sub\">" + o.sub + "</p>" : "") + "</div>" + ring + "</div>" +
      (o.delta ? "<p class=\"dash-delta\">" + o.delta + "</p>" : "") + stats + "</section>";
  }

  /* A stacked bar with a legend. items: [{label, value, tone}] */
  function bar(title, items) {
    var total = items.reduce(function (s, i) { return s + i.value; }, 0);
    if (!total) return "";
    var segs = items.filter(function (i) { return i.value > 0; });
    return "<section class=\"dash-card\"><h2>" + esc(title) + "</h2><div class=\"dash-bar\" role=\"img\" aria-label=\"" + esc(title) + "\">" +
      segs.map(function (i) { return "<i class=\"dash-" + i.tone + "\" style=\"width:" + (i.value * 100 / total).toFixed(1) + "%\"></i>"; }).join("") + "</div>" +
      "<ul class=\"dash-legend\">" + segs.map(function (i) {
        return "<li><i class=\"dash-" + i.tone + "\"></i><span>" + esc(i.label) + "</span><b class=\"num\">" + (i.text || Math.round(i.value * 100 / total) + "%") + "</b></li>";
      }).join("") + "</ul></section>";
  }

  /* A progress meter. { label, pct, text, tone } */
  function meter(o) {
    var pct = Math.max(0, Math.min(100, Math.round(o.pct)));
    return "<section class=\"dash-card\"><div class=\"dash-row\"><h2>" + esc(o.label) + "</h2><b class=\"num\">" + pct + "%</b></div>" +
      "<div class=\"dash-meter dash-" + (o.tone || "green") + "\" role=\"progressbar\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"" + pct + "\"><i style=\"width:" + pct + "%\"></i></div>" +
      (o.text ? "<p class=\"dash-sub\">" + o.text + "</p>" : "") + "</section>";
  }

  root.ShehnatDash = { tile: tile, hero: hero, bar: bar, meter: meter, spark: spark };
})(typeof globalThis !== "undefined" ? globalThis : this);
