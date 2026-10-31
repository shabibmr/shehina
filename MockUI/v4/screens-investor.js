/* PROTOTYPE, throwaway. Investor screens I1–I14. */
(function () {
  var U = Ui;
  function L(id) { var l = U.byId(id); if (l) Logic.derive(Store.state, l); return l; }
  function live() { return Store.state.listings.filter(function (l) { Logic.derive(Store.state, l); return l.status === 'live'; }); }
  function mine(u) {
    return Store.state.listings.filter(function (l) {
      return (l.contributions || []).some(function (c) { return c.userId === u.id; });
    });
  }

  U.add({
    id: 'I1', section: 'home', auth: true, roles: ['investor'], match: function (p) { return p === '/i/home' ? {} : null; },
    render: function () {
      var u = U.user();
      var gate = '';
      if (u.kyc === 'none') gate = U.banner('info', 'Identity check needed', 'Finish it before you invest.') + '<p><button class="btn btn-primary" data-go="/i/kyc" type="button">Start identity check</button></p>';
      else if (u.kyc === 'pending') gate = U.banner('info', 'Identity check in review', 'You can look, not invest yet.');
      else if (u.kyc === 'rejected') gate = U.banner('warning', 'Identity check was rejected', u.kycReason) + '<p><button class="btn btn-primary" data-go="/i/kyc" type="button">Fix and resubmit</button></p>';
      else if (u.suspended) gate = U.banner('warning', 'Account suspended', 'Payouts stay held until this is cleared.');
      var rows = live();
      if (!rows.length) return gate + '<h1>Home</h1>' + U.empty('No shipment is open.', 'Explore', '/i/explore');
      var lead = rows[0], next = rows[1];
      return gate + '<div class="lead"><h1>' + U.esc(lead.name) + '</h1></div><p class="meta">' + U.esc((Logic.COUNTRY[lead.source] || '') + ' to ' + (Logic.COUNTRY[lead.buyer] || '')) + '</p><p>' + U.funding(lead) + '</p><p><button class="link" data-go="/i/listing/' + lead.id + '" type="button">View shipment</button></p>' +
        (next ? U.listingRow(next, '/i/listing/' + next.id) : '');
    }
  });
  U.add({
    id: 'I2', section: 'you', auth: true, roles: ['investor'], match: function (p) { return p === '/i/kyc' ? {} : null; },
    render: function () {
      return '<p class="meta">Step 1 of 1</p><div class="stepper" aria-hidden="true"><i class="on"></i></div><h1>Identity check</h1><form>' +
        U.field('Date of birth', 'dob', '', 'date') + U.field('Phone', 'phone', '+971') +
        '<label class="field"><span>Country of residence</span><select name="country">' + U.countries(false) + '</select></label>' + U.blockedNote() +
        '<label class="field"><span>Photo ID</span><input name="idDoc" type="file"></label><label class="field"><span>Proof of address</span><input name="addressDoc" type="file"></label>' +
        '<label class="field"><span><input type="checkbox" name="declare"> I confirm these details are true and I understand investments can lose value.</span></label>' +
        '<button class="btn btn-primary" type="button" data-act="kyc">Submit identity check</button></form>';
    }
  });
  U.add({
    id: 'I3', section: 'you', auth: true, roles: ['investor'], match: function (p) { return p === '/i/kyc-status' ? {} : null; },
    render: function () {
      var u = U.user();
      var head = u.kyc === 'approved' ? U.success('Identity check approved') : u.kyc === 'rejected' ? U.banner('loss', 'Identity check was rejected', u.kycReason) + '<p><button class="btn btn-primary" data-go="/i/kyc" type="button">Fix and resubmit</button></p>' : u.kyc === 'pending' ? U.banner('info', 'In review', 'A reviewer will decide this.') : U.empty('You have not started an identity check.', 'Start', '/i/kyc');
      var apps = Store.state.applications.filter(function (a) { return a.userId === u.id; });
      var list = apps.map(function (a) { return '<li><span class="num">' + new Date(a.history[0].at).toISOString().slice(0, 10) + '</span> · ' + U.esc(a.status) + (a.reason ? ' · ' + U.esc(a.reason) : '') + '</li>'; }).join('');
      return '<h1>Identity check</h1>' + head + '<h2>History</h2><ul class="timeline">' + (list || '<li>No attempts yet.</li>') + '</ul>';
    }
  });
  U.add({
    id: 'I4', section: 'shipments', auth: true, roles: ['investor'], match: function (p) { return p === '/i/explore' ? {} : null; },
    render: function () {
      var f = Store.proto.filters || {};
      var rows = live().filter(function (l) {
        if (f.category && l.category !== f.category) return false;
        if (f.source && l.source !== f.source) return false;
        if (f.buyer && l.buyer !== f.buyer) return false;
        if (f.share === 'yes' && !l.shareholderListing) return false;
        return true;
      });
      if (f.sort === 'funded') rows.sort(function (a, b) { return (b.raised / b.target) - (a.raised / a.target); });
      var opts = Logic.CATEGORIES.map(function (c) { return '<option' + (f.category === c ? ' selected' : '') + '>' + c + '</option>'; }).join('');
      var body = rows.length ? rows.map(function (l) {
        var left = l.target - l.raised;
        var almost = left > 0 && left < l.minInvest ? ' · <span class="word">Almost funded</span>' : '';
        return U.listingRow(l, '/i/listing/' + l.id).replace('</span></span>', almost + '</span></span>');
      }).join('') : '<div class="empty"><p>Nothing matches these filters.</p><button class="btn btn-primary" type="button" data-act="clearFilters">Clear filters</button></div>';
      return '<h1>Shipments</h1><form data-act="filters">' +
        '<label class="field"><span>Category</span><select name="category"><option value="">Any</option>' + opts + '</select></label>' +
        '<label class="field"><span>Sourced from</span><select name="source"><option value="">Any</option>' + U.countries(false) + '</select></label>' +
        '<label class="field"><span>Sold in</span><select name="buyer"><option value="">Any</option>' + U.countries(false) + '</select></label>' +
        '<label class="field"><span>Shareholder Listing</span><select name="share"><option value="">Any</option><option value="yes">Yes</option></select></label>' +
        '<label class="field"><span>Sort</span><select name="sort"><option value="">Newest</option><option value="funded">Most funded</option></select></label>' +
        '<button class="btn btn-secondary" type="button" data-act="filters">Apply filters</button></form>' + body;
    }
  });
  U.add({
    id: 'I5', section: 'shipments', auth: true, roles: ['investor', 'manager', 'staff'], match: function (p) { var m = /^\/i\/listing\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) { return detail(params.id, 'overview'); }
  });
  function detail(id, tab) {
    var l = L(id);
    if (!l) return U.empty('This listing is not here.', 'Home', '/i/home');
    var tabName = (Store.proto.tab && Store.proto.tab[id]) || tab;
    var proj = Logic.projection({ target: l.target, expectedProfit: l.expectedProfit, investorSharePct: l.investorSharePct, cycleDays: l.cycle || 1, feeBps: Store.state.settings.feeBps });
    var tabs = ['overview', 'shipments', 'figures', 'timeline'].map(function (t) {
      return '<button type="button" data-act="tab" data-id="' + l.id + '" data-tab="' + t + '" aria-selected="' + (tabName === t ? 'true' : 'false') + '">' + t + '</button>';
    }).join('');
    var body = '';
    if (tabName === 'shipments') body = l.shipments.map(function (sh) {
      return '<h2>' + U.esc(sh.label) + '</h2><p class="meta">' + U.esc(Logic.STAGES[sh.stage] || '') + (sh.late ? ' · Late' : '') + '</p><ul>' + sh.steps.map(function (st) {
        return '<li>' + U.esc(st.name) + ' · ' + U.esc(st.status) + (st.late ? ' · revised <span class="num">' + new Date(st.revisedDate).toISOString().slice(0, 10) + '</span>' : '') + '</li>';
      }).join('') + '</ul>';
    }).join('');
    else if (tabName === 'figures') {
      body = '<table class="statement"><tr><td>Funding target</td><td class="num">' + U.esc(U.usd(l.target)) + '</td></tr>' +
        '<tr><td>Raised</td><td class="num">' + U.esc(U.usd(l.raised)) + '</td></tr><tr><td>Minimum</td><td class="num">' + U.esc(U.usd(l.minInvest)) + '</td></tr>' +
        '<tr><td>Manager capital</td><td class="num">' + l.companyPct + '%</td></tr><tr><td>Investor share</td><td class="num">' + l.investorSharePct + '%</td></tr>' +
        '<tr><td>Expected profit</td><td>' + U.money(l.expectedProfit, 'expected') + '</td></tr>' +
        '<tr><td>Expected fee</td><td class="num">' + U.esc(U.usd(proj.fee)) + '</td></tr><tr><td>Expected pool</td><td>' + U.money(proj.pool, 'expected') + '</td></tr>' +
        '<tr><td>ROI this cycle</td><td class="num">' + proj.roiCycle + '% expected</td></tr><tr><td>ROI per year</td><td class="num">' + proj.roiYear + '% expected</td></tr>' +
        '<tr><td>Shareholder Listing</td><td>' + (l.shareholderListing ? 'Yes' : 'No') + '</td></tr><tr><td>Deposit waived</td><td>' + (l.depositWaiver ? 'Yes' : 'No') + '</td></tr></table>';
    } else if (tabName === 'timeline') body = '<ul class="timeline">' + (l.history || []).map(function (h) { return '<li><span class="num">' + new Date(h.at).toISOString().slice(0, 10) + '</span> ' + U.esc(h.action) + '</li>'; }).join('') + '</ul>';
    else body = '<p>' + U.esc(l.category) + ' · ' + l.cycle + ' days</p>' + U.funding(l) + '<p class="meta">Returns are estimates. Capital is at risk.</p>' + (l.status === 'live' && l.stage === 0 ? '<p><button class="btn btn-primary" data-go="/i/invest/' + l.id + '" type="button">Invest</button></p>' : '') + '<p><button class="link" data-go="/i/track/' + l.id + '" type="button">Track</button></p>';
    return '<div class="lead"><h1>' + U.esc(l.name) + '</h1></div><div class="tabs">' + tabs + '</div>' + body;
  }
  U.add({
    id: 'I6', section: 'shipments', task: true, auth: true, roles: ['investor'], match: function (p) { var m = /^\/i\/invest\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    action: function (params) {
      var why = Logic.denial(Store.state, U.user(), 'invest');
      if (why) return '<p class="denied">' + U.esc(why) + '</p>';
      return '<button class="btn btn-primary" type="button" data-act="invest" data-id="' + U.esc(params.id) + '">Confirm investment</button>';
    },
    render: function (params) {
      var l = L(params.id);
      var left = l.target - l.raised;
      var proj = Logic.projection({ target: l.target, expectedProfit: l.expectedProfit, investorSharePct: l.investorSharePct, cycleDays: l.cycle || 1, feeBps: 100 });
      var why = Logic.denial(Store.state, U.user(), 'invest');
      return '<h1>Invest</h1><p>' + U.esc(l.name) + '</p><p class="meta">Minimum <span class="num">' + U.esc(U.usd(l.minInvest)) + '</span>. Still open <span class="num">' + U.esc(U.usd(left)) + '</span>. If less than the minimum is left, invest exactly that.</p>' +
        (why ? '<p class="denied">' + U.esc(why) + '</p>' : '<form>' + U.dollarsField('Amount', 'amount') + '<p>Wallet <span class="num">' + U.esc(U.usd(Logic.balance(Store.state, Logic.walletOf(U.user().id)))) + '</span> <button class="link" type="button" data-go="/i/topup">Top up</button></p><p>Expected profit on a full target ' + U.money(proj.pool, 'expected') + '</p></form>');
    }
  });
  U.add({
    id: 'I7', section: 'shipments', task: true, auth: true, roles: ['investor'], match: function (p) { var m = /^\/i\/confirmed\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    action: function (params) { return '<button class="btn btn-primary" type="button" data-go="/i/track/' + params.id + '">Track this shipment</button>'; },
    render: function (params) {
      var l = L(params.id);
      return '<div class="is-fade"><h1>Investment confirmed</h1>' + U.success('Your investment is in escrow') + '<p>' + U.esc(l.name) + '</p><p class="price num">' + U.esc(U.usd(l.raised)) + ' raised</p></div>';
    }
  });
  U.add({
    id: 'I8', section: 'home', auth: true, roles: ['investor'], match: function (p) { return p === '/i/portfolio' ? {} : null; },
    render: function () {
      var u = U.user();
      var tab = Store.proto.ptab || 'active';
      var rows = mine(u).filter(function (l) {
        if (tab === 'active') return l.status === 'live' || l.status === 'settlement';
        if (tab === 'completed') return l.status === 'completed';
        return l.status === 'cancelled' || l.status === 'withdrawn';
      });
      var tabs = ['active', 'completed', 'ended'].map(function (t) { return '<button type="button" data-act="ptab" data-tab="' + t + '" aria-selected="' + (tab === t ? 'true' : 'false') + '">' + t + '</button>'; }).join('');
      var body = rows.length ? rows.map(function (l) {
        var mineC = (l.contributions || []).filter(function (c) { return c.userId === u.id; }).reduce(function (a, c) { return a + c.amount; }, 0);
        var end = l.status === 'completed' && l.result ? U.money(profitOf(l, u.id), 'result') : U.money(Math.round(l.expectedProfit * mineC / (l.target || 1)), 'expected');
        return U.row(l.name, l.status, end, '/i/listing/' + l.id);
      }).join('') : U.empty('Nothing in this tab yet.', 'Explore shipments', '/i/explore');
      return '<h1>Portfolio</h1><div class="tabs">' + tabs + '</div>' + body;
    }
  });
  function profitOf(l, uid) {
    var line = (l.result.lines || []).filter(function (x) { return x.userId === uid; })[0];
    return line ? line.profit : 0;
  }
  U.add({
    id: 'I9', section: 'home', auth: true, roles: ['investor', 'manager', 'staff'], match: function (p) { var m = /^\/i\/track\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) {
      var l = L(params.id);
      var body = l.shipments.map(function (sh) {
        return '<h2>' + U.esc(sh.label) + '</h2><p>' + U.esc(Logic.STAGES[sh.stage]) + '</p><div class="track" aria-hidden="true"><span style="width:' + (sh.stage * 20) + '%"></span></div><ul>' + sh.steps.map(function (st) {
          return '<li>' + U.esc(st.name) + ' · ' + U.esc(st.status) + (st.late ? ' · Late, revised <span class="num">' + new Date(st.revisedDate).toISOString().slice(0, 10) + '</span>' : '') + '</li>';
        }).join('') + '</ul>';
      }).join('');
      return '<h1>Track</h1><p>' + U.esc(l.name) + '</p>' + body + (l.status === 'completed' ? '<p><button class="link" data-go="/i/statement/' + l.id + '" type="button">Settlement statement</button></p>' : '');
    }
  });
  U.add({
    id: 'I10', section: 'home', auth: true, roles: ['investor', 'manager', 'staff'], match: function (p) { var m = /^\/i\/statement\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) {
      var l = L(params.id);
      if (!l.result) return '<h1>Settlement</h1>' + U.empty('This listing is not settled.', 'Back to portfolio', '/i/portfolio');
      var r = l.result;
      var u = U.user();
      var lines = r.lines.map(function (line) {
        var name = (u.role === 'staff') ? (line.userId || 'Treasury') : (line.userId === u.id ? 'You' : (line.kind === 'treasury' ? 'Treasury' : 'Investor'));
        return '<tr><td>' + U.esc(name) + '</td><td>' + U.money(line.profit, 'result') + '</td></tr>';
      }).join('');
      var mineLine = r.lines.filter(function (line) { return line.userId === u.id; })[0];
      return '<h1>Settlement statement</h1><table class="statement"><tr><td>Sale price</td><td class="num">' + U.esc(U.usd(r.revenue)) + '</td></tr><tr><td>Costs</td><td class="num">' + U.esc(U.usd(r.cost)) + '</td></tr><tr><td>Gross</td><td>' + U.money(r.gross, 'result') + '</td></tr><tr><td>Fee</td><td class="num">' + U.esc(U.usd(r.fee)) + '</td></tr><tr><td>Net</td><td>' + U.money(r.net, 'result') + '</td></tr><tr><td>Manager share</td><td class="num">' + U.esc(U.usd(r.manager)) + '</td></tr><tr><td>Pool</td><td>' + U.money(r.pool, 'result') + '</td></tr>' + lines +
        '<tr class="total"><td>My payout</td><td>' + (mineLine ? U.money(mineLine.payout, 'result') : U.esc(U.usd(0))) + '</td></tr></table>' +
        (l.shareSplit && l.shareSplit.shareholder ? '<p class="meta">Shareholder share <span class="num">' + U.esc(U.usd(l.shareSplit.shareholder)) + '</span> · Reserve fund <span class="num">' + U.esc(U.usd(l.shareSplit.reserve)) + '</span></p>' : '');
    }
  });
  U.add({
    id: 'I11', section: 'wallet', auth: true, roles: ['investor', 'manager'], match: function (p) { return p === '/i/wallet' ? {} : null; },
    render: function () {
      var u = U.user();
      var bal = Logic.balance(Store.state, Logic.walletOf(u.id));
      var held = Logic.balance(Store.state, Logic.heldOf(u.id));
      var wds = Store.state.withdrawals.filter(function (w) { return w.userId === u.id; });
      var list = wds.length ? wds.map(function (w) { return U.row(U.usd(w.amount), w.status, '', '/i/withdrawal/' + w.id); }).join('') : U.empty('No withdrawals yet.', 'Withdraw', '/i/withdraw');
      var note = Store.proto.notice ? U.success(Store.proto.notice) : '';
      return note + '<h1>Wallet</h1><section class="panel"><p class="kpi">Available</p><p class="figure num">' + U.esc(U.usd(bal)) + '</p><p class="kpi">Held <span class="num">' + U.esc(U.usd(held)) + '</span></p></section>' +
        '<p><button class="btn btn-secondary" data-go="/i/topup" type="button">Top up</button> <button class="btn btn-secondary" data-go="/i/withdraw" type="button">Withdraw</button></p><h2>Withdrawals</h2>' + list;
    }
  });
  U.add({
    id: 'I12', section: 'wallet', task: true, auth: true, roles: ['investor', 'manager'], match: function (p) { return p === '/i/topup' ? {} : null; },
    action: function () { return '<button class="btn btn-primary" type="button" data-act="topup">Continue to payment</button>'; },
    render: function () {
      var note = Store.proto.notice ? U.success(Store.proto.notice) : '';
      return note + '<h1>Top up</h1><form>' + U.dollarsField('Amount', 'amount') + '</form><p class="meta">Approved investors and managers only. The gateway is a mock.</p>';
    }
  });
  U.add({
    id: 'I13', section: 'wallet', task: true, auth: true, roles: ['investor', 'manager'], match: function (p) { return p === '/i/withdraw' ? {} : null; },
    action: function () {
      var why = Logic.denial(Store.state, U.user(), 'withdraw');
      if (why) return '<p class="denied">' + U.esc(why) + '</p>';
      return '<button class="btn btn-primary" type="button" data-act="withdraw">Request withdrawal</button>';
    },
    render: function () {
      var why = Logic.denial(Store.state, U.user(), 'withdraw');
      return '<h1>Withdraw</h1>' + (why ? '<p class="denied">' + U.esc(why) + '</p>' : '<form>' + U.dollarsField('Amount', 'amount') + '<p class="meta">USD 10,000 or more waits for the owner.</p><label class="field"><span>Bank country</span><select name="country">' + U.countries(false) + '</select></label>' + U.blockedNote() + U.field('Bank name', 'bankName') + U.field('Account holder', 'holder', U.user().name) + U.field('IBAN or account', 'account') + U.field('SWIFT', 'swift') + '</form>');
    }
  });
  U.add({
    id: 'I14', section: 'wallet', auth: true, roles: ['investor', 'manager', 'staff'], match: function (p) { var m = /^\/i\/withdrawal\/([^/]+)$/.exec(p); return m ? { id: m[1] } : null; },
    render: function (params) {
      var w = Store.state.withdrawals.filter(function (x) { return x.id === params.id; })[0];
      if (!w) return U.empty('No withdrawal here.', 'Wallet', '/i/wallet');
      var msg = w.status === 'paid' ? U.success('Paid ' + (w.ref || '')) : w.status === 'declined' ? U.banner('loss', 'Declined', w.reason) : w.status === 'failed' ? U.banner('warning', 'Payout failed', 'The money is back in the wallet.') : U.banner('info', 'Requested', w.amount >= Store.state.settings.largeWithdrawal ? 'Held for the owner.' : 'Waiting for finance.');
      return '<h1>Withdrawal</h1>' + msg + '<p class="figure num">' + U.esc(U.usd(w.amount)) + '</p><p class="word">' + U.esc(w.status) + '</p>';
    }
  });

  U.acts.filters = function (node, data) { Store.proto.filters = data; U.go('/i/explore'); };
  U.acts.clearFilters = function () { Store.proto.filters = {}; U.go('/i/explore'); };
  U.acts.tab = function (node) { Store.proto.tab = Store.proto.tab || {}; Store.proto.tab[node.getAttribute('data-id')] = node.getAttribute('data-tab'); U.go('/i/listing/' + node.getAttribute('data-id')); };
  U.acts.ptab = function (node) { Store.proto.ptab = node.getAttribute('data-tab'); U.go('/i/portfolio'); };
})();
