'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

// Load Logic and Seed domain modules
const logicCode = fs.readFileSync(path.join(__dirname, 'MockUI', 'v4', 'logic.js'), 'utf8');
const seedCode = fs.readFileSync(path.join(__dirname, 'MockUI', 'v4', 'seed.js'), 'utf8');
const vm = require('node:vm');

const domainContext = {
  console,
  structuredClone: typeof structuredClone !== 'undefined' ? structuredClone : (obj) => JSON.parse(JSON.stringify(obj)),
  setTimeout,
  clearTimeout,
  Date,
  Math,
  JSON,
  Array,
  Object,
  String,
  Number,
  Boolean,
  RegExp,
  Error
};
domainContext.globalThis = domainContext;
domainContext.window = domainContext;
vm.createContext(domainContext);
vm.runInContext(logicCode, domainContext);
vm.runInContext(seedCode, domainContext);

const Logic = domainContext.Logic;
const Seed = domainContext.Seed;

class StateStore {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, 'data', 'shehnat_shared.db');
    if (this.dbPath !== ':memory:') {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new DatabaseSync(this.dbPath);
    this.init();
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS system_state (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        version INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    const existing = this.db.prepare('SELECT * FROM system_state WHERE key = ?').get('canonical');
    if (!existing) {
      this.resetState();
    } else {
      try {
        this.cachedState = JSON.parse(existing.data);
        this.cachedVersion = existing.version;
      } catch (e) {
        this.resetState();
      }
    }
  }

  getState() {
    return {
      state: this.cachedState,
      version: this.cachedVersion
    };
  }

  saveState(state) {
    this.cachedState = state;
    this.cachedVersion = (this.cachedVersion || 0) + 1;
    const json = JSON.stringify(state);
    const now = Date.now();

    this.db.prepare(`
      INSERT INTO system_state (key, data, version, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        data = excluded.data,
        version = excluded.version,
        updated_at = excluded.updated_at
    `).run('canonical', json, this.cachedVersion, now);

    return {
      state: this.cachedState,
      version: this.cachedVersion
    };
  }

  resetState() {
    const fresh = Seed.build();
    this.cachedState = fresh;
    this.cachedVersion = (this.cachedVersion || 0) + 1;
    const json = JSON.stringify(fresh);
    const now = Date.now();

    this.db.prepare(`
      INSERT INTO system_state (key, data, version, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        data = excluded.data,
        version = excluded.version,
        updated_at = excluded.updated_at
    `).run('canonical', json, this.cachedVersion, now);

    return {
      state: this.cachedState,
      version: this.cachedVersion
    };
  }

  dispatchAction(action) {
    const currentState = this.cachedState;
    const r = Logic.apply(currentState, action);
    if (!r.ok) {
      // Some failures change state on purpose, such as counting a wrong password toward a lockout.
      if (r.state !== currentState) this.saveState(r.state);
      return { ok: false, error: r.error };
    }
    const saved = this.saveState(r.state);
    return {
      ok: true,
      state: saved.state,
      version: saved.version,
      notice: r.notice,
      id: r.id
    };
  }

  advanceClock(days) {
    return this.dispatchAction({ type: 'clock', days: Number(days) || 1 });
  }
}

module.exports = {
  StateStore,
  Logic,
  Seed
};
