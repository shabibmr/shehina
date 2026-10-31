/* PROTOTYPE, throwaway. Manager screens M1–M13. */
(function () {
  'use strict';
  var U = Ui;

  function L(id) {
    var l = U.byId(id);
    if (!l || !Logic.canView(Store.state, U.user(), l)) return null;
    Logic.derive(Store.state, l);
    return l;
  }

  function myListings(u) {
    return Store.state.listings.filter(function (l) {
      return l.managerId === u.id;
    });
  }

  // M1: Manager registration wizard
  U.add({
    id: 'M1', section: 'you', auth: true, roles: ['manager'],
    match: function (p) { return p === '/m/register' ? {} : null; },
    render: function () {
      var u = U.user();
      if (u.kyc === 'approved') {
        return U.success('Registration approved') + '<p><button class="btn btn-primary" data-go="/m/home" type="button">Go to manager home</button></p>';
      }
      return '<p class="meta">Step 1 of 1</p><div class="stepper" aria-hidden="true"><i class="on"></i></div>' +
        '<h1>Manager registration</h1>' +
        '<form>' +
        '<label class="field"><span>Registration type</span>' +
        '<select name="managerType"><option value="business">Business / Company</option><option value="individual">Individual trader</option></select></label>' +
        '<label class="field"><span>Country of registration</span>' +
        '<select name="country">' + U.countries(false) + '</select></label>' +
        U.blockedNote() +
        U.field('Phone number', 'phone', u.phone || '+971') +
        '<p class="meta">Upload 3 verification documents (business license or ID, proof of address, trade history):</p>' +
        '<label class="field"><span>Document 1 (License / ID)</span><input name="doc1" type="file"></label>' +
        '<label class="field"><span>Document 2 (Proof of address)</span><input name="doc2" type="file"></label>' +
        '<label class="field"><span>Document 3 (Trade history)</span><input name="doc3" type="file"></label>' +
        '<label class="field"><span><input type="checkbox" name="declare"> I declare that all business documents and trade history submitted are genuine and accurate.</span></label>' +
        '<button class="btn btn-primary" type="button" data-act="managerRegister">Submit registration</button>' +
        '</form>';
    }
  });

  // M2: Registration status & history
  U.add({
    id: 'M2', section: 'you', auth: true, roles: ['manager'],
    match: function (p) { return p === '/m/status' ? {} : null; },
    render: function () {
      var u = U.user();
      var head = '';
      if (u.kyc === 'approved') {
        head = U.success('Manager registration approved') + '<p><button class="btn btn-primary" data-go="/m/home" type="button">Go to dashboard</button></p>';
      } else if (u.kyc === 'rejected') {
        head = U.banner('loss', 'Registration rejected', u.kycReason || 'Requirements not met') +
          '<p><button class="btn btn-primary" data-go="/m/register" type="button">Fix and resubmit</button></p>';
      } else if (u.kyc === 'pending') {
        head = U.banner('info', 'Registration in review', 'A compliance reviewer will evaluate your company documents.');
      } else {
        head = U.empty('You have not submitted company documents yet.', 'Start registration', '/m/register');
      }
      var apps = Store.state.applications.filter(function (a) { return a.userId === u.id; });
      var list = apps.map(function (a) {
        return '<li><span class="num">' + new Date((a.history && a.history[0] ? a.history[0].at : Store.state.clock)).toISOString().slice(0, 10) +
          '</span> · ' + U.esc(a.status) + (a.reason ? ' · ' + U.esc(a.reason) : '') + '</li>';
      }).join('');
      return '<h1>Registration status</h1>' + head + '<h2>Application history</h2><ul class="timeline">' + (list || '<li>No submissions recorded yet.</li>') + '</ul>';
    }
  });

  // M3: Manager Overview (Home)
  U.add({
    id: 'M3', section: 'home', auth: true, roles: ['manager'],
    match: function (p) { return p === '/m/home' ? {} : null; },
    render: function () {
      var u = U.user();
      var gate = '';
      if (u.kyc === 'none') {
        return U.banner('info', 'Registration needed', 'Submit your company details before managing shipments.') +
          '<p><button class="btn btn-primary" data-go="/m/register" type="button">Start registration</button></p>';
      } else if (u.kyc === 'pending') {
        return U.banner('info', 'Registration in review', 'You can draft listings, but cannot launch shipments until approved.');
      } else if (u.kyc === 'rejected') {
        return U.banner('warning', 'Registration was rejected', u.kycReason) +
          '<p><button class="btn btn-primary" data-go="/m/register" type="button">Fix and resubmit</button></p>';
      } else if (u.suspended) {
        gate = U.banner('warning', 'Account suspended', 'Operations and payouts are temporarily paused.');
      }

      var listings = myListings(u);
      var used = Logic.exposureUsed(Store.state, u.id);
      var limit = Logic.exposureLimit(Store.state, u.id);
      var remaining = Math.max(0, limit - used);

      // Actions due
      var actionsDue = [];
      listings.forEach(function (l) {
        if (l.status === 'approved' && !l.depositWaiver) {
          actionsDue.push(U.row('Pay deposit', l.name + ' · Approved, deposit required', '<span class="word-warning">Deposit due</span>', '/m/deposit/' + l.id));
        } else if (l.status === 'awaiting_terms') {
          actionsDue.push(U.row('Review terms', l.name + ' · Reviewer sent revised terms', '<span class="word-warning">Action needed</span>', '/m/terms/' + l.id));
        }
        if (l.status === 'live') {
          (l.shipments || []).forEach(function (sh) {
            (sh.steps || []).forEach(function (st) {
              if (st.owner === 'manager' && (st.status === 'todo' || st.status === 'in_progress')) {
                actionsDue.push(U.row(st.name, l.name + ' · ' + sh.label, '<span class="word">Step due</span>', '/m/step/' + l.id + '/' + sh.id + '/' + st.id));
              }
            });
          });
        }
      });

      var activeListings = listings.filter(function (l) { return l.status === 'live' || l.status === 'approved' || l.status === 'in_review'; });

      return gate + '<h1>Manager overview</h1>' +
        '<section class="panel">' +
        '<p class="kpi">Exposure limit &amp; active capital</p>' +
        '<p class="figure num">' + U.esc(U.usd(used)) + ' <span class="meta">/ ' + U.esc(U.usd(limit)) + '</span></p>' +
        '<p class="meta"><span class="num">' + U.esc(U.usd(remaining)) + '</span> remaining headroom</p>' +
        '</section>' +
        '<h2>Actions due</h2>' +
        (actionsDue.length ? actionsDue.join('') : '<p class="meta">No immediate actions due.</p>') +
        '<h2>Active shipments</h2>' +
        (activeListings.length ? activeListings.map(function (l) { return U.listingRow(l, '/m/listing/' + l.id); }).join('') : U.empty('No active shipments right now.', 'Create new listing', '/m/new'));
    }
  });

  // M4: My Listings
  U.add({
    id: 'M4', section: 'listings', auth: true, roles: ['manager'],
    match: function (p) { return p === '/m/listings' ? {} : null; },
    render: function () {
      var u = U.user();
      var listings = myListings(u);
      var rows = listings.length ? listings.map(function (l) {
        return U.listingRow(l, '/m/listing/' + l.id);
      }).join('') : U.empty('No listings created yet.', 'Create first listing', '/m/new');

      return '<h1>My listings</h1>' +
        '<p><button class="btn btn-primary" data-go="/m/new" type="button">Create new listing</button></p>' +
        rows;
    }
  });

  // M5: New listing wizard
  U.add({
    id: 'M5', section: 'listings', auth: true, roles: ['manager'],
    match: function (p) { return p === '/m/new' ? {} : null; },
    render: function () {
      var u = U.user();
      var catOpts = Logic.CATEGORIES.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
      var used = Logic.exposureUsed(Store.state, u.id);
      var limit = Logic.exposureLimit(Store.state, u.id);
      var rem = Math.max(0, limit - used);

      return '<h1>New listing</h1>' +
        '<p class="meta">Exposure headroom: <span class="num">' + U.esc(U.usd(rem)) + '</span></p>' +
        '<form>' +
        U.field('Cargo / Listing name', 'name', 'Colombian Arabica Coffee') +
        '<label class="field"><span>Category</span><select name="category">' + catOpts + '</select></label>' +
        '<label class="field"><span>Source country</span><select name="source">' + U.countries(false) + '</select></label>' +
        '<label class="field"><span>Buyer country</span><select name="buyer">' + U.countries(false) + '</select></label>' +
        U.field('Quality certificate / standard', 'certificate', 'Specialty Coffee Association Grade 1') +
        '<label class="field"><span>Number of shipments</span><select name="shipments"><option value="1">1 shipment</option><option value="2">2 shipments</option><option value="3">3 shipments</option></select></label>' +
        U.dollarsField('Shipment 1: Expected cargo purchase cost', 'cost0') +
        U.dollarsField('Shipment 1: Expected gross sale price', 'sale0') +
        '<label class="field"><span>Manager capital contribution (%)</span><input name="companyPct" type="number" min="20" max="90" value="20"></label>' +
        '<label class="field"><span>Investor profit share (%)</span><input name="investorSharePct" type="number" min="40" max="95" value="60"></label>' +
        U.dollarsField('Minimum investor ticket', 'minInvest') +
        '<p><button class="btn btn-primary" type="button" data-act="submitListingNew">Submit for review</button> ' +
        '<button class="btn btn-secondary" type="button" data-act="saveListingDraft">Save draft</button></p>' +
        '</form>';
    }
  });

  // M8: Listing Detail (Manager view)
  U.add({
    id: 'M8', section: 'listings', auth: true, roles: ['manager', 'staff'],
    match: function (p) { var m = /^\/m\/listing\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) {
      var l = L(params.id);
      if (!l) return U.empty('Listing not found.', 'Back to listings', '/m/listings');
      var u = U.user();
      var tabName = (Store.proto.tab && Store.proto.tab[l.id]) || 'overview';
      var tabs = ['overview', 'shipments', 'financials', 'timeline'].map(function (t) {
        return '<button type="button" data-act="tab" data-id="' + l.id + '" data-tab="' + t + '" aria-selected="' + (tabName === t ? 'true' : 'false') + '">' + t + '</button>';
      }).join('');

      var bannerHtml = '';
      if (l.status === 'approved' && !l.depositWaiver) {
        bannerHtml = U.banner('warning', 'Listing approved · Deposit pending', 'You must pay your 20% manager deposit to take this shipment live.') +
          '<p><button class="btn btn-primary" data-go="/m/deposit/' + l.id + '" type="button">Pay deposit (' + U.esc(U.usd(Math.round(l.target * (l.companyPct || 20) / 100))) + ')</button> <button class="btn btn-danger" type="button" data-act="withdrawListing" data-id="' + l.id + '">Withdraw listing</button></p>';
      } else if (l.status === 'awaiting_terms') {
        bannerHtml = U.banner('warning', 'Revised terms proposed', 'The reviewer has requested changes before approval.') +
          '<p><button class="btn btn-primary" data-go="/m/terms/' + l.id + '" type="button">View revised terms</button> <button class="btn btn-danger" type="button" data-act="withdrawListing" data-id="' + l.id + '">Withdraw listing</button></p>';
      } else if (l.status === 'draft' || l.status === 'in_review' || l.status === 'rejected') {
        var withdraw = ' <button class="btn btn-danger" type="button" data-act="withdrawListing" data-id="' + l.id + '">Withdraw listing</button>';
        if (l.status === 'draft') bannerHtml = '<p><button class="btn btn-primary" type="button" data-act="submitDraft" data-id="' + l.id + '">Submit for review</button> <button class="btn btn-danger" type="button" data-act="deleteDraft" data-id="' + l.id + '">Delete draft</button>' + withdraw + '</p>';
        else if (l.status === 'in_review') bannerHtml = U.banner('info', 'In review', 'Staff compliance reviewer is checking market pricing and terms.') + '<p>' + withdraw + '</p>';
        else bannerHtml = '<p>' + withdraw + '</p>';
      } else if (l.status === 'live') {
        bannerHtml = '<p><button class="btn btn-secondary" data-go="/m/change/' + l.id + '" type="button">Propose plan change</button></p>';
      }

      var body = '';
      if (tabName === 'shipments') {
        body = (l.shipments || []).map(function (sh) {
          return '<h2>' + U.esc(sh.label) + '</h2>' +
            '<p class="meta">' + U.esc(Logic.STAGES[sh.stage] || 'Stage 0') + (sh.late ? ' · <span class="word-warning">Late</span>' : '') + '</p>' +
            '<ul>' + (sh.steps || []).map(function (st) {
              var stepLink = (st.owner === 'manager') ? ' <a href="#/m/step/' + l.id + '/' + sh.id + '/' + st.id + '">Update step</a>' : '';
              return '<li><b>' + U.esc(st.name) + '</b> · ' + U.esc(st.status) + ' (' + U.esc(st.owner) + ')' + stepLink + '</li>';
            }).join('') + '</ul>';
        }).join('');
      } else if (tabName === 'financials') {
        var proj = Logic.projection({ target: l.target, expectedProfit: l.expectedProfit, investorSharePct: l.investorSharePct, cycleDays: l.cycle || 60, feeBps: Store.state.settings.feeBps });
        body = '<table class="statement">' +
          '<tr><td>Funding target</td><td class="num">' + U.esc(U.usd(l.target)) + '</td></tr>' +
          '<tr><td>Raised from investors</td><td class="num">' + U.esc(U.usd(l.raised)) + '</td></tr>' +
          '<tr><td>Manager capital (' + l.companyPct + '%)</td><td class="num">' + U.esc(U.usd(Math.round(l.target * l.companyPct / 100))) + '</td></tr>' +
          '<tr><td>Deposit status</td><td>' + ((l.contributions || []).some(function (c) { return c.kind === 'manager'; }) ? 'Paid' : (l.depositWaiver ? 'Waived (Shareholder link)' : 'Pending')) + '</td></tr>' +
          '<tr><td>Expected gross sale</td><td class="num">' + U.esc(U.usd((l.shipments || []).reduce(function (a, s) { return a + (s.expectedSale || 0); }, 0))) + '</td></tr>' +
          '<tr><td>Expected profit</td><td>' + U.money(l.expectedProfit, 'expected') + '</td></tr>' +
          '<tr><td>Manager profit share</td><td>' + U.money(proj.manager, 'expected') + '</td></tr>' +
          '<tr><td>Investor pool share</td><td>' + U.money(proj.pool, 'expected') + '</td></tr>' +
          '</table>';
      } else if (tabName === 'timeline') {
        body = '<ul class="timeline">' + (l.history || []).map(function (h) {
          return '<li><span class="num">' + new Date(h.at).toISOString().slice(0, 10) + '</span> · ' + U.esc(h.action) + (h.reason ? ' (' + U.esc(h.reason) + ')' : '') + '</li>';
        }).join('') + '</ul>';
      } else {
        body = '<p class="meta">' + U.esc(Logic.COUNTRY[l.source] || l.source) + ' → ' + U.esc(Logic.COUNTRY[l.buyer] || l.buyer) + ' · ' + U.esc(l.category) + '</p>' +
          U.funding(l) +
          '<p>Status: ' + U.statusWord(l) + '</p>' +
          (l.depositWaiver ? '<p class="meta">✓ Manager deposit waived (linked to Shareholder buyer)</p>' : '') +
          (l.shareholderListing ? '<p class="meta">✓ Shareholder listing</p>' : '');
      }

      return '<div class="lead"><h1>' + U.esc(l.name) + '</h1></div>' +
        bannerHtml +
        '<div class="tabs">' + tabs + '</div>' +
        body;
    }
  });

  // M9: Revised terms diff viewer
  U.add({
    id: 'M9', section: 'listings', auth: true, roles: ['manager'],
    match: function (p) { var m = /^\/m\/terms\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) {
      var l = L(params.id);
      if (!l || !l.pendingTerms) return U.empty('No revised terms waiting for this listing.', 'Back to listing', '/m/listing/' + params.id);
      var pt = l.pendingTerms.listing;
      var reason = l.pendingTerms.reason || '';

      var diffs = [];
      var total = function (shipments, key) {
        return shipments.reduce(function (sum, sh) { return sum + Number(sh[key]); }, 0);
      };
      var stepCosts = function (shipments) {
        return shipments.reduce(function (sum, sh) {
          return sum + sh.steps.reduce(function (a, st) { return a + st.cost; }, 0);
        }, 0);
      };
      var newTarget = total(pt.shipments, 'expectedCost') + stepCosts(pt.shipments);
      var oldTarget = total(l.shipments, 'expectedCost') + stepCosts(l.shipments);
      if (newTarget !== oldTarget) diffs.push(['Funding target (calculated)', U.usd(oldTarget), U.usd(newTarget)]);
      var newSale = total(pt.shipments, 'expectedSale'), oldSale = total(l.shipments, 'expectedSale');
      if (newSale !== oldSale) diffs.push(['Expected sale price', U.usd(oldSale), U.usd(newSale)]);
      if (pt.companyPct !== l.companyPct) diffs.push(['Manager capital', l.companyPct + '%', pt.companyPct + '%']);
      if (pt.investorSharePct !== l.investorSharePct) diffs.push(['Investor profit share', l.investorSharePct + '%', pt.investorSharePct + '%']);
      if (pt.minInvest !== l.minInvest) diffs.push(['Minimum ticket', U.usd(l.minInvest), U.usd(pt.minInvest)]);

      var diffRows = diffs.map(function (d) {
        return '<div class="diff"><span>' + U.esc(d[0]) + '</span><s>' + U.esc(d[1]) + '</s><span class="next">' + U.esc(d[2]) + '</span></div>';
      }).join('');

      return '<h1>Revised terms proposed</h1>' +
        U.banner('info', 'Reviewer change note', reason) +
        '<div class="panel"><h2>Proposed changes</h2>' + (diffRows || '<p class="meta">Step plan or route timing adjusted.</p>') + '</div>' +
        '<p><button class="btn btn-primary" type="button" data-act="acceptTerms" data-id="' + l.id + '">Accept revised terms</button> ' +
        '<button class="btn btn-danger" type="button" data-act="declineTerms" data-id="' + l.id + '">Decline, back to edit</button></p>';
    }
  });

  // M10: Pay Deposit task screen
  U.add({
    id: 'M10', section: 'listings', task: true, auth: true, roles: ['manager'],
    match: function (p) { var m = /^\/m\/deposit\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    action: function (params) {
      return '<button class="btn btn-primary" type="button" data-act="payDeposit" data-id="' + U.esc(params.id) + '">Pay deposit and launch</button>';
    },
    render: function (params) {
      var l = L(params.id);
      if (!l) return U.empty('Listing not found.', 'Listings', '/m/listings');
      var u = U.user();
      var depositAmt = Math.round(l.target * (l.companyPct || 20) / 100);
      var bal = Logic.balance(Store.state, Logic.walletOf(u.id));
      var canPay = bal >= depositAmt;

      return '<h1>Pay deposit</h1>' +
        '<p class="meta">Listing: ' + U.esc(l.name) + '</p>' +
        '<section class="panel">' +
        '<p class="kpi">Required manager deposit (' + (l.companyPct || 20) + '%)</p>' +
        '<p class="figure num">' + U.esc(U.usd(depositAmt)) + '</p>' +
        '<p class="meta">Available wallet balance: <span class="num">' + U.esc(U.usd(bal)) + '</span></p>' +
        '</section>' +
        (!canPay ? U.banner('warning', 'Insufficient funds in wallet', 'You need ' + U.esc(U.usd(depositAmt - bal)) + ' more.') + '<p><button class="btn btn-secondary" data-go="/i/topup" type="button">Top up wallet</button></p>' : '<p>Once paid, your deposit is held in escrow and the listing goes live immediately.</p>');
    }
  });

  // M11: Step completion & document upload
  U.add({
    id: 'M11', section: 'listings', auth: true, roles: ['manager'],
    match: function (p) { var m = /^\/m\/step\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(p); return m ? { listingId: m[1], shipmentId: m[2], stepId: m[3] } : null; },
    render: function (params) {
      var l = L(params.listingId);
      if (!l) return U.empty('Listing not found.', 'Listings', '/m/listings');
      var sh = (l.shipments || []).filter(function (s) { return s.id === params.shipmentId; })[0];
      var st = sh && (sh.steps || []).filter(function (s) { return s.id === params.stepId; })[0];
      if (!st) return U.empty('Step not found.', 'Listing', '/m/listing/' + l.id);

      var docsList = (st.docs || []).map(function (d) {
        return '<li>' + U.esc(d.name) + ' (' + U.esc(d.type || 'file') + ')</li>';
      }).join('');

      return '<h1>' + U.esc(st.name) + '</h1>' +
        '<p class="meta">' + U.esc(l.name) + ' · ' + U.esc(sh.label) + '</p>' +
        '<p>Status: <span class="word">' + U.esc(st.status) + '</span> · Assigned to: <b>' + U.esc(st.owner) + '</b></p>' +
        '<h2>Attached documents</h2>' +
        (docsList ? '<ul>' + docsList + '</ul>' : '<p class="meta">No documents uploaded yet.</p>') +
        '<form>' +
        '<label class="field"><span>Upload proof document</span><input name="stepFile" type="file"></label>' +
        '<button class="btn btn-secondary" type="button" data-act="uploadStepDoc" data-lid="' + l.id + '" data-sid="' + sh.id + '" data-stid="' + st.id + '">Upload file</button>' +
        '</form>' +
        '<p style="margin-block-start:var(--space-4)"><button class="btn btn-primary" type="button" data-act="markStepDone" data-lid="' + l.id + '" data-sid="' + sh.id + '" data-stid="' + st.id + '">Mark step as done</button></p>';
    }
  });

  // The Steps of the first Shipment that have not started; every Shipment shares the same plan.
  function planSteps(l) {
    var first = (l.shipments || [])[0];
    if (!first) return [];
    return first.steps.map(function (st, i) { return { index: i, name: st.name, owner: st.owner, days: st.days, cost: st.cost || 0, tag: st.tag || 0, status: st.status }; })
      .filter(function (st) { return st.status === 'todo'; });
  }

  var NEW_STEP_ROWS = 2;

  function stepFields(key, st, isNew) {
    var tagOpts = '<option value="0"' + (!st.tag ? ' selected' : '') + '>No Stage tag</option>' + [1, 2, 3, 4, 5].map(function (n) {
      return '<option value="' + n + '"' + (st.tag === n ? ' selected' : '') + '>Completes: ' + U.esc(Logic.STAGES[n]) + '</option>';
    }).join('');
    var ownerOpts = ['manager', 'staff'].map(function (o) {
      return '<option value="' + o + '"' + (st.owner === o ? ' selected' : '') + '>' + (o === 'manager' ? 'Manager' : 'Shehnat staff') + '</option>';
    }).join('');
    return '<div class="card">' +
      (isNew ? U.field('New Step name (leave empty to skip)', 'name' + key, '') : '<b>' + U.esc(st.name) + '</b>') +
      '<label class="field"><span>Order</span><input name="ord' + key + '" type="number" min="1" value="' + (st.order || '') + '"></label>' +
      '<label class="field"><span>Owner</span><select name="own' + key + '">' + ownerOpts + '</select></label>' +
      '<label class="field"><span>Planned duration (days)</span><input name="days' + key + '" type="number" min="1" max="365" value="' + (st.days || '') + '"></label>' +
      '<label class="field"><span>Stage tag</span><select name="tag' + key + '">' + tagOpts + '</select></label>' +
      U.dollarsField('Planned Step cost', 'cost' + key, st.cost == null ? 0 : st.cost) +
      (isNew ? '' : '<label class="field"><span><input type="checkbox" name="rm' + key + '"> Remove this Step</span></label>') +
      '</div>';
  }

  // M12: Propose plan change
  U.add({
    id: 'M12', section: 'listings', auth: true, roles: ['manager'],
    match: function (p) { var m = /^\/m\/change\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) {
      var l = L(params.id);
      if (!l) return U.empty('Listing not found.', 'Listings', '/m/listings');
      var existing = planSteps(l).map(function (st, pos) {
        st.order = pos + 1;
        return stepFields('e' + st.index, st, false);
      }).join('');
      var added = '';
      for (var k = 0; k < NEW_STEP_ROWS; k++) added += stepFields('n' + k, { owner: 'manager', days: '', cost: 0, tag: 0 }, true);
      return '<h1>Propose plan change</h1>' +
        '<p class="meta">' + U.esc(l.name) + '</p>' +
        '<p class="meta">A reviewer approves the change, and a cost change also needs the owner. The cycle is calculated from the Step durations. Steps already started cannot change. Every Stage from Goods purchased to Goods sold must keep at least one tagged Step.</p>' +
        '<form>' +
        '<label class="field"><span>Reason for change</span><textarea name="reason" rows="3" placeholder="Explain schedule or logistical changes..."></textarea></label>' +
        existing + added +
        '<button class="btn btn-primary" type="button" data-act="submitPlanChange" data-id="' + l.id + '">Submit change request</button>' +
        '</form>';
    }
  });

  // Manager action handlers
  U.acts.managerRegister = function (node, data) {
    var docs = [data.doc1, data.doc2, data.doc3].filter(Boolean);
    if (!docs.length) {
      docs = [{ name: 'company-license.pdf' }, { name: 'address-proof.pdf' }, { name: 'trade-records.pdf' }];
    }
    var r = U.dispatch({
      type: 'registerSubmit',
      actorId: U.user().id,
      managerType: data.managerType || 'business',
      country: data.country,
      phone: data.phone,
      declare: !!data.declare,
      docs: docs
    });
    if (r.ok) U.go('/m/status'); else U.go('/m/register');
  };

  function listingSpec(data) {
    var cost0 = U.centsOf(data.cost0);
    var sale0 = U.centsOf(data.sale0);
    var minInvest = U.centsOf(data.minInvest);
    if (cost0 == null || sale0 == null || minInvest == null) return null;
    var count = Math.min(3, Math.max(1, Number(data.shipments) || 1));
    var shipments = [];
    for (var i = 0; i < count; i++) {
      shipments.push({ label: 'Shipment ' + (i + 1), expectedCost: cost0, expectedSale: sale0, plannedStart: 0, steps: Logic.template() });
    }
    return {
      name: data.name,
      category: data.category,
      source: data.source,
      buyer: data.buyer,
      certificate: data.certificate,
      companyPct: Number(data.companyPct || 20),
      investorSharePct: Number(data.investorSharePct || 60),
      minInvest: minInvest,
      shipments: shipments
    };
  }

  U.acts.submitListingNew = function (node, data) {
    var spec = listingSpec(data);
    if (!spec) { Store.proto.error = 'Error: Enter the cost, the sale price, and the minimum investment, with at most 2 decimals'; U.go('/m/new'); return; }
    var r = U.dispatch({ type: 'saveListing', actorId: U.user().id, strict: true, listing: spec });
    if (!r.ok) { U.go('/m/new'); return; }
    var sub = U.dispatch({ type: 'submitListing', actorId: U.user().id, id: r.id });
    if (sub.ok) U.go('/m/listing/' + r.id); else U.go('/m/new');
  };

  U.acts.saveListingDraft = function (node, data) {
    var spec = listingSpec(data);
    if (!spec) { Store.proto.error = 'Error: Enter the cost, the sale price, and the minimum investment, with at most 2 decimals'; U.go('/m/new'); return; }
    var r = U.dispatch({ type: 'saveListing', actorId: U.user().id, listing: spec });
    if (r.ok) U.go('/m/listings'); else U.go('/m/new');
  };

  U.acts.submitDraft = function (node) {
    var id = node.getAttribute('data-id');
    var r = U.dispatch({ type: 'submitListing', actorId: U.user().id, id: id });
    if (r.ok) U.go('/m/listing/' + id);
  };

  U.acts.deleteDraft = function (node) {
    var id = node.getAttribute('data-id');
    var r = U.dispatch({ type: 'deleteListing', actorId: U.user().id, id: id });
    if (r.ok) U.go('/m/listings');
  };

  U.acts.withdrawListing = function (node) {
    var id = node.getAttribute('data-id');
    var r = U.dispatch({ type: 'withdrawListing', actorId: U.user().id, id: id, reason: 'Withdrawn by manager' });
    if (r.ok) U.go('/m/listing/' + id);
  };

  U.acts.acceptTerms = function (node) {
    var id = node.getAttribute('data-id');
    var r = U.dispatch({ type: 'acceptTerms', actorId: U.user().id, id: id });
    if (r.ok) U.go('/m/listing/' + id);
  };

  U.acts.declineTerms = function (node) {
    var id = node.getAttribute('data-id');
    var r = U.dispatch({ type: 'declineTerms', actorId: U.user().id, id: id, reason: 'Manager declined revised terms' });
    if (r.ok) U.go('/m/listing/' + id);
  };

  U.acts.uploadStepDoc = function (node, data) {
    var lid = node.getAttribute('data-lid');
    var sid = node.getAttribute('data-sid');
    var stid = node.getAttribute('data-stid');
    var name = (data.stepFile && data.stepFile.name) || 'shipping-doc.pdf';
    U.dispatch({ type: 'stepDoc', actorId: U.user().id, listingId: lid, shipmentId: sid, stepId: stid, name: name });
    U.go('/m/step/' + lid + '/' + sid + '/' + stid);
  };

  U.acts.markStepDone = function (node) {
    var lid = node.getAttribute('data-lid');
    var sid = node.getAttribute('data-sid');
    var stid = node.getAttribute('data-stid');
    var r = U.dispatch({ type: 'stepSet', actorId: U.user().id, listingId: lid, shipmentId: sid, stepId: stid, status: 'done' });
    if (r.ok) U.go('/m/listing/' + lid);
  };

  U.acts.submitPlanChange = function (node, data) {
    var id = node.getAttribute('data-id');
    var l = L(id);
    if (!l) return;
    var back = '/m/change/' + id;
    function bad(msg) { Store.proto.error = 'Error: ' + msg; U.go(back); }
    function money(raw, label) {
      var s = String(raw == null ? '' : raw).trim();
      if (s === '') return 0;
      var n = U.centsOf(s);
      if (n == null) { bad(label + ' needs an amount with at most 2 decimals'); return null; }
      return n;
    }
    var rows = [];
    var keys = planSteps(l).map(function (st) { return { key: 'e' + st.index, base: l.shipments[0].steps[st.index], isNew: false }; });
    for (var k = 0; k < NEW_STEP_ROWS; k++) keys.push({ key: 'n' + k, base: null, isNew: true });
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i].key, base = keys[i].base;
      if (keys[i].isNew) {
        if (!String(data['name' + key] || '').trim()) continue;
      } else if (data['rm' + key]) continue;
      var name = keys[i].isNew ? String(data['name' + key]).trim() : base.name;
      var days = Number(data['days' + key]);
      if (!Number.isInteger(days) || days < 1 || days > 365) { bad(name + ' needs a whole number of days from 1 to 365'); return; }
      var cost = money(data['cost' + key], name + ' cost');
      if (cost == null) return;
      var order = Number(data['ord' + key]);
      rows.push({
        order: Number.isFinite(order) && order > 0 ? order : 100000 + i,
        pos: i,
        step: {
          name: name, owner: data['own' + key] === 'staff' ? 'staff' : 'manager', days: days, cost: cost,
          tag: Number(data['tag' + key]) || 0,
          needsVerify: base ? base.needsVerify : false, kind: base ? base.kind : ''
        }
      });
    }
    rows.sort(function (a, b) { return a.order - b.order || a.pos - b.pos; });
    var r = U.dispatch({ type: 'proposePlan', actorId: U.user().id, listingId: id, plan: { steps: rows.map(function (x) { return x.step; }) }, reason: data.reason || 'Logistics schedule adjustment' });
    if (r.ok) U.go('/m/listing/' + id);
  };

})();
