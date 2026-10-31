/* PROTOTYPE, throwaway. Not production code.
   Question: does the agreed Shehnat product hold together end to end, for every role, on a phone, in the paper-column theme?
   Pure domain module: no DOM. Money is integer cents. */
(function (g) {
  'use strict';

  var STAGES = ['Funding open', 'Goods purchased', 'Loaded at port', 'At sea', 'Customs cleared', 'Goods sold', 'Profit paid out'];
  var CATEGORIES = ['Food', 'Building', 'Textiles', 'Energy', 'Other'];
  var DAY = 86400000;
  var COUNTRIES = [
    ['AE', 'United Arab Emirates'], ['GB', 'United Kingdom'], ['SG', 'Singapore'], ['JO', 'Jordan'],
    ['IN', 'India'], ['CL', 'Chile'], ['OM', 'Oman'], ['US', 'United States'], ['JP', 'Japan'],
    ['BR', 'Brazil'], ['NL', 'Netherlands'], ['DE', 'Germany'], ['FR', 'France'], ['CN', 'China'],
    ['KE', 'Kenya'], ['NG', 'Nigeria'], ['ZA', 'South Africa'], ['AU', 'Australia'], ['CA', 'Canada'],
    ['QA', 'Qatar'], ['SA', 'Saudi Arabia'], ['KW', 'Kuwait'], ['BH', 'Bahrain'], ['EG', 'Egypt'],
    ['TR', 'Turkey'], ['IT', 'Italy'], ['ES', 'Spain'], ['MX', 'Mexico'], ['ID', 'Indonesia'],
    ['MY', 'Malaysia'], ['TH', 'Thailand'], ['VN', 'Vietnam'], ['PH', 'Philippines'], ['PK', 'Pakistan'],
    ['BD', 'Bangladesh'], ['LK', 'Sri Lanka'], ['NZ', 'New Zealand'], ['IE', 'Ireland'], ['CH', 'Switzerland'],
    ['SE', 'Sweden'], ['NO', 'Norway'], ['KR', 'South Korea'], ['HK', 'Hong Kong'], ['TW', 'Taiwan'],
    ['CU', 'Cuba'], ['IR', 'Iran'], ['KP', 'North Korea'], ['SY', 'Syria']
  ];
  var COUNTRY = {};
  COUNTRIES.forEach(function (c) { COUNTRY[c[0]] = c[1]; });

  function blank() {
    return {
      seq: 1,
      clock: Date.UTC(2026, 9, 31),
      sessionUserId: null,
      users: [],
      applications: [],
      listings: [],
      ledger: [],
      withdrawals: [],
      notifications: [],
      audit: [],
      approvals: [],
      settings: {
        overdueDays: 5,
        autoWithdrawDays: 14,
        waiverPct: 20,
        shareholderPct: 75,
        exposureDefault: 50000000,
        blocked: ['CU', 'IR', 'KP', 'SY'],
        largeWithdrawal: 1000000,
        feeBps: 100,
        prohibited: 'Weapons, alcohol, and anything illegal to import or export on this route.'
      }
    };
  }

  function uid(s) { s.seq += 1; return 'n' + s.seq; }
  function user(s, id) { return s.users.filter(function (u) { return u.id === id; })[0] || null; }
  function listing(s, id) { return s.listings.filter(function (l) { return l.id === id; })[0] || null; }
  function fail(m) { var e = new Error(m); e.expose = true; throw e; }
  // A failure whose state change must survive, such as counting a wrong password.
  function failKeep(m) { var e = new Error(m); e.expose = true; e.keepState = true; throw e; }
  function centsOk(n) { return typeof n === 'number' && Number.isFinite(n) && Math.round(n) === n; }

  function allocate(total, weights) {
    var sum = weights.reduce(function (a, b) { return a + b; }, 0);
    if (sum <= 0) throw new Error('allocate: no weights');
    var sign = total < 0 ? -1 : 1;
    var t = Math.abs(total);
    var raw = weights.map(function (w) { return (t * w) / sum; });
    var out = raw.map(function (r) { return Math.floor(r); });
    var left = t - out.reduce(function (a, b) { return a + b; }, 0);
    var order = raw.map(function (r, i) { return [r - Math.floor(r), i]; })
      .sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; });
    for (var k = 0; left > 0; k++, left--) out[order[k % order.length][1]]++;
    return out.map(function (x) { return x * sign; });
  }

  function compute(spec) {
    var contributions = spec.contributions;
    var raised = contributions.reduce(function (s, c) { return s + c.amount; }, 0);
    var gross = spec.revenue - spec.cost;
    var fee = gross > 0 ? Math.min(Math.round((spec.revenue * spec.feeBps) / 10000), gross) : 0;
    var net = gross - fee;
    var manager = net > 0 ? Math.floor((net * (100 - spec.investorSharePct)) / 100) : 0;
    var pool = net - manager;
    var shares = contributions.length ? allocate(pool, contributions.map(function (c) { return c.amount; })) : [];
    var lines = contributions.map(function (c, i) {
      return { id: c.id, kind: c.kind, userId: c.userId, capital: c.amount, profit: shares[i], payout: c.amount + shares[i] };
    });
    return { raised: raised, cost: spec.cost, revenue: spec.revenue, gross: gross, fee: fee, net: net, manager: manager, pool: pool, lines: lines };
  }

  function round1(x) { return Math.round(x * 10) / 10; }

  function projection(spec) {
    var revenue = spec.target + spec.expectedProfit;
    var r = compute({
      contributions: [{ id: 'p', kind: 'investor', userId: 'p', amount: spec.target }],
      cost: spec.target,
      revenue: revenue,
      investorSharePct: spec.investorSharePct,
      feeBps: spec.feeBps
    });
    var cycle = spec.target ? r.pool / spec.target : 0;
    return {
      revenue: revenue, gross: r.gross, fee: r.fee, net: r.net, manager: r.manager, pool: r.pool,
      roiCycle: round1(cycle * 100),
      roiYear: spec.cycleDays ? round1((cycle * 365 / spec.cycleDays) * 100) : 0
    };
  }

  function shareholderSplit(treasuryProfit, pct, buyerId, managerShareholderId) {
    if (!(treasuryProfit > 0)) return { shareholder: 0, reserve: 0, lines: [] };
    var shareholder = Math.floor(treasuryProfit * pct / 100);
    var reserve = treasuryProfit - shareholder;
    var lines;
    if (!managerShareholderId || managerShareholderId === buyerId) {
      lines = [{ userId: buyerId, amount: shareholder }];
    } else {
      var buyerAmt = Math.ceil(shareholder / 2);
      lines = [{ userId: buyerId, amount: buyerAmt }, { userId: managerShareholderId, amount: shareholder - buyerAmt }];
    }
    return { shareholder: shareholder, reserve: reserve, lines: lines };
  }

  function template() {
    return [
      { name: 'Ordering', owner: 'manager', days: 2, cost: 0, tag: 0, needsVerify: false, kind: '' },
      { name: 'Advances', owner: 'manager', days: 2, cost: 0, tag: 0, needsVerify: false, kind: '' },
      { name: 'Purchase', owner: 'manager', days: 4, cost: 0, tag: 1, needsVerify: false, kind: '' },
      { name: 'Payments', owner: 'staff', days: 2, cost: 0, tag: 1, needsVerify: true, kind: 'payment' },
      { name: 'Transportation', owner: 'staff', days: 7, cost: 0, tag: 2, needsVerify: false, kind: '' },
      { name: 'Receipts', owner: 'manager', days: 3, cost: 0, tag: 3, needsVerify: false, kind: '' },
      { name: 'Clearance', owner: 'staff', days: 3, cost: 0, tag: 4, needsVerify: true, kind: 'customs' },
      { name: 'Invoicing', owner: 'staff', days: 2, cost: 0, tag: 5, needsVerify: true, kind: 'sale' }
    ];
  }

  function cloneSteps(s, steps, required) {
    return steps.map(function (st) {
      return {
        id: uid(s), name: st.name, owner: st.owner, days: st.days, cost: st.cost,
        tag: st.tag, needsVerify: !!st.needsVerify, kind: st.kind || '',
        status: 'todo', docs: [], requiredDocs: (required || []).slice(),
        blockedReason: '', skipReason: ''
      };
    });
  }

  function stepCounts(st) {
    if (st.status === 'skipped' || st.status === 'verified') return true;
    if (st.status === 'done' && !st.needsVerify) return true;
    return false;
  }

  function shipmentStage(sh) {
    var floor = sh.stageFloor || 0;
    var reached = floor;
    var stage;
    for (stage = 1; stage <= 5; stage++) {
      var needed = sh.steps.filter(function (st) { return st.tag && st.tag <= stage; });
      if (!needed.length || !needed.every(stepCounts)) break;
      reached = stage;
    }
    if (sh.writtenOff) reached = Math.max(reached, 5);
    sh.stageFloor = reached;
    return reached;
  }

  function figures(s, l) {
    var goods = 0, sales = 0, stepCosts = 0, maxCycle = 0;
    l.shipments.forEach(function (sh) {
      goods += sh.expectedCost;
      sales += sh.expectedSale;
      var dur = 0;
      sh.steps.forEach(function (st) { stepCosts += st.cost; dur += st.days; });
      maxCycle = Math.max(maxCycle, (sh.plannedStart || 0) + dur);
    });
    var target = goods + stepCosts;
    return { goods: goods, sales: sales, stepCosts: stepCosts, target: target, cycle: maxCycle, expectedProfit: sales - target };
  }

  function raised(l) {
    return (l.contributions || []).reduce(function (a, c) { return a + c.amount; }, 0);
  }

  function derive(s, l) {
    var f = figures(s, l);
    l.target = f.target;
    l.cycle = f.cycle;
    l.expectedProfit = f.expectedProfit;
    l.raised = raised(l);
    var funded = l.raised >= l.target && l.target > 0 && (l.status === 'live' || l.status === 'settlement' || l.status === 'completed');
    l.funded = funded;
    if (funded && !l.fundedAt) l.fundedAt = s.clock;
    var stages = l.shipments.map(function (sh) {
      var stg = (l.status === 'live' || l.status === 'settlement' || l.status === 'completed') && funded ? shipmentStage(sh) : 0;
      if (!(l.status === 'live' || l.status === 'settlement' || l.status === 'completed')) stg = 0;
      if (!funded && l.status !== 'completed') stg = 0;
      sh.stage = stg;
      var start = (l.fundedAt || l.liveAt || s.clock) + (sh.plannedStart || 0) * DAY;
      var cursor = start;
      sh.steps.forEach(function (step) {
        cursor += step.days * DAY;
        step.plannedEnd = cursor;
        step.late = !stepCounts(step) && step.status !== 'blocked' && l.status === 'live' && funded && s.clock > cursor;
        if (step.late) step.revisedDate = s.clock + 3 * DAY;
      });
      sh.late = sh.steps.some(function (step) { return step.late; });
      return stg;
    });
    if (l.status === 'completed') l.stage = 6;
    else if (l.status === 'live' || l.status === 'settlement') l.stage = funded && stages.length ? Math.min.apply(null, stages) : 0;
    else l.stage = 0;
    var age = l.liveAt ? Math.floor((s.clock - l.liveAt) / DAY) : 0;
    l.ageDays = age;
    l.overdue = l.status === 'live' && l.stage === 0 && l.raised < l.target && age >= s.settings.overdueDays;
    l.shareholderListing = !!(l.buyerShareholderId || (user(s, l.managerId) && user(s, l.managerId).shareholder));
    l.costsPaid = l.costsPaid || 0;
    l.proceeds = l.shipments.reduce(function (a, sh) { return a + (sh.proceeds || 0); }, 0);
    return l;
  }

  function balance(s, account) {
    return s.ledger.reduce(function (a, e) { return e.account === account ? a + e.amount : a; }, 0);
  }

  function verify(s) {
    var sum = s.ledger.reduce(function (a, e) { return a + e.amount; }, 0);
    var bad = [];
    var seen = {};
    s.ledger.forEach(function (e) {
      if (seen[e.account] || e.account === 'bank:external') { seen[e.account] = true; return; }
      seen[e.account] = true;
      var b = balance(s, e.account);
      if (b < 0) bad.push(e.account + ' ' + b);
    });
    return { ok: sum === 0 && bad.length === 0, sum: sum, bad: bad };
  }

  function post(s, lines, memo) {
    var sum = lines.reduce(function (a, l) { return a + l.amount; }, 0);
    if (sum !== 0) fail('Ledger entries do not balance');
    var txn = uid(s);
    lines.forEach(function (l) {
      s.ledger.push({ id: uid(s), txn: txn, account: l.account, amount: l.amount, memo: memo, at: s.clock });
    });
    var accounts = {};
    lines.forEach(function (l) { accounts[l.account] = true; });
    Object.keys(accounts).forEach(function (account) {
      if (account === 'bank:external') return;
      if (balance(s, account) < 0) fail('Error: Not enough money in ' + account);
    });
  }

  function move(s, from, to, amount, memo) {
    if (!centsOk(amount) || amount <= 0) fail('Error: Enter an amount in US dollars');
    post(s, [{ account: from, amount: -amount, memo: memo }, { account: to, amount: amount, memo: memo }], memo);
  }

  function walletOf(id) { return 'user:' + id + ':wallet'; }
  function heldOf(id) { return 'user:' + id + ':held'; }
  function escrowOf(id) { return 'escrow:' + id; }

  function payoutAccount(s, u) {
    if (!u) return 'platform:treasury';
    if (u.suspended || blocked(s, u.country)) return heldOf(u.id);
    return walletOf(u.id);
  }

  function blocked(s, code) { return s.settings.blocked.indexOf(code) >= 0; }

  function can(u, action) {
    if (!u || u.role !== 'staff' || u.active === false) return false;
    if (u.staffRole === 'owner') return true;
    var map = {
      review: ['reviewer'],
      deposit: ['finance'],
      ops: ['ops'],
      wd: ['finance'],
      team: [],
      settings: [],
      reserve: [],
      read: ['reviewer', 'ops', 'finance']
    };
    return (map[action] || []).indexOf(u.staffRole) >= 0;
  }

  function audit(s, actorId, action, entity, reason) {
    s.audit.push({ id: uid(s), at: s.clock, actorId: actorId, action: action, entity: entity, reason: reason || '' });
  }

  function notify(s, userId, text) {
    if (!userId) return;
    s.notifications.push({ id: uid(s), userId: userId, text: text, at: s.clock, read: false });
  }

  function exposureUsed(s, managerId, exceptId) {
    return s.listings.reduce(function (a, l) {
      if (l.managerId !== managerId || l.id === exceptId) return a;
      if (['in_review', 'awaiting_terms', 'approved', 'live', 'settlement'].indexOf(l.status) < 0) return a;
      return a + (l.target || 0);
    }, 0);
  }

  function exposureLimit(s, u) {
    if (u && u.exposureLimit) return u.exposureLimit;
    return s.settings.exposureDefault;
  }

  function countryCode(v) {
    if (!v) return '';
    var t = String(v).trim();
    if (COUNTRY[t.toUpperCase()]) return t.toUpperCase();
    var hit = COUNTRIES.filter(function (c) { return c[1].toLowerCase() === t.toLowerCase(); })[0];
    return hit ? hit[0] : '';
  }

  function passwordMsg(pw) {
    if (!pw || String(pw).length < 10) return 'Error: Password must be at least 10 characters';
    if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Error: Password needs a letter and a digit';
    return '';
  }
  function emailMsg(email) {
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return 'Error: Enter a valid email address';
    return '';
  }
  function phoneMsg(v) {
    var s = String(v || '').replace(/[\s\-().]/g, '');
    if (!/^\+[1-9]\d{6,14}$/.test(s)) return 'Error: Enter a phone number starting with + and the country code';
    return '';
  }
  function dobMsg(iso, clock) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return 'Error: Enter a date of birth as YYYY-MM-DD';
    var d = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    var check = new Date(d);
    if (check.getUTCFullYear() !== +m[1] || check.getUTCMonth() !== +m[2] - 1 || check.getUTCDate() !== +m[3]) return 'Error: Enter a real date of birth';
    var adult = new Date(clock);
    var limit = Date.UTC(adult.getUTCFullYear() - 18, adult.getUTCMonth(), adult.getUTCDate());
    if (d > limit) return 'Error: You must be 18 or older';
    return '';
  }
  function ibanCheck(iban) {
    var s = String(iban || '').replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
    var r = s.slice(4) + s.slice(0, 4);
    var n = '';
    for (var i = 0; i < r.length; i++) {
      var c = r.charAt(i);
      n += /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c;
    }
    var rem = 0;
    for (i = 0; i < n.length; i++) rem = (rem * 10 + Number(n.charAt(i))) % 97;
    return rem === 1;
  }
  function bankMsg(s, bank) {
    var code = countryCode(bank.country);
    if (!code) return 'Error: Choose a bank country';
    if (blocked(s, code)) return 'Error: Transfers to this country are not available';
    var swift = String(bank.swift || '').replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift)) return 'Error: Enter a SWIFT code of 8 or 11 characters';
    if (swift.slice(4, 6) !== code) return 'Error: The SWIFT country does not match the bank country';
    var acct = String(bank.account || '').replace(/\s/g, '').toUpperCase();
    if (!acct) return 'Error: Enter an IBAN or account number';
    if (/^[A-Z]{2}\d{2}/.test(acct)) {
      if (!ibanCheck(acct)) return 'Error: This IBAN checksum does not pass';
      if (acct.slice(0, 2) !== code) return 'Error: The IBAN country does not match the bank country';
    }
    if (!bank.holder || String(bank.holder).trim().length < 2) return 'Error: Enter the account holder name';
    if (!bank.bankName) return 'Error: Enter the bank name';
    return '';
  }

  function listingMsg(s, l) {
    if (!l.name || l.name.trim().length < 1 || l.name.trim().length > 120) return 'Error: Enter a name of 1 to 120 characters';
    if (CATEGORIES.indexOf(l.category) < 0) return 'Error: Choose a category';
    var source = countryCode(l.source), buyer = countryCode(l.buyer);
    if (!source || !buyer) return 'Error: Choose the source country and the buyer country';
    if (source === buyer) return 'Error: The source country and the buyer country must differ';
    if (blocked(s, source) || blocked(s, buyer)) return 'Error: This country is not available for a listing';
    if (!l.shipments || !l.shipments.length) return 'Error: Add at least one shipment';
    var tags = {};
    for (var si = 0; si < l.shipments.length; si++) {
      var shCost = l.shipments[si];
      if (!(shCost.expectedCost > 0) || !(shCost.expectedSale > 0)) return 'Error: Each shipment needs an expected cost and an expected sale price';
      (shCost.steps || []).forEach(function (st) { if (st.tag) tags[st.tag] = true; });
    }
    for (var stage = 1; stage <= 5; stage++) if (!tags[stage]) return 'Error: Every stage from Goods purchased to Goods sold needs a tagged step';
    var f = figures(s, l);
    if (f.target < 100000 || f.target > 1000000000) return 'Error: The funding target must be between USD 1,000 and USD 10,000,000';
    if (f.cycle < 1 || f.cycle > 365) return 'Error: The cycle must be between 1 and 365 days';
    if (l.companyPct < 20 || l.companyPct > 90) return 'Error: Manager capital must be between 20% and 90%';
    if (l.investorSharePct < 40 || l.investorSharePct > 95) return 'Error: Investor share must be between 40% and 95%';
    if (l.minInvest < 100 || l.minInvest > 100000000 || l.minInvest > f.target) return 'Error: The minimum investment must be between USD 1 and the funding target';
    var mgr = user(s, l.managerId);
    var limit = exposureLimit(s, mgr);
    if (exposureUsed(s, l.managerId, l.id) + f.target > limit) return 'Error: This listing would pass the exposure limit of USD ' + (limit / 100).toFixed(2);
    return '';
  }

  function remainderMsg(l, amount) {
    var left = l.target - l.raised;
    if (left <= 0) return 'Error: This listing is fully funded';
    if (amount > left) return 'Error: Only USD ' + (left / 100).toFixed(2) + ' is still open';
    if (amount !== left && amount < l.minInvest) {
      if (left < l.minInvest) return 'Error: The remaining amount is USD ' + (left / 100).toFixed(2) + ', so the investment must be exactly that';
      return 'Error: The minimum investment is USD ' + (l.minInvest / 100).toFixed(2);
    }
    return '';
  }

  function actor(s, action) {
    var u = user(s, action.actorId);
    if (!u) fail('Error: Sign in first');
    if (u.active === false) fail('Error: This account is deactivated');
    return u;
  }

  function gateInvestor(s, u) {
    if (u.role === 'staff') return 'Staff accounts cannot invest or withdraw';
    if (u.role !== 'investor') return 'Only an investor can do this';
    if (u.kyc !== 'approved') return 'Finish identity checks before doing this';
    if (u.suspended) return 'This account is suspended';
    if (blocked(s, u.country)) return 'This country of residence is not available';
    return '';
  }

  function gateManager(s, u) {
    if (u.role !== 'manager') return 'Only a manager can do this';
    if (u.kyc !== 'approved') return 'Finish registration before doing this';
    if (u.suspended) return 'This account is suspended';
    if (blocked(s, u.country)) return 'This country of registration is not available';
    return '';
  }

  function decideMsg(u, item) {
    if (!u || u.role !== 'staff') return 'Only staff can decide this';
    if (!can(u, 'review')) return 'Your role cannot decide this';
    if (item && item.assignee && item.assignee !== u.id && u.staffRole !== 'owner') return 'Only the assignee or the owner can decide';
    return '';
  }

  function findStep(l, shipmentId, stepId) {
    var sh = l.shipments.filter(function (x) { return x.id === shipmentId; })[0];
    if (!sh) return null;
    var st = sh.steps.filter(function (x) { return x.id === stepId; })[0];
    return st ? { sh: sh, st: st } : null;
  }

  function goodsBought(l) {
    return l.shipments.some(function (sh) {
      return sh.steps.some(function (st) { return st.tag === 1 && stepCounts(st); });
    }) || l.shipments.some(function (sh) { return sh.goodsPaid; });
  }

  function pushApproval(s, type, listingId, proposerId, payload) {
    var row = { id: uid(s), type: type, listingId: listingId, proposerId: proposerId, payload: payload, status: 'open', reason: '' };
    s.approvals.push(row);
    return row;
  }

  function history(l, s, actorId, action, reason) {
    l.history = l.history || [];
    l.history.push({ at: s.clock, actorId: actorId, action: action, reason: reason || '' });
  }

  function normaliseListing(s, raw) {
    var l = {
      id: raw.id || uid(s),
      name: String(raw.name || '').trim(),
      managerId: raw.managerId,
      status: 'draft',
      category: raw.category,
      source: countryCode(raw.source),
      buyer: countryCode(raw.buyer),
      certificate: String(raw.certificate || '').slice(0, 80),
      companyPct: Number(raw.companyPct),
      investorSharePct: Number(raw.investorSharePct),
      minInvest: Number(raw.minInvest),
      shipments: [],
      contributions: raw.contributions || [],
      assignee: raw.assignee || null,
      history: raw.history || [],
      termsSentAt: raw.termsSentAt || 0,
      approvedAt: raw.approvedAt || 0,
      liveAt: raw.liveAt || 0,
      fundedAt: raw.fundedAt || 0,
      depositWaiver: !!raw.depositWaiver,
      buyerShareholderId: raw.buyerShareholderId || null,
      marketCheck: raw.marketCheck || null,
      waiverPct: raw.waiverPct || s.settings.waiverPct,
      shareholderPct: raw.shareholderPct || s.settings.shareholderPct,
      proceedsUsable: !!raw.proceedsUsable,
      costsPaid: raw.costsPaid || 0,
      settlementId: raw.settlementId || null
    };
    (raw.shipments || []).forEach(function (sh) {
      l.shipments.push({
        id: sh.id || uid(s),
        label: sh.label || 'Shipment',
        expectedCost: Number(sh.expectedCost),
        expectedSale: Number(sh.expectedSale),
        plannedStart: Number(sh.plannedStart || 0),
        steps: cloneSteps(s, sh.steps && sh.steps.length ? sh.steps : template(), sh.requiredDocs),
        proceeds: 0,
        shortfallReason: '',
        writtenOff: false,
        goodsPaid: false,
        stageFloor: 0
      });
    });
    return l;
  }

  function reduce(s, a) {
    var u, l, msg, app, row, dest, amount, f, proj;

    if (a.type === 'clock') {
      if (a.at) s.clock = a.at; else s.clock += (a.days || 0) * DAY;
      return { toast: 'Clock moved' };
    }

    if (a.type === 'seedAdjust') {
      if (a.amount > 0) move(s, 'bank:external', a.account, a.amount, 'Seed balance');
      else if (a.amount < 0) move(s, a.account, 'bank:external', -a.amount, 'Seed balance');
      return {};
    }

    if (a.type === 'seedUser') {
      if (s.users.some(function (x) { return x.email === a.user.email; })) fail('Error: An account with this email already exists');
      s.users.push(a.user);
      return {};
    }

    if (a.type === 'signup') {
      msg = emailMsg(a.email) || passwordMsg(a.password);
      if (msg) fail(msg);
      if (!a.name || a.name.trim().length < 1 || a.name.trim().length > 120) fail('Error: Enter a name of 1 to 120 characters');
      if (a.role !== 'investor' && a.role !== 'manager') fail('Error: Choose invest or manage shipments');
      var email = a.email.trim().toLowerCase();
      if (s.users.some(function (x) { return x.email === email; })) fail('Error: An account with this email already exists');
      var id = uid(s);
      s.users.push({
        id: id, name: a.name.trim(), email: email, password: a.password,
        role: a.role, staffRole: null, country: '', kyc: 'none', kycReason: '',
        shareholder: false, suspended: false, active: true, exposureLimit: 0,
        managerType: a.role === 'manager' ? (a.managerType || '') : '',
        attempts: 0, lockedUntil: 0, phone: '', dob: ''
      });
      s.sessionUserId = id;
      audit(s, id, 'signup', id, a.role);
      return { toast: 'Account created' };
    }

    if (a.type === 'signin') {
      email = String(a.email || '').trim().toLowerCase();
      u = s.users.filter(function (x) { return x.email === email; })[0];
      if (!u) fail('Error: Wrong email or password');
      if (u.lockedUntil && u.lockedUntil > s.clock) fail('Error: Locked for 15 minutes');
      if (u.password !== a.password || u.active === false) {
        u.attempts = (u.attempts || 0) + 1;
        if (u.attempts >= 5) { u.lockedUntil = s.clock + 15 * 60 * 1000; u.attempts = 0; failKeep('Error: Locked for 15 minutes'); }
        if (u.active === false && u.password === a.password) failKeep('Error: This account is deactivated');
        failKeep('Error: Wrong password. ' + (5 - u.attempts) + ' attempts left');
      }
      u.attempts = 0;
      u.lockedUntil = 0;
      s.sessionUserId = u.id;
      audit(s, u.id, 'signin', u.id, '');
      return {};
    }

    if (a.type === 'signout') { s.sessionUserId = null; return {}; }

    if (a.type === 'forgot') {
      if (emailMsg(a.email)) fail(emailMsg(a.email));
      return { notice: 'A reset link was sent' };
    }

    if (a.type === 'kycSubmit' || a.type === 'registerSubmit') {
      u = actor(s, a);
      var isKyc = a.type === 'kycSubmit';
      if (isKyc && u.role !== 'investor') fail('Error: This form is for investors');
      if (!isKyc && u.role !== 'manager') fail('Error: This form is for managers');
      if (u.kyc === 'pending') fail('Error: This application is already in review');
      if (u.kyc === 'approved') fail('Error: This application is already approved');
      msg = emailMsg(u.email);
      if (isKyc) {
        msg = msg || dobMsg(a.dob, s.clock) || phoneMsg(a.phone);
        if (msg) fail(msg);
        var res = countryCode(a.country);
        if (!res) fail('Error: Choose a country of residence');
        if (blocked(s, res)) fail('Error: This country of residence is not available');
        if (!a.idDoc || !a.addressDoc) fail('Error: Upload a photo ID and proof of address');
        if (!a.declare) fail('Error: Confirm the declaration');
        u.country = res; u.dob = a.dob; u.phone = a.phone;
      } else {
        if (msg) fail(msg);
        if (a.phone && phoneMsg(a.phone)) fail(phoneMsg(a.phone));
        if (a.managerType !== 'business' && a.managerType !== 'individual') fail('Error: Choose business or individual');
        res = countryCode(a.country);
        if (!res) fail('Error: Choose a country of registration');
        if (blocked(s, res)) fail('Error: This country of registration is not available');
        if (!a.docs || a.docs.length < 3) fail('Error: Upload the three documents for this type');
        if (!a.declare) fail('Error: Confirm the declaration');
        u.country = res; u.managerType = a.managerType; u.phone = a.phone || u.phone;
      }
      u.kyc = 'pending'; u.kycReason = '';
      app = {
        id: uid(s), userId: u.id, type: isKyc ? 'kyc' : 'company', status: 'pending', reason: '',
        assignee: null, fields: a, docs: a.docs || [{ name: a.idDoc, type: 'file', size: a.idSize || 1 }, { name: a.addressDoc, type: 'file', size: a.addressSize || 1 }],
        history: [{ at: s.clock, action: 'submitted', reason: '' }]
      };
      s.applications.push(app);
      audit(s, u.id, isKyc ? 'kyc_submit' : 'register_submit', app.id, '');
      return { toast: 'Submitted for review' };
    }

    if (a.type === 'decideApplication') {
      u = actor(s, a);
      app = s.applications.filter(function (x) { return x.id === a.id; })[0];
      if (!app || app.status !== 'pending') fail('Error: This application is not waiting');
      msg = decideMsg(u, app);
      if (msg) fail(msg);
      var who = user(s, app.userId);
      var code = who && who.country;
      if (a.decision === 'approve' && blocked(s, code)) fail('Error: This country is not available, so the application cannot be approved');
      if (a.decision === 'reject' && !a.reason) fail('Error: A rejection needs a reason');
      app.status = a.decision === 'approve' ? 'approved' : 'rejected';
      app.reason = a.reason || '';
      app.history.push({ at: s.clock, action: app.status, reason: app.reason, actorId: u.id });
      who.kyc = app.status; who.kycReason = app.reason;
      audit(s, u.id, 'application_' + app.status, app.id, app.reason);
      notify(s, who.id, app.status === 'approved' ? 'Your application was approved' : 'Your application was rejected: ' + app.reason);
      return { toast: app.status === 'approved' ? 'Approved' : 'Rejected' };
    }

    if (a.type === 'assign') {
      u = actor(s, a);
      if (!can(u, 'review')) fail('Error: Your role cannot assign this');
      row = a.kind === 'application' ? s.applications.filter(function (x) { return x.id === a.id; })[0] : listing(s, a.id);
      if (!row) fail('Error: Not found');
      if (a.assignee) {
        var asg = user(s, a.assignee);
        if (!asg || asg.role !== 'staff' || asg.active === false || (asg.staffRole !== 'reviewer' && asg.staffRole !== 'owner')) fail('Error: Assign an active reviewer or the owner');
      }
      row.assignee = a.assignee || null;
      audit(s, u.id, a.assignee ? 'assign' : 'unassign', row.id, '');
      return { toast: a.assignee ? 'Assigned' : 'Assignment cleared' };
    }

    if (a.type === 'saveListing') {
      u = actor(s, a);
      msg = gateManager(s, u);
      if (msg) fail(msg);
      l = a.id ? listing(s, a.id) : null;
      if (l && (l.managerId !== u.id || (l.status !== 'draft' && l.status !== 'rejected'))) fail('Error: This listing cannot be edited');
      var draft = normaliseListing(s, Object.assign({}, a.listing, { managerId: u.id, id: l ? l.id : undefined, history: l ? l.history : [] }));
      draft.status = l ? l.status : 'draft';
      msg = listingMsg(s, draft);
      if (msg && a.strict) fail(msg);
      if (l) {
        draft.contributions = l.contributions;
        draft.history = l.history;
        Object.keys(draft).forEach(function (k) { l[k] = draft[k]; });
      } else s.listings.push(draft);
      return { toast: 'Draft saved', id: (l || draft).id };
    }

    if (a.type === 'submitListing') {
      u = actor(s, a);
      l = listing(s, a.id);
      if (!l || l.managerId !== u.id) fail('Error: Listing not found');
      if (l.status !== 'draft' && l.status !== 'rejected') fail('Error: This listing is not editable');
      msg = gateManager(s, u) || listingMsg(s, l);
      if (msg) fail(msg);
      l.status = 'in_review';
      l.assignee = null;
      history(l, s, u.id, 'submitted', '');
      audit(s, u.id, 'listing_submit', l.id, '');
      return { toast: 'Sent for review' };
    }

    if (a.type === 'withdrawListing') {
      u = actor(s, a);
      l = listing(s, a.id);
      if (!l || l.managerId !== u.id) fail('Error: Listing not found');
      if (['draft', 'in_review', 'awaiting_terms', 'approved', 'rejected'].indexOf(l.status) < 0) fail('Error: A live listing cannot be withdrawn');
      l.status = 'withdrawn';
      history(l, s, u.id, 'withdrawn', a.reason || '');
      audit(s, u.id, 'listing_withdraw', l.id, '');
      return { toast: 'Listing withdrawn' };
    }

    if (a.type === 'deleteListing') {
      u = actor(s, a);
      l = listing(s, a.id);
      if (!l || l.managerId !== u.id || l.status !== 'draft') fail('Error: Only a draft can be deleted');
      s.listings = s.listings.filter(function (x) { return x.id !== l.id; });
      return { toast: 'Draft deleted' };
    }

    if (a.type === 'markListing') {
      u = actor(s, a);
      l = listing(s, a.id);
      if (!l || (l.status !== 'in_review' && l.status !== 'awaiting_terms')) fail('Error: This listing is not in review');
      if (a.buyerShareholderId) {
        if (!can(u, 'review')) fail('Error: A reviewer or the owner records the buyer');
        var marked = user(s, a.buyerShareholderId);
        if (!marked || !marked.shareholder) fail('Error: The buyer link must be a Shareholder');
        l.buyerShareholderId = marked.id;
        audit(s, u.id, 'buyer_shareholder', l.id, marked.id);
      }
      if (a.waiver) {
        if (!can(u, 'deposit')) fail('Error: Only finance or the owner can waive the deposit');
        if (!l.buyerShareholderId) fail('Error: A deposit can be waived only when the buyer is a Shareholder');
        l.depositWaiver = true;
        l.waiverPct = s.settings.waiverPct;
        audit(s, u.id, 'deposit_waiver', l.id, '');
      }
      if (a.marketNote) {
        if (!can(u, 'review')) fail('Error: A reviewer or the owner records the market check');
        l.marketCheck = { note: a.marketNote, actorId: u.id };
        audit(s, u.id, 'market_check', l.id, a.marketNote);
      }
      return { toast: 'Review notes saved' };
    }

    if (a.type === 'reviewListing') {
      u = actor(s, a);
      l = listing(s, a.id);
      if (!l || (l.status !== 'in_review' && l.status !== 'awaiting_terms')) fail('Error: This listing is not in review');
      msg = decideMsg(u, l);
      if (msg) fail(msg);
      if (a.decision === 'reject') {
        if (!a.reason) fail('Error: A rejection needs a reason');
        l.status = 'rejected';
        history(l, s, u.id, 'rejected', a.reason);
        audit(s, u.id, 'listing_reject', l.id, a.reason);
        notify(s, l.managerId, 'Your listing was rejected: ' + a.reason);
        return { toast: 'Rejected' };
      }
      if (a.decision === 'revise') {
        if (!a.listing) fail('Error: Nothing was changed');
        if (!a.reason) fail('Error: Say what you changed');
        var next = normaliseListing(s, Object.assign({}, a.listing, { managerId: l.managerId, id: l.id }));
        msg = listingMsg(s, next);
        if (msg) fail(msg);
        l.pendingTerms = { listing: a.listing, reason: a.reason };
        l.status = 'awaiting_terms';
        l.termsSentAt = s.clock;
        history(l, s, u.id, 'revised_terms', a.reason);
        audit(s, u.id, 'revised_terms', l.id, a.reason);
        notify(s, l.managerId, 'Revised terms are waiting for you');
        return { toast: 'Revised terms sent' };
      }
      if (a.decision !== 'approve') fail('Error: Choose approve, reject, or revised terms');
      if (a.buyerShareholderId) {
        if (!can(u, 'review')) fail('Error: A reviewer or the owner records the buyer');
        var buyerSh = user(s, a.buyerShareholderId);
        if (!buyerSh || !buyerSh.shareholder) fail('Error: The buyer link must be a Shareholder');
        l.buyerShareholderId = buyerSh.id;
        audit(s, u.id, 'buyer_shareholder', l.id, buyerSh.id);
      }
      if (a.waiver) {
        if (!can(u, 'deposit')) fail('Error: Only finance or the owner can waive the deposit');
        if (!l.buyerShareholderId) fail('Error: A deposit can be waived only when the buyer is a Shareholder');
        l.depositWaiver = true;
        l.waiverPct = s.settings.waiverPct;
        audit(s, u.id, 'deposit_waiver', l.id, '');
      }
      if ((l.buyerShareholderId || (user(s, l.managerId) || {}).shareholder) && !(a.marketNote || (l.marketCheck && l.marketCheck.note))) {
        fail('Error: A Shareholder Listing needs a market check of the expected sale price');
      }
      if (a.marketNote) l.marketCheck = { note: a.marketNote, actorId: u.id };
      msg = listingMsg(s, l);
      if (msg) fail(msg);
      l.target = figures(s, l).target;
      var mgrU = user(s, l.managerId);
      if (blocked(s, mgrU.country)) fail('Error: The manager country is not available');
      if (exposureUsed(s, l.managerId, l.id) + l.target > exposureLimit(s, mgrU)) fail('Error: This listing would pass the exposure limit');
      if (a.requiredDocs) {
        l.shipments.forEach(function (sh) {
          sh.steps.forEach(function (st) { st.requiredDocs = (a.requiredDocs[st.name] || []).slice(); });
        });
      }
      l.shareholderPct = s.settings.shareholderPct;
      l.status = 'approved';
      l.approvedAt = s.clock;
      history(l, s, u.id, 'approved', '');
      audit(s, u.id, 'listing_approve', l.id, '');
      notify(s, l.managerId, l.depositWaiver ? 'Your listing is approved and the deposit was waived' : 'Your listing is approved. Pay the deposit to go live');
      if (l.depositWaiver) goLive(s, l, u, true);
      return { toast: l.depositWaiver ? 'Approved and live' : 'Approved' };
    }

    if (a.type === 'acceptTerms') {
      u = actor(s, a);
      l = listing(s, a.id);
      if (!l || l.managerId !== u.id || l.status !== 'awaiting_terms' || !l.pendingTerms) fail('Error: There are no revised terms to accept');
      var applied = normaliseListing(s, Object.assign({}, l.pendingTerms.listing, { managerId: l.managerId, id: l.id, history: l.history }));
      applied.contributions = l.contributions;
      applied.pendingTerms = null;
      applied.assignee = l.assignee;
      applied.buyerShareholderId = l.buyerShareholderId;
      applied.depositWaiver = l.depositWaiver;
      applied.marketCheck = l.marketCheck;
      applied.status = 'approved';
      applied.approvedAt = s.clock;
      applied.termsSentAt = l.termsSentAt;
      msg = listingMsg(s, applied);
      if (msg) fail(msg);
      Object.keys(applied).forEach(function (k) { l[k] = applied[k]; });
      l.target = figures(s, l).target;
      l.shareholderPct = s.settings.shareholderPct;
      history(l, s, u.id, 'accepted_terms', '');
      audit(s, u.id, 'accept_terms', l.id, '');
      // A deposit waiver set during the review goes live now, as it does on approval.
      if (l.depositWaiver) {
        goLive(s, l, u, true);
        notify(s, u.id, 'Revised terms accepted and your listing is live');
        return { toast: 'Terms accepted and live' };
      }
      notify(s, u.id, 'Revised terms accepted. Pay the deposit to go live');
      return { toast: 'Terms accepted' };
    }

    if (a.type === 'declineTerms') {
      u = actor(s, a);
      l = listing(s, a.id);
      if (!l || l.managerId !== u.id || l.status !== 'awaiting_terms') fail('Error: There are no revised terms to decline');
      l.status = 'draft';
      l.pendingTerms = null;
      history(l, s, u.id, 'declined_terms', a.reason || '');
      audit(s, u.id, 'decline_terms', l.id, a.reason || '');
      return { toast: 'Sent back to edit' };
    }

    if (a.type === 'payDeposit') {
      u = actor(s, a);
      l = listing(s, a.id);
      msg = gateManager(s, u);
      if (msg) fail(msg);
      if (!l || l.managerId !== u.id || l.status !== 'approved') fail('Error: There is no deposit to pay');
      if (l.depositWaiver) fail('Error: The deposit was waived');
      amount = Math.round(l.target * l.companyPct / 100);
      if (balance(s, walletOf(u.id)) < amount) fail('Error: Top up the wallet before paying the deposit');
      move(s, walletOf(u.id), escrowOf(l.id), amount, 'Manager deposit');
      l.contributions.push({ id: uid(s), userId: u.id, kind: 'manager', amount: amount });
      goLive(s, l, u, false);
      audit(s, u.id, 'pay_deposit', l.id, '');
      return { notice: 'The listing is live' };
    }

    if (a.type === 'invest') {
      u = actor(s, a);
      l = listing(s, a.id);
      msg = gateInvestor(s, u);
      if (msg) fail(msg);
      if (!l || l.status !== 'live' || l.stage !== 0) fail('Error: This listing is not open for funding');
      amount = a.amount;
      if (!centsOk(amount)) fail('Error: Enter an amount with at most 2 decimals');
      msg = remainderMsg(l, amount);
      if (msg) fail(msg);
      if (balance(s, walletOf(u.id)) < amount) fail('Error: Top up the wallet before investing');
      move(s, walletOf(u.id), escrowOf(l.id), amount, 'Investment');
      l.contributions.push({ id: uid(s), userId: u.id, kind: 'investor', amount: amount });
      history(l, s, u.id, 'invest', String(amount));
      audit(s, u.id, 'invest', l.id, String(amount));
      derive(s, l);
      return { notice: 'Investment confirmed' };
    }

    if (a.type === 'topup') {
      u = actor(s, a);
      if (u.role === 'staff') fail('Error: Staff accounts cannot top up a wallet');
      if (u.kyc !== 'approved') fail('Error: Finish approval before topping up');
      if (u.suspended) fail('Error: This account is suspended');
      if (blocked(s, u.country)) fail('Error: Top-ups are not available for this country');
      amount = a.amount;
      if (!centsOk(amount) || amount < 100 || amount > 1000000000) fail('Error: Enter a top-up between USD 1 and USD 10,000,000');
      if (a.fail) return { notice: 'The payment failed. Nothing was added' };
      move(s, 'bank:external', walletOf(u.id), amount, 'Gateway top-up ' + (a.ref || ''));
      audit(s, u.id, 'topup', u.id, String(amount));
      return { notice: 'Payment received' };
    }

    if (a.type === 'treasuryTopup') {
      u = actor(s, a);
      if (!can(u, 'deposit')) fail('Error: Only finance or the owner can top up the treasury');
      amount = a.amount;
      if (!centsOk(amount) || amount < 100 || amount > 10000000000) fail('Error: Enter a treasury amount between USD 1 and USD 100,000,000');
      if (!a.ref) fail('Error: A bank reference is required');
      move(s, 'bank:external', 'platform:treasury', amount, 'Treasury top-up ' + a.ref);
      audit(s, u.id, 'treasury_topup', 'platform:treasury', a.ref);
      return { toast: 'Treasury credited' };
    }

    if (a.type === 'withdraw') {
      u = actor(s, a);
      if (u.role === 'staff') fail('Staff accounts cannot invest or withdraw');
      if (u.role === 'investor') msg = gateInvestor(s, u); else msg = gateManager(s, u);
      if (msg) fail(msg);
      amount = a.amount;
      if (!centsOk(amount) || amount < 100 || amount > 1000000000) fail('Error: Enter a withdrawal between USD 1 and USD 10,000,000');
      msg = bankMsg(s, a.bank || {});
      if (msg) fail(msg);
      if (balance(s, walletOf(u.id)) < amount) fail('Error: The wallet does not cover this withdrawal');
      move(s, walletOf(u.id), 'withdrawals:hold', amount, 'Withdrawal request');
      row = { id: uid(s), userId: u.id, amount: amount, bank: a.bank, status: 'requested', reason: '', ref: '', at: s.clock };
      s.withdrawals.push(row);
      audit(s, u.id, 'withdraw_request', row.id, '');
      return { notice: amount >= s.settings.largeWithdrawal ? 'Withdrawal held for the owner' : 'Withdrawal requested', id: row.id };
    }

    if (a.type === 'decideWithdrawal') {
      u = actor(s, a);
      row = s.withdrawals.filter(function (w) { return w.id === a.id; })[0];
      if (!row || row.status !== 'requested') fail('Error: This withdrawal is not waiting');
      if (!can(u, 'wd')) fail('Error: Your role cannot decide withdrawals');
      if (a.decision === 'approve') {
        if (row.amount >= s.settings.largeWithdrawal && u.staffRole !== 'owner') fail('Error: USD 10,000 or more can only be approved by the owner');
        if (!a.ref) fail('Error: A bank reference is required');
        move(s, 'withdrawals:hold', 'bank:external', row.amount, 'Withdrawal paid ' + a.ref);
        row.status = 'paid'; row.ref = a.ref;
        audit(s, u.id, 'withdraw_approve', row.id, a.ref);
        notify(s, row.userId, 'Your withdrawal was paid');
        return { toast: 'Withdrawal paid' };
      }
      if (!a.reason) fail('Error: A decline needs a reason');
      move(s, 'withdrawals:hold', walletOf(row.userId), row.amount, 'Withdrawal declined');
      row.status = 'declined'; row.reason = a.reason;
      audit(s, u.id, 'withdraw_decline', row.id, a.reason);
      notify(s, row.userId, 'Your withdrawal was declined: ' + a.reason);
      return { toast: 'Declined' };
    }

    if (a.type === 'payoutFail') {
      u = actor(s, a);
      if (!can(u, 'wd') && !(u.role === 'staff' && u.staffRole === 'owner')) fail('Error: Your role cannot record a payout failure');
      row = s.withdrawals.filter(function (w) { return w.id === a.id; })[0];
      if (!row || row.status !== 'paid') fail('Error: Only a paid withdrawal can fail');
      move(s, 'bank:external', walletOf(row.userId), row.amount, 'Payout failed, returned');
      row.status = 'failed'; row.reason = 'The bank returned the payout';
      audit(s, u.id, 'payout_fail', row.id, row.reason);
      notify(s, row.userId, 'A payout failed and the money is back in the wallet');
      return { toast: 'Payout returned' };
    }

    if (a.type === 'fillOverdue') {
      u = actor(s, a);
      if (!can(u, 'ops')) fail('Error: Only operations or the owner can fill a remainder');
      l = listing(s, a.id);
      derive(s, l);
      if (!l || !l.overdue) fail('Error: This listing is not overdue');
      amount = l.target - l.raised;
      if (amount <= 0) fail('Error: Nothing is left to fill');
      if (balance(s, 'platform:treasury') < amount) fail('Error: The treasury does not cover this fill');
      move(s, 'platform:treasury', escrowOf(l.id), amount, 'Overdue fill');
      l.contributions.push({ id: uid(s), userId: null, kind: 'treasury', amount: amount });
      history(l, s, u.id, 'overdue_fill', String(amount));
      audit(s, u.id, 'overdue_fill', l.id, String(amount));
      return { toast: 'Remainder filled from the treasury' };
    }

    if (a.type === 'stepSet') {
      u = actor(s, a);
      l = listing(s, a.listingId);
      if (!l || l.status !== 'live') fail('Error: Steps move only on a live listing');
      var found = findStep(l, a.shipmentId, a.stepId);
      if (!found) fail('Error: Step not found');
      var mgrSuspended = user(s, l.managerId).suspended || blocked(s, user(s, l.managerId).country);
      var owns = found.st.owner === 'manager' ? u.id === l.managerId : (u.role === 'staff' && can(u, 'ops'));
      if (mgrSuspended && found.st.owner === 'manager') owns = u.role === 'staff' && can(u, 'ops');
      if (!owns) fail(mgrSuspended ? 'Error: Operations has taken over this step' : 'Error: You cannot move this step');
      var order = ['todo', 'in_progress', 'done'];
      if (order.indexOf(a.status) < 0) fail('Error: That column is not a direct move');
      if (a.status === 'done' && found.st.requiredDocs.length && found.st.docs.length < found.st.requiredDocs.length) fail('Error: Upload the required documents first');
      found.st.status = a.status;
      history(l, s, u.id, 'step_' + a.status, found.st.name);
      audit(s, u.id, 'step_' + a.status, found.st.id, '');
      return { toast: 'Step updated' };
    }

    if (a.type === 'stepDoc') {
      u = actor(s, a);
      l = listing(s, a.listingId);
      found = findStep(l, a.shipmentId, a.stepId);
      if (!found) fail('Error: Step not found');
      if (!(u.id === l.managerId || (u.role === 'staff' && can(u, 'ops')))) fail('Error: You cannot add a document here');
      found.st.docs.push({ name: a.name || 'file', type: a.fileType || 'file', size: a.size || 1 });
      return { toast: 'Document added' };
    }

    if (a.type === 'verifyStep' || a.type === 'blockStep') {
      u = actor(s, a);
      if (!can(u, 'ops')) fail('Error: Only operations can do this');
      l = listing(s, a.listingId);
      found = findStep(l, a.shipmentId, a.stepId);
      if (!found) fail('Error: Step not found');
      if (a.type === 'verifyStep') {
        if (found.st.status !== 'done') fail('Error: Verify a step only after it is done');
        found.st.status = 'verified';
      } else {
        if (!a.reason) fail('Error: Blocking a step needs a reason');
        found.st.status = 'blocked';
        found.st.blockedReason = a.reason;
      }
      audit(s, u.id, a.type, found.st.id, a.reason || '');
      return { toast: a.type === 'verifyStep' ? 'Verified' : 'Blocked' };
    }

    if (a.type === 'requestSkip' || a.type === 'payCost' || a.type === 'proposeUnplanned' || a.type === 'recordProceeds' || a.type === 'proposeUseProceeds' || a.type === 'proposeOverrun' || a.type === 'proposeWriteoff' || a.type === 'proposeResale' || a.type === 'proposePlan' || a.type === 'proposeSettlement' || a.type === 'cancelListing') {
      u = actor(s, a);
      if (!can(u, 'ops') && a.type !== 'proposePlan' && a.type !== 'requestSkip') fail('Error: Only operations or the owner can do this');
      l = listing(s, a.listingId || a.id);
      if (!l) fail('Error: Listing not found');
      if (a.type === 'proposePlan' && !can(u, 'ops') && l.managerId !== u.id) fail('Error: Only the listing manager or operations proposes a plan change');
    }

    if (a.type === 'requestSkip') {
      if (!(can(u, 'ops') || u.id === l.managerId)) fail('Error: You cannot request a skip');
      found = findStep(l, a.shipmentId, a.stepId);
      if (!found) fail('Error: Step not found');
      if (!a.reason) fail('Error: A skip needs a reason');
      pushApproval(s, 'skip', l.id, u.id, { shipmentId: a.shipmentId, stepId: a.stepId, reason: a.reason });
      return { toast: 'Skip sent for approval' };
    }

    if (a.type === 'payCost') {
      if (l.status !== 'live') fail('Error: Costs are paid on a live listing');
      found = findStep(l, a.shipmentId, a.stepId);
      amount = a.amount;
      if (!found || !centsOk(amount) || amount <= 0) fail('Error: Choose a step and an amount');
      var cap = l.raised + (l.proceedsUsable ? l.proceeds : 0);
      if ((l.costsPaid || 0) + amount > cap) fail('Error: Paid costs cannot pass the capital raised. Request an overrun fill or the use of proceeds');
      if (balance(s, escrowOf(l.id)) < amount) fail('Error: Escrow does not cover this cost');
      if (!a.proof) fail('Error: Add proof of payment');
      move(s, escrowOf(l.id), 'bank:external', amount, 'Step cost ' + found.st.name);
      l.costsPaid += amount;
      if (found.st.tag === 1 || /purchase/i.test(found.st.name)) found.sh.goodsPaid = true;
      audit(s, u.id, 'pay_cost', l.id, a.proof);
      return { toast: 'Cost paid from escrow' };
    }

    if (a.type === 'proposeUnplanned' || a.type === 'proposeUseProceeds' || a.type === 'proposeOverrun' || a.type === 'proposeWriteoff' || a.type === 'proposeResale' || a.type === 'proposePlan' || a.type === 'proposeSettlement') {
      if (l.status !== 'live') fail('Error: This listing is not live');
      var type = a.type.replace('propose', '').replace(/^./, function (c) { return c.toLowerCase(); });
      if (a.type === 'proposeSettlement') {
        derive(s, l);
        var ready = l.shipments.every(function (sh) {
          return sh.writtenOff || (sh.stage >= 5 && sh.proceeds > 0 && sh.saleDoc);
        });
        if (!ready) fail('Error: Every shipment must be sold, with proceeds and a sale document, or written off');
        type = 'settlement';
      }
      if (a.type === 'proposeResale' && a.shareholder) {
        if (u.staffRole !== 'owner' && !can(u, 'ops')) fail('Error: Operations proposes a resale');
        type = 'resale_shareholder';
      }
      if (a.type === 'proposeUnplanned' && (!centsOk(a.amount) || a.amount <= 0)) fail('Error: Enter the unplanned cost');
      if (a.type === 'proposeOverrun' && (!centsOk(a.amount) || a.amount <= 0)) fail('Error: Enter the overrun amount');
      if ((a.type === 'proposeWriteoff' || a.type === 'proposeResale' || a.type === 'proposePlan') && !a.reason && a.type !== 'proposePlan') fail('Error: A reason is required');
      if (a.type === 'proposeResale') {
        if (blocked(s, countryCode(a.buyer))) fail('Error: The new buyer country is not available');
      }
      if (a.type === 'proposePlan') {
        if (!a.plan || !Array.isArray(a.plan.steps)) fail('Error: Send the plan with the change');
        var first = l.shipments[0];
        var kept = first.steps.filter(function (st) { return st.status !== 'todo'; });
        var old = first.steps.filter(function (st) { return st.status === 'todo'; });
        var seen = {};
        var tagged = {};
        kept.forEach(function (st) { seen[st.name.toLowerCase()] = true; if (st.tag) tagged[st.tag] = true; });
        a.plan.steps.forEach(function (st) {
          var nm = String(st.name || '').trim();
          if (!nm || nm.length > 60) fail('Error: Each Step needs a name of 1 to 60 characters');
          if (seen[nm.toLowerCase()]) fail('Error: Two Steps are called ' + nm);
          seen[nm.toLowerCase()] = true;
          if (st.owner !== 'manager' && st.owner !== 'staff') fail('Error: A Step is owned by the manager or Shehnat staff');
          if (!Number.isInteger(st.days) || st.days < 1 || st.days > 365) fail('Error: ' + nm + ' needs a whole number of days from 1 to 365');
          if (!centsOk(st.cost) || st.cost < 0) fail('Error: ' + nm + ' needs a cost of zero or more');
          if ([0, 1, 2, 3, 4, 5].indexOf(Number(st.tag || 0)) < 0) fail('Error: ' + nm + ' has an unknown Stage tag');
          if (st.tag) tagged[st.tag] = true;
        });
        for (var tg = 1; tg <= 5; tg++) if (!tagged[tg]) fail('Error: Every Stage from Goods purchased to Goods sold needs a tagged Step');
        // The client does not decide this: a cost change also needs finance.
        var oldCost = old.reduce(function (acc, st) { return acc + (st.cost || 0); }, 0);
        var newCost = a.plan.steps.reduce(function (acc, st) { return acc + st.cost; }, 0);
        a.plan.costChange = oldCost !== newCost || a.plan.steps.some(function (st) {
          var was = old.filter(function (o) { return o.name === st.name; })[0];
          return was && was.cost !== st.cost;
        });
      }
      row = pushApproval(s, type, l.id, u.id, {
        amount: a.amount || 0, reason: a.reason || '', shipmentId: a.shipmentId, stepId: a.stepId,
        buyer: a.buyer, price: a.price, shareholder: !!a.shareholder, proof: a.proof || '', plan: a.plan || null,
        marketNote: a.marketNote || ''
      });
      if (type === 'settlement') { l.status = 'settlement'; l.settlementId = row.id; }
      audit(s, u.id, 'propose_' + type, l.id, a.reason || '');
      return { toast: 'Sent for approval' };
    }

    if (a.type === 'recordProceeds') {
      if (l.status !== 'live' && l.status !== 'settlement') fail('Error: Proceeds are recorded on a live listing');
      var sh = l.shipments.filter(function (x) { return x.id === a.shipmentId; })[0];
      amount = a.amount;
      if (!sh || !centsOk(amount) || amount < 1) fail('Error: Enter the sale proceeds');
      if (sh.expectedSale > amount && !a.reason) fail('Error: A shortfall needs a reason');
      move(s, 'bank:external', escrowOf(l.id), amount, 'Sale proceeds');
      sh.proceeds += amount;
      sh.shortfallReason = a.reason || '';
      if (a.doc) sh.saleDoc = a.doc;
      audit(s, u.id, 'proceeds', l.id, String(amount));
      return { toast: 'Proceeds recorded' };
    }

    if (a.type === 'cancelListing') {
      if (l.status !== 'live') fail('Error: Only a live listing can be cancelled');
      if (goodsBought(l)) fail('Error: Goods have been bought, so this listing cannot be cancelled');
      if (!a.reason) fail('Error: A cancellation needs a reason');
      l.contributions.forEach(function (c) {
        dest = c.kind === 'treasury' ? 'platform:treasury' : walletOf(c.userId);
        move(s, escrowOf(l.id), dest, c.amount, 'Cancellation refund');
      });
      l.status = 'cancelled';
      l.cancelReason = a.reason;
      history(l, s, u.id, 'cancelled', a.reason);
      audit(s, u.id, 'cancel', l.id, a.reason);
      l.contributions.forEach(function (c) { if (c.userId) notify(s, c.userId, 'A listing was cancelled and your money was returned'); });
      return { toast: 'Cancelled and refunded' };
    }

    if (a.type === 'decideApproval') {
      u = actor(s, a);
      row = s.approvals.filter(function (x) { return x.id === a.id; })[0];
      if (!row || row.status !== 'open') fail('Error: This item is not waiting');
      if (u.id === row.proposerId) fail('Needs another staff member to approve');
      l = listing(s, row.listingId);
      // Sending back needs the same authority as approving.
      if (u.role !== 'staff') fail('Error: Staff only');
      if (row.type === 'resale_shareholder') {
        if (u.staffRole !== 'owner') fail('Error: A resale to a Shareholder needs the owner');
      } else if (row.type === 'settlement' || row.type === 'overrun' || row.type === 'unplanned' || row.type === 'proceeds' || row.type === 'useProceeds') {
        if (!can(u, 'deposit') && u.staffRole !== 'owner') fail('Error: Finance or the owner approves this');
      } else if (row.type === 'skip' || row.type === 'plan') {
        if (!can(u, 'review') && u.staffRole !== 'owner') fail('Error: A reviewer or the owner approves this');
      }
      if (a.decision === 'send_back') {
        if (!a.reason) fail('Error: Sending back needs a reason');
        row.status = 'sent_back'; row.reason = a.reason;
        if (row.type === 'settlement' && l) l.status = 'live';
        audit(s, u.id, 'send_back', row.id, a.reason);
        notify(s, row.proposerId, 'An approval was sent back: ' + a.reason);
        return { toast: 'Sent back' };
      }
      if (row.type === 'resale_shareholder' && !a.marketNote && !row.payload.marketNote) fail('Error: A market check is required');
      if (row.type === 'plan' && row.payload.plan && row.payload.plan.costChange && !can(u, 'deposit') && u.staffRole !== 'owner') fail('Error: A cost change also needs finance');
      applyApproval(s, u, l, row);
      row.status = 'approved';
      audit(s, u.id, 'approve_' + row.type, row.id, '');
      return { notice: row.type === 'settlement' ? 'Payout recorded' : 'Approved' };
    }

    if (a.type === 'addStaff' || a.type === 'setRole' || a.type === 'deactivate') {
      u = actor(s, a);
      if (!can(u, 'team')) fail('Error: Only the owner can change the team');
    }

    if (a.type === 'addStaff') {
      msg = emailMsg(a.email) || passwordMsg(a.password);
      if (msg) fail(msg);
      if (['owner', 'reviewer', 'ops', 'finance'].indexOf(a.staffRole) < 0) fail('Error: Choose a staff role');
      email = a.email.trim().toLowerCase();
      if (s.users.some(function (x) { return x.email === email; })) fail('Error: An account with this email already exists');
      id = uid(s);
      s.users.push({
        id: id, name: a.name, email: email, password: a.password, role: 'staff', staffRole: a.staffRole,
        country: 'AE', kyc: 'approved', kycReason: '', shareholder: false, suspended: false, active: true,
        exposureLimit: 0, managerType: '', attempts: 0, lockedUntil: 0, phone: '', dob: ''
      });
      audit(s, u.id, 'staff_add', id, a.staffRole);
      return { toast: 'Staff member added' };
    }

    if (a.type === 'setRole') {
      var target = user(s, a.userId);
      if (!target || target.role !== 'staff') fail('Error: Not a staff account');
      if (target.id === u.id && a.staffRole !== 'owner') fail('Error: You cannot remove your own owner role');
      target.staffRole = a.staffRole;
      audit(s, u.id, 'staff_role', target.id, a.staffRole);
      return { toast: 'Role updated' };
    }

    if (a.type === 'deactivate') {
      target = user(s, a.userId);
      if (!target || target.role !== 'staff') fail('Error: Not a staff account');
      if (target.id === u.id) fail('Error: You cannot deactivate your own account');
      target.active = false;
      audit(s, u.id, 'staff_deactivate', target.id, '');
      return { toast: 'Deactivated' };
    }

    if (a.type === 'markShareholder') {
      u = actor(s, a);
      if (u.staffRole !== 'owner') fail('Error: Only the owner can mark a Shareholder');
      target = user(s, a.userId);
      if (!target || target.kyc !== 'approved' || target.role === 'staff') fail('Error: Mark an approved investor or manager');
      target.shareholder = !!a.on;
      audit(s, u.id, a.on ? 'shareholder_mark' : 'shareholder_unmark', target.id, '');
      return { toast: a.on ? 'Marked as a Shareholder' : 'Shareholder mark removed' };
    }

    if (a.type === 'suspendUser') {
      u = actor(s, a);
      if (!can(u, 'review') && u.staffRole !== 'owner') fail('Error: Your role cannot suspend accounts');
      target = user(s, a.userId);
      if (!target || target.role === 'staff') fail('Error: Not an investor or manager');
      target.suspended = !!a.on;
      audit(s, u.id, a.on ? 'suspend' : 'unsuspend', target.id, a.reason || '');
      notify(s, target.id, a.on ? 'Your account is suspended' : 'Your account is active again');
      return { toast: a.on ? 'Suspended' : 'Suspension lifted' };
    }

    if (a.type === 'setExposure') {
      u = actor(s, a);
      if (u.staffRole !== 'owner') fail('Error: Only the owner sets an exposure limit');
      target = user(s, a.userId);
      if (!target || target.role !== 'manager') fail('Error: Choose a manager');
      if (!centsOk(a.amount) || a.amount < 100000) fail('Error: Enter a limit of at least USD 1,000');
      target.exposureLimit = a.amount;
      audit(s, u.id, 'exposure_limit', target.id, String(a.amount));
      return { toast: 'Exposure limit saved' };
    }

    if (a.type === 'updateSettings') {
      u = actor(s, a);
      if (u.staffRole !== 'owner') fail('Error: Only the owner changes settings');
      var st = a.settings || {};
      if (!Number.isInteger(st.overdueDays) || !Number.isInteger(st.autoWithdrawDays) || st.overdueDays < 1 || st.autoWithdrawDays < 1) fail('Error: Day counts must be whole numbers of at least 1');
      if (!Number.isInteger(st.waiverPct) || !Number.isInteger(st.shareholderPct)) fail('Error: Percentages must be whole numbers');
      if (!centsOk(st.exposureDefault) || st.exposureDefault < 100) fail('Error: Enter the default exposure limit in dollars');
      if (st.waiverPct < 1 || st.waiverPct > 90) fail('Error: Waiver stand-in must be between 1% and 90%');
      if (st.shareholderPct < 1 || st.shareholderPct > 100) fail('Error: Shareholder share must be between 1% and 100%');
      s.settings.overdueDays = Number(st.overdueDays);
      s.settings.autoWithdrawDays = Number(st.autoWithdrawDays);
      s.settings.waiverPct = Number(st.waiverPct);
      s.settings.shareholderPct = Number(st.shareholderPct);
      s.settings.exposureDefault = Number(st.exposureDefault);
      s.settings.blocked = (st.blocked || []).map(function (c) { return countryCode(c); }).filter(Boolean);
      if (st.prohibited) s.settings.prohibited = String(st.prohibited);
      audit(s, u.id, 'settings', 'settings', '');
      return { toast: 'Settings saved' };
    }

    if (a.type === 'reserveOut') {
      u = actor(s, a);
      if (u.staffRole !== 'owner') fail('Error: Only the owner moves money out of the Reserve fund');
      amount = a.amount;
      if (!centsOk(amount) || amount <= 0) fail('Error: Enter an amount');
      if (!a.reason) fail('Error: A reason is required');
      if (balance(s, 'platform:reserve') < amount) fail('Error: The Reserve fund does not cover this');
      move(s, 'platform:reserve', 'platform:treasury', amount, 'Reserve fund ' + a.reason);
      audit(s, u.id, 'reserve_out', 'platform:reserve', a.reason);
      return { toast: 'Reserve fund moved' };
    }

    if (a.type === 'viewDoc') {
      u = actor(s, a);
      if (u.role !== 'staff') fail('Error: Documents are not shown here');
      audit(s, u.id, 'doc_view', a.entity || '', a.name || '');
      return {};
    }

    if (a.type === 'markRead') {
      u = actor(s, a);
      s.notifications.forEach(function (n) { if (n.userId === u.id) n.read = true; });
      return {};
    }

    fail('Error: Unknown action');
  }

  function goLive(s, l, u, waiver) {
    l.status = 'live';
    l.liveAt = s.clock;
    if (waiver) {
      var amount = Math.round(l.target * l.waiverPct / 100);
      if (balance(s, 'platform:treasury') < amount) fail('Error: The treasury does not cover the stand-in');
      move(s, 'platform:treasury', escrowOf(l.id), amount, 'Waiver stand-in');
      l.contributions.push({ id: uid(s), userId: null, kind: 'treasury', amount: amount, waiver: true });
      audit(s, u.id, 'waiver_stand_in', l.id, String(amount));
    }
    history(l, s, u.id, 'live', waiver ? 'Deposit waived' : 'Deposit paid');
    notify(s, l.managerId, 'Your listing is live');
  }

  function applyApproval(s, u, l, row) {
    var p = row.payload;
    if (row.type === 'skip') {
      var found = findStep(l, p.shipmentId, p.stepId);
      found.st.status = 'skipped';
      found.st.skipReason = p.reason;
    } else if (row.type === 'unplanned') {
      var cap = l.raised + (l.proceedsUsable ? l.proceeds : 0);
      if (l.costsPaid + p.amount > cap) fail('Error: This cost needs an overrun fill');
      move(s, escrowOf(l.id), 'bank:external', p.amount, 'Unplanned cost');
      l.costsPaid += p.amount;
    } else if (row.type === 'proceeds' || row.type === 'useProceeds') {
      l.proceedsUsable = true;
    } else if (row.type === 'overrun') {
      move(s, 'platform:treasury', escrowOf(l.id), p.amount, 'Overrun fill');
      l.contributions.push({ id: uid(s), userId: null, kind: 'treasury', amount: p.amount, overrun: true });
    } else if (row.type === 'writeoff') {
      var sh = l.shipments.filter(function (x) { return x.id === p.shipmentId; })[0];
      sh.writtenOff = true;
      if (p.amount > 0) {
        move(s, 'bank:external', escrowOf(l.id), p.amount, 'Salvage proceeds');
        sh.proceeds += p.amount;
      }
      sh.saleDoc = sh.saleDoc || 'Write-off';
    } else if (row.type === 'resale' || row.type === 'resale_shareholder') {
      sh = l.shipments.filter(function (x) { return x.id === p.shipmentId; })[0];
      sh.resale = { buyer: countryCode(p.buyer), price: p.price, shareholder: row.type === 'resale_shareholder' };
      sh.expectedSale = p.price;
      if (row.type === 'resale_shareholder') {
        l.buyerShareholderId = l.buyerShareholderId || p.buyerId || null;
        l.marketCheck = { note: p.marketNote || 'Resale market check', actorId: u.id };
      }
    } else if (row.type === 'plan') {
      if (p.plan && p.plan.steps) {
        l.shipments.forEach(function (shp) {
          // Keep every Step that has started. A not-yet-started Step takes its new values from the plan.
          var started = shp.steps.filter(function (st) { return st.status !== 'todo'; });
          var names = started.map(function (st) { return st.name; });
          var old = {};
          shp.steps.forEach(function (st) { old[st.name] = st; });
          var added = p.plan.steps.filter(function (st) { return names.indexOf(st.name) < 0; });
          var fresh = cloneSteps(s, added, []);
          fresh.forEach(function (st) { if (old[st.name]) st.requiredDocs = old[st.name].requiredDocs.slice(); });
          shp.steps = started.concat(fresh);
        });
      }
    } else if (row.type === 'settlement') {
      settle(s, u, l);
    }
  }

  function settle(s, u, l) {
    derive(s, l);
    var feeBps = s.settings.feeBps;
    var result = compute({
      contributions: l.contributions,
      cost: l.costsPaid,
      revenue: l.proceeds,
      investorSharePct: l.investorSharePct,
      feeBps: feeBps
    });
    if (result.fee > 0) move(s, escrowOf(l.id), 'platform:revenue', result.fee, 'Service fee');
    if (result.manager > 0) {
      var mgr = user(s, l.managerId);
      move(s, escrowOf(l.id), payoutAccount(s, mgr), result.manager, 'Manager share');
    }
    result.lines.forEach(function (line) {
      var dest = line.kind === 'treasury' ? 'platform:treasury' : payoutAccount(s, user(s, line.userId));
      if (line.payout > 0) move(s, escrowOf(l.id), dest, line.payout, 'Settlement payout');
      else if (line.payout < 0) fail('Error: A payout cannot be negative');
    });
    var treasuryProfit = result.lines.filter(function (line) { return line.kind === 'treasury'; })
      .reduce(function (a, line) { return a + line.profit; }, 0);
    var split = { shareholder: 0, reserve: 0, lines: [] };
    if (l.buyerShareholderId || (user(s, l.managerId) || {}).shareholder) {
      var buyerId = l.buyerShareholderId;
      var mgrSh = (user(s, l.managerId) || {}).shareholder ? l.managerId : null;
      if (!buyerId && mgrSh) buyerId = mgrSh;
      split = shareholderSplit(treasuryProfit, l.shareholderPct || s.settings.shareholderPct, buyerId, buyerId && mgrSh && mgrSh !== buyerId ? mgrSh : null);
      split.lines.forEach(function (line) {
        if (line.amount > 0) move(s, 'platform:treasury', payoutAccount(s, user(s, line.userId)), line.amount, 'Shareholder share');
      });
      if (split.reserve > 0) move(s, 'platform:treasury', 'platform:reserve', split.reserve, 'Reserve fund');
      audit(s, u.id, 'shareholder_payout', l.id, String(split.shareholder));
    }
    l.status = 'completed';
    l.stage = 6;
    l.result = result;
    l.shareSplit = split;
    history(l, s, u.id, 'settled', '');
    audit(s, u.id, 'settle', l.id, '');
    l.contributions.forEach(function (c) {
      if (c.userId) notify(s, c.userId, 'A listing was settled and your wallet was updated');
    });
  }

  function tick(s) {
    s.listings.forEach(function (l) {
      var days = s.settings.autoWithdrawDays;
      if (l.status === 'awaiting_terms' && l.termsSentAt && Math.floor((s.clock - l.termsSentAt) / DAY) >= days) {
        l.status = 'withdrawn';
        history(l, s, null, 'auto_withdrawn', 'Revised terms were unanswered');
        notify(s, l.managerId, 'A listing was withdrawn after revised terms went unanswered');
      }
      if (l.status === 'approved' && !l.depositWaiver && l.approvedAt && Math.floor((s.clock - l.approvedAt) / DAY) >= days) {
        l.status = 'withdrawn';
        history(l, s, null, 'auto_withdrawn', 'The deposit was unpaid');
        notify(s, l.managerId, 'A listing was withdrawn because the deposit was unpaid');
      }
      derive(s, l);
    });
  }

  function apply(state, action) {
    var s = structuredClone(state);
    try {
      var r = reduce(s, action) || {};
      tick(s);
      return { ok: true, state: s, notice: r.notice || '', toast: r.toast || '', id: r.id || '' };
    } catch (e) {
      return { ok: false, error: e.message || String(e), state: e.keepState ? s : state };
    }
  }

  function selfCheck() {
    var rows = [];
    function eq(name, got, expect) { rows.push({ name: name, got: got, expect: expect, ok: got === expect }); }
    var p = projection({ target: 10000000, expectedProfit: 2000000, investorSharePct: 40, cycleDays: 60, feeBps: 100 });
    eq('§6.4 fee', p.fee, 120000);
    eq('§6.4 net', p.net, 1880000);
    eq('§6.4 manager', p.manager, 1128000);
    eq('§6.4 pool', p.pool, 752000);
    eq('§6.4 ROI cycle', p.roiCycle, 7.5);
    eq('§6.4 ROI year', p.roiYear, 45.7);
    var br = compute({
      contributions: [{ id: 'a', kind: 'investor', userId: 'a', amount: 1600000 }, { id: 'm', kind: 'manager', userId: 'm', amount: 400000 }],
      cost: 1800000, revenue: 2400000, investorSharePct: 60, feeBps: 100
    });
    eq('§6.4 example gross', br.gross, 600000);
    eq('§6.4 example fee', br.fee, 24000);
    eq('§6.4 example net', br.net, 576000);
    eq('§6.4 example manager', br.manager, 230400);
    eq('§6.4 example pool', br.pool, 345600);
    var sh = compute({
      contributions: [
        { id: 'i', kind: 'investor', userId: 'i', amount: 7000000 },
        { id: 't', kind: 'treasury', userId: null, amount: 3000000 }
      ],
      cost: 9500000, revenue: 11000000, investorSharePct: 60, feeBps: 100
    });
    eq('§11.4 gross', sh.gross, 1500000);
    eq('§11.4 fee', sh.fee, 110000);
    eq('§11.4 net', sh.net, 1390000);
    eq('§11.4 manager', sh.manager, 556000);
    eq('§11.4 pool', sh.pool, 834000);
    eq('§11.4 investors', sh.lines[0].profit, 583800);
    eq('§11.4 treasury', sh.lines[1].profit, 250200);
    var split = shareholderSplit(250200, 75, 'layla', 'omar');
    eq('§11.4 shareholder', split.shareholder, 187650);
    eq('§11.4 reserve', split.reserve, 62550);
    eq('§11.4 two-way sum', split.lines[0].amount + split.lines[1].amount, 187650);
    var odd = shareholderSplit(101, 100, 'buyer', 'manager');
    eq('§11.4 odd cent to buyer', odd.lines[0].amount, 51);
    eq('§11.4 odd cent pair', odd.lines[1].amount, 50);
    eq('IBAN GB82', ibanCheck('GB82WEST12345698765432'), true);
    eq('IBAN bad', ibanCheck('GB82WEST12345698765433'), false);
    var loss = compute({
      contributions: [{ id: 'a', kind: 'investor', userId: 'a', amount: 800000 }, { id: 'm', kind: 'manager', userId: 'm', amount: 200000 }],
      cost: 1000000, revenue: 700000, investorSharePct: 60, feeBps: 100
    });
    eq('loss fee', loss.fee, 0);
    eq('loss manager share', loss.manager, 0);
    eq('loss pool', loss.pool, -300000);
    return { ok: rows.every(function (r) { return r.ok; }), rows: rows };
  }

  function denial(s, u, action, entity) {
    if (!u) return 'Sign in first';
    if (action === 'invest' || action === 'withdraw') {
      var g = u.role === 'investor' ? gateInvestor(s, u) : (u.role === 'manager' ? gateManager(s, u) : 'Staff accounts cannot invest or withdraw');
      if (action === 'invest' && u.role !== 'investor') g = u.role === 'staff' ? 'Staff accounts cannot invest or withdraw' : g;
      return g;
    }
    if (action === 'decide' && entity) {
      if (entity.proposerId && entity.proposerId === u.id) return 'Needs another staff member to approve';
      return decideMsg(u, entity);
    }
    if (action === 'largeWithdrawal' && u.staffRole !== 'owner') return 'USD 10,000 or more can only be approved by the owner';
    return can(u, action) ? '' : 'Your role cannot do this';
  }

  // Who may open a listing (§6.5): a draft is private to its manager, a manager sees only their own,
  // an investor sees live listings and any listing they invested in, and staff see everything submitted.
  function canView(s, u, l) {
    if (!u || !l) return false;
    if (u.role === 'staff') return l.status !== 'draft';
    if (u.role === 'manager') return l.managerId === u.id;
    if (u.role === 'investor') {
      if (l.status === 'live') return true;
      return (l.contributions || []).some(function (c) { return c.userId === u.id; });
    }
    return false;
  }

  g.Logic = {
    canView: canView,
    STAGES: STAGES, CATEGORIES: CATEGORIES, COUNTRIES: COUNTRIES, COUNTRY: COUNTRY, DAY: DAY,
    blank: blank, apply: apply, selfCheck: selfCheck, verify: verify, balance: balance,
    figures: figures, derive: derive, compute: compute, projection: projection,
    template: template, can: can, denial: denial, countryCode: countryCode,
    passwordMsg: passwordMsg, emailMsg: emailMsg, phoneMsg: phoneMsg, dobMsg: dobMsg,
    bankMsg: bankMsg, listingMsg: listingMsg, remainderMsg: remainderMsg, ibanCheck: ibanCheck,
    walletOf: walletOf, heldOf: heldOf, escrowOf: escrowOf, exposureUsed: exposureUsed, exposureLimit: exposureLimit,
    blocked: blocked
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

if (typeof process !== 'undefined' && process.argv && process.argv[1] && /logic\.js$/.test(String(process.argv[1]).replace(/\\/g, '/'))) {
  var result = Logic.selfCheck();
  result.rows.forEach(function (r) { if (!r.ok) console.log('FAIL', r.name, 'got', r.got, 'expect', r.expect); });
  console.log(result.ok ? 'self-check ok ' + result.rows.length : 'self-check failed');
  process.exit(result.ok ? 0 : 1);
}
