// store.js - Temporary storage in localStorage under key 'shehnat-proto-v4'
// PROTOTYPE, throwaway. Wipe me.
// Plan: MockUI/v4-plan/PLAN.md §2 (Task A8)

(function(global) {
  'use strict';

  const STORAGE_KEY = 'shehnat-proto-v4';
  const DEFAULT_DATE = '2026-10-31T08:00:00Z';

  let currentState = null;
  const listeners = new Set();

  function getDefaultSeed() {
    if (global.ShehnatSeed && typeof global.ShehnatSeed.getInitialState === 'function') {
      return global.ShehnatSeed.getInitialState();
    }
    // Fallback minimal seed if seed.js hasn't loaded yet
    return {
      version: 4,
      activePersonaId: 'aisha',
      simulatedDate: DEFAULT_DATE,
      failNextAction: false,
      skeletonDelay: true,
      personas: [
        { id: 'aisha', name: 'Aisha Rahman', role: 'investor', country: 'UAE', kyc: 'approved', wallet: 2500000 },
        { id: 'ben', name: 'Ben Carter', role: 'investor', country: 'UK', kyc: 'none', wallet: 0 },
        { id: 'chen', name: 'Chen Li', role: 'investor', country: 'SG', kyc: 'pending', wallet: 0 },
        { id: 'dina', name: 'Dina Haddad', role: 'investor', country: 'JO', kyc: 'rejected', wallet: 0 },
        { id: 'layla', name: 'Layla Nasser', role: 'investor', isShareholder: true, country: 'UAE', kyc: 'approved', wallet: 5000000 },
        { id: 'kerala', name: 'Kerala Spice Traders LLP', role: 'manager', isBusiness: true, country: 'IN', kyc: 'approved', exposureLimit: 50000000, wallet: 6000000 },
        { id: 'mateo', name: 'Mateo Rojas', role: 'manager', isBusiness: false, country: 'CL', kyc: 'pending', wallet: 0 },
        { id: 'omar', name: 'Omar Al-Said', role: 'manager', isShareholder: true, country: 'OM', kyc: 'approved', wallet: 10000000 },
        { id: 'hadi', name: 'Hadi Karim', role: 'staff', staffRole: 'owner', wallet: 0 },
        { id: 'priya', name: 'Priya Nair', role: 'staff', staffRole: 'reviewer', wallet: 0 },
        { id: 'sam', name: 'Sam Okafor', role: 'staff', staffRole: 'ops', wallet: 0 },
        { id: 'wei', name: 'Wei Zhang', role: 'staff', staffRole: 'ops', wallet: 0 },
        { id: 'fatima', name: 'Fatima Zaid', role: 'staff', staffRole: 'finance', wallet: 0 }
      ],
      listings: [],
      accounts: {
        wallets: {
          aisha: 2500000,
          layla: 5000000,
          kerala: 6000000,
          omar: 10000000
        },
        escrow: {},
        hold: {},
        treasury: 25000000, // $250,000 in cents
        revenue: 0,
        reserve: 0
      },
      ledger: [
        { id: 'tx_seed_0', ts: DEFAULT_DATE, debitAccount: 'treasury', creditAccount: 'seed_equity', amount: 25000000, desc: 'Initial platform treasury' },
        { id: 'tx_seed_1', ts: DEFAULT_DATE, debitAccount: 'wallet:aisha', creditAccount: 'external_funds', amount: 2500000, desc: 'Aisha wallet seed' },
        { id: 'tx_seed_2', ts: DEFAULT_DATE, debitAccount: 'wallet:kerala', creditAccount: 'external_funds', amount: 6000000, desc: 'Kerala wallet seed' }
      ],
      auditLog: [
        { id: 'aud_0', ts: DEFAULT_DATE, actor: 'SYSTEM', action: 'BOOT', entity: 'PLATFORM', details: 'Seed state initialized' }
      ],
      notifications: {
        aisha: [],
        kerala: [],
        hadi: [],
        priya: []
      },
      withdrawals: []
    };
  }

  function emitChange(state, eventType, payload) {
    for (const listener of listeners) {
      try {
        listener(state, eventType, payload);
      } catch (err) {
        console.error('ShehnatStore listener error:', err);
      }
    }
  }

  const ShehnatStore = {
    STORAGE_KEY,

    load() {
      try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (serialized) {
          const parsed = JSON.parse(serialized);
          if (parsed && parsed.version === 4) {
            currentState = parsed;
            return currentState;
          }
        }
      } catch (e) {
        console.warn('ShehnatStore: failed to parse localStorage, resetting to seed', e);
      }
      return this.reset();
    },

    getState() {
      if (!currentState) {
        this.load();
      }
      return currentState;
    },

    save(state) {
      if (!state) return;
      currentState = state;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
      } catch (e) {
        console.error('ShehnatStore: failed to write to localStorage', e);
      }
      emitChange(currentState, 'save');
      return currentState;
    },

    setState(updater, eventType = 'update') {
      const state = this.getState();
      let nextState;
      if (typeof updater === 'function') {
        nextState = updater(JSON.parse(JSON.stringify(state)));
      } else {
        nextState = Object.assign({}, state, updater);
      }
      this.save(nextState);
      emitChange(nextState, eventType);
      return nextState;
    },

    reset() {
      const seed = getDefaultSeed();
      currentState = JSON.parse(JSON.stringify(seed));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
      } catch (e) {
        console.error('ShehnatStore: localStorage error on reset', e);
      }
      emitChange(currentState, 'reset');
      return currentState;
    },

    exportJSON() {
      return JSON.stringify(this.getState(), null, 2);
    },

    importJSON(jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (!parsed || parsed.version !== 4) {
          throw new Error('Invalid schema version, expected version 4');
        }
        this.save(parsed);
        emitChange(currentState, 'import');
        return true;
      } catch (e) {
        console.error('ShehnatStore: import failed', e);
        return false;
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    // Clock operations (PLAN §3)
    clock: {
      getNow() {
        const state = ShehnatStore.getState();
        return new Date(state.simulatedDate || DEFAULT_DATE);
      },
      format() {
        const d = this.getNow();
        return d.toISOString().split('T')[0];
      },
      advanceDays(days) {
        const state = ShehnatStore.getState();
        const current = new Date(state.simulatedDate || DEFAULT_DATE);
        current.setDate(current.getDate() + days);
        const nextDate = current.toISOString();
        
        ShehnatStore.setState(s => {
          s.simulatedDate = nextDate;
          s.auditLog = s.auditLog || [];
          s.auditLog.unshift({
            id: 'aud_' + Date.now(),
            ts: nextDate,
            actor: 'SYSTEM',
            action: 'CLOCK_ADVANCE',
            entity: 'CLOCK',
            details: `Advanced clock by ${days} day(s) to ${nextDate.split('T')[0]}`
          });
          return s;
        }, 'clock_advance');

        return current;
      }
    },

    // Persona operations
    getActivePersona() {
      const state = this.getState();
      const id = state.activePersonaId || 'aisha';
      return state.personas.find(p => p.id === id) || state.personas[0];
    },

    setActivePersona(id) {
      const state = this.getState();
      const found = state.personas.find(p => p.id === id);
      if (found) {
        this.setState(s => {
          s.activePersonaId = id;
          return s;
        }, 'persona_change');
      }
      return found;
    },

    // Fail-next action toggle (PLAN §3 §5.2)
    shouldFailNext() {
      const state = this.getState();
      if (state.failNextAction) {
        // Reset after one failure
        this.setState(s => {
          s.failNextAction = false;
          return s;
        }, 'fail_consumed');
        return true;
      }
      return false;
    },

    setFailNext(val) {
      this.setState(s => {
        s.failNextAction = !!val;
        return s;
      }, 'fail_toggle');
    }
  };

  global.ShehnatStore = ShehnatStore;

})(typeof window !== 'undefined' ? window : this);
