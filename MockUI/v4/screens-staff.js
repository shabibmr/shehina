/* PROTOTYPE, throwaway. Staff screens S1–S17. */
(function () {
  'use strict';
  var U = Ui;

  function L(id) {
    var l = U.byId(id);
    if (l) Logic.derive(Store.state, l);
    return l;
  }

  // S1: Staff Home
  U.add({
    id: 'S1', section: 'queue', auth: true, roles: ['staff'],
    match: function (p) { return p === '/s/home' ? {} : null; },
    render: function () {
      var u = U.user();
      var role = u.staffRole || 'ops';
      var s = Store.state;

      var openApps = s.applications.filter(function (a) { return a.status === 'pending'; });
      var reviewListings = s.listings.filter(function (l) { return l.status === 'in_review'; });
      var openApprovals = s.approvals.filter(function (a) { return a.status === 'open'; });
      var openWithdrawals = s.withdrawals.filter(function (w) { return w.status === 'requested'; });
      var liveListings = s.listings.filter(function (l) { return l.status === 'live'; });
      var overdueListings = s.listings.filter(function (l) { return l.overdue; });

      var treasuryBal = Logic.balance(s, 'platform:treasury');
      var revenueBal = Logic.balance(s, 'platform:revenue');

      var leadHtml = '';
      if (role === 'reviewer') {
        leadHtml = '<section class="panel">' +
          '<p class="kpi">Applications &amp; listing reviews</p>' +
          '<p class="figure num">' + (openApps.length + reviewListings.length) + ' <span class="meta">waiting</span></p>' +
          '<p><button class="btn btn-primary" data-go="/s/queue" type="button">Open review queue</button></p>' +
          '</section>';
      } else if (role === 'finance') {
        leadHtml = '<section class="panel">' +
          '<p class="kpi">Withdrawals waiting &amp; approvals</p>' +
          '<p class="figure num">' + (openWithdrawals.length + openApprovals.length) + ' <span class="meta">items</span></p>' +
          '<p><button class="btn btn-primary" data-go="/s/money" type="button">Open money console</button></p>' +
          '</section>';
      } else if (role === 'owner') {
        leadHtml = '<section class="panel">' +
          '<p class="kpi">Platform treasury</p>' +
          '<p class="figure num">' + U.esc(U.usd(treasuryBal)) + '</p>' +
          '<p class="meta">Revenue: <span class="num">' + U.esc(U.usd(revenueBal)) + '</span> · Approvals: <span class="num">' + openApprovals.length + '</span></p>' +
          '<p><button class="btn btn-primary" data-go="/s/approvals" type="button">View approvals inbox</button></p>' +
          '</section>';
      } else {
        leadHtml = '<section class="panel">' +
          '<p class="kpi">Active shipments in operations</p>' +
          '<p class="figure num">' + liveListings.length + '</p>' +
          '<p class="meta">' + overdueListings.length + ' overdue</p>' +
          '<p><button class="btn btn-primary" data-go="/s/listings" type="button">Operations directory</button></p>' +
          '</section>';
      }

      var queueRows = [];
      if (openApps.length) {
        queueRows.push(U.row(openApps.length + ' application(s) awaiting review', 'KYC & manager registrations', '<span class="word-warning">Queue</span>', '/s/queue'));
      }
      if (reviewListings.length) {
        queueRows.push(U.row(reviewListings.length + ' listing(s) in review', 'Review terms, market price, & deposit waiver', '<span class="word">Review</span>', '/s/queue'));
      }
      if (openApprovals.length) {
        queueRows.push(U.row(openApprovals.length + ' four-eyes approval(s)', 'Settlements, overrun, skips, unplanned costs', '<span class="word-warning">4-Eyes</span>', '/s/approvals'));
      }
      if (overdueListings.length) {
        queueRows.push(U.row(overdueListings.length + ' listing(s) overdue', 'Funding deadline passed', '<span class="word-warning">Overdue</span>', '/s/overdue'));
      }
      if (openWithdrawals.length) {
        queueRows.push(U.row(openWithdrawals.length + ' withdrawal request(s)', 'Payout queue', '<span class="word">Payout</span>', '/s/money'));
      }

      return '<h1>Staff console</h1>' +
        '<p class="meta">' + U.esc(u.name) + ' · ' + U.esc(role) + '</p>' +
        leadHtml +
        '<h2>Action queues</h2>' +
        (queueRows.length ? queueRows.join('') : '<p class="meta">All queues are clear.</p>');
    }
  });

  // S2: Review Queue & Assignment
  U.add({
    id: 'S2', section: 'queue', auth: true, roles: ['staff'],
    match: function (p) { return p === '/s/queue' ? {} : null; },
    render: function () {
      var s = Store.state;
      var u = U.user();
      var apps = s.applications.filter(function (a) { return a.status === 'pending'; });
      var listings = s.listings.filter(function (l) { return l.status === 'in_review' || l.status === 'awaiting_terms'; });

      var appRows = apps.map(function (a) {
        var who = s.users.filter(function (x) { return x.id === a.userId; })[0];
        var name = who ? who.name : a.userId;
        var assigneeText = a.assignee ? ('Assigned: ' + (s.users.filter(function (x) { return x.id === a.assignee; })[0] || {}).name || a.assignee) : 'Unassigned';
        var assignBtn = (a.assignee !== u.id && Logic.can(u, 'review')) ? ' <button class="btn btn-secondary" type="button" data-act="assignMe" data-kind="application" data-id="' + a.id + '">Assign to me</button>' : '';
        return '<div class="row"><span class="grow"><a href="#/s/application/' + a.id + '" class="title" style="text-decoration:none;color:inherit"><b>' + U.esc(name) + '</b></a>' +
          '<span class="meta">' + (a.type === 'company' ? 'Manager Company' : 'Investor KYC') + ' · ' + assigneeText + '</span></span>' +
          assignBtn + '<a href="#/s/application/' + a.id + '" class="chev">›</a></div>';
      }).join('');

      var listRows = listings.map(function (l) {
        var assigneeText = l.assignee ? ('Assigned: ' + (s.users.filter(function (x) { return x.id === l.assignee; })[0] || {}).name || l.assignee) : 'Unassigned';
        var assignBtn = (l.assignee !== u.id && Logic.can(u, 'review')) ? ' <button class="btn btn-secondary" type="button" data-act="assignMe" data-kind="listing" data-id="' + l.id + '">Assign to me</button>' : '';
        return '<div class="row"><span class="grow"><a href="#/s/review/' + l.id + '" class="title" style="text-decoration:none;color:inherit"><b>' + U.esc(l.name) + '</b></a>' +
          '<span class="meta">' + U.esc(l.category) + ' · ' + assigneeText + '</span></span>' +
          assignBtn + '<a href="#/s/review/' + l.id + '" class="chev">›</a></div>';
      }).join('');

      return '<h1>Review queue</h1>' +
        '<h2>Pending applications (' + apps.length + ')</h2>' +
        (appRows || '<p class="meta">No applications waiting.</p>') +
        '<h2>Listings under review (' + listings.length + ')</h2>' +
        (listRows || '<p class="meta">No listings waiting for review.</p>');
    }
  });

  // S3: Application Review (Investor & Manager)
  U.add({
    id: 'S3', section: 'queue', auth: true, roles: ['staff'],
    match: function (p) { var m = /^\/s\/application\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) {
      var a = Store.state.applications.filter(function (x) { return x.id === params.id; })[0];
      if (!a) return U.empty('Application not found.', 'Back to queue', '/s/queue');
      var u = U.user();
      var who = Store.state.users.filter(function (x) { return x.id === a.userId; })[0] || {};
      var isBlocked = Logic.blocked(Store.state, who.country);

      var canDecide = Logic.can(u, 'review') && (a.assignee === u.id || u.staffRole === 'owner');

      var docs = (a.docs || []).map(function (d) {
        return '<li>' + U.esc(d.name || d) + '</li>';
      }).join('');

      return '<h1>Review application</h1>' +
        '<p class="meta">' + (a.type === 'company' ? 'Manager company registration' : 'Investor KYC check') + '</p>' +
        (isBlocked ? U.banner('loss', 'Country blocked', 'The applicant country (' + who.country + ') is on the blocked list. This application cannot be approved.') : '') +
        '<section class="panel">' +
        '<p class="kpi">Applicant</p>' +
        '<p class="figure num">' + U.esc(who.name || a.userId) + '</p>' +
        '<p class="meta">Email: ' + U.esc(who.email) + '</p>' +
        '<p class="meta">Country: ' + U.esc(Logic.COUNTRY[who.country] || who.country) + ' · Phone: ' + U.esc(who.phone || 'None') + '</p>' +
        (who.dob ? '<p class="meta">DOB: ' + U.esc(who.dob) + '</p>' : '') +
        (who.managerType ? '<p class="meta">Type: ' + U.esc(who.managerType) + '</p>' : '') +
        '</section>' +
        '<h2>Submitted documents</h2>' +
        (docs ? '<ul>' + docs + '</ul>' : '<p class="meta">No files attached.</p>') +
        '<form>' +
        '<label class="field"><span>Decision reason (required for reject / resubmit)</span><textarea id="reason" name="reason" rows="2" placeholder="Explain reasons or missing items..."></textarea></label>' +
        (canDecide ?
          '<p><button class="btn btn-primary" type="button" data-act="decideApprove" data-id="' + a.id + '"' + (isBlocked ? ' disabled' : '') + '>Approve application</button> ' +
          '<button class="btn btn-secondary" type="button" data-act="decideResubmit" data-id="' + a.id + '">Request resubmission</button> ' +
          '<button class="btn btn-danger" type="button" data-act="decideReject" data-id="' + a.id + '">Reject application</button></p>' :
          '<p class="meta">Needs assigned reviewer or owner to decide. <button class="btn btn-secondary" type="button" data-act="assignMe" data-kind="application" data-id="' + a.id + '">Assign to me</button></p>') +
        '</form>';
    }
  });

  // S4: Listing Review
  U.add({
    id: 'S4', section: 'queue', auth: true, roles: ['staff'],
    match: function (p) { var m = /^\/s\/review\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) {
      var l = L(params.id);
      if (!l) return U.empty('Listing not found.', 'Back to queue', '/s/queue');
      var u = U.user();
      var mgr = Store.state.users.filter(function (x) { return x.id === l.managerId; })[0] || {};
      var canDecide = Logic.can(u, 'review') && (l.assignee === u.id || u.staffRole === 'owner');
      var canWaive = Logic.can(u, 'deposit') || u.staffRole === 'owner';

      // Shareholders list for buyer link
      var shareholders = Store.state.users.filter(function (x) { return x.shareholder; });
      var shOpts = '<option value="">No Shareholder link</option>' + shareholders.map(function (s) {
        return '<option value="' + s.id + '"' + (l.buyerShareholderId === s.id ? ' selected' : '') + '>' + U.esc(s.name) + ' (' + s.role + ')</option>';
      }).join('');

      return '<h1>Listing review</h1>' +
        '<p class="meta">' + U.esc(l.name) + ' · Manager: ' + U.esc(mgr.name || l.managerId) + '</p>' +
        '<section class="panel">' +
        '<p class="kpi">Funding target</p>' +
        '<p class="figure num">' + U.esc(U.usd(l.target)) + '</p>' +
        '<p class="meta">Cycle: ' + (l.cycle || 60) + ' days · Manager capital: ' + l.companyPct + '% · Investor share: ' + l.investorSharePct + '%</p>' +
        '<p class="meta">Route: ' + U.esc(Logic.COUNTRY[l.source] || l.source) + ' → ' + U.esc(Logic.COUNTRY[l.buyer] || l.buyer) + '</p>' +
        '<p class="meta">Quality certificate: ' + U.esc(l.certificate || 'None') + '</p>' +
        '</section>' +
        '<form>' +
        '<h2>Compliance checks</h2>' +
        '<label class="field"><span>Link buyer to Shareholder (if buyer is a vetted Shareholder)</span>' +
        '<select name="buyerShareholderId">' + shOpts + '</select></label>' +
        '<label class="field"><span><input type="checkbox" name="waiver"' + (l.depositWaiver ? ' checked' : '') + (!canWaive ? ' disabled' : '') + '> Waive manager deposit (Finance/Owner only; requires buyer Shareholder link)</span></label>' +
        '<label class="field"><span>Market check / pricing notes</span><textarea name="marketNote" rows="2" placeholder="Record verification of trade prices and counterparty checks..."></textarea></label>' +
        '<label class="field"><span>Rejection reason (if rejecting)</span><input name="rejectReason" placeholder="Reason..."></label>' +
        (canDecide ?
          '<p><button class="btn btn-primary" type="button" data-act="approveListing" data-id="' + l.id + '">Approve listing</button> ' +
          '<button class="btn btn-secondary" type="button" data-go="/s/revised/' + l.id + '">Propose revised terms</button> ' +
          '<button class="btn btn-danger" type="button" data-act="rejectListing" data-id="' + l.id + '">Reject listing</button></p>' :
          '<p class="meta">Needs assigned reviewer or owner to decide. <button class="btn btn-secondary" type="button" data-act="assignMe" data-kind="listing" data-id="' + l.id + '">Assign to me</button></p>') +
        '</form>';
    }
  });

  // S5: Revised Terms Editor
  U.add({
    id: 'S5', section: 'queue', auth: true, roles: ['staff'],
    match: function (p) { var m = /^\/s\/revised\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) {
      var l = L(params.id);
      if (!l) return U.empty('Listing not found.', 'Back to queue', '/s/queue');

      return '<h1>Propose revised terms</h1>' +
        '<p class="meta">' + U.esc(l.name) + '</p>' +
        '<form>' +
        '<label class="field"><span>Required explanation for manager</span>' +
        '<textarea name="reason" rows="2" placeholder="Explain why terms are adjusted (e.g. market risk, margin adjustment)..." required></textarea></label>' +
        U.dollarsField('New funding target', 'target') +
        '<label class="field"><span>Cycle duration (days)</span><input name="cycle" type="number" value="' + (l.cycle || 60) + '"></label>' +
        '<label class="field"><span>Manager capital contribution (%)</span><input name="companyPct" type="number" min="5" max="50" value="' + (l.companyPct || 20) + '"></label>' +
        '<label class="field"><span>Investor profit share (%)</span><input name="investorSharePct" type="number" min="20" max="80" value="' + (l.investorSharePct || 60) + '"></label>' +
        U.dollarsField('Minimum ticket', 'minInvest') +
        '<p><button class="btn btn-primary" type="button" data-act="sendRevisedTerms" data-id="' + l.id + '">Send revised terms to manager</button> ' +
        '<button class="btn btn-secondary" type="button" data-go="/s/review/' + l.id + '">Cancel</button></p>' +
        '</form>';
    }
  });

  // S6: Funding Overdue
  U.add({
    id: 'S6', section: 'queue', auth: true, roles: ['staff'],
    match: function (p) { return p === '/s/overdue' ? {} : null; },
    render: function () {
      var overdue = Store.state.listings.filter(function (l) { return l.overdue; });
      var rows = overdue.map(function (l) {
        var diff = l.target - l.raised;
        return '<div class="row"><span class="grow"><span class="title">' + U.esc(l.name) + '</span>' +
          '<span class="meta">Raised: ' + U.esc(U.usd(l.raised)) + ' / ' + U.esc(U.usd(l.target)) + ' · Short: ' + U.esc(U.usd(diff)) + '</span></span>' +
          '<button class="btn btn-primary" type="button" data-act="fillOverdue" data-id="' + l.id + '">Fill from Treasury</button> ' +
          '<button class="btn btn-danger" type="button" data-act="cancelOverdue" data-id="' + l.id + '">Cancel &amp; refund</button></div>';
      }).join('');

      return '<h1>Funding overdue</h1>' +
        '<p class="meta">Listings that passed the closing window without full funding:</p>' +
        (rows || U.empty('No listings are overdue for funding.', 'View all listings', '/s/listings'));
    }
  });

  // S7: Listings Directory
  U.add({
    id: 'S7', section: 'listings', auth: true, roles: ['staff'],
    match: function (p) { return p === '/s/listings' ? {} : null; },
    render: function () {
      var listings = Store.state.listings;
      var rows = listings.map(function (l) {
        var path = (l.status === 'in_review' || l.status === 'awaiting_terms') ? ('/s/review/' + l.id) : ('/s/ops/' + l.id);
        return U.listingRow(l, path);
      }).join('');

      return '<h1>All listings</h1>' +
        '<p class="meta">' + listings.length + ' listings across platform</p>' +
        (rows || U.empty('No listings found.', '', ''));
    }
  });

  // S8: Listing Operations: Step Board
  U.add({
    id: 'S8', section: 'listings', auth: true, roles: ['staff'],
    match: function (p) { var m = /^\/s\/ops\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) {
      var l = L(params.id);
      if (!l) return U.empty('Listing not found.', 'Listings', '/s/listings');
      var u = U.user();

      var escrowBal = Logic.balance(Store.state, Logic.escrowOf(l.id));

      var shipmentsHtml = (l.shipments || []).map(function (sh) {
        var steps = sh.steps || [];
        var cols = ['to_do', 'in_progress', 'done', 'verified', 'blocked', 'skipped'];
        var boardCols = cols.map(function (c) {
          var inCol = steps.filter(function (st) { return st.status === c; });
          var cards = inCol.map(function (st) {
            var verifyBtn = (c === 'done' && Logic.can(u, 'ops')) ? '<p><button class="btn btn-primary" type="button" data-act="verifyStep" data-lid="' + l.id + '" data-sid="' + sh.id + '" data-stid="' + st.id + '">Verify step</button></p>' : '';
            var blockBtn = (c !== 'verified' && c !== 'blocked' && Logic.can(u, 'ops')) ? '<p><button class="btn btn-secondary" type="button" data-act="blockStepSheet" data-lid="' + l.id + '" data-sid="' + sh.id + '" data-stid="' + st.id + '">Block step</button></p>' : '';
            var skipBtn = (c !== 'verified' && c !== 'skipped') ? '<p><button class="btn btn-secondary" type="button" data-act="skipStepSheet" data-lid="' + l.id + '" data-sid="' + sh.id + '" data-stid="' + st.id + '">Request skip</button></p>' : '';
            var payBtn = (l.status === 'live' && Logic.can(u, 'ops')) ? '<p><button class="btn btn-secondary" type="button" data-act="payCostSheet" data-lid="' + l.id + '" data-sid="' + sh.id + '" data-stid="' + st.id + '">Pay step cost</button></p>' : '';
            return '<div class="card">' +
              '<b>' + U.esc(st.name) + '</b>' +
              '<p class="meta">' + U.esc(st.assignedParty) + ' · Cost: ' + U.esc(U.usd(st.cost || 0)) + '</p>' +
              (st.docs && st.docs.length ? '<p class="meta">' + st.docs.length + ' doc(s)</p>' : '') +
              (st.blockedReason ? '<p class="err">' + U.esc(st.blockedReason) + '</p>' : '') +
              verifyBtn + blockBtn + skipBtn + payBtn +
              '</div>';
          }).join('');
          return '<section><h2>' + c.replace('_', ' ') + ' (' + inCol.length + ')</h2>' + (cards || '<p class="meta">—</p>') + '</section>';
        }).join('');

        return '<h2>' + U.esc(sh.label) + ' · ' + U.esc(Logic.STAGES[sh.stage] || 'Stage 0') + (sh.late ? ' <span class="word-warning">Late</span>' : '') + '</h2>' +
          '<div class="board">' + boardCols + '</div>';
      }).join('');

      var allSold = (l.shipments || []).every(function (sh) { return sh.proceedsRecorded || sh.writtenOff; });
      var settleBtn = (l.status === 'live' && allSold && Logic.can(u, 'ops')) ?
        '<p><button class="btn btn-primary" type="button" data-act="proposeSettle" data-id="' + l.id + '">Propose settlement</button></p>' : '';

      return '<h1>Operations: ' + U.esc(l.name) + '</h1>' +
        '<section class="panel">' +
        '<p class="kpi">Listing Escrow balance</p>' +
        '<p class="figure num">' + U.esc(U.usd(escrowBal)) + '</p>' +
        '<p class="meta">Status: ' + U.statusWord(l) + ' · Paid costs: ' + U.esc(U.usd(l.costsPaid || 0)) + ' / ' + U.esc(U.usd(l.raised)) + '</p>' +
        '</section>' +
        settleBtn +
        '<p><button class="btn btn-secondary" type="button" data-act="recordProceedsSheet" data-id="' + l.id + '">Record sale proceeds</button> ' +
        '<button class="btn btn-secondary" type="button" data-act="unplannedCostSheet" data-id="' + l.id + '">Unplanned cost</button> ' +
        '<button class="btn btn-secondary" type="button" data-act="overrunSheet" data-id="' + l.id + '">Request overrun</button> ' +
        '<button class="btn btn-secondary" type="button" data-act="resaleSheet" data-id="' + l.id + '">Propose resale</button> ' +
        '<button class="btn btn-danger" type="button" data-act="cancelListingSheet" data-id="' + l.id + '">Cancel listing</button></p>' +
        shipmentsHtml;
    }
  });

  // S9: Approvals Inbox (Four-Eyes)
  U.add({
    id: 'S9', section: 'queue', auth: true, roles: ['staff'],
    match: function (p) { return p === '/s/approvals' ? {} : null; },
    render: function () {
      var u = U.user();
      var open = Store.state.approvals.filter(function (a) { return a.status === 'open'; });

      var rows = open.map(function (a) {
        var l = L(a.listingId) || { name: 'Listing' };
        var proposer = Store.state.users.filter(function (x) { return x.id === a.proposerId; })[0] || {};
        var isProposer = a.proposerId === u.id;

        var detailText = '';
        if (a.type === 'settlement') detailText = 'Listing ready for settlement payout';
        else if (a.type === 'overrun') detailText = 'Overrun fill request: ' + U.usd(a.payload.amount) + ' · Reason: ' + (a.payload.reason || '');
        else if (a.type === 'unplanned') detailText = 'Unplanned cost: ' + U.usd(a.payload.amount) + ' · Reason: ' + (a.payload.reason || '');
        else if (a.type === 'skip') detailText = 'Skip step request · Reason: ' + (a.payload.reason || '');
        else if (a.type === 'resale' || a.type === 'resale_shareholder') detailText = 'Resale to ' + (a.payload.buyer || 'buyer') + ' for ' + U.usd(a.payload.price || 0);
        else detailText = a.type + ' proposal';

        var actions = '';
        if (isProposer) {
          actions = '<span class="denied">Needs another staff member to approve</span>';
        } else {
          var settleLink = a.type === 'settlement' ? ' <a href="#/s/settle/' + a.listingId + '" class="btn btn-primary" style="display:inline-block;line-height:var(--button-height);text-decoration:none">View settlement statement</a> ' : '';
          actions = settleLink +
            '<button class="btn btn-primary" type="button" data-act="decideApproveItem" data-id="' + a.id + '">Approve</button> ' +
            '<button class="btn btn-secondary" type="button" data-act="sendBackSheet" data-id="' + a.id + '">Send back</button>';
        }

        return '<div class="card">' +
          '<b>' + U.esc(l.name) + ' · ' + U.esc(a.type.toUpperCase()) + '</b>' +
          '<p class="meta">Proposed by: ' + U.esc(proposer.name || a.proposerId) + '</p>' +
          '<p>' + U.esc(detailText) + '</p>' +
          '<p>' + actions + '</p>' +
          '</div>';
      }).join('');

      return '<h1>Approvals inbox</h1>' +
        '<p class="meta">Four-eyes approval queue (proposer cannot approve their own request):</p>' +
        (rows || U.empty('No approvals waiting.', 'Back to queue', '/s/home'));
    }
  });

  // S10: Settlement Approval & statement
  U.add({
    id: 'S10', section: 'queue', auth: true, roles: ['staff'],
    match: function (p) { var m = /^\/s\/settle\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) {
      var l = L(params.id);
      if (!l) return U.empty('Listing not found.', 'Approvals', '/s/approvals');
      var u = U.user();
      var approval = Store.state.approvals.filter(function (a) { return a.listingId === l.id && a.type === 'settlement' && a.status === 'open'; })[0];

      var shTotalCost = (l.shipments || []).reduce(function (a, s) { return a + (s.expectedCost || 0); }, 0);
      var shTotalSale = (l.shipments || []).reduce(function (a, s) { return a + (s.proceeds || s.expectedSale || 0); }, 0);
      var calc = Logic.compute({
        contributions: l.contributions || [],
        cost: shTotalCost,
        revenue: shTotalSale,
        investorSharePct: l.investorSharePct || 60,
        feeBps: Store.state.settings.feeBps || 100
      });

      var investorRows = (calc.lines || []).map(function (line) {
        var who = Store.state.users.filter(function (x) { return x.id === line.userId; })[0];
        var name = who ? who.name : (line.kind === 'treasury' ? 'Platform Treasury' : (line.userId || 'Investor'));
        return '<tr><td>' + U.esc(name) + ' (' + line.kind + ')</td><td class="num">' + U.esc(U.usd(line.amount)) + '</td><td class="num">' + U.money(line.profit, 'result') + '</td><td class="num">' + U.esc(U.usd(line.payout)) + '</td></tr>';
      }).join('');

      var isProposer = approval && approval.proposerId === u.id;
      var canApprove = approval && !isProposer && (Logic.can(u, 'deposit') || u.staffRole === 'owner');

      return '<h1>Settlement calculation</h1>' +
        '<p class="meta">' + U.esc(l.name) + '</p>' +
        '<table class="statement">' +
        '<tr><td>Gross sale revenue</td><td class="num">' + U.esc(U.usd(calc.revenue)) + '</td></tr>' +
        '<tr><td>Total shipment costs</td><td class="num">' + U.esc(U.usd(calc.cost)) + '</td></tr>' +
        '<tr><td>Gross profit</td><td>' + U.money(calc.gross, 'result') + '</td></tr>' +
        '<tr><td>Platform fee (1%)</td><td class="num">' + U.esc(U.usd(calc.fee)) + '</td></tr>' +
        '<tr><td>Net distributable profit</td><td>' + U.money(calc.net, 'result') + '</td></tr>' +
        '<tr><td>Manager profit share (' + (100 - l.investorSharePct) + '%)</td><td class="num">' + U.esc(U.usd(calc.manager)) + '</td></tr>' +
        '<tr><td>Investor profit pool (' + l.investorSharePct + '%)</td><td class="num">' + U.esc(U.usd(calc.pool)) + '</td></tr>' +
        '</table>' +
        '<h2>Investor &amp; contributor payouts</h2>' +
        '<table class="data"><thead><tr><th>Contributor</th><th class="num">Invested</th><th class="num">Profit</th><th class="num">Total Payout</th></tr></thead><tbody>' +
        investorRows +
        '</tbody></table>' +
        (approval ?
          (isProposer ?
            '<p class="denied" style="margin-block-start:var(--space-4)">Needs another staff member to approve (four-eyes rule)</p>' :
            (canApprove ?
              '<p style="margin-block-start:var(--space-4)"><button class="btn btn-primary" type="button" data-act="decideApproveItem" data-id="' + approval.id + '">Approve &amp; execute payout</button> ' +
              '<button class="btn btn-secondary" type="button" data-act="sendBackSheet" data-id="' + approval.id + '">Send back with reason</button></p>' :
              '<p class="meta">Finance or Owner role required to approve settlement.</p>')) :
          '<p class="meta">Settlement has already been processed or is not awaiting approval.</p>');
    }
  });

  // S11: Money Console (Treasury, Revenue, Withdrawals, Reserve)
  U.add({
    id: 'S11', section: 'money', auth: true, roles: ['staff'],
    match: function (p) { return p === '/s/money' ? {} : null; },
    render: function () {
      var s = Store.state;
      var u = U.user();
      var treasuryBal = Logic.balance(s, 'platform:treasury');
      var revenueBal = Logic.balance(s, 'platform:revenue');
      var reserveBal = Logic.balance(s, 'platform:reserve');
      var holdBal = Logic.balance(s, 'withdrawals:hold');

      var wds = s.withdrawals.filter(function (w) { return w.status === 'requested'; });
      var wdRows = wds.map(function (w) {
        var who = s.users.filter(function (x) { return x.id === w.userId; })[0] || {};
        var isLarge = w.amount >= (s.settings.largeWithdrawal || 1000000);
        var canPay = isLarge ? (u.staffRole === 'owner') : (Logic.can(u, 'deposit') || u.staffRole === 'owner');
        var payControls = canPay ?
          '<button class="btn btn-primary" type="button" data-act="payWithdrawalSheet" data-id="' + w.id + '">Approve &amp; Pay</button> ' +
          '<button class="btn btn-danger" type="button" data-act="declineWithdrawalSheet" data-id="' + w.id + '">Decline</button>' :
          '<span class="denied">Held for Owner (≥ $10k)</span>';

        return '<div class="card">' +
          '<b>' + U.esc(who.name || w.userId) + ' · ' + U.usd(w.amount) + '</b>' +
          '<p class="meta">Bank: ' + U.esc(w.bank.bankName || '') + ' · ' + U.esc(w.bank.account || '') + ' · SWIFT: ' + U.esc(w.bank.swift || '') + '</p>' +
          (isLarge ? '<p class="word-warning">≥ USD 10,000 threshold</p>' : '') +
          '<p>' + payControls + '</p>' +
          '</div>';
      }).join('');

      return '<h1>Money &amp; Treasury</h1>' +
        '<section class="panel">' +
        '<p class="kpi">Platform Treasury balance</p>' +
        '<p class="figure num">' + U.esc(U.usd(treasuryBal)) + '</p>' +
        '<p class="meta">Platform Revenue: <span class="num">' + U.esc(U.usd(revenueBal)) + '</span></p>' +
        '<p class="meta">Reserve Fund: <span class="num">' + U.esc(U.usd(reserveBal)) + '</span> · Held for withdrawals: <span class="num">' + U.esc(U.usd(holdBal)) + '</span></p>' +
        '</section>' +
        '<h2>Treasury top-up</h2>' +
        '<form>' +
        U.dollarsField('Top-up amount', 'treasuryAmount') +
        U.field('Bank wire reference', 'treasuryRef', 'BANK-WIRE-8891') +
        '<button class="btn btn-secondary" type="button" data-act="treasuryTopup">Top up treasury</button>' +
        '</form>' +
        (u.staffRole === 'owner' ?
          '<h2>Reserve fund withdrawal (Owner only)</h2><form>' +
          U.dollarsField('Amount from Reserve fund', 'reserveAmount') +
          U.field('Purpose / audit reason', 'reserveReason') +
          '<button class="btn btn-secondary" type="button" data-act="reserveOut">Withdraw from Reserve</button></form>' : '') +
        '<h2>Pending withdrawals (' + wds.length + ')</h2>' +
        (wdRows || '<p class="meta">No pending withdrawals.</p>');
    }
  });

  // S12: Team Management (Owner)
  U.add({
    id: 'S12', section: 'you', auth: true, roles: ['staff'],
    match: function (p) { return p === '/s/team' ? {} : null; },
    render: function () {
      var u = U.user();
      if (u.staffRole !== 'owner') return U.banner('loss', 'Access denied', 'Only the platform owner manages staff accounts.');
      var staff = Store.state.users.filter(function (x) { return x.role === 'staff'; });

      var rows = staff.map(function (m) {
        var isMe = m.id === u.id;
        var deactBtn = (!isMe && m.active) ? ' <button class="btn btn-danger" type="button" data-act="deactivateStaff" data-id="' + m.id + '">Deactivate</button>' : (isMe ? ' <span class="meta">(You)</span>' : ' <span class="word-muted">Inactive</span>');
        return '<div class="row"><span class="grow"><b>' + U.esc(m.name) + '</b> <span class="meta">' + U.esc(m.email) + ' · <b>' + U.esc(m.staffRole) + '</b></span></span>' +
          deactBtn + '</div>';
      }).join('');

      return '<h1>Team management</h1>' +
        '<p class="meta">Platform staff accounts:</p>' +
        rows +
        '<h2>Add new staff member</h2>' +
        '<form>' +
        U.field('Staff name', 'staffName') +
        U.field('Email address', 'staffEmail', '', 'email') +
        U.field('Temporary password', 'staffPassword', 'shehnat-demo-1', 'password') +
        '<label class="field"><span>Staff role</span><select name="staffRole"><option value="ops">Operations</option><option value="reviewer">Compliance Reviewer</option><option value="finance">Finance</option><option value="owner">Owner</option></select></label>' +
        '<button class="btn btn-primary" type="button" data-act="addStaffMember">Add staff member</button>' +
        '</form>';
    }
  });

  // S13: Shareholders (Owner)
  U.add({
    id: 'S13', section: 'you', auth: true, roles: ['staff'],
    match: function (p) { return p === '/s/shareholders' ? {} : null; },
    render: function () {
      var u = U.user();
      if (u.staffRole !== 'owner') return U.banner('loss', 'Access denied', 'Only the platform owner manages shareholders.');
      var approvedUsers = Store.state.users.filter(function (x) { return (x.role === 'investor' || x.role === 'manager') && x.kyc === 'approved'; });

      var rows = approvedUsers.map(function (x) {
        var isSh = !!x.shareholder;
        return '<div class="row"><span class="grow"><b>' + U.esc(x.name) + '</b> <span class="meta">' + U.esc(x.role) + ' · ' + U.esc(Logic.COUNTRY[x.country] || x.country) + '</span></span>' +
          (isSh ? '<span class="word">Shareholder</span> <button class="btn btn-secondary" type="button" data-act="toggleShareholder" data-id="' + x.id + '" data-on="0">Unmark</button>' :
            '<button class="btn btn-primary" type="button" data-act="toggleShareholder" data-id="' + x.id + '" data-on="1">Mark Shareholder</button>') +
          '</div>';
      }).join('');

      return '<h1>Shareholders</h1>' +
        '<p class="meta">Vetted investors and managers eligible for Shareholder Listings and 75% profit pools:</p>' +
        (rows || '<p class="meta">No approved investors or managers found.</p>');
    }
  });

  // S14: Users Management
  U.add({
    id: 'S14', section: 'you', auth: true, roles: ['staff'],
    match: function (p) { return p === '/s/users' ? {} : null; },
    render: function () {
      var u = U.user();
      var users = Store.state.users.filter(function (x) { return x.role !== 'staff'; });

      var rows = users.map(function (x) {
        var suspBtn = x.suspended ?
          '<button class="btn btn-secondary" type="button" data-act="suspendToggle" data-id="' + x.id + '" data-on="0">Unsuspend</button>' :
          '<button class="btn btn-danger" type="button" data-act="suspendSheet" data-id="' + x.id + '">Suspend</button>';

        var expForm = x.role === 'manager' && u.staffRole === 'owner' ?
          '<div style="margin-block-start:var(--space-2)"><form class="amount" style="gap:var(--space-1)"><input name="exposureLimit" placeholder="Limit" style="width:7rem" value="' + (x.exposureLimit ? (x.exposureLimit / 100) : '') + '"><button class="btn btn-secondary" type="button" data-act="setExposureLimit" data-id="' + x.id + '">Set limit</button></form></div>' : '';

        return '<div class="card">' +
          '<b>' + U.esc(x.name) + '</b> <span class="meta">' + U.esc(x.email) + ' · ' + U.esc(x.role) + ' (' + U.esc(x.kyc) + ')</span>' +
          (x.suspended ? '<p class="err">Suspended</p>' : '') +
          (x.exposureLimit ? '<p class="meta">Exposure limit: ' + U.usd(x.exposureLimit) + '</p>' : '') +
          '<p>' + suspBtn + '</p>' +
          expForm +
          '</div>';
      }).join('');

      return '<h1>User accounts</h1>' +
        '<p class="meta">Directory of platform users and managers:</p>' +
        rows;
    }
  });

  // S15: System Settings (Owner)
  U.add({
    id: 'S15', section: 'you', auth: true, roles: ['staff'],
    match: function (p) { return p === '/s/settings' ? {} : null; },
    render: function () {
      var u = U.user();
      if (u.staffRole !== 'owner') return U.banner('loss', 'Access denied', 'Only the platform owner adjusts platform settings.');
      var st = Store.state.settings;

      return '<h1>System settings</h1>' +
        '<form>' +
        '<label class="field"><span>Overdue funding window (days)</span><input name="overdueDays" type="number" value="' + st.overdueDays + '"></label>' +
        '<label class="field"><span>Auto-withdrawal period (days)</span><input name="autoWithdrawDays" type="number" value="' + st.autoWithdrawDays + '"></label>' +
        '<label class="field"><span>Deposit waiver platform stand-in (%)</span><input name="waiverPct" type="number" value="' + st.waiverPct + '"></label>' +
        '<label class="field"><span>Shareholder profit allocation (%)</span><input name="shareholderPct" type="number" value="' + st.shareholderPct + '"></label>' +
        U.dollarsField('Default manager exposure limit', 'exposureDefault') +
        '<label class="field"><span>Blocked countries (comma separated codes)</span><input name="blocked" value="' + st.blocked.join(', ') + '"></label>' +
        '<button class="btn btn-primary" type="button" data-act="saveSettings">Save settings</button>' +
        '</form>';
    }
  });

  // S16: Audit Log
  U.add({
    id: 'S16', section: 'you', auth: true, roles: ['staff'],
    match: function (p) { return p === '/s/audit' ? {} : null; },
    render: function () {
      var log = Store.state.audit.slice().reverse();
      var rows = log.map(function (a) {
        return '<tr><td><span class="num">' + new Date(a.at).toISOString().slice(0, 19).replace('T', ' ') + '</span></td><td><b>' + U.esc(a.actorId) + '</b></td><td>' + U.esc(a.action) + '</td><td>' + U.esc(a.entity || '') + '</td><td>' + U.esc(a.detail || '') + '</td></tr>';
      }).join('');

      return '<h1>Audit log</h1>' +
        '<table class="data"><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="5">No audit entries recorded yet.</td></tr>') +
        '</tbody></table>';
    }
  });

  // S17: Ledger Statement
  U.add({
    id: 'S17', section: 'you', auth: true, roles: ['staff'],
    match: function (p) { return p === '/s/ledger' ? {} : null; },
    render: function () {
      var s = Store.state;
      var check = Logic.verify(s);

      var entries = (s.ledger || []).slice(-30).reverse();
      var rows = entries.map(function (e) {
        return '<tr><td><span class="num">' + new Date(e.at).toISOString().slice(0, 10) + '</span></td><td>' + U.esc(e.from) + '</td><td>' + U.esc(e.to) + '</td><td class="num">' + U.esc(U.usd(e.amount)) + '</td><td>' + U.esc(e.desc || '') + '</td></tr>';
      }).join('');

      return '<h1>Double-entry ledger</h1>' +
        '<section class="panel">' +
        '<p class="kpi">Ledger verification status</p>' +
        '<p class="figure num">' + (check.ok ? '✓ Balanced (Zero Sum)' : '✗ Difference ' + check.sum) + '</p>' +
        '<p class="meta">Every financial transaction across wallets, treasury, revenue, and escrow is balanced.</p>' +
        '</section>' +
        '<h2>Recent ledger journal</h2>' +
        '<table class="data"><thead><tr><th>Date</th><th>Debit (From)</th><th>Credit (To)</th><th class="num">Amount</th><th>Description</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="5">No ledger transactions recorded yet.</td></tr>') +
        '</tbody></table>';
    }
  });

  // Action handlers for staff
  U.acts.assignMe = function (node) {
    var kind = node.getAttribute('data-kind');
    var id = node.getAttribute('data-id');
    var r = U.dispatch({ type: 'assign', actorId: U.user().id, kind: kind, id: id, assignee: U.user().id });
    if (r.ok) U.go('/s/queue');
  };

  U.acts.decideApprove = function (node) {
    var id = node.getAttribute('data-id');
    var r = U.dispatch({ type: 'decideApplication', actorId: U.user().id, id: id, decision: 'approve' });
    if (r.ok) U.go('/s/queue');
  };

  U.acts.decideResubmit = function (node) {
    var id = node.getAttribute('data-id');
    var reason = document.getElementById('reason') ? document.getElementById('reason').value : 'Please resubmit clearer documents';
    var r = U.dispatch({ type: 'decideApplication', actorId: U.user().id, id: id, decision: 'resubmit', reason: reason });
    if (r.ok) U.go('/s/queue');
  };

  U.acts.decideReject = function (node) {
    var id = node.getAttribute('data-id');
    var reason = document.getElementById('reason') ? document.getElementById('reason').value : 'Rejected by compliance';
    var r = U.dispatch({ type: 'decideApplication', actorId: U.user().id, id: id, decision: 'reject', reason: reason });
    if (r.ok) U.go('/s/queue');
  };

  U.acts.approveListing = function (node, data) {
    var id = node.getAttribute('data-id');
    var r = U.dispatch({
      type: 'reviewListing',
      actorId: U.user().id,
      id: id,
      decision: 'approve',
      buyerShareholderId: data.buyerShareholderId || null,
      waiver: !!data.waiver
    });
    if (r.ok) U.go('/s/queue');
  };

  U.acts.rejectListing = function (node, data) {
    var id = node.getAttribute('data-id');
    var r = U.dispatch({
      type: 'reviewListing',
      actorId: U.user().id,
      id: id,
      decision: 'reject',
      reason: data.rejectReason || 'Does not meet margin or counterparty requirements'
    });
    if (r.ok) U.go('/s/queue');
  };

  U.acts.sendRevisedTerms = function (node, data) {
    var id = node.getAttribute('data-id');
    var target = U.centsOf(data.target) || 800000;
    var minInvest = U.centsOf(data.minInvest) || 50000;
    var r = U.dispatch({
      type: 'reviewListing',
      actorId: U.user().id,
      id: id,
      decision: 'revise',
      reason: data.reason || 'Adjusted terms per compliance assessment',
      listing: {
        target: target,
        cycle: Number(data.cycle || 60),
        companyPct: Number(data.companyPct || 20),
        investorSharePct: Number(data.investorSharePct || 60),
        minInvest: minInvest
      }
    });
    if (r.ok) U.go('/s/queue');
  };

  U.acts.fillOverdue = function (node) {
    var id = node.getAttribute('data-id');
    var r = U.dispatch({ type: 'fillOverdue', actorId: U.user().id, id: id });
    if (r.ok) U.go('/s/overdue');
  };

  U.acts.cancelOverdue = function (node) {
    var id = node.getAttribute('data-id');
    var r = U.dispatch({ type: 'cancelListing', actorId: U.user().id, listingId: id, reason: 'Funding deadline elapsed without reaching target' });
    if (r.ok) U.go('/s/overdue');
  };

  U.acts.verifyStep = function (node) {
    var lid = node.getAttribute('data-lid');
    var sid = node.getAttribute('data-sid');
    var stid = node.getAttribute('data-stid');
    var r = U.dispatch({ type: 'verifyStep', actorId: U.user().id, listingId: lid, shipmentId: sid, stepId: stid });
    if (r.ok) U.go('/s/ops/' + lid);
  };

  U.acts.blockStepSheet = function (node) {
    var lid = node.getAttribute('data-lid');
    var sid = node.getAttribute('data-sid');
    var stid = node.getAttribute('data-stid');
    U.openSheet('<h2>Block step</h2><p class="meta">Provide reason for blocking this operational step:</p>' +
      '<form><label class="field"><span>Reason</span><input id="blockReason" required placeholder="e.g. Customs inspection delay..."></label>' +
      '<p><button class="btn btn-danger" type="button" data-act="confirmBlockStep" data-lid="' + lid + '" data-sid="' + sid + '" data-stid="' + stid + '">Block step</button></p></form>');
  };

  U.acts.confirmBlockStep = function (node) {
    var lid = node.getAttribute('data-lid');
    var sid = node.getAttribute('data-sid');
    var stid = node.getAttribute('data-stid');
    var reason = document.getElementById('blockReason') ? document.getElementById('blockReason').value : 'Blocked by ops';
    U.closeSheet();
    var r = U.dispatch({ type: 'blockStep', actorId: U.user().id, listingId: lid, shipmentId: sid, stepId: stid, reason: reason });
    if (r.ok) U.go('/s/ops/' + lid);
  };

  U.acts.skipStepSheet = function (node) {
    var lid = node.getAttribute('data-lid');
    var sid = node.getAttribute('data-sid');
    var stid = node.getAttribute('data-stid');
    U.openSheet('<h2>Request step skip</h2><p class="meta">Skips require four-eyes approval:</p>' +
      '<form><label class="field"><span>Skip reason</span><input id="skipReason" required placeholder="e.g. Direct delivery without repackaging..."></label>' +
      '<p><button class="btn btn-primary" type="button" data-act="confirmSkipStep" data-lid="' + lid + '" data-sid="' + sid + '" data-stid="' + stid + '">Submit skip request</button></p></form>');
  };

  U.acts.confirmSkipStep = function (node) {
    var lid = node.getAttribute('data-lid');
    var sid = node.getAttribute('data-sid');
    var stid = node.getAttribute('data-stid');
    var reason = document.getElementById('skipReason') ? document.getElementById('skipReason').value : 'Step not applicable';
    U.closeSheet();
    var r = U.dispatch({ type: 'requestSkip', actorId: U.user().id, listingId: lid, shipmentId: sid, stepId: stid, reason: reason });
    if (r.ok) U.go('/s/ops/' + lid);
  };

  U.acts.payCostSheet = function (node) {
    var lid = node.getAttribute('data-lid');
    var sid = node.getAttribute('data-sid');
    var stid = node.getAttribute('data-stid');
    U.openSheet('<h2>Pay step cost</h2>' +
      '<form>' + U.dollarsField('Amount from escrow', 'costAmount') +
      U.field('Payment proof / invoice', 'proofDoc', 'supplier-invoice.pdf') +
      '<p><button class="btn btn-primary" type="button" data-act="confirmPayCost" data-lid="' + lid + '" data-sid="' + sid + '" data-stid="' + stid + '">Pay cost</button></p></form>');
  };

  U.acts.confirmPayCost = function (node, data) {
    var lid = node.getAttribute('data-lid');
    var sid = node.getAttribute('data-sid');
    var stid = node.getAttribute('data-stid');
    var amt = U.centsOf(data.costAmount) || 100000;
    U.closeSheet();
    var r = U.dispatch({ type: 'payCost', actorId: U.user().id, listingId: lid, shipmentId: sid, stepId: stid, amount: amt, proof: data.proofDoc || 'invoice.pdf' });
    if (r.ok) U.go('/s/ops/' + lid);
  };

  U.acts.proposeSettle = function (node) {
    var id = node.getAttribute('data-id');
    var r = U.dispatch({ type: 'proposeSettlement', actorId: U.user().id, listingId: id });
    if (r.ok) U.go('/s/approvals');
  };

  U.acts.decideApproveItem = function (node) {
    var id = node.getAttribute('data-id');
    var r = U.dispatch({ type: 'decideApproval', actorId: U.user().id, id: id, decision: 'approve' });
    if (r.ok) U.go('/s/approvals');
  };

  U.acts.sendBackSheet = function (node) {
    var id = node.getAttribute('data-id');
    U.openSheet('<h2>Send back approval</h2>' +
      '<form><label class="field"><span>Reason</span><input id="sendBackReason" required placeholder="Explain why sent back..."></label>' +
      '<p><button class="btn btn-danger" type="button" data-act="confirmSendBack" data-id="' + id + '">Send back</button></p></form>');
  };

  U.acts.confirmSendBack = function (node) {
    var id = node.getAttribute('data-id');
    var reason = document.getElementById('sendBackReason') ? document.getElementById('sendBackReason').value : 'Correction requested';
    U.closeSheet();
    var r = U.dispatch({ type: 'decideApproval', actorId: U.user().id, id: id, decision: 'send_back', reason: reason });
    if (r.ok) U.go('/s/approvals');
  };

  U.acts.recordProceedsSheet = function (node) {
    var id = node.getAttribute('data-id');
    var l = L(id);
    var sh = l && l.shipments && l.shipments[0];
    var sid = sh ? sh.id : '';
    U.openSheet('<h2>Record buyer sale proceeds</h2>' +
      '<form>' + U.dollarsField('Proceeds amount', 'proceedsAmount') +
      U.field('Buyer receipt / bank statement', 'proceedsDoc', 'bank-proceeds.pdf') +
      '<p><button class="btn btn-primary" type="button" data-act="confirmRecordProceeds" data-lid="' + id + '" data-sid="' + sid + '">Record proceeds</button></p></form>');
  };

  U.acts.confirmRecordProceeds = function (node, data) {
    var lid = node.getAttribute('data-lid');
    var sid = node.getAttribute('data-sid');
    var amt = U.centsOf(data.proceedsAmount) || 1000000;
    U.closeSheet();
    var r = U.dispatch({ type: 'recordProceeds', actorId: U.user().id, listingId: lid, shipmentId: sid, amount: amt, doc: data.proceedsDoc || 'receipt.pdf' });
    if (r.ok) U.go('/s/ops/' + lid);
  };

  U.acts.unplannedCostSheet = function (node) {
    var id = node.getAttribute('data-id');
    U.openSheet('<h2>Propose unplanned cost</h2>' +
      '<form>' + U.dollarsField('Amount', 'unplannedAmount') +
      U.field('Reason', 'unplannedReason', 'Port demurrage fees') +
      '<p><button class="btn btn-primary" type="button" data-act="confirmUnplannedCost" data-id="' + id + '">Submit for four-eyes approval</button></p></form>');
  };

  U.acts.confirmUnplannedCost = function (node, data) {
    var id = node.getAttribute('data-id');
    var amt = U.centsOf(data.unplannedAmount) || 50000;
    U.closeSheet();
    var r = U.dispatch({ type: 'proposeUnplanned', actorId: U.user().id, listingId: id, amount: amt, reason: data.unplannedReason || 'Unplanned fee' });
    if (r.ok) U.go('/s/approvals');
  };

  U.acts.overrunSheet = function (node) {
    var id = node.getAttribute('data-id');
    U.openSheet('<h2>Request overrun fill from Treasury</h2>' +
      '<form>' + U.dollarsField('Overrun amount', 'overrunAmount') +
      U.field('Reason', 'overrunReason', 'Freight rate increase across voyage') +
      '<p><button class="btn btn-primary" type="button" data-act="confirmOverrun" data-id="' + id + '">Submit for four-eyes approval</button></p></form>');
  };

  U.acts.confirmOverrun = function (node, data) {
    var id = node.getAttribute('data-id');
    var amt = U.centsOf(data.overrunAmount) || 100000;
    U.closeSheet();
    var r = U.dispatch({ type: 'proposeOverrun', actorId: U.user().id, listingId: id, amount: amt, reason: data.overrunReason || 'Cost overrun' });
    if (r.ok) U.go('/s/approvals');
  };

  U.acts.resaleSheet = function (node) {
    var id = node.getAttribute('data-id');
    var l = L(id);
    var sid = l && l.shipments && l.shipments[0] ? l.shipments[0].id : '';
    U.openSheet('<h2>Propose resale to new buyer</h2>' +
      '<form>' +
      '<label class="field"><span>New buyer country</span><select name="buyerCountry">' + U.countries(false) + '</select></label>' +
      U.dollarsField('Resale price', 'resalePrice') +
      '<label class="field"><span><input type="checkbox" name="resaleShareholder"> Resale to a Shareholder (requires Owner approval)</span></label>' +
      U.field('Market valuation note', 'marketNote', 'Verified market resale price') +
      '<p><button class="btn btn-primary" type="button" data-act="confirmResale" data-lid="' + id + '" data-sid="' + sid + '">Submit resale</button></p></form>');
  };

  U.acts.confirmResale = function (node, data) {
    var lid = node.getAttribute('data-lid');
    var sid = node.getAttribute('data-sid');
    var price = U.centsOf(data.resalePrice) || 800000;
    U.closeSheet();
    var r = U.dispatch({
      type: 'proposeResale',
      actorId: U.user().id,
      listingId: lid,
      shipmentId: sid,
      buyer: data.buyerCountry || 'AE',
      price: price,
      shareholder: !!data.resaleShareholder,
      marketNote: data.marketNote || 'Market verified'
    });
    if (r.ok) U.go('/s/approvals');
  };

  U.acts.cancelListingSheet = function (node) {
    var id = node.getAttribute('data-id');
    U.openSheet('<h2>Cancel listing &amp; refund investors</h2>' +
      '<form><label class="field"><span>Reason for cancellation</span><input id="cancelReason" required placeholder="e.g. Sourcing failed before purchase..."></label>' +
      '<p><button class="btn btn-danger" type="button" data-act="confirmCancelListing" data-id="' + id + '">Cancel and refund</button></p></form>');
  };

  U.acts.confirmCancelListing = function (node) {
    var id = node.getAttribute('data-id');
    var reason = document.getElementById('cancelReason') ? document.getElementById('cancelReason').value : 'Cancelled';
    U.closeSheet();
    var r = U.dispatch({ type: 'cancelListing', actorId: U.user().id, listingId: id, reason: reason });
    if (r.ok) U.go('/s/listings');
  };

  U.acts.payWithdrawalSheet = function (node) {
    var id = node.getAttribute('data-id');
    U.openSheet('<h2>Confirm bank wire payout</h2>' +
      '<form>' + U.field('Bank wire reference', 'bankRef', 'WIRE-TX-9901') +
      '<p><button class="btn btn-primary" type="button" data-act="confirmPayWithdrawal" data-id="' + id + '">Execute bank wire</button></p></form>');
  };

  U.acts.confirmPayWithdrawal = function (node, data) {
    var id = node.getAttribute('data-id');
    var ref = data.bankRef || 'WIRE-REF';
    U.closeSheet();
    var r = U.dispatch({ type: 'decideWithdrawal', actorId: U.user().id, id: id, decision: 'paid', ref: ref });
    if (r.ok) U.go('/s/money');
  };

  U.acts.declineWithdrawalSheet = function (node) {
    var id = node.getAttribute('data-id');
    U.openSheet('<h2>Decline withdrawal request</h2>' +
      '<form><label class="field"><span>Reason for decline</span><input id="decReason" required placeholder="e.g. Mismatched account name..."></label>' +
      '<p><button class="btn btn-danger" type="button" data-act="confirmDeclineWithdrawal" data-id="' + id + '">Decline withdrawal</button></p></form>');
  };

  U.acts.confirmDeclineWithdrawal = function (node) {
    var id = node.getAttribute('data-id');
    var reason = document.getElementById('decReason') ? document.getElementById('decReason').value : 'Declined by compliance';
    U.closeSheet();
    var r = U.dispatch({ type: 'decideWithdrawal', actorId: U.user().id, id: id, decision: 'declined', reason: reason });
    if (r.ok) U.go('/s/money');
  };

  U.acts.treasuryTopup = function (node, data) {
    var amt = U.centsOf(data.treasuryAmount) || 5000000;
    var r = U.dispatch({ type: 'treasuryTopup', actorId: U.user().id, amount: amt, ref: data.treasuryRef || 'BANK-TOPUP' });
    if (r.ok) U.go('/s/money');
  };

  U.acts.reserveOut = function (node, data) {
    var amt = U.centsOf(data.reserveAmount) || 100000;
    var r = U.dispatch({ type: 'reserveOut', actorId: U.user().id, amount: amt, reason: data.reserveReason || 'Reserve deployment' });
    if (r.ok) U.go('/s/money');
  };

  U.acts.addStaffMember = function (node, data) {
    var r = U.dispatch({
      type: 'addStaff',
      actorId: U.user().id,
      name: data.staffName,
      email: data.staffEmail,
      password: data.staffPassword || 'shehnat-demo-1',
      staffRole: data.staffRole || 'ops'
    });
    if (r.ok) U.go('/s/team');
  };

  U.acts.deactivateStaff = function (node) {
    var id = node.getAttribute('data-id');
    var r = U.dispatch({ type: 'deactivate', actorId: U.user().id, userId: id });
    if (r.ok) U.go('/s/team');
  };

  U.acts.toggleShareholder = function (node) {
    var id = node.getAttribute('data-id');
    var on = node.getAttribute('data-on') === '1';
    var r = U.dispatch({ type: 'markShareholder', actorId: U.user().id, userId: id, on: on });
    if (r.ok) U.go('/s/shareholders');
  };

  U.acts.suspendSheet = function (node) {
    var id = node.getAttribute('data-id');
    U.openSheet('<h2>Suspend user account</h2>' +
      '<form><label class="field"><span>Reason for suspension</span><input id="suspReason" required placeholder="e.g. Compliance review..."></label>' +
      '<p><button class="btn btn-danger" type="button" data-act="confirmSuspend" data-id="' + id + '" data-on="1">Suspend account</button></p></form>');
  };

  U.acts.confirmSuspend = function (node) {
    var id = node.getAttribute('data-id');
    var on = node.getAttribute('data-on') === '1';
    var reason = document.getElementById('suspReason') ? document.getElementById('suspReason').value : 'Suspension';
    U.closeSheet();
    var r = U.dispatch({ type: 'suspendUser', actorId: U.user().id, userId: id, on: on, reason: reason });
    if (r.ok) U.go('/s/users');
  };

  U.acts.suspendToggle = function (node) {
    var id = node.getAttribute('data-id');
    var on = node.getAttribute('data-on') === '1';
    var r = U.dispatch({ type: 'suspendUser', actorId: U.user().id, userId: id, on: on, reason: 'Unsuspended' });
    if (r.ok) U.go('/s/users');
  };

  U.acts.setExposureLimit = function (node, data) {
    var id = node.getAttribute('data-id');
    var amt = U.centsOf(data.exposureLimit) || 10000000;
    var r = U.dispatch({ type: 'setExposure', actorId: U.user().id, userId: id, amount: amt });
    if (r.ok) U.go('/s/users');
  };

  U.acts.saveSettings = function (node, data) {
    var exp = U.centsOf(data.exposureDefault) || 5000000;
    var blocked = (data.blocked || '').split(',').map(function (c) { return c.trim().toUpperCase(); }).filter(Boolean);
    var r = U.dispatch({
      type: 'updateSettings',
      actorId: U.user().id,
      settings: {
        overdueDays: Number(data.overdueDays || 5),
        autoWithdrawDays: Number(data.autoWithdrawDays || 14),
        waiverPct: Number(data.waiverPct || 20),
        shareholderPct: Number(data.shareholderPct || 75),
        exposureDefault: exp,
        blocked: blocked
      }
    });
    if (r.ok) U.go('/s/settings');
  };

})();
