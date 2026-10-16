'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helpers');
const L = require('../src/ledger');
const { q } = require('../src/db');
const cfg = require('../src/config');

let w;
before(async () => { w = await H.boot(); });
after(async () => { await w.close(); });
const bal = (userId) => L.balance(L.walletOf(userId));

test('auth: weak password, duplicate email, lockout', async () => {
  let r = await w.api('POST', '/auth/register', { email: 'x@x.com', password: 'short', name: 'X', role: 'investor' });
  assert.equal(r.status, 400);
  r = await w.api('POST', '/auth/register', { email: 'x@x.com', password: 'LongEnough123', name: 'X', role: 'investor' });
  assert.equal(r.status, 200);
  r = await w.api('POST', '/auth/register', { email: 'X@x.com', password: 'LongEnough123', name: 'X', role: 'investor' });
  assert.equal(r.status, 409);
  r = await w.api('POST', '/auth/register', { email: 'y@x.com', password: 'LongEnough123', name: 'Y', role: 'staff' });
  assert.equal(r.status, 400, 'cannot self-register as staff');
  for (let i = 0; i < 5; i++) await w.api('POST', '/auth/login', { email: 'x@x.com', password: 'wrongwrong1' });
  r = await w.api('POST', '/auth/login', { email: 'x@x.com', password: 'LongEnough123' });
  assert.equal(r.status, 429, 'locked after 5 failures');
  assert.equal((await w.api('GET', '/me')).status, 401);
  assert.equal((await w.api('GET', '/me', null, 'forged.token')).status, 401);
});

test('documents: wrong content type and fake files are refused', async () => {
  const inv = await H.newInvestor(w, 'doc@x.com', { approve: false });
  let r = await w.api('POST', '/documents', { kind: 'x', filename: 'a.pdf', mime: 'application/pdf', data_base64: Buffer.from('MZ not a pdf').toString('base64') }, inv.token);
  assert.equal(r.status, 400);
  r = await w.api('POST', '/documents', { kind: 'x', filename: 'a.exe', mime: 'application/x-msdownload', data_base64: 'AAAA' }, inv.token);
  assert.equal(r.status, 400);
  const other = await H.newInvestor(w, 'doc2@x.com', { approve: false });
  const id = await H.upload(w, other.token, 'eid');
  const res = await fetch(w.base + '/documents/' + id, { headers: { authorization: 'Bearer ' + inv.token } });
  assert.equal(res.status, 403, "one investor cannot read another's document");
});

test('investor cannot invest before KYC approval', async () => {
  const co = await H.newCompany(w, 'co1@x.com');
  const id = await H.liveListing(w, co);
  const inv = await H.newInvestor(w, 'noapp@x.com', { approve: false, funds: 10000 });
  const r = await w.api('POST', `/listings/${id}/invest`, { amount: 1000 }, inv.token);
  assert.equal(r.status, 403);
  assert.equal(bal(inv.id), 1000000);
});

test('listing journey: review, deposit, live, hidden company data', async () => {
  const unapproved = await H.newCompany(w, 'co2@x.com', { approve: false });
  let r = await w.api('POST', '/company/listings', H.listingBody(), unapproved.token);
  assert.equal(r.status, 403, 'unregistered company cannot list');
  const co = await H.newCompany(w, 'co3@x.com');
  r = await w.api('POST', '/company/listings', H.listingBody({ company_pct: 10 }), co.token);
  assert.equal(r.status, 400, 'company must fund at least 20%');
  r = await w.api('POST', '/company/listings', H.listingBody({ investor_share_pct: 30 }), co.token);
  assert.equal(r.status, 400, 'investor share must be at least 40%');
  r = await w.api('POST', '/company/listings', H.listingBody(), co.token);
  const id = r.body.id; assert.equal(r.body.status, 'pending_review');
  const inv = await H.newInvestor(w, 'seer@x.com', { funds: 5000 });
  assert.equal((await w.api('GET', `/listings/${id}`, null, inv.token)).status, 404, 'pending listing is invisible to investors');
  assert.equal((await w.api('POST', `/admin/listings/${id}/decision`, { approve: true }, w.tokens.ops)).status, 403, 'ops cannot review');
  assert.equal((await w.api('POST', `/admin/listings/${id}/decision`, { approve: true }, w.tokens.rev1)).body.status, 'awaiting_deposit');
  assert.equal((await w.api('GET', `/listings/${id}`, null, inv.token)).status, 404, 'approved but unfunded listing is still hidden');
  assert.equal((await w.api('POST', `/admin/listings/${id}/confirm-deposit`, { bank_ref: 'B1' }, w.tokens.rev1)).status, 403, 'reviewer cannot confirm deposit');
  assert.equal((await w.api('POST', `/company/listings/${id}/deposit-sent`, {}, co.token)).body.company_paid, true);
  r = await w.api('POST', `/admin/listings/${id}/confirm-deposit`, { bank_ref: 'B1' }, w.tokens.fin);
  assert.equal(r.body.status, 'live');
  assert.equal(r.body.raised, 10000000, 'manager 20% of USD 500,000 = USD 100,000 in escrow');
  assert.equal(L.balance(L.escrowOf(id)), 10000000);
  const v = (await w.api('GET', `/listings/${id}`, null, inv.token)).body;
  for (const k of ['company_pct', 'company_deposit', 'expected_profit', 'company_expected', 'company', 'platform_funded']) assert.equal(v[k], undefined, `investor must not see ${k}`);
  assert.ok(v.roi_annual_pct > 0 && v.roi_cycle_pct > 0);
  const all = (await w.api('GET', '/listings', null, inv.token)).body.listings;
  assert.ok(all.every((x) => x.company_pct === undefined));
  const cv = (await w.api('GET', '/company/listings', null, co.token)).body.listings.find((x) => x.id === id);
  assert.equal(cv.company_pct, 20);
  assert.ok(cv.company_expected.manager_share > 0);
});

