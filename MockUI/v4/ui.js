/* PROTOTYPE, throwaway. Router, chrome, and components. */
(function (g) {
  'use strict';
  var screens = [];
  var paintToken = 0;
  var stack = [];
  var toastTimer = 0;
  var sheetReturn = null;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function usd(cents) {
    var n = Math.abs(Number(cents) || 0) / 100;
    var t = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (cents < 0 ? '−$' : '$') + t;
  }
  function money(cents, mode) {
    if (mode === 'expected') return '<span class="price num">' + esc(usd(cents)) + ' expected</span>';
    if (cents > 0) return '<span class="price num money gain">+ ' + esc(usd(cents)) + ' ▲ Profit</span>';
    if (cents < 0) return '<span class="price num money loss">− ' + esc(usd(Math.abs(cents))) + ' ▼ Loss</span>';
    return '<span class="price num">' + esc(usd(0)) + '</span>';
  }
  function user() { return Store.user(); }
  function homeFor(u) {
    if (!u) return '/p/signin';
    if (u.role === 'investor') return '/i/home';
    if (u.role === 'manager') return '/m/home';
    return '/s/home';
  }
  function go(path, opts) {
    var next = '#' + path;
    if (opts && opts.replace) history.replaceState({ path: path }, '', next);
    else history.pushState({ path: path }, '', next);
    stack.push(path);
    render({ dir: opts && opts.back ? 'back' : 'push' });
  }
  function back() {
    if (history.length > 1) history.back();
    else go(homeFor(user()), { replace: true, back: true });
  }
  function pathNow() {
    var h = location.hash || '#/p/splash';
    return h.replace(/^#/, '') || '/p/splash';
  }
  function match() {
    var path = pathNow();
    for (var i = 0; i < screens.length; i++) {
      var params = screens[i].match(path);
      if (params) return { screen: screens[i], params: params, path: path };
    }
    return { screen: screens[0], params: {}, path: path };
  }
  function add(screen) { screens.push(screen); }

  function banner(kind, lead, rest) {
    return '<div class="banner banner-' + kind + '"><b>' + esc(lead) + '</b>' + (rest ? '<span>' + esc(rest) + '</span>' : '') + '</div>';
  }
  function success(lead) { return '<div class="success" role="status"><b>' + esc(lead) + '</b></div>'; }
  function field(label, name, value, type, extra) {
    return '<label class="field"><span>' + esc(label) + '</span><input name="' + esc(name) + '" type="' + (type || 'text') + '" value="' + esc(value || '') + '" ' + (extra || '') + '></label>';
  }
  function dollarsField(label, name, cents) {
    var val = cents == null ? '' : ' value="' + (cents / 100).toFixed(2) + '"';
    return '<label class="field"><span>' + esc(label) + '</span><span class="amount"><b>$</b><input name="' + esc(name) + '" inputmode="decimal" placeholder="0.00"' + val + '></span><span class="meta">US dollars, max 2 decimals</span></label>';
  }
  function countries(name, includeBlocked) {
    var blocked = Store.state.settings.blocked;
    var html = '<option value="">Choose</option>';
    Logic.COUNTRIES.forEach(function (c) {
      if (!includeBlocked && blocked.indexOf(c[0]) >= 0) return;
      html += '<option value="' + c[0] + '">' + esc(c[1]) + '</option>';
    });
    return html;
  }
  function blockedNote() {
    return '<p class="meta">Not available: ' + esc(Store.state.settings.blocked.map(function (c) { return Logic.COUNTRY[c] || c; }).join(', ')) + '.</p>';
  }
  function row(title, meta, end, path) {
    return '<button class="row" data-go="' + esc(path) + '"><span class="grow"><span class="title">' + esc(title) + '</span><span class="meta">' + esc(meta) + '</span></span>' + (end || '') + '<span class="chev" aria-hidden="true">›</span></button>';
  }
  function empty(text, label, path) {
    return '<div class="empty"><p>' + esc(text) + '</p>' + (label ? '<button class="btn btn-primary" data-go="' + esc(path) + '">' + esc(label) + '</button>' : '') + '</div>';
  }
  function statusWord(l) {
    var viewer = user();
    var showOverdue = !!(l.overdue && viewer && viewer.role === 'staff');
    var word = showOverdue ? 'Overdue' : (l.status || '').replace(/_/g, ' ');
    var cls = showOverdue ? 'word-warning' : (l.status === 'withdrawn' || l.status === 'cancelled' ? 'word-muted' : 'word');
    return '<span class="' + cls + '">' + esc(word) + '</span>';
  }
  function funding(l) {
    var pct = l.target ? Math.min(100, Math.round(l.raised * 100 / l.target)) : 0;
    return '<div class="track" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + pct + '%"></span></div><p class="meta"><span class="num">' + pct + '%</span> funded · <span class="num">' + esc(usd(l.raised)) + '</span> of <span class="num">' + esc(usd(l.target)) + '</span></p>';
  }
  function listingRow(l, path) {
    var meta = (Logic.COUNTRY[l.source] || l.source) + ' → ' + (Logic.COUNTRY[l.buyer] || l.buyer) + ' · ' + (l.category || '');
    return row(l.name, meta, statusWord(l), path);
  }
  function centsOf(v) {
    var s = String(v || '').trim();
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
    return Math.round(Number(s) * 100);
  }
  function formOf(node) {
    var form = (node.closest && node.closest('form')) || document.querySelector('#main form');
    var data = {};
    if (!form) return data;
    form.querySelectorAll('[name]').forEach(function (el) {
      if (el.type === 'checkbox') data[el.name] = el.checked;
      else if (el.type === 'file') data[el.name] = el.files && el.files[0] ? { name: el.files[0].name, type: el.files[0].type, size: el.files[0].size } : null;
      else data[el.name] = el.value;
    });
    return data;
  }
  function toast(text) {
    var el = document.getElementById('toast');
    if (!text) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2400);
  }
  function openSheet(html) {
    sheetReturn = document.activeElement;
    document.getElementById('scrim').hidden = false;
    var sheet = document.getElementById('sheet');
    sheet.hidden = false;
    sheet.innerHTML = '<div class="sheet-handle"></div>' + html;
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    Motion.bindSheet(sheet);
    var focus = sheet.querySelector('button, input, select, textarea');
    if (focus) focus.focus();
  }
  function closeSheet() {
    document.getElementById('scrim').hidden = true;
    document.getElementById('sheet').hidden = true;
    if (sheetReturn && sheetReturn.focus) sheetReturn.focus();
  }
  function dispatch(action) {
    var r = Store.dispatch(action);
    if (r.toast) toast(r.toast);
    if (r.notice) Store.proto.notice = r.notice;
    return r;
  }
  function skeleton() {
    return '<div class="column"><div class="sk" style="min-height:8rem"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>';
  }
  function roots() {
    return ['/p/splash', '/p/welcome', '/p/signin', '/i/home', '/i/explore', '/i/wallet', '/m/home', '/m/listings', '/s/home', '/s/listings', '/s/money', '/p/profile'];
  }

  function chrome(found) {
    var u = user();
    var root = roots().indexOf(found.path) >= 0;
    var mast = document.getElementById('mast');
    var back = root ? '' : '<button class="icon-btn" type="button" data-act="back" aria-label="Back">←</button>';
    var mark = root ? '<img src="../../Demo/frontend/brand/mark.svg" alt="">' : '';
    mast.innerHTML = (back || mark) + '<button class="icon-btn" type="button" data-go="/search" aria-label="Search">Search</button>';
    document.body.classList.toggle('task', !!found.screen.task);
    document.body.classList.toggle('staff', !!(u && u.role === 'staff'));
    var rail = Store.proto.frame === 'full' && window.innerWidth >= 1024 && u && u.role === 'staff' && !found.screen.task;
    document.body.classList.toggle('rail', rail);
    document.body.classList.toggle('frame', Store.proto.frame === 'phone' && window.innerWidth >= 768);
    var mode = document.getElementById('mode');
    var items = [];
    if (!u) items = [];
    else if (u.role === 'investor') items = [['Home', '/i/home'], ['Shipments', '/i/explore'], ['Wallet', '/i/wallet'], ['You', '/p/profile']];
    else if (u.role === 'manager') items = [['Home', '/m/home'], ['Listings', '/m/listings'], ['Wallet', '/i/wallet'], ['You', '/p/profile']];
    else items = [['Queue', '/s/home'], ['Listings', '/s/listings'], ['Money', '/s/money'], ['You', '/p/profile']];
    mode.innerHTML = items.map(function (it) {
      var on = found.screen.section === it[0].toLowerCase() || found.path === it[1];
      return '<button type="button" data-go="' + it[1] + '"' + (on ? ' aria-current="page"' : '') + '>' + esc(it[0]) + '</button>';
    }).join('');
    var bar = document.getElementById('actionbar');
    bar.innerHTML = found.screen.task && found.screen.action ? found.screen.action(found.params) : '';
  }

  function render() {
    var found = match();
    var u = user();
    if (found.screen.roles && u && found.screen.roles.indexOf(u.role) < 0) {
      go(homeFor(u), { replace: true });
      return;
    }
    if (found.screen.auth && !u) { go('/p/signin', { replace: true }); return; }
    chrome(found);
    var main = document.getElementById('main');
    var token = ++paintToken;
    main.innerHTML = skeleton();
    var run = function () {
      if (token !== paintToken) return;
      var err = Store.proto.error ? banner('loss', 'This did not go through', Store.proto.error) + '<p><button class="btn btn-secondary" data-act="retry" type="button">Try again</button></p>' : '';
      main.innerHTML = '<div class="column' + (found.screen.wide ? ' split' : '') + '">' + err + found.screen.render(found.params) + '</div>';
      Motion.fade(main);
      var h1 = main.querySelector('h1');
      if (h1) document.title = h1.textContent + ' · Shehnat';
    };
    if (Store.proto.delay) setTimeout(run, Store.proto.delay); else run();
  }

  function onClick(e) {
    var goBtn = e.target.closest('[data-go]');
    if (goBtn && goBtn.getAttribute('data-go')) { go(goBtn.getAttribute('data-go')); return; }
    var act = e.target.closest('[data-act]');
    if (act) { runAct(act); return; }
  }
  function onChange(e) {
    var act = e.target.closest('[data-act]');
    if (act) runAct(act);
  }
  function runAct(node) {
    var name = node.getAttribute('data-act');
    var fn = acts[name];
    if (fn) fn(node, formOf(node));
  }

  var acts = {
    back: function () { back(); },
    retry: function () { Store.proto.error = ''; render(); },
    signin: function (node, data) {
      var r = dispatch({ type: 'signin', email: data.email, password: data.password });
      if (r.ok) go(homeFor(user()), { replace: true }); else render();
    },
    quickLogin: function (node) {
      var email = node.getAttribute('data-email');
      var r = dispatch({ type: 'signin', email: email, password: Seed.password });
      if (r.ok) go(homeFor(user()), { replace: true }); else render();
    },
    signup: function (node, data) {
      var r = dispatch({ type: 'signup', email: data.email, name: data.name, password: data.password, role: data.role });
      if (r.ok) go(data.role === 'manager' ? '/m/register' : '/i/kyc'); else render();
    },
    forgot: function (node, data) {
      var r = dispatch({ type: 'forgot', email: data.email });
      Store.proto.notice = r.ok ? 'A reset link was sent' : '';
      if (!r.ok) render(); else { toast('A reset link was sent'); render(); }
    },
    signout: function () { dispatch({ type: 'signout', actorId: user().id }); go('/p/signin', { replace: true }); },
    'kyc': function (node, data) {
      var r = dispatch({ type: 'kycSubmit', actorId: user().id, dob: data.dob, phone: data.phone, country: data.country, idDoc: (data.idDoc && data.idDoc.name) || '', addressDoc: (data.addressDoc && data.addressDoc.name) || '', idSize: data.idDoc && data.idDoc.size, addressSize: data.addressDoc && data.addressDoc.size, declare: data.declare });
      if (r.ok) go('/i/kyc-status'); else render();
    },
    register: function (node, data) {
      var docs = [data.doc1, data.doc2, data.doc3].filter(Boolean);
      var r = dispatch({ type: 'registerSubmit', actorId: user().id, managerType: data.managerType, country: data.country, phone: data.phone, declare: data.declare, docs: docs });
      if (r.ok) go('/m/status'); else render();
    },
    decideApp: function (node) {
      var r = dispatch({ type: 'decideApplication', actorId: user().id, id: node.getAttribute('data-id'), decision: node.getAttribute('data-decision'), reason: document.getElementById('reason') ? document.getElementById('reason').value : '' });
      if (r.ok) go('/s/queue'); else render();
    },
    assign: function (node) {
      var r = dispatch({ type: 'assign', actorId: user().id, kind: node.getAttribute('data-kind'), id: node.getAttribute('data-id'), assignee: node.getAttribute('data-assignee') || user().id });
      if (!r.ok) render(); else render();
    },
    invest: function (node, data) {
      var amount = centsOf(data.amount);
      var r = dispatch({ type: 'invest', actorId: user().id, id: node.getAttribute('data-id'), amount: amount });
      if (r.ok) go('/i/confirmed/' + node.getAttribute('data-id')); else render();
    },
    topup: function (node, data) {
      var amount = centsOf(data.amount);
      if (amount == null) { Store.proto.error = 'Error: Enter an amount with at most 2 decimals'; render(); return; }
      openSheet('<div class="gateway"><h2>Secure payment</h2><p class="price num">' + esc(usd(amount)) + '</p><p class="meta">Card number</p><p class="meta">•••• •••• •••• ••••</p><button class="btn btn-primary" type="button" data-act="gateway" data-ok="1" data-amount="' + amount + '">Pay</button> <button class="btn btn-secondary" type="button" data-act="gateway" data-ok="0" data-amount="' + amount + '">Fail</button></div>');
    },
    gateway: function (node) {
      closeSheet();
      var r = dispatch({ type: 'topup', actorId: user().id, amount: Number(node.getAttribute('data-amount')), fail: node.getAttribute('data-ok') !== '1', ref: 'GW' });
      Store.proto.notice = r.ok ? r.notice : '';
      render();
    },
    withdraw: function (node, data) {
      var amount = centsOf(data.amount);
      var r = dispatch({ type: 'withdraw', actorId: user().id, amount: amount, bank: { country: data.country, bankName: data.bankName, holder: data.holder, account: data.account, swift: data.swift } });
      if (r.ok) go('/i/withdrawal/' + r.id); else render();
    },
    saveListing: function (node, data) { listingAct('save', data); },
    submitListing: function (node, data) { listingAct('submit', data); },
    payDeposit: function (node) {
      var r = dispatch({ type: 'payDeposit', actorId: user().id, id: node.getAttribute('data-id') });
      Store.proto.notice = r.ok ? 'The listing is live' : '';
      if (r.ok) go('/m/listing/' + node.getAttribute('data-id')); else render();
    }
  };

  function listingAct(mode, data) {
    var spec = readListingForm(data);
    var r = dispatch({ type: 'saveListing', actorId: user().id, id: data.id || '', strict: true, listing: spec });
    if (!r.ok) { render(); return; }
    if (mode === 'submit') {
      r = dispatch({ type: 'submitListing', actorId: user().id, id: r.id });
      if (r.ok) go('/m/listing/' + r.id); else render();
    } else go('/m/listing/' + r.id);
  }
  function readListingForm(data) {
    var count = Number(data.shipments || 1);
    var shipments = [];
    for (var i = 0; i < count; i++) {
      shipments.push({
        label: 'Shipment ' + (i + 1),
        expectedCost: centsOf(data['cost' + i]) || 0,
        expectedSale: centsOf(data['sale' + i]) || 0,
        plannedStart: Number(data['start' + i] || 0),
        steps: Logic.template().map(function (st) {
          var copy = {}; Object.keys(st).forEach(function (k) { copy[k] = st[k]; });
          if (st.name === 'Transportation') copy.cost = centsOf(data.stepCost) || 0;
          return copy;
        })
      });
    }
    return {
      name: data.name, category: data.category, source: data.source, buyer: data.buyer, certificate: data.certificate,
      companyPct: Number(data.companyPct), investorSharePct: Number(data.investorSharePct), minInvest: centsOf(data.minInvest) || 0,
      shipments: shipments
    };
  }

  function boot() {
    Motion.applyMode();
    document.documentElement.dir = Store.proto.dir;
    document.body.addEventListener('click', onClick);
    document.body.addEventListener('change', onChange);
    document.body.addEventListener('input', function (e) {
      if (e.target.name === 'password' && document.getElementById('pwmsg')) document.getElementById('pwmsg').textContent = Logic.passwordMsg(e.target.value);
    });
    window.addEventListener('popstate', function () { render(); });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSheet();
    });
    Motion.bindBack(document.getElementById('main'), function () { if (roots().indexOf(pathNow()) < 0) back(); });
    if (!location.hash) go('/p/splash', { replace: true }); else render();
  }

  g.Ui = {
    add: add, go: go, render: render, esc: esc, usd: usd, money: money, banner: banner, success: success, field: field,
    dollarsField: dollarsField, countries: countries, blockedNote: blockedNote, row: row, empty: empty,
    statusWord: statusWord, funding: funding, listingRow: listingRow, centsOf: centsOf, user: user,
    dispatch: dispatch, toast: toast, openSheet: openSheet, closeSheet: closeSheet, acts: acts, boot: boot,
    byId: function (id) { return Store.state.listings.filter(function (l) { return l.id === id; })[0]; }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
