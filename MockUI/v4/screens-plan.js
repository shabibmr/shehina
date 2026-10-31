/* Step plan editor, shared by the manager listing wizard and the plan change screen. */
(function (root) {
  "use strict";
  function create(UI) {
    var L = root.ShehnatLogic;
    var esc = UI.esc;

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
        return "<span class=\"chip" + (have[tag] ? "" : " chip-warn") + "\">" + esc(tag) + (have[tag] ? "" : " · missing") + "</span>";
      }).join("");
      var rows = steps.map(function (st, n) {
        var bad = !!(errs["sname" + n] || errs["sowner" + n] || errs["sdays" + n] || errs["scost" + n]);
        var summary = "<span><strong>" + (n + 1) + ". " + esc(st.name || "New step") + "</strong><br><span class=\"muted\">" + (st.owner === "manager" ? "Manager" : "Staff") + " · " + esc(st.days) + " days · $" + esc(st.cost) + (bad ? " · needs attention" : "") + "</span></span>";
        var body =
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
          "</p>";
        return UI.fold(summary, body, bad || !st.name);
      }).join("");
      return "<section class=\"panel stack\"><h2>Stage coverage</h2><div class=\"chips\">" + cover + "</div></section>" + rows +
        "<p><button class=\"btn btn-secondary\" type=\"button\" data-act=\"add-step\">Add step</button></p>";
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

    return { planFrom: planFrom, planEditor: planEditor, planRead: planRead, planCheck: planCheck, planOn: planOn };
  }
  root.ShehnatPlan = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : this);
