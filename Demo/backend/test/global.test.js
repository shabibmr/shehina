'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const H = require('./helpers');
const L = require('../src/ledger');
const cfg = require('../src/config');

let w;
before(async () => { w = await H.boot(); });
after(async () => { await w.close(); });
const bal = (id) => L.balance(L.walletOf(id));
const usd = (n) => n * 100;

test('meta: public reference data is in US dollars and lists the world', async () => {
  const r = await w.api('GET', '/meta');
  assert.equal(r.status, 200);
  assert.equal(r.body.currency, 'USD');
  assert.deepEqual(r.body.operator, { name: 'Shehna', country: 'AE', country_name: 'United Arab Emirates' });
  assert.ok(r.body.countries.length > 200);
  for (const c of ['AE', 'US', 'IN', 'BR', 'JP', 'KE', 'GB', 'DE']) assert.ok(r.body.countries.some((x) => x.code === c), c);
  assert.deepEqual(r.body.blocked_countries, cfg.blockedCountries);
  assert.equal(r.body.limits.largeWithdrawal, 10000);
  assert.deepEqual(r.body.manager_types, ['company', 'individual']);
});

test('investors from any country can verify; sanctioned countries cannot', async () => {
  for (const [i, residence] of ['US', 'BR', 'JP', 'DE', 'NG', 'AE'].entries()) {
    const inv = await H.newInvestor(w, `world${i}@x.com`, { data: { residence, nationality: 'IN' } });
    assert.ok(inv.appId, residence);
  }
  await w.api('POST', '/auth/register', { email: 'blocked@x.com', password: 'Investor12345', name: 'B', role: 'investor' });
  const t = await w.login('blocked@x.com', 'Investor12345');
  const docs = { id_document: await H.upload(w, t, 'id'), proof_of_address: await H.upload(w, t, 'addr') };
  let r = await w.api('PUT', '/kyc', { data: H.kycData({ residence: 'IR' }), docs }, t);
  assert.equal(r.status, 403);
  assert.match(r.body.error, /Iran/);
  r = await w.api('PUT', '/kyc', { data: H.kycData({ residence: 'Atlantis' }), docs }, t);
  assert.equal(r.status, 400, 'unknown country');
  r = await w.api('PUT', '/kyc', { data: H.kycData({ residence: 'india' }), docs }, t);
  assert.equal(r.status, 200, 'country names are accepted and stored as codes');
  assert.equal(r.body.data.residence, 'IN');
});

