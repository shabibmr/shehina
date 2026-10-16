import { S, esc, num, usd, dt, api, views, acts, go, reload, render, toast, busy, card, mini, door, route, roiK, voy, stages, progress, table, ln, field, docBox, META, cname, countryOpts, idTypeOpts, managerTypeOpts, show, CATS } from './core.js';

// A manager can be a business or an individual trader, in any country. Each uploads the documents that fit.
const CO_DOCS_BUSINESS = [['business_registration', 'Business registration or trade licence'], ['owner_id', 'Owner or signatory photo ID'], ['company_profile', 'Company profile (activities, products)']];
const CO_DOCS_INDIVIDUAL = [['owner_id', 'Your government photo ID'], ['proof_of_address', 'Proof of address (a recent utility bill or bank statement)'], ['company_profile', 'Trading profile (what you trade, your experience)']];
const coDocs = () => (S.form.manager_type === 'individual' ? CO_DOCS_INDIVIDUAL : CO_DOCS_BUSINESS);
// [key, label, kind or input type, placeholder, multi-line]
export const CO_FIELDS = [['company_name', 'Business or trading name'], ['registration_no', 'Registration or licence number (leave empty if you are an individual)'], ['registered_in', 'State, region or free zone (optional)'], ['residence', 'Country the business is registered in, or where you live', 'country'], ['address', 'Business address'], ['city', 'City'], ['activities', 'Business activities and products', 'text', '', true], ['owner_name', 'Owner or authorised signatory'], ['owner_nationality', 'Owner nationality', 'country-all'], ['owner_id_type', 'Owner ID type', 'idtype'], ['owner_id_number', 'Owner ID number'], ['phone', 'Business phone with country code', 'text', '+44 20 7946 0000'], ['years_in_business', 'Years trading', 'number'], ['shipments_exported', 'Shipments exported so far', 'number']];
const coField = (f) => (f[2] === 'country' || f[2] === 'country-all' ? field(f[1], f[0], { opts: countryOpts('Select a country', f[2] === 'country-all') }) : f[2] === 'idtype' ? field(f[1], f[0], { opts: idTypeOpts() }) : field(f[1], f[0], { type: f[2] || 'text', ph: f[3] || '', area: !!f[4] }));
const coStatus = () => (S.me && S.me.company && S.me.company.status) || 'none';
async function refreshMe() { S.me = await api('GET', '/me'); }
const STATUS = { pending_review: ['Under review', 'We are checking your listing.'], awaiting_deposit: ['Deposit due', 'Approved. Pay your capital to take it live.'], live: ['Live', 'Open to investors.'], completed: ['Completed', 'Settled and paid out.'], rejected: ['Not approved', ''] };

// ---------- Registration (first time only) ----------
views.coReg = {
  load: async () => { const a = await api('GET', '/company/application'); if (!S.form.manager_type) S.form.manager_type = 'company'; if (a.data && a.status !== 'pending' && a.status !== 'approved' && !S.form._coLoaded) { Object.assign(S.form, a.data); S.form._coLoaded = true; } if (a.docs && !Object.keys(S.docs).length) Object.entries(a.docs).forEach(([k, id]) => { S.docs[k] = { id, filename: 'Uploaded earlier' }; }); return a; },
  html: (a) => {
    if (a.status === 'pending') return `<h1>Registration under review</h1><div class="note">We have your details and documents. Our team reviews every manager before they can list. You will be able to list shipments once approved.</div>${table('Submitted', [['Type', show('manager_type', a.data.manager_type)], ...CO_FIELDS.map((f) => [f[1], show(f[0], a.data[f[0]])])])}`;
    const blocked = META.blocked.length ? `<p class="sub">We cannot accept managers based in ${META.blocked.map((c) => esc(cname(c))).join(', ')} at the moment.</p>` : '';
    return `<h1>Register as a manager</h1><p class="sub">One time only. A manager sources the goods, ships them and sells them to the buyer, from any country. You can be a business or an individual trader. We approve every manager before they can raise funds.</p>${blocked}${a.status === 'rejected' ? `<div class="warn"><b>Not approved:</b> ${esc(a.reason)}</div>` : ''}
    ${field('I am registering as', 'manager_type', { opts: managerTypeOpts() })}
    ${CO_FIELDS.map(coField).join('')}${field('Business email', 'email', { type: 'email' })}
    <h3>Documents</h3><p class="sub">PNG, JPG or PDF, up to 5 MB each.</p>${coDocs().map((d) => docBox(d[0], d[1])).join('')}
    <label class="chk"><input type="checkbox" data-bind="ack"${S.form.ack ? ' checked' : ''}> I confirm these details are true and I am authorised to act for this business.</label>
    <button class="btn" data-act="submitCo">Submit for review</button>`;
  },
};
acts['live:manager_type'] = () => { if (S.route.name === 'coReg') render(); };
acts.submitCo = () => busy(async () => {
  const data = { manager_type: S.form.manager_type || 'company' }; CO_FIELDS.forEach((f) => { data[f[0]] = S.form[f[0]]; }); data.email = S.form.email || S.user.email; data.ack = !!S.form.ack;
  const docs = {}; coDocs().forEach((d) => { if (S.docs[d[0]]) docs[d[0]] = S.docs[d[0]].id; });
  await api('PUT', '/company/application', { data, docs }); await refreshMe(); S.docs = {}; toast('Submitted for review'); await go('coReg');
});
// Registration is shown once: until approved every manager screen redirects here.
const gated = (name, inner) => ({ ...inner, load: async (p) => (coStatus() === 'approved' ? inner.load ? inner.load(p) : {} : { __reg: true }), html: (d) => (d.__reg ? regCard() : inner.html(d)) });
const regCard = () => `<h1>Almost there</h1><div class="gate"><b>${coStatus() === 'pending' ? 'Registration under review' : 'Register as a manager first'}</b><p class="sub">${coStatus() === 'pending' ? 'You can list shipments as soon as we approve you.' : 'Tell us about yourself or your business once, then list as many shipments as you like.'}</p><button class="btn sm2" data-act="goReg">${coStatus() === 'pending' ? 'View submission' : coStatus() === 'rejected' ? 'Fix and resubmit' : 'Start registration'}</button></div>`;
acts.goReg = () => go('coReg');

