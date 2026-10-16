'use strict';
process.env.NODE_ENV = 'test';
const db = require('../src/db');
const cfg = require('../src/config');
const { createServer } = require('../src/server');
const auth = require('../src/auth');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

async function boot() {
  db.close(); db.open(':memory:'); cfg.setClock(null);
  cfg.uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shehna-test-'));   // uploads from tests never touch the project
  const server = createServer();
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const api = async (method, path, body, token) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const world = { api, base, server, close: () => new Promise((r) => server.close(() => { fs.rmSync(cfg.uploadDir, { recursive: true, force: true }); r(); })) };
  const owner = auth.createStaff({ email: 'owner@t.test', password: 'OwnerPass123', name: 'Owner', staff_role: 'owner' }, null);
  const mk = (email, role) => auth.createStaff({ email, password: 'StaffPass123', name: email.split('@')[0], staff_role: role }, owner);
  mk('rev1@t.test', 'reviewer'); mk('rev2@t.test', 'reviewer'); mk('ops@t.test', 'ops'); mk('fin@t.test', 'finance');
  world.login = async (email, password = 'StaffPass123') => (await api('POST', '/auth/login', { email, password })).body.token;
  world.tokens = {
    owner: await world.login('owner@t.test', 'OwnerPass123'), rev1: await world.login('rev1@t.test'), rev2: await world.login('rev2@t.test'),
    ops: await world.login('ops@t.test'), fin: await world.login('fin@t.test'),
  };
  return world;
}
const pdf = Buffer.from('%PDF-1.4 test').toString('base64');
async function upload(w, token, kind) { const r = await w.api('POST', '/documents', { kind, filename: kind + '.pdf', mime: 'application/pdf', data_base64: pdf }, token); if (r.status !== 200) throw new Error('upload failed ' + JSON.stringify(r.body)); return r.body.id; }
// Default applicants live in different countries on purpose: Pakistan-born investor living in the UK, a Kenyan manager.
const kycData = (o = {}) => ({ name: 'Ahmed Khan', nationality: 'PK', residence: 'GB', dob: '1988-05-14', id_type: 'passport', id_number: 'AB1234567', phone: '+44 7700 900123', email: 'a@x.com', address: '12 High Street', city: 'London', occupation: 'Engineer', source_of_funds: 'Salary', ack: true, ...o });
const coData = (o = {}) => ({ manager_type: 'company', company_name: 'Savanna Traders Ltd', registration_no: 'PVT-2291', registered_in: 'Nairobi', residence: 'KE', activities: 'Tea and spice export', years_in_business: 8, shipments_exported: 24, owner_name: 'M Otieno', owner_nationality: 'KE', owner_id_type: 'passport', owner_id_number: 'P1234567', phone: '+254 700 123456', email: 'c@x.com', address: 'Moi Avenue', city: 'Nairobi', ack: true, ...o });
const KYC_DOCS = ['id_document', 'proof_of_address'];
const CO_DOCS = { company: ['business_registration', 'owner_id', 'company_profile'], individual: ['owner_id', 'proof_of_address', 'company_profile'] };

async function newInvestor(w, email, { approve = true, funds = 0, data } = {}) {
  await w.api('POST', '/auth/register', { email, password: 'Investor12345', name: email.split('@')[0], role: 'investor' });
  const t = await w.login(email, 'Investor12345');
  const docs = {}; for (const k of KYC_DOCS) docs[k] = await upload(w, t, k);
  const sub = await w.api('PUT', '/kyc', { data: kycData(data), docs }, t);
  if (sub.status !== 200) throw new Error('kyc submit ' + JSON.stringify(sub.body));
  if (approve) { const r = await w.api('POST', `/admin/applications/${sub.body.id}/decision`, { approve: true }, w.tokens.rev1); if (r.status !== 200) throw new Error('kyc approve ' + JSON.stringify(r.body)); }
  if (funds) await w.api('POST', '/dev/topup', { amount_usd: funds }, t);
  return { token: t, id: (await w.api('GET', '/me', null, t)).body.user.id, appId: sub.body.id };
}
async function newCompany(w, email, { approve = true, data } = {}) {
  await w.api('POST', '/auth/register', { email, password: 'Company12345', name: email.split('@')[0], role: 'company' });
  const t = await w.login(email, 'Company12345');
  const d = coData(data), docs = {}; for (const k of CO_DOCS[d.manager_type]) docs[k] = await upload(w, t, k);
  const sub = await w.api('PUT', '/company/application', { data: d, docs }, t);
  if (sub.status !== 200) throw new Error('company submit ' + JSON.stringify(sub.body));
  if (approve) await w.api('POST', `/admin/applications/${sub.body.id}/decision`, { approve: true }, w.tokens.rev1);
  return { token: t, id: (await w.api('GET', '/me', null, t)).body.user.id, appId: sub.body.id };
}
// Goods sourced in India, sold to a buyer in Kenya.
const listingBody = (o = {}) => ({ name: 'Basmati rice', category: 'Food', from_country: 'IN', to_country: 'KE', cycle_days: 45, target: 500000, company_pct: 20, min_invest: 1000, investor_share_pct: 60, expected_profit: 50000, product_cert: 'ISO-22000', ...o });
// Create a live listing: manager lists, reviewer approves, finance confirms deposit.
async function liveListing(w, company, o) {
  const c = await w.api('POST', '/company/listings', listingBody(o), company.token);
  if (c.status !== 200) throw new Error('create ' + JSON.stringify(c.body));
  const id = c.body.id;
  await w.api('POST', `/admin/listings/${id}/decision`, { approve: true }, w.tokens.rev1);
  await w.api('POST', `/admin/listings/${id}/confirm-deposit`, { bank_ref: 'BANK-' + id }, w.tokens.fin);
  return id;
}
// A valid UAE IBAN and a US account (account number + SWIFT) for payout tests.
const bankAE = { bank_country: 'AE', bank_name: 'Emirates NBD', account_holder: 'Ahmed Khan', account: 'AE070331234567890123456', swift: 'EBILAEAD' };
const bankUS = { bank_country: 'US', bank_name: 'Chase', account_holder: 'Ahmed Khan', account: '000123456789', swift: 'CHASUS33' };
module.exports = { boot, upload, newInvestor, newCompany, listingBody, liveListing, kycData, coData, bankAE, bankUS, KYC_DOCS, CO_DOCS };
