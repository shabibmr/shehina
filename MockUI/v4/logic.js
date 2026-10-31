/* Shehnat prototype domain. No DOM. Amounts are integer cents. */
(function (root) {
  "use strict";

  var DAY = 86400000;
  var TAGS = ["Goods purchased", "Loaded at port", "At sea", "Customs cleared", "Goods sold"];
  var STAGES = ["Funding open", "Goods purchased", "Loaded at port", "At sea", "Customs cleared", "Goods sold", "Profit paid out"];
  var BLOCKED = ["CU", "IR", "KP", "SY"];
  var NEGATIVE_OK = /^bank:/;

  function usdToCents(input) {
    var s = String(input == null ? "" : input).trim().replace(/[$,\s]/g, "");
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return { ok: false, error: "Error: enter a dollar amount with at most 2 decimals." };
    var parts = s.split(".");
    var cents = Number(parts[0]) * 100 + Number((parts[1] || "") .padEnd(2, "0").slice(0, 2));
    if (!Number.isSafeInteger(cents)) return { ok: false, error: "Error: that amount is too large." };
    return { ok: true, cents: cents };
  }

  function formatUsd(cents) {
    var n = Math.abs(cents | 0);
    var body = Math.floor(n / 100).toLocaleString("en-US") + "." + String(n % 100).padStart(2, "0");
    return (cents < 0 ? "\u2212" : "") + "$" + body;
  }

  function allocate(total, weights) {
    var sum = 0;
    var i;
    for (i = 0; i < weights.length; i++) sum += weights[i];
    if (!weights.length || sum === 0 || total === 0) return weights.map(function () { return 0; });
    var sign = total < 0 ? -1 : 1;
    var abs = Math.abs(total);
    var exact = weights.map(function (w) { return abs * w / sum; });
    var base = exact.map(function (x) { return Math.floor(x); });
    var used = 0;
    for (i = 0; i < base.length; i++) used += base[i];
    var rem = abs - used;
    var order = exact.map(function (x, idx) { return { idx: idx, frac: x - Math.floor(x) }; });
    order.sort(function (a, b) { return b.frac - a.frac || a.idx - b.idx; });
    for (i = 0; i < rem; i++) base[order[i].idx] += 1;
    return base.map(function (n) { return n * sign; });
  }

  function fundingTarget(listing) {
    var t = 0;
    (listing.shipments || []).forEach(function (sh) {
      t += sh.goods || 0;
      (sh.steps || []).forEach(function (st) { t += st.cost || 0; });
    });
    return t;
  }

  function cycleDays(listing) {
    var max = 0;
    (listing.shipments || []).forEach(function (sh) {
      var d = sh.startDay || 0;
      (sh.steps || []).forEach(function (st) { d += st.days || 0; });
      if (d > max) max = d;
    });
    return max;
  }

  function raised(listing) {
    return (listing.contributions || []).reduce(function (s, c) { return s + c.amount; }, 0);
  }

  function remaining(listing) {
    return fundingTarget(listing) - raised(listing);
  }

  function stepDone(step) {
    if (step.state === "skipped") return true;
    if (step.verify) return step.state === "verified";
    return step.state === "done" || step.state === "verified";
  }

  function tagRank(tag) {
    var i = TAGS.indexOf(tag);
    return i;
  }

  function shipmentStage(listing, shipment) {
    if (listing.status === "completed") return 6;
    if (listing.status !== "live" && listing.status !== "settlement_proposed") return 0;
    if (raised(listing) < fundingTarget(listing)) return 0;
    var reached = 0;
    var s;
    for (s = 1; s <= 5; s++) {
      var relevant = (shipment.steps || []).filter(function (st) {
        var r = tagRank(st.tag);
        return r !== -1 && r < s;
      });
      if (!relevant.length || !relevant.every(stepDone)) break;
      reached = s;
    }
    if (shipment.writtenOff) return Math.max(reached, 5);
    return Math.max(reached, shipment.stageFloor || 0);
  }

  function listingStage(listing) {
    if (listing.status === "completed") return 6;
    if (!listing.shipments || !listing.shipments.length) return 0;
    return Math.min.apply(null, listing.shipments.map(function (sh) { return shipmentStage(listing, sh); }));
  }

  function stepDue(listing, shipment, index) {
    if (!listing.liveAt || raised(listing) < fundingTarget(listing)) return null;
    var day = shipment.startDay || 0;
    var i;
    for (i = 0; i <= index; i++) day += shipment.steps[i].days || 0;
    return listing.liveAt + day * DAY;
  }

  function isLate(listing, shipment, index, now) {
    var step = shipment.steps[index];
    if (stepDone(step)) return false;
    var due = stepDue(listing, shipment, index);
    return due != null && due < now;
  }

  function overdue(listing, now, days) {
    return listing.status === "live" && listingStage(listing) === 0 && listing.liveAt && (now - listing.liveAt) >= days * DAY;
  }

  var CATEGORIES = ["Food", "Building", "Textiles", "Energy", "Other"];
  var OPEN_LISTING = ["in_review", "awaiting_terms", "approved", "live", "settlement_proposed"];

  function defaultSteps(prefix) {
    var base = [
      ["Ordering", null, 2, 0, false, "manager"],
      ["Advances", null, 2, 0, true, "staff"],
      ["Purchase", "Goods purchased", 4, 0, false, "manager"],
      ["Payments", null, 2, 0, true, "staff"],
      ["Transportation", "Loaded at port", 5, 0, false, "staff"],
      ["Sea transit", "At sea", 10, 0, false, "staff"],
      ["Clearance", "Customs cleared", 3, 0, true, "staff"],
      ["Invoicing", "Goods sold", 2, 0, true, "staff"]
    ];
    return base.map(function (s, i) {
      return {
        id: prefix + "-" + i, name: s[0], tag: s[1], days: s[2], cost: s[3], verify: s[4], owner: s[5],
        party: "", state: "todo", docs: [], revisedAt: null
      };
    });
  }

  function exposureUsed(state, managerId, exceptId) {
    return state.listings.reduce(function (sum, row) {
      if (row.managerId !== managerId || row.id === exceptId) return sum;
      if (OPEN_LISTING.indexOf(row.status) === -1) return sum;
      return sum + fundingTarget(row);
    }, 0);
  }

  function listingError(state, listing) {
    var name = String(listing.name || "").trim();
    if (name.length < 1 || name.length > 120) return "Error: enter a name of 1 to 120 characters.";
    if (CATEGORIES.indexOf(listing.category) === -1) return "Error: choose a category.";
    if (!/^[A-Z]{2}$/.test(listing.source || "") || !/^[A-Z]{2}$/.test(listing.buyer || "")) return "Error: choose the source country and the buyer country.";
    if (listing.source === listing.buyer) return "Error: the source country and the buyer country must differ.";
    if (blocked(listing.source, state.settings.blocked) || blocked(listing.buyer, state.settings.blocked)) return "Error: this country is not available for a listing.";
    if (!listing.shipments || !listing.shipments.length) return "Error: add at least one shipment.";
    var tags = {};
    var i;
    for (i = 0; i < listing.shipments.length; i++) {
      var sh = listing.shipments[i];
      if (!(sh.goods > 0) || !(sh.saleExpected > 0)) return "Error: each shipment needs an expected cost and an expected sale price.";
      if (!Number.isInteger(sh.startDay) || sh.startDay < 0) return "Error: planned start is a whole number of days from the funding date.";
      (sh.steps || []).forEach(function (st) { if (st.tag) tags[st.tag] = true; });
    }
    var stage;
    for (stage = 0; stage < TAGS.length; stage++) {
      if (!tags[TAGS[stage]]) return "Error: every stage from Goods purchased to Goods sold needs a tagged step.";
    }
    var target = fundingTarget(listing);
    var cycle = cycleDays(listing);
    if (target < 100000 || target > 1000000000) return "Error: the funding target must be between $1,000.00 and $10,000,000.00.";
    if (cycle < 1 || cycle > 365) return "Error: the cycle must be between 1 and 365 days.";
    if (listing.companyPct < 20 || listing.companyPct > 90) return "Error: manager capital must be between 20% and 90%.";
    if (listing.investorShare < 40 || listing.investorShare > 95) return "Error: investor share must be between 40% and 95%.";
    if (listing.minimum < 100 || listing.minimum > target) return "Error: the minimum investment must be between $1.00 and the funding target.";
    var manager = (state.users || []).filter(function (u) { return u.id === listing.managerId; })[0];
    var limit = manager && manager.exposureLimit ? manager.exposureLimit : state.settings.exposureDefault;
    if (exposureUsed(state, listing.managerId, listing.id) + target > limit) return "Error: this listing would pass the exposure limit of " + formatUsd(limit) + ".";
    return "";
  }

  /* Settlement. contributions: { id, kind, amount, shareholderRole } */
  function splitEqual(total, holders, buyerId) {
    var n = holders.length;
    var low = Math.floor(total / n);
    var rem = total - low * n;
    return holders.map(function (id) {
      if (rem && id === buyerId) { rem -= 1; return low + 1; }
      return low;
    });
  }

  function settlement(input) {
    var sale = input.saleCents | 0;
    var costs = input.costCents | 0;
    var share = input.investorSharePct | 0;
    var gross = sale - costs;
    var fee = 0;
    if (gross > 0) fee = Math.min(Math.round(sale * 0.01), gross);
    var net = gross - fee;
    var managerCut = net > 0 ? Math.floor(net * (100 - share) / 100) : 0;
    var pool = net - managerCut;
    var weights = input.contributions.map(function (c) { return c.amount; });
    var slices = allocate(pool, weights);
    var rows = input.contributions.map(function (c, i) {
      return {
        id: c.id,
        kind: c.kind,
        userId: c.userId,
        capital: c.amount,
        profit: slices[i],
        payout: c.amount + slices[i]
      };
    });
    var treasuryProfit = 0;
    rows.forEach(function (r) { if (r.kind === "treasury") treasuryProfit += r.profit; });
    var shareholder = 0;
    var reserve = 0;
    var each = [];
    if (input.shareholderListing && treasuryProfit > 0) {
      var pct = input.shareholderSharePct == null ? 75 : input.shareholderSharePct;
      shareholder = Math.floor(treasuryProfit * pct / 100);
      reserve = treasuryProfit - shareholder;
      var holders = input.holders || [];
      if (holders.length) {
        var parts = splitEqual(shareholder, holders, input.buyerShareholderId);
        each = holders.map(function (id, i) { return { userId: id, amount: parts[i] }; });
      }
    }
    return {
      sale: sale, costs: costs, gross: gross, fee: fee, net: net,
      managerCut: managerCut, pool: pool, rows: rows,
      treasuryProfit: treasuryProfit, shareholder: shareholder, reserve: reserve, holders: each
    };
  }

  function projection(listing) {
    var target = fundingTarget(listing);
    var expectedSale = (listing.shipments || []).reduce(function (s, sh) { return s + (sh.saleExpected || 0); }, 0);
    var expectedProfit = expectedSale - target;
    var settled = settlement({
      saleCents: expectedSale,
      costCents: target,
      investorSharePct: listing.investorShare,
      contributions: [{ id: "all", kind: "investor", amount: target }],
      shareholderListing: false
    });
    var cycle = cycleDays(listing) || 1;
    var roi = target ? settled.pool / target : 0;
    return {
      target: target,
      expectedSale: expectedSale,
      expectedProfit: expectedProfit,
      fee: settled.fee,
      net: settled.net,
      managerCut: settled.managerCut,
      pool: settled.pool,
      roiCycle: roi,
      roiYear: roi * 365 / cycle,
      cycle: cycle
    };
  }

  function expectedFor(listing, amount) {
    var p = projection(listing);
    if (!p.target) return 0;
    return Math.round(p.pool * amount / p.target);
  }

  function investBounds(minimum, left) {
    if (left <= 0) return { ok: false, error: "This shipment is fully funded." };
    if (left < minimum) return { ok: true, exact: left, min: left, max: left };
    return { ok: true, exact: null, min: minimum, max: left };
  }

  function emailOk(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
  }

  function passwordOk(v) {
    var s = String(v || "");
    if (s.length < 10) return "Error: use at least 10 characters.";
    if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) return "Error: use at least one letter and one digit.";
    return "";
  }

  function ageOk(dob, now) {
    if (!dob) return "Error: enter a date of birth.";
    var born = Date.parse(dob + "T00:00:00Z");
    if (Number.isNaN(born)) return "Error: enter a real date of birth.";
    var adult = new Date(now);
    adult.setUTCFullYear(adult.getUTCFullYear() - 18);
    if (born > adult.getTime()) return "Error: you must be 18 or older.";
    return "";
  }

  function phoneOk(v) {
    var d = String(v || "").replace(/[^\d]/g, "");
    if (d.length < 8 || d.length > 15) return "Error: enter a phone number with the country code.";
    return "";
  }

  function ibanOk(raw, country) {
    var s = String(raw || "").replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s) || s.length < 15 || s.length > 34) return "Error: this IBAN is not valid.";
    if (country && s.slice(0, 2) !== country) return "Error: the IBAN country does not match the bank country.";
    var moved = s.slice(4) + s.slice(0, 4);
    var num = "";
    var i;
    for (i = 0; i < moved.length; i++) {
      var c = moved.charCodeAt(i);
      num += c >= 65 ? String(c - 55) : moved[i];
    }
    var mod = 0;
    for (i = 0; i < num.length; i++) mod = (mod * 10 + Number(num[i])) % 97;
    if (mod !== 1) return "Error: this IBAN is not valid.";
    return "";
  }

  function swiftOk(raw, country) {
    var s = String(raw || "").replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(s)) return "Error: enter an 8 or 11 character SWIFT code.";
    if (country && s.slice(4, 6) !== country) return "Error: the SWIFT country does not match the bank country.";
    return "";
  }

  function blocked(code, list) {
    return (list || BLOCKED).indexOf(code) !== -1;
  }

  function canDecide(actor, assigneeId) {
    if (!actor || !actor.active) return "This account is deactivated.";
    if (actor.suspended) return "This account is suspended.";
    if (actor.role !== "owner" && actor.role !== "reviewer") return "Only a reviewer or the owner can decide this.";
    if (assigneeId && actor.role !== "owner" && actor.id !== assigneeId) return "Needs the assigned reviewer, or an owner.";
    return "";
  }

  function can(actor, action) {
    if (!actor || !actor.active) return "This account is deactivated.";
    if (actor.role === "owner") {
      if (action === "invest" || action === "withdraw") return "Staff cannot invest or withdraw.";
      return "";
    }
    var map = {
      reviewer: ["review", "assign", "buyer-shareholder"],
      ops: ["steps", "costs", "propose-settlement", "propose-resale", "cancel", "overdue-fill"],
      finance: ["withdraw-small", "settlement-approve", "waiver", "treasury", "overrun"],
      investor: ["invest", "withdraw", "topup"],
      manager: ["list", "deposit", "withdraw", "topup"]
    };
    if (action === "invest" || action === "withdraw" || action === "topup") {
      if (actor.role === "reviewer" || actor.role === "ops" || actor.role === "finance") return "Staff cannot invest or withdraw.";
    }
    if (action === "withdraw-large") return actor.role === "owner" ? "" : "Needs the owner to approve.";
    var allowed = map[actor.role] || [];
    if (allowed.indexOf(action) === -1) return "You cannot do that.";
    return "";
  }

  function fourEyes(actorId, proposerId) {
    if (actorId && actorId === proposerId) return "Needs another staff member to approve.";
    return "";
  }

  function ledgerOps(state) {
    function bal(account) {
      var s = 0;
      state.entries.forEach(function (e) { if (e.account === account) s += e.amount; });
      return s;
    }
    function post(lines, key) {
      if (key && state.entries.some(function (e) { return e.key === key; })) return { ok: true, duplicate: true };
      var sum = 0;
      lines.forEach(function (l) { sum += l.amount; });
      if (sum !== 0) return { ok: false, error: "Ledger does not balance." };
      var projected = {};
      var i;
      for (i = 0; i < lines.length; i++) {
        var l = lines[i];
        var next = (projected[l.account] != null ? projected[l.account] : bal(l.account)) + l.amount;
        projected[l.account] = next;
        if (next < 0 && !NEGATIVE_OK.test(l.account)) return { ok: false, error: "Insufficient funds." };
      }
      state.txn = (state.txn || 0) + 1;
      lines.forEach(function (line) {
        state.entries.push({ txn: state.txn, key: key || "", account: line.account, amount: line.amount, memo: line.memo || "" });
      });
      return { ok: true };
    }
    return { bal: bal, post: post };
  }

  function verify(entries) {
    var tx = {};
    var bals = {};
    entries.forEach(function (e) {
      tx[e.txn] = (tx[e.txn] || 0) + e.amount;
      bals[e.account] = (bals[e.account] || 0) + e.amount;
    });
    var id;
    for (id in tx) if (tx[id] !== 0) return { ok: false, diff: tx[id], txn: id };
    for (id in bals) if (bals[id] < 0 && !NEGATIVE_OK.test(id)) return { ok: false, diff: bals[id], account: id };
    return { ok: true, balances: bals };
  }

  function selfCheck() {
    var errors = [];
    function eq(name, got, want) {
      if (got !== want) errors.push(name + ": " + got + " !== " + want);
    }
    var p = projection({
      investorShare: 40,
      shipments: [{ goods: 10000000, saleExpected: 12000000, startDay: 0, steps: [{ days: 60, cost: 0 }] }]
    });
    eq("fee", p.fee, 120000);
    eq("net", p.net, 1880000);
    eq("manager", p.managerCut, 1128000);
    eq("pool", p.pool, 752000);
    eq("roi", Math.round(p.roiCycle * 1000) / 10, 7.5);
    eq("roiYear", Math.round(p.roiYear * 1000) / 10, 45.7);

    var br = settlement({
      saleCents: 2400000, costCents: 1800000, investorSharePct: 60,
      contributions: [
        { id: "a", kind: "investor", amount: 1600000 },
        { id: "m", kind: "manager", amount: 400000 }
      ]
    });
    eq("br gross", br.gross, 600000);
    eq("br fee", br.fee, 24000);
    eq("br net", br.net, 576000);
    eq("br manager", br.managerCut, 230400);
    eq("br pool", br.pool, 345600);
    eq("br aisha", br.rows[0].profit, 276480);

    var sh = settlement({
      saleCents: 11000000, costCents: 9500000, investorSharePct: 60,
      shareholderListing: true, shareholderSharePct: 75, buyerShareholderId: "layla",
      holders: ["omar", "layla"],
      contributions: [
        { id: "inv", kind: "investor", amount: 7000000 },
        { id: "tr", kind: "treasury", amount: 3000000 }
      ]
    });
    eq("sh pool", sh.pool, 834000);
    eq("sh treasury profit", sh.treasuryProfit, 250200);
    eq("sh shareholder", sh.shareholder, 187650);
    eq("sh reserve", sh.reserve, 62550);
    eq("sh buyer odd", sh.holders.filter(function (h) { return h.userId === "layla"; })[0] ? "even" : "missing", "even");

    eq("odd buyer", splitEqual(187651, ["omar", "layla"], "layla")[1], 93826);
    eq("odd other", splitEqual(187651, ["omar", "layla"], "layla")[0], 93825);

    eq("iban", ibanOk("GB82WEST12345698765432", "GB"), "");
    eq("iban bad", ibanOk("GB82WEST12345698765433", "GB") ? "no" : "yes", "no");
    var cap = settlement({ saleCents: 10000, costCents: 9990, investorSharePct: 50, contributions: [{ id: "a", kind: "investor", amount: 10000 }] });
    eq("fee cap", cap.fee, 10);
    var bounds = investBounds(100000, 30000);
    eq("exact", bounds.exact, 30000);
    if (errors.length) return { ok: false, errors: errors };
    return { ok: true };
  }

  var api = {
    DAY: DAY, TAGS: TAGS, STAGES: STAGES, BLOCKED: BLOCKED,
    usdToCents: usdToCents, formatUsd: formatUsd, allocate: allocate,
    fundingTarget: fundingTarget, cycleDays: cycleDays, raised: raised, remaining: remaining,
    shipmentStage: shipmentStage, listingStage: listingStage, stepDue: stepDue, isLate: isLate, overdue: overdue,
    settlement: settlement, projection: projection, expectedFor: expectedFor, investBounds: investBounds,
    CATEGORIES: CATEGORIES, defaultSteps: defaultSteps, exposureUsed: exposureUsed, listingError: listingError,
    emailOk: emailOk, passwordOk: passwordOk, ageOk: ageOk, phoneOk: phoneOk, ibanOk: ibanOk, swiftOk: swiftOk,
    blocked: blocked, can: can, canDecide: canDecide, fourEyes: fourEyes,
    ledgerOps: ledgerOps, verify: verify, selfCheck: selfCheck
  };

  var report = selfCheck();
  api.selfCheckReport = report;
  if (!report.ok && root.console) root.console.error("Shehnat self-check", report.errors);
  if (typeof process !== "undefined" && !report.ok) process.exitCode = 1;
  root.ShehnatLogic = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