// ---------- Overview ----------
views.coHome = gated('coHome', {
  load: async () => (await api('GET', '/company/listings')).listings,
  html: (ls) => {
    const live = ls.filter((l) => l.status === 'live'), done = ls.filter((l) => l.status === 'completed'), due = ls.filter((l) => l.status === 'awaiting_deposit' && !l.company_paid);
    const earned = done.reduce((s, l) => s + (l.company_result ? l.company_result.total_received - l.company_result.capital : 0), 0);
    return `<h1>Overview</h1><div class="kpi" style="margin:10px 0"><div class="k2"><b>${live.length}</b><span>Live</span></div><div class="k2"><b>${done.length}</b><span>Completed</span></div><div class="k2"><b>${usd(earned)}</b><span>Profit earned</span></div></div>
    ${due.map((l) => `<div class="gate"><b>Deposit due: ${esc(l.name)}</b><p class="sub">Pay your capital of ${usd(l.company_deposit)} to take it live.</p><button class="btn sm2" data-act="coOpen" data-arg="${l.id}">Open</button></div>`).join('')}
    ${ls.length ? ls.slice(0, 4).map(row).join('') : '<div class="empty">No shipments yet.</div>'}<button class="btn" data-act="nav" data-arg="coNew">List a new shipment</button>`;
  },
});
const row = (l) => mini(l, 'coOpen', STATUS[l.status][0], `${l.funded_pct}% funded · target ${usd(l.target)}`, l.status === 'completed' ? 100 : l.funded_pct);
acts.coOpen = (el) => go('coDetail', { id: el.dataset.arg });

views.coShips = gated('coShips', {
  load: async () => (await api('GET', '/company/listings')).listings,
  html: (ls) => `<h1>My shipments</h1>${ls.length ? ls.map(row).join('') : '<div class="empty">No shipments yet.</div>'}`,
});

views.coDetail = gated('coDetail', {
  load: (p) => api('GET', '/company/listings').then((r) => r.listings.find((l) => String(l.id) === String(p.id))),
  html: (l) => {
    if (!l) return '<div class="warn">Shipment not found.</div>';
    const r = l.company_result, st = STATUS[l.status];
    return `<button class="ghost" data-act="nav" data-arg="coShips">← Shipments</button><h1>${esc(l.name)}</h1><div class="rt">${route(l)}</div><span class="chip">${st[0]}</span> <span class="sub">${st[1]}</span>
    ${l.status === 'awaiting_deposit' ? `<div class="gate"><b>Pay your capital: ${usd(l.company_deposit)} (USD)</b><p class="sub">${l.company_pct}% of the ${usd(l.target)} target. Send US dollars from your bank to the Shehna escrow account using reference <b>LISTING-${l.id}</b> (bank details are shared by our team). When it arrives our finance team confirms and the shipment goes live.</p>${l.company_paid ? '<div class="note">Thanks. We are waiting for finance to confirm the transfer.</div>' : `<button class="btn" data-act="depositSent" data-arg="${l.id}">I have sent the deposit</button>`}</div>` : ''}
    ${l.status === 'live' || l.status === 'completed' ? `<div class="bar"><i style="width:${l.funded_pct}%"></i></div><div class="row fb"><span>${usd(l.raised)} of ${usd(l.target)} raised</span><span>${l.funded_pct}%</span></div>${voy(l, progress(l, l.updates))}${stages(l, l.updates)}` : ''}
    ${table('Terms', [['Goods sourced from', esc(cname(l.from_country))], ['Sold to a buyer in', esc(cname(l.to_country))], ['Target', usd(l.target)], ['Your capital', `${l.company_pct}% (${usd(l.company_deposit)})`], ['Investor share of profit', l.investor_share_pct + '%'], ['Cycle', l.cycle_days + ' days'], ['Expected profit', usd(l.expected_profit)], ['Investor ROI', `${l.roi_annual_pct}% a year (${l.roi_cycle_pct}% over ${l.cycle_days} days)`], ...(l.product_cert ? [['Product certificate', esc(l.product_cert)]] : [])])}
    ${l.status !== 'completed' ? table('What you expect to earn', [['Manager share (your ' + (100 - l.investor_share_pct) + '% of net profit)', usd(l.company_expected.manager_share)], ['Profit on your own capital', usd(l.company_expected.own_capital_profit)]]) : ''}
    ${r ? table('Your result', [['Sale price', usd(l.settlement.revenue)], ['Gross profit', usd(l.settlement.gross)], ['Platform service charge', usd(l.settlement.fee)], ['Net profit', usd(l.settlement.net)], ['Manager share', usd(r.manager_share)], ['Profit on your capital', usd(r.own_capital_profit)], ['Capital returned', usd(r.capital)], ['Total paid to your wallet', usd(r.total_received)]]) : ''}`;
  },
});
acts.depositSent = (el) => busy(async () => { await api('POST', `/company/listings/${el.dataset.arg}/deposit-sent`); toast('Thanks. Finance will confirm.'); await reload(); });

