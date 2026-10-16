'use strict';
// Double-entry ledger. All money movement goes through post(). Entries in a txn sum to zero.
// Balances are derived from entries; accounts that cannot go negative are checked inside the same DB transaction.
const { q, tx } = require('./db');
const cfg = require('./config');
const { HttpError } = require('./util');

function account(code, kind, allowNegative = false) {
  let a = q.one('SELECT * FROM accounts WHERE code = ?', code);
  if (!a) {
    q.run('INSERT INTO accounts (code, kind, allow_negative) VALUES (?,?,?)', code, kind, allowNegative ? 1 : 0);
    a = q.one('SELECT * FROM accounts WHERE code = ?', code);
  }
  return a;
}
const walletOf = (userId) => account(`user:${userId}:wallet`, 'wallet');
const escrowOf = (listingId) => account(`escrow:${listingId}`, 'escrow');
const bank = () => account('bank:external', 'external', true);
const revenue = () => account('platform:revenue', 'revenue');
const treasury = () => account('platform:treasury', 'treasury');
const holdAcc = () => account('withdrawals:hold', 'hold');

function balance(acc) {
  const r = q.one('SELECT COALESCE(SUM(amount),0) AS b FROM ledger_entries WHERE account_id = ?', acc.id);
  return r.b;
}
// lines: [{account, amount}] amount>0 credits the account, <0 debits it.
function post({ kind, ref, memo, idemKey, lines }) {
  return tx(() => {
    if (idemKey) {
      const dup = q.one('SELECT id FROM ledger_txns WHERE idem_key = ?', idemKey);
      if (dup) return { id: dup.id, duplicate: true };
    }
    const nz = lines.filter((l) => l.amount !== 0);
    const sum = nz.reduce((s, l) => s + l.amount, 0);
    if (sum !== 0) throw new Error(`Ledger txn "${kind}" does not balance (off by ${sum})`);
    for (const l of nz) if (!Number.isInteger(l.amount)) throw new Error('Ledger amounts must be integers');
    const r = q.run('INSERT INTO ledger_txns (kind, ref, idem_key, memo, created_at) VALUES (?,?,?,?,?)', kind, ref || null, idemKey || null, memo || null, cfg.now());
    const id = Number(r.lastInsertRowid);
    for (const l of nz) {
      q.run('INSERT INTO ledger_entries (txn_id, account_id, amount) VALUES (?,?,?)', id, l.account.id, l.amount);
      if (l.amount < 0 && !l.account.allow_negative && balance(l.account) < 0) {
        throw new HttpError(409, 'Insufficient funds', 'insufficient_funds');
      }
    }
    return { id, duplicate: false };
  });
}
const move = (from, to, amount, meta) => post({ ...meta, lines: [{ account: from, amount: -amount }, { account: to, amount }] });

function statement(userId, limit = 100) {
  const w = walletOf(userId);
  return q.all(`SELECT e.amount, t.kind, t.memo, t.ref, t.created_at AS at FROM ledger_entries e JOIN ledger_txns t ON t.id = e.txn_id WHERE e.account_id = ? ORDER BY e.id DESC LIMIT ?`, w.id, limit);
}
// Integrity check: every txn sums to zero and no protected account is negative. Used in tests and by /admin/ledger-check.
function verify() {
  const unbalanced = q.all('SELECT txn_id, SUM(amount) s FROM ledger_entries GROUP BY txn_id HAVING s != 0');
  const negative = q.all(`SELECT a.code, SUM(e.amount) b FROM accounts a JOIN ledger_entries e ON e.account_id = a.id WHERE a.allow_negative = 0 GROUP BY a.id HAVING b < 0`);
  return { ok: !unbalanced.length && !negative.length, unbalanced, negative };
}
module.exports = { account, walletOf, escrowOf, bank, revenue, treasury, holdAcc, balance, post, move, statement, verify };
