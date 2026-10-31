/* P1–P8 and the shared You, search, and profile screens. */
(function (root) {
  "use strict";
  function register(UI) {
    var Store = root.ShehnatStore;
    var L = root.ShehnatLogic;
    var errors = {};
    var slide = 0;
    var query = "";

    function screen(def) { UI.screen(def); }

    screen({
      id: "splash",
      auth: "public",
      chrome: "none",
      test: function (h) { return h === "#/" || h === "" ? {} : null; },
      render: function (stage) {
        stage.innerHTML = "<div class=\"splash\"><img src=\"../../Demo/frontend/brand/logo-full.png\" alt=\"Shehnat\"></div>";
        setTimeout(function () {
          if ((location.hash || "#/") !== "#/") return;
          var u = Store.user();
          if (u) UI.go(UI.homeFor(u));
          else UI.go("#/sign-in");
        }, 700);
      }
    });

    var slides = [
      ["How it works", "You fund a shipment. A manager runs it. When the goods are sold, the result is shared."],
      ["Capital is at risk", "A shipment can lose money. You can get back less than you put in."],
      ["Full transparency", "You see every figure on a listing before you invest. Returns shown before the sale are estimates."]
    ];
    screen({
      id: "welcome",
      auth: "public",
      chrome: "plain",
      title: function () { return slides[slide][0]; },
      test: function (h) { return h === "#/welcome" ? {} : null; },
      render: function (stage) {
        /* The intro slides are skipped: the welcome link and the splash both go straight to sign-in. */
        var who = Store.user(); Store.seeWelcome(); slide = 0; UI.go(who ? UI.homeFor(who) : "#/sign-in"); return;
        var s = slides[slide];
        stage.innerHTML = "<div class=\"column\"><p class=\"muted\">" + (slide + 1) + " of 3</p><h1>" + s[0] + "</h1><p>" + s[1] + "</p><button class=\"btn btn-primary\" type=\"button\" data-act=\"next\">" + (slide === 2 ? "Continue" : "Next") + "</button><button class=\"btn-text\" type=\"button\" data-act=\"skip\">Skip</button></div>";
      },
      on: function (act) {
        if (act === "skip" || (act === "next" && slide === 2)) { Store.seeWelcome(); slide = 0; UI.go("#/sign-in"); return; }
        if (act === "next") { slide += 1; UI.go("#/welcome"); }
      }
    });

    function demoAccounts() {
      var roles = { investor: "Investor", manager: "Manager", reviewer: "Reviewer", ops: "Operations", finance: "Finance", owner: "Owner" };
      var groups = [["Investors", "investor"], ["Managers", "manager"], ["Staff", "staff"]];
      return groups.map(function (group) {
        var people = Store.state.users.filter(function (u) {
          return group[1] === "staff" ? ["owner", "reviewer", "ops", "finance"].indexOf(u.role) !== -1 : u.role === group[1];
        });
        var rows = people.map(function (u) {
          var meta = roles[u.role] || u.role;
          if (u.shareholder && u.role === "investor") meta = "Investor · Shareholder";
          if (u.shareholder && u.role === "manager") meta = "Manager · Shareholder";
          return "<button class=\"row\" type=\"button\" data-act=\"as\" data-email=\"" + UI.esc(u.email) + "\"><span class=\"title\">" + UI.esc(u.name) + "</span><span class=\"meta\">" + UI.esc(meta) + "</span></button>";
        }).join("");
        return "<h2>" + group[0] + "</h2>" + rows;
      }).join("");
    }

    screen({
      id: "signin",
      auth: "public",
      chrome: "none",
      test: function (h) { return h === "#/sign-in" ? {} : null; },
      render: function (stage) {
        stage.innerHTML = "<div class=\"column sign-in\"><img class=\"logo-sign\" src=\"../../Demo/frontend/brand/logo-full.png\" alt=\"Shehnat\"><h1>Sign in</h1><form class=\"stack\">" +
          UI.field("email", "Email", "<input id=\"email\" name=\"email\" type=\"email\" autocomplete=\"username\" required>", errors.email) +
          UI.field("password", "Password", "<input id=\"password\" name=\"password\" type=\"password\" autocomplete=\"current-password\" required>", errors.password) +
          "<button class=\"btn btn-primary\" type=\"submit\">Sign in</button></form>" +
          "<a href=\"#/forgot\" data-go=\"#/forgot\">Forgot password</a><a href=\"#/join\" data-go=\"#/join\">Create account</a>" +
          "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"demos\">Demo accounts</button></div>";
      },
      on: function (act, el) {
        if (act === "demos") {
          UI.openSheet("<header><strong>Demo accounts</strong></header>" + demoAccounts());
          return;
        }
        if (act !== "as") return;
        errors = {};
        var res = Store.signIn(el.getAttribute("data-email"), root.ShehnatSeed.password);
        UI.closeSheet();
        if (!res.ok) { errors.password = res.error; UI.go("#/sign-in"); return; }
        UI.go(UI.homeFor(Store.user()));
      },
      submit: function (data) {
        errors = {};
        var res = Store.signIn(data.get("email"), data.get("password"));
        if (!res.ok) { errors.password = res.error; UI.go("#/sign-in"); return; }
        UI.go(UI.homeFor(Store.user()));
      }
    });

    screen({
      id: "join",
      auth: "public",
      chrome: "plain",
      back: true,
      title: "Create account",
      test: function (h) { return h === "#/join" ? {} : null; },
      render: function (stage) {
        stage.innerHTML = "<div class=\"column\"><h1>Create account</h1><form class=\"stack\">" +
          "<fieldset class=\"stack\"><legend class=\"sr\">I want to</legend>" +
          "<label class=\"check\"><input type=\"radio\" name=\"role\" value=\"investor\" checked> <span>I want to invest</span></label>" +
          "<label class=\"check\"><input type=\"radio\" name=\"role\" value=\"manager\"> <span>I manage shipments</span></label></fieldset>" +
          UI.field("name", "Name", "<input id=\"name\" name=\"name\" autocomplete=\"name\" required>", errors.name) +
          UI.field("email", "Email", "<input id=\"email\" name=\"email\" type=\"email\" autocomplete=\"username\" required>", errors.email) +
          UI.field("password", "Password", "<input id=\"password\" name=\"password\" type=\"password\" autocomplete=\"new-password\" data-live=\"pw\" required>", errors.password) +
          "<p class=\"muted\" id=\"pw-hint\">At least 10 characters, with a letter and a digit.</p>" +
          "<button class=\"btn btn-primary\" type=\"submit\">Create account</button></form></div>";
      },
      on: function (act, el) {
        if (act === "pw") {
          var hint = document.getElementById("pw-hint");
          var msg = L.passwordOk(el.value);
          if (hint) hint.textContent = msg ? msg.replace("Error: ", "") : "Password meets the rules.";
        }
      },
      submit: function (data) {
        errors = {};
        var res = Store.signUp({ name: data.get("name"), email: data.get("email"), password: data.get("password"), role: data.get("role") });
        if (!res.ok) { errors = res.errors; UI.go("#/join"); return; }
        UI.go(UI.homeFor(Store.user()));
      }
    });

    screen({
      id: "forgot",
      auth: "public",
      chrome: "plain",
      back: true,
      title: "Forgot password",
      test: function (h) { return h === "#/forgot" ? {} : null; },
      render: function (stage) {
        stage.innerHTML = "<div class=\"column\"><h1>Forgot password</h1><p>Enter your email. If there is an account, a link was sent.</p><form>" +
          UI.field("email", "Email", "<input id=\"email\" name=\"email\" type=\"email\" required>", "") +
          "<button class=\"btn btn-primary\" type=\"submit\">Send link</button></form></div>";
      },
      submit: function () {
        UI.toast("If there is an account, a link was sent.");
        UI.go("#/sign-in");
      }
    });

    screen({
      id: "you",
      auth: "any",
      section: "you",
      title: function () { var u = Store.user(); return u ? u.name : "You"; },
      test: function (h) { return h === "#/you" ? {} : null; },
      render: function (stage) {
        var u = Store.user();
        var share = u.shareholder ? "<p>Shareholder</p>" : "";
        var desk = "";
        function link(href, title, meta) {
          return "<a class=\"row\" href=\"" + href + "\" data-go=\"" + href + "\"><span class=\"title\">" + title + "</span><span class=\"meta\">" + meta + "</span><span class=\"end chev\" aria-hidden=\"true\">" + UI.icon("chev") + "</span></a>";
        }
        if (u.role === "owner") {
          desk = link("#/shareholders", "Shareholders", "Mark and unmark") +
            link("#/team", "Team", "Staff accounts") +
            link("#/users", "Users", "Investors and managers") +
            link("#/settings", "Settings", "Rules and blocked countries") +
            link("#/approvals", "Approvals", "Waiting for a second person") +
            link("#/audit", "Audit", "Who did what") +
            link("#/ledger", "Ledger", "Account balances");
        } else if (u.role === "reviewer") {
          desk = link("#/users", "Users", "Suspend an account") + link("#/approvals", "Approvals", "Waiting for a second person") + link("#/audit", "Audit", "Who did what");
        } else if (u.role === "ops" || u.role === "finance") {
          desk = link("#/approvals", "Approvals", "Waiting for a second person") + link("#/audit", "Audit", "Who did what") + link("#/ledger", "Ledger", "Account balances");
        }
        stage.innerHTML = "<div class=\"column\"><h1>" + UI.esc(u.name) + "</h1>" + share + "<p class=\"muted\">" + UI.esc(u.email) + "</p>" +
          desk +
          "<a class=\"row\" href=\"#/notices\" data-go=\"#/notices\"><span class=\"title\">Notifications</span><span class=\"meta\">Approvals, rejections, and payouts</span><span class=\"end chev\" aria-hidden=\"true\">" + UI.icon("chev") + "</span></a>" +
          "<a class=\"row\" href=\"#/risk\" data-go=\"#/risk\"><span class=\"title\">Risk and legal</span><span class=\"meta\">What you are agreeing to</span><span class=\"end chev\" aria-hidden=\"true\">" + UI.icon("chev") + "</span></a>" +
          "<button class=\"btn btn-secondary\" type=\"button\" data-act=\"out\">Sign out</button></div>";
      },
      on: function (act) { if (act === "out") { Store.signOut(); UI.go("#/sign-in"); } }
    });

    screen({
      id: "notices",
      auth: "any",
      back: true,
      title: "Notifications",
      test: function (h) { return h === "#/notices" ? {} : null; },
      render: function (stage) {
        var u = Store.user();
        var rows = Store.state.notes.filter(function (n) { return n.userId === u.id; });
        Store.markRead();
        var body = rows.length ? "<ul class=\"timeline\">" + rows.map(function (n) {
          return "<li><p>" + UI.esc(n.text) + "</p><p class=\"muted\">" + UI.when(n.at) + "</p></li>";
        }).join("") + "</ul>" : "<div class=\"empty\"><p>Nothing has been sent to you yet.</p></div>";
        stage.innerHTML = "<div class=\"column\"><h1>Notifications</h1>" + body + "</div>";
      }
    });

    screen({
      id: "risk",
      auth: "public",
      back: true,
      title: "Risk and legal",
      test: function (h) { return h === "#/risk" ? {} : null; },
      render: function (stage) {
        stage.innerHTML = "<div class=\"column\"><h1>Risk and legal</h1><p>You can lose some or all of the money you invest. Figures shown before a sale are estimates, marked expected.</p><p>Shehnat is operated from the United Arab Emirates. Every amount is in US dollars.</p><p>Uploading a document or investing is your own instruction. This screen is not a prospectus.</p></div>";
      }
    });

    screen({
      id: "search",
      auth: "any",
      back: true,
      title: "Search",
      section: "",
      test: function (h) { return h === "#/search" ? {} : null; },
      render: function (stage) {
        var q = (query || "").toLowerCase();
        var u = Store.user();
        var rows = [];
        if (u && u.role === "investor") {
          rows = Store.state.listings.filter(function (l) {
            return l.status === "live" && (!q || l.name.toLowerCase().indexOf(q) !== -1);
          });
        }
        var list = rows.map(function (l) {
          return "<a class=\"row\" href=\"#/listing/" + l.id + "\" data-go=\"#/listing/" + l.id + "\"><span class=\"title\">" + UI.esc(l.name) + "</span><span class=\"meta\">" + UI.esc(UI.cname(l.source)) + " to " + UI.esc(UI.cname(l.buyer)) + "</span></a>";
        }).join("");
        stage.innerHTML = "<div class=\"column\"><h1>Search</h1><form>" +
          UI.field("q", "Shipment name", "<input id=\"q\" name=\"q\" value=\"" + UI.esc(query) + "\">", "") +
          "<button class=\"btn btn-secondary\" type=\"submit\">Search</button></form>" +
          (q && !rows.length ? "<div class=\"empty\"><p>No shipment uses that name.</p><button class=\"btn-text\" type=\"button\" data-go=\"#/search\">Clear search</button></div>" : list) +
          "</div>";
      },
      submit: function (data) { query = data.get("q") || ""; UI.go("#/search"); }
    });
  }
  root.ShehnatPublic = { register: register };
})(typeof globalThis !== "undefined" ? globalThis : this);