// ---------- New listing, with live ROI preview that mirrors the server maths ----------
export function project(target, exp, sp, days) {
  const rev = target + exp, gross = rev - target, fee = gross > 0 ? Math.min(Math.round(rev * 0.01), gross) : 0, net = gross - fee;
  const mgr = net > 0 ? Math.floor((net * (100 - sp)) / 100) : 0, pool = net - mgr, cyc = target ? pool / target : 0;
  return { net, mgr, pool, cyc: Math.round(cyc * 1000) / 10, ann: Math.round(((cyc * 365) / (days || 1)) * 1000) / 10 };
}
function preview() {
  const f = S.form, ok = f.target > 0 && f.expected_profit > 0 && f.cycle_days > 0 && f.investor_share_pct >= 40;
  if (!ok) return '<p class="sub">Enter the cycle, expected profit and investor share to see the ROI investors will see.</p>';
  const p = project(f.target, f.expected_profit, f.investor_share_pct, f.cycle_days), own = Math.round((p.pool * (f.company_pct || 20)) / 100);
  return `<div class="roiBox"><b>${p.ann}%</b> a year for investors <small>(${p.cyc}% over ${f.cycle_days} days)</small><div class="sub">You earn about $${num(p.mgr + own)} (manager share $${num(p.mgr)} + profit on your capital $${num(own)}). Your capital: $${num(((f.target || 0) * (f.company_pct || 20)) / 100)}.</div></div>`;
}
views.coNew = gated('coNew', {
  load: async () => { Object.assign(S.form, { category: S.form.category || 'Food', company_pct: S.form.company_pct || 20, investor_share_pct: S.form.investor_share_pct || 40 }); return {}; },
  html: () => `<h1>List a shipment</h1><p class="sub">The goods can be sourced anywhere and sold to a buyer anywhere. Our team reviews every listing. Once approved you pay your capital and it goes live. All amounts are in US dollars.</p>
    ${field('Shipment name', 'name', { ph: 'e.g. Basmati rice, 1×40ft' })}${field('Category', 'category', { opts: CATS })}${field('Goods sourced from (where they ship from)', 'from_country', { opts: countryOpts() })}${field('Buyer is in (where they are sold)', 'to_country', { opts: countryOpts() })}
    ${field('Total cycle (days)', 'cycle_days', { type: 'number' })}${field('Funding target (USD)', 'target', { type: 'number' })}${field('Your capital (% of target, minimum 20)', 'company_pct', { type: 'number' })}
    ${field('Minimum investment (USD)', 'min_invest', { type: 'number' })}${field('Expected profit on the shipment (USD)', 'expected_profit', { type: 'number' })}${field('Investor share of profit (% , minimum 40)', 'investor_share_pct', { type: 'number' })}
    ${field('Product certificate (optional)', 'product_cert', { ph: 'e.g. ISO 22000, organic certificate number' })}
    <div id="roi">${preview()}</div><button class="btn" data-act="createListing">Submit for review</button>`,
});
acts['live:*'] = () => { const e = document.getElementById('roi'); if (e && S.route.name === 'coNew') e.innerHTML = preview(); };
acts.createListing = () => busy(async () => {
  const f = S.form, body = {}; ['name', 'category', 'from_country', 'to_country', 'cycle_days', 'target', 'company_pct', 'min_invest', 'expected_profit', 'investor_share_pct', 'product_cert'].forEach((k) => { body[k] = f[k]; });
  await api('POST', '/company/listings', body); ['name', 'cycle_days', 'target', 'min_invest', 'expected_profit', 'product_cert'].forEach((k) => delete f[k]); toast('Submitted for review'); await go('coShips');
});
