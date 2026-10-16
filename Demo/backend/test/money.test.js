'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const H = require('./helpers');
const L = require('../src/ledger');
const cfg = require('../src/config');
const { allocate } = require('../src/util');
const S = require('../src/settlement');

let w;
before(async () => { w = await H.boot(); });
after(async () => { await w.close(); });
const bal = (id) => L.balance(L.walletOf(id));
const usd = (n) => n * 100;

async function fundedListing(o = {}) {
  const co = await H.newCompany(w, `co${Math.random().toString(36).slice(2)}@x.com`);
  const id = await H.liveListing(w, co, o);
  return { co, id };
}
async function runToGoodsSold(id, cost) {
  const o = w.tokens.ops;
  assert.equal((await w.api('POST', `/admin/listings/${id}/advance`, { cost_of_goods: cost, note: 'bought' }, o)).status, 200);
  for (let i = 0; i < 4; i++) assert.equal((await w.api('POST', `/admin/listings/${id}/advance`, {}, o)).status, 200);
}

test('allocate: always sums exactly, positive and negative', () => {
  for (let n = 0; n < 500; n++) {
    const k = 1 + Math.floor(Math.random() * 7), ws = Array.from({ length: k }, () => 1 + Math.floor(Math.random() * 1e7));
    const total = Math.floor((Math.random() - 0.5) * 2e9);
    const out = allocate(total, ws);
    assert.equal(out.reduce((a, b) => a + b, 0), total);
  }
});

test('profitable shipment: exact split, immediate wallet payouts, escrow ends at zero', async () => {
  const { co, id } = await fundedListing({ target: 500000, company_pct: 20, investor_share_pct: 60, cycle_days: 60, expected_profit: 60000 });
  const A = await H.newInvestor(w, 'pa@x.com', { funds: 200000 }), B = await H.newInvestor(w, 'pb@x.com', { funds: 300000 });
  assert.equal((await w.api('POST', `/listings/${id}/invest`, { amount: 150000 }, A.token)).status, 200);
  // cannot buy goods until fully funded
  assert.equal((await w.api('POST', `/admin/listings/${id}/advance`, { cost_of_goods: 500000 }, w.tokens.ops)).status, 409);
  assert.equal((await w.api('POST', `/listings/${id}/invest`, { amount: 250000 }, B.token)).status, 200);
  assert.equal((await w.api('POST', `/admin/listings/${id}/advance`, {}, w.tokens.ops)).status, 400, 'cost of goods is required');
  assert.equal((await w.api('POST', `/admin/listings/${id}/advance`, { cost_of_goods: 600000 }, w.tokens.ops)).status, 400, 'cost cannot exceed capital');
  assert.equal((await w.api('POST', `/admin/listings/${id}/advance`, { cost_of_goods: 500000 }, w.tokens.rev1)).status, 403, 'reviewer cannot run shipments');
  await runToGoodsSold(id, 500000);
  assert.equal(L.balance(L.escrowOf(id)), 0, 'all capital was paid to the supplier');
  assert.equal((await w.api('POST', `/admin/listings/${id}/advance`, {}, w.tokens.ops)).status, 409, 'must use complete after Goods sold');
  assert.equal((await w.api('POST', `/admin/listings/${id}/complete`, { sale_price: 560000 }, w.tokens.rev1)).status, 403);
  const beforeA = bal(A.id), beforeB = bal(B.id), beforeC = bal(co.id);
  const r = await w.api('POST', `/admin/listings/${id}/complete`, { sale_price: 560000 }, w.tokens.ops);
  assert.equal(r.status, 200); assert.equal(r.body.status, 'completed');
  const s = r.body.settlement;
  assert.deepEqual([s.gross, s.fee, s.net, s.manager_share, s.investor_pool], [usd(60000), usd(5600), usd(54400), usd(21760), usd(32640)]);
  assert.equal(bal(A.id) - beforeA, usd(159792), 'A: capital 150,000 + 30% of pool');
  assert.equal(bal(B.id) - beforeB, usd(266320), 'B: capital 250,000 + 50% of pool');
  assert.equal(bal(co.id) - beforeC, usd(128288), 'company: capital 100,000 + 20% of pool + manager share 21,760');
  assert.equal(L.balance(L.revenue()), usd(5600), 'platform service charge is 1% of the invoice price');
  assert.equal(L.balance(L.escrowOf(id)), 0, 'escrow is empty after settlement');
  assert.equal((await w.api('POST', `/admin/listings/${id}/complete`, { sale_price: 560000 }, w.tokens.ops)).status, 409, 'cannot settle twice');
  const pf = (await w.api('GET', '/portfolio', null, A.token)).body.portfolio[0];
  assert.equal(pf.paid_out, usd(159792)); assert.equal(pf.profit, usd(9792));
  const inv = (await w.api('GET', `/listings/${id}`, null, A.token)).body;
  assert.equal(inv.company_result, undefined, 'investor still cannot see the company result');
  assert.equal(inv.settlement.manager_share, undefined, 'investor statement has no manager share line');
  assert.equal(inv.settlement.investor_pool, usd(32640));
  assert.equal(inv.settlement.lines, undefined);
  assert.deepEqual(L.verify(), { ok: true, unbalanced: [], negative: [] });
});

