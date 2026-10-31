/* PROTOTYPE, throwaway. Demo world for shehnat-proto-v4. Password for every persona: shehnat-demo-1. */
(function (g) {
  'use strict';
  var PW = 'shehnat-demo-1';
  var TODAY = Date.UTC(2026, 9, 31);

  function must(s, action, label) {
    var r = Logic.apply(s, action);
    if (!r.ok) throw new Error((label || action.type) + ': ' + r.error);
    return r.state;
  }

  function ago(days) { return TODAY - days * Logic.DAY; }

  function steps(extraCost) {
    return Logic.template().map(function (st) {
      var copy = {};
      Object.keys(st).forEach(function (k) { copy[k] = st[k]; });
      if (st.name === 'Transportation') copy.cost = extraCost || 0;
      return copy;
    });
  }

  function ship(label, cost, sale, start) {
    return { label: label, expectedCost: cost, expectedSale: sale, plannedStart: start || 0, steps: steps(0) };
  }

  function userOf(s, id) { return s.users.filter(function (u) { return u.id === id; })[0]; }
  function byName(s, name) { return s.listings.filter(function (l) { return l.name === name; })[0]; }

  function makeIban(country) {
    var body = '0331234567890123456';
    var raw = country + '00' + body;
    var rearranged = raw.slice(4) + raw.slice(0, 4);
    var n = '';
    for (var i = 0; i < rearranged.length; i++) {
      var c = rearranged.charAt(i);
      n += /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c;
    }
    var rem = 0;
    for (i = 0; i < n.length; i++) rem = (rem * 10 + Number(n.charAt(i))) % 97;
    var check = String(98 - rem);
    if (check.length < 2) check = '0' + check;
    return country + check + body;
  }

  function build() {
    var s = Logic.blank();
    s.clock = TODAY;
    var people = [
      ['aisha', 'Aisha Rahman', 'aisha@demo.shehnat', 'investor', '', 'AE', false],
      ['ben', 'Ben Carter', 'ben@demo.shehnat', 'investor', '', 'GB', false],
      ['chen', 'Chen Li', 'chen@demo.shehnat', 'investor', '', 'SG', false],
      ['dina', 'Dina Haddad', 'dina@demo.shehnat', 'investor', '', 'JO', false],
      ['kerala', 'Kerala Spice Traders LLP', 'kerala@demo.shehnat', 'manager', '', 'IN', false],
      ['mateo', 'Mateo Rojas', 'mateo@demo.shehnat', 'manager', '', 'CL', false],
      ['omar', 'Omar Al-Said', 'omar@demo.shehnat', 'manager', '', 'OM', true],
      ['layla', 'Layla Nasser', 'layla@demo.shehnat', 'investor', '', 'AE', true],
      ['hadi', 'Hadi Karim', 'hadi@demo.shehnat', 'staff', 'owner', 'AE', false],
      ['priya', 'Priya Nair', 'priya@demo.shehnat', 'staff', 'reviewer', 'AE', false],
      ['sam', 'Sam Okafor', 'sam@demo.shehnat', 'staff', 'ops', 'AE', false],
      ['wei', 'Wei Zhang', 'wei@demo.shehnat', 'staff', 'ops', 'AE', false],
      ['fatima', 'Fatima Zaid', 'fatima@demo.shehnat', 'staff', 'finance', 'AE', false]
    ];
    people.forEach(function (p) {
      s = must(s, {
        type: 'seedUser',
        user: {
          id: p[0], name: p[1], email: p[2], password: PW, role: p[3], staffRole: p[4] || null,
          country: p[5], kyc: p[3] === 'staff' ? 'approved' : 'none', kycReason: '',
          shareholder: p[6], suspended: false, active: true,
          exposureLimit: p[0] === 'kerala' ? 50000000 : 0,
          managerType: p[0] === 'kerala' ? 'business' : (p[0] === 'mateo' || p[0] === 'omar' ? 'individual' : ''),
          attempts: 0, lockedUntil: 0, phone: '', dob: ''
        }
      }, p[0]);
    });

    function kyc(id, country, phone) {
      s = must(s, {
        type: 'kycSubmit', actorId: id, dob: '1990-06-15', phone: phone, country: country,
        idDoc: 'passport.pdf', addressDoc: 'address.pdf', idSize: 120000, addressSize: 80000, declare: true
      }, 'kyc ' + id);
    }
    kyc('aisha', 'AE', '+971501110001');
    kyc('chen', 'SG', '+6591234567');
    kyc('dina', 'JO', '+962791234567');
    kyc('layla', 'AE', '+971501110002');
    s = must(s, {
      type: 'registerSubmit', actorId: 'kerala', managerType: 'business', country: 'IN', phone: '+919812345678',
      declare: true, docs: [
        { name: 'trade-licence.pdf', type: 'file', size: 200000 },
        { name: 'owner-id.pdf', type: 'file', size: 120000 },
        { name: 'company-profile.pdf', type: 'file', size: 90000 }
      ]
    }, 'reg kerala');
    s = must(s, {
      type: 'registerSubmit', actorId: 'mateo', managerType: 'individual', country: 'CL', phone: '+56912345678',
      declare: true, docs: [
        { name: 'photo-id.pdf', type: 'file', size: 100000 },
        { name: 'proof-of-address.pdf', type: 'file', size: 80000 },
        { name: 'trading-profile.pdf', type: 'file', size: 70000 }
      ]
    }, 'reg mateo');
    s = must(s, {
      type: 'registerSubmit', actorId: 'omar', managerType: 'individual', country: 'OM', phone: '+96891234567',
      declare: true, docs: [
        { name: 'photo-id.pdf', type: 'file', size: 100000 },
        { name: 'proof-of-address.pdf', type: 'file', size: 80000 },
        { name: 'trading-profile.pdf', type: 'file', size: 70000 }
      ]
    }, 'reg omar');

    function latestApp(userId) {
      var rows = s.applications.filter(function (a) { return a.userId === userId; });
      return rows[rows.length - 1];
    }
    ['aisha', 'layla', 'kerala', 'omar'].forEach(function (id) {
      s = must(s, { type: 'decideApplication', actorId: 'priya', id: latestApp(id).id, decision: 'approve' }, 'approve ' + id);
    });
    s = must(s, { type: 'decideApplication', actorId: 'priya', id: latestApp('dina').id, decision: 'reject', reason: 'Photo ID unreadable' }, 'reject dina');
    s = must(s, { type: 'assign', actorId: 'priya', kind: 'application', id: latestApp('chen').id, assignee: 'priya' }, 'assign chen');
    s = must(s, { type: 'assign', actorId: 'priya', kind: 'application', id: latestApp('mateo').id, assignee: 'priya' }, 'assign mateo');

    s = must(s, { type: 'treasuryTopup', actorId: 'fatima', amount: 100000000, ref: 'OPEN-1' }, 'treasury');
    ['aisha', 'layla', 'kerala', 'omar'].forEach(function (id) {
      s = must(s, { type: 'topup', actorId: id, amount: 20000000, ref: 'seed' }, 'topup ' + id);
    });

    function openListing(actorId, spec) {
      s = must(s, { type: 'saveListing', actorId: actorId, strict: true, listing: spec }, 'save ' + spec.name);
      var l = byName(s, spec.name);
      if (spec.leave === 'draft') return l;
      s = must(s, { type: 'submitListing', actorId: actorId, id: l.id }, 'submit ' + spec.name);
      l = byName(s, spec.name);
      if (spec.leave === 'review') {
        if (spec.assignee) s = must(s, { type: 'assign', actorId: 'priya', kind: 'listing', id: l.id, assignee: spec.assignee }, 'assign ' + spec.name);
        return byName(s, spec.name);
      }
      if (spec.leave === 'reject') {
        s = must(s, { type: 'reviewListing', actorId: 'priya', id: l.id, decision: 'reject', reason: spec.reason || 'Terms are not supported' }, 'reject ' + spec.name);
        return byName(s, spec.name);
      }
      if (spec.leave === 'revise') {
        var edited = JSON.parse(JSON.stringify(spec));
        edited.investorSharePct = spec.investorSharePct + 5;
        s = must(s, { type: 'reviewListing', actorId: 'priya', id: l.id, decision: 'revise', reason: 'Investor share raised', listing: edited }, 'revise ' + spec.name);
        return byName(s, spec.name);
      }
      if (spec.leave === 'withdraw') {
        s = must(s, { type: 'withdrawListing', actorId: actorId, id: l.id, reason: 'Manager withdrew' }, 'withdraw ' + spec.name);
        return byName(s, spec.name);
      }
      s = must(s, {
        type: 'reviewListing', actorId: spec.approver || 'priya', id: l.id, decision: 'approve',
        marketNote: spec.marketNote || '', buyerShareholderId: spec.buyerShareholderId || '',
        waiver: !!spec.waiver, requiredDocs: spec.requiredDocs || null
      }, 'approve ' + spec.name);
      return byName(s, spec.name);
    }

    function base(name, extra) {
      var spec = {
        name: name, category: 'Food', source: 'IN', buyer: 'AE', certificate: '',
        companyPct: 20, investorSharePct: 60, minInvest: 100000,
        shipments: [ship('Shipment 1', 1000000, 1300000, 0)]
      };
      Object.keys(extra || {}).forEach(function (k) { spec[k] = extra[k]; });
      return spec;
    }

    openListing('kerala', base('Draft tea samples', { leave: 'draft', shipments: [ship('Shipment 1', 1000000, 1400000, 0)] }));
    openListing('kerala', base('Pepper, Kochi to Jebel Ali', { leave: 'review', assignee: 'priya' }));
    openListing('kerala', base('Cardamom, revised terms', { leave: 'revise', investorSharePct: 50 }));
    openListing('kerala', base('Rejected textiles', { leave: 'reject', category: 'Textiles', buyer: 'DE', reason: 'Certificate does not match the goods' }));
    openListing('kerala', base('Withdrawn copra', { leave: 'withdraw', buyer: 'NL' }));

    s = must(s, { type: 'clock', at: ago(12) }, 'clock 12');
    openListing('kerala', base('Cloves, deposit due', { buyer: 'QA' }));
    s = must(s, { type: 'clock', at: ago(14) }, 'clock 14');
    openListing('kerala', base('Unpaid deposit, auto-withdrawn', { buyer: 'KW' }));
    s = must(s, { type: 'clock', at: TODAY }, 'clock today');

    function fund(name, mgr) {
      var l = byName(s, name);
      if (l.status === 'approved') s = must(s, { type: 'payDeposit', actorId: mgr, id: l.id }, 'deposit ' + name);
    }
    function invest(name, who, amount) {
      var l = byName(s, name);
      s = must(s, { type: 'invest', actorId: who, id: l.id, amount: amount }, 'invest ' + name);
    }

    s = must(s, { type: 'clock', at: ago(1) }, 'clock fresh');
    openListing('kerala', base('Brazil coffee to Kobe', {
      source: 'BR', buyer: 'JP', certificate: 'Organic BR-204',
      shipments: [ship('Container 1', 800000, 1100000, 0)], minInvest: 100000
    }));
    fund('Brazil coffee to Kobe', 'kerala');

    s = must(s, { type: 'clock', at: ago(6) }, 'clock overdue');
    openListing('kerala', base('Overdue sesame', { buyer: 'EG', shipments: [ship('Shipment 1', 1000000, 1250000, 0)] }));
    fund('Overdue sesame', 'kerala');
    invest('Overdue sesame', 'layla', 300000);

    s = must(s, { type: 'clock', at: ago(40) }, 'clock twin');
    openListing('kerala', base('Twin cashew', {
      buyer: 'US',
      shipments: [ship('Shipment 1', 500000, 700000, 0), ship('Shipment 2', 500000, 720000, 5)],
      requiredDocs: { Receipts: ['Packing list'] }
    }));
    fund('Twin cashew', 'kerala');
    invest('Twin cashew', 'aisha', 500000);
    invest('Twin cashew', 'layla', 300000);
    s = must(s, { type: 'clock', at: TODAY }, 'clock after twin');
    (function () {
      var l = byName(s, 'Twin cashew');
      var sh = l.shipments[0];
      sh.steps.forEach(function (st) {
        var who = st.owner === 'manager' ? 'kerala' : 'sam';
        if (st.requiredDocs && st.requiredDocs.length) {
          s = must(s, { type: 'stepDoc', actorId: who, listingId: l.id, shipmentId: sh.id, stepId: st.id, name: 'packing-list.pdf', fileType: 'pdf', size: 40000 }, 'doc');
        }
        s = must(s, { type: 'stepSet', actorId: who, listingId: l.id, shipmentId: sh.id, stepId: st.id, status: 'done' }, 'step ' + st.name);
        if (st.needsVerify) s = must(s, { type: 'verifyStep', actorId: 'wei', listingId: l.id, shipmentId: sh.id, stepId: st.id }, 'verify');
      });
      var late = byName(s, 'Twin cashew').shipments[1].steps.filter(function (st) { return st.name === 'Receipts'; })[0];
      s = must(s, { type: 'stepSet', actorId: 'kerala', listingId: l.id, shipmentId: byName(s, 'Twin cashew').shipments[1].id, stepId: late.id, status: 'in_progress' }, 'late step');
    })();

    openListing('kerala', base('Rejected mango', {
      source: 'KE', buyer: 'FR',
      shipments: [ship('Shipment 1', 600000, 800000, 0), ship('Shipment 2', 600000, 820000, 2)]
    }));
    fund('Rejected mango', 'kerala');
    invest('Rejected mango', 'layla', 960000);
    (function () {
      var l = byName(s, 'Rejected mango');
      var sh = l.shipments[1];
      var purchase = sh.steps.filter(function (st) { return st.name === 'Purchase'; })[0];
      s = must(s, { type: 'blockStep', actorId: 'sam', listingId: l.id, shipmentId: sh.id, stepId: purchase.id, reason: 'Buyer rejected the goods' }, 'block mango');
    })();

    function sell(name, mgr, costPaid) {
      var snap = byName(s, name).shipments.map(function (sh) {
        return { id: sh.id, sale: sh.expectedSale, cost: sh.expectedCost, steps: sh.steps.map(function (st) { return { id: st.id, owner: st.owner, needsVerify: st.needsVerify, name: st.name }; }) };
      });
      snap.forEach(function (sh) {
        sh.steps.forEach(function (st) {
          var who = st.owner === 'manager' ? mgr : 'sam';
          s = must(s, { type: 'stepSet', actorId: who, listingId: byName(s, name).id, shipmentId: sh.id, stepId: st.id, status: 'done' }, 'done ' + st.name);
          if (st.needsVerify) s = must(s, { type: 'verifyStep', actorId: 'sam', listingId: byName(s, name).id, shipmentId: sh.id, stepId: st.id }, 'verify ' + st.name);
        });
        if (costPaid) {
          var purchase = sh.steps.filter(function (st) { return st.name === 'Purchase'; })[0];
          s = must(s, { type: 'payCost', actorId: 'sam', listingId: byName(s, name).id, shipmentId: sh.id, stepId: purchase.id, amount: sh.cost, proof: 'SWIFT-COST' }, 'cost');
        }
        s = must(s, { type: 'recordProceeds', actorId: 'sam', listingId: byName(s, name).id, shipmentId: sh.id, amount: sh.sale, doc: 'invoice.pdf' }, 'proceeds');
      });
    }

    s = must(s, { type: 'clock', at: TODAY }, 'clock profit');
    openListing('kerala', {
      name: 'Completed cardamom', category: 'Food', source: 'IN', buyer: 'NL', certificate: 'ISO 22000',
      companyPct: 20, investorSharePct: 60, minInvest: 100000,
      shipments: [{ label: 'Shipment 1', expectedCost: 1800000, expectedSale: 2400000, plannedStart: 0, steps: steps(200000) }]
    });
    fund('Completed cardamom', 'kerala');
    invest('Completed cardamom', 'aisha', 1600000);
    sell('Completed cardamom', 'kerala', true);
    s = must(s, { type: 'proposeSettlement', actorId: 'hadi', listingId: byName(s, 'Completed cardamom').id }, 'propose cardamom');
    var card = s.approvals.filter(function (a) { return a.listingId === byName(s, 'Completed cardamom').id && a.type === 'settlement'; })[0];
    s = must(s, { type: 'decideApproval', actorId: 'fatima', id: card.id, decision: 'approve' }, 'settle cardamom');

    openListing('kerala', base('Completed loss cotton', {
      category: 'Textiles', buyer: 'DE', shipments: [ship('Shipment 1', 1000000, 700000, 0)]
    }));
    fund('Completed loss cotton', 'kerala');
    invest('Completed loss cotton', 'aisha', 800000);
    sell('Completed loss cotton', 'kerala', true);
    s = must(s, { type: 'proposeSettlement', actorId: 'sam', listingId: byName(s, 'Completed loss cotton').id }, 'propose loss');
    var loss = s.approvals.filter(function (a) { return a.listingId === byName(s, 'Completed loss cotton').id && a.status === 'open'; })[0];
    s = must(s, { type: 'decideApproval', actorId: 'fatima', id: loss.id, decision: 'approve' }, 'settle loss');

    openListing('kerala', base('Cancelled rice', { buyer: 'BH', shipments: [ship('Shipment 1', 500000, 650000, 0)] }));
    fund('Cancelled rice', 'kerala');
    invest('Cancelled rice', 'layla', 400000);
    s = must(s, { type: 'cancelListing', actorId: 'sam', listingId: byName(s, 'Cancelled rice').id, reason: 'Buyer cancelled before the goods were bought' }, 'cancel rice');

    openListing('kerala', base('Nutmeg ready to settle', { buyer: 'SA', shipments: [ship('Shipment 1', 1000000, 1400000, 0)] }));
    fund('Nutmeg ready to settle', 'kerala');
    invest('Nutmeg ready to settle', 'layla', 800000);
    sell('Nutmeg ready to settle', 'kerala', true);
    s = must(s, { type: 'proposeSettlement', actorId: 'hadi', listingId: byName(s, 'Nutmeg ready to settle').id }, 'propose nutmeg');

    openListing('omar', base('Shareholder dates', {
      source: 'OM', buyer: 'AE', marketNote: 'Expected sale matches recent Dubai dates auctions',
      buyerShareholderId: 'layla', waiver: true, approver: 'hadi',
      shipments: [ship('Shipment 1', 1000000, 1300000, 0)]
    }));

    var aeIban = makeIban('AE');
    if (!Logic.ibanCheck(aeIban)) throw new Error('seed IBAN failed ' + aeIban);
    s = must(s, {
      type: 'withdraw', actorId: 'aisha', amount: 200000,
      bank: { country: 'AE', bankName: 'Emirates NBD', holder: 'Aisha Rahman', account: aeIban, swift: 'EBILAEAD' }
    }, 'wd 2k');
    s = must(s, {
      type: 'withdraw', actorId: 'aisha', amount: 1200000,
      bank: { country: 'AE', bankName: 'Emirates NBD', holder: 'Aisha Rahman', account: aeIban, swift: 'EBILAEAD' }
    }, 'wd 12k');

    function adjust(account, target) {
      var diff = target - Logic.balance(s, account);
      if (diff) s = must(s, { type: 'seedAdjust', account: account, amount: diff }, 'adjust ' + account);
    }
    adjust(Logic.walletOf('aisha'), 2500000);
    adjust(Logic.walletOf('kerala'), 6000000);
    adjust(Logic.walletOf('layla'), 1500000);
    adjust(Logic.walletOf('omar'), 2000000);
    adjust('platform:treasury', 25000000);

    var check = Logic.verify(s);
    if (!check.ok) throw new Error('seed ledger ' + JSON.stringify(check));
    s.listings.forEach(function (l) { Logic.derive(s, l); });
    return s;
  }

  g.Seed = { build: build, password: PW, TODAY: TODAY };
})(typeof globalThis !== 'undefined' ? globalThis : this);
