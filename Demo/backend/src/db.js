'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const cfg = require('./config');

let db;
function open(file = cfg.dbFile) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  upgrade();
  return db;
}
const hasColumn = (table, col) => db.prepare(`PRAGMA table_info(${table})`).all().some((r) => r.name === col);
// There are no migrations: databases made by earlier versions get the new columns added here. Safe to run every time.
function upgrade() {
  if (!hasColumn('withdrawals', 'details')) db.exec('ALTER TABLE withdrawals ADD COLUMN details TEXT');
  if (!hasColumn('listings', 'product_cert')) db.exec('ALTER TABLE listings ADD COLUMN product_cert TEXT');
  if (hasColumn('listings', 'halal_cert')) db.exec('UPDATE listings SET product_cert = halal_cert WHERE product_cert IS NULL AND halal_cert IS NOT NULL');
}
function get() { if (!db) open(); return db; }
function close() { if (db) { db.close(); db = null; } }
// Run fn inside a transaction. Any throw rolls everything back.
let depth = 0;
function tx(fn) {
  if (depth > 0) return fn();          // nested: the outermost transaction decides commit or rollback
  const d = get();
  d.exec('BEGIN IMMEDIATE');
  depth++;
  try { const r = fn(); d.exec('COMMIT'); return r; }
  catch (e) { try { d.exec('ROLLBACK'); } catch (_) {} throw e; }
  finally { depth--; }
}
const q = {
  one: (sql, ...a) => get().prepare(sql).get(...a),
  all: (sql, ...a) => get().prepare(sql).all(...a),
  run: (sql, ...a) => get().prepare(sql).run(...a),
};
module.exports = { open, get, close, tx, q };