test('loss: no service charge, no manager share, everyone shares the loss pro-rata', async () => {
  const { co, id } = await fundedListing({ target: 500000, company_pct: 20, investor_share_pct: 60 });
  const A = await H.newInvestor(w, 'la@x.com', { funds: 200000 }), B = await H.newInvestor(w, 'lb@x.com', { funds: 300000 });
  await w.api('POST', `/listings/${id}/invest`, { amount: 150000 }, A.token);
  await w.api('POST', `/listings/${id}/invest`, { amount: 250000 }, B.token);
  await runToGoodsSold(id, 500000);
  const rev0 = L.balance(L.revenue()), c0 = bal(co.id);
  const r = await w.api('POST', `/admin/listings/${id}/complete`, { sale_price: 450000 }, w.tokens.ops);
  assert.equal(r.status, 200);
  assert.equal(r.body.settlement.fee, 0); assert.equal(r.body.settlement.manager_share, 0);
  assert.equal(bal(A.id), usd(50000) + usd(135000));
  assert.equal(bal(B.id), usd(50000) + usd(225000));
  assert.equal(bal(co.id) - c0, usd(90000));
  assert.equal(L.balance(L.revenue()), rev0, 'no service charge on a losing shipment');
  assert.deepEqual(L.verify(), { ok: true, unbalanced: [], negative: [] });
});

test('goods cost less than the capital: the unspent capital goes back to the contributors', async () => {
  const { co, id } = await fundedListing({ target: 100000, company_pct: 20, investor_share_pct: 50, min_invest: 1000 });
  const A = await H.newInvestor(w, 'ca@x.com', { funds: 100000 });
  await w.api('POST', `/listings/${id}/invest`, { amount: 80000 }, A.token);
  await runToGoodsSold(id, 90000);
  assert.equal(L.balance(L.escrowOf(id)), usd(10000));
  const r = await w.api('POST', `/admin/listings/${id}/complete`, { sale_price: 110000 }, w.tokens.ops);
  assert.equal(r.status, 200);
  assert.equal(L.balance(L.escrowOf(id)), 0);
  const gross = 20000, fee = 1100, net = gross - fee;
  assert.equal(r.body.settlement.net, usd(net));
  assert.deepEqual(L.verify(), { ok: true, unbalanced: [], negative: [] });
});

test('platform-funded balance earns its share and returns to the treasury', async () => {
  const { co, id } = await fundedListing({ target: 100000, company_pct: 20, investor_share_pct: 60, min_invest: 1000 });
  await w.api('POST', '/admin/treasury/topup', { amount_usd: 100000, bank_ref: 'TT-' + id }, w.tokens.fin);
  const t0 = L.balance(L.treasury());
  assert.equal((await w.api('POST', `/admin/listings/${id}/fund-remaining`, {}, w.tokens.ops)).status, 200);
  assert.equal(L.balance(L.treasury()), t0 - usd(80000));
  await runToGoodsSold(id, 100000);
  const r = await w.api('POST', `/admin/listings/${id}/complete`, { sale_price: 120000 }, w.tokens.ops);
  assert.equal(r.status, 200);
  const net = 20000 - 1200;                      // gross 20,000, fee 1,200
  const mgr = Math.floor(net * 0.4), pool = net - mgr;
  assert.equal(L.balance(L.treasury()), t0 - usd(80000) + usd(80000) + Math.round(pool * 0.8 * 100));
  assert.deepEqual(L.verify(), { ok: true, unbalanced: [], negative: [] });
});

