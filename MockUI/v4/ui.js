/* Router, chrome, and the shared components. No inline handlers. */
(function (root) {
  "use strict";
  var L, Store, Motion, screens = [], current, params = {}, timer, toastTimer, lastFocus;

  var COUNTRIES = [
    ["AE", "United Arab Emirates"], ["AU", "Australia"], ["BR", "Brazil"], ["CL", "Chile"], ["CN", "China"],
    ["DE", "Germany"], ["EG", "Egypt"], ["ES", "Spain"], ["FR", "France"], ["GB", "United Kingdom"],
    ["GH", "Ghana"], ["GT", "Guatemala"], ["ID", "Indonesia"], ["IN", "India"], ["IT", "Italy"],
    ["JO", "Jordan"], ["JP", "Japan"], ["KE", "Kenya"], ["KR", "South Korea"], ["LK", "Sri Lanka"],
    ["MG", "Madagascar"], ["MX", "Mexico"], ["NL", "Netherlands"], ["NO", "Norway"], ["OM", "Oman"],
    ["PH", "Philippines"], ["QA", "Qatar"], ["SA", "Saudi Arabia"], ["SG", "Singapore"], ["TZ", "Tanzania"],
    ["US", "United States"], ["VN", "Vietnam"], ["ZA", "South Africa"],
    ["CU", "Cuba"], ["IR", "Iran"], ["KP", "North Korea"], ["SY", "Syria"]
  ];

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function cname(code) {
    var hit = COUNTRIES.filter(function (c) { return c[0] === code; })[0];
    return hit ? hit[1] : code;
  }
  function countryOpts(selected) {
    var blocked = Store.state.settings.blocked;
    return COUNTRIES.filter(function (c) { return blocked.indexOf(c[0]) === -1; }).map(function (c) {
      return "<option value=\"" + c[0] + "\"" + (c[0] === selected ? " selected" : "") + ">" + esc(c[1]) + "</option>";
    }).join("");
  }
  function blockedNote() {
    var names = Store.state.settings.blocked.map(cname).join(", ");
    return "<p class=\"muted\">These countries are not available: " + esc(names) + ".</p>";
  }
  function when(ms) {
    if (!ms) return "";
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(ms);
  }
  function money(cents, kind) {
    var text = L.formatUsd(cents);
    if (kind === "gain") return "<span class=\"money gain\">+" + text.replace("\u2212", "") + " \u25B2 Profit</span>";
    if (kind === "loss") return "<span class=\"money loss\">" + (cents < 0 ? text : "\u2212" + text) + " \u25BC Loss</span>";
    if (kind === "expected") return "<span class=\"money\">" + text + " expected</span>";
    return "<span class=\"money price\">" + text + "</span>";
  }
  function icon(name) {
    var paths = {
      home: "<path d=\"M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z\"/>",
      ship: "<path d=\"M3 15h18l-2 5H5l-2-5Zm2-2 7-9 7 9H5Z\"/>",
      list: "<path d=\"M6 6h14v2H6V6Zm0 5h14v2H6v-2Zm0 5h14v2H6v-2ZM3 6h2v2H3V6Zm0 5h2v2H3v-2Zm0 5h2v2H3v-2Z\"/>",
      wallet: "<path d=\"M3 7a2 2 0 0 1 2-2h14v4H5v2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm14 7a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z\"/>",
      you: "<path d=\"M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0v1H5v-1Z\"/>",
      search: "<path d=\"M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM15 15l5 5-1.5 1.5-5-5L15 15Z\"/>",
      back: "<path d=\"M14.5 5 7 12l7.5 7 1.5-1.5L10 12l6-5.5L14.5 5Z\"/>",
      chev: "<path d=\"M9 5l7 7-7 7-1.5-1.5L13 12 7.5 6.5 9 5Z\"/>",
      queue: "<path d=\"M4 5h16v2H4V5Zm0 6h16v2H4v-2Zm0 6h10v2H4v-2Z\"/>",
      money: "<path d=\"M4 7h16v10H4V7Zm8 7a2.2 2.2 0 1 0 0-4.4A2.2 2.2 0 0 0 12 14Z\"/>"
    };
    if (paths[name]) return "<svg viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" aria-hidden=\"true\" fill=\"currentColor\">" + paths[name] + "</svg>";
    return strokeIcon(name, 24);
  }

  /* Outline icons: drawn with strokes so a check or an arrow can draw itself in. */
  var STROKES = {
    check: "<path class=\"draw\" d=\"M5 12.5l4.5 4.5L19 7.5\"/>",
    clock: "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path class=\"hand\" d=\"M12 7.5V12l3 2\"/>",
    alert: "<path d=\"M12 4 3 19.5h18L12 4Z\"/><path d=\"M12 10v4.5M12 17.2v.1\"/>",
    shield: "<path d=\"M12 3.5 5 6v5.5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6l-7-2.5Z\"/><path class=\"draw\" d=\"M9 12l2.2 2.2L15.5 10\"/>",
    lock: "<rect x=\"5.5\" y=\"10.5\" width=\"13\" height=\"9\" rx=\"1.5\"/><path d=\"M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5\"/>",
    document: "<path d=\"M7 3.5h7l4 4V20.5H7V3.5Z\"/><path d=\"M14 3.5v4h4M9.5 12h6M9.5 15.5h6\"/>",
    receipt: "<path d=\"M6.5 3.5h11V21l-2.75-1.8L12 21l-2.75-1.8L6.5 21V3.5Z\"/><path class=\"draw\" d=\"M9.5 8.5h5M9.5 12h5\"/>",
    upload: "<path d=\"M12 16V5M7.5 9.5 12 5l4.5 4.5M5 19.5h14\"/>",
    bank: "<path d=\"M3.5 9.5 12 4l8.5 5.5M5.5 10v8M10 10v8M14 10v8M18.5 10v8M4 20h16\"/>",
    in: "<g class=\"slide\"><path d=\"M12 4.5v12M7.5 12 12 16.5 16.5 12\"/></g><path d=\"M5 20h14\"/>",
    out: "<g class=\"slide\"><path d=\"M12 19.5v-12M7.5 12 12 7.5 16.5 12\"/></g><path d=\"M5 4h14\"/>",
    ship: "<g class=\"sail\"><path d=\"M3.5 15h17l-2.2 4.5H5.7L3.5 15Z\"/><path d=\"M12 4.5v9.5M12 5l5 8.5H12\"/></g>",
    package: "<path d=\"M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5Z\"/><path d=\"M4 8l8 4.5L20 8M12 12.5v8\"/>",
    inbox: "<path d=\"M4 13.5 6.5 5h11L20 13.5V19H4v-5.5Z\"/><path d=\"M4 13.5h4.5l1 2.5h5l1-2.5H20\"/>",
    bell: "<path d=\"M6 17.5V11a6 6 0 0 1 12 0v6.5l1.5 1.5h-15L6 17.5Z\"/><path d=\"M10 21h4\"/>",
    user: "<circle cx=\"12\" cy=\"8.5\" r=\"3.5\"/><path d=\"M5 20a7 7 0 0 1 14 0\"/>",
    users: "<circle cx=\"9\" cy=\"9\" r=\"3\"/><path d=\"M3.5 19a5.5 5.5 0 0 1 11 0M16 6.3a3 3 0 0 1 0 5.4M17.5 14a5.5 5.5 0 0 1 3 5\"/>",
    chart: "<path d=\"M4 20V4M4 20h16\"/><path class=\"draw\" d=\"M7.5 15l3.5-4 3 2.5L19 7.5\"/>",
    globe: "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5Z\"/>",
    gear: "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2 18 18M18 6l-1.8 1.8M7.8 16.2 6 18\"/>",
    plus: "<path d=\"M12 5v14M5 12h14\"/>",
    flag: "<path d=\"M6 20.5v-17M6 4.5h11l-2 4 2 4H6\"/>",
    info: "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 11v5M12 8v.1\"/>",
    cross: "<path d=\"M6.5 6.5l11 11M17.5 6.5l-11 11\"/>",
    wallet: "<path d=\"M4.5 8h15.5V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V8Z\"/><path d=\"M4.5 8 7 5h9.5L19 8\"/><path d=\"M14 13.2h6v3h-6a1.5 1.5 0 0 1 0-3Z\"/>",
    port: "<path d=\"M3.5 19.5h17\"/><path d=\"M6 19.5V11h7v8.5\"/><path d=\"M8 13.5h3M8 16h3\"/><path d=\"M16.5 19.5V8M16.5 8h4.5M19 8v3.5\"/>"
  };
  var STAGE_ICON = {
    "Funding open": "wallet",
    "Goods purchased": "package",
    "Loaded at port": "port",
    "At sea": "ship",
    "Customs cleared": "shield",
    "Goods sold": "receipt",
    "Profit paid out": "bank"
  };
  function stageGlyph(name, size) {
    var key = STAGE_ICON[name];
    return key ? strokeIcon(key, size || 20) : "";
  }
  function strokeIcon(name, size) {
    return "<svg viewBox=\"0 0 24 24\" width=\"" + size + "\" height=\"" + size + "\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\">" + (STROKES[name] || "") + "</svg>";
  }

  /* A larger round icon. motion: "pop" | "pulse" | "shake" | "float" | "" (static). */
  function badge(name, tone, motion) {
    return "<span class=\"ico ico-" + (tone || "neutral") + (motion ? " ico-" + motion : "") + "\" aria-hidden=\"true\">" + strokeIcon(name, 28) + "</span>";
  }

  /* Adds a purposeful icon to empty states, banners and status labels after a screen renders. */
  function decorate(stage) {
    stage.querySelectorAll(".empty").forEach(function (el) {
      if (el.querySelector(".ico")) return;
      el.insertAdjacentHTML("afterbegin", badge("inbox", "neutral", "float"));
    });
    stage.querySelectorAll(".banner").forEach(function (el) {
      if (el.querySelector(".ico")) return;
      var kind = el.classList.contains("banner-success") ? ["check", "success", "pop"]
        : el.classList.contains("banner-loss") ? ["alert", "loss", "shake"]
        : el.classList.contains("banner-warning") ? ["alert", "warning", "pulse"]
        : /waiting|pending|review/i.test(el.textContent) ? ["clock", "neutral", "pulse"]
        : ["info", "neutral", ""];
      el.classList.add("has-ico");
      el.insertAdjacentHTML("afterbegin", badge(kind[0], kind[1], kind[2]));
    });
    stage.querySelectorAll(".status").forEach(function (el) {
      if (el.querySelector(".ico-sm")) return;
      var t = el.textContent.trim().toLowerCase();
      var kind = /^(pending|in review|in_review|awaiting|proposed|waiting)/.test(t) ? ["clock", "pulse"]
        : /^(approved|completed|paid|verified|done|live)/.test(t) ? ["check", "pop"]
        : /^(rejected|late|overdue|failed|cancelled|withdrawn)/.test(t) ? ["alert", "shake"] : null;
      if (kind) el.insertAdjacentHTML("afterbegin", "<span class=\"ico-sm ico-" + kind[1] + "\" aria-hidden=\"true\">" + strokeIcon(kind[0], 14) + "</span>");
    });
  }

  function screen(def) { screens.push(def); }

  function homeFor(u) {
    if (!u) return "#/sign-in";
    if (u.role === "investor") return "#/home";
    if (u.role === "manager") return "#/desk";
    return "#/queue";
  }

  function go(hash) {
    if (location.hash === hash) render(false);
    else location.hash = hash;
  }
  function back() {
    var stage = document.getElementById("stage");
    Motion.leave(stage, function () {
      if (history.length > 1) history.back();
      else go("#/home");
    });
  }

  function find(hash) {
    var i, found;
    for (i = 0; i < screens.length; i++) {
      found = screens[i].test(hash);
      if (found) return { def: screens[i], params: found };
    }
    return null;
  }

  function guard(def) {
    var u = Store.user();
    if (def.auth === "public") return true;
    if (!u) { if (location.hash !== "#/sign-in") location.hash = "#/sign-in"; return false; }
    if (def.auth === "investor" && u.role !== "investor") { location.hash = homeFor(u); return false; }
    if (def.auth === "manager" && u.role !== "manager") { location.hash = homeFor(u); return false; }
    if (def.auth === "staff" && ["owner", "reviewer", "ops", "finance"].indexOf(u.role) === -1) { location.hash = homeFor(u); return false; }
    return true;
  }

  function screenTitle(def) {
    if (!def || def.title == null) return "";
    var value = typeof def.title === "function" ? def.title(params) : def.title;
    return value ? String(value) : "";
  }

  function chrome(def) {
    var mast = document.getElementById("mast");
    var mode = document.getElementById("mode");
    var bar = document.getElementById("actionbar");
    var u = Store.user();
    if (!def || def.chrome === "none") {
      mast.hidden = true; mode.hidden = true; bar.hidden = true; return;
    }
    mast.hidden = false;
    var backBtn = def.back ? "<button class=\"icon-btn\" type=\"button\" data-back aria-label=\"Back\">" + icon("back") + "</button>" : "<a href=\"#/\" data-go=\"" + homeFor(u) + "\" aria-label=\"Shehnat\"><img class=\"mark\" src=\"../../Demo/frontend/brand/mark.svg\" alt=\"\"></a>";
    var search = "<span></span>";
    var title = screenTitle(def);
    var mid = title ? "<h1 class=\"mast-title\">" + esc(title) + "</h1>" : "<span></span>";
    mast.innerHTML = backBtn + mid + search;
    var task = typeof def.task === "function" ? def.task(params) : def.task;
    var shell = document.querySelector(".shell");
    if (task) {
      mode.hidden = true;
      bar.hidden = false;
      bar.innerHTML = def.actions ? def.actions(params) : "";
      if (shell) shell.classList.remove("staff-rail");
    } else if (def.chrome === "plain" || !u) {
      mode.hidden = true; bar.hidden = true;
      if (shell) shell.classList.remove("staff-rail");
    } else {
      bar.hidden = true; mode.hidden = false;
      mode.innerHTML = nav(u, def.section);
      var staff = ["owner", "reviewer", "ops", "finance"].indexOf(u.role) !== -1;
      if (shell) shell.classList.toggle("staff-rail", staff);
    }
  }

  function nav(u, section) {
    var items;
    if (u.role === "investor") items = [["home", "Home", "#/home", "home"], ["ship", "Shipments", "#/shipments", "ship"], ["wallet", "Wallet", "#/wallet", "wallet"], ["you", "You", "#/you", "you"]];
    else if (u.role === "manager") items = [["home", "Home", "#/desk", "home"], ["list", "Listings", "#/listings", "list"], ["wallet", "Wallet", "#/wallet", "wallet"], ["you", "You", "#/you", "you"]];
    else items = [["queue", "Queue", "#/queue", "queue"], ["list", "Listings", "#/staff-listings", "list"], ["money", "Money", "#/staff-money", "money"], ["you", "You", "#/you", "you"]];
    return items.map(function (it) {
      var on = it[0] === section ? " aria-current=\"page\"" : "";
      return "<a href=\"" + it[2] + "\" data-go=\"" + it[2] + "\"" + on + ">" + icon(it[3]) + "<span>" + it[1] + "</span></a>";
    }).join("");
  }

  function render(isBack) {
    var hash = location.hash || "#/";
    var hit = find(hash);
    if (!hit) { location.hash = "#/"; return; }
    if (!guard(hit.def)) return;
    current = hit.def;
    params = hit.params;
    chrome(hit.def);
    var stage = document.getElementById("stage");
    // Render at once: only the stage is replaced (masthead and tab bar are already updated above), then it fades in.
    clearTimeout(timer);
    stage.innerHTML = "";
    hit.def.render(stage, params);
    decorate(stage);
    var title = screenTitle(hit.def);
    stage.querySelectorAll("h1").forEach(function (h) {
      if (title && h.textContent.trim() === title) h.remove();
    });
    Motion.fade(stage);
    var focus = document.querySelector(".mast-title") || stage.querySelector("h1");
    if (focus) focus.setAttribute("tabindex", "-1");
  }

  function toast(text) {
    var el = document.getElementById("toast");
    el.hidden = false;
    el.textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2400);
  }

  function closeSheet() {
    document.getElementById("scrim").hidden = true;
    var sheet = document.getElementById("sheet");
    sheet.hidden = true;
    sheet.innerHTML = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function openSheet(html) {
    lastFocus = document.activeElement;
    document.getElementById("scrim").hidden = false;
    var sheet = document.getElementById("sheet");
    sheet.hidden = false;
    sheet.innerHTML = html;
    var first = sheet.querySelector("button, input, select, textarea");
    if (first) first.focus();
  }

  function onClick(ev) {
    var goEl = ev.target.closest("[data-go]");
    if (goEl) { ev.preventDefault(); go(goEl.getAttribute("data-go")); return; }
    if (ev.target.closest("[data-back]")) { ev.preventDefault(); back(); return; }
    if (ev.target.closest("[data-close]")) { closeSheet(); return; }
    var act = ev.target.closest("[data-act]");
    if (act && current && current.on) current.on(act.getAttribute("data-act"), act, params);
  }
  function onSubmit(ev) {
    var form = ev.target.closest("form");
    if (!form || !current || !current.submit) return;
    ev.preventDefault();
    current.submit(new FormData(form), params, form);
  }
  function onKey(ev) {
    var sheet = document.getElementById("sheet");
    if (ev.key === "Escape" && !sheet.hidden) { closeSheet(); return; }
    if (ev.key !== "Tab" || sheet.hidden) return;
    var items = sheet.querySelectorAll("button, input, select, textarea, a");
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  }

  /* Shared layout components. Each returns an HTML string. */
  function kpis(items) {
    return "<div class=\"kpis\">" + items.map(function (it) {
      return "<div class=\"kpi-tile\"><span class=\"muted\">" + esc(it[0]) + "</span><span class=\"num kpi-val\">" + it[1] + "</span></div>";
    }).join("") + "</div>";
  }
  function tabs(items, active, act) {
    return "<div class=\"tabs\" role=\"tablist\">" + items.map(function (t) {
      return "<button type=\"button\" role=\"tab\" data-act=\"" + act + "\" data-tab=\"" + t[0] + "\" aria-selected=\"" + (active === t[0]) + "\">" + esc(t[1]) + "</button>";
    }).join("") + "</div>";
  }
  function fold(summary, body, open) {
    return "<details class=\"fold\"" + (open ? " open" : "") + "><summary>" + summary + "</summary><div class=\"fold-body stack\">" + body + "</div></details>";
  }
  function menu(label, items) {
    return "<details class=\"menu\"><summary class=\"btn-text\">" + esc(label) + "</summary><div class=\"menu-list\">" + items + "</div></details>";
  }
  function sticky(html) {
    return "<div class=\"sticky-actions\">" + html + "</div>";
  }
  function group(title, html) {
    return "<section class=\"group stack\"><h2>" + esc(title) + "</h2>" + html + "</section>";
  }

  function field(id, label, control, error) {
    var described = error ? " aria-describedby=\"" + id + "-err\"" : "";
    return "<label class=\"field\" for=\"" + id + "\"><span>" + esc(label) + "</span>" + control.replace("<input", "<input" + described).replace("<select", "<select" + described).replace("<textarea", "<textarea" + described) + (error ? "<span class=\"err\" id=\"" + id + "-err\">" + esc(error) + "</span>" : "") + "</label>";
  }

  function fitShell() {
    var shell = document.querySelector(".shell");
    var vv = root.visualViewport;
    if (!shell || !vv) return;
    shell.style.top = Math.round(vv.offsetTop) + "px";
    shell.style.height = Math.round(vv.height) + "px";
  }

  function start() {
    L = root.ShehnatLogic;
    Store = root.ShehnatStore;
    Motion = root.ShehnatMotion;
    Store.boot();
    if (root.ShehnatPublic) root.ShehnatPublic.register(api);
    if (root.ShehnatInvestor) root.ShehnatInvestor.register(api);
    if (root.ShehnatManager) root.ShehnatManager.register(api);
    if (root.ShehnatStaff) root.ShehnatStaff.register(api);
    if (root.ShehnatStaffOps) root.ShehnatStaffOps.register(api);
    document.body.addEventListener("click", onClick);
    document.body.addEventListener("submit", onSubmit);
    document.body.addEventListener("input", function (ev) {
      var el = ev.target.closest("[data-live]");
      if (el && current && current.on) current.on(el.getAttribute("data-live"), el, params);
    });
    document.addEventListener("keydown", onKey);
    document.getElementById("scrim").addEventListener("click", closeSheet);
    Motion.bindSheet(document.getElementById("sheet"));
    fitShell();
    if (root.visualViewport) {
      root.visualViewport.addEventListener("resize", fitShell);
      root.visualViewport.addEventListener("scroll", fitShell);
    }
    root.addEventListener("resize", fitShell);
    window.addEventListener("hashchange", function () { render(true); });
    if (!location.hash) location.hash = "#/";
    else render(false);
  }

  var api = {
    esc: esc, cname: cname, countryOpts: countryOpts, blockedNote: blockedNote, when: when, money: money, icon: icon, badge: badge, stageGlyph: stageGlyph, decorate: decorate,
    screen: screen, go: go, back: back, toast: toast, openSheet: openSheet, closeSheet: closeSheet, field: field,
    homeFor: homeFor, start: start,
    kpis: kpis, tabs: tabs, fold: fold, menu: menu, sticky: sticky, group: group,
    get params() { return params; }
  };
  root.ShehnatUI = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
