/* PROTOTYPE, throwaway. One localStorage object. Wipe me: key shehnat-proto-v4. */
(function (g) {
  'use strict';
  var KEY = 'shehnat-proto-v4';
  var memory = {};
  var LS = (typeof localStorage !== 'undefined') ? localStorage : {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null; },
    setItem: function (k, v) { memory[k] = String(v); },
    removeItem: function (k) { delete memory[k]; }
  };

  var Store = {
    state: null,
    proto: { delay: 400, motion: 'system', dir: 'ltr', frame: 'phone', failNext: false, error: '', inspector: false, selfCheck: null },
    init: function () {
      var raw = LS.getItem(KEY);
      if (raw) {
        try { this.state = JSON.parse(raw); } catch (e) { this.state = null; }
      }
      if (!this.state || !this.state.users) this.state = Seed.build();
      this.proto.selfCheck = Logic.selfCheck();
      this.save();
    },
    save: function () { LS.setItem(KEY, JSON.stringify(this.state)); },
    reset: function () { this.state = Seed.build(); this.proto.error = ''; this.save(); },
    exportJson: function () { return JSON.stringify(this.state, null, 2); },
    importJson: function (text) {
      var data = JSON.parse(text);
      if (!data || !data.users || !data.ledger) throw new Error('This file is not a Shehnat prototype state');
      this.state = data;
      this.save();
    },
    user: function () { return (this.state.users || []).filter(function (u) { return u.id === this.state.sessionUserId; }, this)[0] || null; },
    dispatch: function (action) {
      var skip = action.type === 'clock';
      if (this.proto.failNext && !skip) {
        this.proto.failNext = false;
        this.proto.error = 'Error: This action failed. Nothing was saved.';
        return { ok: false, error: this.proto.error };
      }
      var r = Logic.apply(this.state, action);
      if (!r.ok) { this.proto.error = r.error; return r; }
      this.state = r.state;
      this.proto.error = '';
      this.save();
      return r;
    }
  };
  g.Store = Store;
})(typeof globalThis !== 'undefined' ? globalThis : this);
