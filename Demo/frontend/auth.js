import { S, esc, api, setToken, views, acts, go, field, busy, toast, render, reload } from './core.js';
import { home } from './main.js';

views.login = { handlesError: true, html: () => {
  const reg = S.form.mode === 'register';
  return `<div class="auth"><h1>${reg ? 'Create your account' : 'Welcome back'}</h1><p class="sub">Fund real container shipments from anywhere in the world and share the profit.</p>
  ${reg ? `<div class="seg" role="tablist"><button class="${S.form.role !== 'company' ? 'on' : ''}" data-act="setRole" data-arg="investor">I want to invest</button><button class="${S.form.role === 'company' ? 'on' : ''}" data-act="setRole" data-arg="company">I manage shipments</button></div>${field('Full name' + (S.form.role === 'company' ? ' (or business name)' : ''), 'name')}` : ''}
  ${field('Email', 'email', { type: 'email' })}${field('Password', 'password', { type: 'password', ph: reg ? 'At least 10 characters' : '' })}
  <button class="btn" data-act="${reg ? 'register' : 'login'}">${reg ? 'Create account' : 'Sign in'}</button>
  <p class="sub" style="text-align:center;margin-top:14px">${reg ? 'Already have an account?' : 'New here?'} <button class="lnk" data-act="toggleMode">${reg ? 'Sign in' : 'Create an account'}</button></p></div>`;
} };
acts.setRole = (el) => { S.form.role = el.dataset.arg; render(); };
acts.toggleMode = () => { S.form.mode = S.form.mode === 'register' ? 'login' : 'register'; render(); };
async function enter(r) { setToken(r.token); S.user = r.user; S.form = {}; S.docs = {}; S.me = await api('GET', '/me'); await go(home()); }
acts.login = () => busy(async () => { await enter(await api('POST', '/auth/login', { email: S.form.email, password: S.form.password })); });
acts.register = () => busy(async () => {
  await api('POST', '/auth/register', { email: S.form.email, password: S.form.password, name: S.form.name, role: S.form.role === 'company' ? 'company' : 'investor' });
  await enter(await api('POST', '/auth/login', { email: S.form.email, password: S.form.password }));
  toast('Welcome to Shehna');
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && S.route.name === 'login' && e.target.matches('input')) { acts[S.form.mode === 'register' ? 'register' : 'login'](); } });
