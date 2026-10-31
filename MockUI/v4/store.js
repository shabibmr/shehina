/* Shehnat Multi-User Shared-State Store with SSE synchronization */
(function (g) {
  'use strict';
  var KEY = 'shehnat-shared-v4';
  var SESS_KEY = 'shehnat_session_user';
  var memory = {};

  var LS = (typeof localStorage !== 'undefined') ? localStorage : {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null; },
    setItem: function (k, v) { memory[k] = String(v); },
    removeItem: function (k) { delete memory[k]; }
  };

  var SS = (typeof sessionStorage !== 'undefined') ? sessionStorage : LS;

  var Store = {
    state: null,
    version: 0,
    proto: { delay: 0, motion: 'system', dir: 'ltr', frame: 'full', failNext: false, error: '' },
    sse: null,

    init: function () {
      // 1. Initial local bootstrap for instant first paint
      var raw = LS.getItem(KEY);
      if (raw) {
        try { this.state = JSON.parse(raw); } catch (e) { this.state = null; }
      }
      if (!this.state || !this.state.users) {
        this.state = Seed.build();
      }

      // Check session user
      var sessUser = this.getSessionUser();
      if (sessUser) {
        this.state.sessionUserId = sessUser;
      }

      // 2. Fetch canonical state from backend server if available
      this.syncFromServer();

      // 3. Connect to SSE for real-time broadcast events from other users
      this.initEvents();
    },

    getSessionUser: function () {
      try {
        return SS.getItem(SESS_KEY) || (this.state ? this.state.sessionUserId : null);
      } catch (e) {
        return this.state ? this.state.sessionUserId : null;
      }
    },

    setSessionUser: function (id) {
      if (this.state) this.state.sessionUserId = id || null;
      try {
        if (id) SS.setItem(SESS_KEY, id);
        else SS.removeItem(SESS_KEY);
      } catch (e) {}
    },

    user: function () {
      var uid = this.getSessionUser();
      return (this.state.users || []).filter(function (u) { return u.id === uid; })[0] || null;
    },

    syncFromServer: function () {
      if (typeof fetch === 'undefined') return;
      var self = this;
      fetch('/api/state')
        .then(function (res) {
          if (!res.ok) throw new Error('Server returned ' + res.status);
          return res.json();
        })
        .then(function (data) {
          if (data && data.ok && data.state) {
            var activeUser = self.getSessionUser();
            self.state = data.state;
            self.version = data.version || 0;
            if (activeUser) self.state.sessionUserId = activeUser;
            self.saveLocal();
            // Re-rendering would wipe a form the person is typing in, so wait until they finish.
            if (typeof Ui !== 'undefined' && Ui.render && !self.isEditing()) {
              Ui.render();
            }
          }
        })
        .catch(function () {
          // Running in standalone offline/file:// mode
        });
    },

    initEvents: function () {
      if (typeof EventSource === 'undefined') return;
      var self = this;
      try {
        if (this.sse) this.sse.close();
        this.sse = new EventSource('/api/events');
        this.sse.addEventListener('update', function (ev) {
          // Skip the echo of a change this client already holds
          var info = null;
          try { info = JSON.parse(ev.data); } catch (e) {}
          if (info && typeof info.version === 'number' && info.version <= self.version) return;
          self.syncFromServer();
        });
      } catch (e) {
        // SSE unavailable in this environment
      }
    },

    // True while a field on screen holds text the person has typed or has focus.
    isEditing: function () {
      if (typeof document === 'undefined') return false;
      var a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
      var fields = document.querySelectorAll('#main input, #main textarea, #main select, #sheet input, #sheet textarea, #sheet select');
      for (var i = 0; i < fields.length; i++) {
        var f = fields[i];
        if (f.type === 'checkbox' || f.type === 'radio') { if (f.checked !== f.defaultChecked) return true; }
        else if (f.type !== 'hidden' && f.value !== f.defaultValue) return true;
      }
      return false;
    },

    saveLocal: function () {
      try {
        LS.setItem(KEY, JSON.stringify(this.state));
      } catch (e) {}
    },

    dispatch: function (action) {
      var self = this;

      // 1. Apply synchronously locally for immediate responsive feedback
      var r = Logic.apply(this.state, action);
      if (!r.ok) {
        this.proto.error = r.error;
        // A failed sign-in still changes state (the attempt count), so keep it and tell the server.
        if (r.state !== this.state) {
          this.state = r.state;
          this.saveLocal();
          this.sendToServer(action, null);
        }
        return r;
      }

      this.state = r.state;
      this.proto.error = '';

      // Update session user on signin/signout
      if (action.type === 'signin' && r.state.sessionUserId) {
        this.setSessionUser(r.state.sessionUserId);
      } else if (action.type === 'signout') {
        this.setSessionUser(null);
      } else {
        // preserve current session user
        var curr = this.getSessionUser();
        if (curr) this.state.sessionUserId = curr;
      }

      this.saveLocal();

      // 2. Dispatch to server to persist and broadcast across other connected sessions
      this.sendToServer(action, r);

      return r;
    },

    // The server holds the canonical state. If it disagrees with what this client just showed, the server wins.
    sendToServer: function (action, local) {
      var self = this;
      if (typeof fetch === 'undefined') return;
      fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; }, function () { return { ok: res.ok, data: null }; });
      })
      .then(function (out) {
        var data = out.data;
        if (!data || !local) return;
        if (!out.ok || !data.ok) {
          // Refused by the server, so the local success was wrong: say why and return to the canonical state.
          self.proto.error = data.error || 'The server did not accept this change';
          if (typeof Ui !== 'undefined' && Ui.toast) Ui.toast('Not saved: ' + (data.error || 'the server refused this change'));
          self.syncFromServer();
          return;
        }
        if (data.state && data.version > self.version) {
          var activeUser = self.getSessionUser();
          self.state = data.state;
          self.version = data.version;
          if (activeUser) self.state.sessionUserId = activeUser;
          self.saveLocal();
        }
        // Ids come from each side's own counter, so another person's change in between can make them differ.
        if (local.id && data.id && local.id !== data.id && typeof Ui !== 'undefined') {
          if (Ui.toast) Ui.toast('Someone else changed things at the same time. Refreshed.');
          if (Ui.render) Ui.render();
        }
      })
      .catch(function () {
        // Offline or file:// mode: the local state stands
      });
    }
  };

  g.Store = Store;
})(typeof globalThis !== 'undefined' ? globalThis : this);
