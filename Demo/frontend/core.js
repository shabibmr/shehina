// Shared core: state, API client, router, layout and reusable components.
export const S = { meta: null, user: null, me: null, token: null, route: { name: 'boot', params: {} }, data: {}, form: {}, docs: {}, look: 'container', dev: false, sheet: null, busy: false, badges: {} };
const TOKEN_KEY = 'shehna-token', LOOK_KEY = 'shehna-look';
try { S.token = localStorage.getItem(TOKEN_KEY); const l = localStorage.getItem(LOOK_KEY); if (['container', 'majlis', 'oasis'].includes(l)) S.look = l; } catch (e) { /* storage blocked: fine */ }
document.documentElement.dataset.look = S.look;

export const $ = (id) => document.getElementById(id);
export const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export const num = (n) => Math.round(n).toLocaleString('en-US');
// Money arrives as whole cents and is always US dollars.
export const usd = (cents) => (cents < 0 ? '-' : '') + '$' + num(Math.abs(cents || 0) / 100);
export const usdx = (cents) => (cents < 0 ? '-' : '') + '$' + (Math.abs(cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
export const usdk = (cents) => '$' + compact.format((cents || 0) / 100);
export const dt = (ms) => ms ? new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
export const dday = (ms) => ms ? new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';

export function setToken(t) { S.token = t; try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ } }
export async function api(method, path, body) {
  const res = await fetch(path, { method, headers: { 'content-type': 'application/json', ...(S.token ? { authorization: 'Bearer ' + S.token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) { const e = new Error((data && data.error) || 'Request failed'); e.status = res.status; e.code = data && data.code; throw e; }
  return data;
}
export async function openDoc(id) {
  const res = await fetch('/documents/' + id, { headers: { authorization: 'Bearer ' + S.token } });
  if (!res.ok) { toast('Could not open the document'); return; }
  window.open(URL.createObjectURL(await res.blob()), '_blank', 'noopener');
}

let toastT;
export function toast(m) { const t = $('toast'); t.textContent = m; t.className = 'show'; clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, 3200); }

// ---- icons ----
const ico = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
export const NI = {
  explore: ico('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
  port: ico('<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M8 6v12M12 6v12M16 6v12"/>'),
  home: ico('<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>'),
  plus: ico('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
  wallet: ico('<path d="M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7l12-4v4"/><circle cx="17" cy="14" r="1.2"/>'),
  check: ico('<path d="M5 12l5 5L20 7"/>'), clock: ico('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), users: ico('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.2 2.4 3.5 5.2"/>'),
};
export const LOGO = '<svg viewBox="0 0 32 24" width="32" height="24" aria-hidden="true"><rect class="lgo" x="1" y="2" width="30" height="20" rx="2"/><path d="M6 2v20M11 2v20M16 2v20M21 2v20M26 2v20" stroke="rgba(0,0,0,.28)" stroke-width="1.6"/></svg>';
const PAL = ico('<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>');
const CHK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>';

// ---- reference data (countries, rules and limits come from the server's /meta) ----
export const META = { currency: 'USD', countries: [], blocked: [], categories: ['Food', 'Building', 'Textiles', 'Energy', 'Other'], idTypes: [], managerTypes: [], rules: {}, limits: { largeWithdrawal: 10000 }, operator: { name: 'Shehna', country_name: 'the United Arab Emirates' } };
const NAMES = new Map();
export async function loadMeta() {
  const m = await api('GET', '/meta');
  META.currency = m.currency; META.countries = m.countries; META.blocked = m.blocked_countries; META.categories = m.categories; META.idTypes = m.id_types; META.managerTypes = m.manager_types;
  META.rules = m.rules; META.limits = m.limits; META.operator = m.operator; NAMES.clear(); m.countries.forEach((c) => NAMES.set(c.code, c.name));
  CATS.length = 0; CATS.push(...m.categories);
}
// Country code to name and flag. Unknown values (older data) are shown as they are.
export const cname = (code) => NAMES.get(code) || code || '';
export const flag = (code) => (/^[A-Z]{2}$/.test(code || '') ? String.fromCodePoint(...[...code].map((ch) => 127397 + ch.charCodeAt(0))) : '');
// Options for a country dropdown, as [value, label] pairs. Blocked countries are left out.
// Pass all=true for fields where blocked countries are still fine (for example nationality).
export const countryOpts = (blank = 'Select a country', all = false) => [['', blank], ...META.countries.filter((c) => all || !META.blocked.includes(c.code)).map((c) => [c.code, c.name])];
export const ID_TYPE_LABELS = { passport: 'Passport', national_id: 'National ID card', drivers_licence: "Driver's licence", residence_permit: 'Residence permit' };
export const idTypeOpts = () => [['', 'Select an ID type'], ...META.idTypes.map((t) => [t, ID_TYPE_LABELS[t] || t])];
const COUNTRY_KEYS = new Set(['nationality', 'residence', 'owner_nationality', 'bank_country', 'from_country', 'to_country']);
const MANAGER_LABELS = { company: 'Business', individual: 'Individual trader' };
// Show a stored application value the way a person reads it: country codes as names, ID types as labels.
export function show(key, v) {
  if (v == null || v === '') return '';
  if (COUNTRY_KEYS.has(key)) return esc(cname(v));
  if (key === 'id_type' || key === 'owner_id_type') return esc(ID_TYPE_LABELS[v] || v);
  if (key === 'manager_type') return esc(MANAGER_LABELS[v] || v);
  return esc(v);
}
export const managerTypeOpts = () => META.managerTypes.map((t) => [t, MANAGER_LABELS[t] || t]);
export const CATS = ['Food', 'Building', 'Textiles', 'Energy', 'Other'];
const CC = { Food: '#C65F17', Building: '#6C7A86', Textiles: '#B5392B', Energy: '#2D6FA0', Other: '#2E7D5B' };
const EM = { Food: '🥫', Building: '🧱', Textiles: '🧵', Energy: '⚡', Other: '📦' };
export const ST = [['Funding open', 'Investors are funding this shipment'], ['Goods purchased', 'The goods were bought and the invoices uploaded'], ['Loaded at port', 'Container sealed and loaded'], ['At sea', 'Vessel on the way to the destination port'], ['Customs cleared', 'Goods released at destination'], ['Goods sold', 'Buyer paid, profit calculated'], ['Profit paid out', 'Capital and profit sent to the wallets']];
const IC = ['💰', '🧾', '🏗️', '🚢', '🛃', '🤝', '💸'], TP = [0, 0, .08, .5, .95, 1, 1];
export const RL = { owner: 'Owner', reviewer: 'Reviewer', ops: 'Operations', finance: 'Finance' };
const PERM = { review: ['owner', 'reviewer'], deposit: ['owner', 'finance'], ops: ['owner', 'ops'], wd: ['owner', 'finance'], team: ['owner'] };
export const can = (a) => !!S.user && S.user.role === 'staff' && (PERM[a] || []).includes(S.user.staff_role);

// ---- shared components ----
export const cid = (l) => 'MSKU ' + (480000 + l.id * 7391) + '-' + l.id;
export const door = (l, cls) => `<div class="door ${cls || ''}" style="--cc:${CC[l.category] || CC.Other}"><span class="em">${EM[l.category] || '📦'}</span><span class="dr"><small>${esc(l.category)}</small><span class="cid">${cid(l)}</span></span></div>`;
export const route = (l) => `${flag(l.from_country)} ${esc(cname(l.from_country))} <span class="arr">→</span> ${flag(l.to_country)} ${esc(cname(l.to_country))}`;
export const roiK = (l) => `<b>${l.roi_annual_pct}%</b><span>Expected ROI a year</span><em class="cyr">${l.roi_cycle_pct}% over ${l.cycle_days} days</em>`;
export function card(l, act) {
  return `<div class="ship" tabindex="0" data-act="${act}" data-arg="${l.id}">${door(l)}<div class="sb"><div class="row"><div class="nm">${esc(l.name)}</div><span class="vfy">${CHK}Reviewed</span></div><div class="rt">${route(l)}</div>
  <div class="kpi"><div class="k1">${roiK(l)}</div><div class="k2"><b>${l.cycle_days}<small> days</small></b><span>Total cycle</span></div><div class="k2"><b>${usdk(l.target)}</b><span>Funding target</span></div></div>
  <div class="bar"><i style="width:${l.funded_pct}%"></i></div><div class="row fb"><span>${l.funded_pct >= 100 ? 'Fully funded' : l.funded_pct + '% funded'}</span><span>Investors get <b>${l.investor_share_pct}%</b> of profit</span></div></div></div>`;
}
export function mini(l, act, chip, foot, pct, col) {
  return `<div class="ship sm" tabindex="0" data-act="${act}" data-arg="${l.id}">${door(l, 'thin')}<div class="sb"><div class="row"><div class="nm">${esc(l.name)}</div><span class="chip">${esc(chip)}</span></div><div class="rt">${route(l)}</div><div class="bar"><i style="width:${pct}%;background:${col || 'var(--acc)'}"></i></div><div class="fb">${foot}</div></div></div>`;
}
// Day of cycle = days since the goods were purchased (stage 1), from real timestamps.
export function progress(l, updates) {
  const t = TP[l.stage] || 0, u1 = (updates || []).find((u) => u.stage === 1);
  const day = u1 ? Math.min(l.cycle_days, Math.max(0, Math.floor((Date.now() - u1.at) / 86400000))) : 0;
  return { t, day: l.stage >= 6 ? l.cycle_days : day, left: Math.max(0, l.cycle_days - day) };
}
export function voy(l, p) {
  const t = p.t, u = 1 - t, px = u * u * 34 + 2 * u * t * 160 + t * t * 286, py = u * u * 108 + 2 * u * t * -14 + t * t * 108;
  const mk = l.stage < 2 ? '📦' : l.stage < 5 ? '🚢' : '✅', eta = l.stage >= 5 ? 'Arrived' : (l.stage < 1 ? 'Not shipped yet' : p.left + ' days left');
  return `<div class="voy"><div class="voyTop"><span class="vchip">${esc(l.stage_name)}</span><span class="veta">${eta}</span></div>
  <svg viewBox="0 0 320 150" role="img" aria-label="Shipment route from ${esc(cname(l.from_country))} to ${esc(cname(l.to_country))}, ${esc(l.stage_name)}">
   <path d="M20 40H300M20 75H300M20 110H300" stroke="rgba(255,255,255,.07)" stroke-width="1"/>
   <path d="M34 108 Q160 -14 286 108" pathLength="100" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2" stroke-dasharray="1 4" stroke-linecap="round"/>
   ${t > 0 ? `<path d="M34 108 Q160 -14 286 108" pathLength="100" fill="none" style="stroke:var(--tr)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${t * 100} 100"/>` : ''}
   <circle cx="34" cy="108" r="6" fill="#fff"/><circle cx="286" cy="108" r="6" style="fill:${l.stage >= 4 ? 'var(--hl)' : '#fff'}"/>
   <g transform="translate(${px.toFixed(1)} ${py.toFixed(1)})"><circle class="pulse" r="17" style="fill:var(--tr);fill-opacity:.45"/><circle r="15" fill="#fff"/><text y="6" text-anchor="middle" font-size="17">${mk}</text></g>
  </svg><div class="ports"><span>${flag(l.from_country)} ${esc(cname(l.from_country))}</span><span>${flag(l.to_country)} ${esc(cname(l.to_country))}</span></div></div>`;
}
export function stages(l, updates) {
  const at = {}; (updates || []).forEach((u) => { at[u.stage] = u; });
  return `<ul class="stg">${ST.map((s, i) => { const c = i < l.stage ? 'd' : i === l.stage ? 'c' : ''; const when = at[i] ? dday(at[i].at) : '';
    return `<li class="${c}"><i>${IC[i]}</i><div><strong>${s[0]}</strong><small>${esc((at[i] && at[i].note) || s[1])}</small></div><em>${i < l.stage ? (when || 'Done') : i === l.stage ? 'Now' : ''}</em></li>`; }).join('')}</ul>`;
}
export const table = (title, rows) => `${title ? `<h3>${title}</h3>` : ''}<table class="sheet"><tbody>${rows.map((r) => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</tbody></table>`;
export const ln = (label, cents, total) => `<div class="ln${total ? ' t' : ''}"><span>${label}</span><b${cents < 0 && total ? ' class="neg"' : ''}>${cents < 0 ? '−' : ''}${usd(Math.abs(cents))}</b></div>`;
export const field = (label, key, { type = 'text', ph = '', area = false, opts = null, id } = {}) => {
  const v = S.form[key] == null ? '' : S.form[key], fid = id || 'f_' + key;
  if (opts) return `<label class="fld" for="${fid}">${label}</label><select id="${fid}" data-bind="${key}">${opts.map((o) => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}"${ov === v ? ' selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
  if (area) return `<label class="fld" for="${fid}">${label}</label><textarea id="${fid}" rows="3" data-bind="${key}">${esc(v)}</textarea>`;
  return `<label class="fld" for="${fid}">${label}</label><input id="${fid}" type="${type}" value="${esc(v)}" placeholder="${esc(ph)}" data-bind="${key}"${type === 'number' ? ' inputmode="decimal"' : ''}>`;
};
export const docBox = (kind, label) => { const d = S.docs[kind]; return `<div class="upl"><div class="row"><b>${label}</b>${d ? `<span class="ok">✓ ${esc(d.filename)}</span>` : '<span class="sub">Not uploaded</span>'}</div><input type="file" accept="image/png,image/jpeg,application/pdf" data-doc="${kind}" aria-label="${esc(label)}"></div>`; };

// ---- views, actions, router ----
export const views = {};
export const acts = {};
export function go(name, params = {}) { return load(name, params, true); }
export function reload() { return load(S.route.name, S.route.params, false); }
let navSeq = 0;
async function load(name, params, scroll) {
  const v = views[name];
  if (!v) return;
  const my = ++navSeq;
  S.route = { name, params }; S.sheet = null;
  try { if (S.user && S.user.role !== 'staff' && name !== 'login') S.me = await api('GET', '/me'); S.data = v.load ? await v.load(params) : {}; }
  catch (e) { if (e.status === 401) { logout(); return; } S.data = { error: e.message }; }
  if (S.user && S.user.role === 'staff') S.badges = await refreshBadges();
  if (my !== navSeq) return;   // a newer navigation started while this one was loading
  render(); if (scroll) window.scrollTo(0, 0);
}
export function logout() { setToken(null); S.user = null; S.me = null; S.form = {}; S.docs = {}; go('login'); }

function header() {
  const app = S.user ? (S.user.role === 'staff' ? 'ad' : S.user.role === 'company' ? 'co' : 'inv') : 'inv';
  document.documentElement.dataset.app = app;
  const chip = app === 'co' ? '<span class="achip">Manager</span>' : app === 'ad' ? `<span class="achip">${S.user.staff_role ? RL[S.user.staff_role] : 'Admin'}</span>` : '';
  const right = `<button class="lk" data-act="look" title="Change design" aria-label="Change design">${PAL}</button>` + (S.user ? `<button class="ghost logout" data-act="logout">Sign out</button>` : '');
  return `<div class="hdin"><div class="brand">${LOGO}<span>Shehna</span>${chip}</div><div class="hr">${right}</div></div>`;
}
function navItems() {
  if (!S.user) return [];
  if (S.user.role === 'investor') return [['explore', 'Explore', NI.explore, ['explore', 'detail']], ['portfolio', 'My portfolio', NI.port, ['portfolio', 'track']], ['wallet', 'Wallet', NI.wallet, ['wallet']]];
  if (S.user.role === 'company') return [['coHome', 'Overview', NI.home, ['coHome']], ['coShips', 'Shipments', NI.port, ['coShips', 'coDetail']], ['coNew', 'New shipment', NI.plus, ['coNew']]];
  const n = S.badges || {}, it = [['adHome', 'Overview', NI.home, ['adHome']]];
  if (can('review') || can('deposit')) it.push(['adReview', 'Review' + (n.review ? `<span class="badge">${n.review}</span>` : ''), NI.check, ['adReview']]);
  if (can('ops')) it.push(['adOver', 'Overdue' + (n.overdue ? `<span class="badge">${n.overdue}</span>` : ''), NI.clock, ['adOver']]);
  it.push(['adShips', 'Shipments', NI.port, ['adShips', 'adDetail']]);
  if (can('wd')) it.push(['adWd', 'Money' + (n.wd ? `<span class="badge">${n.wd}</span>` : ''), NI.wallet, ['adWd']]);
  if (can('team')) it.push(['adTeam', 'Team', NI.users, ['adTeam']]);
  return it;
}
export function render() {
  $('hd').innerHTML = header();
  $('nav').innerHTML = navItems().map((n) => `<button class="${n[3].includes(S.route.name) ? 'on' : ''}" data-act="nav" data-arg="${n[0]}">${n[2]}${n[1]}</button>`).join('');
  $('nav').style.display = S.user ? '' : 'none';
  const v = views[S.route.name];
  $('app').innerHTML = S.data && S.data.error && !(v && v.handlesError) ? `<div class="warn">${esc(S.data.error)}</div><button class="ghost" data-act="retry">Try again</button>` : (v ? v.html(S.data) : '');
  $('sheet').innerHTML = S.sheet ? S.sheet() : '';
  const ft = $('ft'); if (ft) ft.textContent = `Platform operator: ${META.operator.name} (${META.operator.country_name}). Open to investors and managers worldwide. All amounts are in US dollars (${META.currency}).`;
}
// Keep the header badges for staff fresh.
export async function refreshBadges() {
  if (!S.user || S.user.role !== 'staff') return {};
  const b = { review: 0, overdue: 0, wd: 0 };
  try {
    if (can('review')) { const [i, c, l] = await Promise.all([api('GET', '/admin/applications/investors?status=pending'), api('GET', '/admin/applications/companies?status=pending'), api('GET', '/admin/listings?status=pending_review')]); b.review += i.applications.length + c.applications.length + l.listings.length; }
    if (can('deposit')) { const l = await api('GET', '/admin/listings?status=awaiting_deposit'); b.review += l.listings.filter((x) => x.company_paid).length; }
    if (can('ops')) b.overdue = (await api('GET', '/admin/overdue')).listings.length;
    if (can('wd')) b.wd = (await api('GET', '/admin/withdrawals?status=pending')).withdrawals.length;
  } catch (e) { /* badges are best-effort */ }
  return b;
}

acts.nav = (el) => go(el.dataset.arg);
acts.logout = () => logout();
acts.retry = () => reload();
acts.look = () => { S.sheet = lookSheet; render(); };
acts.closeSheet = () => { S.sheet = null; render(); };
acts.setLook = (el) => { S.look = el.dataset.arg; document.documentElement.dataset.look = S.look; try { localStorage.setItem(LOOK_KEY, S.look); } catch (e) { /* ignore */ } S.sheet = null; render(); };
function lookSheet() {
  const L = [['container', 'Container', 'Bold, warm, shipping-yard feel'], ['majlis', 'Majlis', 'Navy and gold, classic'], ['oasis', 'Oasis', 'Light, airy and rounded']];
  return `<div class="scrim" data-act="closeSheet"></div><div class="panel" role="dialog" aria-modal="true" aria-label="Choose a design"><div class="row"><h3 style="margin:0">Choose a design</h3><button class="ghost" data-act="closeSheet">Close</button></div>${L.map((l) => `<button class="opt${S.look === l[0] ? ' on' : ''}" data-act="setLook" data-arg="${l[0]}" aria-pressed="${S.look === l[0]}"><b>${l[1]}${S.look === l[0] ? ' (current)' : ''}</b><div class="sub">${l[2]}</div></button>`).join('')}</div>`;
}

// ---- event delegation (no inline handlers, so the page can run under a strict CSP) ----
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = acts[el.dataset.act];
  if (fn) { e.preventDefault(); Promise.resolve(fn(el, e)).catch(fail); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && S.sheet) { S.sheet = null; render(); return; }
  if (e.key !== 'Enter') return;
  const el = e.target.closest('.ship[data-act]');
  if (el) { acts[el.dataset.act](el, e); }
});
function bind(e) {
  const el = e.target;
  if (el.dataset && el.dataset.bind) {
    const k = el.dataset.bind;
    S.form[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
    const live = acts['live:' + k] || acts['live:*']; if (live) live(el);
  }
}
document.addEventListener('input', bind);
document.addEventListener('change', async (e) => {
  bind(e);
  const el = e.target;
  if (el.dataset && el.dataset.doc && el.files && el.files[0]) {
    const f = el.files[0];
    if (f.size > 5 * 1024 * 1024) { toast('That file is over 5 MB'); return; }
    try {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f); });
      const d = await api('POST', '/documents', { kind: el.dataset.doc, filename: f.name, mime: f.type, data_base64: b64 });
      S.docs[el.dataset.doc] = { id: d.id, filename: d.filename }; toast('Uploaded'); render();
    } catch (err) { toast(err.message); }
  }
  if (el.dataset && el.dataset.on) { const fn = acts[el.dataset.on]; if (fn) Promise.resolve(fn(el, e)).catch(fail); }
});
export function fail(e) { if (e.status === 401) { logout(); return; } toast(e.message || 'Something went wrong'); }
// Run an async action with a busy lock so double taps cannot send money twice.
export async function busy(fn) { if (S.busy) return; S.busy = true; try { return await fn(); } catch (e) { fail(e); } finally { S.busy = false; } }
