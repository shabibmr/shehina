/* Manager screens M1 to M12. A manager is a business or an individual. Wallet and You are shared. */
(function (root) {
  "use strict";
  function register(UI) {
    var Store = root.ShehnatStore;
    var L = root.ShehnatLogic;
    var esc = UI.esc;

    var STATUS = {
      draft: "Draft", in_review: "In review", awaiting_terms: "Revised terms", approved: "Deposit due", live: "Live",
      settlement_proposed: "Settlement proposed", completed: "Completed", rejected: "Rejected", withdrawn: "Withdrawn", cancelled: "Cancelled"
    };

    /* ---------- shared helpers ---------- */

    function link(href, text, cls) {
      return "<a" + (cls ? " class=\"" + cls + "\"" : "") + " href=\"" + href + "\" data-go=\"" + href + "\">" + text + "</a>";
    }

    function mine(id) {
      var u = Store.user();
      var row = Store.listing(id);
      return u && row && row.managerId === u.id ? row : null;
    }

    function limitOf(u) { return u.exposureLimit || Store.state.settings.exposureDefault; }

    function approved(u) { return !!(u.application && u.application.status === "approved"); }

    function gate(u) {
      var st = u.application ? u.application.status : "none";
      if (st === "approved") return "";
      var label = st === "pending" ? "See status" : st === "rejected" ? "Fix and resubmit" : "Start registration";
      return "<div class=\"banner\" role=\"status\"><strong>Almost there.</strong><p>Finish registration before you list a shipment. A reviewer still has to approve this account.</p>" +
        link("#/registration", label) + "</div>";
    }

    function daysLeft(l) {
      var s = Store.state;
      var from = l.approvedAt || s.now;
      return Math.max(0, Math.ceil((from + s.settings.autoWithdrawDays * L.DAY - s.now) / L.DAY));
    }

    function depositOf(l) { return Math.floor(L.fundingTarget(l) * l.companyPct / 100); }

    function stepIsDone(st) {
      if (st.state === "skipped") return true;
      if (st.verify) return st.state === "verified";
      return st.state === "done" || st.state === "verified";
    }

    function stateText(s) { return String(s || "todo").split("_").join(" "); }

    function timeline(rows, withActor) {
      return (rows || []).slice().reverse().map(function (h) {
        var who = h.actorId ? Store.byId(h.actorId) : null;
        return "<li><p>" + esc(h.action) + (h.reason ? ". " + esc(h.reason) : "") + "</p><p class=\"muted\">" +
          (withActor ? esc(who ? who.name : "You") + " · " : "") + UI.when(h.at) + "</p></li>";
      }).join("");
    }

    function notFound(stage, text, href, label) {
      stage.innerHTML = "<div class=\"column\"><div class=\"empty\"><p>" + esc(text) + "</p>" + link(href || "#/listings", label || "Back to listings") + "</div></div>";
    }

    /* ---------- M1 registration, M2 status ---------- */

    var reg = null;
    var regStep = 0;
    var regErrors = {};

    function regInit(u) {
      if (reg && reg.userId === u.id) return;
      var p = (u.application && u.application.payload) || {};
      reg = {
        userId: u.id, kind: p.kind || u.kind || "business", legalName: p.legalName || "", regCountry: p.regCountry || "",
        regNumber: p.regNumber || "", signatory: p.signatory || "", dob: p.dob || "", phone: p.phone || "",
        residence: p.residence || "", idType: p.idType || "Passport", idNumber: p.idNumber || "",
        files: (p.files || []).slice(), declare: false
      };
      regStep = 0;
      regErrors = {};
    }

    function regEditable(u) {
      var st = u.application ? u.application.status : "none";
      return st === "none" || st === "rejected";
    }

    function regTitles() {
      return ["Registration type", "Details", reg && reg.kind === "individual" ? "Identity" : "Signatory", "Documents", "Declaration"];
    }

    function regCapture() {
      var node = document.getElementById("reg");
      if (!node || !reg) return;
      var data = new FormData(node);
      var biz = reg.kind === "business";
      if (regStep === 0) reg.kind = data.get("kind") || reg.kind;
      if (regStep === 1) {
        reg.legalName = String(data.get("legalName") || "").trim();
        if (biz) { reg.regCountry = data.get("regCountry") || ""; reg.regNumber = String(data.get("regNumber") || "").trim(); }
        else reg.residence = data.get("residence") || "";
      }
      if (regStep === 2) {
        if (biz) reg.signatory = String(data.get("signatory") || "").trim();
        else {
          reg.dob = data.get("dob") || "";
          reg.phone = data.get("phone") || "";
          reg.idType = data.get("idType") || "Passport";
          reg.idNumber = String(data.get("idNumber") || "").trim();
        }
      }
      if (regStep === 4) reg.declare = !!data.get("declare");
    }

    function regCheck(n) {
      var e = {};
      var biz = reg.kind === "business";
      var blockedMsg = "Error: we cannot accept a residence in that country.";
      if (n === 1) {
        if (!reg.legalName) e.legalName = "Error: enter the legal name.";
        if (biz) {
          if (!reg.regCountry) e.regCountry = "Error: choose the country of registration.";
          else if (L.blocked(reg.regCountry, Store.state.settings.blocked)) e.regCountry = blockedMsg;
          if (!reg.regNumber) e.regNumber = "Error: enter the registration number.";
        } else if (!reg.residence) e.residence = "Error: choose a country of residence.";
        else if (L.blocked(reg.residence, Store.state.settings.blocked)) e.residence = blockedMsg;
      }
      if (n === 2) {
        if (biz) { if (!reg.signatory) e.signatory = "Error: enter the authorised signatory."; }
        else {
          var age = L.ageOk(reg.dob, Store.state.now);
          if (age) e.dob = age;
          var phone = L.phoneOk(reg.phone);
          if (phone) e.phone = phone;
          if (!reg.idNumber) e.idNumber = "Error: enter the identity document number.";
        }
      }
      if (n === 3 && reg.files.length < (biz ? 3 : 2)) e.files = biz ? "Error: add all 3 documents." : "Error: add both documents.";
      if (n === 4 && !reg.declare) e.declare = "Error: confirm the declaration.";
      return e;
    }

    function regStepOf(key) {
      if (key === "kind") return 0;
      if (key === "legalName" || key === "regCountry" || key === "regNumber" || key === "residence") return 1;
      if (key === "signatory" || key === "dob" || key === "phone" || key === "idNumber") return 2;
      if (key === "files") return 3;
      return 4;
    }

    function regView(stage) {
      var biz = reg.kind === "business";
      var dots = "";
      var i;
      for (i = 0; i < 5; i++) dots += "<li class=\"" + (i < regStep ? "done" : i === regStep ? "on" : "") + "\"" + (i === regStep ? " aria-current=\"step\"" : "") + ">" + (i + 1) + "</li>";
      var body = "";
      if (regStep === 0) {
        body = "<p>Tell us who will list shipments. A business and an individual trader both manage listings and upload different documents.</p>" +
          "<label class=\"check\"><input type=\"radio\" name=\"kind\" value=\"business\"" + (biz ? " checked" : "") + "> <span>A business. A company, LLP or other registered entity.</span></label>" +
          "<label class=\"check\"><input type=\"radio\" name=\"kind\" value=\"individual\"" + (!biz ? " checked" : "") + "> <span>An individual trader.</span></label>" +
          (regErrors.kind ? "<p class=\"err\">" + esc(regErrors.kind) + "</p>" : "");
      }
      if (regStep === 1) {
        body = UI.field("legalName", biz ? "Legal business name" : "Full legal name", "<input id=\"legalName\" name=\"legalName\" value=\"" + esc(reg.legalName) + "\">", regErrors.legalName);
        if (biz) {
          body += UI.field("regCountry", "Country of registration", "<select id=\"regCountry\" name=\"regCountry\"><option value=\"\">Choose</option>" + UI.countryOpts(reg.regCountry) + "</select>", regErrors.regCountry || regErrors.residence) +
            UI.blockedNote() +
            UI.field("regNumber", "Registration number", "<input id=\"regNumber\" name=\"regNumber\" class=\"num\" value=\"" + esc(reg.regNumber) + "\">", regErrors.regNumber);
        } else {
          body += UI.field("residence", "Country of residence", "<select id=\"residence\" name=\"residence\"><option value=\"\">Choose</option>" + UI.countryOpts(reg.residence) + "</select>", regErrors.residence) + UI.blockedNote();
        }
      }
      if (regStep === 2) {
        if (biz) body = "<p>Who is allowed to sign for this business?</p>" +
          UI.field("signatory", "Authorised signatory", "<input id=\"signatory\" name=\"signatory\" value=\"" + esc(reg.signatory) + "\">", regErrors.signatory);
        else {
          var types = ["Passport", "National ID", "Driving licence", "Residence permit"].map(function (t) {
            return "<option" + (reg.idType === t ? " selected" : "") + ">" + t + "</option>";
          }).join("");
          body = UI.field("dob", "Date of birth", "<input id=\"dob\" name=\"dob\" type=\"date\" value=\"" + esc(reg.dob) + "\">", regErrors.dob) +
            UI.field("phone", "Phone, with country code", "<input id=\"phone\" name=\"phone\" value=\"" + esc(reg.phone) + "\">", regErrors.phone) +
            UI.field("idType", "Identity document", "<select id=\"idType\" name=\"idType\">" + types + "</select>") +
            UI.field("idNumber", "Document number", "<input id=\"idNumber\" name=\"idNumber\" class=\"num\" value=\"" + esc(reg.idNumber) + "\">", regErrors.idNumber);
        }
      }
      if (regStep === 3) {
        var need = biz ? ["Company registration certificate", "Identity document of the authorised signatory", "Proof of business address"] : ["Photo identity document", "Proof of address"];
        var files = reg.files.map(function (f, idx) {
          return "<div class=\"file\"><span>" + esc(f.name) + " · " + esc(f.type || "file") + " · " + f.size + " bytes</span><button type=\"button\" class=\"btn-text\" data-act=\"rm\" data-idx=\"" + idx + "\">Remove</button></div>";
        }).join("");
        body = "<p>Add " + need.length + " documents. Only the name, type and size are kept.</p><ul>" + need.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" +
          "<label class=\"upload\">Choose file<input class=\"sr\" name=\"file\" type=\"file\" data-live=\"file\"></label>" + files +
          (regErrors.files ? "<p class=\"err\" role=\"alert\">" + esc(regErrors.files) + "</p>" : "");
      }
      if (regStep === 4) {
        body = "<section class=\"panel stack\"><h2>Review</h2><p>" + esc(reg.legalName) + " · " + (biz ? "Business" : "Individual") + "</p>" +
          "<p>" + esc(UI.cname(biz ? reg.regCountry : reg.residence)) + (biz ? " · <span class=\"num\">" + esc(reg.regNumber) + "</span>" : "") + "</p>" +
          "<p>" + (biz ? "Signatory " + esc(reg.signatory) : esc(reg.idType) + " <span class=\"num\">" + esc(reg.idNumber) + "</span>") + "</p>" +
          "<p>" + reg.files.length + " documents</p></section>" +
          "<label class=\"check\"><input type=\"checkbox\" name=\"declare\"" + (reg.declare ? " checked" : "") + "> <span>I confirm these details are true and that I will not list prohibited goods.</span></label>" +
          (regErrors.declare ? "<p class=\"err\" role=\"alert\">" + esc(regErrors.declare) + "</p>" : "");
      }
      stage.innerHTML = "<div class=\"column\"><ol class=\"stepper\" aria-label=\"Progress\">" + dots + "</ol><p>Step " + (regStep + 1) + " of 5</p>" +
        "<h1>" + esc(regTitles()[regStep]) + "</h1>" +
        (regErrors.form ? "<p class=\"err\" role=\"alert\">" + esc(regErrors.form) + "</p>" : "") +
        "<form id=\"reg\" class=\"stack\">" + body + "</form>" +
        (regStep > 0 ? "<p><button class=\"btn-text\" type=\"button\" data-act=\"prev\">Previous step</button></p>" : "") + "</div>";
    }

    function regNext() {
      regCapture();
      regErrors = {};
      if (regStep >= 1) {
        var e = regCheck(regStep);
        if (Object.keys(e).length) { regErrors = e; UI.go("#/register"); return; }
      }
      if (regStep === 4) {
        var res = Store.submitManagerApplication(reg);
        if (!res.ok) {
          regErrors = res.errors || {};
          var first = Object.keys(regErrors).map(regStepOf).sort()[0];
          if (first != null && first < 4) regStep = first;
          UI.go("#/register");
          return;
        }
        reg = null;
        regStep = 0;
        UI.toast("Registration sent");
        UI.go("#/registration");
        return;
      }
      regStep += 1;
      UI.go("#/register");
    }

    UI.screen({
      id: "register",
      auth: "manager",
      back: true,
      section: "you",
      title: function () { return reg ? regTitles()[regStep] : "Registration"; },
      task: function () { var u = Store.user(); return !!(u && regEditable(u)); },
      actions: function () {
        return "<button class=\"btn btn-primary\" type=\"button\" data-act=\"next\">" + (regStep === 4 ? "Submit registration" : "Continue") + "</button>";
      },
      test: function (h) {
        if (h !== "#/register") return null;
        var u = Store.user();
        if (u && u.role === "manager") regInit(u);
        return {};
      },
      render: function (stage) {
        var u = Store.user();
        if (!regEditable(u)) {
          stage.innerHTML = "<div class=\"column\"><div class=\"empty\"><p>Your registration is " + esc(u.application.status) + ". There is nothing to submit.</p>" + link("#/registration", "See registration status") + "</div></div>";
          return;
        }
        regInit(u);
        regView(stage);
      },
      submit: function () { if (regStep < 4) regNext(); },
      on: function (act, el) {
        if (!reg) return;
        if (act === "file") {
          if (el.files && el.files[0]) {
            reg.files.push({ name: el.files[0].name, type: el.files[0].type, size: el.files[0].size });
            regErrors = {};
            UI.go("#/register");
          }
          return;
        }
        if (act === "rm") { reg.files.splice(Number(el.getAttribute("data-idx")), 1); UI.go("#/register"); return; }
        if (act === "prev") { regCapture(); if (regStep > 0) regStep -= 1; regErrors = {}; UI.go("#/register"); return; }
        if (act === "next") regNext();
      }
    });

    UI.screen({
      id: "registration",
      auth: "manager",
      back: true,
      section: "you",
      title: "Registration",
      test: function (h) { return h === "#/registration" ? {} : null; },
      render: function (stage) {
        var u = Store.user();
        var app = u.application;
        var st = app.status;
        var p = app.payload || {};
        var banner = "";
        if (st === "approved") banner = "<div class=\"banner banner-success\" role=\"status\"><strong>Your registration is approved.</strong><p>You can now list shipments.</p>" + link("#/listings", "Go to listings") + "</div>";
        if (st === "pending") banner = "<div class=\"banner\" role=\"status\"><strong>Your registration is being reviewed.</strong><span class=\"status\">Pending</span></div>";
        if (st === "rejected") banner = "<div class=\"banner banner-warning\" role=\"status\"><strong>Your registration was rejected.</strong><p>" + esc(app.reason) + "</p>" + link("#/register", "Fix and resubmit") + "</div>";
        if (st === "none") banner = "<div class=\"empty\"><p>You have not submitted a registration.</p>" + link("#/register", "Start registration") + "</div>";
        var detail = "";
        if (p.legalName) {
          detail = "<section class=\"panel stack\"><h2>" + esc(p.legalName) + "</h2><p class=\"muted\">" + (p.kind === "individual" ? "Individual" : "Business") + " · " + esc(UI.cname(p.regCountry || p.residence || u.country)) + "</p>" +
            (p.files && p.files.length ? "<p>" + p.files.map(function (f) { return esc(f.name); }).join(", ") + "</p>" : "") + "</section>";
        }
        var hist = timeline(app.history, true);
        stage.innerHTML = "<div class=\"column\"><h1>Registration</h1>" + banner + detail + (hist ? "<ol class=\"timeline\">" + hist + "</ol>" : "") + "</div>";
      }
    });

    /* ---------- M3 home ---------- */

    function openSteps(u) {
      var out = [];
      var now = Store.state.now;
      Store.state.listings.forEach(function (l) {
        if (l.managerId !== u.id || l.status !== "live" || L.raised(l) < L.fundingTarget(l)) return;
        l.shipments.forEach(function (sh, si) {
          var first = -1;
          sh.steps.forEach(function (st, i) { if (first === -1 && !stepIsDone(st)) first = i; });
          sh.steps.forEach(function (st, i) {
            if (st.owner !== "manager" || (st.state !== "todo" && st.state !== "in_progress")) return;
            var late = L.isLate(l, sh, i, now);
            if (i === first || late) out.push({ l: l, sh: sh, st: st, si: si, late: late });
          });
        });
      });
      out.sort(function (a, b) { return (b.late ? 1 : 0) - (a.late ? 1 : 0); });
      return out;
    }

    function dueRow(href, title, meta, tag, warn) {
      return "<a class=\"row\" href=\"" + href + "\" data-go=\"" + href + "\"><span class=\"title\">" + esc(title) + "</span><span class=\"meta\">" + esc(meta) + "</span>" +
        "<span class=\"end status" + (warn ? " status-warning" : "") + "\">" + esc(tag) + "</span></a>";
    }

    UI.screen({
      id: "desk",
      auth: "manager",
      section: "home",
      title: function () { return Store.user().name; },
      test: function (h) { return h === "#/desk" ? {} : null; },
      render: function (stage) {
        var u = Store.user();
        var used = L.exposureUsed(Store.state, u.id, "");
        var rows = [];
        Store.state.listings.forEach(function (l) {
          if (l.managerId !== u.id) return;
          if (l.status === "awaiting_terms") rows.push(dueRow("#/terms/" + l.id, l.name, "Revised terms are waiting for you.", "Terms", false));
          if (l.status === "approved") rows.push(dueRow("#/deposit/" + l.id, l.name, "Pay " + L.formatUsd(depositOf(l)) + ". " + daysLeft(l) + " days left.", "Deposit", false));
        });
        openSteps(u).forEach(function (x) {
          var many = x.l.shipments.length > 1 ? " · Shipment " + (x.si + 1) : "";
          rows.push(dueRow("#/step/" + x.l.id + "/" + x.st.id, x.st.name + " · " + x.l.name, (x.late ? "This step is late." : "Your step.") + many, x.late ? "Late" : "Step", x.late));
        });
        var create = approved(u) ? "<p>" + link("#/list/new", "Create new listing", "btn btn-primary") + "</p>" : "";
        stage.innerHTML = "<div class=\"column\"><h1>" + esc(u.name) + "</h1>" + gate(u) +
          "<section class=\"panel stack\"><h2>Exposure</h2><p class=\"figure num\">" + L.formatUsd(used) + "</p>" +
          "<p class=\"muted\">used of your <span class=\"num\">" + L.formatUsd(limitOf(u)) + "</span> limit</p></section>" +
          "<section class=\"stack\"><h2>Actions due</h2>" + (rows.join("") || "<p>Nothing needs you right now.</p>") + "</section>" +
          create + "<p>" + link("#/listings", "All my listings") + "</p></div>";
      }
    });

    /* ---------- M4 my listings ---------- */

    var TABS = [
      ["draft", "Drafts", ["draft"]],
      ["review", "In review", ["in_review"]],
      ["action", "Action needed", ["awaiting_terms", "approved", "rejected"]],
      ["live", "Live", ["live", "settlement_proposed"]],
      ["done", "Completed", ["completed"]],
      ["ended", "Ended", ["withdrawn", "cancelled"]]
    ];
    var listTab = null;

    function inTab(id, u) {
      var def = TABS.filter(function (t) { return t[0] === id; })[0];
      return Store.state.listings.filter(function (l) { return l.managerId === u.id && def[2].indexOf(l.status) !== -1; });
    }

    UI.screen({
      id: "listings",
      auth: "manager",
      section: "list",
      title: "Listings",
      test: function (h) { return h === "#/listings" ? {} : null; },
      render: function (stage) {
        var u = Store.user();
        if (!listTab) listTab = inTab("action", u).length ? "action" : "live";
        var tabs = TABS.map(function (t) {
          return "<button type=\"button\" role=\"tab\" data-act=\"tab\" data-tab=\"" + t[0] + "\" aria-selected=\"" + (listTab === t[0]) + "\">" + t[1] + "</button>";
        }).join("");
        var rows = inTab(listTab, u).map(function (l) {
          var href = l.status === "draft" || l.status === "rejected" ? "#/list/edit/" + l.id : "#/listing-desk/" + l.id;
          return "<a class=\"row\" href=\"" + href + "\" data-go=\"" + href + "\"><span class=\"title\">" + esc(l.name) + "</span><span class=\"meta\">" +
            L.formatUsd(L.fundingTarget(l)) + " target</span><span class=\"end status\">" + STATUS[l.status] + "</span></a>";
        }).join("");
        stage.innerHTML = "<div class=\"column\"><h1>Listings</h1>" + gate(u) +
          (approved(u) ? "<p>" + link("#/list/new", "Create new listing", "btn btn-primary") + "</p>" : "") +
          "<div class=\"tabs\" role=\"tablist\">" + tabs + "</div>" +
          (rows || "<div class=\"empty\"><p>Nothing is in this list yet.</p></div>") + "</div>";
      },
      on: function (act, el) {
        if (act === "tab") { listTab = el.getAttribute("data-tab"); UI.go("#/listings"); }
      }
    });

    /* ---------- step plan editor, shared by the wizard (M6) and the plan change (M12) ---------- */

    function keyOf(id, n) {
      var m = /-(\d+)$/.exec(String(id || ""));
      return m ? m[1] : String(n);
    }

    function planFrom(steps) {
      return (steps || []).map(function (st, n) {
        return {
          key: keyOf(st.id, n), name: st.name, owner: st.owner === "manager" ? "manager" : "staff",
          days: String(st.days || 0), cost: ((st.cost || 0) / 100).toFixed(2),
          tag: st.tag || "", party: st.party || "", verify: !!st.verify
        };
      });
    }

    function nextKey(steps) {
      var top = -1;
      steps.forEach(function (st) { if (/^\d+$/.test(String(st.key)) && Number(st.key) > top) top = Number(st.key); });
      return String(top + 1);
    }

    function tagOpts(selected) {
      var opts = "<option value=\"\">No stage</option>";
      L.TAGS.forEach(function (tag) {
        opts += "<option value=\"" + esc(tag) + "\"" + (selected === tag ? " selected" : "") + ">" + esc(tag) + "</option>";
      });
      return opts;
    }

    function planEditor(steps, errs) {
      var have = {};
      steps.forEach(function (st) { if (st.tag) have[st.tag] = true; });
      var cover = L.TAGS.map(function (tag) {
        return "<p><span class=\"status" + (have[tag] ? "" : " status-warning") + "\">" + (have[tag] ? "Covered" : "Missing") + "</span> " + esc(tag) + "</p>";
      }).join("");
      return steps.map(function (st, n) {
        return "<section class=\"panel stack\"><h2>Step " + (n + 1) + "</h2>" +
          UI.field("sname" + n, "Step name", "<input id=\"sname" + n + "\" name=\"sname" + n + "\" value=\"" + esc(st.name) + "\">", errs["sname" + n]) +
          UI.field("sowner" + n, "Owner", "<select id=\"sowner" + n + "\" name=\"sowner" + n + "\"><option value=\"manager\"" + (st.owner === "manager" ? " selected" : "") + ">Manager</option><option value=\"staff\"" + (st.owner === "staff" ? " selected" : "") + ">Staff</option></select>", errs["sowner" + n]) +
          UI.field("sdays" + n, "Duration, days", "<input id=\"sdays" + n + "\" name=\"sdays" + n + "\" inputmode=\"numeric\" value=\"" + esc(st.days) + "\">", errs["sdays" + n]) +
          UI.field("scost" + n, "Planned cost", "<span class=\"amount\"><b>$</b><input id=\"scost" + n + "\" name=\"scost" + n + "\" inputmode=\"decimal\" value=\"" + esc(st.cost) + "\"></span>", errs["scost" + n]) +
          UI.field("stag" + n, "Stage", "<select id=\"stag" + n + "\" name=\"stag" + n + "\">" + tagOpts(st.tag) + "</select>") +
          UI.field("sparty" + n, "Counterparty", "<input id=\"sparty" + n + "\" name=\"sparty" + n + "\" value=\"" + esc(st.party) + "\">") +
          "<p>" +
          (n > 0 ? "<button class=\"btn-text\" type=\"button\" data-act=\"up\" data-i=\"" + n + "\">Move up</button> " : "") +
          (n < steps.length - 1 ? "<button class=\"btn-text\" type=\"button\" data-act=\"down\" data-i=\"" + n + "\">Move down</button> " : "") +
          (steps.length > 1 ? "<button class=\"btn-text\" type=\"button\" data-act=\"remove-step\" data-i=\"" + n + "\">Remove step</button>" : "") +
          "</p></section>";
      }).join("") +
        "<p><button class=\"btn btn-secondary\" type=\"button\" data-act=\"add-step\">Add step</button></p>" +
        "<section class=\"panel\"><h2>Stage coverage</h2>" + cover + "</section>";
    }

    function planRead(data, steps) {
      steps.forEach(function (st, i) {
        st.name = data.get("sname" + i) || "";
        st.owner = data.get("sowner" + i) || "";
        st.days = data.get("sdays" + i) || "";
        st.cost = data.get("scost" + i) || "";
        st.tag = data.get("stag" + i) || "";
        st.party = data.get("sparty" + i) || "";
      });
    }

    function planCheck(steps) {
      var errs = {};
      steps.forEach(function (st, i) {
        if (!String(st.name || "").trim()) errs["sname" + i] = "Error: name each step.";
        if (st.owner !== "manager" && st.owner !== "staff") errs["sowner" + i] = "Error: choose a manager or a staff owner.";
        if (!/^\d+$/.test(String(st.days == null ? "" : st.days).trim())) errs["sdays" + i] = "Error: enter a duration in whole days.";
        var cost = L.usdToCents(st.cost === "" || st.cost == null ? "0" : st.cost);
        if (!cost.ok) errs["scost" + i] = cost.error;
      });
      return errs;
    }

    /* Returns true when the action edited the step list. The caller re-renders. */
    function planOn(act, node, steps) {
      if (act === "add-step") {
        steps.push({ key: nextKey(steps), name: "", owner: "manager", days: "1", cost: "0.00", tag: "", party: "", verify: false });
        return true;
      }
      var i = Number(node.getAttribute("data-i"));
      if (act === "remove-step" && steps.length > 1) { steps.splice(i, 1); return true; }
      if (act === "up" || act === "down") {
        var swap = act === "up" ? i - 1 : i + 1;
        if (swap < 0 || swap >= steps.length) return false;
        var held = steps[i];
        steps[i] = steps[swap];
        steps[swap] = held;
        return true;
      }
      return false;
    }

    /* ---------- M5 to M7 new listing wizard ---------- */

    var TITLES = ["Basics", "Shipments", "Step plan", "Terms"];
    var LAST = 3;
    var step = 0;
    var opened = null;
    var form = null;
    var error = "";
    var errors = {};

    function blank() {
      return {
        id: "", name: "", category: "Food", source: "", buyer: "", certificate: "",
        companyPct: "20", investorShare: "60", minimum: "",
        shipments: [{ goods: "", sale: "", start: "0" }],
        steps: planFrom(L.defaultSteps("new"))
      };
    }

    function fromListing(row) {
      var first = row.shipments[0] && row.shipments[0].steps;
      return {
        id: row.id, name: row.name, category: row.category, source: row.source, buyer: row.buyer,
        certificate: row.certificate || "", companyPct: String(row.companyPct), investorShare: String(row.investorShare),
        minimum: (row.minimum / 100).toFixed(2),
        shipments: row.shipments.map(function (sh) {
          return { goods: (sh.goods / 100).toFixed(2), sale: (sh.saleExpected / 100).toFixed(2), start: String(sh.startDay || 0) };
        }),
        steps: planFrom(first && first.length ? first : L.defaultSteps("new"))
      };
    }

    function centsOf(list) {
      var target = 0;
      var ok = true;
      list.shipments.forEach(function (sh) {
        var goods = L.usdToCents(sh.goods);
        if (!goods.ok) ok = false;
        else target += goods.cents;
      });
      list.steps.forEach(function (st) {
        var cost = L.usdToCents(st.cost === "" || st.cost == null ? "0" : st.cost);
        if (!cost.ok) ok = false;
        else target += cost.cents * list.shipments.length;
      });
      return ok ? target : 0;
    }

    function whole(v) { return /^\d+$/.test(String(v == null ? "" : v).trim()) ? Number(v) : -1; }

    function model(data, managerId) {
      var shipments = data.shipments.map(function (sh) {
        var goods = L.usdToCents(sh.goods);
        var sale = L.usdToCents(sh.sale);
        return {
          goods: goods.ok ? goods.cents : 0,
          saleExpected: sale.ok ? sale.cents : 0,
          startDay: whole(sh.start),
          steps: (data.steps || []).map(function (st) {
            var cost = L.usdToCents(st.cost === "" || st.cost == null ? "0" : st.cost);
            var days = whole(st.days);
            return { tag: st.tag || null, days: days < 0 ? 0 : days, cost: cost.ok ? cost.cents : 0 };
          })
        };
      });
      var minimum = L.usdToCents(data.minimum);
      return {
        id: data.id || "",
        name: String(data.name || "").trim(),
        managerId: managerId,
        category: data.category || "",
        source: data.source || "",
        buyer: data.buyer || "",
        companyPct: Math.max(0, whole(data.companyPct)),
        investorShare: Math.max(0, whole(data.investorShare)),
        minimum: minimum.ok ? minimum.cents : 0,
        shipments: shipments
      };
    }

    function capture() {
      var node = document.getElementById("listing");
      if (!node || !form) return;
      var data = new FormData(node);
      if (step === 0) {
        form.name = data.get("name") || "";
        form.category = data.get("category") || "";
        form.source = data.get("source") || "";
        form.buyer = data.get("buyer") || "";
        form.certificate = data.get("certificate") || "";
      } else if (step === 1) {
        form.shipments.forEach(function (sh, i) {
          sh.goods = data.get("goods" + i) || "";
          sh.sale = data.get("sale" + i) || "";
          sh.start = data.get("start" + i) || "";
        });
      } else if (step === 2) {
        planRead(data, form.steps);
      } else if (step === 3) {
        form.companyPct = data.get("companyPct") || "";
        form.investorShare = data.get("investorShare") || "";
        form.minimum = data.get("minimum") || "";
      }
    }

    function validate(n) {
      errors = {};
      error = "";
      if (n === 0) {
        var name = String(form.name || "").trim();
        form.name = name;
        if (name.length < 1 || name.length > 120) errors.name = "Error: enter a name of 1 to 120 characters.";
        if (L.CATEGORIES.indexOf(form.category) === -1) errors.category = "Error: choose a category.";
        if (!/^[A-Z]{2}$/.test(form.source || "")) errors.source = "Error: choose the source country and the buyer country.";
        if (!/^[A-Z]{2}$/.test(form.buyer || "")) errors.buyer = "Error: choose the source country and the buyer country.";
        else if (form.source === form.buyer) errors.buyer = "Error: the source country and the buyer country must differ.";
        else if (L.blocked(form.source, Store.state.settings.blocked) || L.blocked(form.buyer, Store.state.settings.blocked)) errors.buyer = "Error: this country is not available for a listing.";
      }
      if (n === 1) {
        if (!form.shipments.length) error = "Error: add at least one shipment.";
        form.shipments.forEach(function (sh, i) {
          var goods = L.usdToCents(sh.goods);
          var sale = L.usdToCents(sh.sale);
          if (!goods.ok || !(goods.cents > 0)) errors["goods" + i] = goods.ok ? "Error: each shipment needs an expected cost and an expected sale price." : goods.error;
          if (!sale.ok || !(sale.cents > 0)) errors["sale" + i] = sale.ok ? "Error: each shipment needs an expected cost and an expected sale price." : sale.error;
          if (whole(sh.start) < 0) errors["start" + i] = "Error: planned start is a whole number of days from the funding date.";
        });
      }
      if (n === 2) {
        if (!form.steps.length) error = "Error: the plan needs at least one step.";
        errors = planCheck(form.steps);
      }
      if (n === 3) {
        if (whole(form.companyPct) < 20 || whole(form.companyPct) > 90) errors.companyPct = "Error: manager capital must be between 20% and 90%.";
        if (whole(form.investorShare) < 40 || whole(form.investorShare) > 95) errors.investorShare = "Error: investor share must be between 40% and 95%.";
        var min = L.usdToCents(form.minimum);
        var target = centsOf(form);
        if (!min.ok || min.cents < 100 || !target || min.cents > target) errors.minimum = "Error: the minimum investment must be between $1.00 and the funding target.";
      }
      return !error && !Object.keys(errors).length;
    }

    function stay() {
      UI.go(form && form.id ? "#/list/edit/" + form.id : "#/list/new");
    }

    function previewBody(u) {
      var built = model(form, u.id);
      var message = L.listingError(Store.state, built);
      var view = L.projection(built);
      var limit = limitOf(u);
      var used = L.exposureUsed(Store.state, u.id, form.id);
      var over = used + L.fundingTarget(built) > limit;
      var ratio = function (r) { return (Math.round(r * 1000) / 10).toFixed(1) + "%"; };
      var other = message && message.indexOf("exposure limit") === -1 ? "<p class=\"err\" role=\"alert\">" + esc(message) + "</p>" : "";
      var extra = error && error !== message ? "<p class=\"err\" role=\"alert\">" + esc(error) + "</p>" : "";
      var exposure = over
        ? "<div class=\"banner banner-warning\" role=\"alert\"><strong>" + esc("Error: this listing would pass the exposure limit of " + L.formatUsd(limit) + ".") + "</strong></div>"
        : "";
      return extra + other + "<section class=\"panel stack\"><h2>Preview</h2>" +
        "<div class=\"kpi\"><span>Funding target</span><span class=\"num\">" + L.formatUsd(view.target) + "</span></div>" +
        "<div class=\"kpi\"><span>Cycle</span><span class=\"num\">" + L.cycleDays(built) + " days</span></div>" +
        "<div class=\"kpi\"><span>Expected profit</span>" + UI.money(view.expectedProfit, "expected") + "</div>" +
        "<div class=\"kpi\"><span>ROI this cycle</span><span class=\"num\">" + ratio(view.roiCycle) + " expected</span></div>" +
        "<div class=\"kpi\"><span>ROI per year</span><span class=\"num\">" + ratio(view.roiYear) + " expected</span></div>" +
        "<div class=\"kpi\"><span>Your expected share</span>" + UI.money(view.managerCut, "expected") + "</div>" +
        "<div class=\"kpi\"><span>Exposure left</span><span class=\"num\">" + L.formatUsd(Math.max(0, limit - used - view.target)) + "</span></div>" +
        "</section>" + exposure;
    }

    function wizardOpen(params) {
      var u = Store.user();
      if (form && (form.id || "") === (params.id || "")) return true;
      if (params.id) {
        var existing = Store.listing(params.id);
        if (!existing || existing.managerId !== u.id || (existing.status !== "draft" && existing.status !== "rejected")) return false;
        form = fromListing(existing);
      } else form = blank();
      return true;
    }

    function wizardDone(tab, text) {
      error = "";
      errors = {};
      form = null;
      step = 0;
      opened = null;
      listTab = tab;
      UI.toast(text);
      UI.go("#/listings");
    }

    function wizardNext() {
      capture();
      if (!validate(step)) { stay(); return; }
      step += 1;
      stay();
    }

    UI.screen({
      id: "listing-form",
      auth: "manager",
      back: true,
      section: "list",
      title: function () { return TITLES[step] || "New listing"; },
      task: function () { return step === LAST; },
      actions: function () {
        if (step !== LAST) return "";
        return "<button class=\"btn btn-primary\" type=\"button\" data-act=\"submit\">Submit for review</button>";
      },
      test: function (h) {
        var id = null;
        if (h === "#/list/new") id = "";
        else {
          var m = /^#\/list\/edit\/([\w-]+)$/.exec(h);
          if (!m) return null;
          id = m[1];
        }
        if (opened !== id) {
          if (!(form && (form.id || "") === id)) { step = 0; form = null; error = ""; errors = {}; }
          opened = id;
        }
        return { id: id };
      },
      render: function (stage, params) {
        var u = Store.user();
        if (!wizardOpen(params)) { notFound(stage, "This listing cannot be edited.", "#/listings", "Back to listings"); return; }
        var dots = "";
        var i;
        for (i = 0; i < TITLES.length; i++) dots += "<li class=\"" + (i < step ? "done" : i === step ? "on" : "") + "\"" + (i === step ? " aria-current=\"step\"" : "") + ">" + (i + 1) + "</li>";
        var body = "";
        if (step === 0) {
          var cats = L.CATEGORIES.map(function (c) {
            return "<option value=\"" + c + "\"" + (form.category === c ? " selected" : "") + ">" + c + "</option>";
          }).join("");
          body = "<p class=\"muted\">Do not list prohibited goods. Shehnat does not fund them.</p>" +
            UI.field("name", "Cargo / listing name", "<input id=\"name\" name=\"name\" value=\"" + esc(form.name) + "\">", errors.name) +
            UI.field("category", "Category", "<select id=\"category\" name=\"category\">" + cats + "</select>", errors.category) +
            UI.field("source", "Source country", "<select id=\"source\" name=\"source\"><option value=\"\">Choose</option>" + UI.countryOpts(form.source) + "</select>", errors.source) +
            UI.field("buyer", "Buyer country", "<select id=\"buyer\" name=\"buyer\"><option value=\"\">Choose</option>" + UI.countryOpts(form.buyer) + "</select>", errors.buyer) +
            UI.blockedNote() +
            UI.field("certificate", "Quality certificate / standard", "<input id=\"certificate\" name=\"certificate\" maxlength=\"80\" value=\"" + esc(form.certificate) + "\">");
        }
        if (step === 1) {
          var used = L.exposureUsed(Store.state, u.id, form.id);
          body = "<p class=\"muted\">Exposure left <span class=\"num\">" + L.formatUsd(Math.max(0, limitOf(u) - used)) + "</span>. Amounts use at most 2 decimals.</p>" +
            form.shipments.map(function (sh, n) {
              return "<section class=\"panel stack\"><h2>Shipment " + (n + 1) + "</h2>" +
                UI.field("goods" + n, "Expected cost of goods", "<span class=\"amount\"><b>$</b><input id=\"goods" + n + "\" name=\"goods" + n + "\" inputmode=\"decimal\" value=\"" + esc(sh.goods) + "\"></span>", errors["goods" + n]) +
                UI.field("sale" + n, "Expected sale price", "<span class=\"amount\"><b>$</b><input id=\"sale" + n + "\" name=\"sale" + n + "\" inputmode=\"decimal\" value=\"" + esc(sh.sale) + "\"></span>", errors["sale" + n]) +
                UI.field("start" + n, "Planned start, days after funding", "<input id=\"start" + n + "\" name=\"start" + n + "\" inputmode=\"numeric\" value=\"" + esc(sh.start) + "\">", errors["start" + n]) +
                (form.shipments.length > 1 ? "<button class=\"btn-text\" type=\"button\" data-act=\"remove\" data-i=\"" + n + "\">Remove shipment</button>" : "") +
                "</section>";
            }).join("") +
            "<p><button class=\"btn btn-secondary\" type=\"button\" data-act=\"add\">Add shipment</button></p>";
        }
        if (step === 2) body = "<p>This plan starts from the standard steps and is copied onto each shipment.</p>" + planEditor(form.steps, errors);
        if (step === 3) {
          body = UI.field("companyPct", "Manager capital contribution (%)", "<input id=\"companyPct\" name=\"companyPct\" inputmode=\"numeric\" data-live=\"terms\" value=\"" + esc(form.companyPct) + "\"><span class=\"muted\">20% to 90%.</span>", errors.companyPct) +
            UI.field("investorShare", "Investor profit share (%)", "<input id=\"investorShare\" name=\"investorShare\" inputmode=\"numeric\" data-live=\"terms\" value=\"" + esc(form.investorShare) + "\"><span class=\"muted\">40% to 95%.</span>", errors.investorShare) +
            UI.field("minimum", "Minimum investor ticket", "<span class=\"amount\"><b>$</b><input id=\"minimum\" name=\"minimum\" inputmode=\"decimal\" data-live=\"terms\" value=\"" + esc(form.minimum) + "\"></span><span class=\"muted\">At least $1.00, and no more than the funding target.</span>", errors.minimum) +
            "<div id=\"preview\" class=\"stack\">" + previewBody(u) + "</div>";
        }
        var nav = "<p>" + (step > 0 ? "<button class=\"btn-text\" type=\"button\" data-act=\"back-step\">Back</button> " : "") +
          (step < LAST ? "<button class=\"btn btn-primary\" type=\"button\" data-act=\"next\">Continue</button> " : "") +
          "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"draft\">Save draft</button></p>";
        stage.innerHTML = "<div class=\"column\">" + gate(u) +
          "<ol class=\"stepper\" aria-label=\"Progress\">" + dots + "</ol><p>Step " + (step + 1) + " of " + TITLES.length + "</p>" +
          "<h1>" + esc(TITLES[step]) + "</h1>" +
          (error && step !== LAST ? "<p class=\"err\" role=\"alert\">" + esc(error) + "</p>" : "") +
          "<form id=\"listing\" class=\"stack\">" + body + nav + "</form></div>";
      },
      submit: function () { if (step < LAST) wizardNext(); },
      on: function (act, node) {
        if (!form) return;
        capture();
        if (act === "terms") {
          var slot = document.getElementById("preview");
          if (slot) slot.innerHTML = previewBody(Store.user());
          return;
        }
        if (act === "add") { form.shipments.push({ goods: "", sale: "", start: "0" }); error = ""; stay(); return; }
        if (act === "remove") {
          form.shipments.splice(Number(node.getAttribute("data-i")), 1);
          error = "";
          stay();
          return;
        }
        if (act === "add-step" || act === "remove-step" || act === "up" || act === "down") {
          planOn(act, node, form.steps);
          error = "";
          stay();
          return;
        }
        if (act === "back-step") { if (step > 0) step -= 1; error = ""; errors = {}; stay(); return; }
        if (act === "next") { wizardNext(); return; }
        if (act === "submit") {
          if (!validate(LAST)) { stay(); return; }
          var sent = Store.submitListing(form);
          if (!sent.ok) { error = sent.error; if (sent.id) form.id = sent.id; stay(); return; }
          wizardDone("review", "Sent for review");
          return;
        }
        if (act === "draft") {
          error = "";
          errors = {};
          var saved = Store.saveListing(form);
          if (!saved.ok) { error = saved.error; stay(); return; }
          wizardDone("draft", "Draft saved");
        }
      }
    });

    /* ---------- M8 listing detail ---------- */

    function actualFigures(l) {
      var proceeds = 0;
      var costs = 0;
      var known = l.shipments.length > 0;
      l.shipments.forEach(function (sh) {
        if (sh.proceeds == null || sh.costActual == null) known = false;
        else { proceeds += sh.proceeds; costs += sh.costActual; }
      });
      return known ? { proceeds: proceeds, costs: costs } : null;
    }

    function figuresPanel(l) {
      var view = L.projection(l);
      var actual = actualFigures(l);
      var notYet = "<span class=\"muted\">Not yet</span>";
      var profit = actual ? actual.proceeds - actual.costs : 0;
      return "<section class=\"panel\"><h2>Figures</h2><div class=\"statement\">" +
        "<div><span></span><span class=\"muted\">Expected</span><span class=\"muted\">Actual</span></div>" +
        "<div><span>Funding</span><span class=\"num\">" + L.formatUsd(L.fundingTarget(l)) + "</span><span class=\"num\">" + L.formatUsd(L.raised(l)) + "</span></div>" +
        "<div><span>Cost</span><span class=\"num\">" + L.formatUsd(view.target) + "</span>" + (actual ? "<span class=\"num\">" + L.formatUsd(actual.costs) + "</span>" : notYet) + "</div>" +
        "<div><span>Sale</span><span class=\"num\">" + L.formatUsd(view.expectedSale) + "</span>" + (actual ? "<span class=\"num\">" + L.formatUsd(actual.proceeds) + "</span>" : notYet) + "</div>" +
        "<div><span>Profit</span>" + UI.money(view.expectedProfit, "expected") + (actual ? UI.money(profit, profit >= 0 ? "gain" : "loss") : notYet) + "</div>" +
        "<div><span>Your share</span>" + UI.money(view.managerCut, "expected") + "<span class=\"muted\">After settlement</span></div>" +
        "</div></section>";
    }

    function shipmentsPanel(l) {
      var live = l.status === "live";
      return l.shipments.map(function (sh, si) {
        var stageN = L.shipmentStage(l, sh);
        var rows = sh.steps.map(function (st, i) {
          var open = live && st.owner === "manager" && (st.state === "todo" || st.state === "in_progress");
          var due = L.stepDue(l, sh, i);
          var late = L.isLate(l, sh, i, Store.state.now);
          var meta = (st.owner === "manager" ? "You" : "Staff") + " · " + st.days + " days" + (due ? " · due " + UI.when(due) : "") + (st.tag ? " · " + st.tag : "");
          var inner = "<span class=\"title\">" + esc(st.name) + "</span><span class=\"meta\">" + esc(meta) + "</span><span class=\"end status" + (late ? " status-warning" : "") + "\">" + esc(late ? "Late" : stateText(st.state)) + "</span>";
          if (open) return "<a class=\"row\" href=\"#/step/" + l.id + "/" + st.id + "\" data-go=\"#/step/" + l.id + "/" + st.id + "\">" + inner + "</a>";
          return "<div class=\"row\">" + inner + "</div>";
        }).join("");
        return "<section class=\"stack\"><h2>Shipment " + (si + 1) + "</h2><p class=\"muted\">" + L.formatUsd(sh.goods) + " goods · " + esc(L.STAGES[stageN]) + "</p>" + rows + "</section>";
      }).join("");
    }

    UI.screen({
      id: "listing-desk",
      auth: "manager",
      back: true,
      section: "list",
      title: function (p) { var l = mine(p.id); return l ? l.name : "Not found"; },
      test: function (h) { var m = /^#\/listing-desk\/([\w-]+)$/.exec(h); return m ? { id: m[1] } : null; },
      render: function (stage, params) {
        var l = mine(params.id);
        if (!l) { notFound(stage, "That listing was not found.", "#/listings", "Back to listings"); return; }
        var last = (l.history || []).filter(function (h) { return h.reason; }).slice(-1)[0];
        var banner = "";
        var action = "";
        var st = l.status;
        if (st === "draft") {
          banner = "<div class=\"banner\" role=\"status\"><strong>This listing is a draft.</strong><p>Nobody can see it until you submit it for review.</p></div>";
          action = link("#/list/edit/" + l.id, "Edit draft", "btn btn-primary") + "<button class=\"btn btn-danger\" type=\"button\" data-act=\"delete\">Delete draft</button>";
        }
        if (st === "in_review") {
          banner = "<div class=\"banner\" role=\"status\"><strong>This listing is in review.</strong><p>A reviewer is checking it. You will be told when there is a decision.</p></div>";
          action = "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"withdraw\">Withdraw listing</button>";
        }
        if (st === "awaiting_terms") {
          banner = "<div class=\"banner banner-warning\" role=\"status\"><strong>Revised terms are waiting for you.</strong><p>A reviewer changed some terms. Accept them or decline.</p></div>";
          action = link("#/terms/" + l.id, "Review revised terms", "btn btn-primary") + "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"withdraw\">Withdraw listing</button>";
        }
        if (st === "approved") {
          banner = "<div class=\"banner banner-warning\" role=\"status\"><strong>Approved. Pay the deposit to go live.</strong><p>" + L.formatUsd(depositOf(l)) + " is due. " + daysLeft(l) + " days left before this listing is withdrawn.</p></div>";
          action = link("#/deposit/" + l.id, "Pay deposit", "btn btn-primary") + "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"withdraw\">Withdraw listing</button>";
        }
        if (st === "rejected") {
          banner = "<div class=\"banner banner-warning\" role=\"status\"><strong>This listing was rejected.</strong><p>" + esc(last ? last.reason : "") + "</p></div>";
          action = link("#/list/edit/" + l.id, "Edit and resubmit", "btn btn-primary");
        }
        if (st === "live") {
          banner = "<div class=\"banner banner-success\" role=\"status\"><strong>This listing is live.</strong><p>" + L.formatUsd(L.raised(l)) + " of " + L.formatUsd(L.fundingTarget(l)) + " is funded.</p></div>";
          action = link("#/plan/" + l.id, "Propose a plan change", "btn btn-secondary");
        }
        if (st === "settlement_proposed") banner = "<div class=\"banner\" role=\"status\"><strong>Settlement is waiting for approval.</strong></div>";
        if (st === "completed") banner = "<div class=\"banner banner-success\" role=\"status\"><strong>This listing is completed.</strong></div>";
        if (st === "withdrawn" || st === "cancelled") banner = "<div class=\"banner\" role=\"status\"><strong>This listing is " + st + ".</strong><p>" + esc(last ? last.reason : "") + "</p></div>";
        if (l.planProposal && l.planProposal.status === "proposed") banner += "<div class=\"banner\" role=\"status\"><strong>A plan change is waiting for staff approval.</strong></div>";
        var hist = timeline(l.history, true);
        stage.innerHTML = "<div class=\"column\"><h1>" + esc(l.name) + "</h1>" +
          "<p class=\"muted\">" + esc(UI.cname(l.source)) + " to " + esc(UI.cname(l.buyer)) + " · " + STATUS[st] + "</p>" + banner +
          (action ? "<div class=\"stack\">" + action + "</div>" : "") +
          figuresPanel(l) + shipmentsPanel(l) +
          (hist ? "<section><h2>History</h2><ol class=\"timeline\">" + hist + "</ol></section>" : "") + "</div>";
      },
      on: function (act, el, params) {
        var l = mine(params.id);
        if (!l) return;
        if (act === "withdraw") {
          UI.openSheet("<h2>Withdraw " + esc(l.name) + "?</h2><p>The listing ends. No money moves. You can create a new one later.</p><button class=\"btn btn-danger\" type=\"button\" data-act=\"withdraw-yes\">Withdraw listing</button><button class=\"btn btn-secondary\" type=\"button\" data-close>Keep listing</button>");
          return;
        }
        if (act === "withdraw-yes") {
          var res = Store.withdrawListing(l.id);
          UI.closeSheet();
          if (!res.ok) UI.toast(res.error);
          else UI.toast("Listing withdrawn");
          UI.go("#/listing-desk/" + l.id);
          return;
        }
        if (act === "delete") {
          UI.openSheet("<h2>Delete this draft?</h2><p>This cannot be undone.</p><button class=\"btn btn-danger\" type=\"button\" data-act=\"delete-yes\">Delete draft</button><button class=\"btn btn-secondary\" type=\"button\" data-close>Keep draft</button>");
          return;
        }
        if (act === "delete-yes") {
          var gone = Store.deleteDraft(l.id);
          UI.closeSheet();
          if (!gone.ok) { UI.toast(gone.error); return; }
          listTab = "draft";
          UI.toast("Draft deleted");
          UI.go("#/listings");
        }
      }
    });

    /* ---------- M9 revised terms ---------- */

    function termRows(l, revised) {
      var rows = [];
      var after = JSON.parse(JSON.stringify(l));
      ["investorShare", "companyPct", "minimum"].forEach(function (k) { if (typeof revised[k] === "number") after[k] = revised[k]; });
      if (Array.isArray(revised.shipments)) {
        revised.shipments.forEach(function (t, i) {
          var sh = after.shipments[i];
          if (!sh || !t) return;
          ["goods", "saleExpected", "startDay"].forEach(function (k) { if (typeof t[k] === "number") sh[k] = t[k]; });
          (t.steps || []).forEach(function (ts, n) {
            var hit = ts && ts.id ? sh.steps.filter(function (x) { return x.id === ts.id; })[0] : sh.steps[n];
            if (hit && ts && typeof ts.cost === "number") hit.cost = ts.cost;
          });
        });
      }
      var pct = function (n) { return n + "%"; };
      var defs = [
        ["Investor profit share", pct(l.investorShare), pct(after.investorShare)],
        ["Your capital contribution", pct(l.companyPct), pct(after.companyPct)],
        ["Minimum investor ticket", L.formatUsd(l.minimum), L.formatUsd(after.minimum)],
        ["Funding target", L.formatUsd(L.fundingTarget(l)), L.formatUsd(L.fundingTarget(after))],
        ["Your deposit", L.formatUsd(depositOf(l)), L.formatUsd(depositOf(after))],
        ["Expected sale", L.formatUsd(L.projection(l).expectedSale), L.formatUsd(L.projection(after).expectedSale)]
      ];
      defs.forEach(function (d) {
        var changed = d[1] !== d[2];
        rows.push("<div><span>" + esc(d[0]) + "</span><span class=\"num\">" + esc(d[1]) + "</span><span class=\"num\">" + (changed ? "<strong>" + esc(d[2]) + "</strong>" : esc(d[2])) + "</span></div>");
      });
      return rows.join("");
    }

    UI.screen({
      id: "terms",
      auth: "manager",
      back: true,
      section: "list",
      title: "Revised terms",
      test: function (h) { var m = /^#\/terms\/([\w-]+)$/.exec(h); return m ? { id: m[1] } : null; },
      render: function (stage, params) {
        var l = mine(params.id);
        if (!l) { notFound(stage, "That listing was not found.", "#/listings", "Back to listings"); return; }
        if (l.status !== "awaiting_terms" || !l.revised) {
          notFound(stage, "No revised terms are waiting for you on this listing.", "#/listing-desk/" + l.id, "Back to the listing");
          return;
        }
        var who = l.revised.actorId ? Store.byId(l.revised.actorId) : null;
        stage.innerHTML = "<div class=\"column\"><h1>Revised terms</h1><p>" + esc(l.name) + "</p>" +
          "<p class=\"muted\">Changed by " + esc(who ? who.name : "a reviewer") + (l.revised.at ? " · " + UI.when(l.revised.at) : "") + "</p>" +
          "<section class=\"panel\"><div class=\"statement\"><div><span></span><span class=\"muted\">Now</span><span class=\"muted\">Revised</span></div>" + termRows(l, l.revised) + "</div></section>" +
          "<div class=\"stack\"><button class=\"btn btn-primary\" type=\"button\" data-act=\"accept\">Accept revised terms</button>" +
          "<button class=\"btn btn-danger\" type=\"button\" data-act=\"decline\">Decline</button></div></div>";
      },
      on: function (act, el, params) {
        if (act !== "accept" && act !== "decline") return;
        var res = Store.respondTerms(params.id, act === "accept");
        if (!res.ok) { UI.toast(res.error); return; }
        UI.toast(act === "accept" ? "Terms accepted" : "Terms declined");
        UI.go("#/listing-desk/" + params.id);
      }
    });

    /* ---------- M10 deposit ---------- */

    var depositError = "";
    var depositFor = "";

    UI.screen({
      id: "deposit",
      auth: "manager",
      back: true,
      section: "list",
      title: "Pay deposit",
      task: function (p) { var l = mine(p.id); return !!(l && l.status === "approved"); },
      actions: function () { return "<button class=\"btn btn-primary\" type=\"button\" data-act=\"pay\">Pay deposit</button>"; },
      test: function (h) {
        var m = /^#\/deposit\/([\w-]+)$/.exec(h);
        if (!m) return null;
        if (depositFor !== m[1]) { depositFor = m[1]; depositError = ""; }
        return { id: m[1] };
      },
      render: function (stage, params) {
        var u = Store.user();
        var l = mine(params.id);
        if (!l) { notFound(stage, "That listing was not found.", "#/listings", "Back to listings"); return; }
        if (l.status !== "approved") { notFound(stage, "No deposit is due for this listing.", "#/listing-desk/" + l.id, "Back to the listing"); return; }
        var due = depositOf(l);
        var have = Store.bal("user:" + u.id + ":wallet");
        var short = have < due;
        stage.innerHTML = "<div class=\"column\"><h1>Pay deposit</h1><p>" + esc(l.name) + "</p>" +
          "<section class=\"panel stack\"><div class=\"kpi\"><span>Deposit due</span><b class=\"num\">" + L.formatUsd(due) + "</b></div>" +
          "<p class=\"muted\">" + l.companyPct + "% of the " + L.formatUsd(L.fundingTarget(l)) + " funding target.</p>" +
          "<div class=\"kpi\"><span>Wallet balance</span><span class=\"num\">" + L.formatUsd(have) + "</span></div>" +
          (short ? "" : "<div class=\"kpi\"><span>After payment</span><span class=\"num\">" + L.formatUsd(have - due) + "</span></div>") + "</section>" +
          "<p class=\"muted\">" + daysLeft(l) + " days left before this listing is withdrawn.</p>" +
          (short || depositError ? "<div class=\"banner banner-warning\" role=\"alert\"><strong>" + esc(depositError || "Error: your wallet is " + L.formatUsd(due - have) + " short of the deposit.") + "</strong>" + link("#/top-up", "Add money") + "</div>" : "") + "</div>";
      },
      on: function (act, el, params) {
        if (act !== "pay") return;
        var res = Store.payDeposit(params.id);
        if (!res.ok) { depositError = res.error; UI.go("#/deposit/" + params.id); return; }
        depositError = "";
        UI.go("#/listing-desk/" + params.id);
      }
    });

    /* ---------- M11 my step ---------- */

    var stepDoc = null;
    var stepOpened = "";

    function findStep(l, stepId) {
      var out = null;
      l.shipments.forEach(function (sh, si) {
        sh.steps.forEach(function (st, i) { if (st.id === stepId) out = { sh: sh, st: st, si: si, i: i }; });
      });
      return out;
    }

    UI.screen({
      id: "step",
      auth: "manager",
      back: true,
      section: "home",
      title: function (p) { var l = mine(p.listingId); var hit = l && findStep(l, p.stepId); return hit ? hit.st.name : "Step"; },
      test: function (h) {
        var m = /^#\/step\/([\w-]+)\/([\w-]+)$/.exec(h);
        if (!m) return null;
        if (stepOpened !== m[2]) { stepOpened = m[2]; stepDoc = null; }
        return { listingId: m[1], stepId: m[2] };
      },
      render: function (stage, params) {
        var l = mine(params.listingId);
        var hit = l && findStep(l, params.stepId);
        if (!hit) { notFound(stage, "That step was not found.", "#/desk", "Back to home"); return; }
        var st = hit.st;
        var yours = st.owner === "manager";
        var open = l.status === "live" && yours && (st.state === "todo" || st.state === "in_progress");
        var due = L.stepDue(l, hit.sh, hit.i);
        var late = L.isLate(l, hit.sh, hit.i, Store.state.now);
        var docs = (st.docs || []).map(function (d) {
          return "<div class=\"file\"><span>" + esc(d.name) + "</span><span class=\"muted\">" + esc(d.type || "file") + " · " + d.size + " bytes</span></div>";
        }).join("") || "<p class=\"muted\">No documents yet.</p>";
        var note = "";
        if (!yours) note = "<div class=\"banner\" role=\"status\"><strong>Staff own this step.</strong></div>";
        else if (!open) note = "<div class=\"banner\" role=\"status\"><strong>This step is " + esc(stateText(st.state)) + ".</strong></div>";
        else if (st.verify) note = "<p class=\"muted\">Staff verify this step after you mark it done.</p>";
        stage.innerHTML = "<div class=\"column\"><h1>" + esc(st.name) + "</h1><p>" + esc(l.name) + (l.shipments.length > 1 ? " · Shipment " + (hit.si + 1) : "") + "</p>" + note +
          "<section class=\"panel stack\">" +
          "<div class=\"kpi\"><span>State</span><span class=\"status" + (late ? " status-warning" : "") + "\">" + esc(late ? "Late" : stateText(st.state)) + "</span></div>" +
          "<div class=\"kpi\"><span>Duration</span><span class=\"num\">" + st.days + " days</span></div>" +
          (due ? "<div class=\"kpi\"><span>Due</span><span>" + UI.when(due) + "</span></div>" : "") +
          "<div class=\"kpi\"><span>Counterparty</span><span>" + esc(st.party || "Not set") + "</span></div></section>" +
          "<section class=\"stack\"><h2>Documents</h2>" + docs +
          (open ? "<label class=\"upload\">Add document<input class=\"sr\" type=\"file\" name=\"doc\" data-live=\"step-file\"></label><p id=\"doc-name\" class=\"muted\">" + (stepDoc ? esc(stepDoc.name) + " will be attached." : "") + "</p>" : "") + "</section>" +
          (open ? "<div class=\"stack\">" + (st.state === "todo" ? "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"progress\">Mark in progress</button>" : "") +
            "<button class=\"btn btn-primary\" type=\"button\" data-act=\"done\">Mark done</button></div>" : "") +
          "<p>" + link("#/listing-desk/" + l.id, "Back to the listing") + "</p></div>";
      },
      on: function (act, el, params) {
        var l = mine(params.listingId);
        var hit = l && findStep(l, params.stepId);
        if (!hit) return;
        if (act === "step-file") {
          var f = el.files && el.files[0];
          stepDoc = f ? { name: f.name, type: f.type, size: f.size } : null;
          var slot = document.getElementById("doc-name");
          if (slot) slot.textContent = stepDoc ? stepDoc.name + " will be attached." : "";
          return;
        }
        if (act !== "progress" && act !== "done") return;
        var res = Store.completeStep(l.id, hit.sh.id, hit.st.id, act === "done" ? stepDoc : null, act === "progress" ? "in_progress" : "done");
        if (!res.ok) { UI.toast(res.error); return; }
        stepDoc = null;
        UI.toast(act === "done" ? "Step marked done" : "Step started");
        UI.go(act === "done" ? "#/listing-desk/" + l.id : "#/step/" + l.id + "/" + hit.st.id);
      }
    });

    /* ---------- M12 plan change ---------- */

    var planForm = null;
    var planErrors = {};
    var planError = "";

    function planCapture() {
      var node = document.getElementById("plan");
      if (node && planForm) planRead(new FormData(node), planForm.steps);
    }

    UI.screen({
      id: "plan",
      auth: "manager",
      back: true,
      section: "list",
      title: "Plan change",
      test: function (h) {
        var m = /^#\/plan\/([\w-]+)$/.exec(h);
        if (!m) return null;
        if (planForm && planForm.id !== m[1]) { planForm = null; planErrors = {}; planError = ""; }
        return { id: m[1] };
      },
      render: function (stage, params) {
        var l = mine(params.id);
        if (!l) { notFound(stage, "That listing was not found.", "#/listings", "Back to listings"); return; }
        if (l.status !== "live") { notFound(stage, "A plan change is only possible while the listing is live.", "#/listing-desk/" + l.id, "Back to the listing"); return; }
        if (!planForm) planForm = { id: l.id, steps: planFrom(l.shipments[0] ? l.shipments[0].steps : L.defaultSteps("new")) };
        var pending = l.planProposal && l.planProposal.status === "proposed"
          ? "<div class=\"banner\" role=\"status\"><strong>A plan change is already waiting for staff approval.</strong><p>Sending again replaces it.</p></div>" : "";
        stage.innerHTML = "<div class=\"column\"><h1>Plan change</h1><p>" + esc(l.name) + "</p>" +
          "<p class=\"muted\">The live steps stay as they are until staff approve your change.</p>" + pending +
          (planError ? "<p class=\"err\" role=\"alert\">" + esc(planError) + "</p>" : "") +
          "<form id=\"plan\" class=\"stack\">" + planEditor(planForm.steps, planErrors) +
          "<button class=\"btn btn-primary\" type=\"button\" data-act=\"send-plan\">Send for approval</button></form></div>";
      },
      submit: function () {},
      on: function (act, node, params) {
        if (!planForm) return;
        planCapture();
        if (act === "add-step" || act === "remove-step" || act === "up" || act === "down") {
          planOn(act, node, planForm.steps);
          planError = "";
          UI.go("#/plan/" + params.id);
          return;
        }
        if (act !== "send-plan") return;
        planErrors = planCheck(planForm.steps);
        planError = Object.keys(planErrors).length ? "Error: fix the highlighted fields." : "";
        if (!planError) {
          var res = Store.proposePlan(params.id, planForm.steps);
          if (!res.ok) planError = res.error;
          else {
            planForm = null;
            UI.toast("Plan change sent");
            UI.go("#/listing-desk/" + params.id);
            return;
          }
        }
        UI.go("#/plan/" + params.id);
      }
    });
  }
  root.ShehnatManager = { register: register };
})(typeof globalThis !== "undefined" ? globalThis : this);
