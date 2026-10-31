'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
process.env.NODE_ENV = 'test';
const db = require('../src/db');

test('a database made by an earlier version is upgraded in place', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shehnat-upg-'));
  const file = path.join(dir, 'old.db');
  const old = new DatabaseSync(file);
  old.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, pass_hash TEXT NOT NULL, role TEXT NOT NULL, staff_role TEXT, active INTEGER NOT NULL DEFAULT 1, failed_logins INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
    CREATE TABLE listings (id INTEGER PRIMARY KEY AUTOINCREMENT, company_user_id INTEGER, name TEXT, category TEXT, from_country TEXT, to_country TEXT, cycle_days INTEGER, target INTEGER, company_pct INTEGER, min_invest INTEGER, investor_share_pct INTEGER, expected_profit INTEGER, halal_cert TEXT, status TEXT, stage INTEGER DEFAULT 0, assigned_to INTEGER, company_paid INTEGER DEFAULT 0, cost_of_goods INTEGER, sale_price INTEGER, created_at INTEGER, live_at INTEGER, completed_at INTEGER);
    CREATE TABLE withdrawals (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, amount INTEGER, iban TEXT NOT NULL, status TEXT, decided_by INTEGER, decided_at INTEGER, bank_ref TEXT, created_at INTEGER);
    INSERT INTO listings (name, halal_cert, status, created_at) VALUES ('Old rice', 'HC-9', 'live', 1);`);
  old.close();
  try {
    db.close(); db.open(file);
    const cols = (t) => db.q.all(`PRAGMA table_info(${t})`).map((c) => c.name);
    assert.ok(cols('withdrawals').includes('details'));
    assert.ok(cols('listings').includes('product_cert'));
    assert.equal(db.q.one('SELECT product_cert FROM listings WHERE name = ?', 'Old rice').product_cert, 'HC-9', 'old certificate text is kept');
    db.close(); db.open(file);   // opening again changes nothing
    assert.equal(db.q.all('SELECT * FROM listings').length, 1);
  } finally { db.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
