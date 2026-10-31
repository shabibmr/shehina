// store.js - Temporary storage in localStorage under key 'shehnat-proto-v4'
// PROTOTYPE, throwaway. Wipe me.
// Plan: MockUI/v4-plan/PLAN.md §2 (Task A8)

window.ShehnatStore = window.ShehnatStore || {
  STORAGE_KEY: 'shehnat-proto-v4',
  load() { return null; },
  save(state) {},
  reset() {},
  exportJSON() { return '{}'; },
  importJSON(jsonStr) { return false; },
  clock: {
    now: new Date('2026-10-31T08:00:00Z'),
    advance(days) {}
  }
};
