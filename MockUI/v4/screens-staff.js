/* PROTOTYPE, throwaway. Staff screens S1–S17. */
(function () {
  var U = Ui;
  function L(id) { var l = U.byId(id); if (l) Logic.derive(Store.state, l); return l; }
  function role() { return U.user().staffRole; }

  U.add({
    id: 'S1', section: 'queue', auth: true, roles: ['staff'], match: function (p) { return p === '/s/home' ? {} : null; },
    render: function () {
      var u = U.user();
      var queues = queueItems();
      var lead = queues[0];
      var liveN = Store.state.listings.filter(function (l) { return l.status === 'live'; }).length;
      var raised = Store.state.listings.reduce(function (a, l) { return a + (l.raised || 0); }, 0);
      var overdue = Store.state.listings.filter(function (l) { Logic.derive(Store.state, l); return l.overdue; }).length;
      var late = Store.state.listings.filter(function (l) { return l.shipments.some(function (sh) { return sh.steps.some(function (st) { return st.late; }); }); }).length;
      var check = Logic.verify(Store.state);
      return '<h1>Queue</h1>' + (lead ? U.row(lead.title, lead.meta, '', lead.path) : U.empty('Nothing is waiting in your queue.', 'All listings', '/s/listings')) +
        (queues[1] ? U.row(queues[1].title, queues[1].meta, '', queues[1].path) : '') +
        '<section class="panel"><p class="kpi">Live listings</p><p class="price num">' + liveN + '</p><p class="kpi">Raised</p><p class="price num">' + U.esc(U.usd(raised)) + '</p><p class="kpi">Treasury</p><p class="price num">' + U.esc(U.usd(Logic.balance(Store.state, 'platform:treasury'))) + '</p><p class="kpi">Reserve fund</p><p class="price num">' + U.esc(U.usd(Logic.balance(Store.state, 'platform:reserve'))) + '</p><p class="kpi">Overdue <span class="num">' + overdue + '</span> · Late <span class="num">' + late + '</span></p>' +
        (u.staffRole === 'owner' ? '<p>Ledger ' + (check.ok ? '✓' : '✗') + '</p>' : '') + '</section>';
    }
  });
  function queueItems() {
    var u = U.user();
    var items = [];
    if (u.staffRole === 'reviewer' || u.staffRole === 'owner') {
      Store.state.applications.filter(function (a) { return a.status === 'pending'; }).forEach(function (a) {
        var who = Store.state.users.filter(function (x) { return x.id === a.userId; })[0];
        items.push({ title: who.name, meta: a.type, path: '/s/application/' + a.id });
      });
      Store.state.listings.filter(function (l) { return l.status === 'in_review' || l.status === 'awaiting_terms'; }).forEach(function (l) {
        items.push({ title: l.name, meta: l.status, path: '/s/review/' + l.id });
      });
    }
    if (u.staffRole === 'ops' || u.staffRole === 'owner') {
      Store.state.listings.filter(function (l) { Logic.derive(Store.state, l); return l.overdue; }).forEach(function (l) {
        items.push({ title: l.name, meta: 'Overdue', path: '/s/overdue' });
      });
      Store.state.listings.filter(function (l) { return l.status === 'live'; }).forEach(function (l) {
        items.push({ title: l.name, meta: 'Operations', path: '/s/ops/' + l.id });
      });
    }
    if (u.staffRole === 'finance' || u.staffRole === 'owner') {
      Store.state.approvals.filter(function (a) { return a.status === 'open'; }).forEach(function (a) {
        items.push({ title: a.type, meta: 'Approval', path: a.type === 'settlement' ? '/s/settlement/' + a.id : '/s/approvals' });
      });
      Store.state.withdrawals.filter(function (w) { return w.status === 'requested'; }).forEach(function (w) {
        items.push({ title: 'Withdrawal ' + U.usd(w.amount), meta: w.status, path: '/s/money' });
      });
    }
    return items;
  }
  U.add({
    id: 'S2', section: 'queue', auth: true, roles: ['staff'], match: function (p) { return p === '/s/queue' ? {} : null; },
    render: function () {
      var tab = Store.proto.qtab || 'investors';
      var apps = Store.state.applications.filter(function (a) { return a.status === 'pending' && (tab === 'investors' ? a.type === 'kyc' : a.type === 'company'); });
      var listings = Store.state.listings.filter(function (l) { return l.status === 'in_review'; });
      var tabs = ['investors', 'managers', 'listings'].map(function (t) { return '<button type="button" data-act="qtab" data-tab="' + t + '" aria-selected="' + (tab === t ? 'true' : 'false') + '">' + t + '</button>'; }).join('');
      var body = tab === 'listings' ? listings.map(function (l) { return U.row(l.name, l.assignee || 'Unassigned', '', '/s/review/' + l.id) + assignBtns('listing', l.id); }).join('') : apps.map(function (a) {
        var who = Store.state.users.filter(function (u) { return u.id === a.userId; })[0];
        return U.row(who.name, a.assignee || 'Unassigned', '', '/s/application/' + a.id) + assignBtns('application', a.id);
      }).join('');
      return '<h1>Review queue</h1><div class="tabs">' + tabs + '</div>' + (body || U.empty('Nothing in this queue.', 'Home', '/s/home'));
    }
  });
  function assignBtns(kind, id) {
    if (!Logic.can(U.user(), 'review')) return '';
    return '<p><button class="link" data-act="assign" data-kind="' + kind + '" data-id="' + id + '" type="button">Assign to me</button> <button class="link" data-act="clearAssign" data-kind="' + kind + '" data-id="' + id + '" type="button">Clear</button></p>';
  }
  U.add({
    id: 'S3', section: 'queue', auth: true, roles: ['staff'], match: function (p) { var m = /^\/s\/application\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) {
      var app = Store.state.applications.filter(function (a) { return a.id === params.id; })[0];
      if (!app) return U.empty('Application not found.', 'Queue', '/s/queue');
      var who = Store.state.users.filter(function (u) { return u.id === app.userId; })[0];
      var why = Logic.denial(Store.state, U.user(), 'decide', app);
      var docs = (app.docs || []).map(function (d) { return '<button class="link" type="button" data-act="viewdoc" data-name="' + U.esc(d.name) + '" data-entity="' + app.id + '">' + U.esc(d.name) + '</button>'; }).join(' ');
      return '<h1>' + U.esc(who.name) + '</h1><p class="meta">' + U.esc(who.country) + ' · ' + U.esc(app.status) + '</p><p>' + docs + '</p><p class="meta">This view is logged.</p>' +
        (why && app.status === 'pending' ? '<p class="denied">' + U.esc(why) + '</p>' : '') +
        (app.status === 'pending' && !why ? '<form><label class="field"><span>Reason if rejecting</span><textarea id="reason" name="reason"></textarea></label><button class="btn btn-primary" data-act="decideApp" data-id="' + app.id + '" data-decision="approve" type="button">Approve</button> <button class="btn btn-danger" data-act="decideApp" data-id="' + app.id + '" data-decision="reject" type="button">Reject</button></form>' : '');
    }
  });
  U.add({
    id: 'S4', section: 'queue', auth: true, roles: ['staff'], match: function (p) { var m = /^\/s\/review\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) {
      var l = L(params.id);
      if (!l) return U.empty('Listing not found.', 'Queue', '/s/queue');
      var why = Logic.denial(Store.state, U.user(), 'decide', l);
      var sh = Store.state.users.filter(function (u) { return u.shareholder && u.kyc === 'approved'; });
      var canWaive = Logic.can(U.user(), 'deposit');
      return '<h1>' + U.esc(l.name) + '</h1>' + U.funding(l) + '<p>Target <span class="num">' + U.esc(U.usd(l.target)) + '</span> · investor share <span class="num">' + l.investorSharePct + '%</span></p>' +
        (why ? '<p class="denied">' + U.esc(why) + '</p>' : '<form>' +
          '<label class="field"><span>Buyer is a Shareholder</span><select name="buyerShareholderId"><option value="">No</option>' + sh.map(function (u) { return '<option value="' + u.id + '">' + U.esc(u.name) + '</option>'; }).join('') + '</select></label>' +
          U.field('Market check', 'marketNote') +
          (canWaive ? '<label class="field"><span><input type="checkbox" name="waiver"> Waive the deposit</span></label>' : '<p class="denied">Only finance or the owner can waive the deposit.</p>') +
          '<label class="field"><span>Reason if rejecting or revising</span><textarea name="reason" id="reason"></textarea></label>' +
          U.field('Revised investor share %', 'investorSharePct', String(l.investorSharePct), 'number') +
          '<button class="btn btn-primary" data-act="approveListing" data-id="' + l.id + '" type="button">Approve</button> <button class="btn btn-secondary" data-act="reviseListing" data-id="' + l.id + '" type="button">Revised terms</button> <button class="btn btn-danger" data-act="rejectListing" data-id="' + l.id + '" type="button">Reject</button></form>');
    }
  });
  U.add({
    id: 'S5', section: 'queue', auth: true, roles: ['staff'], match: function (p) { var m = /^\/s\/revise\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) { return '<h1>Revised terms</h1><p>Use the review screen to send a new investor share.</p><p><button class="link" data-go="/s/review/' + params.id + '" type="button">Back to review</button></p>'; }
  });
  U.add({
    id: 'S6', section: 'queue', auth: true, roles: ['staff'], match: function (p) { return p === '/s/overdue' ? {} : null; },
    render: function () {
      var rows = Store.state.listings.filter(function (l) { Logic.derive(Store.state, l); return l.overdue; });
      var why = Logic.denial(Store.state, U.user(), 'ops');
      return '<h1>Funding overdue</h1>' + (rows.length ? rows.map(function (l) {
        return '<article>' + U.listingRow(l, '/s/ops/' + l.id) + U.funding(l) + (why ? '<p class="denied">' + U.esc(why) + '</p>' : '<button class="btn btn-primary" data-act="fill" data-id="' + l.id + '" type="button">Fill from the treasury</button>') + '</article>';
      }).join('') : U.empty('No listing is overdue.', 'All listings', '/s/listings'));
    }
  });
  U.add({
    id: 'S7', section: 'listings', auth: true, roles: ['staff'], wide: true, match: function (p) { return p === '/s/listings' ? {} : null; },
    render: function () {
      var q = Store.proto.lq || '';
      var rows = Store.state.listings.filter(function (l) { Logic.derive(Store.state, l); return !q || l.name.toLowerCase().indexOf(q.toLowerCase()) >= 0 || l.status.indexOf(q) >= 0; });
      return '<h1>All listings</h1><form><label class="field"><span>Search</span><input name="q" value="' + U.esc(q) + '"></label><button class="btn btn-secondary" data-act="lsearch" type="button">Filter</button></form><table class="data"><thead><tr><th>Name</th><th>Status</th><th class="num">Raised</th></tr></thead><tbody>' +
        rows.map(function (l) { return '<tr><td><button class="link" data-go="/s/ops/' + l.id + '" type="button">' + U.esc(l.name) + '</button></td><td>' + U.statusWord(l) + '</td><td class="num">' + U.esc(U.usd(l.raised || 0)) + '</td></tr>'; }).join('') + '</tbody></table>';
    }
  });
  U.add({
    id: 'S8', section: 'listings', auth: true, roles: ['staff'], match: function (p) { var m = /^\/s\/ops\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) {
      var l = L(params.id);
      if (!l) return U.empty('Listing not found.', 'Listings', '/s/listings');
      var why = Logic.denial(Store.state, U.user(), 'ops');
      var board = l.shipments.map(function (sh) {
        var cols = ['todo', 'in_progress', 'done', 'verified', 'blocked', 'skipped'].map(function (col) {
          var cards = sh.steps.filter(function (st) { return st.status === col || (col === 'todo' && st.status === 'todo'); }).map(function (st) {
            return '<article class="card is-fade"><b>' + U.esc(st.name) + '</b><p class="meta">' + U.esc(st.owner) + ' · <span class="num">' + U.esc(U.usd(st.cost)) + '</span> · ' + (st.docs || []).length + ' documents</p>' +
              (why ? '' : '<button class="link" data-act="opstep" data-status="done" data-id="' + l.id + '" data-sh="' + sh.id + '" data-st="' + st.id + '" type="button">Done</button> <button class="link" data-act="opverify" data-id="' + l.id + '" data-sh="' + sh.id + '" data-st="' + st.id + '" type="button">Verify</button> <button class="link" data-act="opblock" data-id="' + l.id + '" data-sh="' + sh.id + '" data-st="' + st.id + '" type="button">Block</button>') +
              '</article>';
          }).join('');
          return '<section><h2>' + col.replace('_', ' ') + '</h2>' + cards + '</section>';
        }).join('');
        return '<h2>' + U.esc(sh.label) + ' · ' + U.esc(Logic.STAGES[sh.stage] || '') + '</h2><div class="board">' + cols + '</div>';
      }).join('');
      var money = why ? '<p class="denied">' + U.esc(why) + '</p>' : '<form><h2>Money</h2>' + U.dollarsField('Amount', 'amount') + U.field('Shipment id', 'shipmentId', l.shipments[0].id) + U.field('Step id', 'stepId', l.shipments[0].steps[0].id) + U.field('Proof or reason', 'proof') +
        '<p><button class="btn btn-secondary" data-act="paycost" data-id="' + l.id + '" type="button">Pay step cost</button></p>' +
        '<p><button class="btn btn-secondary" data-act="unplanned" data-id="' + l.id + '" type="button">Unplanned cost</button></p>' +
        '<p><button class="btn btn-secondary" data-act="proceeds" data-id="' + l.id + '" type="button">Record sale proceeds</button></p>' +
        '<p><button class="btn btn-secondary" data-act="useproceeds" data-id="' + l.id + '" type="button">Use proceeds</button></p>' +
        '<p><button class="btn btn-secondary" data-act="overrun" data-id="' + l.id + '" type="button">Overrun fill</button></p>' +
        '<p><button class="btn btn-secondary" data-act="writeoff" data-id="' + l.id + '" type="button">Propose write-off</button></p>' +
        '<p><button class="btn btn-secondary" data-act="resale" data-id="' + l.id + '" type="button">Propose resale</button></p>' +
        '<p><button class="btn btn-secondary" data-act="resaleSh" data-id="' + l.id + '" type="button">Resale to a Shareholder</button></p>' +
        '<p><button class="btn btn-danger" data-act="cancel" data-id="' + l.id + '" type="button">Cancel and refund</button></p>' +
        '<p><button class="btn btn-primary" data-act="settle" data-id="' + l.id + '" type="button">Propose settlement</button></p></form>';
      return '<h1>' + U.esc(l.name) + '</h1><p>' + U.statusWord(l) + '</p>' + U.funding(l) + board + money;
    }
  });
  U.add({
    id: 'S9', section: 'queue', auth: true, roles: ['staff'], match: function (p) { return p === '/s/approvals' ? {} : null; },
    render: function () {
      var rows = Store.state.approvals.filter(function (a) { return a.status === 'open'; });
      return '<h1>Approvals</h1>' + (rows.length ? rows.map(function (a) {
        var eyes = a.proposerId === U.user().id ? '<p class="denied">Needs another staff member to approve</p>' : '';
        return '<article class="card"><b>' + U.esc(a.type) + '</b><p class="meta">' + U.esc(a.listingId) + '</p>' + eyes +
          (eyes ? '' : '<button class="btn btn-primary" data-go="' + (a.type === 'settlement' ? '/s/settlement/' + a.id : '') + '" data-act="' + (a.type === 'settlement' ? '' : 'okapproval') + '" data-id="' + a.id + '" type="button">Approve</button> <button class="btn btn-danger" data-act="backapproval" data-id="' + a.id + '" type="button">Send back</button>') +
          '</article>';
      }).join('') : U.empty('Nothing needs a second person.', 'Queue', '/s/home'));
    }
  });
  U.add({
    id: 'S10', section: 'queue', auth: true, roles: ['staff'], match: function (p) { var m = /^\/s\/settlement\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) {
      var row = Store.state.approvals.filter(function (a) { return a.id === params.id; })[0];
      if (!row) return U.empty('No settlement here.', 'Approvals', '/s/approvals');
      var l = L(row.listingId);
      var result = Logic.compute({ contributions: l.contributions, cost: l.costsPaid || 0, revenue: l.proceeds || 0, investorSharePct: l.investorSharePct, feeBps: Store.state.settings.feeBps });
      var eyes = row.proposerId === U.user().id;
      var lines = result.lines.map(function (line) { return '<tr><td>' + U.esc(line.userId || 'Treasury') + '</td><td class="num">' + U.esc(U.usd(line.payout)) + '</td></tr>'; }).join('');
      return '<h1>Settlement</h1><p>' + U.esc(l.name) + '</p><table class="statement"><tr><td>Sale</td><td class="num">' + U.esc(U.usd(result.revenue)) + '</td></tr><tr><td>Costs</td><td class="num">' + U.esc(U.usd(result.cost)) + '</td></tr><tr><td>Fee</td><td class="num">' + U.esc(U.usd(result.fee)) + '</td></tr><tr><td>Manager share</td><td class="num">' + U.esc(U.usd(result.manager)) + '</td></tr><tr><td>Pool</td><td>' + U.money(result.pool, 'result') + '</td></tr>' + lines + '</table>' +
        (eyes ? '<p class="denied">Needs another staff member to approve</p>' : '<p><button class="btn btn-primary" data-act="okapproval" data-id="' + row.id + '" type="button">Approve payout</button> <button class="btn btn-danger" data-act="backapproval" data-id="' + row.id + '" type="button">Send back</button></p>');
    }
  });
  U.add({
    id: 'S11', section: 'money', auth: true, roles: ['staff'], match: function (p) { return p === '/s/money' ? {} : null; },
    render: function () {
      var tab = Store.proto.moneyTab || 'withdrawals';
      var tabs = ['withdrawals', 'treasury', 'revenue', 'reserve'].map(function (t) { return '<button type="button" data-act="moneytab" data-tab="' + t + '" aria-selected="' + (tab === t ? 'true' : 'false') + '">' + t + '</button>'; }).join('');
      var body = '';
      if (tab === 'withdrawals') body = Store.state.withdrawals.map(function (w) {
        var large = w.amount >= Store.state.settings.largeWithdrawal && role() !== 'owner';
        return '<article class="card"><p class="price num">' + U.esc(U.usd(w.amount)) + '</p><p class="word">' + U.esc(w.status) + '</p>' +
          (w.status === 'requested' ? (large ? '<p class="denied">USD 10,000 or more can only be approved by the owner</p>' : '<form>' + U.field('Reference', 'ref') + '<button class="btn btn-primary" data-act="paywd" data-id="' + w.id + '" type="button">Approve</button> <button class="btn btn-danger" data-act="declinewd" data-id="' + w.id + '" type="button">Decline</button></form>') : '') +
          '</article>';
      }).join('');
      else if (tab === 'treasury') body = '<p class="figure num">' + U.esc(U.usd(Logic.balance(Store.state, 'platform:treasury'))) + '</p><form>' + U.dollarsField('Amount', 'amount') + U.field('Reference', 'ref') + '<button class="btn btn-primary" data-act="treasury" type="button">Top up treasury</button></form>';
      else if (tab === 'revenue') body = '<p class="figure num">' + U.esc(U.usd(Logic.balance(Store.state, 'platform:revenue'))) + '</p>';
      else body = '<p class="figure num">' + U.esc(U.usd(Logic.balance(Store.state, 'platform:reserve'))) + '</p>' + (role() === 'owner' ? '<form>' + U.dollarsField('Amount', 'amount') + U.field('Reason', 'reason') + '<button class="btn btn-primary" data-act="reserve" type="button">Move to treasury</button></form>' : '<p class="denied">Only the owner moves money out of the Reserve fund.</p>');
      return '<h1>Money</h1><div class="tabs">' + tabs + '</div>' + body;
    }
  });
  U.add({
    id: 'S12', section: 'you', auth: true, roles: ['staff'], match: function (p) { return p === '/s/team' ? {} : null; },
    render: function () {
      if (role() !== 'owner') return '<h1>Team</h1><p class="denied">Only the owner manages the team.</p>';
      var rows = Store.state.users.filter(function (u) { return u.role === 'staff'; }).map(function (u) {
        return '<p>' + U.esc(u.name) + ' · ' + U.esc(u.staffRole) + (u.active ? '' : ' · deactivated') + '</p>';
      }).join('');
      return '<h1>Team</h1>' + rows + '<form><h2>Add staff</h2>' + U.field('Name', 'name') + U.field('Email', 'email') + U.field('Password', 'password') + '<label class="field"><span>Role</span><select name="staffRole"><option>reviewer</option><option>ops</option><option>finance</option><option>owner</option></select></label><button class="btn btn-primary" data-act="addstaff" type="button">Add</button></form>' +
        '<form><h2>Change role</h2><label class="field"><span>Person</span><select name="userId">' + Store.state.users.filter(function (u) { return u.role === 'staff'; }).map(function (u) { return '<option value="' + u.id + '">' + U.esc(u.name) + '</option>'; }).join('') + '</select></label><label class="field"><span>Role</span><select name="staffRole"><option>reviewer</option><option>ops</option><option>finance</option><option>owner</option></select></label><button class="btn btn-secondary" data-act="setrole" type="button">Save role</button> <button class="btn btn-danger" data-act="deactivate" type="button">Deactivate</button></form>';
    }
  });
  U.add({
    id: 'S13', section: 'you', auth: true, roles: ['staff'], match: function (p) { return p === '/s/shareholders' ? {} : null; },
    render: function () {
      var rows = Store.state.users.filter(function (u) { return u.role !== 'staff' && u.kyc === 'approved'; });
      return '<h1>Shareholders</h1>' + rows.map(function (u) {
        return '<p>' + U.esc(u.name) + (u.shareholder ? ' · Shareholder' : '') + (role() === 'owner' ? ' <button class="link" data-act="marksh" data-id="' + u.id + '" data-on="' + (u.shareholder ? '0' : '1') + '" type="button">' + (u.shareholder ? 'Unmark' : 'Mark') + '</button>' : '') + '</p>';
      }).join('');
    }
  });
  U.add({
    id: 'S14', section: 'you', auth: true, roles: ['staff'], match: function (p) { return p === '/s/users' ? {} : null; },
    render: function () {
      var rows = Store.state.users.filter(function (u) { return u.role !== 'staff'; });
      return '<h1>Users</h1>' + rows.map(function (u) {
        return '<article class="card"><b>' + U.esc(u.name) + '</b><p class="meta">' + U.esc(u.role) + (u.suspended ? ' · suspended' : '') + '</p>' +
          '<button class="link" data-act="suspend" data-id="' + u.id + '" data-on="' + (u.suspended ? '0' : '1') + '" type="button">' + (u.suspended ? 'Lift suspension' : 'Suspend') + '</button>' +
          (u.role === 'manager' && role() === 'owner' ? '<form>' + U.dollarsField('Exposure limit', 'amount') + '<button class="btn btn-secondary" data-act="exposure" data-id="' + u.id + '" type="button">Save limit</button></form>' : '') +
          '</article>';
      }).join('');
    }
  });
  U.add({
    id: 'S15', section: 'you', auth: true, roles: ['staff'], match: function (p) { return p === '/s/settings' ? {} : null; },
    render: function () {
      if (role() !== 'owner') return '<h1>Settings</h1><p class="denied">Only the owner changes settings.</p>';
      var st = Store.state.settings;
      return '<h1>Settings</h1><form>' + U.field('Overdue days', 'overdueDays', st.overdueDays, 'number') + U.field('Auto-withdraw days', 'autoWithdrawDays', st.autoWithdrawDays, 'number') + U.field('Waiver stand-in %', 'waiverPct', st.waiverPct, 'number') + U.field('Shareholder share %', 'shareholderPct', st.shareholderPct, 'number') + U.dollarsField('Default exposure limit', 'exposure') + U.field('Blocked countries, codes', 'blocked', st.blocked.join(',')) + U.field('Prohibited goods', 'prohibited', st.prohibited) + '<button class="btn btn-primary" data-act="settings" type="button">Save settings</button></form>';
    }
  });
  U.add({
    id: 'S16', section: 'you', auth: true, roles: ['staff'], match: function (p) { return p === '/s/audit' ? {} : null; },
    render: function () {
      var q = (Store.proto.aq || '').toLowerCase();
      var rows = Store.state.audit.filter(function (a) { return !q || (a.action + a.entity).toLowerCase().indexOf(q) >= 0; }).slice().reverse();
      return '<h1>Audit log</h1><form><label class="field"><span>Filter</span><input name="q" value="' + U.esc(Store.proto.aq || '') + '"></label><button class="btn btn-secondary" data-act="afilter" type="button">Filter</button></form><ul class="timeline">' + rows.slice(0, 80).map(function (a) {
        return '<li><span class="num">' + new Date(a.at).toISOString().slice(0, 10) + '</span> ' + U.esc(a.actorId) + ' · ' + U.esc(a.action) + ' · ' + U.esc(a.entity) + (a.reason ? ' · ' + U.esc(a.reason) : '') + '</li>';
      }).join('') + '</ul>';
    }
  });
  U.add({
    id: 'S17', section: 'you', auth: true, roles: ['staff'], match: function (p) { return p === '/s/ledger' ? {} : null; },
    render: function () {
      var check = Logic.verify(Store.state);
      var accounts = {};
      Store.state.ledger.forEach(function (e) { accounts[e.account] = true; });
      var rows = Object.keys(accounts).sort().map(function (a) { return '<tr><td>' + U.esc(a) + '</td><td class="num">' + U.esc(U.usd(Logic.balance(Store.state, a))) + '</td></tr>'; }).join('');
      return '<h1>Ledger</h1><p>' + (check.ok ? U.success('The books balance') : U.banner('loss', 'The books do not balance', String(check.sum))) + '</p><table class="data"><tbody>' + rows + '</tbody></table>';
    }
  });

  function shipStep(data, l) {
    return { shipmentId: data.shipmentId || l.shipments[0].id, stepId: data.stepId || l.shipments[0].steps[0].id, amount: U.centsOf(data.amount), proof: data.proof || '' };
  }
  U.acts.qtab = function (n) { Store.proto.qtab = n.getAttribute('data-tab'); U.go('/s/queue'); };
  U.acts.clearAssign = function (n) { U.dispatch({ type: 'assign', actorId: U.user().id, kind: n.getAttribute('data-kind'), id: n.getAttribute('data-id'), assignee: '' }); U.go('/s/queue'); };
  U.acts.viewdoc = function (n) { U.dispatch({ type: 'viewDoc', actorId: U.user().id, entity: n.getAttribute('data-entity'), name: n.getAttribute('data-name') }); U.toast('Document viewed'); };
  U.acts.approveListing = function (n, data) {
    var r = U.dispatch({ type: 'reviewListing', actorId: U.user().id, id: n.getAttribute('data-id'), decision: 'approve', buyerShareholderId: data.buyerShareholderId, marketNote: data.marketNote, waiver: !!data.waiver, requiredDocs: { Receipts: ['Packing list'], Invoicing: ['Invoice'] } });
    if (r.ok) U.go('/s/queue');
  };
  U.acts.rejectListing = function (n, data) {
    var r = U.dispatch({ type: 'reviewListing', actorId: U.user().id, id: n.getAttribute('data-id'), decision: 'reject', reason: data.reason });
    if (r.ok) U.go('/s/queue');
  };
  U.acts.reviseListing = function (n, data) {
    var l = L(n.getAttribute('data-id'));
    var listing = { name: l.name, category: l.category, source: l.source, buyer: l.buyer, certificate: l.certificate, companyPct: l.companyPct, investorSharePct: Number(data.investorSharePct || l.investorSharePct), minInvest: l.minInvest, shipments: l.shipments.map(function (sh) { return { label: sh.label, expectedCost: sh.expectedCost, expectedSale: sh.expectedSale, plannedStart: sh.plannedStart, steps: sh.steps }; }) };
    var r = U.dispatch({ type: 'reviewListing', actorId: U.user().id, id: l.id, decision: 'revise', reason: data.reason || 'Revised terms', listing: listing });
    if (r.ok) U.go('/s/queue');
  };
  U.acts.fill = function (n) { var r = U.dispatch({ type: 'fillOverdue', actorId: U.user().id, id: n.getAttribute('data-id') }); if (r.ok) U.go('/s/overdue'); };
  U.acts.lsearch = function (n, data) { Store.proto.lq = data.q || ''; U.go('/s/listings'); };
  U.acts.opstep = function (n) { U.dispatch({ type: 'stepSet', actorId: U.user().id, listingId: n.getAttribute('data-id'), shipmentId: n.getAttribute('data-sh'), stepId: n.getAttribute('data-st'), status: 'done' }); U.go('/s/ops/' + n.getAttribute('data-id')); };
  U.acts.opverify = function (n) { U.dispatch({ type: 'verifyStep', actorId: U.user().id, listingId: n.getAttribute('data-id'), shipmentId: n.getAttribute('data-sh'), stepId: n.getAttribute('data-st') }); U.go('/s/ops/' + n.getAttribute('data-id')); };
  U.acts.opblock = function (n) { U.dispatch({ type: 'blockStep', actorId: U.user().id, listingId: n.getAttribute('data-id'), shipmentId: n.getAttribute('data-sh'), stepId: n.getAttribute('data-st'), reason: 'Blocked by operations' }); U.go('/s/ops/' + n.getAttribute('data-id')); };
  U.acts.paycost = function (n, data) { var l = L(n.getAttribute('data-id')); var x = shipStep(data, l); U.dispatch({ type: 'payCost', actorId: U.user().id, listingId: l.id, shipmentId: x.shipmentId, stepId: x.stepId, amount: x.amount, proof: x.proof || 'proof' }); U.go('/s/ops/' + l.id); };
  U.acts.unplanned = function (n, data) { var l = L(n.getAttribute('data-id')); var x = shipStep(data, l); U.dispatch({ type: 'proposeUnplanned', actorId: U.user().id, listingId: l.id, shipmentId: x.shipmentId, stepId: x.stepId, amount: x.amount, reason: x.proof }); U.go('/s/approvals'); };
  U.acts.proceeds = function (n, data) { var l = L(n.getAttribute('data-id')); var x = shipStep(data, l); U.dispatch({ type: 'recordProceeds', actorId: U.user().id, listingId: l.id, shipmentId: x.shipmentId, amount: x.amount, reason: x.proof, doc: 'sale.pdf' }); U.go('/s/ops/' + l.id); };
  U.acts.useproceeds = function (n) { U.dispatch({ type: 'proposeUseProceeds', actorId: U.user().id, listingId: n.getAttribute('data-id'), reason: 'Use sale proceeds' }); U.go('/s/approvals'); };
  U.acts.overrun = function (n, data) { U.dispatch({ type: 'proposeOverrun', actorId: U.user().id, listingId: n.getAttribute('data-id'), amount: U.centsOf(data.amount), proof: data.proof || 'proof', reason: data.proof || 'Overrun' }); U.go('/s/approvals'); };
  U.acts.writeoff = function (n, data) { var l = L(n.getAttribute('data-id')); U.dispatch({ type: 'proposeWriteoff', actorId: U.user().id, listingId: l.id, shipmentId: data.shipmentId || l.shipments[0].id, reason: data.proof || 'Write-off', amount: U.centsOf(data.amount) || 0 }); U.go('/s/approvals'); };
  U.acts.resale = function (n, data) { var l = L(n.getAttribute('data-id')); U.dispatch({ type: 'proposeResale', actorId: U.user().id, listingId: l.id, shipmentId: data.shipmentId || l.shipments[1].id || l.shipments[0].id, buyer: 'DE', price: U.centsOf(data.amount) || 100000, reason: data.proof || 'Resale', shareholder: false }); U.go('/s/approvals'); };
  U.acts.resaleSh = function (n, data) { var l = L(n.getAttribute('data-id')); U.dispatch({ type: 'proposeResale', actorId: U.user().id, listingId: l.id, shipmentId: data.shipmentId || l.shipments[0].id, buyer: 'AE', price: U.centsOf(data.amount) || 100000, reason: data.proof || 'Resale to a Shareholder', shareholder: true, marketNote: data.proof || 'Market check' }); U.go('/s/approvals'); };
  U.acts.cancel = function (n, data) { U.dispatch({ type: 'cancelListing', actorId: U.user().id, listingId: n.getAttribute('data-id'), reason: data.proof || 'Cancelled before the goods were bought' }); U.go('/s/listings'); };
  U.acts.settle = function (n) { U.dispatch({ type: 'proposeSettlement', actorId: U.user().id, listingId: n.getAttribute('data-id') }); U.go('/s/approvals'); };
  U.acts.okapproval = function (n) { var r = U.dispatch({ type: 'decideApproval', actorId: U.user().id, id: n.getAttribute('data-id'), decision: 'approve', marketNote: 'Market check noted' }); if (r.ok) { Store.proto.notice = r.notice; U.go('/s/approvals'); } };
  U.acts.backapproval = function (n) { U.dispatch({ type: 'decideApproval', actorId: U.user().id, id: n.getAttribute('data-id'), decision: 'send_back', reason: 'Send back' }); U.go('/s/approvals'); };
  U.acts.moneytab = function (n) { Store.proto.moneyTab = n.getAttribute('data-tab'); U.go('/s/money'); };
  U.acts.paywd = function (n, data) { var r = U.dispatch({ type: 'decideWithdrawal', actorId: U.user().id, id: n.getAttribute('data-id'), decision: 'approve', ref: data.ref || 'BANK' }); if (r.ok) U.go('/s/money'); };
  U.acts.declinewd = function (n) { U.dispatch({ type: 'decideWithdrawal', actorId: U.user().id, id: n.getAttribute('data-id'), decision: 'decline', reason: 'Details do not match' }); U.go('/s/money'); };
  U.acts.treasury = function (n, data) { U.dispatch({ type: 'treasuryTopup', actorId: U.user().id, amount: U.centsOf(data.amount), ref: data.ref }); U.go('/s/money'); };
  U.acts.reserve = function (n, data) { U.dispatch({ type: 'reserveOut', actorId: U.user().id, amount: U.centsOf(data.amount), reason: data.reason || 'Owner transfer' }); U.go('/s/money'); };
  U.acts.addstaff = function (n, data) { var r = U.dispatch({ type: 'addStaff', actorId: U.user().id, name: data.name, email: data.email, password: data.password, staffRole: data.staffRole }); if (r.ok) U.go('/s/team'); };
  U.acts.setrole = function (n, data) { U.dispatch({ type: 'setRole', actorId: U.user().id, userId: data.userId, staffRole: data.staffRole }); U.go('/s/team'); };
  U.acts.deactivate = function (n, data) { U.dispatch({ type: 'deactivate', actorId: U.user().id, userId: data.userId }); U.go('/s/team'); };
  U.acts.marksh = function (n) { U.dispatch({ type: 'markShareholder', actorId: U.user().id, userId: n.getAttribute('data-id'), on: n.getAttribute('data-on') === '1' }); U.go('/s/shareholders'); };
  U.acts.suspend = function (n) { U.dispatch({ type: 'suspendUser', actorId: U.user().id, userId: n.getAttribute('data-id'), on: n.getAttribute('data-on') === '1', reason: 'Compliance' }); U.go('/s/users'); };
  U.acts.exposure = function (n, data) { U.dispatch({ type: 'setExposure', actorId: U.user().id, userId: n.getAttribute('data-id'), amount: U.centsOf(data.amount) }); U.go('/s/users'); };
  U.acts.settings = function (n, data) {
    U.dispatch({ type: 'updateSettings', actorId: U.user().id, settings: { overdueDays: Number(data.overdueDays), autoWithdrawDays: Number(data.autoWithdrawDays), waiverPct: Number(data.waiverPct), shareholderPct: Number(data.shareholderPct), exposureDefault: U.centsOf(data.exposure) || Store.state.settings.exposureDefault, blocked: String(data.blocked || '').split(',').map(function (s) { return s.trim(); }), prohibited: data.prohibited } });
    U.go('/s/settings');
  };
  U.acts.afilter = function (n, data) { Store.proto.aq = data.q || ''; U.go('/s/audit'); };
})();
