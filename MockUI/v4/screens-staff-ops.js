/* Operations board, approvals, and settlement. */
(function (root) {
  "use strict";
  function register(UI) {
    var Store = root.ShehnatStore;
    var L = root.ShehnatLogic;
    var COLS = [["todo", "To do"], ["in_progress", "In progress"], ["done", "Done"], ["verified", "Verified"], ["blocked", "Blocked"], ["skipped", "Skipped"]];

    function logView(entity, name) {
      Store.state.audit.unshift({ id: "view" + Date.now(), at: Store.state.now, actorId: Store.user().id, action: "Viewed document", entity: entity, reason: name });
      Store.save();
      var slot = document.getElementById("viewer");
      if (slot) slot.textContent = "Placeholder for " + name + ". This view is logged.";
    }

    function moneySheet(title, act, id, extra) {
      UI.openSheet("<h2>" + title + "</h2>" + (extra || "") +
        UI.field("amount", "Amount", "<input id=\"amount\" class=\"num\">", "") +
        "<label class=\"field\" for=\"why\"><span>Reason</span><textarea id=\"why\"></textarea></label>" +
        "<button class=\"btn btn-primary\" type=\"button\" data-act=\"" + act + "\" data-id=\"" + id + "\">Send</button>");
    }

    UI.screen({
      id: "ops",
      auth: "staff",
      back: true,
      section: "list",
      title: function (p) { var l = Store.listing(p.id); return l ? l.name : "Not found"; },
      test: function (h) { var m = /^#\/ops\/([\w-]+)$/.exec(h); return m ? { id: m[1] } : null; },
      render: function (stage, params) {
        var l = Store.listing(params.id);
        var actor = Store.user();
        if (!l) { stage.innerHTML = "<div class=\"column\"><h1>Not found</h1></div>"; return; }
        var boards = (l.shipments || []).map(function (sh) {
          var cols = COLS.map(function (col) {
            var cards = (sh.steps || []).filter(function (st) { return (st.state || "todo") === col[0]; }).map(function (st) {
              var docs = (st.docs || []).map(function (d) {
                return "<button type=\"button\" class=\"btn-text\" data-act=\"view\" data-name=\"" + UI.esc(d.name) + "\">" + UI.esc(d.name) + "</button>";
              }).join("");
              var moves = "";
              if (!L.can(actor, "steps")) {
                moves = COLS.filter(function (c) { return c[0] !== col[0]; }).map(function (c) {
                  return "<button type=\"button\" class=\"btn-text\" data-act=\"move\" data-next=\"" + c[0] + "\" data-ship=\"" + sh.id + "\" data-step=\"" + st.id + "\">" + c[1] + "</button>";
                }).join("");
              }
              return "<article class=\"card\"><p>" + UI.esc(st.name) + (st.verify ? " · Document required" : "") + "</p>" + docs + moves + "</article>";
            }).join("");
            return "<section><h2>" + col[1] + "</h2>" + cards + "</section>";
          }).join("");
          return "<h2>" + UI.esc(sh.id) + "</h2><div class=\"board\" id=\"board-" + sh.id + "\">" + cols + "</div>";
        }).join("");
        var actions = "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"sheet\" data-kind=\"step-cost\">Step cost</button>" +
          "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"sheet\" data-kind=\"unplanned\">Unplanned cost</button>" +
          "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"sheet\" data-kind=\"proceeds\">Sale proceeds</button>" +
          "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"sheet\" data-kind=\"use-proceeds\">Use proceeds</button>" +
          "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"sheet\" data-kind=\"overrun\">Overrun fill</button>" +
          "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"sheet\" data-kind=\"cancel\">Cancel</button>" +
          "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"sheet\" data-kind=\"writeoff\">Write-off</button>" +
          "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"sheet\" data-kind=\"resale\">Resale</button>";
        var settle = "";
        if (!L.can(actor, "propose-settlement")) settle = "<a href=\"#/settlement/" + l.id + "\" data-go=\"#/settlement/" + l.id + "\">Settlement</a>";
        stage.innerHTML = "<div class=\"column\"><h1>" + UI.esc(l.name) + "</h1><p id=\"viewer\" class=\"muted\"></p>" + boards + actions + settle + "</div>";
        var board = stage.querySelector(".board");
        if (board && root.ShehnatMotion) root.ShehnatMotion.fade(board);
      },
      on: function (act, el, params) {
        var l = Store.listing(params.id);
        if (act === "view") { logView(params.id, el.getAttribute("data-name")); return; }
        if (act === "move") {
          var next = el.getAttribute("data-next");
          if (next === "blocked" || next === "skipped") {
            UI.openSheet("<h2>" + (next === "blocked" ? "Block step" : "Skip step") + "</h2><label class=\"field\" for=\"why\"><span>Reason</span><textarea id=\"why\"></textarea></label><button class=\"btn btn-primary\" type=\"button\" data-act=\"move-send\" data-next=\"" + next + "\" data-ship=\"" + el.getAttribute("data-ship") + "\" data-step=\"" + el.getAttribute("data-step") + "\">Send</button>");
            return;
          }
          var moved = Store.setStep(params.id, el.getAttribute("data-ship"), el.getAttribute("data-step"), next, {});
          if (!moved.ok) UI.toast(moved.error);
          else UI.go("#/ops/" + params.id);
          return;
        }
        if (act === "move-send") {
          var sent = Store.setStep(params.id, el.getAttribute("data-ship"), el.getAttribute("data-step"), el.getAttribute("data-next"), { reason: document.getElementById("why").value });
          if (!sent.ok) { document.getElementById("why").insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(sent.error) + "</span>"); return; }
          UI.closeSheet();
          UI.go("#/ops/" + params.id);
          return;
        }
        if (act === "sheet") {
          var kind = el.getAttribute("data-kind");
          var ships = (l.shipments || []).map(function (sh) { return "<option value=\"" + sh.id + "\">" + UI.esc(sh.id) + "</option>"; }).join("");
          var steps = (l.shipments || []).map(function (sh) {
            return (sh.steps || []).map(function (st) { return "<option value=\"" + sh.id + "|" + st.id + "\">" + UI.esc(st.name) + "</option>"; }).join("");
          }).join("");
          var buyers = Store.state.users.filter(function (u) { return u.role === "investor" || u.role === "manager"; }).map(function (u) {
            return "<option value=\"" + u.id + "\">" + UI.esc(u.name) + (u.shareholder ? " · Shareholder" : "") + "</option>";
          }).join("");
          if (kind === "cancel") {
            UI.openSheet("<h2>Cancel listing</h2><label class=\"field\" for=\"why\"><span>Reason</span><textarea id=\"why\"></textarea></label><button class=\"btn btn-danger\" type=\"button\" data-act=\"cancel-send\">Cancel listing</button>");
            return;
          }
          if (kind === "writeoff" || kind === "resale") {
            UI.openSheet("<h2>" + (kind === "writeoff" ? "Write-off" : "Resale") + "</h2><label class=\"field\"><span>Shipment</span><select id=\"ship\">" + ships + "</select></label>" +
              (kind === "resale" ? "<label class=\"field\"><span>Buyer</span><select id=\"buyer\"><option value=\"\">Choose</option>" + buyers + "</select></label>" + UI.field("amount", "Amount", "<input id=\"amount\" class=\"num\" value=\"0\">", "") : "") +
              "<label class=\"field\" for=\"why\"><span>Reason</span><textarea id=\"why\"></textarea></label>" +
              "<button class=\"btn btn-primary\" type=\"button\" data-act=\"resolve-send\" data-kind=\"" + kind + "\">Send</button>");
            return;
          }
          var pick = kind === "step-cost" ? "<label class=\"field\"><span>Step</span><select id=\"step\">" + steps + "</select></label>" : "<label class=\"field\"><span>Shipment</span><select id=\"ship\">" + ships + "</select></label>";
          moneySheet(kind, "money-send", kind, pick);
          return;
        }
        if (act === "cancel-send") {
          var cancelled = Store.opsMoney(params.id, "cancel", { reason: document.getElementById("why").value });
          if (!cancelled.ok) { document.getElementById("why").insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(cancelled.error) + "</span>"); return; }
          UI.closeSheet();
          UI.go("#/ops/" + params.id);
          return;
        }
        if (act === "resolve-send") {
          var cents = 0;
          var amount = document.getElementById("amount");
          if (amount && amount.value) {
            var parsed = L.usdToCents(amount.value);
            if (!parsed.ok) { amount.insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(parsed.error) + "</span>"); return; }
            cents = parsed.cents;
          }
          var proposed = Store.proposeResolution(params.id, document.getElementById("ship").value, el.getAttribute("data-kind"), {
            reason: document.getElementById("why").value,
            buyerId: document.getElementById("buyer") ? document.getElementById("buyer").value : "",
            cents: cents
          });
          if (!proposed.ok) { document.getElementById("why").insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(proposed.error) + "</span>"); return; }
          UI.closeSheet();
          UI.go("#/approvals");
          return;
        }
        if (act === "money-send") {
          var kind = el.getAttribute("data-id");
          var money = L.usdToCents(document.getElementById("amount").value);
          if (!money.ok) { document.getElementById("amount").insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(money.error) + "</span>"); return; }
          var ship = "";
          var step = "";
          if (document.getElementById("step")) {
            var parts = document.getElementById("step").value.split("|");
            ship = parts[0];
            step = parts[1];
          } else if (document.getElementById("ship")) ship = document.getElementById("ship").value;
          var body = { cents: money.cents, reason: document.getElementById("why").value, shipmentId: ship, stepId: step };
          if (kind === "step-cost") body.doc = { name: "Cost record", type: "note", size: 0 };
          var done = Store.opsMoney(params.id, kind, body);
          if (!done.ok) { document.getElementById("amount").insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(done.error) + "</span>"); return; }
          UI.closeSheet();
          UI.go(kind === "step-cost" || kind === "proceeds" || kind === "cancel" ? "#/ops/" + params.id : "#/approvals");
        }
      }
    });

    UI.screen({
      id: "approvals",
      auth: "staff",
      back: true,
      section: "queue",
      title: "Approvals",
      test: function (h) { return h === "#/approvals" ? {} : null; },
      render: function (stage) {
        var actor = Store.user();
        var rows = [];
        Store.state.listings.forEach(function (l) {
          (l.approvals || []).forEach(function (ap) {
            if (ap.status !== "proposed") return;
            rows.push({ listing: l, approval: ap });
          });
          if (l.planProposal && l.planProposal.status === "proposed") {
            rows.push({ listing: l, approval: { id: "plan:" + l.id, type: "plan", proposerId: l.planProposal.proposerId, status: "proposed", reason: "" } });
          }
        });
        var body = rows.length ? rows.map(function (row) {
          var who = Store.byId(row.approval.proposerId);
          var eyes = L.fourEyes(actor.id, row.approval.proposerId);
          var buttons = eyes ? "<p>" + UI.esc(eyes) + "</p>" : "<button class=\"btn btn-primary\" type=\"button\" data-act=\"yes\" data-id=\"" + row.approval.id + "\">Approve</button><button class=\"btn btn-secondary\" type=\"button\" data-act=\"no\" data-id=\"" + row.approval.id + "\">Decline</button>";
          return "<section class=\"panel\"><h2>" + UI.esc(row.listing.name) + "</h2><p>" + UI.esc(row.approval.type) + " · " + UI.esc(who ? who.name : "") + "</p><p class=\"muted\">" + UI.esc(row.approval.reason || "") + "</p>" + buttons + "</section>";
        }).join("") : "<div class=\"empty\"><p>Nothing is waiting for approval.</p></div>";
        stage.innerHTML = "<div class=\"column\"><h1>Approvals</h1>" + body + "</div>";
      },
      on: function (act, el) {
        if (act === "yes") {
          var yes = Store.decideApproval(el.getAttribute("data-id"), true, "");
          if (!yes.ok) UI.toast(yes.error);
          else UI.go("#/approvals");
          return;
        }
        if (act === "no") {
          UI.openSheet("<h2>Decline</h2><label class=\"field\" for=\"why\"><span>Reason</span><textarea id=\"why\"></textarea></label><button class=\"btn btn-danger\" type=\"button\" data-act=\"no-send\" data-id=\"" + el.getAttribute("data-id") + "\">Decline</button>");
          return;
        }
        if (act === "no-send") {
          var no = Store.decideApproval(el.getAttribute("data-id"), false, document.getElementById("why").value);
          if (!no.ok) { document.getElementById("why").insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(no.error) + "</span>"); return; }
          UI.closeSheet();
          UI.go("#/approvals");
        }
      }
    });

    UI.screen({
      id: "settlement",
      auth: "staff",
      back: true,
      section: "queue",
      title: "Settlement",
      test: function (h) { var m = /^#\/settlement\/([\w-]+)$/.exec(h); return m ? { id: m[1] } : null; },
      render: function (stage, params) {
        var l = Store.listing(params.id);
        var actor = Store.user();
        if (!l) { stage.innerHTML = "<div class=\"column\"><h1>Not found</h1></div>"; return; }
        var settled = (l.settlement && l.settlement.result) || Store.settlementInput(l);
        var lines = "<div class=\"statement\">" +
          "<div><span>Sale price</span><span class=\"num\">" + L.formatUsd(settled.sale) + "</span></div>" +
          "<div><span>Costs</span><span class=\"num\">" + L.formatUsd(settled.costs) + "</span></div>" +
          "<div><span>Gross</span><span class=\"num\">" + L.formatUsd(settled.gross) + "</span></div>" +
          "<div><span>Service fee</span><span class=\"num\">" + L.formatUsd(settled.fee) + "</span></div>" +
          "<div><span>Manager share</span><span class=\"num\">" + L.formatUsd(settled.managerCut) + "</span></div>" +
          settled.rows.map(function (r) {
            var who = r.userId ? Store.byId(r.userId) : null;
            return "<div><span>" + UI.esc(who ? who.name : r.kind) + "</span><span class=\"num\">" + L.formatUsd(r.payout) + "</span></div>";
          }).join("") +
          (l.shareholderListing ? "<div><span>Shareholder share</span><span class=\"num\">" + L.formatUsd(settled.shareholder) + "</span></div><div><span>Reserve fund</span><span class=\"num\">" + L.formatUsd(settled.reserve) + "</span></div>" +
            (settled.holders || []).map(function (h) {
              var who = Store.byId(h.userId);
              return "<div><span>" + UI.esc(who ? who.name : "Shareholder") + "</span><span class=\"num\">" + L.formatUsd(h.amount) + "</span></div>";
            }).join("") : "") +
          "</div>";
        var actions = "";
        if (l.settlement && l.settlement.status === "proposed") {
          var eyes = L.fourEyes(actor.id, l.settlement.proposerId);
          var denied = L.can(actor, "settlement-approve");
          if (eyes) actions = "<p>" + UI.esc(eyes) + "</p>";
          else if (denied) actions = "<p>" + UI.esc(denied) + "</p>";
          else actions = "<button class=\"btn btn-primary\" type=\"button\" data-act=\"approve\">Approve</button><button class=\"btn btn-secondary\" type=\"button\" data-act=\"back\">Send back</button>";
        } else if (l.settlement && l.settlement.status === "returned") {
          actions = "<p>Sent back. " + UI.esc(l.settlement.reason || "") + "</p>";
        } else if (!l.settlement || l.settlement.status !== "approved") {
          if (!L.can(actor, "propose-settlement")) actions = "<button class=\"btn btn-primary\" type=\"button\" data-act=\"propose\">Propose settlement</button>";
        } else actions = "<p class=\"status\">Completed</p>";
        stage.innerHTML = "<div class=\"column\"><h1>" + UI.esc(l.name) + "</h1>" + lines + actions + "</div>";
      },
      on: function (act, el, params) {
        if (act === "propose") {
          var proposed = Store.proposeSettlement(params.id);
          if (!proposed.ok) UI.toast(proposed.error);
          else UI.go("#/settlement/" + params.id);
          return;
        }
        if (act === "approve") {
          var approved = Store.approveSettlement(params.id, "");
          if (!approved.ok) UI.toast(approved.error);
          else UI.go("#/settlement/" + params.id);
          return;
        }
        if (act === "back") {
          UI.openSheet("<h2>Send back</h2><label class=\"field\" for=\"why\"><span>Reason</span><textarea id=\"why\"></textarea></label><button class=\"btn btn-secondary\" type=\"button\" data-act=\"back-send\">Send back</button>");
          return;
        }
        if (act === "back-send") {
          var why = document.getElementById("why").value.trim();
          if (!why) { document.getElementById("why").insertAdjacentHTML("afterend", "<span class=\"err\">Error: a rejection needs a reason.</span>"); return; }
          var returned = Store.approveSettlement(params.id, why);
          if (!returned.ok) { document.getElementById("why").insertAdjacentHTML("afterend", "<span class=\"err\">" + UI.esc(returned.error) + "</span>"); return; }
          UI.closeSheet();
          UI.go("#/settlement/" + params.id);
        }
      }
    });
  }
  root.ShehnatStaffOps = { register: register };
})(typeof globalThis !== "undefined" ? globalThis : this);
