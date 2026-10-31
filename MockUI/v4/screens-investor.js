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

    function mine(listing, id) {
      return (listing.contributions || []).filter(function (c) { return c.userId === id; }).reduce(function (s, c) { return s + c.amount; }, 0);
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
      return days === 0 ? "Expiring today" : "Expiring in " + days + (days === 1 ? " day" : " days");
    }
    function bentoCells(l) {
      var target = L.fundingTarget(l);
      var have = L.raised(l);
      var left = L.remaining(l);
      var pct = target ? Math.min(100, Math.round(have / target * 100)) : 0;
      var almost = l.status === "live" && left > 0 && target > 0 && left / target <= 0.1;
      return "<div class=\"bento-cell\"><span class=\"bento-k\">Still open</span><span class=\"bento-v num\">" + L.formatUsd(left) + "</span>" +
        "<span class=\"progress\" role=\"progressbar\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"" + pct + "\" aria-label=\"Funded\"><i style=\"width:" + pct + "%\"></i></span></div>" +
        "<div class=\"bento-cell\"><span class=\"bento-k\">Funding</span><span class=\"bento-v\">" + expireLine(l) + "</span>" +
        (almost ? "<span class=\"bento-k\">Almost funded</span>" : "") + "</div>" +
        "<div class=\"bento-cell bento-wide\">" + profitRange(l) + "</div>";
    }
    function row(l, href) {
      return "<a class=\"bento\" href=\"" + href + "\" data-go=\"" + href + "\">" +
        "<div class=\"bento-cell bento-wide\"><span class=\"bento-name\">" + UI.esc(l.name) + "</span><span class=\"bento-k\">" + UI.esc(UI.cname(l.source)) + " to " + UI.esc(UI.cname(l.buyer)) + "</span></div>" +
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
          stage.innerHTML = "<div class=\"column\">" + gate(u) + "<div class=\"empty\"><p>No shipment is open right now.</p><a href=\"#/shipments\" data-go=\"#/shipments\">See shipments</a></div></div>";
          return;
        }
        stage.innerHTML = gate(u) + "<a class=\"lead\" href=\"#/listing/" + lead.id + "\" data-go=\"#/listing/" + lead.id + "\"><p class=\"lead-title\">" + UI.esc(lead.name) + "</p></a><div class=\"column\"><a href=\"#/portfolio\" data-go=\"#/portfolio\">Your shipments</a>" + (next ? row(next, "#/listing/" + next.id) : "") + "</div>";
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
        var rows = liveRows().filter(function (l) {
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
        stage.innerHTML = "<div class=\"column\"><h1>Shipments</h1><details class=\"fold\"" + (nActive ? " open" : "") + "><summary>Filters" + (nActive ? " (" + nActive + ")" : "") + "</summary><form class=\"fold-body stack\">" +
          UI.field("category", "Category", "<select id=\"category\" name=\"category\"><option value=\"\">Any</option><option>Food</option><option>Building</option><option>Textiles</option><option>Energy</option><option>Other</option></select>", "") +
          UI.field("source", "Sourced from", "<select id=\"source\" name=\"source\"><option value=\"\">Any</option>" + UI.countryOpts(filters.source) + "</select>", "") +
          UI.field("buyer", "Sold in", "<select id=\"buyer\" name=\"buyer\"><option value=\"\">Any</option>" + UI.countryOpts(filters.buyer) + "</select>", "") +
          UI.field("sort", "Sort", "<select id=\"sort\" name=\"sort\"><option value=\"name\">Name</option><option value=\"left\">Amount left</option></select>", "") +
          "<button class=\"btn btn-secondary\" type=\"submit\">Apply filters</button></form></details>" + list + "</div>";
        ["category", "source", "buyer", "sort"].forEach(function (k) {
          var el = document.getElementById(k);
          if (el && filters[k]) el.value = filters[k];
        });
      },
      submit: function (data) {
        filters = { category: data.get("category") || "", source: data.get("source") || "", buyer: data.get("buyer") || "", sort: data.get("sort") || "name" };
        UI.go("#/shipments");
      },
      on: function (act) { if (act === "clear") { filters = { category: "", source: "", buyer: "", sort: "name" }; UI.go("#/shipments"); } }
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
    function figures(l) {
      var p = L.projection(l);
      var b = profitBounds(l);
      var lines = [
        ["Funding target", L.formatUsd(p.target)],
        ["Raised", L.formatUsd(L.raised(l))],
        ["Remaining", L.formatUsd(L.remaining(l))],
        ["Minimum", L.formatUsd(l.minimum)],
        ["Investor share", l.investorShare + "%"],
        ["Manager capital", l.companyPct + "%"],
        ["Expected sale", L.formatUsd(p.expectedSale)],
        ["Expected profit", L.formatUsd(b.plan)],
        ["If the sale is 10% lower", L.formatUsd(b.low)],
        ["If the sale is 10% higher", L.formatUsd(b.high)],
        ["Service fee, expected", L.formatUsd(p.fee)],
        ["Manager share, expected", L.formatUsd(p.managerCut)],
        ["Pool, expected", L.formatUsd(p.pool)],
        ["ROI this cycle, expected", (Math.round(p.roiCycle * 1000) / 10) + "%"],
        ["Cycle", p.cycle + " days"]
      ];
      if (l.waiver) lines.push(["Deposit", "Waived"]);
      if (l.shareholderListing) lines.push(["Shareholder listing", "Yes"], ["Shareholder share", l.shareholderSharePct + "%"]);
      return "<div class=\"statement\">" + lines.map(function (pair) {
        return "<div><span>" + pair[0] + "</span><span class=\"num\">" + pair[1] + "</span></div>";
      }).join("") + "</div>";
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
        if (tab === "shipments") body = l.shipments.map(function (sh) {
          var steps = (sh.steps || []).map(function (st) {
            return "<li>" + UI.esc(st.name) + " · " + UI.esc(st.state) + "</li>";
          }).join("");
          return "<section><p><strong>Shipment</strong> · stage " + UI.esc(L.STAGES[L.shipmentStage(l, sh)]) + "</p><ul>" + steps + "</ul></section>";
        }).join("");
        if (tab === "figures") body = figures(l);
        if (tab === "timeline") body = "<ol class=\"timeline\">" + (l.history || []).map(function (h) { return "<li><p>" + UI.esc(h.action) + (h.reason ? ". " + UI.esc(h.reason) : "") + "</p><p class=\"muted\">" + UI.when(h.at) + "</p></li>"; }).join("") + "</ol>";
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
        var list = rows.length ? rows.map(function (l) {
          var held = mine(l, u.id);
          var result = "";
          if (l.status === "completed") {
            var sale = l.shipments.reduce(function (s, sh) { return s + (sh.proceeds || 0); }, 0);
            var cost = l.shipments.reduce(function (s, sh) { return s + (sh.costActual || 0); }, 0);
            var settled = L.settlement({ saleCents: sale, costCents: cost, investorSharePct: l.investorShare, contributions: l.contributions, shareholderListing: false });
            var slice = settled.rows.filter(function (r) { return r.userId === u.id; })[0];
            result = slice ? UI.money(slice.profit, slice.profit >= 0 ? "gain" : "loss") : "";
          } else result = UI.money(L.expectedFor(l, held), "expected");
          var href = l.status === "completed" ? "#/statement/" + l.id : "#/track/" + l.id;
          return "<a class=\"row\" href=\"" + href + "\" data-go=\"" + href + "\"><span class=\"title\">" + UI.esc(l.name) + "</span><span class=\"meta\">" + L.formatUsd(held) + "</span><span class=\"end\">" + result + "</span></a>";
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
        if (!l) { stage.innerHTML = "<div class=\"column\"><h1>Not found</h1></div>"; return; }
        var body = l.shipments.map(function (sh) {
          var stageN = L.shipmentStage(l, sh);
          var route = L.STAGES.slice(0, 6).map(function (name, i) {
            return "<li class=\"" + (i <= stageN ? "done" : "") + "\">" + name + "</li>";
          }).join("");
          var late = sh.steps.map(function (st, i) {
            if (!L.isLate(l, sh, i, Store.state.now)) return "";
            return "<p class=\"status status-warning\">Late. Revised date " + UI.when(st.revisedAt || Store.state.now) + ".</p>";
          }).join("");
          return "<section><h2>Shipment</h2><ol class=\"route\">" + route + "</ol>" + late + "</section>";
        }).join("");
        stage.innerHTML = "<div class=\"column\"><h1>" + UI.esc(l.name) + "</h1>" + body + "</div>";
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