test('identity data is checked: age, date, phone, ID type, documents', async () => {
  await w.api('POST', '/auth/register', { email: 'idc@x.com', password: 'Investor12345', name: 'I', role: 'investor' });
  const t = await w.login('idc@x.com', 'Investor12345');
  const docs = { id_document: await H.upload(w, t, 'id'), proof_of_address: await H.upload(w, t, 'addr') };
  const put = (o, d = docs) => w.api('PUT', '/kyc', { data: H.kycData(o), docs: d }, t);
  const year = new Date().getUTCFullYear();
  assert.equal((await put({ dob: `${year - 10}-01-01` })).status, 400, 'under 18');
  assert.equal((await put({ dob: '1990-02-31' })).status, 400, 'impossible date');
  assert.equal((await put({ dob: '14/05/1988' })).status, 400, 'wrong format');
  assert.equal((await put({ phone: '0507654321' })).status, 400, 'phone needs a country code');
  assert.equal((await put({ id_type: 'emirates_id' })).status, 400, 'unknown ID type');
  assert.equal((await put({}, { id_document: docs.id_document })).status, 400, 'proof of address is required');
  assert.equal((await put({ ack: false })).status, 400);
  const ok = await put({ phone: '+1 (415) 555-0132', id_type: 'drivers_licence' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.phone, '+14155550132');
});

test('anyone can be a manager: a company or an individual, from anywhere', async () => {
  const ind = await H.newCompany(w, 'indiv@x.com', { data: { manager_type: 'individual', company_name: 'Ana Souza Trading', registration_no: '', residence: 'BR', owner_nationality: 'BR', owner_name: 'Ana Souza' } });
  const biz = await H.newCompany(w, 'biz@x.com', { data: { manager_type: 'company', residence: 'VN', owner_nationality: 'VN' } });
  for (const m of [ind, biz]) {
    const r = await w.api('POST', '/company/listings', H.listingBody(), m.token);
    assert.equal(r.status, 200);
  }
  // A business must upload its registration; an individual must upload proof of address.
  await w.api('POST', '/auth/register', { email: 'bad@x.com', password: 'Company12345', name: 'Bad', role: 'company' });
  const t = await w.login('bad@x.com', 'Company12345');
  const wrong = { owner_id: await H.upload(w, t, 'id'), proof_of_address: await H.upload(w, t, 'a'), company_profile: await H.upload(w, t, 'p') };
  assert.equal((await w.api('PUT', '/company/application', { data: H.coData({ manager_type: 'company' }), docs: wrong }, t)).status, 400, 'business needs its registration document');
  assert.equal((await w.api('PUT', '/company/application', { data: H.coData({ manager_type: 'partnership' }), docs: wrong }, t)).status, 400, 'unknown manager type');
  assert.equal((await w.api('PUT', '/company/application', { data: H.coData({ manager_type: 'individual' }), docs: wrong }, t)).status, 200);
  const blocked = await H.newCompany(w, 'blk@x.com', { approve: false, data: { residence: 'KP' } }).then(() => 'accepted', (e) => String(e.message));
  assert.match(blocked, /North Korea/, 'a manager registered in a blocked country is refused');
});

test('goods from anywhere, buyer anywhere: a Brazil to Japan trade with a US investor', async () => {
  const mgr = await H.newCompany(w, 'br@x.com', { data: { manager_type: 'individual', company_name: 'Ana Souza Trading', residence: 'BR', owner_nationality: 'BR' } });
  const inv = await H.newInvestor(w, 'us@x.com', { funds: 50000, data: { residence: 'US', nationality: 'US' } });
  const id = await H.liveListing(w, mgr, { name: 'Brazilian coffee, 1x40ft', from_country: 'BR', to_country: 'JP', target: 20000, min_invest: 500, investor_share_pct: 60 });
  const l = (await w.api('GET', `/listings/${id}`, null, inv.token)).body;
  assert.equal(l.from_country, 'BR'); assert.equal(l.to_country, 'JP');
  assert.equal((await w.api('GET', '/listings?from=BR&to=JP', null, inv.token)).body.listings.length, 1);
  assert.equal((await w.api('GET', '/listings?from=Brazil&to=Japan', null, inv.token)).body.listings.length, 1, 'filters accept names too');
  assert.equal((await w.api('GET', '/listings?from=IN', null, inv.token)).body.listings.filter((x) => x.id === id).length, 0);
  assert.equal((await w.api('POST', `/listings/${id}/invest`, { amount: 16000 }, inv.token)).body.remaining, 0);
  const o = w.tokens.ops;
  assert.equal((await w.api('POST', `/admin/listings/${id}/advance`, { cost_of_goods: 18000 }, o)).status, 200);
  for (let i = 0; i < 4; i++) await w.api('POST', `/admin/listings/${id}/advance`, {}, o);
  const before = bal(inv.id), mBefore = bal(mgr.id);
  const done = await w.api('POST', `/admin/listings/${id}/complete`, { sale_price: 24000 }, o);
  assert.equal(done.status, 200);
  assert.equal(done.body.settlement.net, usd(5760), 'USD 6,000 gross less 1% of USD 24,000');
  assert.equal(done.body.settlement.fee, usd(240));
  assert.ok(bal(inv.id) > before + usd(16000), 'investor gets capital back plus profit, in dollars');
  assert.ok(bal(mgr.id) > mBefore);
  assert.equal(L.balance(L.revenue()) >= usd(240), true);
  assert.equal(L.verify().ok, true);
});

test('listing countries: must be real, different, and not blocked', async () => {
  const mgr = await H.newCompany(w, 'lc@x.com');
  const post = (o) => w.api('POST', '/company/listings', H.listingBody(o), mgr.token);
  assert.equal((await post({ from_country: 'IN', to_country: 'IN' })).status, 400, 'same country');
  assert.equal((await post({ to_country: 'Narnia' })).status, 400, 'not a country');
  assert.equal((await post({ to_country: 'CU' })).status, 403, 'blocked buyer country');
  assert.equal((await post({ from_country: 'KP' })).status, 403, 'blocked source country');
  const ok = await post({ from_country: 'United Kingdom', to_country: 'australia' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.from_country, 'GB'); assert.equal(ok.body.to_country, 'AU');
  assert.equal((await post({ target: 500 })).status, 400, 'below the USD 1,000 minimum');
  assert.equal((await post({ target: 20_000_000 })).status, 400, 'above the USD 10,000,000 maximum');
});

test('a country added to the blocked list stops approval of earlier applicants', async () => {
  const inv = await H.newInvestor(w, 'late@x.com', { approve: false, data: { residence: 'NG' } });
  const keep = cfg.blockedCountries.slice();
  cfg.blockedCountries.push('NG');
  try {
    const r = await w.api('POST', `/admin/applications/${inv.appId}/decision`, { approve: true }, w.tokens.rev1);
    assert.equal(r.status, 403);
    const rej = await w.api('POST', `/admin/applications/${inv.appId}/decision`, { approve: false, reason: 'We cannot serve your country yet' }, w.tokens.rev1);
    assert.equal(rej.status, 200);
  } finally { cfg.blockedCountries.splice(0, cfg.blockedCountries.length, ...keep); }
});

test('payouts: international bank details are validated', async () => {
  const inv = await H.newInvestor(w, 'pay@x.com', { funds: 100000 });
  const wd = (o) => w.api('POST', '/wallet/withdrawals', { amount: 100, ...H.bankAE, ...o }, inv.token);
  assert.equal((await wd({})).status, 200, 'valid UAE IBAN');
  assert.equal((await wd({ ...H.bankUS })).status, 200, 'US account number with SWIFT');
  assert.equal((await wd({ account: 'AE070331234567890123457' })).status, 400, 'IBAN checksum is wrong');
  assert.equal((await wd({ account: 'GB82WEST12345698765432' })).status, 400, 'IBAN belongs to another country');
  assert.equal((await wd({ swift: 'EBILGBAD' })).status, 400, 'SWIFT country does not match the bank country');
  assert.equal((await wd({ swift: 'XX' })).status, 400, 'bad SWIFT');
  assert.equal((await wd({ swift: undefined })).status, 400, 'SWIFT is required');
  assert.equal((await wd({ account_holder: '' })).status, 400, 'account holder is required');
  assert.equal((await wd({ bank_country: 'IR', swift: 'EBILIRAD', account: 'IR062960000000100324200001' })).status, 403, 'blocked bank country');
  assert.equal((await wd({ account: 'AE07 0331 2345 6789 0123 456' })).status, 200, 'spaces are ignored');
  const pending = (await w.api('GET', '/admin/withdrawals?status=pending', null, w.tokens.fin)).body.withdrawals.filter((x) => x.user_id === inv.id);
  assert.equal(pending.length, 3);
  assert.equal(pending[0].bank.bank_name, 'Emirates NBD'); assert.equal(pending[0].bank.swift, 'EBILAEAD');
  assert.equal(pending[1].bank.bank_country, 'US'); assert.equal(pending[1].iban, '000123456789');
  assert.equal(bal(inv.id), usd(100000 - 300));
  assert.equal(L.verify().ok, true);
});

test('bank webhook: dollars in, malformed signed bodies get a clear error', async () => {
  const inv = await H.newInvestor(w, 'hook2@x.com');
  const send = (raw) => fetch(w.base + '/webhooks/bank', { method: 'POST', headers: { 'x-signature': crypto.createHmac('sha256', cfg.webhookSecret).update(raw).digest('hex') }, body: raw }).then(async (r) => ({ status: r.status, body: await r.json() }));
  assert.equal((await send('not json')).status, 400);
  assert.equal((await send('null')).status, 400);
  assert.equal((await send(JSON.stringify({ event_id: 'g1', user_id: inv.id, amount_usd: 1250.5 }))).body.credited, true);
  assert.equal(bal(inv.id), 125050);
  assert.equal((await send(JSON.stringify({ event_id: 'g2', user_id: inv.id, amount_aed: 10 }))).status, 400, 'the old AED field is no longer accepted');
});
