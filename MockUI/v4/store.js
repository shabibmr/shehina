/* One shared world in localStorage. Personas are accounts, reached by sign-in. */
(function (root) {
  "use strict";
  var KEY = "shehnat-proto-grok";
  var L, state, led;

  function boot() {
    L = root.ShehnatLogic;
    try {
      var raw = root.localStorage && root.localStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : root.ShehnatSeed.build(L);
    } catch (err) {
      state = root.ShehnatSeed.build(L);
    }
    led = L.ledgerOps(state);
    var check = L.verify(state.entries);
    if (!check.ok && root.console) root.console.error("Ledger check failed", check);
    save();
  }

  /* Tell the manager, ops and the investors once when a step passes its due date. There is no
     clock job in the mock, so this runs on every save, including the one at boot. */
  function scanLate() {
    if (!state || !L) return;
    state.listings.forEach(function (row) {
      if (row.status !== "live") return;
      (row.shipments || []).forEach(function (sh) {
        (sh.steps || []).forEach(function (st, i) {
          if (!L.isLate(row, sh, i, state.now)) return;
          var due = L.stepDue(row, sh, i);
          if (st.lateNoted === due) return;
          st.lateNoted = due;
          var text = st.name + " for " + row.name + " is late. It was due " + dateText(due) + ".";
          var people = {};
          if (row.managerId) people[row.managerId] = text + (st.owner === "manager" ? " Please send it to staff." : " Staff are handling it.");
          state.users.forEach(function (u) { if (u.role === "ops") people[u.id] = text + " Set a new date or move the step."; });
          (row.contributions || []).forEach(function (c) {
            if (c.kind === "investor" && !people[c.userId]) people[c.userId] = text + " Your money stays safe in escrow.";
          });
          stakeholders(row).forEach(function (id) { if (!people[id]) people[id] = text + " You are told because you are a stakeholder in this listing."; });
          Object.keys(people).forEach(function (id) { note(id, people[id]); });
          row.history.push({ at: state.now, actorId: "system", action: "Step late", reason: st.name });
        });
      });
    });
  }

  /* People with a stake who are not the manager, ops or an investor: the owner and the buyer shareholder. */
  function stakeholders(row) {
    var ids = state.users.filter(function (u) { return u.role === "owner"; }).map(function (u) { return u.id; });
    if (row.buyerShareholderId && ids.indexOf(row.buyerShareholderId) === -1) ids.push(row.buyerShareholderId);
    return ids;
  }

  function dateText(ms) {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(ms);
  }

  function save() {
    scanLate();
    if (root.localStorage) root.localStorage.setItem(KEY, JSON.stringify(state));
  }

  function user() {
    return state.users.filter(function (u) { return u.id === state.sessionUserId; })[0] || null;
  }

  function byId(id) {
    return state.users.filter(function (u) { return u.id === id; })[0] || null;
  }

  function listing(id) {
    return state.listings.filter(function (row) { return row.id === id; })[0] || null;
  }

  function wallet(id) { return "user:" + id + ":wallet"; }

  function audit(actorId, action, entity, reason) {
    state.audit.unshift({ id: "au" + state.now + "-" + state.audit.length, at: state.now, actorId: actorId, action: action, entity: entity, reason: reason || "" });
  }

  function note(userId, text) {
    state.notes.unshift({ id: "nt" + state.notes.length + "-" + state.now, userId: userId, at: state.now, text: text, read: false });
  }

  function signIn(email, password) {
    var u = state.users.filter(function (row) { return row.email === String(email || "").trim().toLowerCase(); })[0];
    if (!u || u.password !== password) {
      if (u) {
        u.failed += 1;
        if (u.failed >= 5) u.lockedUntil = state.now + 15 * 60 * 1000;
        save();
        if (u.lockedUntil > state.now) return { ok: false, error: "Error: this account is locked for 15 minutes." };
        return { ok: false, error: "Error: wrong email or password. " + (5 - u.failed) + " attempts left." };
      }
      return { ok: false, error: "Error: wrong email or password." };
    }
    if (!u.active) return { ok: false, error: "Error: this account is deactivated." };
    if (u.lockedUntil > state.now) return { ok: false, error: "Error: this account is locked for 15 minutes." };
    u.failed = 0;
    state.sessionUserId = u.id;
    audit(u.id, "Signed in", u.id, "");
    save();
    return { ok: true };
  }

  function signOut() {
    if (state.sessionUserId) audit(state.sessionUserId, "Signed out", state.sessionUserId, "");
    state.sessionUserId = null;
    save();
  }

  function signUp(fields) {
    var email = String(fields.email || "").trim().toLowerCase();
    var errors = {};
    if (!L.emailOk(email)) errors.email = "Error: enter a valid email.";
    if (state.users.some(function (u) { return u.email === email; })) errors.email = "Error: an account with this email already exists.";
    if (!fields.name || fields.name.trim().length < 1 || fields.name.trim().length > 120) errors.name = "Error: enter your name.";
    var pw = L.passwordOk(fields.password);
    if (pw) errors.password = pw;
    if (fields.role !== "investor" && fields.role !== "manager") errors.role = "Error: choose invest or manage shipments.";
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    var id = "u" + (state.users.length + 1);
    state.users.push({
      id: id, email: email, name: fields.name.trim(), role: fields.role, password: fields.password,
      active: true, country: "", kind: fields.role === "manager" ? (fields.kind || "business") : "",
      shareholder: false, suspended: false, exposureLimit: null, failed: 0, lockedUntil: 0,
      application: { type: fields.role === "manager" ? "company" : "kyc", status: "none", assigneeId: "", reason: "", history: [], payload: {} }
    });
    state.sessionUserId = id;
    audit(id, "Created account", id, "");
    save();
    return { ok: true };
  }

  function saveApplication(payload) {
    var u = user();
    if (!u) return { ok: false, error: "Sign in first." };
    u.application.payload = payload;
    if (payload.residence) u.country = payload.residence;
    save();
    return { ok: true };
  }

  function submitApplication(payload) {
    var u = user();
    if (!u) return { ok: false, error: "Sign in first." };
    var errors = {};
    if (L.blocked(payload.residence, state.settings.blocked)) errors.residence = "Error: we cannot accept a residence in that country.";
    var age = L.ageOk(payload.dob, state.now);
    if (age) errors.dob = age;
    var phone = L.phoneOk(payload.phone);
    if (phone) errors.phone = phone;
    if (!payload.idNumber) errors.idNumber = "Error: enter the identity document number.";
    if (!payload.files || payload.files.length < 2) errors.files = "Error: add both documents.";
    if (!payload.declare) errors.declare = "Error: confirm the declaration.";
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    u.country = payload.residence;
    u.application.payload = payload;
    u.application.status = "pending";
    u.application.reason = "";
    u.application.assigneeId = "";
    u.application.history.push({ at: state.now, actorId: u.id, action: "Submitted", reason: "" });
    audit(u.id, "Submitted verification", u.id, "");
    note(u.id, "Your verification was submitted.");
    save();
    return { ok: true };
  }

  function assign(targetId, assigneeId) {
    var actor = user();
    if (!actor || (actor.role !== "owner" && actor.role !== "reviewer")) return { ok: false, error: "Only a reviewer or the owner can assign this." };
    var target = byId(targetId) || listing(targetId);
    if (!target) return { ok: false, error: "That record was not found." };
    if (target.application) target.application.assigneeId = assigneeId || "";
    else target.assigneeId = assigneeId || "";
    audit(actor.id, assigneeId ? "Assigned" : "Cleared assignment", targetId, "");
    save();
    return { ok: true };
  }

  function decide(targetId, approve, reason) {
    var actor = user();
    var target = byId(targetId);
    if (!target) return { ok: false, error: "That application was not found." };
    var denied = L.canDecide(actor, target.application.assigneeId);
    if (denied) return { ok: false, error: denied };
    if (target.application.status !== "pending") return { ok: false, error: "This application is not waiting for a decision." };
    if (!approve && !String(reason || "").trim()) return { ok: false, error: "Error: a rejection needs a reason." };
    if (approve && L.blocked(target.country, state.settings.blocked)) return { ok: false, error: "Error: their country of residence is not accepted." };
    target.application.status = approve ? "approved" : "rejected";
    target.application.reason = approve ? "" : String(reason).trim();
    target.application.history.push({ at: state.now, actorId: actor.id, action: approve ? "Approved" : "Rejected", reason: target.application.reason });
    audit(actor.id, approve ? "Approved verification" : "Rejected verification", targetId, target.application.reason);
    note(target.id, approve ? "Your verification was approved." : "Your verification was rejected. " + target.application.reason);
    save();
    return { ok: true };
  }

  function invest(listingId, raw) {
    var u = user();
    var row = listing(listingId);
    if (!u || !row) return { ok: false, error: "That shipment was not found." };
    var staff = L.can(u, "invest");
    if (staff) return { ok: false, error: staff };
    if (u.application.status !== "approved") return { ok: false, error: "Finish verification before you invest." };
    if (u.suspended) return { ok: false, error: "This account is suspended." };
    if (L.blocked(u.country, state.settings.blocked)) return { ok: false, error: "Investing is not available in your country of residence." };
    if (row.status !== "live" || L.remaining(row) <= 0) return { ok: false, error: "This shipment is not open for investment." };
    var money = L.usdToCents(raw);
    if (!money.ok) return { ok: false, error: money.error };
    var bounds = L.investBounds(row.minimum, L.remaining(row));
    if (!bounds.ok) return { ok: false, error: bounds.error };
    if (money.cents < bounds.min || money.cents > bounds.max) {
      return { ok: false, error: bounds.exact ? "Error: only " + L.formatUsd(bounds.exact) + " is left. Invest exactly that amount." : "Error: invest at least " + L.formatUsd(bounds.min) + " and at most " + L.formatUsd(bounds.max) + "." };
    }
    if (led.bal(wallet(u.id)) < money.cents) return { ok: false, error: "Error: your wallet does not cover this.", topup: true };
    var moved = led.post([
      { account: wallet(u.id), amount: -money.cents, memo: "Investment" },
      { account: "escrow:" + row.id, amount: money.cents, memo: "Investment" }
    ], "invest:" + u.id + ":" + row.id + ":" + state.entries.length);
    if (!moved.ok) return { ok: false, error: moved.error };
    row.contributions.push({ userId: u.id, kind: "investor", amount: money.cents });
    row.history.push({ at: state.now, actorId: u.id, action: "Invested", reason: L.formatUsd(money.cents) });
    audit(u.id, "Invested", row.id, L.formatUsd(money.cents));
    note(u.id, "You invested " + L.formatUsd(money.cents) + " in " + row.name + ".");
    state.lastReceipt = { userId: u.id, listingId: row.id, amount: money.cents, at: state.now };
    save();
    return { ok: true, cents: money.cents };
  }

  function topup(raw, eventId) {
    var u = user();
    if (!u) return { ok: false, error: "Sign in first." };
    if (L.can(u, "topup")) return { ok: false, error: L.can(u, "topup") };
    if (u.application.status !== "approved") return { ok: false, error: "Finish verification before you add money." };
    if (L.blocked(u.country, state.settings.blocked)) return { ok: false, error: "Adding money is not available in your country of residence." };
    var money = L.usdToCents(raw);
    if (!money.ok) return money;
    if (money.cents < 100) return { ok: false, error: "Error: the minimum is $1.00." };
    var moved = led.post([
      { account: "bank:external", amount: -money.cents, memo: "Gateway top-up" },
      { account: wallet(u.id), amount: money.cents, memo: "Gateway top-up" }
    ], "topup:" + eventId);
    if (!moved.ok) return moved;
    if (!moved.duplicate) {
      audit(u.id, "Topped up", u.id, L.formatUsd(money.cents));
      note(u.id, L.formatUsd(money.cents) + " was added to your wallet.");
    }
    save();
    return { ok: true, cents: money.cents, duplicate: !!moved.duplicate };
  }

  function withdraw(fields) {
    var u = user();
    if (!u) return { ok: false, error: "Sign in first." };
    var denied = L.can(u, "withdraw");
    if (denied) return { ok: false, error: denied };
    if (u.application.status !== "approved") return { ok: false, error: "Finish verification before you withdraw." };
    if (u.suspended) return { ok: false, error: "This account is suspended. A payout would be held." };
    var errors = {};
    if (L.blocked(fields.country, state.settings.blocked)) errors.country = "Error: withdrawals to that country are refused.";
    if (!fields.bank) errors.bank = "Error: enter the bank name.";
    if (!fields.holder) errors.holder = "Error: enter the account holder.";
    var acct = String(fields.account || "").replace(/\s+/g, "").toUpperCase();
    if (/^[A-Z]{2}\d{2}/.test(acct)) {
      var iban = L.ibanOk(acct, fields.country);
      if (iban) errors.account = iban;
    } else if (acct.length < 4) errors.account = "Error: enter the account number.";
    var swift = L.swiftOk(fields.swift, fields.country);
    if (swift) errors.swift = swift;
    var money = L.usdToCents(fields.amount);
    if (!money.ok) errors.amount = money.error;
    else if (money.cents < 100) errors.amount = "Error: the minimum is $1.00.";
    else if (led.bal(wallet(u.id)) < money.cents) errors.amount = "Error: your wallet does not cover this.";
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    var id = "w" + state.withdrawals.length;
    var moved = led.post([
      { account: wallet(u.id), amount: -money.cents, memo: "Withdrawal" },
      { account: "withdrawals:hold", amount: money.cents, memo: "Withdrawal" }
    ], "withdraw:" + id);
    if (!moved.ok) return { ok: false, errors: { amount: moved.error } };
    state.withdrawals.unshift({
      id: id, userId: u.id, amount: money.cents, status: "pending", country: fields.country,
      bank: fields.bank, holder: fields.holder, account: acct, swift: String(fields.swift || "").toUpperCase(),
      at: state.now, reason: ""
    });
    audit(u.id, "Requested withdrawal", id, L.formatUsd(money.cents));
    note(u.id, "Withdrawal of " + L.formatUsd(money.cents) + " is held until it is paid.");
    save();
    return { ok: true, id: id };
  }

  function managerGate(u) {
    if (!u || u.role !== "manager") return "Only a manager can do this.";
    if (!u.application || u.application.status !== "approved") return "Finish registration before you list a shipment.";
    if (u.suspended) return "This account is suspended.";
    if (L.blocked(u.country, state.settings.blocked)) return "This country of registration is not available.";
    return "";
  }

  function whole(raw, min, max) {
    if (!/^\d+$/.test(String(raw == null ? "" : raw).trim())) return null;
    var n = Number(raw);
    if (n < min || n > max) return null;
    return n;
  }

  /* A form step may carry a `key`. The saved id is prefix + key, so reordering never renames a saved step. */
  function stepPlan(rawSteps, prefix) {
    if (!rawSteps || !rawSteps.length) return L.defaultSteps(prefix);
    var used = {};
    return rawSteps.map(function (st, n) {
      var cost = L.usdToCents(st.cost === "" || st.cost == null ? "0" : st.cost);
      var days = whole(st.days, 0, 365);
      var key = /^\d+$/.test(String(st.key == null ? "" : st.key)) ? String(st.key) : String(n);
      while (used[key]) key = key + "x";
      used[key] = true;
      return {
        id: prefix + "-" + key,
        name: String(st.name || "").trim().slice(0, 80) || "Step",
        tag: L.TAGS.indexOf(st.tag) === -1 ? null : st.tag,
        days: days == null ? 0 : days,
        cost: cost.ok ? cost.cents : 0,
        verify: !!st.verify,
        owner: st.owner === "manager" ? "manager" : "staff",
        party: String(st.party || "").trim().slice(0, 80),
        state: "todo",
        docs: [],
        revisedAt: null
      };
    });
  }

  function buildListing(raw, existing, managerId) {
    var id = existing ? existing.id : "lst-" + state.listings.length + "-" + String(state.now).slice(-6);
    var shipments = (raw.shipments || []).map(function (sh, i) {
      var goods = L.usdToCents(sh.goods);
      var sale = L.usdToCents(sh.sale);
      var start = whole(sh.start || "0", 0, 365);
      var shipId = (existing && existing.shipments[i] && existing.shipments[i].id) || id + "-s" + i;
      var prefix = shipId;
      return {
        id: shipId,
        goods: goods.ok ? goods.cents : 0,
        saleExpected: sale.ok ? sale.cents : 0,
        startDay: start == null ? -1 : start,
        proceeds: null, costActual: null, writtenOff: false,
        steps: stepPlan(raw.steps, prefix)
      };
    });
    return {
      id: id,
      name: String(raw.name || "").trim(),
      managerId: managerId,
      category: raw.category || "",
      source: String(raw.source || "").toUpperCase(),
      buyer: String(raw.buyer || "").toUpperCase(),
      status: existing ? existing.status : "draft",
      investorShare: whole(raw.investorShare, 40, 95),
      companyPct: whole(raw.companyPct, 20, 90),
      /* the minimum ticket is a platform setting; a smaller listing can never need more than its target */
      minimum: (function () {
        var target = L.fundingTarget({ shipments: shipments });
        var floor = Number(state.settings.minTicket) || 100000;
        return target > 0 ? Math.min(floor, target) : floor;
      })(),
      shipments: shipments,
      contributions: existing ? existing.contributions : [],
      waiver: existing ? !!existing.waiver : false,
      shareholderListing: existing ? !!existing.shareholderListing : false,
      buyerShareholderId: existing ? existing.buyerShareholderId : "",
      shareholderSharePct: existing ? existing.shareholderSharePct : 75,
      approvedAt: existing ? existing.approvedAt : 0,
      liveAt: existing ? existing.liveAt : 0,
      assigneeId: existing ? existing.assigneeId : "",
      history: existing ? existing.history : [],
      revised: existing ? existing.revised : null,
      settlement: existing ? existing.settlement : null,
      certificate: String(raw.certificate || "").trim().slice(0, 80)
    };
  }

  function writeListing(raw, auditDraft) {
    var u = user();
    var gate = managerGate(u);
    if (gate) return { ok: false, error: gate };
    if (!String(raw.name || "").trim()) return { ok: false, error: "Error: enter a name of 1 to 120 characters." };
    var existing = raw.id ? listing(raw.id) : null;
    if (raw.id && (!existing || existing.managerId !== u.id)) return { ok: false, error: "That listing was not found." };
    if (existing && existing.status !== "draft" && existing.status !== "rejected") return { ok: false, error: "Error: this listing cannot be edited." };
    var row = buildListing(raw, existing, u.id);
    if (existing) {
      Object.keys(row).forEach(function (k) { existing[k] = row[k]; });
    } else state.listings.push(row);
    if (auditDraft) audit(u.id, "Saved listing draft", row.id, row.name);
    save();
    return { ok: true, id: row.id };
  }

  function saveListing(raw) {
    return writeListing(raw, true);
  }

  function submitListing(raw) {
    var saved = writeListing(raw, false);
    if (!saved.ok) return saved;
    var u = user();
    var row = listing(saved.id);
    var message = L.listingError(state, row);
    if (message) return { ok: false, error: message, id: row.id };
    row.status = "in_review";
    row.assigneeId = "";
    row.history.push({ at: state.now, actorId: u.id, action: "Submitted", reason: "" });
    audit(u.id, "Submitted listing", row.id, row.name);
    note(u.id, row.name + " was sent for review.");
    save();
    return { ok: true, id: row.id };
  }

  /* ---- Manager track ---- */

  function submitManagerApplication(payload) {
    var u = user();
    if (!u || u.role !== "manager") return { ok: false, errors: { form: "Error: only a manager can register here." } };
    if (u.application.status === "pending" || u.application.status === "approved") {
      return { ok: false, errors: { form: "Error: this registration is already " + u.application.status + "." } };
    }
    var p = payload || {};
    var errors = {};
    var files = p.files || [];
    var business = p.kind === "business";
    if (!business && p.kind !== "individual") errors.kind = "Error: choose a business or an individual.";
    if (!String(p.legalName || "").trim()) errors.legalName = "Error: enter the legal name.";
    if (business) {
      if (!p.regCountry) errors.regCountry = "Error: choose the country of registration.";
      else if (L.blocked(p.regCountry, state.settings.blocked)) errors.residence = "Error: we cannot accept a residence in that country.";
      if (!String(p.regNumber || "").trim()) errors.regNumber = "Error: enter the registration number.";
      if (!String(p.signatory || "").trim()) errors.signatory = "Error: enter the authorised signatory.";
      if (files.length < 3) errors.files = "Error: add all 3 documents.";
    } else if (p.kind === "individual") {
      if (!p.residence) errors.residence = "Error: choose a country of residence.";
      else if (L.blocked(p.residence, state.settings.blocked)) errors.residence = "Error: we cannot accept a residence in that country.";
      var age = L.ageOk(p.dob, state.now);
      if (age) errors.dob = age;
      var phone = L.phoneOk(p.phone);
      if (phone) errors.phone = phone;
      if (!String(p.idNumber || "").trim()) errors.idNumber = "Error: enter the identity document number.";
      if (files.length < 2) errors.files = "Error: add both documents.";
    }
    if (!p.declare) errors.declare = "Error: confirm the declaration.";
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    u.kind = p.kind;
    u.country = business ? p.regCountry : p.residence;
    u.application.payload = {
      kind: p.kind, legalName: String(p.legalName).trim(), regCountry: p.regCountry || "", regNumber: String(p.regNumber || "").trim(),
      signatory: String(p.signatory || "").trim(), dob: p.dob || "", phone: p.phone || "", residence: p.residence || "",
      idType: p.idType || "", idNumber: String(p.idNumber || "").trim(),
      files: files.map(function (f) { return { name: f.name, type: f.type, size: f.size }; }), declare: true
    };
    u.application.status = "pending";
    u.application.reason = "";
    u.application.assigneeId = "";
    u.application.history.push({ at: state.now, actorId: u.id, action: "Submitted", reason: "" });
    audit(u.id, "Submitted registration", u.id, "");
    note(u.id, "Your registration was submitted.");
    save();
    return { ok: true };
  }

  function ownListing(id) {
    var u = user();
    var row = listing(id);
    if (!u || u.role !== "manager" || !row || row.managerId !== u.id) return null;
    return row;
  }

  function depositFor(row) {
    return Math.floor(L.fundingTarget(row) * row.companyPct / 100);
  }

  /* Revised terms: scalar terms plus optional per-shipment goods, expected sale, start day and step costs. */
  function applyTerms(row, terms) {
    ["investorShare", "companyPct", "minimum"].forEach(function (k) {
      if (typeof terms[k] === "number") row[k] = terms[k];
    });
    if (Array.isArray(terms.shipments)) {
      terms.shipments.forEach(function (t, i) {
        var sh = row.shipments[i];
        if (!sh || !t) return;
        ["goods", "saleExpected", "startDay"].forEach(function (k) { if (typeof t[k] === "number") sh[k] = t[k]; });
        (t.steps || []).forEach(function (ts, n) {
          var hit = ts && ts.id ? sh.steps.filter(function (st) { return st.id === ts.id; })[0] : sh.steps[n];
          if (hit && ts && typeof ts.cost === "number") hit.cost = ts.cost;
        });
      });
    }
  }

  function respondTerms(id, accept) {
    var u = user();
    var row = ownListing(id);
    if (!row) return { ok: false, error: "That listing was not found." };
    if (row.status !== "awaiting_terms" || !row.revised) return { ok: false, error: "No revised terms are waiting for you." };
    if (accept) {
      applyTerms(row, row.revised);
      row.status = "approved";
      row.approvedAt = state.now;
      row.revised = null;
      row.history.push({ at: state.now, actorId: u.id, action: "Accepted revised terms", reason: "" });
      audit(u.id, "Accepted revised terms", row.id, row.name);
      if (row.assigneeId) note(row.assigneeId, u.name + " accepted the revised terms for " + row.name + ".");
      note(u.id, "You accepted the revised terms for " + row.name + ". Pay the deposit to go live.");
    } else {
      row.status = "rejected";
      row.revised = null;
      row.history.push({ at: state.now, actorId: u.id, action: "Rejected", reason: "Manager declined the revised terms." });
      audit(u.id, "Declined revised terms", row.id, row.name);
      if (row.assigneeId) note(row.assigneeId, u.name + " declined the revised terms for " + row.name + ".");
    }
    save();
    return { ok: true };
  }

  function payDeposit(id) {
    var u = user();
    var row = ownListing(id);
    if (!row) return { ok: false, error: "That listing was not found." };
    var gate = managerGate(u);
    if (gate) return { ok: false, error: gate };
    var denied = L.can(u, "deposit");
    if (denied) return { ok: false, error: denied };
    if (row.status !== "approved") return { ok: false, error: "No deposit is due for this listing." };
    var cents = depositFor(row);
    if (cents <= 0) return { ok: false, error: "No deposit is due for this listing." };
    if (led.bal(wallet(u.id)) < cents) {
      return { ok: false, error: "Error: your wallet is " + L.formatUsd(cents - led.bal(wallet(u.id))) + " short of the deposit.", topup: true };
    }
    var moved = led.post([
      { account: wallet(u.id), amount: -cents, memo: "Manager deposit" },
      { account: "escrow:" + row.id, amount: cents, memo: "Manager deposit" }
    ], "deposit:" + row.id);
    if (!moved.ok) return { ok: false, error: moved.error, topup: moved.error === "Insufficient funds." };
    if (!moved.duplicate) row.contributions.push({ userId: u.id, kind: "manager", amount: cents });
    row.status = "live";
    row.liveAt = state.now;
    row.history.push({ at: state.now, actorId: u.id, action: "Deposit paid", reason: L.formatUsd(cents) });
    audit(u.id, "Paid deposit", row.id, L.formatUsd(cents));
    note(u.id, "Your deposit of " + L.formatUsd(cents) + " was paid. " + row.name + " is live.");
    save();
    return { ok: true, cents: cents };
  }

  function withdrawListing(id) {
    var u = user();
    var row = ownListing(id);
    if (!row) return { ok: false, error: "That listing was not found." };
    if (["draft", "in_review", "awaiting_terms", "approved", "rejected"].indexOf(row.status) === -1) {
      return { ok: false, error: "Error: a live listing cannot be withdrawn." };
    }
    row.status = "withdrawn";
    row.revised = null;
    row.history.push({ at: state.now, actorId: u.id, action: "Withdrawn", reason: "Withdrawn by the manager." });
    audit(u.id, "Withdrew listing", row.id, row.name);
    save();
    return { ok: true };
  }

  function deleteDraft(id) {
    var u = user();
    var row = ownListing(id);
    if (!row || row.status !== "draft") return { ok: false, error: "Error: only a draft can be deleted." };
    state.listings = state.listings.filter(function (x) { return x.id !== row.id; });
    audit(u.id, "Deleted listing draft", row.id, row.name);
    save();
    return { ok: true };
  }

  function findStep(row, shipmentId, stepId) {
    var sh = row.shipments.filter(function (x) { return x.id === shipmentId; })[0];
    var st = sh ? sh.steps.filter(function (x) { return x.id === stepId; })[0] : null;
    return st ? { shipment: sh, step: st } : null;
  }

  /* A manager never changes a step's status; only staff do (setStep). The manager attaches an optional
     document and tells staff the step is ready. doc is { name, type, size } or omitted. */
  function sendStep(listingId, shipmentId, stepId, doc) {
    var u = user();
    var row = ownListing(listingId);
    if (!row) return { ok: false, error: "That listing was not found." };
    if (row.status !== "live") return { ok: false, error: "Error: steps can only change while the listing is live." };
    var hit = findStep(row, shipmentId, stepId);
    if (!hit) return { ok: false, error: "That step was not found." };
    if (hit.step.owner !== "manager") return { ok: false, error: "Error: staff own this step." };
    if (hit.step.state !== "todo" && hit.step.state !== "in_progress") return { ok: false, error: "Error: this step is already " + hit.step.state.replace("_", " ") + "." };
    if (hit.step.verify && !(doc && doc.name) && !(hit.step.docs || []).length) return { ok: false, error: "Error: attach the required document first." };
    if (!hit.step.docs) hit.step.docs = [];
    if (doc && doc.name) hit.step.docs.push({ name: String(doc.name), type: doc.type || "", size: doc.size || 0, at: state.now, byId: u.id });
    hit.step.ready = { at: state.now, byId: u.id };
    row.history.push({ at: state.now, actorId: u.id, action: "Step sent to staff", reason: hit.step.name });
    audit(u.id, "Sent step to staff", row.id, hit.step.name);
    save();
    return { ok: true };
  }

  function proposePlan(listingId, steps) {
    var u = user();
    var row = ownListing(listingId);
    if (!row) return { ok: false, error: "That listing was not found." };
    if (row.status !== "live") return { ok: false, error: "Error: a plan change is only possible while the listing is live." };
    if (!steps || !steps.length) return { ok: false, error: "Error: the plan needs at least one step." };
    var tags = {};
    steps.forEach(function (st) { if (st.tag) tags[st.tag] = true; });
    if (!L.TAGS.every(function (t) { return tags[t]; })) return { ok: false, error: "Error: every stage from Goods purchased to Goods sold needs a tagged step." };
    row.planProposal = { proposerId: u.id, steps: stepPlan(steps, row.shipments[0].id), status: "proposed", at: state.now };
    row.history.push({ at: state.now, actorId: u.id, action: "Plan change proposed", reason: "" });
    audit(u.id, "Proposed plan change", row.id, row.name);
    note(u.id, "Your plan change for " + row.name + " is waiting for staff approval.");
    save();
    return { ok: true };
  }

  function fail(error) { return { ok: false, error: error }; }

  function need(action) {
    var actor = user();
    if (!actor) return { actor: null, error: "Sign in first." };
    var msg = action ? L.can(actor, action) : "";
    return { actor: actor, error: msg || "" };
  }

  function centsOf(body) {
    body = body || {};
    if (Number.isInteger(body.cents)) return { ok: true, cents: body.cents };
    if (body.amount != null && body.amount !== "") return L.usdToCents(body.amount);
    return { ok: false, error: "Error: enter a dollar amount with at most 2 decimals." };
  }

  function pushApproval(listing, row) {
    if (!listing.approvals) listing.approvals = [];
    row.id = "ap-" + listing.id + "-" + listing.approvals.length + "-" + String(state.now).slice(-6);
    row.status = "proposed";
    row.listingId = listing.id;
    listing.approvals.push(row);
    return row;
  }

  function findApproval(id) {
    var i, j, list;
    for (i = 0; i < state.listings.length; i++) {
      var row = state.listings[i];
      list = row.approvals || [];
      for (j = 0; j < list.length; j++) if (list[j].id === id) return { listing: row, approval: list[j] };
      if (row.planProposal && row.planProposal.status === "proposed" && id === "plan:" + row.id) {
        return {
          listing: row,
          approval: { id: id, type: "plan", proposerId: row.planProposal.proposerId, status: "proposed", reason: "" }
        };
      }
    }
    return null;
  }

  function shipmentById(listing, shipmentId) {
    return (listing.shipments || []).filter(function (sh) { return sh.id === shipmentId; })[0] || null;
  }

  function stepById(shipment, stepId) {
    return (shipment.steps || []).filter(function (st) { return st.id === stepId; })[0] || null;
  }

  function goodsBought(listing) {
    return (listing.shipments || []).some(function (sh) { return L.shipmentStage(listing, sh) >= 1; });
  }

  function applyWaiver(actor, listing) {
    var denied = L.can(actor, "waiver");
    if (denied) return fail(denied);
    if (listing.waiver) return { ok: true };
    var stand = Math.round(L.fundingTarget(listing) * (state.settings.waiverStandInPct || 0) / 100);
    if (stand > 0) {
      var moved = led.post([
        { account: "platform:treasury", amount: -stand, memo: "Deposit stand-in" },
        { account: "escrow:" + listing.id, amount: stand, memo: "Deposit stand-in" }
      ], "waiver:" + listing.id);
      if (!moved.ok) return fail(moved.error);
      listing.contributions.push({ userId: "", kind: "treasury", amount: stand });
    }
    listing.waiver = true;
    listing.history.push({ at: state.now, actorId: actor.id, action: "Deposit waived", reason: "" });
    audit(actor.id, "Waived deposit", listing.id, L.formatUsd(stand));
    return { ok: true };
  }

  function reviewListing(id, action, body) {
    body = body || {};
    var actor = user();
    if (!actor) return fail("Sign in first.");
    var row = listing(id);
    if (!row) return fail("That listing was not found.");
    if (action !== "approve" && action !== "reject" && action !== "revise") return fail("You cannot do that.");
    if (body.buyerShareholderId && body.buyerShareholderId !== row.buyerShareholderId) {
      var buyerPerm = L.can(actor, "buyer-shareholder");
      if (buyerPerm) return fail(buyerPerm);
      var buyer = byId(body.buyerShareholderId);
      if (!buyer || buyer.shareholder !== true) return fail("Error: choose a shareholder.");
    }
    if (body.waiver) {
      var waiverPerm = L.can(actor, "waiver");
      if (waiverPerm) return fail(waiverPerm);
    }
    if (body.waiver && body.waiverOnly) {
      var waivedOnly = applyWaiver(actor, row);
      if (!waivedOnly.ok) return waivedOnly;
      if (String(body.marketNote || "").trim()) row.marketNote = String(body.marketNote).trim();
      save();
      return { ok: true };
    }
    if (action === "reject" || action === "revise") {
      if (row.status !== "in_review" && row.status !== "awaiting_terms") return fail("This listing is not waiting for a decision.");
    }
    if (action === "reject") {
      var decideReject = L.canDecide(actor, row.assigneeId);
      if (decideReject) return fail(decideReject);
      if (!String(body.reason || "").trim()) return fail("Error: a rejection needs a reason.");
      row.status = "rejected";
      row.history.push({ at: state.now, actorId: actor.id, action: "Rejected", reason: String(body.reason).trim() });
      audit(actor.id, "Rejected listing", row.id, String(body.reason).trim());
      note(row.managerId, row.name + " was rejected. " + String(body.reason).trim());
      save();
      return { ok: true };
    }
    if (action === "revise") {
      var decideRevise = L.canDecide(actor, row.assigneeId);
      if (decideRevise) return fail(decideRevise);
      var terms = body.terms || {};
      var investorShare = terms.investorShare == null ? row.investorShare : Number(terms.investorShare);
      var companyPct = terms.companyPct == null ? row.companyPct : Number(terms.companyPct);
      var minimum = terms.minimum == null ? row.minimum : Number(terms.minimum);
      if (investorShare < 40 || investorShare > 95) return fail("Error: investor share must be between 40% and 95%.");
      if (companyPct < 20 || companyPct > 90) return fail("Error: manager capital must be between 20% and 90%.");
      if (minimum < 100) return fail("Error: the minimum investment must be between $1.00 and the funding target.");
      row.revised = {
        investorShare: investorShare, companyPct: companyPct, minimum: minimum,
        shipments: terms.shipments || [],
        at: state.now, actorId: actor.id
      };
      row.status = "awaiting_terms";
      row.history.push({ at: state.now, actorId: actor.id, action: "Revised terms sent", reason: "Investor share " + investorShare + "%." });
      audit(actor.id, "Sent revised terms", row.id, "Investor share " + investorShare + "%");
      note(row.managerId, row.name + " was returned with revised terms.");
      save();
      return { ok: true };
    }
    var shareholderListing = !!(body.buyerShareholderId || row.buyerShareholderId || row.shareholderListing);
    var market = String(body.marketNote != null ? body.marketNote : (row.marketNote || "")).trim();
    if (shareholderListing && !market) return fail("Error: a shareholder listing needs a market note.");
    var decide = L.canDecide(actor, row.assigneeId);
    if (decide) {
      if (body.waiver && !row.waiver) {
        var only = applyWaiver(actor, row);
        if (!only.ok) return only;
        save();
        return { ok: true };
      }
      return fail(decide);
    }
    if (row.status !== "in_review" && row.status !== "awaiting_terms" && row.status !== "approved") return fail("This listing is not waiting for a decision.");
    if (body.buyerShareholderId) {
      row.buyerShareholderId = body.buyerShareholderId;
      row.shareholderListing = true;
      row.shareholderSharePct = state.settings.shareholderSharePct;
    }
    if (market) row.marketNote = market;
    if (body.waiver) {
      var waived = applyWaiver(actor, row);
      if (!waived.ok) return waived;
    }
    if (row.status === "in_review" || row.status === "awaiting_terms") {
      row.status = "approved";
      row.approvedAt = state.now;
      row.history.push({ at: state.now, actorId: actor.id, action: "Approved", reason: market });
      audit(actor.id, "Approved listing", row.id, market);
      note(row.managerId, row.name + " was approved.");
    } else audit(actor.id, "Updated listing review", row.id, market);
    save();
    return { ok: true };
  }

  function fillOverdue(id) {
    var gate = need("overdue-fill");
    if (gate.error) return fail(gate.error);
    var row = listing(id);
    if (!row) return fail("That listing was not found.");
    var left = L.remaining(row);
    if (left <= 0) return fail("Error: nothing is left to fill.");
    var moved = led.post([
      { account: "platform:treasury", amount: -left, memo: "Treasury contribution" },
      { account: "escrow:" + row.id, amount: left, memo: "Treasury contribution" }
    ], "overdue:" + row.id + ":" + state.entries.length);
    if (!moved.ok) return fail(moved.error);
    row.contributions.push({ userId: "", kind: "treasury", amount: left });
    row.history.push({ at: state.now, actorId: gate.actor.id, action: "Filled from treasury", reason: L.formatUsd(left) });
    audit(gate.actor.id, "Filled overdue funding", row.id, L.formatUsd(left));
    save();
    return { ok: true };
  }

  function decideWithdrawal(id, approve, text) {
    var actor = user();
    if (!actor) return fail("Sign in first.");
    var row = state.withdrawals.filter(function (w) { return w.id === id; })[0];
    if (!row) return fail("That withdrawal was not found.");
    if (row.status !== "pending") return fail("This withdrawal is not waiting.");
    var large = row.amount >= state.settings.largeWithdrawal;
    var denied = L.can(actor, large ? "withdraw-large" : "withdraw-small");
    if (denied) return fail(denied);
    if (approve) {
      var reference = String(text || "").trim();
      if (!reference) return fail("Error: enter a reference.");
      var paid = led.post([
        { account: "withdrawals:hold", amount: -row.amount, memo: "Withdrawal paid" },
        { account: "bank:external", amount: row.amount, memo: "Withdrawal paid" }
      ], "pay:" + row.id);
      if (!paid.ok) return fail(paid.error);
      row.status = "paid";
      row.reference = reference;
      audit(actor.id, "Paid withdrawal", row.id, reference);
      note(row.userId, "Withdrawal of " + L.formatUsd(row.amount) + " was paid.");
    } else {
      var reason = String(text || "").trim();
      if (!reason) return fail("Error: a rejection needs a reason.");
      var back = led.post([
        { account: "withdrawals:hold", amount: -row.amount, memo: "Withdrawal declined" },
        { account: wallet(row.userId), amount: row.amount, memo: "Withdrawal declined" }
      ], "decline:" + row.id);
      if (!back.ok) return fail(back.error);
      row.status = "declined";
      row.reason = reason;
      audit(actor.id, "Declined withdrawal", row.id, reason);
      note(row.userId, "Withdrawal of " + L.formatUsd(row.amount) + " was declined. " + reason);
    }
    save();
    return { ok: true };
  }

  function failWithdrawal(id) {
    var gate = need("withdraw-large");
    if (!gate.actor) return fail(gate.error);
    if (gate.actor.role !== "owner") return fail("Needs the owner to approve.");
    var row = state.withdrawals.filter(function (w) { return w.id === id; })[0];
    if (!row) return fail("That withdrawal was not found.");
    if (row.status !== "paid") return fail("This withdrawal cannot be failed.");
    var from = "bank:external";
    var moved = led.post([
      { account: from, amount: -row.amount, memo: "Payout failed" },
      { account: wallet(row.userId), amount: row.amount, memo: "Payout failed" }
    ], "fail:" + row.id + ":" + state.entries.length);
    if (!moved.ok) return fail(moved.error);
    row.status = "failed";
    row.reason = row.reason || "The bank returned the payment.";
    audit(gate.actor.id, "Failed withdrawal", row.id, L.formatUsd(row.amount));
    note(row.userId, "Withdrawal of " + L.formatUsd(row.amount) + " failed and returned to your wallet.");
    save();
    return { ok: true };
  }

  function treasuryTopup(cents, reference) {
    var gate = need("treasury");
    if (gate.error) return fail(gate.error);
    var ref = String(reference || "").trim();
    if (!ref) return fail("Error: enter a reference.");
    if (!Number.isInteger(cents) || cents <= 0) return fail("Error: enter a dollar amount with at most 2 decimals.");
    var moved = led.post([
      { account: "bank:external", amount: -cents, memo: "Treasury top-up " + ref },
      { account: "platform:treasury", amount: cents, memo: "Treasury top-up " + ref }
    ], "treasury:" + ref);
    if (!moved.ok) return fail(moved.error);
    audit(gate.actor.id, "Topped up treasury", "platform:treasury", ref + " " + L.formatUsd(cents));
    save();
    return { ok: true };
  }

  function moveReserve(cents, out) {
    var gate = need("withdraw-large");
    if (!gate.actor) return fail(gate.error);
    if (gate.actor.role !== "owner") return fail("You cannot do that.");
    if (!Number.isInteger(cents) || cents <= 0) return fail("Error: enter a dollar amount with at most 2 decimals.");
    var from = out ? "platform:reserve" : "platform:treasury";
    var to = out ? "platform:treasury" : "platform:reserve";
    var moved = led.post([
      { account: from, amount: -cents, memo: out ? "Reserve out" : "Reserve in" },
      { account: to, amount: cents, memo: out ? "Reserve out" : "Reserve in" }
    ], "reserve:" + state.entries.length);
    if (!moved.ok) return fail(moved.error);
    audit(gate.actor.id, out ? "Moved reserve out" : "Moved reserve in", "platform:reserve", L.formatUsd(cents));
    save();
    return { ok: true };
  }

  function addStaff(fields) {
    var gate = need("withdraw-large");
    if (!gate.actor) return fail(gate.error);
    if (gate.actor.role !== "owner") return fail("You cannot do that.");
    fields = fields || {};
    var email = String(fields.email || "").trim().toLowerCase();
    if (!fields.name || !String(fields.name).trim()) return fail("Error: enter your name.");
    if (!L.emailOk(email)) return fail("Error: enter a valid email.");
    if (state.users.some(function (u) { return u.email === email; })) return fail("Error: an account with this email already exists.");
    var role = fields.role;
    if (["owner", "reviewer", "ops", "finance"].indexOf(role) === -1) return fail("Error: choose a staff role.");
    var id = "u" + (state.users.length + 1);
    state.users.push({
      id: id, email: email, name: String(fields.name).trim(), role: role,
      password: root.ShehnatSeed ? root.ShehnatSeed.password : "",
      active: true, country: "", kind: "", shareholder: false, suspended: false,
      exposureLimit: null, failed: 0, lockedUntil: 0,
      application: { type: "kyc", status: "none", assigneeId: "", reason: "", history: [], payload: {} }
    });
    audit(gate.actor.id, "Added staff", id, role);
    save();
    return { ok: true, id: id };
  }

  function setStaffRole(id, role) {
    var gate = need("withdraw-large");
    if (!gate.actor) return fail(gate.error);
    if (gate.actor.role !== "owner") return fail("You cannot do that.");
    var person = byId(id);
    if (!person || ["owner", "reviewer", "ops", "finance"].indexOf(person.role) === -1) return fail("That account was not found.");
    if (["owner", "reviewer", "ops", "finance"].indexOf(role) === -1) return fail("Error: choose a staff role.");
    if (person.role === "owner" && role !== "owner") {
      var owners = state.users.filter(function (u) { return u.role === "owner" && u.active; });
      if (owners.length <= 1) return fail("Error: the owner role cannot be removed from this account.");
    }
    person.role = role;
    audit(gate.actor.id, "Changed staff role", id, role);
    save();
    return { ok: true };
  }

  function deactivateStaff(id) {
    var gate = need("withdraw-large");
    if (!gate.actor) return fail(gate.error);
    if (gate.actor.role !== "owner") return fail("You cannot do that.");
    if (id === gate.actor.id) return fail("Error: you cannot deactivate your own account.");
    var person = byId(id);
    if (!person) return fail("That account was not found.");
    person.active = false;
    audit(gate.actor.id, "Deactivated staff", id, "");
    save();
    return { ok: true };
  }

  /* Staff give a late (or any open) step a new target date and everyone involved is told. */
  function setStepDate(listingId, shipmentId, stepId, ms, reason) {
    var gate = need("steps");
    if (gate.error) return fail(gate.error);
    var row = listing(listingId);
    var shipment = row && shipmentById(row, shipmentId);
    var step = shipment && stepById(shipment, stepId);
    if (!step) return fail("That step was not found.");
    if (row.status !== "live") return fail("Error: dates can only change while the listing is live.");
    if (step.state === "done" || step.state === "verified" || step.state === "skipped") return fail("Error: this step is already finished.");
    if (!Number.isFinite(ms) || ms <= state.now) return fail("Error: choose a date in the future.");
    step.revisedAt = ms;
    delete step.ready;
    var text = "New date for " + step.name + " on " + row.name + ": " + dateText(ms) + (reason ? ". " + reason : ".");
    var told = {};
    if (row.managerId) told[row.managerId] = true;
    (row.contributions || []).forEach(function (c) { if (c.kind === "investor") told[c.userId] = true; });
    stakeholders(row).forEach(function (id) { told[id] = true; });
    Object.keys(told).forEach(function (id) { note(id, text); });
    row.history.push({ at: state.now, actorId: gate.actor.id, action: "New step date", reason: step.name + " · " + dateText(ms) });
    audit(gate.actor.id, "Set new step date", row.id, step.name + " " + dateText(ms));
    save();
    return { ok: true };
  }

  function setStep(listingId, shipmentId, stepId, next, extra) {
    var gate = need("steps");
    if (gate.error) return fail(gate.error);
    extra = extra || {};
    var row = listing(listingId);
    if (!row) return fail("That listing was not found.");
    var shipment = shipmentById(row, shipmentId);
    var step = shipment && stepById(shipment, stepId);
    if (!step) return fail("That step was not found.");
    var allowed = ["in_progress", "done", "verified", "blocked", "skipped"];
    if (allowed.indexOf(next) === -1) return fail("You cannot do that.");
    if ((next === "blocked" || next === "skipped") && !String(extra.reason || "").trim()) return fail("Error: a reason is required.");
    if (next === "verified" || next === "skipped") {
      pushApproval(row, {
        type: next === "verified" ? "verify" : "skip",
        proposerId: gate.actor.id,
        shipmentId: shipmentId, stepId: stepId,
        reason: String(extra.reason || "").trim(),
        doc: extra.doc || null
      });
      audit(gate.actor.id, next === "verified" ? "Proposed verification" : "Proposed skip", row.id, step.name);
      save();
      return { ok: true };
    }
    step.state = next === "in_progress" ? "in_progress" : next;
    delete step.ready;
    if (extra.reason) step.reason = String(extra.reason).trim();
    if (extra.doc) {
      if (!step.docs) step.docs = [];
      step.docs.push(extra.doc);
    }
    row.history.push({ at: state.now, actorId: gate.actor.id, action: "Step " + next, reason: step.name });
    audit(gate.actor.id, "Updated step", row.id, step.name + " " + next);
    save();
    return { ok: true };
  }

  function opsMoney(listingId, kind, body) {
    var actor = user();
    if (!actor) return fail("Sign in first.");
    body = body || {};
    var row = listing(listingId);
    if (!row) return fail("That listing was not found.");
    var kinds = ["step-cost", "unplanned", "proceeds", "use-proceeds", "overrun", "cancel"];
    if (kinds.indexOf(kind) === -1) return fail("You cannot do that.");
    if (kind === "cancel") {
      var cancelPerm = L.can(actor, "cancel");
      if (cancelPerm) return fail(cancelPerm);
      if (row.status !== "live") return fail("You cannot do that.");
      if (goodsBought(row)) return fail("Error: goods have already been bought.");
      var lines = [];
      (row.contributions || []).forEach(function (c) {
        var dest = c.kind === "treasury" ? "platform:treasury" : wallet(c.userId);
        lines.push({ account: "escrow:" + row.id, amount: -c.amount, memo: "Refund" });
        lines.push({ account: dest, amount: c.amount, memo: "Refund" });
      });
      if (lines.length) {
        var refunded = led.post(lines, "cancel:" + row.id);
        if (!refunded.ok) return fail(refunded.error === "Insufficient funds." ? "Insufficient funds." : refunded.error);
      }
      row.contributions = [];
      row.status = "cancelled";
      row.history.push({ at: state.now, actorId: actor.id, action: "Cancelled", reason: String(body.reason || "").trim() });
      audit(actor.id, "Cancelled listing", row.id, String(body.reason || "").trim());
      note(row.managerId, row.name + " was cancelled. Contributions were refunded.");
      save();
      return { ok: true };
    }
    var money = centsOf(body);
    if (!money.ok) return fail(money.error);
    if (money.cents <= 0) return fail("Error: enter a dollar amount with at most 2 decimals.");
    if (kind === "step-cost") {
      var costPerm = L.can(actor, "costs");
      if (costPerm) return fail(costPerm);
      var shipment = shipmentById(row, body.shipmentId);
      var step = shipment && stepById(shipment, body.stepId);
      if (!step) return fail("That step was not found.");
      var spent = led.post([
        { account: "escrow:" + row.id, amount: -money.cents, memo: "Step cost" },
        { account: "bank:external", amount: money.cents, memo: "Step cost" }
      ], "step-cost:" + row.id + ":" + state.entries.length);
      if (!spent.ok) return fail(spent.error);
      if (body.doc) {
        if (!step.docs) step.docs = [];
        step.docs.push(body.doc);
      }
      step.spent = (step.spent || 0) + money.cents;
      shipment.costActual = (shipment.costActual || 0) + money.cents;
      audit(actor.id, "Paid step cost", row.id, L.formatUsd(money.cents));
      save();
      return { ok: true };
    }
    if (kind === "proceeds") {
      var proceedsPerm = L.can(actor, "costs");
      if (proceedsPerm) return fail(proceedsPerm);
      var sold = shipmentById(row, body.shipmentId);
      if (!sold) return fail("That shipment was not found.");
      if (money.cents < (sold.saleExpected || 0) && !String(body.reason || "").trim()) return fail("Error: enter a reason for the shortfall.");
      var came = led.post([
        { account: "bank:external", amount: -money.cents, memo: "Sale proceeds" },
        { account: "escrow:" + row.id, amount: money.cents, memo: "Sale proceeds" }
      ], "proceeds:" + row.id + ":" + (body.shipmentId || "") + ":" + state.entries.length);
      if (!came.ok) return fail(came.error);
      sold.proceeds = (sold.proceeds || 0) + money.cents;
      if (money.cents < (sold.saleExpected || 0)) sold.shortfall = String(body.reason).trim();
      audit(actor.id, "Recorded sale proceeds", row.id, L.formatUsd(money.cents));
      save();
      return { ok: true };
    }
    var approvalPerm = kind === "overrun" ? L.can(actor, "overrun") : L.can(actor, "costs");
    if (approvalPerm) return fail(approvalPerm);
    pushApproval(row, {
      type: kind, proposerId: actor.id, shipmentId: body.shipmentId || "", stepId: body.stepId || "",
      amount: money.cents, reason: String(body.reason || "").trim(), doc: body.doc || null
    });
    audit(actor.id, "Proposed " + kind, row.id, L.formatUsd(money.cents));
    save();
    return { ok: true };
  }

  function proposeResolution(listingId, shipmentId, kind, body) {
    var actor = user();
    if (!actor) return fail("Sign in first.");
    body = body || {};
    if (kind !== "writeoff" && kind !== "resale") return fail("You cannot do that.");
    var denied = L.can(actor, kind === "resale" ? "propose-resale" : "steps");
    if (denied) return fail(denied);
    var row = listing(listingId);
    var shipment = row && shipmentById(row, shipmentId);
    if (!shipment) return fail("That shipment was not found.");
    if (kind === "resale" && body.buyerId && !byId(body.buyerId)) return fail("Error: choose a buyer.");
    pushApproval(row, {
      type: kind, proposerId: actor.id, shipmentId: shipmentId,
      amount: Number.isInteger(body.cents) ? body.cents : 0,
      buyerId: body.buyerId || "", reason: String(body.reason || "").trim()
    });
    audit(actor.id, kind === "writeoff" ? "Proposed write-off" : "Proposed resale", row.id, String(body.reason || "").trim());
    save();
    return { ok: true };
  }

  function payoutAccount(row) {
    if (row.kind === "treasury" || !row.userId) return "platform:treasury";
    var person = byId(row.userId);
    if (person && person.role === "manager" && person.suspended) return "withdrawals:hold";
    return wallet(row.userId);
  }

  function applyApproval(actor, listing, approval) {
    var shipment = shipmentById(listing, approval.shipmentId);
    var step = shipment && stepById(shipment, approval.stepId);
    if (approval.type === "verify" || approval.type === "skip") {
      if (!step) return fail("That step was not found.");
      if (!step.docs) step.docs = [];
      step.state = approval.type === "verify" ? "verified" : "skipped";
      if (approval.reason) step.reason = approval.reason;
      if (approval.doc) step.docs.push(approval.doc);
      return { ok: true };
    }
    if (approval.type === "unplanned" || approval.type === "use-proceeds") {
      var spent = led.post([
        { account: "escrow:" + listing.id, amount: -approval.amount, memo: approval.type },
        { account: "bank:external", amount: approval.amount, memo: approval.type }
      ], "apply:" + approval.id);
      if (!spent.ok) return fail(spent.error);
      if (shipment) {
        shipment.costActual = (shipment.costActual || 0) + approval.amount;
        if (approval.doc) shipment.docs = (shipment.docs || []).concat([approval.doc]);
      }
      return { ok: true };
    }
    if (approval.type === "overrun") {
      var filled = led.post([
        { account: "platform:treasury", amount: -approval.amount, memo: "Overrun contribution" },
        { account: "escrow:" + listing.id, amount: approval.amount, memo: "Overrun contribution" }
      ], "apply:" + approval.id);
      if (!filled.ok) return fail(filled.error);
      listing.contributions.push({ userId: "", kind: "treasury", amount: approval.amount });
      return { ok: true };
    }
    if (approval.type === "writeoff") {
      if (!shipment) return fail("That shipment was not found.");
      shipment.writtenOff = true;
      return { ok: true };
    }
    if (approval.type === "resale") {
      if (!shipment) return fail("That shipment was not found.");
      var buyer = approval.buyerId ? byId(approval.buyerId) : null;
      if (buyer && buyer.shareholder === true && actor.role !== "owner") return fail("Needs the owner to approve.");
      shipment.resaleBuyerId = approval.buyerId || "";
      if (approval.amount > 0) {
        var sold = led.post([
          { account: "bank:external", amount: -approval.amount, memo: "Resale" },
          { account: "escrow:" + listing.id, amount: approval.amount, memo: "Resale" }
        ], "apply:" + approval.id);
        if (!sold.ok) return fail(sold.error);
        shipment.proceeds = (shipment.proceeds || 0) + approval.amount;
      }
      return { ok: true };
    }
    if (approval.type === "plan") {
      var steps = listing.planProposal && listing.planProposal.steps;
      if (!steps) return fail("That proposal was not found.");
      listing.shipments.forEach(function (sh) {
        sh.steps = steps.map(function (st, n) {
          var copy = {};
          Object.keys(st).forEach(function (k) { copy[k] = st[k]; });
          copy.id = sh.id + "-" + n;
          copy.state = (sh.steps[n] && sh.steps[n].state) || copy.state || "todo";
          copy.docs = (sh.steps[n] && sh.steps[n].docs) || copy.docs || [];
          return copy;
        });
      });
      listing.planProposal.status = "approved";
      return { ok: true };
    }
    return fail("You cannot do that.");
  }

  function decideApproval(approvalId, approve, reason) {
    var actor = user();
    if (!actor) return fail("Sign in first.");
    if (["owner", "reviewer", "ops", "finance"].indexOf(actor.role) === -1) return fail("You cannot do that.");
    var found = findApproval(approvalId);
    if (!found) return fail("That approval was not found.");
    var eyes = L.fourEyes(actor.id, found.approval.proposerId);
    if (eyes) return fail(eyes);
    if (!approve) {
      if (!String(reason || "").trim()) return fail("Error: a rejection needs a reason.");
      found.approval.status = "declined";
      found.approval.decisionReason = String(reason).trim();
      if (found.approval.type === "plan" && found.listing.planProposal) found.listing.planProposal.status = "declined";
      audit(actor.id, "Declined approval", found.listing.id, found.approval.type);
      save();
      return { ok: true };
    }
    if (found.approval.type === "resale") {
      var buyer = found.approval.buyerId ? byId(found.approval.buyerId) : null;
      if (buyer && buyer.shareholder === true && actor.role !== "owner") return fail("Needs the owner to approve.");
    }
    var applied = applyApproval(actor, found.listing, found.approval);
    if (!applied.ok) return applied;
    found.approval.status = "approved";
    audit(actor.id, "Approved " + found.approval.type, found.listing.id, found.approval.reason || "");
    save();
    return { ok: true };
  }

  function proposeSettlement(listingId) {
    var gate = need("propose-settlement");
    if (gate.error) return fail(gate.error);
    var row = listing(listingId);
    if (!row) return fail("That listing was not found.");
    if (row.status !== "live" && !(row.settlement && row.settlement.status === "returned")) return fail("This listing is not ready to settle.");
    var ready = (row.shipments || []).length && (row.shipments || []).every(function (sh) { return L.shipmentStage(row, sh) >= 5; });
    if (!ready) return fail("Error: every shipment must be at Goods sold.");
    row.settlement = { proposerId: gate.actor.id, status: "proposed", at: state.now, reason: "" };
    row.status = "settlement_proposed";
    row.history.push({ at: state.now, actorId: gate.actor.id, action: "Settlement proposed", reason: "" });
    audit(gate.actor.id, "Proposed settlement", row.id, "");
    save();
    return { ok: true };
  }

  function settlementInput(row) {
    var sale = 0;
    var cost = 0;
    (row.shipments || []).forEach(function (sh) {
      sale += sh.proceeds || 0;
      cost += sh.costActual != null ? sh.costActual : 0;
    });
    var holders = state.users.filter(function (u) { return u.shareholder === true; }).map(function (u) { return u.id; });
    return L.settlement({
      saleCents: sale, costCents: cost, investorSharePct: row.investorShare,
      contributions: row.contributions || [],
      shareholderListing: !!row.shareholderListing,
      shareholderSharePct: state.settings.shareholderSharePct,
      buyerShareholderId: row.buyerShareholderId,
      holders: holders
    });
  }

  function approveSettlement(listingId, reason) {
    var gate = need("settlement-approve");
    if (gate.error) return fail(gate.error);
    var row = listing(listingId);
    if (!row || !row.settlement || row.settlement.status !== "proposed") return fail("This listing is not waiting for settlement.");
    var eyes = L.fourEyes(gate.actor.id, row.settlement.proposerId);
    if (eyes) return fail(eyes);
    if (String(reason || "").trim()) {
      row.settlement.status = "returned";
      row.settlement.reason = String(reason).trim();
      row.status = "live";
      audit(gate.actor.id, "Returned settlement", row.id, row.settlement.reason);
      note(row.settlement.proposerId, row.name + " settlement was sent back. " + row.settlement.reason);
      save();
      return { ok: true };
    }
    var settled = settlementInput(row);
    var lines = [];
    function add(account, amount, memo) {
      if (!amount) return;
      lines.push({ account: account, amount: amount, memo: memo });
    }
    var manager = byId(row.managerId);
    var managerHeld = manager && manager.suspended;
    add(managerHeld ? "withdrawals:hold" : wallet(row.managerId), settled.managerCut, managerHeld ? "Payout held because the account is suspended." : "Manager share");
    var held = managerHeld ? settled.managerCut : 0;
    settled.rows.forEach(function (payout) {
      var account = payoutAccount(payout);
      if (account === "withdrawals:hold") held += payout.payout;
      add(account, payout.payout, account === "withdrawals:hold" ? "Payout held because the account is suspended." : "Payout");
    });
    add("platform:revenue", settled.fee, "Service fee");
    var out = lines.reduce(function (s, line) { return s + line.amount; }, 0);
    lines.unshift({ account: "escrow:" + row.id, amount: -out, memo: "Settlement" });
    if (settled.shareholder > 0 || settled.reserve > 0) {
      lines.push({ account: "platform:treasury", amount: -(settled.shareholder + settled.reserve), memo: "Shareholder distribution" });
      (settled.holders || []).forEach(function (h) {
        if (h.amount) lines.push({ account: wallet(h.userId), amount: h.amount, memo: "Shareholder share" });
      });
      if (settled.reserve) lines.push({ account: "platform:reserve", amount: settled.reserve, memo: "Reserve fund" });
    }
    var posted = led.post(lines.filter(function (line) { return line.amount !== 0; }), "settle:" + row.id);
    if (!posted.ok) return fail(posted.error);
    if (held > 0) {
      state.withdrawals.unshift({
        id: "hold-" + row.id, userId: row.managerId, amount: held, status: "held",
        country: manager.country || "", bank: "", holder: manager.name, account: "", swift: "",
        at: state.now, reason: "Payout held because the account is suspended."
      });
    }
    row.settlement.status = "approved";
    row.settlement.reason = "";
    row.settlement.result = settled;
    row.settlement.holderIds = settled.holders.map(function (h) { return h.userId; });
    row.status = "completed";
    row.history.push({ at: state.now, actorId: gate.actor.id, action: "Settlement approved", reason: "" });
    audit(gate.actor.id, "Approved settlement", row.id, "");
    (row.contributions || []).forEach(function (c) {
      if (c.userId) note(c.userId, row.name + " was settled. The payout is in your wallet.");
    });
    save();
    return { ok: true, settlement: settled };
  }

  function setShareholder(userId, on) {
    var gate = need("withdraw-large");
    if (!gate.actor) return fail(gate.error);
    if (gate.actor.role !== "owner") return fail("You cannot do that.");
    var person = byId(userId);
    if (!person || (person.role !== "investor" && person.role !== "manager")) return fail("That account was not found.");
    if (!person.application || person.application.status !== "approved") return fail("Error: only an approved investor or manager can be a shareholder.");
    person.shareholder = !!on;
    audit(gate.actor.id, on ? "Marked shareholder" : "Unmarked shareholder", userId, "");
    save();
    return { ok: true };
  }

  function setSuspended(userId, on) {
    var actor = user();
    if (!actor || (actor.role !== "owner" && actor.role !== "reviewer")) return fail("You cannot do that.");
    var person = byId(userId);
    if (!person) return fail("That account was not found.");
    person.suspended = !!on;
    if (on && person.role === "manager") {
      state.listings.forEach(function (row) {
        if (row.managerId !== person.id) return;
        (row.shipments || []).forEach(function (sh) {
          (sh.steps || []).forEach(function (step) {
            if (step.owner === "manager" && step.state !== "done" && step.state !== "verified" && step.state !== "skipped") step.owner = "staff";
          });
        });
      });
    }
    audit(actor.id, on ? "Suspended account" : "Unsuspended account", userId, "");
    save();
    return { ok: true };
  }

  function setExposure(managerId, cents) {
    var gate = need("withdraw-large");
    if (!gate.actor) return fail(gate.error);
    if (gate.actor.role !== "owner") return fail("You cannot do that.");
    var person = byId(managerId);
    if (!person || person.role !== "manager") return fail("That account was not found.");
    if (!Number.isInteger(cents) || cents < 0) return fail("Error: enter a dollar amount with at most 2 decimals.");
    person.exposureLimit = cents;
    audit(gate.actor.id, "Set exposure limit", managerId, L.formatUsd(cents));
    save();
    return { ok: true };
  }

  function saveSettings(patch) {
    var gate = need("withdraw-large");
    if (!gate.actor) return fail(gate.error);
    if (gate.actor.role !== "owner") return fail("You cannot do that.");
    patch = patch || {};
    var nums = ["overdueDays", "autoWithdrawDays", "waiverStandInPct", "shareholderSharePct", "exposureDefault"];
    var i;
    for (i = 0; i < nums.length; i++) {
      if (patch[nums[i]] == null || patch[nums[i]] === "") continue;
      var n = Number(patch[nums[i]]);
      if (!Number.isInteger(n) || n < 0) return fail("Error: enter a whole number.");
      state.settings[nums[i]] = n;
    }
    if (patch.minTicketUsd != null && patch.minTicketUsd !== "") {
      var tk = L.usdToCents(patch.minTicketUsd);
      if (!tk.ok || tk.cents < 100) return fail("Error: the minimum investor ticket must be at least $1.00.");
      state.settings.minTicket = tk.cents;
    }
    if (patch.blocked != null) {
      var blocked = Array.isArray(patch.blocked) ? patch.blocked : String(patch.blocked).split(",");
      state.settings.blocked = blocked.map(function (c) { return String(c).trim().toUpperCase(); }).filter(Boolean);
    }
    if (patch.prohibited != null) {
      var prohibited = Array.isArray(patch.prohibited) ? patch.prohibited : String(patch.prohibited).split(",");
      state.settings.prohibited = prohibited.map(function (c) { return String(c).trim(); }).filter(Boolean);
    }
    audit(gate.actor.id, "Saved settings", "settings", "");
    save();
    return { ok: true };
  }

  function markRead() {
    var u = user();
    if (!u) return;
    state.notes.forEach(function (n) { if (n.userId === u.id) n.read = true; });
    save();
  }

  function seeWelcome() {
    state.welcomeSeen = true;
    save();
  }

  root.ShehnatStore = {
    boot: boot, save: save,
    get state() { return state; },
    user: user, byId: byId, listing: listing,
    bal: function (account) { return led.bal(account); },
    signIn: signIn, signOut: signOut, signUp: signUp,
    saveApplication: saveApplication, submitApplication: submitApplication,
    assign: assign, decide: decide, invest: invest, topup: topup, withdraw: withdraw,
    saveListing: saveListing, submitListing: submitListing,
    submitManagerApplication: submitManagerApplication, respondTerms: respondTerms, payDeposit: payDeposit,
    withdrawListing: withdrawListing, deleteDraft: deleteDraft, sendStep: sendStep, setStepDate: setStepDate, proposePlan: proposePlan,
    reviewListing: reviewListing, fillOverdue: fillOverdue,
    decideWithdrawal: decideWithdrawal, failWithdrawal: failWithdrawal,
    treasuryTopup: treasuryTopup, moveReserve: moveReserve,
    addStaff: addStaff, setStaffRole: setStaffRole, deactivateStaff: deactivateStaff,
    setStep: setStep, opsMoney: opsMoney, proposeResolution: proposeResolution,
    decideApproval: decideApproval, proposeSettlement: proposeSettlement, approveSettlement: approveSettlement,
    setShareholder: setShareholder, setSuspended: setSuspended, setExposure: setExposure, saveSettings: saveSettings,
    settlementInput: settlementInput,
    markRead: markRead, seeWelcome: seeWelcome
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
