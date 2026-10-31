/* Staff home, review, money, team, shareholders, users, settings, audit, and ledger. */
(function (root) {
  "use strict";
  function register(UI) {
    var Store = root.ShehnatStore;
    var L = root.ShehnatLogic;
    var tab = "investors";
    var listFilter = { status: "", stage: "", late: "", share: "", q: "" };
    var auditFilter = { actor: "", action: "", entity: "" };
    var userQuery = "";

    function staff() {
      return Store.state.users.filter(function (u) { return u.role === "reviewer" || u.role === "owner"; });
    }

    function panel(label, value) {
      return "<section class=\"panel\"><p class=\"muted\">" + UI.esc(label) + "</p><p class=\"figure num\">" + value + "</p></section>";
    }

    function rowLink(href, title, meta, end) {
      var open = href ? "<a class=\"row\" href=\"" + href + "\" data-go=\"" + href + "\">" : "<div class=\"row\">";
      var close = href ? "</a>" : "</div>";
      return open + "<span class=\"title\">" + UI.esc(title) + "</span><span class=\"meta\">" + UI.esc(meta) + "</span>" +
        (end ? "<span class=\"end status\">" + UI.esc(end) + "</span>" : "") + close;
    }

    /* Sale, costs and profit for a listing: final once settlement is approved, otherwise projected from what is booked so far. */
    function figures(l) {
      var done = l.status === "completed" || !!(l.settlement && l.settlement.status === "approved");
      var r = (done && l.settlement && l.settlement.result) || Store.settlementInput(l);
      var any = r.sale || r.costs;
      return { done: done, any: !!any, sale: r.sale, costs: r.costs, profit: r.gross, text: any ? (done ? "Final" : "So far") + " · Sale " + L.formatUsd(r.sale) + " · Costs " + L.formatUsd(r.costs) + " · Profit " + L.formatUsd(r.gross) : "No sale or costs booked yet" };
    }

    function listingLate(l) {
      return (l.shipments || []).some(function (sh) {
        return (sh.steps || []).some(function (st, i) { return L.isLate(l, sh, i, Store.state.now); });
      });
    }

    function workFor(actor) {
      var items = [];
      Store.state.users.forEach(function (u) {
        if (!u.application || u.application.status !== "pending") return;
        if (L.canDecide(actor, u.application.assigneeId)) return;
        items.push({ href: "#/review/" + u.id, title: u.name, meta: "Verification waiting" });
      });
      Store.state.listings.forEach(function (l) {
        if ((l.status === "in_review" || l.status === "awaiting_terms") && !L.canDecide(actor, l.assigneeId)) {
          items.push({ href: "#/queue-listing/" + l.id, title: l.name, meta: "Listing review" });
        }
        if (L.overdue(l, Store.state.now, Store.state.settings.overdueDays) && !L.can(actor, "overdue-fill")) {
          items.push({ href: "#/overdue", title: l.name, meta: "Funding overdue" });
        }
        if (l.settlement && l.settlement.status === "proposed" && !L.can(actor, "settlement-approve") && !L.fourEyes(actor.id, l.settlement.proposerId)) {
          items.push({ href: "#/settlement/" + l.id, title: l.name, meta: "Settlement waiting" });
        }
      });
      Store.state.withdrawals.forEach(function (w) {
        if (w.status !== "pending") return;
        var act = w.amount >= Store.state.settings.largeWithdrawal ? "withdraw-large" : "withdraw-small";
        if (L.can(actor, act)) return;
        items.push({ href: "#/staff-money", title: "Withdrawal " + L.formatUsd(w.amount), meta: "Waiting to be paid" });
      });
      (Store.state.listings || []).forEach(function (l) {
        (l.approvals || []).forEach(function (ap) {
          if (ap.status !== "proposed") return;
          if (L.fourEyes(actor.id, ap.proposerId)) return;
          items.push({ href: "#/approvals", title: l.name, meta: "Approval · " + ap.type });
        });
      });
      /* Ops board step cards: steps a manager sent over come first, then late ones, then the rest. */
      if (!L.can(actor, "steps")) {
        var steps = [];
        Store.state.listings.forEach(function (l) {
          if (l.status !== "live") return;
          (l.shipments || []).forEach(function (sh) {
            (sh.steps || []).forEach(function (st, i) {
              var s = st.state || "todo";
              if (s === "done" || s === "verified" || s === "skipped") return;
              var late = L.isLate(l, sh, i, Store.state.now);
              if (!st.ready && st.owner === "manager" && !late) return;
              var rank = st.ready ? 0 : late ? 1 : 2;
              var meta = l.name + " · " + (st.ready ? "Sent by the manager" : late ? "Late" : s === "blocked" ? "Blocked" : s === "in_progress" ? "In progress" : "To do");
              steps.push({ rank: rank, href: "#/ops/" + l.id, title: st.name, meta: meta });
            });
          });
        });
        steps.sort(function (a, b) { return a.rank - b.rank; });
        items = items.concat(steps);
      }
      return items;
    }

    UI.screen({
      id: "queue",
      auth: "staff",
      section: "queue",
      title: "Queue",
      test: function (h) { return h === "#/queue" ? {} : null; },
      render: function (stage) {
        var actor = Store.user();
        var listings = Store.state.listings;
        var live = listings.filter(function (l) { return l.status === "live"; });
        var raised = live.reduce(function (s, l) { return s + L.raised(l); }, 0);
        var overdueN = listings.filter(function (l) { return L.overdue(l, Store.state.now, Store.state.settings.overdueDays); }).length;
        var lateN = listings.filter(listingLate).length;
        var work = workFor(actor);
        var lead = work[0] ? "<a class=\"lead-staff\" href=\"" + work[0].href + "\" data-go=\"" + work[0].href + "\"><span class=\"lead-staff-eyebrow\">Up next</span><span class=\"lead-staff-title\">" + UI.esc(work[0].title) + "</span><span class=\"lead-staff-meta\">" + UI.esc(work[0].meta) + "</span><span class=\"lead-staff-go\" aria-hidden=\"true\">›</span></a>" : "<div class=\"empty\"><p>Nothing is waiting for you.</p></div>";
        var next = work[1] ? rowLink(work[1].href, work[1].title, work[1].meta, "Next") : "";
        var more = work.slice(2, 8).map(function (w) { return rowLink(w.href, w.title, w.meta); }).join("");
        if (more) next += "<h2>Also waiting</h2>" + more + (work.length > 8 ? "<p class=\"muted\">" + (work.length - 8) + " more</p>" : "");
        var ledger = "";
        if (actor.role === "owner") {
          var check = L.verify(Store.state.entries);
          ledger = panel("Ledger", check.ok ? "OK" : "Ledger does not balance.");
        }
        stage.innerHTML = "<div class=\"column\"><h1>Queue</h1>" + lead + next +
          UI.kpis([["Live", String(live.length)], ["Raised", L.formatUsd(raised)],
            ["Overdue", "<a href=\"#/overdue\" data-go=\"#/overdue\">" + overdueN + "</a>"], ["Late", String(lateN)]]) +
          UI.fold("Platform", UI.kpis([["Treasury", L.formatUsd(Store.bal("platform:treasury"))], ["Reserve", L.formatUsd(Store.bal("platform:reserve"))]]) + ledger) +
          "<a href=\"#/queue-list\" data-go=\"#/queue-list\">Open the queue</a></div>";
      }
    });

    UI.screen({
      id: "queue-list",
      auth: "staff",
      section: "queue",
      back: true,
      title: "Queue",
      test: function (h) { return h === "#/queue-list" ? {} : null; },
      render: function (stage) {
        var tabs = [["investors", "Investors"], ["managers", "Managers"], ["listings", "Listings"]].map(function (t) {
          return "<button type=\"button\" data-act=\"tab\" data-tab=\"" + t[0] + "\" aria-selected=\"" + (tab === t[0]) + "\">" + t[1] + "</button>";
        }).join("");
        var rows = "";
        if (tab === "listings") {
          var listings = Store.state.listings.filter(function (l) { return l.status === "in_review" || l.status === "awaiting_terms"; });
          rows = listings.length ? listings.map(function (l) {
            var who = Store.byId(l.assigneeId);
            return rowLink("#/queue-listing/" + l.id, l.name, who ? who.name : "Unassigned", l.status === "awaiting_terms" ? "Revised terms" : "In review");
          }).join("") : "<div class=\"empty\"><p>No listing is waiting for review.</p></div>";
        } else {
          var want = tab === "investors" ? "investor" : "manager";
          var people = Store.state.users.filter(function (u) { return u.role === want && u.application && u.application.status === "pending"; });
          rows = people.length ? people.map(function (u) {
            var who = Store.byId(u.application.assigneeId);
            return rowLink("#/review/" + u.id, u.name, who ? who.name : "Unassigned", "Pending");
          }).join("") : "<div class=\"empty\"><p>Nothing is waiting in this queue.</p></div>";
        }
        stage.innerHTML = "<div class=\"column\"><h1>Queue</h1><div class=\"tabs\">" + tabs + "</div>" + rows + "</div>";
      },
      on: function (act, el) { if (act === "tab") { tab = el.getAttribute("data-tab"); UI.go("#/queue-list"); } }
    });

    var rvTab = "details", rvOpen = "";
    UI.screen({
      id: "review",
      auth: "staff",
      back: true,
      section: "queue",
      title: function (p) { var person = Store.byId(p.id); return person ? person.name : "Not found"; },
      test: function (h) { var m = /^#\/review\/([\w-]+)$/.exec(h); return m ? { id: m[1] } : null; },
      render: function (stage, params) {
        var person = Store.byId(params.id);
        var actor = Store.user();
        if (!person || !person.application) { stage.innerHTML = "<div class=\"column\"><h1>Not found</h1></div>"; return; }
        var app = person.application;
        var p = app.payload || {};
        var denied = L.canDecide(actor, app.assigneeId);
        var options = staff().map(function (s) { return "<option value=\"" + s.id + "\"" + (app.assigneeId === s.id ? " selected" : "") + ">" + UI.esc(s.name) + "</option>"; }).join("");
        var docs = (p.files || []).map(function (f) {
          return "<div class=\"file\"><span>" + UI.esc(f.name) + "</span><button type=\"button\" class=\"btn-text\" data-act=\"view\" data-name=\"" + UI.esc(f.name) + "\">View</button></div>";
        }).join("") || "<p class=\"muted\">No document metadata was stored.</p>";
        var hist = (app.history || []).map(function (h) {
          var who = Store.byId(h.actorId);
          return "<li><p>" + UI.esc(h.action) + (h.reason ? ". " + UI.esc(h.reason) : "") + "</p><p class=\"muted\">" + UI.esc(who ? who.name : "") + " · " + UI.when(h.at) + "</p></li>";
        }).join("");
        var actions = "";
        if (app.status !== "pending") actions = "<p class=\"status\">" + UI.esc(app.status) + "</p>";
        else if (denied) actions = "<p class=\"muted\">" + UI.esc(denied) + "</p>";
        else actions = "<button class=\"btn btn-primary\" type=\"button\" data-act=\"approve\">Approve</button><button class=\"btn btn-danger\" type=\"button\" data-act=\"reject\">Reject</button>";
        if (rvOpen !== person.id) { rvOpen = person.id; rvTab = "details"; }
        var body = "";
        if (rvTab === "details") {
          body = "<p>" + UI.esc(p.idType || "Identity") + " <span class=\"num\">" + UI.esc(p.idNumber || "") + "</span></p><p>" + UI.esc(p.phone || "") + "</p>" +
            "<label class=\"field\"><span>Assign</span><select id=\"assignee\"><option value=\"\">Unassigned</option>" + options + "</select></label>" +
            "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"assign\">Save assignment</button>";
        }
        if (rvTab === "documents") body = docs + "<p id=\"viewer\" class=\"muted\"></p>";
        if (rvTab === "history") body = hist ? "<ol class=\"timeline\">" + hist + "</ol>" : "<p class=\"muted\">No history yet.</p>";
        stage.innerHTML = "<div class=\"column\"><h1>" + UI.esc(person.name) + "</h1><p class=\"muted\">" + UI.esc(person.email) + " · " + UI.esc(UI.cname(person.country)) + "</p>" +
          UI.tabs([["details", "Details"], ["documents", "Documents"], ["history", "History"]], rvTab, "rvtab") +
          "<div class=\"stack\">" + body + "</div>" + UI.sticky(actions) + "</div>";
      },
      on: function (act, el, params) {
        var person = Store.byId(params.id);
        if (act === "rvtab") { rvTab = el.getAttribute("data-tab"); UI.go("#/review/" + params.id); return; }
        if (act === "view") {
          Store.state.audit.unshift({ id: "view" + Date.now(), at: Store.state.now, actorId: Store.user().id, action: "Viewed document", entity: params.id, reason: el.getAttribute("data-name") });
          Store.save();
          var slot = document.getElementById("viewer");
          if (slot) slot.textContent = "Placeholder for " + el.getAttribute("data-name") + ". This view is logged.";
          return;
        }
        if (act === "assign") {
          var res = Store.assign(params.id, document.getElementById("assignee").value);
          if (!res.ok) UI.toast(res.error);
          else UI.go("#/review/" + params.id);
          return;
        }
        if (act === "approve") {
          var ok = Store.decide(params.id, true, "");
          if (!ok.ok) { UI.toast(ok.error); return; }
          UI.go("#/queue");
          return;
        }
        if (act === "reject") {
          UI.openSheet("<h2>Reject " + UI.esc(person.name) + "</h2><label class=\"field\" for=\"why\"><span>Reason</span><textarea id=\"why\"></textarea></label><button class=\"btn btn-danger\" type=\"button\" data-act=\"reject-send\">Reject application</button>");
          return;
        }
        if (act === "reject-send") {
          var why = document.getElementById("why").value;
          var sent = Store.decide(params.id, false, why);
          if (!sent.ok) { var err = document.getElementById("why"); if (err) err.insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(sent.error) + "</span>"); return; }
          UI.closeSheet();
          UI.go("#/queue");
        }
      }
    });

    function shareholders() {
      return Store.state.users.filter(function (u) { return u.shareholder === true && u.application && u.application.status === "approved"; });
    }

    var qlTab = "terms", qlOpen = "";
    UI.screen({
      id: "queue-listing",
      title: function (p) { var l = Store.listing(p.id); return l ? l.name : "Not found"; },
      auth: "staff",
      back: true,
      section: "queue",
      test: function (h) { var m = /^#\/queue-listing\/([\w-]+)$/.exec(h); return m ? { id: m[1] } : null; },
      render: function (stage, params) {
        var l = Store.listing(params.id);
        var actor = Store.user();
        if (!l) { stage.innerHTML = "<div class=\"column\"><h1>Not found</h1></div>"; return; }
        var proj = L.projection(l);
        var options = staff().map(function (s) { return "<option value=\"" + s.id + "\"" + (l.assigneeId === s.id ? " selected" : "") + ">" + UI.esc(s.name) + "</option>"; }).join("");
        var steps = (l.shipments || []).map(function (sh) {
          return "<h2>Shipment</h2>" + (sh.steps || []).map(function (st) {
            return "<p>" + UI.esc(st.name) + (st.tag ? " · " + UI.esc(st.tag) : "") + (st.verify ? " · Document required" : "") + "</p>";
          }).join("");
        }).join("");
        var covered = L.TAGS.map(function (tag) {
          var ok = (l.shipments || []).some(function (sh) { return (sh.steps || []).some(function (st) { return st.tag === tag; }); });
          return "<li>" + UI.esc(tag) + (ok ? "" : " · missing") + "</li>";
        }).join("");
        var buyers = "<option value=\"\">No buyer shareholder</option>" + shareholders().map(function (u) {
          return "<option value=\"" + u.id + "\"" + (l.buyerShareholderId === u.id ? " selected" : "") + ">" + UI.esc(u.name) + "</option>";
        }).join("");
        var waive = "";
        if (!l.waiver && !L.can(actor, "waiver")) waive = "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"waive\">Waive deposit</button>";
        else if (l.waiver) waive = "<p>Deposit waived.</p>";
        var denied = L.canDecide(actor, l.assigneeId);
        var actions = denied ? "<p class=\"muted\">" + UI.esc(denied) + "</p>" : "<button class=\"btn btn-primary\" type=\"button\" data-act=\"approve\">Approve</button><button class=\"btn btn-danger\" type=\"button\" data-act=\"reject\">Reject</button>";
        if (qlOpen !== l.id) { qlOpen = l.id; qlTab = "terms"; }
        var body = "";
        if (qlTab === "terms") {
          body = UI.kpis([
            ["Investor share", l.investorShare + "%"], ["Manager capital", l.companyPct + "%"],
            ["Minimum", L.formatUsd(l.minimum)], ["Funding target", L.formatUsd(proj.target)],
            ["Expected sale", L.formatUsd(proj.expectedSale)], ["Expected pool", L.formatUsd(proj.pool)],
            ["Service fee", L.formatUsd(proj.fee)], ["Cycle", proj.cycle + " days"]
          ]) + "<p class=\"muted\">All figures except share, capital and minimum are expected.</p>";
        }
        if (qlTab === "plan") {
          var chips = L.TAGS.map(function (tag) {
            var ok = (l.shipments || []).some(function (sh) { return (sh.steps || []).some(function (st) { return st.tag === tag; }); });
            return "<span class=\"chip" + (ok ? "" : " chip-warn") + "\">" + UI.esc(tag) + (ok ? "" : " · missing") + "</span>";
          }).join("");
          body = "<div class=\"chips\">" + chips + "</div>" + (l.shipments || []).map(function (sh, i) {
            return UI.fold("Shipment " + (i + 1) + " · " + (sh.steps || []).length + " steps", (sh.steps || []).map(function (st) {
              return "<p>" + UI.esc(st.name) + (st.tag ? " · " + UI.esc(st.tag) : "") + (st.verify ? " · Document required" : "") + "</p>";
            }).join(""), i === 0);
          }).join("");
        }
        if (qlTab === "notes") {
          body = "<label class=\"field\"><span>Assign</span><select id=\"assignee\"><option value=\"\">Unassigned</option>" + options + "</select></label>" +
            "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"assign\">Save assignment</button>" +
            UI.field("market", "Market check", "<textarea id=\"market\" name=\"market\">" + UI.esc(l.marketNote || "") + "</textarea>", "") +
            "<label class=\"field\"><span>Buyer shareholder</span><select id=\"buyer\">" + buyers + "</select></label>" + waive;
        }
        stage.innerHTML = "<div class=\"column\"><h1>" + UI.esc(l.name) + "</h1><p>" + UI.esc(UI.cname(l.source)) + " to " + UI.esc(UI.cname(l.buyer)) + "</p>" +
          UI.tabs([["terms", "Terms"], ["plan", "Plan"], ["notes", "Notes"]], qlTab, "qltab") +
          "<div class=\"stack\">" + body + "</div>" +
          UI.sticky(actions + "<a class=\"btn btn-secondary\" href=\"#/revise/" + l.id + "\" data-go=\"#/revise/" + l.id + "\">Revise terms</a>") + "</div>";
      },
      on: function (act, el, params) {
        if (act === "qltab") { qlTab = el.getAttribute("data-tab"); UI.go("#/queue-listing/" + params.id); return; }
        if (act === "assign") {
          var assigned = Store.assign(params.id, document.getElementById("assignee").value);
          if (!assigned.ok) UI.toast(assigned.error);
          else UI.go("#/queue-listing/" + params.id);
          return;
        }
        function body() {
          return {
            marketNote: document.getElementById("market") ? document.getElementById("market").value : (Store.listing(params.id).marketNote || ""),
            buyerShareholderId: document.getElementById("buyer") ? document.getElementById("buyer").value : (Store.listing(params.id).buyerShareholderId || "")
          };
        }
        if (act === "waive") {
          var fields = body();
          fields.waiver = true;
          fields.waiverOnly = true;
          var waived = Store.reviewListing(params.id, "approve", fields);
          if (!waived.ok) UI.toast(waived.error);
          else UI.go("#/queue-listing/" + params.id);
          return;
        }
        if (act === "approve") {
          var approved = Store.reviewListing(params.id, "approve", body());
          if (!approved.ok) UI.toast(approved.error);
          else UI.go("#/queue");
          return;
        }
        if (act === "reject") {
          UI.openSheet("<h2>Reject listing</h2><label class=\"field\" for=\"why\"><span>Reason</span><textarea id=\"why\"></textarea></label><button class=\"btn btn-danger\" type=\"button\" data-act=\"reject-send\">Reject listing</button>");
          return;
        }
        if (act === "reject-send") {
          var sent = Store.reviewListing(params.id, "reject", { reason: document.getElementById("why").value });
          if (!sent.ok) { document.getElementById("why").insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(sent.error) + "</span>"); return; }
          UI.closeSheet();
          UI.go("#/queue");
        }
      }
    });

    UI.screen({
      id: "revise",
      auth: "staff",
      back: true,
      section: "queue",
      title: "Revised terms",
      test: function (h) { var m = /^#\/revise\/([\w-]+)$/.exec(h); return m ? { id: m[1] } : null; },
      render: function (stage, params) {
        var l = Store.listing(params.id);
        if (!l) { stage.innerHTML = "<div class=\"column\"><h1>Not found</h1></div>"; return; }
        var rev = l.revised || {};
        var steps = (l.shipments || []).map(function (sh, s) {
          return (sh.steps || []).map(function (st, n) {
            var proposed = rev.shipments && rev.shipments[s] && rev.shipments[s].steps ? rev.shipments[s].steps.filter(function (x) { return x.id === st.id; })[0] : null;
            var next = proposed && typeof proposed.cost === "number" ? (proposed.cost / 100).toFixed(2) : ((st.cost || 0) / 100).toFixed(2);
            return "<label class=\"field\"><span>" + UI.esc(st.name) + " · " + L.formatUsd(st.cost || 0) + "</span><input class=\"num\" data-step=\"" + st.id + "\" data-ship=\"" + sh.id + "\" value=\"" + next + "\"></label>";
          }).join("");
        }).join("");
        stage.innerHTML = "<div class=\"column\"><h1>Revised terms</h1><p>" + UI.esc(l.name) + "</p>" +
          "<p>Investor share <span class=\"num\">" + l.investorShare + "%</span></p>" +
          UI.field("investorShare", "New investor share", "<input id=\"investorShare\" class=\"num\" value=\"" + (rev.investorShare || l.investorShare) + "\">", "") +
          "<p>Manager capital <span class=\"num\">" + l.companyPct + "%</span></p>" +
          UI.field("companyPct", "New manager capital", "<input id=\"companyPct\" class=\"num\" value=\"" + (rev.companyPct || l.companyPct) + "\">", "") +
          "<p>Minimum <span class=\"num\">" + L.formatUsd(l.minimum) + "</span></p>" +
          UI.field("minimum", "New minimum", "<input id=\"minimum\" class=\"num\" value=\"" + ((rev.minimum || l.minimum) / 100).toFixed(2) + "\">", "") +
          "<h2>Step costs</h2><p class=\"muted\">The first figure is the current cost.</p>" + steps +
          "<p id=\"revise-err\" class=\"err\"></p><button class=\"btn btn-primary\" type=\"button\" data-act=\"send\">Send revised terms</button></div>";
      },
      on: function (act, el, params) {
        if (act !== "send") return;
        var l = Store.listing(params.id);
        var minimum = L.usdToCents(document.getElementById("minimum").value);
        if (!minimum.ok) { document.getElementById("revise-err").textContent = minimum.error; return; }
        var shipments = [];
        var badCost = "";
        (l.shipments || []).forEach(function (sh) {
          var steps = [];
          (sh.steps || []).forEach(function (st) {
            var input = document.querySelector("[data-step=\"" + UI.esc(st.id) + "\"]");
            var cost = input ? L.usdToCents(input.value) : { ok: true, cents: st.cost || 0 };
            if (!cost.ok) badCost = cost.error;
            steps.push({ id: st.id, cost: cost.ok ? cost.cents : 0 });
          });
          shipments.push({ id: sh.id, steps: steps });
        });
        if (badCost) { document.getElementById("revise-err").textContent = badCost; return; }
        var sent = Store.reviewListing(params.id, "revise", {
          terms: {
            investorShare: Number(document.getElementById("investorShare").value),
            companyPct: Number(document.getElementById("companyPct").value),
            minimum: minimum.ok ? minimum.cents : l.minimum,
            shipments: shipments
          }
        });
        if (!sent.ok) { document.getElementById("revise-err").textContent = sent.error; return; }
        UI.go("#/queue");
      }
    });

    UI.screen({
      id: "overdue",
      auth: "staff",
      back: true,
      section: "queue",
      title: "Overdue",
      test: function (h) { return h === "#/overdue" ? {} : null; },
      render: function (stage) {
        var actor = Store.user();
        var canFill = !L.can(actor, "overdue-fill");
        var rows = Store.state.listings.filter(function (l) { return L.overdue(l, Store.state.now, Store.state.settings.overdueDays); });
        var body = rows.length ? rows.map(function (l) {
          var left = L.remaining(l);
          var fill = canFill ? "<button class=\"btn btn-primary\" type=\"button\" data-act=\"fill\" data-id=\"" + l.id + "\">Fill from treasury</button>" : "";
          return "<section class=\"panel\"><h2>" + UI.esc(l.name) + "</h2><p class=\"num\">" + L.formatUsd(left) + " still to raise</p>" + fill + "</section>";
        }).join("") : "<div class=\"empty\"><p>No funding is overdue.</p></div>";
        stage.innerHTML = "<div class=\"column\"><h1>Overdue</h1>" + body + "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"leave\">Leave open</button></div>";
      },
      on: function (act, el) {
        if (act === "leave") { UI.back(); return; }
        if (act !== "fill") return;
        var res = Store.fillOverdue(el.getAttribute("data-id"));
        if (!res.ok) UI.toast(res.error);
        else UI.go("#/overdue");
      }
    });

    UI.screen({
      id: "staff-listings",
      auth: "staff",
      section: "list",
      title: "Listings",
      test: function (h) { return h === "#/staff-listings" ? {} : null; },
      render: function (stage) {
        var actor = Store.user();
        var statuses = [];
        Store.state.listings.forEach(function (l) { if (statuses.indexOf(l.status) === -1) statuses.push(l.status); });
        function opt(value, label, current) {
          return "<option value=\"" + UI.esc(value) + "\"" + (value === current ? " selected" : "") + ">" + UI.esc(label) + "</option>";
        }
        var rows = Store.state.listings.filter(function (l) {
          if (listFilter.status && l.status !== listFilter.status) return false;
          if (listFilter.stage !== "" && String(L.listingStage(l)) !== listFilter.stage) return false;
          if (listFilter.late === "yes" && !listingLate(l)) return false;
          if (listFilter.share === "yes" && !l.shareholderListing) return false;
          if (listFilter.share === "no" && l.shareholderListing) return false;
          if (listFilter.q && l.name.toLowerCase().indexOf(listFilter.q) === -1) return false;
          return true;
        }).map(function (l) {
          var href = "";
          if (actor.role === "ops" || actor.role === "owner") href = "#/ops/" + l.id;
          else if (actor.role === "reviewer" && (l.status === "in_review" || l.status === "awaiting_terms")) href = "#/queue-listing/" + l.id;
          var fg = figures(l);
          if (!href && (fg.done || fg.any)) href = "#/settlement/" + l.id;
          return rowLink(href, l.name, L.STAGES[L.listingStage(l)] + " · " + l.status + " · " + fg.text, l.shareholderListing ? "Shareholder" : "");
        }).join("");
        var nActive = ["status", "stage", "late", "share", "q"].filter(function (k) { return listFilter[k]; }).length;
        stage.innerHTML = "<div class=\"column\"><h1>Listings</h1><details class=\"fold\"" + (nActive ? " open" : "") + "><summary>Filters" + (nActive ? " (" + nActive + ")" : "") + "</summary><form class=\"fold-body stack\">" +
          "<label class=\"field\"><span>Status</span><select name=\"status\">" + opt("", "Any status", listFilter.status) + statuses.map(function (s) { return opt(s, s, listFilter.status); }).join("") + "</select></label>" +
          "<label class=\"field\"><span>Stage</span><select name=\"stage\">" + opt("", "Any stage", listFilter.stage) + L.STAGES.map(function (name, i) { return opt(String(i), name, listFilter.stage); }).join("") + "</select></label>" +
          "<label class=\"field\"><span>Late</span><select name=\"late\">" + opt("", "Any", listFilter.late) + opt("yes", "Late only", listFilter.late) + "</select></label>" +
          "<label class=\"field\"><span>Shareholder</span><select name=\"share\">" + opt("", "Any", listFilter.share) + opt("yes", "Shareholder listings", listFilter.share) + opt("no", "Other listings", listFilter.share) + "</select></label>" +
          UI.field("q", "Name", "<input id=\"q\" name=\"q\" value=\"" + UI.esc(listFilter.q) + "\">", "") +
          "<button class=\"btn btn-secondary\" type=\"submit\">Search</button></form></details>" +
          (rows || "<div class=\"empty\"><p>No listing matches.</p></div>") + "</div>";
      },
      submit: function (data) {
        listFilter = { status: data.get("status") || "", stage: data.get("stage") || "", late: data.get("late") || "", share: data.get("share") || "", q: (data.get("q") || "").toLowerCase() };
        UI.go("#/staff-listings");
      }
    });

    var moneyTab = "pending";
    UI.screen({
      id: "staff-money",
      title: "Money",
      auth: "staff",
      section: "money",
      test: function (h) { return h === "#/staff-money" ? {} : null; },
      render: function (stage) {
        var actor = Store.user();
        if (!moneyTab) moneyTab = "pending";
        var list = Store.state.withdrawals.filter(function (w) { return (w.status === "pending") === (moneyTab === "pending"); });
        var rows = list.map(function (w) {
          var who = Store.byId(w.userId);
          var large = w.amount >= Store.state.settings.largeWithdrawal;
          var buttons = "";
          if (w.status === "pending") {
            var denied = L.can(actor, large ? "withdraw-large" : "withdraw-small");
            if (denied) buttons = "<span class=\"muted\">" + UI.esc(denied) + "</span>";
            else buttons = UI.menu("Decide", "<button class=\"btn-text\" type=\"button\" data-act=\"pay\" data-id=\"" + w.id + "\">Approve</button><button class=\"btn-text\" type=\"button\" data-act=\"decline\" data-id=\"" + w.id + "\">Decline</button>");
          } else if (w.status === "paid" && actor.role === "owner") {
            buttons = UI.menu("Options", "<button class=\"btn-text\" type=\"button\" data-act=\"fail\" data-id=\"" + w.id + "\">Mark failed</button>");
          }
          return "<div class=\"row\"><span class=\"title\">" + UI.esc(who ? who.name : "Withdrawal") + "</span><span class=\"meta\">" + UI.esc(w.status) + (w.reference ? " · " + UI.esc(w.reference) : "") + "</span><span class=\"end\"><span class=\"num\">" + L.formatUsd(w.amount) + "</span> " + buttons + "</span></div>";
        }).join("");
        var reserve = actor.role === "owner" ? "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"reserve-out\">Reserve out</button>" : "";
        var top = !L.can(actor, "treasury") ? "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"topup\">Treasury top-up</button>" : "";
        stage.innerHTML = "<div class=\"column\"><h1>Money</h1>" +
          UI.kpis([["Treasury", L.formatUsd(Store.bal("platform:treasury"))], ["Revenue", L.formatUsd(Store.bal("platform:revenue"))], ["Reserve", L.formatUsd(Store.bal("platform:reserve"))]]) +
          (top || reserve ? "<div class=\"stack\">" + top + reserve + "</div>" : "") +
          UI.tabs([["pending", "Pending"], ["history", "History"]], moneyTab, "mtab") +
          (rows || "<div class=\"empty\"><p>No withdrawals here.</p></div>") + "</div>";
      },
      on: function (act, el) {
        if (act === "mtab") { moneyTab = el.getAttribute("data-tab"); UI.go("#/staff-money"); return; }
        if (act === "pay") {
          UI.openSheet("<h2>Pay withdrawal</h2>" + UI.field("reference", "Reference", "<input id=\"reference\">", "") + "<button class=\"btn btn-primary\" type=\"button\" data-act=\"pay-send\" data-id=\"" + el.getAttribute("data-id") + "\">Pay</button>");
          return;
        }
        if (act === "pay-send") {
          var paid = Store.decideWithdrawal(el.getAttribute("data-id"), true, document.getElementById("reference").value);
          if (!paid.ok) { document.getElementById("reference").insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(paid.error) + "</span>"); return; }
          UI.closeSheet();
          UI.go("#/staff-money");
          return;
        }
        if (act === "decline") {
          UI.openSheet("<h2>Decline withdrawal</h2><label class=\"field\" for=\"why\"><span>Reason</span><textarea id=\"why\"></textarea></label><button class=\"btn btn-danger\" type=\"button\" data-act=\"decline-send\" data-id=\"" + el.getAttribute("data-id") + "\">Decline</button>");
          return;
        }
        if (act === "decline-send") {
          var declined = Store.decideWithdrawal(el.getAttribute("data-id"), false, document.getElementById("why").value);
          if (!declined.ok) { document.getElementById("why").insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(declined.error) + "</span>"); return; }
          UI.closeSheet();
          UI.go("#/staff-money");
          return;
        }
        if (act === "fail") {
          var failed = Store.failWithdrawal(el.getAttribute("data-id"));
          if (!failed.ok) UI.toast(failed.error);
          else UI.go("#/staff-money");
          return;
        }
        if (act === "topup") {
          UI.openSheet("<h2>Treasury top-up</h2>" + UI.field("amount", "Amount", "<input id=\"amount\" class=\"num\">", "") + UI.field("reference", "Reference", "<input id=\"reference\">", "") + "<button class=\"btn btn-primary\" type=\"button\" data-act=\"topup-send\">Add to treasury</button>");
          return;
        }
        if (act === "topup-send") {
          var money = L.usdToCents(document.getElementById("amount").value);
          if (!money.ok) { document.getElementById("amount").insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(money.error) + "</span>"); return; }
          var topped = Store.treasuryTopup(money.cents, document.getElementById("reference").value);
          if (!topped.ok) { document.getElementById("reference").insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(topped.error) + "</span>"); return; }
          UI.closeSheet();
          UI.go("#/staff-money");
          return;
        }
        if (act === "reserve-out") {
          UI.openSheet("<h2>Reserve out</h2>" + UI.field("amount", "Amount", "<input id=\"amount\" class=\"num\">", "") + "<button class=\"btn btn-primary\" type=\"button\" data-act=\"reserve-send\">Move to treasury</button>");
          return;
        }
        if (act === "reserve-send") {
          var cents = L.usdToCents(document.getElementById("amount").value);
          if (!cents.ok) { document.getElementById("amount").insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(cents.error) + "</span>"); return; }
          var moved = Store.moveReserve(cents.cents, true);
          if (!moved.ok) { document.getElementById("amount").insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(moved.error) + "</span>"); return; }
          UI.closeSheet();
          UI.go("#/staff-money");
        }
      }
    });

    UI.screen({
      id: "team",
      auth: "staff",
      back: true,
      section: "you",
      title: "Team",
      test: function (h) { return h === "#/team" ? {} : null; },
      render: function (stage) {
        var actor = Store.user();
        if (actor.role !== "owner") { stage.innerHTML = "<div class=\"column\"><h1>Team</h1><p>You cannot do that.</p></div>"; return; }
        var people = Store.state.users.filter(function (u) { return ["owner", "reviewer", "ops", "finance"].indexOf(u.role) !== -1; });
        var rows = people.map(function (u) {
          return UI.fold("<span><strong>" + UI.esc(u.name) + "</strong><br><span class=\"muted\">" + UI.esc(u.role) + (u.active ? "" : " · Deactivated") + "</span></span>",
            "<p class=\"muted\">" + UI.esc(u.email) + "</p>" +
            "<label class=\"field\"><span>Role</span><select data-live=\"role\" data-id=\"" + u.id + "\">" +
            ["owner", "reviewer", "ops", "finance"].map(function (r) { return "<option" + (u.role === r ? " selected" : "") + ">" + r + "</option>"; }).join("") +
            "</select></label>" +
            (u.id === actor.id ? "" : "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"off\" data-id=\"" + u.id + "\">Deactivate</button>"));
        }).join("");
        stage.innerHTML = "<div class=\"column\"><h1>Team</h1>" + rows +
          "<details class=\"fold\"><summary><strong>Add staff</strong></summary><form class=\"fold-body stack\">" +
          UI.field("name", "Name", "<input id=\"name\" name=\"name\">", "") +
          UI.field("email", "Email", "<input id=\"email\" name=\"email\" type=\"email\">", "") +
          "<label class=\"field\"><span>Role</span><select name=\"role\"><option>reviewer</option><option>ops</option><option>finance</option><option>owner</option></select></label>" +
          "<p id=\"team-err\" class=\"err\"></p><button class=\"btn btn-primary\" type=\"submit\">Add staff</button></form></details></div>";
      },
      on: function (act, el) {
        if (act === "role") {
          var changed = Store.setStaffRole(el.getAttribute("data-id"), el.value);
          if (!changed.ok) { UI.toast(changed.error); UI.go("#/team"); }
          return;
        }
        if (act === "off") {
          var off = Store.deactivateStaff(el.getAttribute("data-id"));
          if (!off.ok) UI.toast(off.error);
          UI.go("#/team");
        }
      },
      submit: function (data) {
        var added = Store.addStaff({ name: data.get("name"), email: data.get("email"), role: data.get("role") });
        if (!added.ok) { var slot = document.getElementById("team-err"); if (slot) slot.textContent = added.error; return; }
        UI.go("#/team");
      }
    });

    UI.screen({
      id: "shareholders",
      auth: "staff",
      back: true,
      section: "you",
      title: "Shareholders",
      test: function (h) { return h === "#/shareholders" ? {} : null; },
      render: function (stage) {
        if (Store.user().role !== "owner") { stage.innerHTML = "<div class=\"column\"><h1>Shareholders</h1><p>You cannot do that.</p></div>"; return; }
        var people = Store.state.users.filter(function (u) {
          return (u.role === "investor" || u.role === "manager") && u.application && u.application.status === "approved";
        });
        var body = people.map(function (u) {
          var listings = Store.state.listings.filter(function (l) {
            return l.shareholderListing && (l.buyerShareholderId === u.id || l.managerId === u.id);
          }).map(function (l) { return "<p>" + UI.esc(l.name) + "</p>"; }).join("") || "<p class=\"muted\">No shareholder listings.</p>";
          var paid = Store.state.entries.filter(function (e) {
            return e.account === "user:" + u.id + ":wallet" && e.memo === "Shareholder share";
          }).reduce(function (s, e) { return s + e.amount; }, 0);
          return "<section class=\"panel\"><h2>" + UI.esc(u.name) + "</h2><p>" + (u.shareholder ? "Shareholder" : "Not a shareholder") + "</p>" +
            "<p class=\"num\">Posted " + L.formatUsd(paid) + "</p>" + listings +
            "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"toggle\" data-id=\"" + u.id + "\" data-on=\"" + (u.shareholder ? "0" : "1") + "\">" + (u.shareholder ? "Unmark" : "Mark") + "</button></section>";
        }).join("");
        stage.innerHTML = "<div class=\"column\"><h1>Shareholders</h1>" + body + "</div>";
      },
      on: function (act, el) {
        if (act !== "toggle") return;
        var res = Store.setShareholder(el.getAttribute("data-id"), el.getAttribute("data-on") === "1");
        if (!res.ok) UI.toast(res.error);
        UI.go("#/shareholders");
      }
    });

    UI.screen({
      id: "users",
      auth: "staff",
      back: true,
      section: "you",
      title: "Users",
      test: function (h) { return h === "#/users" ? {} : null; },
      render: function (stage) {
        var actor = Store.user();
        var q = userQuery.toLowerCase();
        var people = Store.state.users.filter(function (u) {
          if (u.role !== "investor" && u.role !== "manager") return false;
          if (q && (u.name + " " + u.email).toLowerCase().indexOf(q) === -1) return false;
          return true;
        });
        var rows = people.map(function (u) {
          var exposure = "";
          if (actor.role === "owner" && u.role === "manager") {
            exposure = "<label class=\"field\"><span>Exposure limit</span><input class=\"num\" id=\"exp-" + u.id + "\" value=\"" + ((u.exposureLimit != null ? u.exposureLimit : Store.state.settings.exposureDefault) / 100).toFixed(2) + "\"></label><button class=\"btn btn-secondary\" type=\"button\" data-act=\"exposure\" data-id=\"" + u.id + "\">Save exposure</button>";
          }
          return UI.fold("<span><strong>" + UI.esc(u.name) + "</strong><br><span class=\"muted\">" + UI.esc(u.role) + (u.suspended ? " · Suspended" : "") + "</span></span>",
            "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"suspend\" data-id=\"" + u.id + "\" data-on=\"" + (u.suspended ? "0" : "1") + "\">" + (u.suspended ? "Unsuspend" : "Suspend") + "</button>" +
            exposure);
        }).join("");
        stage.innerHTML = "<div class=\"column\"><h1>Users</h1><form>" +
          UI.field("q", "Search", "<input id=\"q\" name=\"q\" value=\"" + UI.esc(userQuery) + "\">", "") +
          "<button class=\"btn btn-secondary\" type=\"submit\">Search</button></form>" + rows + "</div>";
      },
      submit: function (data) { userQuery = data.get("q") || ""; UI.go("#/users"); },
      on: function (act, el) {
        if (act === "suspend") {
          var res = Store.setSuspended(el.getAttribute("data-id"), el.getAttribute("data-on") === "1");
          if (!res.ok) UI.toast(res.error);
          else UI.go("#/users");
          return;
        }
        if (act === "exposure") {
          var money = L.usdToCents(document.getElementById("exp-" + el.getAttribute("data-id")).value);
          if (!money.ok) { UI.toast(money.error); return; }
          var set = Store.setExposure(el.getAttribute("data-id"), money.cents);
          if (!set.ok) UI.toast(set.error);
        }
      }
    });

    UI.screen({
      id: "settings",
      auth: "staff",
      back: true,
      section: "you",
      title: "Settings",
      test: function (h) { return h === "#/settings" ? {} : null; },
      render: function (stage) {
        if (Store.user().role !== "owner") { stage.innerHTML = "<div class=\"column\"><h1>Settings</h1><p>You cannot do that.</p></div>"; return; }
        var s = Store.state.settings;
        function num(id, label, value) {
          return UI.field(id, label, "<input id=\"" + id + "\" name=\"" + id + "\" class=\"num\" value=\"" + value + "\">", "");
        }
        stage.innerHTML = "<div class=\"column\"><h1>Settings</h1><form class=\"stack\">" +
          UI.group("Timing", num("overdueDays", "Overdue days", s.overdueDays) + num("autoWithdrawDays", "Auto-withdraw days", s.autoWithdrawDays)) +
          UI.group("Money and shares", num("waiverStandInPct", "Waiver stand-in percent", s.waiverStandInPct) +
            num("shareholderSharePct", "Shareholder share percent", s.shareholderSharePct) +
            num("exposureDefault", "Default exposure (cents)", s.exposureDefault) +
            UI.field("minTicketUsd", "Minimum investor ticket (USD)", "<span class=\"amount\"><b>$</b><input id=\"minTicketUsd\" name=\"minTicketUsd\" inputmode=\"decimal\" class=\"num\" value=\"" + ((s.minTicket || 100000) / 100).toFixed(2) + "\"></span><span class=\"muted\">Applies to new and edited listings. Default $1,000.00.</span>", "")) +
          UI.group("Compliance", UI.field("blocked", "Blocked countries", "<input id=\"blocked\" name=\"blocked\" value=\"" + UI.esc((s.blocked || []).join(",")) + "\">", "") +
            UI.field("prohibited", "Prohibited goods", "<input id=\"prohibited\" name=\"prohibited\" value=\"" + UI.esc((s.prohibited || []).join(",")) + "\">", "")) +
          "<p id=\"settings-err\" class=\"err\"></p><button class=\"btn btn-primary\" type=\"submit\">Save settings</button></form></div>";
      },
      submit: function (data) {
        var patch = {
          overdueDays: Number(data.get("overdueDays")),
          autoWithdrawDays: Number(data.get("autoWithdrawDays")),
          waiverStandInPct: Number(data.get("waiverStandInPct")),
          shareholderSharePct: Number(data.get("shareholderSharePct")),
          exposureDefault: Number(data.get("exposureDefault")),
          minTicketUsd: data.get("minTicketUsd"),
          blocked: data.get("blocked"),
          prohibited: data.get("prohibited")
        };
        var saved = Store.saveSettings(patch);
        var slot = document.getElementById("settings-err");
        if (!saved.ok) { if (slot) slot.textContent = saved.error; return; }
        UI.go("#/settings");
      }
    });

    UI.screen({
      id: "audit",
      auth: "staff",
      back: true,
      section: "you",
      title: "Audit",
      test: function (h) { return h === "#/audit" ? {} : null; },
      render: function (stage) {
        var rows = Store.state.audit.filter(function (a) {
          if (auditFilter.actor && a.actorId !== auditFilter.actor) return false;
          if (auditFilter.action && String(a.action).toLowerCase().indexOf(auditFilter.action) === -1) return false;
          if (auditFilter.entity && String(a.entity).toLowerCase().indexOf(auditFilter.entity) === -1) return false;
          return true;
        }).map(function (a) {
          var who = Store.byId(a.actorId);
          return "<li><p>" + UI.esc(a.action) + (a.reason ? " · " + UI.esc(a.reason) : "") + "</p><p class=\"muted\">" + UI.esc(who ? who.name : a.actorId) + " · " + UI.esc(a.entity) + " · " + UI.when(a.at) + "</p></li>";
        }).join("");
        var actors = Store.state.users.filter(function (u) { return ["owner", "reviewer", "ops", "finance"].indexOf(u.role) !== -1; });
        stage.innerHTML = "<div class=\"column\"><h1>Audit</h1><form class=\"stack\">" +
          "<label class=\"field\"><span>Actor</span><select name=\"actor\"><option value=\"\">Anyone</option>" + actors.map(function (u) { return "<option value=\"" + u.id + "\"" + (auditFilter.actor === u.id ? " selected" : "") + ">" + UI.esc(u.name) + "</option>"; }).join("") + "</select></label>" +
          UI.field("action", "Action", "<input id=\"action\" name=\"action\" value=\"" + UI.esc(auditFilter.action) + "\">", "") +
          UI.field("entity", "Entity", "<input id=\"entity\" name=\"entity\" value=\"" + UI.esc(auditFilter.entity) + "\">", "") +
          "<button class=\"btn btn-secondary\" type=\"submit\">Filter</button></form><ol class=\"timeline\">" + rows + "</ol></div>";
      },
      submit: function (data) {
        auditFilter = { actor: data.get("actor") || "", action: (data.get("action") || "").toLowerCase(), entity: (data.get("entity") || "").toLowerCase() };
        UI.go("#/audit");
      }
    });

    UI.screen({
      id: "ledger",
      auth: "staff",
      back: true,
      section: "you",
      title: "Ledger",
      test: function (h) { return h === "#/ledger" ? {} : null; },
      render: function (stage) {
        var D = root.ShehnatDash;
        var check = L.verify(Store.state.entries);
        if (!check.ok) {
          var detail = "";
          if (check.txn != null) detail = "<p>Transaction " + UI.esc(String(check.txn)) + " is off by " + L.formatUsd(check.diff) + "</p>";
          else if (check.account) detail = "<p>" + UI.esc(check.account) + " is off by " + L.formatUsd(check.diff) + "</p>";
          stage.innerHTML = "<div class=\"column\"><h1>Ledger</h1><div class=\"banner banner-warning\" role=\"status\"><strong>Ledger does not balance.</strong>" + detail + "</div></div>";
          return;
        }
        function label(account) {
          var user = /^user:([^:]+):wallet$/.exec(account);
          if (user) {
            var person = Store.byId(user[1]);
            return { title: person ? person.name : user[1], meta: "Wallet · " + account };
          }
          var ship = /^escrow:(.+)$/.exec(account);
          if (ship) {
            var listing = Store.listing(ship[1]);
            return { title: listing ? listing.name : ship[1], meta: "Escrow · " + account };
          }
          var named = { "platform:treasury": "Treasury", "platform:revenue": "Revenue", "platform:reserve": "Reserve", "withdrawals:hold": "Withdrawals on hold" };
          if (named[account]) return { title: named[account], meta: "Platform · " + account };
          return { title: account, meta: "Account" };
        }
        var order = [
          ["wallet", "Wallets", "wallet", "green"],
          ["escrow", "Escrow", "ship", "blue"],
          ["treasury", "Treasury", "bank", "green"],
          ["revenue", "Revenue", "receipt", "amber"],
          ["reserve", "Reserve", "flag", "blue"],
          ["hold", "Hold", "lock", "amber"]
        ];
        var groups = { wallet: [], escrow: [], treasury: [], revenue: [], reserve: [], hold: [] };
        var sums = { wallet: 0, escrow: 0, treasury: 0, revenue: 0, reserve: 0, hold: 0 };
        Object.keys(check.balances).forEach(function (account) {
          var bucket = "";
          if (/^user:/.test(account)) bucket = "wallet";
          else if (/^escrow:/.test(account)) bucket = "escrow";
          else if (account === "platform:treasury") bucket = "treasury";
          else if (account === "platform:revenue") bucket = "revenue";
          else if (account === "platform:reserve") bucket = "reserve";
          else if (account === "withdrawals:hold") bucket = "hold";
          if (!bucket) return;
          groups[bucket].push({ account: account, amount: check.balances[account], label: label(account) });
          sums[bucket] += check.balances[account];
        });
        order.forEach(function (g) {
          groups[g[0]].sort(function (a, b) { return Math.abs(b.amount) - Math.abs(a.amount) || a.label.title.localeCompare(b.label.title); });
        });
        var held = sums.wallet + sums.escrow + sums.hold;
        var platform = sums.treasury + sums.revenue + sums.reserve;
        var books = held + platform;
        var bank = check.balances["bank:external"] || 0;
        var tiles = order.map(function (g) {
          var n = groups[g[0]].length;
          return D.tile({ label: g[1], value: L.formatUsd(sums[g[0]]), sub: n + (n === 1 ? " account" : " accounts"), tone: g[3], icon: g[2] });
        }).join("");
        var sections = order.map(function (g) {
          var rows = groups[g[0]].map(function (a) {
            return "<div class=\"row\"><span class=\"title\">" + UI.esc(a.label.title) + "</span><span class=\"meta\">" + UI.esc(a.label.meta) + "</span><span class=\"end num\">" + L.formatUsd(a.amount) + "</span></div>";
          }).join("");
          return "<section class=\"dash-card\"><div class=\"dash-row\"><h2>" + g[1] + "</h2><b class=\"num\">" + L.formatUsd(sums[g[0]]) + "</b></div>" + (rows || "<p class=\"muted\">No balance.</p>") + "</section>";
        }).join("");
        var bankRow = Object.prototype.hasOwnProperty.call(check.balances, "bank:external")
          ? "<section class=\"dash-card\"><div class=\"row\"><span class=\"title\">Bank</span><span class=\"meta\">The other side of these accounts · bank:external</span><span class=\"end num\">" + L.formatUsd(bank) + "</span></div></section>"
          : "";
        var byTxn = {};
        Store.state.entries.forEach(function (e) { (byTxn[e.txn] = byTxn[e.txn] || []).push(e); });
        var journal = Object.keys(byTxn).map(Number).sort(function (a, b) { return b - a; }).slice(0, 10).map(function (id) {
          var lines = byTxn[id];
          var moved = lines.reduce(function (s, e) { return s + (e.amount > 0 ? e.amount : 0); }, 0);
          var memos = lines.map(function (e) { return e.memo; }).filter(function (m, i, a) { return m && a.indexOf(m) === i; });
          var accts = lines.length + " lines · " + lines.slice(0, 2).map(function (e) { return label(e.account).title; }).join(", ") + (lines.length > 2 ? "…" : "");
          return "<div class=\"row\"><span class=\"title\">" + UI.esc(memos.join(" · ") || "Transfer") + "</span><span class=\"meta\">#" + id + " · " + UI.esc(accts) + " · " + UI.when(lines[0].at) + "</span><span class=\"end num\">" + L.formatUsd(moved) + "</span></div>";
        }).join("");
        var journalCard = journal ? "<section class=\"dash-card\"><div class=\"dash-row\"><h2>Recent transactions</h2><span class=\"muted\">Latest 10</span></div>" + journal + "</section>" : "";
        var shipRows = Store.state.listings.map(function (l) { return { l: l, f: figures(l) }; }).filter(function (x) { return x.f.done || x.f.any; }).map(function (x) {
          var href = "#/settlement/" + x.l.id;
          return "<a class=\"row\" href=\"" + href + "\" data-go=\"" + href + "\"><span class=\"title\">" + UI.esc(x.l.name) + "</span><span class=\"meta\">" + (x.f.done ? "Settled" : "In progress") + " · Sale " + L.formatUsd(x.f.sale) + " · Costs " + L.formatUsd(x.f.costs) + "</span><span class=\"end num\">" + L.formatUsd(x.f.profit) + "</span></a>";
        }).join("");
        var shipCard = shipRows ? "<section class=\"dash-card\"><div class=\"dash-row\"><h2>By shipment</h2><span class=\"muted\">Profit</span></div>" + shipRows + "</section>" : "";
        stage.innerHTML = "<div class=\"column stack\">" +
          D.hero({
            label: "On the books", value: L.formatUsd(books), tone: "green",
            sub: "Wallets, escrow, and platform accounts",
            delta: "Ledger balances",
            split: [
              { label: "With people", value: held, text: L.formatUsd(held) },
              { label: "Platform", value: platform, text: L.formatUsd(platform) }
            ]
          }) +
          "<div class=\"dash-grid\">" + tiles + "</div>" +
          D.bar("Where it sits", order.map(function (g) { return { label: g[1], value: Math.max(sums[g[0]], 0), tone: g[3], text: L.formatUsd(sums[g[0]]) }; })) +
          shipCard + journalCard + sections + bankRow + "</div>";
      }
    });
  }
  root.ShehnatStaff = { register: register };
})(typeof globalThis !== "undefined" ? globalThis : this);