test('withdrawals: hold, approve, decline, bank detail checks, large amounts need the owner', async () => {
  const inv = await H.newInvestor(w, 'wd@x.com', { funds: 200000 });
  const bank = H.bankAE;
  assert.equal((await w.api('POST', '/wallet/withdrawals', { amount: 1000, ...bank, account: 'GB00' }, inv.token)).status, 400);
  assert.equal((await w.api('POST', '/wallet/withdrawals', { amount: 999999, ...bank }, inv.token)).status, 409, 'cannot withdraw more than the balance');
  const r1 = await w.api('POST', '/wallet/withdrawals', { amount: 1000, ...bank }, inv.token);
  assert.equal(r1.status, 200); assert.equal(bal(inv.id), usd(199000), 'money is held straight away');
  assert.equal((await w.api('POST', `/admin/withdrawals/${r1.body.id}/decision`, { approve: true, bank_ref: 'X' }, w.tokens.rev1)).status, 403, 'only finance approves withdrawals');
  assert.equal((await w.api('POST', `/admin/withdrawals/${r1.body.id}/decision`, { approve: true }, w.tokens.fin)).status, 400, 'bank reference is required');
  assert.equal((await w.api('POST', `/admin/withdrawals/${r1.body.id}/decision`, { approve: true, bank_ref: 'PAY-1' }, w.tokens.fin)).body.status, 'approved');
  assert.equal(bal(inv.id), usd(199000));
  const r2 = await w.api('POST', '/wallet/withdrawals', { amount: 500, ...bank }, inv.token);
  assert.equal((await w.api('POST', `/admin/withdrawals/${r2.body.id}/decision`, { approve: false }, w.tokens.fin)).status, 400, 'decline needs a reason');
  await w.api('POST', `/admin/withdrawals/${r2.body.id}/decision`, { approve: false, reason: 'Account not in your name' }, w.tokens.fin);
  assert.equal(bal(inv.id), usd(199000), 'declined money is returned');
  const big = await w.api('POST', '/wallet/withdrawals', { amount: 60000, ...bank }, inv.token);
  assert.equal((await w.api('POST', `/admin/withdrawals/${big.body.id}/decision`, { approve: true, bank_ref: 'B' }, w.tokens.fin)).status, 403, 'finance alone cannot approve USD 10,000+');
  assert.equal((await w.api('POST', `/admin/withdrawals/${big.body.id}/decision`, { approve: true, bank_ref: 'B' }, w.tokens.owner)).status, 200);
  const notApproved = await H.newInvestor(w, 'wd2@x.com', { approve: false, funds: 1000 });
  assert.equal((await w.api('POST', '/wallet/withdrawals', { amount: 100, ...bank }, notApproved.token)).status, 403, 'unverified accounts cannot withdraw');
  assert.deepEqual(L.verify(), { ok: true, unbalanced: [], negative: [] });
});

test('bank webhook: signature required and repeats are ignored', async () => {
  const inv = await H.newInvestor(w, 'hook@x.com');
  const body = JSON.stringify({ event_id: 'evt-1', user_id: inv.id, amount_usd: 2500 });
  const sig = crypto.createHmac('sha256', cfg.webhookSecret).update(body).digest('hex');
  const post = (s) => fetch(w.base + '/webhooks/bank', { method: 'POST', headers: { 'x-signature': s, 'content-type': 'application/json' }, body }).then(async (r) => ({ status: r.status, body: await r.json() }));
  assert.equal((await post('bad')).status, 403);
  assert.equal((await post(sig)).body.credited, true);
  assert.equal((await post(sig)).body.credited, false, 'same event twice credits once');
  assert.equal(bal(inv.id), usd(2500));
});

test('team management is owner-only and protects the owner', async () => {
  assert.equal((await w.api('GET', '/admin/staff', null, w.tokens.rev1)).status, 403);
  assert.equal((await w.api('GET', '/admin/audit', null, w.tokens.fin)).status, 403);
  const add = await w.api('POST', '/admin/staff', { email: 'new@t.test', password: 'NewStaff12345', name: 'New', staff_role: 'reviewer' }, w.tokens.owner);
  assert.equal(add.status, 200);
  const me = (await w.api('GET', '/me', null, w.tokens.owner)).body.user;
  assert.equal((await w.api('PATCH', `/admin/staff/${me.id}`, { active: false }, w.tokens.owner)).status, 400);
  assert.equal((await w.api('PATCH', `/admin/staff/${me.id}`, { staff_role: 'ops' }, w.tokens.owner)).status, 400);
  await w.api('PATCH', `/admin/staff/${add.body.id}`, { active: false }, w.tokens.owner);
  assert.equal((await w.api('POST', '/auth/login', { email: 'new@t.test', password: 'NewStaff12345' })).status, 401, 'deactivated staff cannot sign in');
  const log = (await w.api('GET', '/admin/audit?limit=500', null, w.tokens.owner)).body.audit;
  for (const a of ['listing.approve', 'listing.complete', 'withdrawal.approve', 'staff.create', 'kyc.approve']) assert.ok(log.some((x) => x.action === a), 'audit has ' + a);
  assert.equal((await w.api('GET', '/admin/ledger-check', null, w.tokens.owner)).body.ok, true);
});

test('projection matches the settlement maths', () => {
  const p = S.projection({ target: usd(300000), expectedProfit: usd(30000), investorSharePct: 60, cycleDays: 60 });
  assert.equal(p.roi_cycle_pct, 5.3);          // same figure the prototype showed
  assert.equal(p.roi_annual_pct, 32.5);
});
