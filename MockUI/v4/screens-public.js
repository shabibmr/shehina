/* PROTOTYPE, throwaway. Public screens P1–P8. */
(function () {
  var U = Ui;
  U.add({
    id: 'P1', section: '', roles: null, auth: false, match: function (p) { return p === '/p/splash' ? {} : null; },
    render: function () {
      setTimeout(function () { if ((location.hash || '').indexOf('/p/splash') >= 0) U.go(Store.user() ? (Store.user().role === 'staff' ? '/s/home' : Store.user().role === 'manager' ? '/m/home' : '/i/home') : '/p/welcome', { replace: true }); }, Motion.reduced() ? 400 : 900);
      return '<div class="lead" style="min-height:70vh;align-items:center;justify-content:center"><img src="../../Demo/frontend/brand/logo-full.png" alt="Shehnat" style="max-width:16rem"></div>';
    }
  });
  U.add({
    id: 'P2', section: '', match: function (p) { return p === '/p/welcome' ? {} : null; },
    render: function () {
      var step = Number((Store.proto.welcome) || 0);
      var slides = [
        ['How it works', 'You fund a real shipment. The manager runs it. When the goods are sold, the result is shared.'],
        ['Capital at risk', 'You can lose money. A projection is not a promise.'],
        ['Full transparency', 'You see the costs, the sale, the fee, and every payout.']
      ];
      var s = slides[step];
      return '<p class="meta">Step ' + (step + 1) + ' of 3</p><h1>' + U.esc(s[0]) + '</h1><p>' + U.esc(s[1]) + '</p>' +
        '<p><button class="btn btn-primary" type="button" data-act="welcome" data-n="' + (step + 1) + '">' + (step === 2 ? 'Continue' : 'Next') + '</button> <button class="link" type="button" data-go="/p/signin">Skip</button></p>';
    }
  });
  U.add({
    id: 'P3', section: '', match: function (p) { return p === '/p/signin' ? {} : null; },
    render: function () {
      return '<img src="../../Demo/frontend/brand/logo-full.png" alt="Shehnat" style="max-width:12rem"><h1>Sign in</h1><form>' +
        U.field('Email', 'email', '', 'email') + U.field('Password', 'password', '', 'password') +
        '<button class="btn btn-primary" type="button" data-act="signin">Sign in</button></form>' +
        '<p><button class="link" type="button" data-go="/p/join">Create account</button></p><p><button class="link" type="button" data-go="/p/forgot">Forgot password</button></p>' +
        '<p class="meta">Demo password ' + U.esc(Seed.password) + '</p>';
    }
  });
  U.add({
    id: 'P4', section: '', match: function (p) { return p === '/p/join' ? {} : null; },
    render: function () {
      return '<h1>Create account</h1><form>' +
        '<label class="field"><span>I want to</span><select name="role"><option value="investor">Invest</option><option value="manager">Manage shipments</option></select></label>' +
        U.field('Name', 'name') + U.field('Email', 'email', '', 'email') + U.field('Password', 'password', '', 'password') +
        '<p id="pwmsg" class="err"></p><button class="btn btn-primary" type="button" data-act="signup">Create account</button></form>';
    }
  });
  U.add({
    id: 'P5', section: '', match: function (p) { return p === '/p/forgot' ? {} : null; },
    render: function () {
      var note = Store.proto.notice === 'A reset link was sent' ? U.success('A reset link was sent') : '';
      return note + '<h1>Forgot password</h1><form>' + U.field('Email', 'email', '', 'email') + '<button class="btn btn-primary" type="button" data-act="forgot">Send link</button></form>';
    }
  });
  U.add({
    id: 'P6', section: 'you', auth: true, roles: ['investor', 'manager', 'staff'], match: function (p) { return p === '/p/notes' ? {} : null; },
    render: function () {
      var u = U.user();
      var rows = Store.state.notifications.filter(function (n) { return n.userId === u.id; }).slice().reverse();
      var body = rows.length ? rows.map(function (n) { return '<article class="row"><span class="grow"><span class="title">' + U.esc(n.text) + '</span><span class="meta num">' + new Date(n.at).toISOString().slice(0, 10) + '</span></span></article>'; }).join('') : U.empty('Nothing has changed yet.', '', '');
      return '<h1>Notifications</h1>' + body;
    }
  });
  U.add({
    id: 'P7', section: 'you', auth: true, roles: ['investor', 'manager', 'staff'], match: function (p) { return p === '/p/profile' ? {} : null; },
    render: function () {
      var u = U.user();
      var extra = '';
      if (u.role === 'staff' && u.staffRole === 'owner') extra = '<p><button class="link" data-go="/s/team" type="button">Team</button></p><p><button class="link" data-go="/s/shareholders" type="button">Shareholders</button></p><p><button class="link" data-go="/s/users" type="button">Users</button></p><p><button class="link" data-go="/s/settings" type="button">Settings</button></p><p><button class="link" data-go="/s/audit" type="button">Audit log</button></p><p><button class="link" data-go="/s/ledger" type="button">Ledger</button></p>';
      else if (u.role === 'staff') extra = '<p><button class="link" data-go="/s/users" type="button">Users</button></p><p><button class="link" data-go="/s/audit" type="button">Audit log</button></p>';
      var gate = u.role === 'investor' ? '<p><button class="link" data-go="/i/kyc-status" type="button">Identity check</button></p>' : (u.role === 'manager' ? '<p><button class="link" data-go="/m/status" type="button">Registration</button></p>' : '');
      return '<h1>' + U.esc(u.name) + '</h1><p class="meta">' + U.esc(u.email) + '</p><p class="meta">' + U.esc(u.role === 'staff' ? u.staffRole : u.role) + (u.shareholder ? ' · Shareholder' : '') + '</p>' +
        '<p>Personal details stay as submitted' + (u.kyc === 'approved' ? ' after approval' : '') + '.</p>' + gate +
        '<p><button class="link" data-go="/p/notes" type="button">Notifications</button></p>' + extra +
        '<p><button class="link" data-go="/p/legal" type="button">Risk and legal</button></p><p class="meta">Arabic is coming soon.</p><p><button class="btn btn-secondary" type="button" data-act="signout">Sign out</button></p>';
    }
  });
  U.add({
    id: 'P8', section: 'you', match: function (p) { return p === '/p/legal' ? {} : null; },
    render: function () {
      return '<img src="../../Demo/frontend/brand/logo-full.png" alt="Shehnat" style="max-width:10rem"><h1>Risk and legal</h1><p>Investments can lose value. Figures marked expected are estimates, not promises.</p><p>Shehnat is operated from the United Arab Emirates. Every amount is in US dollars.</p><p class="meta">This is a prototype. It is not an offer.</p>';
    }
  });
  U.add({
    id: 'search', section: '', auth: true, roles: ['investor', 'manager', 'staff'], match: function (p) { return p === '/search' ? {} : null; },
    render: function () {
      var q = (Store.proto.q || '').toLowerCase();
      var rows = Store.state.listings.filter(function (l) { return !q || l.name.toLowerCase().indexOf(q) >= 0; });
      return '<h1>Search</h1><form><label class="field"><span>Search listings</span><input name="q" value="' + U.esc(Store.proto.q || '') + '"></label><button class="btn btn-secondary" type="button" data-act="search">Search</button></form>' +
        (rows.length ? rows.map(function (l) { return U.listingRow(l, (U.user().role === 'staff' ? '/s/ops/' : U.user().role === 'manager' ? '/m/listing/' : '/i/listing/') + l.id); }).join('') : U.empty('No listing matches that search.', 'Clear search', '/search'));
    }
  });
  U.acts.welcome = function (node) {
    var n = Number(node.getAttribute('data-n'));
    if (n >= 3) U.go('/p/signin'); else { Store.proto.welcome = n; Ui.boot ? renderStay() : U.go('/p/welcome'); }
  };
  function renderStay() { location.hash = '/p/welcome'; }
  U.acts.welcome = function (node) {
    var n = Number(node.getAttribute('data-n'));
    Store.proto.welcome = n;
    if (n >= 3) U.go('/p/signin'); else U.go('/p/welcome');
  };
  U.acts.search = function (node, data) {
    Store.proto.q = data.q || '';
    if (!data.q) Store.proto.q = '';
    U.go('/search');
  };
})();
