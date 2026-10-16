import { S, $, api, go, render, views, refreshBadges, loadMeta } from './core.js';
import './auth.js';
import './investor.js';
import './company.js';
import './admin.js';

export function home() { return !S.user ? 'login' : S.user.role === 'investor' ? 'explore' : S.user.role === 'company' ? 'coHome' : 'adHome'; }
(async function boot() {
  try { S.dev = !!(await api('GET', '/health')).dev; await loadMeta(); } catch (e) { /* server down: login will show the error */ }
  if (S.token) {
    try { S.me = await api('GET', '/me'); S.user = S.me.user; } catch (e) { S.token = null; }
  }
  await go(home());
})();
