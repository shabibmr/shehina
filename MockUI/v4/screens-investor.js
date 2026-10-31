/* Investor screens I1–I14. */
(function (root) {
  "use strict";
  function register(UI) {
    var Store = root.ShehnatStore;
    var L = root.ShehnatLogic;
    var step = 0;
    var draft = {};
    var errors = {};
    var tab = "overview";
    var openId = "";
    var filters = { category: "", source: "", buyer: "", sort: "name" };
    var port = "active";
    var walletFilter = "all";
    var gw = "";

    function D() { return root.ShehnatDash; }
    function mine(listing, id) {
      return (listing.contributions || []).filter(function (c) { return c.userId === id; }).reduce(function (s, c) { return s + c.amount; }, 0);
    }
    /* Why this shipment is on Home: your own earlier stake, or the company's. */
    function earlierLine(l) {
      var u = Store.user();
      if (u && mine(l, u.id) > 0) return "Invested earlier";
      var company = (l.contributions || []).some(function (c) { return c.kind === "manager" && c.amount > 0; });
      return company ? "The company invested earlier" : "";
    }
    function liveRows() {
      return Store.state.listings.filter(function (l) { return l.status === "live"; });
    }
    function fundingDaysLeft(l) {
      var s = Store.state;
      var from = l.approvedAt || s.now;
      return Math.max(0, Math.ceil((from + s.settings.autoWithdrawDays * L.DAY - s.now) / L.DAY));
    }
    function expireLine(l) {
      if (l.status !== "live" || L.remaining(l) <= 0) return "Funded";
      var days = fundingDaysLeft(l);
      return days === 0 ? "Ends today" : days + (days === 1 ? " day left" : " days left");
    }
    /* Investor return on capital over one cycle, with the sale 10% lower and 10% higher than planned. */
    function returnRange(l) {
      var p = L.projection(l);
      if (!p.target) return "";
      function pct(sale) {
        var r = L.settlement({ saleCents: Math.round(sale), costCents: p.target, investorSharePct: l.investorShare, contributions: [{ id: "all", kind: "investor", amount: p.target }], shareholderListing: false });
        return Math.round(r.pool * 100 / p.target);
      }
      var lo = pct(p.expectedSale * 0.9), hi = pct(p.expectedSale * 1.1);
      return "Expected " + lo + "–" + hi + "%";
    }
    function bentoCells(l) {
      var target = L.fundingTarget(l);
      var have = L.raised(l);
      var left = L.remaining(l);
      var pct = target ? Math.min(100, Math.round(have / target * 100)) : 0;
      var almost = l.status === "live" && left > 0 && target > 0 && left / target <= 0.1;
      return "<div class=\"bento-cell\"><span class=\"bento-k\">Still open</span><span class=\"bento-v num\">" + L.formatUsd(left) + "</span>" +
        "<span class=\"progress\" role=\"progressbar\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"" + pct + "\" aria-label=\"Funded\"><i style=\"width:" + pct + "%\"></i></span></div>" +
        "<div class=\"bento-cell\"><span class=\"bento-k\">Expires</span><span class=\"bento-v\">" + expireLine(l) + "</span>" +
        (almost ? "<span class=\"bento-k\">Almost funded</span>" : "") + "</div>" +
        "<div class=\"bento-cell bento-wide\"><span class=\"bento-k\">Turnaround time</span><span class=\"bento-v\">About " + L.cycleDays(l) + " days</span></div>";
    }
    function row(l, href, note) {
      return "<a class=\"bento\" href=\"" + href + "\" data-go=\"" + href + "\">" +
        "<div class=\"bento-cell bento-wide bento-head\"><div class=\"bento-title\"><span class=\"bento-name\">" + UI.esc(l.name) + "</span><span class=\"bento-k\">" + UI.esc(UI.cname(l.source)) + " to " + UI.esc(UI.cname(l.buyer)) + "</span>" +
        (note ? "<span class=\"bento-k\">" + UI.esc(note) + "</span>" : "") +
        "</div><span class=\"bento-return num\">" + returnRange(l) + "</span></div>" +
        bentoCells(l) + "</a>";
    }
    function moneyBlock(user, action, unapproved) {
      var sentence = L.can(user, action);
      if (sentence) return sentence;
      if (!user.application || user.application.status !== "approved") return unapproved;
      return "";
    }
    function gate(u) {
      var st = u.application.status;
      if (st === "approved") return "";
      if (st === "pending") return "<div class=\"banner\" role=\"status\"><strong>Your verification is being reviewed.</strong><span class=\"status\">Pending</span></div>";
      if (st === "rejected") return "<div class=\"banner banner-warning\" role=\"status\"><strong>Your verification was rejected.</strong><p>" + UI.esc(u.application.reason) + "</p><a href=\"#/kyc\" data-go=\"#/kyc\">Fix and resubmit</a></div>";
      return "<div class=\"banner\" role=\"status\"><strong>Verify your identity before you invest.</strong><a href=\"#/kyc\" data-go=\"#/kyc\">Start verification</a></div>";
    }

    /* Investor dashboard: portfolio, wallet, growth, shipments and other KPIs. Shareholders get an extra block. */
    function dashboardFor(u) {
      var D = ShehnatDash;
      var S = Store.state;
      var bal = Store.bal("user:" + u.id + ":wallet");
      var invested = 0, expected = 0, realised = 0, capDone = 0, roiW = 0, nextPay = 0, waiting = 0, nActive = 0, nDone = 0;
      var series = [0], cats = {}, markets = {};
      S.listings.forEach(function (l) {
        var held = mine(l, u.id);
        if (held <= 0) return;
        if (l.status === "live" || l.status === "settlement_proposed") {
          nActive++; invested += held; expected += L.expectedFor(l, held);
          cats[l.category] = (cats[l.category] || 0) + held;
          markets[l.source] = 1; markets[l.buyer] = 1;
          roiW += L.projection(l).roiYear * held;
          if (l.liveAt && L.raised(l) >= L.fundingTarget(l)) {
            var due = l.liveAt + L.cycleDays(l) * L.DAY;
            if (!nextPay || due < nextPay) nextPay = due;
          } else { waiting += held; }
        } else if (l.status !== "rejected" && l.status !== "cancelled") {
          waiting += held;
        } else if (l.status === "completed") {
          var sale = l.shipments.reduce(function (a, sh) { return a + (sh.proceeds || 0); }, 0);
          var cost = l.shipments.reduce(function (a, sh) { return a + (sh.costActual || 0); }, 0);
          var settled = L.settlement({ saleCents: sale, costCents: cost, investorSharePct: l.investorShare, contributions: l.contributions, shareholderListing: false });
          var slice = settled.rows.filter(function (r) { return r.userId === u.id; })[0];
          if (slice) { realised += slice.profit; capDone += held; nDone++; series.push(realised); }
        }
      });
      var open = liveRows().filter(function (l) { return L.remaining(l) > 0 && mine(l, u.id) <= 0; }).length;
      var total = bal + invested;
      var gain = realised + expected;
      var base = invested + capDone;
      var pct = base ? gain * 100 / base : 0;
      var tones = ["green", "blue", "amber", "red"];
      var cat = Object.keys(cats).map(function (k, i) { return { label: k, value: cats[k], tone: tones[i % 4], text: L.formatUsd(cats[k]) }; });
      var html = D.hero({
        label: "Total portfolio", value: L.formatUsd(total), tone: "green",
        sub: "Your wallet and your money at work",
        split: [{ label: "Wallet", value: bal, text: L.formatUsd(bal) }, { label: "Invested", value: invested, text: L.formatUsd(invested) }],
        delta: (gain >= 0 ? "\u25B2 " : "\u25BC ") + L.formatUsd(Math.abs(gain)) + " (" + pct.toFixed(1) + "%) realised + expected"
      }) +
      "<div class=\"dash-grid\">" +
        D.tile({ label: "Wallet balance", value: L.formatUsd(bal), sub: "Available to invest", tone: "blue", icon: "wallet", href: "#/wallet" }) +
        D.tile({ label: "Current investments", value: L.formatUsd(invested), sub: nActive + (nActive === 1 ? " shipment" : " shipments") + " funded", tone: "green", icon: "chart", href: "#/portfolio" }) +
        D.tile({ label: "Current shipments", value: String(nActive), sub: open + " open to invest", tone: "amber", icon: "ship", href: "#/shipments" }) +
        D.tile({ label: "Expected profit", value: L.formatUsd(expected), sub: invested ? "+" + (expected * 100 / invested).toFixed(1) + "% on invested" : "Invest to start earning", tone: "green", icon: "in" }) +
        D.tile({ label: "Realised profit", value: (realised >= 0 ? "+" : "\u2212") + L.formatUsd(Math.abs(realised)), sub: nDone + " completed", tone: realised >= 0 ? "green" : "red", icon: "check", href: "#/portfolio" }) +
        D.tile({ label: "Avg yearly return", value: invested ? (roiW / invested * 100).toFixed(0) + "%" : "\u2014", sub: "Expected, annualised", tone: "blue", icon: "chart" }) +
        D.tile({ label: "Next payout", value: nextPay ? UI.when(nextPay) : (waiting ? "Pending" : "\u2014"), sub: nextPay ? "Expected date" : (waiting ? L.formatUsd(waiting) + " awaiting full funding" : "Nothing funded yet"), tone: "amber", icon: "clock" }) +
        D.tile({ label: "Markets", value: String(Object.keys(markets).length), sub: "Countries your money works in", tone: "blue", icon: "globe" }) +
      "</div>" +
      D.meter({ label: "Capital at work", pct: total ? invested * 100 / total : 0, tone: "green", text: L.formatUsd(invested) + " invested, " + L.formatUsd(bal) + " idle in your wallet" }) +
      D.bar("Where your money is", cat);
      if (u.shareholder === true) {
        var mineSh = S.listings.filter(function (l) { return l.shareholderListing && l.buyerShareholderId === u.id; });
        html += "<section class=\"stack\"><h2>Shareholder</h2><div class=\"dash-grid\">" +
          D.tile({ label: "Treasury profit share", value: S.settings.shareholderSharePct + "%", sub: "Your share of shareholder listings", tone: "amber", icon: "users" }) +
          D.tile({ label: "Shareholder listings", value: String(mineSh.length), sub: L.formatUsd(mineSh.reduce(function (a, l) { return a + L.fundingTarget(l); }, 0)) + " in total", tone: "blue", icon: "flag" }) +
        "</div></section>";
      }
      return "<div class=\"column stack\">" + html + "</div>";
    }

    UI.screen({
      id: "home",
      auth: "investor",
      section: "home",
      title: "Home",
      test: function (h) { return h === "#/home" ? {} : null; },
      render: function (stage) {
        var u = Store.user();
        var rows = liveRows();
        var lead = rows.filter(function (l) { return l.id === "cardamom"; })[0] || rows[0];
        var next = rows.filter(function (l) { return lead && l.id !== lead.id; })[0];
        if (!lead) {
          stage.innerHTML = gate(u) + dashboardFor(u) + "<div class=\"column\"><div class=\"empty\"><p>No shipment is open right now.</p><a href=\"#/shipments\" data-go=\"#/shipments\">See shipments</a></div></div>";
          return;
        }
        var leadNote = earlierLine(lead);
        stage.innerHTML = gate(u) + dashboardFor(u) + "<a class=\"lead\" href=\"#/listing/" + lead.id + "\" data-go=\"#/listing/" + lead.id + "\"><p class=\"lead-title\">" + UI.esc(lead.name) + "</p>" + (leadNote ? "<p>" + UI.esc(leadNote) + "</p>" : "") + "</a><div class=\"column\"><a href=\"#/portfolio\" data-go=\"#/portfolio\">Your shipments</a>" + (next ? row(next, "#/listing/" + next.id, earlierLine(next)) : "") + "</div>";
      }
    });

    function showStep(stage) {
      var u = Store.user();
      var p = draft;
      var n = 6;
      var dots = "";
      var i;
      for (i = 0; i < n; i++) dots += "<li class=\"" + (i < step ? "done" : i === step ? "on" : "") + "\"" + (i === step ? " aria-current=\"step\"" : "") + ">" + (i + 1) + "</li>";
      var body = "";
      if (step === 0) body = "<h1>Verify your identity</h1><p>We ask for who you are, where you live, and two documents. You cannot invest until this is approved.</p>";
      if (step === 1) body = "<h1>About you</h1>" + UI.field("name", "Name", "<input id=\"name\" name=\"name\" value=\"" + UI.esc(p.name || u.name) + "\">", errors.name) + UI.field("dob", "Date of birth", "<input id=\"dob\" name=\"dob\" type=\"date\" value=\"" + UI.esc(p.dob || "") + "\">", errors.dob) + UI.field("phone", "Phone", "<input id=\"phone\" name=\"phone\" value=\"" + UI.esc(p.phone || "") + "\">", errors.phone);
      if (step === 2) body = "<h1>Where you live</h1>" + UI.field("residence", "Country of residence", "<select id=\"residence\" name=\"residence\"><option value=\"\">Choose</option>" + UI.countryOpts(p.residence || u.country) + "</select>", errors.residence) + UI.blockedNote();
      if (step === 3) body = "<h1>Identity document</h1>" + UI.field("idType", "Document type", "<select id=\"idType\" name=\"idType\"><option>Passport</option><option>National ID</option><option>Driving licence</option><option>Residence permit</option></select>", "") + UI.field("idNumber", "Document number", "<input id=\"idNumber\" name=\"idNumber\" class=\"num\" value=\"" + UI.esc(p.idNumber || "") + "\">", errors.idNumber);
      if (step === 4) {
        var files = (p.files || []).map(function (f, idx) {
          return "<div class=\"file\"><span>" + UI.esc(f.name) + " · " + UI.esc(f.type || "file") + " · " + f.size + " bytes</span><button type=\"button\" class=\"btn-text\" data-act=\"rm\" data-idx=\"" + idx + "\">Remove</button></div>";
        }).join("");
        body = "<h1>Documents</h1><p>Add a photo identity document and a proof of address. Only the name and size are kept.</p><label class=\"upload\">Choose file<input class=\"sr\" name=\"file\" type=\"file\" data-live=\"file\"></label>" + files + (errors.files ? "<p class=\"err\" id=\"files-err\">" + UI.esc(errors.files) + "</p>" : "");
      }
      if (step === 5) body = "<h1>Review</h1><p>" + UI.esc(p.name || u.name) + " · " + UI.esc(UI.cname(p.residence || "")) + "</p><p class=\"num\">" + UI.esc(p.idType || "") + " " + UI.esc(p.idNumber || "") + "</p><p>" + ((p.files || []).length) + " documents</p><label class=\"check\"><input type=\"checkbox\" name=\"declare\"" + (p.declare ? " checked" : "") + "> <span>I confirm these details are true and I understand investments can lose value.</span></label>" + (errors.declare ? "<p class=\"err\">" + UI.esc(errors.declare) + "</p>" : "");
      stage.innerHTML = "<div class=\"column\"><ol class=\"stepper\">" + dots + "</ol><p>Step " + (step + 1) + " of " + n + "</p><form class=\"stack\">" + body + "</form></div>";
    }

    UI.screen({
      id: "kyc",
      auth: "investor",
      task: true,
      back: true,
      title: function () { return ["Verify your identity", "About you", "Where you live", "Identity document", "Documents", "Review"][step]; },
      test: function (h) { return h === "#/kyc" ? {} : null; },
      actions: function () {
        return "<button class=\"btn btn-primary\" type=\"button\" data-act=\"next\">" + (step === 5 ? "Submit verification" : "Continue") + "</button>";
      },
      render: function (stage) { showStep(stage); },
      on: function (act, el) {
        if (act === "file" && el.files && el.files[0]) {
          var f = el.files[0];
          draft.files = draft.files || [];
          draft.files.push({ name: f.name, type: f.type, size: f.size });
          UI.go("#/kyc");
          return;
        }
        if (act === "rm") {
          draft.files.splice(Number(el.getAttribute("data-idx")), 1);
          UI.go("#/kyc");
          return;
        }
        if (act !== "next") return;
        errors = {};
        var form = document.querySelector("form");
        var data = form ? new FormData(form) : new FormData();
        ["name", "dob", "phone", "residence", "idType", "idNumber"].forEach(function (k) {
          if (data.get(k)) draft[k] = data.get(k);
        });
        if (step === 1) {
          if (!draft.name) errors.name = "Error: enter your name.";
          var age = L.ageOk(draft.dob, Store.state.now);
          if (age) errors.dob = age;
          var phone = L.phoneOk(draft.phone);
          if (phone) errors.phone = phone;
          if (Object.keys(errors).length) { UI.go("#/kyc"); return; }
        }
        if (step === 2 && L.blocked(draft.residence, Store.state.settings.blocked)) {
          errors.residence = "Error: we cannot accept a residence in that country.";
          UI.go("#/kyc"); return;
        }
        if (step === 2 && !draft.residence) { errors.residence = "Error: choose a country."; UI.go("#/kyc"); return; }
        if (step === 3 && !draft.idNumber) { errors.idNumber = "Error: enter the document number."; UI.go("#/kyc"); return; }
        if (step === 4 && (!draft.files || draft.files.length < 2)) { errors.files = "Error: add both documents."; UI.go("#/kyc"); return; }
        if (step === 5) {
          draft.declare = !!data.get("declare");
          var res = Store.submitApplication(draft);
          if (!res.ok) { errors = res.errors || {}; UI.go("#/kyc"); return; }
          step = 0; draft = {};
          UI.go("#/kyc-status");
          return;
        }
        step += 1;
        UI.go("#/kyc");
      }
    });

    UI.screen({
      id: "kyc-status",
      title: "Verification",
      auth: "investor",
      section: "you",
      back: true,
      test: function (h) { return h === "#/kyc-status" ? {} : null; },
      render: function (stage) {
        var u = Store.user();
        var st = u.application.status;
        var banner = "";
        if (st === "approved") banner = "<div class=\"banner banner-success\" role=\"status\"><strong>Your verification is approved.</strong></div>";
        if (st === "pending") banner = "<div class=\"banner\" role=\"status\"><strong>Your verification is being reviewed.</strong><span class=\"status\">Pending</span></div>";
        if (st === "rejected") banner = "<div class=\"banner banner-warning\" role=\"status\"><strong>Your verification was rejected.</strong><p>" + UI.esc(u.application.reason) + "</p><a href=\"#/kyc\" data-go=\"#/kyc\">Fix and resubmit</a></div>";
        if (st === "none") banner = "<div class=\"empty\"><p>You have not submitted verification.</p><a href=\"#/kyc\" data-go=\"#/kyc\">Start verification</a></div>";
        var hist = (u.application.history || []).map(function (h) {
          var actor = Store.byId(h.actorId);
          return "<li><p>" + UI.esc(h.action) + (h.reason ? ". " + UI.esc(h.reason) : "") + "</p><p class=\"muted\">" + UI.esc(actor ? actor.name : "You") + " · " + UI.when(h.at) + "</p></li>";
        }).join("");
        stage.innerHTML = "<div class=\"column\"><h1>Verification</h1>" + banner + (hist ? "<ol class=\"timeline\">" + hist + "</ol>" : "") + "</div>";
      }
    });

    UI.screen({
      id: "shipments",
      title: "Shipments",
      auth: "investor",
      section: "ship",
      test: function (h) { return h === "#/shipments" ? {} : null; },
      render: function (stage) {
        var uid = Store.user().id;
        var rows = liveRows().filter(function (l) {
          if (mine(l, uid) > 0) return false;
          if (filters.category && l.category !== filters.category) return false;
          if (filters.source && l.source !== filters.source) return false;
          if (filters.buyer && l.buyer !== filters.buyer) return false;
          return true;
        });
        rows.sort(function (a, b) {
          if (filters.sort === "left") return L.remaining(a) - L.remaining(b);
          return a.name.localeCompare(b.name);
        });
        var list = rows.length ? rows.map(function (l) { return row(l, "#/listing/" + l.id); }).join("") : "<div class=\"empty\"><p>No shipments match these filters.</p><button class=\"btn-text\" type=\"button\" data-act=\"clear\">Clear filters</button></div>";
        var nActive = ["category", "source", "buyer"].filter(function (k) { return filters[k]; }).length + (filters.sort && filters.sort !== "name" ? 1 : 0);
        stage.innerHTML = "<div class=\"column\"><div class=\"list-head\"><h1>Shipments</h1><button class=\"icon-btn filter-btn\" type=\"button\" data-act=\"filters\" aria-label=\"Filters" + (nActive ? " (" + nActive + " on)" : "") + "\">" + UI.strokeIcon("filter", 22) + (nActive ? "<b class=\"filter-count\">" + nActive + "</b>" : "") + "</button></div>" + list + "</div>";
      },
      submit: function (data) {
        filters = { category: data.get("category") || "", source: data.get("source") || "", buyer: data.get("buyer") || "", sort: data.get("sort") || "name" };
        UI.closeSheet();
        UI.go("#/shipments");
      },
      on: function (act) {
        if (act === "filters") {
          UI.openSheet("<header><strong>Filters</strong><button class=\"btn-text\" type=\"button\" data-close>Close</button></header><form class=\"stack\">" +
            UI.field("category", "Category", "<select id=\"category\" name=\"category\"><option value=\"\">Any</option><option>Food</option><option>Building</option><option>Textiles</option><option>Energy</option><option>Other</option></select>", "") +
            UI.field("source", "Sourced from", "<select id=\"source\" name=\"source\"><option value=\"\">Any</option>" + UI.countryOpts(filters.source) + "</select>", "") +
            UI.field("buyer", "Sold in", "<select id=\"buyer\" name=\"buyer\"><option value=\"\">Any</option>" + UI.countryOpts(filters.buyer) + "</select>", "") +
            UI.field("sort", "Sort", "<select id=\"sort\" name=\"sort\"><option value=\"name\">Name</option><option value=\"left\">Amount left</option></select>", "") +
            "<button class=\"btn btn-primary\" type=\"submit\">Apply filters</button></form>");
          ["category", "source", "buyer", "sort"].forEach(function (k) { var el = document.getElementById(k); if (el && filters[k]) el.value = filters[k]; });
          return;
        }
        if (act === "clear") { filters = { category: "", source: "", buyer: "", sort: "name" }; UI.go("#/shipments"); } }
    });

    function profitBounds(l) {
      var p = L.projection(l);
      return { plan: p.expectedProfit, low: Math.round(p.expectedSale * 0.9 - p.target), high: Math.round(p.expectedSale * 1.1 - p.target) };
    }
    function profitRange(l) {
      var b = profitBounds(l);
      return "<p class=\"muted\">Expected profit</p><p class=\"price num\">" + L.formatUsd(b.plan) + "</p>" +
        "<div class=\"range\" role=\"img\" aria-label=\"Expected profit from " + L.formatUsd(b.low) + " to " + L.formatUsd(b.high) + "\"><i class=\"range-fill\"></i><i class=\"range-mark\"></i></div>" +
        "<div class=\"range-labels num\"><span>" + L.formatUsd(b.low) + "<small>Sale 10% lower</small></span><span class=\"mid\">" + L.formatUsd(b.plan) + "<small>As planned</small></span><span>" + L.formatUsd(b.high) + "<small>Sale 10% higher</small></span></div>";
    }
    /* One card per shipment: stage route, steps-done meter, next step and the step timeline. */
    function shipmentCards(l, open) {
        var now = Store.state.now;
        var esc = UI.esc;
        var lateN = 0;
        var cards = l.shipments.map(function (sh, si) {
          var stageN = L.shipmentStage(l, sh);
          var doneN = 0;
          var nextIdx = -1;
          var items = sh.steps.map(function (st, i) {
            var finished = st.state === "done" || st.state === "verified" || st.state === "skipped";
            if (finished) doneN++; else if (nextIdx < 0) nextIdx = i;
            var late = L.isLate(l, sh, i, now);
            if (late) lateN++;
            var due = L.stepDue(l, sh, i);
            var cls = finished ? "done" : late ? "late" : st.state === "in_progress" ? "now" : "todo";
            var dot = finished ? "&#10003;" : late ? "!" : String(i + 1);
            var when = finished ? "Complete" : late ? "Late · new date " + UI.when(st.revisedAt || now) : st.state === "in_progress" ? "In progress" + (due ? " · due " + UI.when(due) : "") : (due ? "Due " + UI.when(due) : "Waiting");
            return "<li class=\"" + cls + "\"><div><span class=\"track-dot\" aria-hidden=\"true\">" + dot + "</span><span class=\"track-body\"><span class=\"title\">" + esc(st.name) + "</span><span class=\"meta\">" + esc(when) + "</span></span></div></li>";
          }).join("");
          var pct = sh.steps.length ? Math.round(doneN * 100 / sh.steps.length) : 0;
          var route = L.STAGES.map(function (name, i) {
            var cls = i < stageN ? "done" : i === stageN ? "now" : "";
            return "<li class=\"" + cls + "\"" + (i === stageN ? " aria-current=\"step\"" : "") + ">" + UI.stageGlyph(name) + "<span>" + esc(name) + "</span></li>";
          }).join("");
          var next = nextIdx >= 0 ? sh.steps[nextIdx] : null;
          var nextDue = nextIdx >= 0 ? L.stepDue(l, sh, nextIdx) : null;
          return "<section class=\"dash-card trk-card\"><div class=\"dash-row\"><h2>Shipment " + (si + 1) + (l.shipments.length > 1 ? " of " + l.shipments.length : "") + "</h2>" +
            "<span class=\"status\">" + esc(L.STAGES[stageN]) + "</span></div>" +
            "<ol class=\"route\" aria-label=\"Journey\">" + route + "</ol>" +
            "<div class=\"dash-row\"><span class=\"dash-sub\">" + doneN + " of " + sh.steps.length + " steps done</span><b class=\"num\">" + pct + "%</b></div>" +
            "<div class=\"dash-meter dash-green\" role=\"progressbar\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"" + pct + "\" aria-label=\"Steps done\"><i style=\"width:" + pct + "%\"></i></div>" +
            (next ? "<div class=\"trk-next\"><span class=\"dash-label\">Next</span><b>" + esc(next.name) + "</b>" + (nextDue ? "<span class=\"dash-sub\">Expected " + UI.when(nextDue) + "</span>" : "") + "</div>" : "<div class=\"trk-next\"><span class=\"dash-label\">Next</span><b>All steps complete</b></div>") +
            UI.fold("<strong>All steps</strong>", "<ol class=\"track\">" + items + "</ol>", open) + "</section>";
        }).join("");
        return { html: cards, late: lateN };
    }
    function figures(l) {
      var p = L.projection(l);
      var b = profitBounds(l);
      var u = Store.user();
      var held = mine(l, u.id);
      var rowOf = function (pair) { return "<div><span>" + pair[0] + "</span><span class=\"num\">" + pair[1] + "</span></div>"; };
      var block = function (title, lines) { return UI.group(title, "<div class=\"statement\">" + lines.map(rowOf).join("") + "</div>"); };
      var out = "";
      if (held > 0) out += "<div class=\"banner\" role=\"status\"><strong>You have invested " + L.formatUsd(held) + " in this shipment.</strong></div>";
      out += block("Terms", [
        ["Goods sourced from", UI.esc(UI.cname(l.source))],
        ["Sold to a buyer in", UI.esc(UI.cname(l.buyer))],
        ["Minimum investment", L.formatUsd(l.minimum)],
        ["Your share of profit", l.investorShare + "%"],
        ["Expected return", Math.round(p.roiYear * 1000) / 10 + "% a year (" + Math.round(p.roiCycle * 1000) / 10 + "% over " + p.cycle + " days)"],
        ["Platform service charge", "1% of invoice value, only if the trade makes a profit"]
      ]);
      out += block("Funding", [["Funding target", L.formatUsd(p.target)], ["Raised", L.formatUsd(L.raised(l))], ["Remaining", L.formatUsd(Math.max(0, L.remaining(l)))]]);
      out += block("Expected result", [
        ["Expected sale", L.formatUsd(p.expectedSale)],
        ["Expected profit", L.formatUsd(b.plan)],
        ["If the sale is 10% lower", L.formatUsd(b.low)],
        ["If the sale is 10% higher", L.formatUsd(b.high)]
      ]);
      if (l.status === "completed") {
        var sale = l.shipments.reduce(function (s, sh) { return s + (sh.proceeds || 0); }, 0);
        var cost = l.shipments.reduce(function (s, sh) { return s + (sh.costActual || 0); }, 0);
        var settled = L.settlement({ saleCents: sale, costCents: cost, investorSharePct: l.investorShare, contributions: l.contributions, shareholderListing: false });
        var mineRow = settled.rows.filter(function (r) { return r.userId === u.id; })[0];
        out += block("How the profit was worked out", [
          ["Sale price", L.formatUsd(settled.sale)], ["Cost of goods", L.formatUsd(settled.costs)], ["Gross profit", L.formatUsd(settled.gross)],
          ["Platform service charge (1% of invoice)", L.formatUsd(settled.fee)], ["Net profit", L.formatUsd(settled.net)], ["Shared among investors", L.formatUsd(settled.pool)]
        ]);
        if (mineRow) out += block("Your result", [["Profit received", L.formatUsd(mineRow.profit)]]);
      }
      out += "<p class=\"bento-k\">Profit-sharing: profit is shared as agreed, and losses are borne by the people who put in capital. Returns are estimates, not guarantees, and you can lose some or all of what you invest.</p>";
      return "<div class=\"stack\">" + out + "</div>";
    }
    var STAGE_NOTES = ["Funds are collected from investors.", "Goods are bought and checked.", "Goods are loaded at the port.", "The shipment is at sea.", "Cleared by customs.", "Goods are sold to the buyer.", "Profit is paid out to wallets."];
    function stageTimeline(l) {
      return l.shipments.map(function (sh, si) {
        var n = L.shipmentStage(l, sh);
        var items = L.STAGES.map(function (name, i) {
          var cls = i < n || (l.status === "completed") ? "done" : i === n ? "now" : "todo";
          var dot = cls === "done" ? "&#10003;" : String(i + 1);
          var state = cls === "done" ? "Done" : cls === "now" ? "In progress" : "Upcoming";
          return "<li class=\"" + cls + "\"><div><span class=\"track-dot\" aria-hidden=\"true\">" + dot + "</span><span class=\"track-body\"><span class=\"title\">" + UI.esc(name) + "</span><span class=\"meta\">" + STAGE_NOTES[i] + "</span></span><span class=\"track-state status\">" + state + "</span></div></li>";
        }).join("");
        return "<section class=\"stack\">" + (l.shipments.length > 1 ? "<h2>Shipment " + (si + 1) + "</h2>" : "") + "<ol class=\"track\">" + items + "</ol></section>";
      }).join("");
    }

    UI.screen({
      id: "listing",
      auth: "investor",
      section: "ship",
      back: true,
      title: function (p) {
        var l = Store.listing(p.id);
        if (!l) return "Not found";
        var u = Store.user();
        if (!(l.status === "live" || mine(l, u.id) > 0)) return "Not available";
        return l.name;
      },
      test: function (h) { var m = /^#\/listing\/([\w-]+)$/.exec(h); return m ? { id: m[1] } : null; },
      render: function (stage, params) {
        var l = Store.listing(params.id);
        if (!l) { stage.innerHTML = "<div class=\"column\"><div class=\"banner banner-loss\" role=\"alert\"><strong>That shipment was not found.</strong><button class=\"btn btn-secondary\" type=\"button\" data-go=\"#/shipments\">Try again</button></div></div>"; return; }
        if (openId !== l.id) { tab = "overview"; openId = l.id; }
        var u = Store.user();
        var allowed = l.status === "live" || mine(l, u.id) > 0;
        if (!allowed) { stage.innerHTML = "<div class=\"column\"><h1>Not available</h1><p>This shipment is not open.</p></div>"; return; }
        var target = L.fundingTarget(l);
        var have = L.raised(l);
        var pct = target ? Math.round(have / target * 100) : 0;
        var tabs = ["overview", "shipments", "figures", "timeline"].map(function (id) {
          var label = id[0].toUpperCase() + id.slice(1);
          return "<button type=\"button\" role=\"tab\" data-act=\"tab\" data-tab=\"" + id + "\" aria-selected=\"" + (tab === id) + "\">" + label + "</button>";
        }).join("");
        var body = "";
        if (tab === "overview") {
          body = "<div class=\"bento\">" +
            "<div class=\"bento-cell bento-wide\"><p class=\"bento-k\">Route</p><p>" + UI.esc(UI.cname(l.source)) + " to " + UI.esc(UI.cname(l.buyer)) + " · " + UI.esc(l.category) + "</p></div>" +
            "<div class=\"bento-cell\"><p class=\"bento-k\">Raised</p><p class=\"bento-v num\">" + L.formatUsd(have) + "</p><p class=\"bento-k\">of " + L.formatUsd(target) + "</p>" +
            "<div class=\"progress\" role=\"progressbar\" aria-valuenow=\"" + pct + "\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-label=\"Funded\"><i data-pct=\"" + pct + "\"></i></div></div>" +
            "<div class=\"bento-cell\"><p class=\"bento-k\">Funding</p><p class=\"bento-v\">" + expireLine(l) + "</p></div>" +
            "<div class=\"bento-cell bento-wide\">" + profitRange(l) + "</div></div>" +
            (l.shareholderListing ? "<p>This is a shareholder listing" + (l.waiver ? ", and the manager deposit was waived." : ".") + " The shareholder share of treasury profit is " + l.shareholderSharePct + "%.</p>" : "") +
            (l.status === "live" && L.remaining(l) > 0 ? "<a class=\"btn btn-primary btn-block\" href=\"#/invest/" + l.id + "\" data-go=\"#/invest/" + l.id + "\">Invest</a>" : "");
        }
        if (tab === "shipments") body = "<div class=\"stack\">" + shipmentCards(l, true).html + "</div>";
        if (tab === "figures") body = figures(l);
        if (tab === "timeline") body = stageTimeline(l);
        stage.innerHTML = "<a class=\"lead\" href=\"#/listing/" + l.id + "\"><p class=\"lead-title\">" + UI.esc(l.name) + "</p></a><div class=\"column\"><div class=\"tabs\" role=\"tablist\">" + tabs + "</div>" + body + "</div>";
        stage.querySelectorAll("[data-pct]").forEach(function (el) { el.style.width = el.getAttribute("data-pct") + "%"; });
      },
      on: function (act, el) { if (act === "tab") { tab = el.getAttribute("data-tab"); UI.go("#/listing/" + openId); } }
    });

    UI.screen({
      id: "invest",
      auth: "investor",
      task: true,
      back: true,
      title: function (p) {
        var l = Store.listing(p.id);
        var u = Store.user();
        if (!l) return "Not found";
        if (!u.application || u.application.status !== "approved") return "Confirm investment";
        return "Invest in " + l.name;
      },
      test: function (h) { var m = /^#\/invest\/([\w-]+)$/.exec(h); return m ? { id: m[1] } : null; },
      actions: function () { return "<button class=\"btn btn-primary\" type=\"button\" data-act=\"confirm\">Confirm investment</button>"; },
      render: function (stage, params) {
        var l = Store.listing(params.id);
        var u = Store.user();
        if (!l) { stage.innerHTML = "<div class=\"column\"><h1>Not found</h1></div>"; return; }
        if (u.application.status !== "approved") {
          stage.innerHTML = "<div class=\"column\"><h1>Confirm investment</h1><p class=\"muted\">Finish verification before you invest.</p></div>";
          return;
        }
        var bounds = L.investBounds(l.minimum, L.remaining(l));
        var help = bounds.exact ? "The remaining amount is " + L.formatUsd(bounds.exact) + ". Invest exactly that amount." : "Minimum " + L.formatUsd(bounds.min) + ". At most " + L.formatUsd(bounds.max) + ". At most 2 decimals.";
        var expect = "";
        stage.innerHTML = "<div class=\"column\"><h1>Invest in " + UI.esc(l.name) + "</h1><p class=\"muted\">" + help + "</p>" +
          "<label class=\"field\" for=\"amount\"><span>Amount</span><span class=\"amount\"><b>$</b><input id=\"amount\" inputmode=\"decimal\" aria-describedby=\"amount-help" + (errors.amount ? " amount-err" : "") + "\"></span>" +
          "<span class=\"muted\" id=\"amount-help\">" + UI.esc(help) + "</span>" +
          (errors.amount ? "<span class=\"err\" id=\"amount-err\">" + UI.esc(errors.amount) + "</span>" : "") +
          (errors.topup ? "<a href=\"#/top-up\" data-go=\"#/top-up\">Top up</a>" : "") +
          "</label><p id=\"expect\" class=\"muted\">Enter an amount to see the expected profit.</p></div>";
        var input = document.getElementById("amount");
        input.addEventListener("input", function () {
          var parsed = L.usdToCents(input.value);
          var line = document.getElementById("expect");
          if (!parsed.ok) { line.textContent = "Enter an amount to see the expected profit."; return; }
          line.innerHTML = UI.money(L.expectedFor(l, parsed.cents), "expected");
        });
      },
      on: function (act, el, params) {
        if (act !== "confirm") return;
        var input = document.getElementById("amount");
        var res = Store.invest(params.id, input ? input.value : "");
        errors = {};
        if (!res.ok) { errors.amount = res.error; errors.topup = res.topup; UI.go("#/invest/" + params.id); return; }
        UI.go("#/receipt/" + params.id);
      }
    });

    UI.screen({
      id: "receipt",
      title: "Investment confirmed",
      auth: "investor",
      task: true,
      test: function (h) { var m = /^#\/receipt\/([\w-]+)$/.exec(h); return m ? { id: m[1] } : null; },
      actions: function (params) { return "<a class=\"btn btn-primary\" href=\"#/track/" + params.id + "\" data-go=\"#/track/" + params.id + "\">Track this shipment</a>"; },
      render: function (stage, params) {
        var rec = Store.state.lastReceipt;
        var l = Store.listing(params.id);
        stage.innerHTML = "<div class=\"column\"><h1>Investment confirmed</h1><p>You invested " + (rec ? L.formatUsd(rec.amount) : "") + " in " + UI.esc(l ? l.name : "this shipment") + ".</p><p class=\"muted\">" + UI.when(rec && rec.at) + ". This is final unless the shipment is cancelled before the goods are bought.</p></div>";
      }
    });

    UI.screen({
      id: "portfolio",
      title: "Your shipments",
      auth: "investor",
      section: "home",
      back: true,
      test: function (h) { return h === "#/portfolio" ? {} : null; },
      render: function (stage) {
        var u = Store.user();
        var tabs = [["active", "Active"], ["completed", "Completed"], ["ended", "Ended"]].map(function (t) {
          return "<button type=\"button\" data-act=\"port\" data-tab=\"" + t[0] + "\" aria-selected=\"" + (port === t[0]) + "\">" + t[1] + "</button>";
        }).join("");
        var rows = Store.state.listings.filter(function (l) {
          if (mine(l, u.id) <= 0 && !(l.status === "completed" && mine(l, u.id) > 0)) return false;
          if (port === "active") return l.status === "live" || l.status === "settlement_proposed";
          if (port === "completed") return l.status === "completed";
          return l.status === "cancelled" || l.status === "withdrawn";
        });
        var NOTES = ["Collecting funds from investors.", "Goods are bought and checked.", "Goods are loaded at the port.", "Your shipment is at sea.", "Cleared by customs.", "Goods sold. Settlement is next.", "Profit paid out to your wallet."];
        var list = rows.length ? rows.map(function (l) {
          var held = mine(l, u.id);
          var done = l.status === "completed";
          var n = done ? 6 : Math.max(0, Math.min(6, L.listingStage(l)));
          var pct = done ? 100 : Math.round(n * 100 / 6);
          var fig = "<div class=\"held-fig\"><span class=\"bento-k\">Stage</span><b class=\"num\">" + (n + 1) + "<small>/7</small></b></div>";
          if (done) {
            var sale = l.shipments.reduce(function (s, sh) { return s + (sh.proceeds || 0); }, 0);
            var cost = l.shipments.reduce(function (s, sh) { return s + (sh.costActual || 0); }, 0);
            var settled = L.settlement({ saleCents: sale, costCents: cost, investorSharePct: l.investorShare, contributions: l.contributions, shareholderListing: false });
            var slice = settled.rows.filter(function (r) { return r.userId === u.id; })[0];
            fig = "<div class=\"held-fig\"><span class=\"bento-k\">Profit received</span><b class=\"num\">" + (slice ? L.formatUsd(slice.profit) : "—") + "</b></div>";
          }
          var href = done ? "#/statement/" + l.id : "#/track/" + l.id;
          return "<a class=\"held st" + n + "\" href=\"" + href + "\" data-go=\"" + href + "\"><div class=\"held-in\">" +
            "<div class=\"held-head\"><div class=\"bento-title\"><span class=\"bento-name\">" + UI.esc(l.name) + "</span><span class=\"bento-k\">" + UI.esc(UI.cname(l.source)) + " to " + UI.esc(UI.cname(l.buyer)) + "</span></div>" +
            "<span class=\"held-chip\">" + UI.stageGlyph(L.STAGES[n]) + UI.esc(L.STAGES[n]) + "</span></div>" +
            "<div class=\"held-kpis\"><div class=\"held-fig\"><span class=\"bento-k\">You invested</span><b class=\"num\">" + L.formatUsd(held) + "</b></div>" + fig + "</div>" +
            "<div class=\"progress\" role=\"progressbar\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"" + pct + "\" aria-label=\"Journey\"><i style=\"width:" + pct + "%\"></i></div>" +
            "<p class=\"bento-k\">" + NOTES[n] + "</p></div><span class=\"held-mot\" aria-hidden=\"true\"></span></a>";
        }).join("") : "<div class=\"empty\"><p>Nothing is in this list yet.</p><a href=\"#/shipments\" data-go=\"#/shipments\">See shipments</a></div>";
        stage.innerHTML = "<div class=\"column\"><h1>Your shipments</h1><div class=\"tabs\">" + tabs + "</div>" + list + "</div>";
      },
      on: function (act, el) { if (act === "port") { port = el.getAttribute("data-tab"); UI.go("#/portfolio"); } }
    });

    UI.screen({
      id: "track",
      title: function (p) { var l = Store.listing(p.id); return l ? l.name : "Not found"; },
      auth: "investor",
      back: true,
      section: "home",
      test: function (h) { var m = /^#\/track\/([\w-]+)$/.exec(h); return m ? { id: m[1] } : null; },
      render: function (stage, params) {
        var l = Store.listing(params.id);
        var u = Store.user();
        if (!l) { stage.innerHTML = "<div class=\"column\"><h1>Not found</h1></div>"; return; }
        var now = Store.state.now;
        var held = mine(l, u.id);
        var esc = UI.esc;
        var overall = L.listingStage(l);
        var built = shipmentCards(l, false);
        var lateN = built.late;
        var cards = built.html;
        var done = l.status === "completed";
        var banner = lateN ? "<div class=\"banner banner-warning\" role=\"status\"><strong>" + lateN + (lateN === 1 ? " step is" : " steps are") + " running late.</strong><p>The manager has given a new date. Your money stays safe in escrow.</p></div>" : "";
        var hero = "<section class=\"dash-hero dash-green\"><div class=\"dash-hero-main\"><p class=\"dash-label\">" + esc(UI.cname(l.source)) + " → " + esc(UI.cname(l.buyer)) + "</p>" +
          "<p class=\"dash-hero-value\" style=\"font-size:1.6rem\">" + esc(l.name) + "</p>" +
          "<p class=\"dash-delta\">" + esc(done ? "Settled" : L.STAGES[overall]) + "</p></div></section>";
        var tiles = "<div class=\"dash-grid\">" +
          D().tile({ label: "You invested", value: L.formatUsd(held), sub: l.shipments.length + (l.shipments.length === 1 ? " shipment" : " shipments"), tone: "green", icon: "wallet" }) +
          D().tile({ label: done ? "Result" : "Expected return", value: L.formatUsd(L.expectedFor(l, held)), sub: done ? "See statement" : "After settlement", tone: "blue", icon: "chart" }) + "</div>";
        var foot = "<div class=\"stack\"><a class=\"btn btn-secondary btn-block\" href=\"#/listing/" + l.id + "\" data-go=\"#/listing/" + l.id + "\">Shipment details</a>" +
          (done ? "<a class=\"btn btn-primary btn-block\" href=\"#/statement/" + l.id + "\" data-go=\"#/statement/" + l.id + "\">View statement</a>" : "") + "</div>";
        stage.innerHTML = "<div class=\"column stack\">" + hero + tiles + banner + cards + foot + "</div>";
      }
    });

    UI.screen({
      id: "statement",
      title: function (p) {
        var l = Store.listing(p.id);
        if (!l || l.status !== "completed") return "No statement yet";
        return l.name;
      },
      auth: "investor",
      back: true,
      section: "home",
      test: function (h) { var m = /^#\/statement\/([\w-]+)$/.exec(h); return m ? { id: m[1] } : null; },
      render: function (stage, params) {
        var l = Store.listing(params.id);
        var u = Store.user();
        if (!l || l.status !== "completed") { stage.innerHTML = "<div class=\"column\"><h1>No statement yet</h1><p>A statement appears after settlement.</p></div>"; return; }
        var sale = l.shipments.reduce(function (s, sh) { return s + (sh.proceeds || 0); }, 0);
        var cost = l.shipments.reduce(function (s, sh) { return s + (sh.costActual || 0); }, 0);
        var holders = (Store.state.users || []).filter(function (person) { return person.shareholder === true; }).map(function (person) { return person.id; });
        var settled = L.settlement({
          saleCents: sale, costCents: cost, investorSharePct: l.investorShare, contributions: l.contributions,
          shareholderListing: !!l.shareholderListing, shareholderSharePct: l.shareholderSharePct,
          buyerShareholderId: l.buyerShareholderId, holders: holders
        });
        var mineRow = settled.rows.filter(function (r) { return r.userId === u.id; })[0];
        var others = settled.rows.filter(function (r) { return r.kind === "investor" && r.userId !== u.id; }).length;
        var kind = mineRow && mineRow.profit < 0 ? "loss" : "gain";
        var split = "";
        if (l.shareholderListing) {
          split = "<div><span>Treasury profit</span><span class=\"num\">" + L.formatUsd(settled.treasuryProfit) + "</span></div>" +
            "<div><span>Shareholder share</span><span class=\"num\">" + L.formatUsd(settled.shareholder) + "</span></div>" +
            "<div><span>Reserve fund</span><span class=\"num\">" + L.formatUsd(settled.reserve) + "</span></div>" +
            settled.holders.map(function (h) {
              return "<div><span>Shareholder</span><span class=\"num\">" + L.formatUsd(h.amount) + "</span></div>";
            }).join("");
        }
        var row = function (a, b) { return "<div><span>" + a + "</span><span class=\"num\">" + b + "</span></div>"; };
        stage.innerHTML = "<div class=\"column\"><h1>" + UI.esc(l.name) + "</h1>" +
          "<div class=\"total statement\"><div class=\"total\"><span>My payout</span><span>" + (mineRow ? UI.money(mineRow.profit, kind) : "") + "</span></div></div>" +
          UI.group("Sale and costs", "<div class=\"statement\">" + row("Sale price", L.formatUsd(settled.sale)) + row("Costs", L.formatUsd(settled.costs)) + row("Gross", L.formatUsd(settled.gross)) + "</div>") +
          UI.group("Fees and shares", "<div class=\"statement\">" + row("Service fee", L.formatUsd(settled.fee)) + row("Net", L.formatUsd(settled.net)) + row("Manager share", L.formatUsd(settled.managerCut)) + row("Pool", L.formatUsd(settled.pool)) +
            "<div><span>Other investors</span><span>" + others + " anonymised</span></div></div>") +
          (l.shareholderListing ? UI.fold("<strong>Shareholder split</strong>", "<div class=\"statement\">" + split + "</div>") : "") + "</div>";
      }
    });

    UI.screen({
      id: "wallet",
      title: "Wallet",
      auth: "any",
      section: "wallet",
      test: function (h) { return h === "#/wallet" ? {} : null; },
      render: function (stage) {
        var u = Store.user();
        if (u.role !== "investor" && u.role !== "manager") { UI.go(UI.homeFor(u)); return; }
        var bal = Store.bal("user:" + u.id + ":wallet");
        var held = Store.state.withdrawals.filter(function (w) { return w.userId === u.id && w.status === "pending"; }).reduce(function (s, w) { return s + w.amount; }, 0);
        var account = "user:" + u.id + ":wallet";
        var running = 0;
        var cash = [];
        Store.state.entries.forEach(function (e) {
          if (e.account !== account) return;
          running += e.amount;
          var memo = e.memo || "";
          var kind = "";
          if (memo === "Top up" || memo === "Gateway top-up" || memo === "Withdrawal declined" || memo === "Payout failed") kind = "Deposit";
          else if (memo === "Withdrawal") kind = "Withdrawal";
          if (!kind) return;
          cash.push({ kind: kind, at: e.at, amount: e.amount, balance: running, returned: memo === "Withdrawal declined" || memo === "Payout failed" });
        });
        cash.reverse();
        var history = cash.length ? cash.map(function (row) {
          var signed = (row.amount < 0 ? "−" : "+") + L.formatUsd(Math.abs(row.amount));
          return "<div class=\"row\"><span class=\"title\">" + row.kind + (row.returned ? " · returned" : "") + "</span><span class=\"meta\">" + UI.when(row.at) + " · " + signed + "</span><span class=\"end num\">" + L.formatUsd(row.balance) + "</span></div>";
        }).join("") : "<p>No deposits or withdrawals yet.</p>";
        var lines = Store.state.entries.filter(function (e) { return e.account === account; }).slice(-12).reverse();
        if (walletFilter !== "all") lines = lines.filter(function (e) { return (e.memo || "").toLowerCase().indexOf(walletFilter) !== -1; });
        var list = lines.length ? lines.map(function (e) {
          return "<div class=\"kpi\"><span>" + UI.esc(e.memo || "Movement") + "</span>" + UI.money(e.amount, e.amount < 0 ? "loss" : "gain") + "</div>";
        }).join("") : "<p>No movements of this kind yet.</p>";
        var withdrawals = Store.state.withdrawals.filter(function (w) { return w.userId === u.id; });
        var wrows = withdrawals.length ? withdrawals.map(function (w) {
          return "<a class=\"row\" href=\"#/withdrawal/" + w.id + "\" data-go=\"#/withdrawal/" + w.id + "\"><span class=\"title\">" + L.formatUsd(w.amount) + "</span><span class=\"meta\">" + UI.when(w.at) + "</span><span class=\"end status\">" + UI.esc(w.status) + "</span></a>";
        }).join("") : "<div class=\"empty\"><p>You have no withdrawals yet.</p><a href=\"#/withdraw\" data-go=\"#/withdraw\">Withdraw</a></div>";
        stage.innerHTML = "<div class=\"column\"><h1>Wallet</h1><div class=\"stack\">" +
          "<section class=\"panel\"><p class=\"muted\">Available</p><p class=\"figure num\">" + L.formatUsd(bal) + "</p></section>" +
          "<section class=\"panel\"><p class=\"muted\">Held for withdrawal</p><p class=\"figure num\">" + L.formatUsd(held) + "</p></section>" +
          "<section class=\"panel\"><h2>Transactions</h2><p class=\"muted\">Deposits and withdrawals. The amount on the right is the balance after each one.</p>" + history + "</section>" +
          "<section class=\"panel\"><h2>Movements</h2><div class=\"tabs\"><button type=\"button\" data-act=\"wf\" data-tab=\"all\" aria-selected=\"" + (walletFilter === "all") + "\">All</button><button type=\"button\" data-act=\"wf\" data-tab=\"invest\" aria-selected=\"" + (walletFilter === "invest") + "\">Investments</button><button type=\"button\" data-act=\"wf\" data-tab=\"withdraw\" aria-selected=\"" + (walletFilter === "withdraw") + "\">Withdrawals</button></div>" + list + "</section>" +
          "<section class=\"panel\"><h2>Withdrawals</h2>" + wrows + "</section></div>" +
          "<div class=\"btn-pair\"><a class=\"btn btn-primary\" href=\"#/top-up\" data-go=\"#/top-up\">Add money</a><a class=\"btn btn-secondary\" href=\"#/withdraw\" data-go=\"#/withdraw\">Withdraw</a></div></div>";
      },
      on: function (act, el) { if (act === "wf") { walletFilter = el.getAttribute("data-tab"); UI.go("#/wallet"); } }
    });

    UI.screen({
      id: "topup",
      title: "Add money",
      auth: "any",
      task: true,
      back: true,
      test: function (h) { return h === "#/top-up" ? {} : null; },
      actions: function () {
        var u = Store.user();
        if (!u || moneyBlock(u, "topup", "Finish verification before you add money.")) return "";
        return "<button class=\"btn btn-primary\" type=\"button\" data-act=\"pay\">Continue to payment</button>";
      },
      render: function (stage) {
        var u = Store.user();
        var block = u ? moneyBlock(u, "topup", "Finish verification before you add money.") : "Finish verification before you add money.";
        if (block) { stage.innerHTML = "<div class=\"column\"><h1>Add money</h1><p>" + UI.esc(block) + "</p></div>"; return; }
        stage.innerHTML = "<div class=\"column\"><h1>Add money</h1><p class=\"muted\">Minimum $1.00. At most 2 decimals. The full amount is credited.</p>" +
          "<label class=\"field\" for=\"amount\"><span>Amount</span><span class=\"amount\"><b>$</b><input id=\"amount\" inputmode=\"decimal\" aria-describedby=\"amount-help" + (errors.top ? " top-err" : "") + "\"></span><span class=\"muted\" id=\"amount-help\">Minimum $1.00. At most 2 decimals.</span>" +
          (errors.top ? "<span class=\"err\" id=\"top-err\">" + UI.esc(errors.top) + "</span>" : "") + "</label></div>";
      },
      on: function (act) {
        if (act !== "pay") return;
        var raw = document.getElementById("amount").value;
        var parsed = L.usdToCents(raw);
        errors = {};
        if (!parsed.ok || parsed.cents < 100) { errors.top = parsed.ok ? "Error: the minimum is $1.00." : parsed.error; UI.go("#/top-up"); return; }
        gw = "gw-" + Date.now();
        UI.openSheet("<div class=\"gateway\"><header><strong>Secure payment</strong></header><p class=\"figure num\">" + L.formatUsd(parsed.cents) + "</p><p class=\"muted\">Card</p><p class=\"panel\">Card number</p><button class=\"btn btn-primary\" type=\"button\" data-act=\"gw-pay\" data-cents=\"" + parsed.cents + "\">Pay</button><button class=\"btn btn-secondary\" type=\"button\" data-act=\"gw-fail\">Fail</button></div>");
      }
    });

    UI.screen({
      id: "withdraw",
      title: "Withdraw",
      auth: "any",
      task: true,
      back: true,
      test: function (h) { return h === "#/withdraw" ? {} : null; },
      actions: function () {
        var u = Store.user();
        if (!u || moneyBlock(u, "withdraw", "Finish verification before you withdraw.")) return "";
        return "<button class=\"btn btn-primary\" type=\"button\" data-act=\"send\">Request withdrawal</button>";
      },
      render: function (stage) {
        var u = Store.user();
        var block = u ? moneyBlock(u, "withdraw", "Finish verification before you withdraw.") : "Finish verification before you withdraw.";
        if (block) { stage.innerHTML = "<div class=\"column\"><h1>Withdraw</h1><p>" + UI.esc(block) + "</p></div>"; return; }
        stage.innerHTML = "<div class=\"column\"><h1>Withdraw</h1><p class=\"muted\">USD 10,000 or more needs the owner to approve. The amount is held until then.</p><form class=\"stack\" id=\"wd\">" +
          UI.group("Amount", UI.field("amount", "Amount", "<span class=\"amount\"><b>$</b><input id=\"amount\" name=\"amount\" inputmode=\"decimal\"></span>", errors.amount)) +
          UI.group("Bank details",
          UI.field("country", "Bank country", "<select id=\"country\" name=\"country\"><option value=\"\">Choose</option>" + UI.countryOpts(u.country) + "</select>", errors.country) +
            UI.blockedNote() +
            UI.field("bank", "Bank name", "<input id=\"bank\" name=\"bank\">", errors.bank) +
            UI.field("holder", "Account holder", "<input id=\"holder\" name=\"holder\" value=\"" + UI.esc(u.name) + "\">", errors.holder) +
            UI.field("account", "IBAN or account number", "<input id=\"account\" name=\"account\" class=\"num\">", errors.account) +
            UI.field("swift", "SWIFT / BIC", "<input id=\"swift\" name=\"swift\" class=\"num\">", errors.swift)) +
          "</form></div>";
      },
      on: function (act) {
        if (act !== "send") return;
        var form = document.getElementById("wd");
        var data = new FormData(form);
        var res = Store.withdraw({
          amount: data.get("amount"), country: data.get("country"), bank: data.get("bank"),
          holder: data.get("holder"), account: data.get("account"), swift: data.get("swift")
        });
        errors = {};
        if (!res.ok) { errors = res.errors || { amount: res.error }; UI.go("#/withdraw"); return; }
        UI.go("#/withdrawal/" + res.id);
      }
    });

    UI.screen({
      id: "withdrawal",
      title: function (p) {
        var u = Store.user();
        var w = Store.state.withdrawals.filter(function (row) { return row.id === p.id; })[0];
        if (!w || !u || w.userId !== u.id) return "Not found";
        return "Withdrawal";
      },
      auth: "any",
      back: true,
      section: "wallet",
      test: function (h) { var m = /^#\/withdrawal\/([\w-]+)$/.exec(h); return m ? { id: m[1] } : null; },
      render: function (stage, params) {
        var w = Store.state.withdrawals.filter(function (row) { return row.id === params.id; })[0];
        var u = Store.user();
        if (!w || w.userId !== u.id) { stage.innerHTML = "<div class=\"column\"><h1>Not found</h1></div>"; return; }
        var banner = "";
        if (w.status === "failed") banner = "<div class=\"banner banner-success\" role=\"status\"><strong>The payout failed and the money is back in your wallet.</strong></div>";
        if (w.status === "pending") banner = "<div class=\"banner\" role=\"status\"><strong>This withdrawal is held.</strong><span class=\"status\">" + (w.amount >= 1000000 ? "Needs the owner" : "Pending") + "</span></div>";
        if (w.status === "paid") banner = "<div class=\"banner\" role=\"status\"><strong>This withdrawal was paid.</strong></div>";
        if (w.status === "declined") banner = "<div class=\"banner\" role=\"status\"><strong>This withdrawal was declined.</strong><p>" + UI.esc(w.reason || "") + "</p></div>";
        stage.innerHTML = "<div class=\"column\"><h1>Withdrawal</h1>" + banner + "<p class=\"figure num\">" + L.formatUsd(w.amount) + "</p><p>" + UI.esc(w.bank) + " · " + UI.esc(UI.cname(w.country)) + "</p><p class=\"num\">" + UI.esc(w.account) + "</p><p class=\"muted\">" + UI.when(w.at) + (w.reason ? " · " + UI.esc(w.reason) : "") + "</p></div>";
      }
    });

    var gwHandler = UI.screen;
    /* Gateway buttons are outside the screen form. Listen through the top-up screen while the sheet is open. */
    var top = null;
    root.addEventListener ? null : null;
  }

  /* The sheet buttons use data-act, handled by the current screen. Extend top-up. */
  var previous = root.ShehnatInvestor;
  root.ShehnatInvestor = {
    register: function (UI) {
      register(UI);
      var screensNeed = true;
      document.addEventListener("click", function (ev) {
        var el = ev.target.closest("[data-act='gw-pay'], [data-act='gw-fail']");
        if (!el) return;
        var Store = root.ShehnatStore;
        var UI2 = root.ShehnatUI;
        if (el.getAttribute("data-act") === "gw-fail") {
          UI2.closeSheet();
          UI2.toast("The payment failed. Your wallet was not changed.");
          return;
        }
        var res = Store.topup(Number(el.getAttribute("data-cents")) / 100, "gw-" + el.getAttribute("data-cents") + "-" + Date.now());
        UI2.closeSheet();
        if (!res.ok) { UI2.toast(res.error || "The payment failed."); return; }
        UI2.go("#/wallet");
      });
    }
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
