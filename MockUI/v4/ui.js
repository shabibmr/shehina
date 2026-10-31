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
    return "<svg viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" aria-hidden=\"true\" fill=\"currentColor\">" + (paths[name] || "") + "</svg>";
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

  function skeleton() {
    return "<div class=\"column\"><div class=\"skel skel-lead\"></div><div class=\"skel skel-row\"></div><div class=\"skel skel-row\"></div></div>";
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
    var search = u ? "<button class=\"icon-btn\" type=\"button\" data-go=\"#/search\" aria-label=\"Search\">" + icon("search") + "</button>" : "<span></span>";
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
    clearTimeout(timer);
    stage.innerHTML = skeleton();
    timer = setTimeout(function () {
      if (!guard(hit.def)) return;
      stage.innerHTML = "";
      hit.def.render(stage, params);
      var title = screenTitle(hit.def);
      stage.querySelectorAll("h1").forEach(function (h) {
        if (title && h.textContent.trim() === title) h.remove();
      });
      Motion.fade(stage);
      var focus = document.querySelector(".mast-title") || stage.querySelector("h1");
      if (focus) focus.setAttribute("tabindex", "-1");
    }, 400);
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
    esc: esc, cname: cname, countryOpts: countryOpts, blockedNote: blockedNote, when: when, money: money, icon: icon,
    screen: screen, go: go, back: back, toast: toast, openSheet: openSheet, closeSheet: closeSheet, field: field,
    homeFor: homeFor, start: start,
    kpis: kpis, tabs: tabs, fold: fold, menu: menu, sticky: sticky, group: group,
    get params() { return params; }
  };
  root.ShehnatUI = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
