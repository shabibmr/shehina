'use strict';
const crypto = require('node:crypto');
const { q, tx } = require('./db');
const cfg = require('./config');
const L = require('./ledger');
const { bad, forbidden, notFound, conflict, usdToCents, str, int } = require('./util');
const { audit } = require('./audit');
const { can } = require('./perms');
const apps = require('./applications');
const auth = require('./auth');
const C = require('./countries');

const LIM = cfg.limits;
const LARGE_WITHDRAWAL = LIM.largeWithdrawal * 100; // in cents: at or above this, the owner must approve, not finance alone (second pair of eyes)

function summary(user) {
  const w = L.walletOf(user.id);
  return { balance: L.balance(w), statement: L.statement(user.id, 100) };
}
// Bank inflow notification (webhook). Signed with a shared secret, idempotent on event_id.
function bankWebhook(rawBody, signature) {
  const want = crypto.createHmac('sha256', cfg.webhookSecret).update(rawBody).digest('hex');
  const a = Buffer.from(String(signature || '')), b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw forbidden('Bad signature');
  let ev; try { ev = JSON.parse(rawBody); } catch { throw bad('Body must be valid JSON'); }
  if (!ev || typeof ev !== 'object') throw bad('Body must be a JSON object');
  return credit(ev.event_id, ev.user_id, ev.amount_usd, 'Bank transfer received');
}
function credit(eventId, userId, amountUsd, memo) {
  const id = str(String(eventId || ''), 'event_id', { max: 100 });
  const u = q.one('SELECT * FROM users WHERE id = ?', int(userId, 'user_id', { min: 1 }));
  if (!u || u.role === 'staff') throw notFound('Unknown account');
  const amt = usdToCents(amountUsd, 'amount_usd', { min: 1, max: LIM.maxBankCredit });
  const r = L.post({ kind: 'topup', ref: `user:${u.id}`, memo, idemKey: `bank:${id}`, lines: [{ account: L.bank(), amount: -amt }, { account: L.walletOf(u.id), amount: amt }] });
  if (!r.duplicate) audit(null, 'wallet.topup', 'user', u.id, { amount: amt, event_id: id });
  return { credited: !r.duplicate, balance: L.balance(L.walletOf(u.id)) };
}
function treasuryTopup(actor, { amount_usd, bank_ref }) {
  if (!can(actor, 'deposit')) throw forbidden('Your role cannot move treasury funds');
  const amt = usdToCents(amount_usd, 'amount_usd', { min: 1, max: LIM.maxTreasuryTopup });
  const ref = str(bank_ref, 'bank_ref', { max: 100 });
  const r = L.post({ kind: 'treasury_topup', memo: `Platform funds in, bank ref ${ref}`, idemKey: `treasury:${ref}`, lines: [{ account: L.bank(), amount: -amt }, { account: L.treasury(), amount: amt }] });
  audit(actor, 'treasury.topup', 'ledger', r.id, { amount: amt, bank_ref: ref });
  return { treasury_balance: L.balance(L.treasury()) };
}
// Bank details for a payout anywhere in the world: an IBAN, or an account number plus the bank's SWIFT/BIC.
function mod97(iban) {
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of moved) rem = Number(String(rem) + (ch >= 'A' ? ch.charCodeAt(0) - 55 : ch)) % 97;
  return rem === 1;
}
function bankDetails(b) {
  const country = C.country(b.bank_country, 'Bank country');
  const holder = str(b.account_holder, 'account holder name', { min: 2, max: 140 });
  const bankName = str(b.bank_name, 'bank name', { min: 2, max: 140 });
  const account = str(b.account !== undefined ? b.account : b.iban, 'account number or IBAN', { max: 40 }).replace(/[\s-]+/g, '').toUpperCase();
  const swift = str(b.swift, 'SWIFT/BIC code', { min: 8, max: 11 }).replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift)) throw bad('Enter a valid SWIFT/BIC code (8 or 11 characters)');
  if (swift.slice(4, 6) !== country) throw bad('The SWIFT/BIC code does not belong to a bank in that country');
  if (/^[A-Z]{2}\d{2}/.test(account)) {          // looks like an IBAN: check country and checksum
    if (account.length < 15 || account.length > 34 || !/^[A-Z0-9]+$/.test(account) || !mod97(account)) throw bad('That IBAN is not valid. Check it and try again.');
    if (account.slice(0, 2) !== country) throw bad('The IBAN does not belong to a bank in that country');
  } else if (!/^[A-Z0-9/]{4,34}$/.test(account)) throw bad('Enter a valid bank account number or IBAN');
  return { account, details: { account_holder: holder, bank_name: bankName, bank_country: country, swift } };
}
function requestWithdrawal(user, body) {
  if (user.role === 'staff') throw forbidden();
  if (!apps.isApproved(user.id, user.role === 'investor' ? 'kyc' : 'company')) throw forbidden('Your account must be approved before withdrawing');
  const amt = usdToCents(body.amount, 'amount', { min: 1, max: LIM.maxWithdrawal });
  const { account, details } = bankDetails(body);
  return tx(() => {
    L.move(L.walletOf(user.id), L.holdAcc(), amt, { kind: 'withdrawal_hold', memo: 'Withdrawal requested' });
    const r = q.run("INSERT INTO withdrawals (user_id, amount, iban, details, status, created_at) VALUES (?,?,?,?,?,?)", user.id, amt, account, JSON.stringify(details), 'pending', cfg.now());
    const id = Number(r.lastInsertRowid);
    audit(user, 'withdrawal.request', 'withdrawal', id, { amount: amt, bank_country: details.bank_country });
    return withdrawalRow(id);
  });
}
const withdrawalRow = (id) => { const w = q.one('SELECT * FROM withdrawals WHERE id = ?', id); return w && { ...w, bank: w.details ? JSON.parse(w.details) : null, details: undefined }; };
const mineW = (user) => q.all('SELECT id, amount, status, created_at, decided_at FROM withdrawals WHERE user_id = ? ORDER BY id DESC', user.id);
const parseBank = (w) => ({ ...w, bank: w.details ? JSON.parse(w.details) : null, details: undefined });
function listWithdrawals(actor, status) {
  if (!can(actor, 'read')) throw forbidden();
  return (status ? q.all('SELECT w.*, u.name AS user_name FROM withdrawals w JOIN users u ON u.id = w.user_id WHERE w.status = ? ORDER BY w.id', status) : q.all('SELECT w.*, u.name AS user_name FROM withdrawals w JOIN users u ON u.id = w.user_id ORDER BY w.id DESC LIMIT 200')).map(parseBank);
}
function decideWithdrawal(actor, id, { approve, bank_ref, reason }) {
  if (!can(actor, 'wd')) throw forbidden('Your role cannot approve withdrawals');
  return tx(() => {
    const w = q.one('SELECT * FROM withdrawals WHERE id = ?', id);
    if (!w) throw notFound();
    if (w.status !== 'pending') throw conflict('Already decided');
    if (approve === true && w.amount >= LARGE_WITHDRAWAL && actor.staff_role !== 'owner') throw forbidden(`Withdrawals of USD ${LIM.largeWithdrawal.toLocaleString('en-US')} or more need the owner to approve`);
    if (approve === true) {
      const ref = str(bank_ref, 'bank_ref', { max: 100 });
      L.move(L.holdAcc(), L.bank(), w.amount, { kind: 'withdrawal_paid', ref: `withdrawal:${id}`, memo: `Paid to ${w.iban}, bank ref ${ref}` });
      q.run("UPDATE withdrawals SET status='approved', decided_by=?, decided_at=?, bank_ref=? WHERE id=?", actor.id, cfg.now(), ref, id);
    } else {
      if (!(typeof reason === 'string' && reason.trim())) throw bad('Give a reason when declining');
      L.move(L.holdAcc(), L.walletOf(w.user_id), w.amount, { kind: 'withdrawal_declined', ref: `withdrawal:${id}`, memo: 'Withdrawal declined, money returned' });
      q.run("UPDATE withdrawals SET status='declined', decided_by=?, decided_at=? WHERE id=?", actor.id, cfg.now(), id);
    }
    audit(actor, approve === true ? 'withdrawal.approve' : 'withdrawal.decline', 'withdrawal', id, { amount: w.amount, reason });
    return withdrawalRow(id);
  });
}
// ---- team ----
function listStaff(actor) {
  if (!can(actor, 'team')) throw forbidden();
  return q.all("SELECT id, email, name, staff_role, active FROM users WHERE role='staff' ORDER BY id");
}
function addStaff(actor, b) {
  if (!can(actor, 'team')) throw forbidden();
  const u = auth.createStaff(b, actor);
  return auth.publicUser(u);
}
function updateStaff(actor, id, { staff_role, active }) {
  if (!can(actor, 'team')) throw forbidden();
  return tx(() => {
    const u = q.one("SELECT * FROM users WHERE id = ? AND role='staff'", id);
    if (!u) throw notFound();
    if (staff_role !== undefined) {
      if (!['owner', 'reviewer', 'ops', 'finance'].includes(staff_role)) throw bad('Unknown role');
      if (u.id === actor.id && staff_role !== 'owner') throw bad('You cannot remove your own owner role');
      q.run('UPDATE users SET staff_role = ? WHERE id = ?', staff_role, id);
    }
    if (active !== undefined) {
      if (u.id === actor.id && !active) throw bad('You cannot deactivate yourself');
      q.run('UPDATE users SET active = ? WHERE id = ?', active ? 1 : 0, id);
    }
    audit(actor, 'staff.update', 'user', id, { staff_role, active });
    return q.one('SELECT id, email, name, staff_role, active FROM users WHERE id = ?', id);
  });
}
function auditLog(actor, limit = 100) {
  if (!can(actor, 'team')) throw forbidden();
  return q.all('SELECT a.*, u.name AS actor_name FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.id DESC LIMIT ?', Math.min(500, limit));
}
module.exports = { summary, bankWebhook, credit, treasuryTopup, requestWithdrawal, mineW, listWithdrawals, decideWithdrawal, listStaff, addStaff, updateStaff, auditLog };