test('review assignment: another reviewer is blocked, owner can step in', async () => {
  const inv = await H.newInvestor(w, 'asg@x.com', { approve: false });
  const staff = (await w.api('GET', '/admin/staff', null, w.tokens.owner)).body.staff;
  const rev2 = staff.find((s) => s.email === 'rev2@t.test');
  let r = await w.api('POST', `/admin/applications/${inv.appId}/assign`, { staff_id: rev2.id }, w.tokens.rev1);
  assert.equal(r.status, 200);
  assert.equal((await w.api('POST', `/admin/applications/${inv.appId}/decision`, { approve: true }, w.tokens.rev1)).status, 403);
  assert.equal((await w.api('POST', `/admin/applications/${inv.appId}/decision`, { approve: false }, w.tokens.rev2)).status, 400, 'rejection needs a reason');
  assert.equal((await w.api('POST', `/admin/applications/${inv.appId}/decision`, { approve: true }, w.tokens.owner)).body.status, 'approved');
  assert.equal((await w.api('POST', `/admin/applications/${inv.appId}/decision`, { approve: true }, w.tokens.owner)).status, 409, 'cannot decide twice');
});

test('investing: limits, balance, closing at full funding', async () => {
  const co = await H.newCompany(w, 'co4@x.com');
  const id = await H.liveListing(w, co, { target: 10000, min_invest: 500 });   // USD 10,000: manager has 2,000, investors need 8,000
  const a = await H.newInvestor(w, 'ia@x.com', { funds: 20000 });
  const poor = await H.newInvestor(w, 'poor@x.com', { funds: 600 });
  assert.equal((await w.api('POST', `/listings/${id}/invest`, { amount: 100 }, a.token)).status, 400, 'below minimum');
  assert.equal((await w.api('POST', `/listings/${id}/invest`, { amount: 9000 }, a.token)).status, 400, 'above what is left');
  assert.equal((await w.api('POST', `/listings/${id}/invest`, { amount: 700 }, poor.token)).status, 409, 'not enough money in the wallet');
  assert.equal((await w.api('POST', `/listings/${id}/invest`, { amount: 0.001 }, a.token)).status, 400, 'fractions of a cent are refused');
  assert.equal((await w.api('POST', `/listings/${id}/invest`, { amount: 5000 }, a.token)).status, 200);
  assert.equal(bal(a.id), 1500000);
  const r = await w.api('POST', `/listings/${id}/invest`, { amount: 3000 }, a.token);
  assert.equal(r.body.remaining, 0);
  assert.equal((await w.api('POST', `/listings/${id}/invest`, { amount: 500 }, a.token)).status, 409, 'fully funded');
  assert.equal(L.balance(L.escrowOf(id)), 1000000);
});

test('overdue funding is flagged after 5 days and admin can fill the balance', async () => {
  const co = await H.newCompany(w, 'co5@x.com');
  const id = await H.liveListing(w, co, { target: 20000, min_invest: 500 });
  assert.equal((await w.api('GET', '/admin/overdue', null, w.tokens.ops)).body.listings.filter((l) => l.id === id).length, 0);
  const now = Date.now();
  cfg.setClock(() => now + 6 * 86400000);
  const opsLater = await w.login('ops@t.test');   // tokens issued before the clock jump would have expired
  const od = (await w.api('GET', '/admin/overdue', null, opsLater)).body.listings.find((l) => l.id === id);
  assert.ok(od && od.days_open >= 6 && od.remaining === 1600000);
  cfg.setClock(null);
  let r = await w.api('POST', `/admin/listings/${id}/fund-remaining`, {}, w.tokens.ops);
  assert.equal(r.status, 409, 'treasury is empty');
  assert.equal((await w.api('POST', '/admin/treasury/topup', { amount_usd: 50000, bank_ref: 'T1' }, w.tokens.ops)).status, 403, 'ops cannot top up treasury');
  assert.equal((await w.api('POST', '/admin/treasury/topup', { amount_usd: 50000, bank_ref: 'T1' }, w.tokens.fin)).status, 200);
  r = await w.api('POST', `/admin/listings/${id}/fund-remaining`, {}, w.tokens.ops);
  assert.equal(r.status, 200); assert.equal(r.body.remaining, 0); assert.equal(r.body.platform_funded, 1600000);
  assert.equal((await w.api('GET', '/admin/overdue', null, w.tokens.ops)).body.listings.filter((l) => l.id === id).length, 0);
});

test('ledger stays balanced after everything so far', () => {
  const v = L.verify();
  assert.deepEqual(v, { ok: true, unbalanced: [], negative: [] });
});
