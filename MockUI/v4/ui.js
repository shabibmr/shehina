// ui.js - Router, rendering helpers, components, icons
// PROTOTYPE, throwaway. Wipe me.
// Plan: MockUI/v4-plan/PLAN.md §2 (Task A11)

window.ShehnatUI = window.ShehnatUI || {
  currentRoute: '',
  screens: {},
  registerScreen(id, handler) {
    this.screens[id] = handler;
  },
  navigate(route) {
    window.location.hash = route;
  },
  showToast(msg) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMsg');
    if (toast && msgEl) {
      msgEl.textContent = msg;
      toast.hidden = false;
      setTimeout(() => { toast.hidden = true; }, 2400);
    }
  }
};
