import { S, esc, num, usd, usdx, dt, api, views, acts, go, reload, render, toast, busy, card, door, route, roiK, voy, stages, progress, table, ln, field, docBox, openDoc, META, cname, countryOpts, idTypeOpts, show, CATS, ST } from './core.js';

const KYC_DOCS = [['id_document', 'Government photo ID (passport, national ID, driving licence or residence permit)'], ['proof_of_address', 'Proof of address (a recent utility bill or bank statement)']];
// [key, label, kind or input type, placeholder]. Works for investors in any country.
export const KYC_FIELDS = [['name', 'Full name as on your ID'], ['dob', 'Date of birth', 'date'], ['nationality', 'Nationality', 'country-all'], ['residence', 'Country you live in', 'country'], ['address', 'Home address'], ['city', 'City'], ['id_type', 'ID type', 'idtype'], ['id_number', 'ID number'], ['phone', 'Mobile number with country code', 'text', '+1 555 010 0000'], ['occupation', 'Occupation'], ['source_of_funds', 'Source of funds (salary, savings, business…)']];
const kycStatus = () => (S.me && S.me.kyc && S.me.kyc.status) || 'none';
async function refreshMe() { S.me = await api('GET', '/me'); }
export const kycField = (f) => (f[2] === 'country' || f[2] === 'country-all' ? field(f[1], f[0], { opts: countryOpts('Select a country', f[2] === 'country-all') }) : f[2] === 'idtype' ? field(f[1], f[0], { opts: idTypeOpts() }) : field(f[1], f[0], { type: f[2] || 'text', ph: f[3] || '' }));
const blockedNote = () => (META.blocked.length ? `<p class="sub">We cannot accept residents of ${META.blocked.map((c) => esc(cname(c))).join(', ')} at the moment.</p>` : '');

function gate() {
  const k = kycStatus();
  if (k === 'approved') return '';
  const msg = { none: 'Complete your KYC to start investing. It takes about 3 minutes.', draft: 'Finish your KYC to start investing.', pending: 'Your KYC is under review. You can browse now and invest once it is approved.', rejected: 'Your KYC needs changes. Open it to see why and send it again.' }[k];
  return `<div class="gate"><b>${k === 'pending' ? 'KYC under review' : 'KYC required'}</b><p class="sub">${msg}</p>${k === 'pending' ? '' : '<button class="btn sm2" data-act="openKyc">' + (k === 'rejected' ? 'Fix and resubmit' : 'Start KYC') + '</button>'}</div>`;
}

// ---------- Explore ----------
views.explore = {
  load: async () => { const f = S.form, p = new URLSearchParams(); if (f.fcat) p.set('category', f.fcat); if (f.ffrom) p.set('from', f.ffrom); if (f.fto) p.set('to', f.fto); if (f.fq) p.set('q', f.fq); return api('GET', '/listings?' + p); },
  html: (d) => {
    const sel = (key, label, opts) => `<select data-bind="${key}" data-on="applyFilter" aria-label="${label}"><option value="">${label}</option>${opts.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${S.form[key] === v ? ' selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
    const places = countryOpts().slice(1);
    return `<h1>Explore shipments</h1><p class="sub">Funded shipments settle in the cycle shown. Profit is shared between investors, the manager and the platform. All amounts are in US dollars.</p>${gate()}
    <div class="cols" style="gap:8px;margin:10px 0"><input type="text" placeholder="Search by name" value="${esc(S.form.fq || '')}" data-bind="fq" data-on="applyFilter" aria-label="Search">${sel('fcat', 'All categories', CATS)}${sel('ffrom', 'Sourced from', places)}${sel('fto', 'Sold in', places)}</div>
    ${d.listings.length ? d.listings.map((l) => card(l, 'openDetail')).join('') : '<div class="empty">No shipments match right now. Check back soon.</div>'}`;
  },
};
acts.applyFilter = () => reload();
acts.openDetail = (el) => go('detail', { id: el.dataset.arg });
acts.openKyc = () => go('kyc');

// ---------- Detail + invest ----------
views.detail = {
  load: (p) => api('GET', '/listings/' + p.id),
  html: (l) => {
    const open = l.status === 'live' && l.stage === 0 && l.remaining > 0, k = kycStatus();
    return `<button class="ghost" data-act="nav" data-arg="${S.me && S.user.role === 'investor' ? (S.form.from === 'portfolio' ? 'portfolio' : 'explore') : 'explore'}">← Back</button>
    <div style="margin-top:10px">${door(l, 'big')}</div><h1>${esc(l.name)}</h1><div class="rt">${route(l)}</div>
    <div class="kpi" style="margin:12px 0"><div class="k1">${roiK(l)}</div><div class="k2"><b>${l.cycle_days}<small> days</small></b><span>Total cycle</span></div><div class="k2"><b>${l.investor_share_pct}%</b><span>Your profit share</span></div></div>
    <div class="bar"><i style="width:${l.funded_pct}%"></i></div><div class="row fb"><span>${usd(l.raised)} of ${usd(l.target)}</span><span>${l.funded_pct}% funded</span></div>
    ${l.my_invested ? `<div class="note">You have invested <b>${usd(l.my_invested)}</b> in this shipment.</div>` : ''}
    ${table('Terms', [['Goods sourced from', `${esc(cname(l.from_country))}`], ['Sold to a buyer in', `${esc(cname(l.to_country))}`], ['Minimum investment', usd(l.min_invest)], ['Your share of profit', l.investor_share_pct + '%'], ['Expected return', `${l.roi_annual_pct}% a year (${l.roi_cycle_pct}% over ${l.cycle_days} days)`], ['Platform service charge', '1% of invoice value, only if the trade makes a profit'], ['Structure', 'Profit-sharing: profit is shared as agreed, and losses are borne by the people who put in capital']])}
    ${l.stage > 0 || l.status === 'completed' ? `<h3>Shipment tracking</h3>${voy(l, progress(l, l.updates))}${stages(l, l.updates)}` : ''}
    ${l.settlement ? table('Result', [['Sale price', usd(l.settlement.revenue)], ['Profit for investors', usd(l.settlement.investor_pool)]]) : ''}
    ${open ? `<div class="invbox">${gate()}${k === 'approved' ? `<label class="fld" for="amt">Amount to invest (USD)</label><input id="amt" type="number" inputmode="decimal" min="${l.min_invest / 100}" placeholder="Min ${num(l.min_invest / 100)}" data-bind="amt" value="${S.form.amt || ''}"><button class="btn" data-act="invest" data-arg="${l.id}">Invest</button><p class="sub">Funds move from your wallet to the shipment's escrow. Remaining to fund: ${usd(l.remaining)}. Returns are estimates, not guarantees, and you can lose some or all of what you invest.</p>` : ''}</div>` : '<p class="sub">This shipment is not open for new investment.</p>'}`;
  },
};
acts.invest = (el) => busy(async () => {
  const amt = Number(S.form.amt); if (!amt) { toast('Enter an amount'); return; }
  await api('POST', `/listings/${el.dataset.arg}/invest`, { amount: amt });
  S.form.amt = ''; toast('Invested. Thank you.'); await reload();
});

// ---------- KYC ----------
views.kyc = {
  load: async () => { const k = await api('GET', '/kyc'); if (k.status !== 'pending' && k.status !== 'approved' && k.data && !S.form._kycLoaded) { Object.assign(S.form, k.data); S.form._kycLoaded = true; } if (k.docs && !Object.keys(S.docs).length) Object.entries(k.docs).forEach(([kind, id]) => { S.docs[kind] = { id, filename: 'Uploaded earlier' }; }); return k; },
  html: (k) => {
    if (k.status === 'pending' || k.status === 'approved') return `<h1>KYC</h1><div class="note">${k.status === 'approved' ? 'Your KYC is approved. You can invest.' : 'Submitted. We are reviewing your documents. This usually takes one working day.'}</div>${table('Submitted details', KYC_FIELDS.map((f) => [f[1], show(f[0], k.data[f[0]])]))}`;
    return `<h1>Verify your identity</h1><p class="sub">We verify every investor, wherever they live, to meet anti-money-laundering rules before you can invest.</p>${blockedNote()}${k.status === 'rejected' ? `<div class="warn"><b>Not approved:</b> ${esc(k.reason)}</div>` : ''}
    ${KYC_FIELDS.map(kycField).join('')}${field('Email', 'email', { type: 'email' })}
    <h3>Documents</h3><p class="sub">PNG, JPG or PDF, up to 5 MB each.</p>${KYC_DOCS.map((d) => docBox(d[0], d[1])).join('')}
    <label class="chk"><input type="checkbox" data-bind="ack"${S.form.ack ? ' checked' : ''}> I confirm these details are true and I understand investments can lose value.</label>
    <button class="btn" data-act="submitKyc">Submit for review</button>`;
  },
};
acts.submitKyc = () => busy(async () => {
  const data = {}; KYC_FIELDS.forEach((f) => { data[f[0]] = S.form[f[0]]; }); data.email = S.form.email || S.user.email; data.ack = !!S.form.ack;
  const docs = {}; KYC_DOCS.forEach((d) => { if (S.docs[d[0]]) docs[d[0]] = S.docs[d[0]].id; });
  await api('PUT', '/kyc', { data, docs }); await refreshMe(); S.docs = {}; toast('Submitted for review'); await go('kyc');
});

// ---------- Portfolio + tracking ----------
// Larger holding card. Motion class follows the shipment stage (0–6).
function held(x) {
  const l = x.listing, done = l.status === 'completed';
  const stage = done ? 6 : Math.max(0, Math.min(6, l.stage | 0));
  const pct = done ? 100 : Math.round((stage / 6) * 100);
  const fig = done
    ? `<div class="k2"><b>${usd(x.profit || 0)}</b><span>Profit received</span></div>`
    : `<div class="k2"><b>${stage + 1}<small>/7</small></b><span>Stage</span></div>`;
  return `<div class="ship held st${stage}" tabindex="0" data-act="openTrack" data-arg="${l.id}">
    <div class="hull">${door(l)}<div class="sb"><div class="row"><div class="nm">${esc(l.name)}</div><span class="chip">${esc(l.stage_name || ST[stage][0])}</span></div>
    <div class="rt">${route(l)}</div>
    <div class="kpi"><div class="k1"><b>${usd(x.invested)}</b><span>You invested</span></div>${fig}</div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="fb">${esc(ST[stage][1])}</div></div></div><span class="mot" aria-hidden="true"></span></div>`;
}
views.portfolio = {
  load: () => api('GET', '/portfolio'),
  html: (d) => {
    const p = d.portfolio, inv = p.reduce((s, x) => s + x.invested, 0), prof = p.reduce((s, x) => s + (x.profit || 0), 0), exp = p.filter((x) => x.listing.status !== 'completed').reduce((s, x) => s + x.expected_profit, 0);
    return `<h1>My portfolio</h1><div class="kpi" style="margin:10px 0"><div class="k2"><b>${usd(inv)}</b><span>Invested</span></div><div class="k2"><b>${usd(exp)}</b><span>Expected profit</span></div><div class="k2"><b>${usd(prof)}</b><span>Profit earned</span></div></div>
    ${p.length ? p.map(held).join('') : '<div class="empty">You have not invested yet. Explore shipments to begin.</div>'}`;
  },
};
acts.openTrack = (el) => go('track', { id: el.dataset.arg });
views.track = {
  load: async (p) => { const [l, pf] = await Promise.all([api('GET', '/listings/' + p.id), api('GET', '/portfolio')]); return { l, mine: pf.portfolio.find((x) => x.listing.id === l.id) }; },
  html: ({ l, mine }) => `<button class="ghost" data-act="nav" data-arg="portfolio">← Portfolio</button><h1>${esc(l.name)}</h1><div class="rt">${route(l)}</div>${voy(l, progress(l, l.updates))}${stages(l, l.updates)}
    ${mine ? table('Your investment', [['Invested', usd(mine.invested)], [l.status === 'completed' ? 'Profit received' : 'Expected profit', usd(l.status === 'completed' ? mine.profit : mine.expected_profit)], ...(l.status === 'completed' ? [['Paid to wallet', usd(mine.paid_out)]] : [])]) : ''}
    ${l.settlement ? table('How the profit was worked out', [['Sale price', usd(l.settlement.revenue)], ['Cost of goods', usd(l.settlement.cost)], ['Gross profit', usd(l.settlement.gross)], ['Platform service charge (1% of invoice)', usd(l.settlement.fee)], ['Net profit', usd(l.settlement.net)], ['Shared among investors', usd(l.settlement.investor_pool)]]) : ''}`,
};

// ---------- Wallet ----------
export const bankForm = () => `${field('Bank country', 'wdCountry', { opts: countryOpts('Select the bank’s country') })}${field('Bank name', 'wdBank')}${field('Account holder name (must be your own name)', 'wdHolder')}${field('IBAN or account number', 'wdAcct')}${field('Bank SWIFT/BIC code', 'wdSwift', { ph: 'e.g. EBILAEAD' })}`;
views.wallet = {
  load: async () => { const [w, wd] = await Promise.all([api('GET', '/wallet'), api('GET', '/wallet/withdrawals')]); return { w, wd: wd.withdrawals }; },
  html: ({ w, wd }) => `<h1>Wallet</h1><div class="wal"><span>Available balance (USD)</span><b>${usdx(w.balance)}</b></div>
    ${S.dev ? (S.showSandbox ? `<div class="demo"><b>Sandbox only:</b> add test money (hidden in production)<div class="inl" style="margin-top:8px"><input type="number" placeholder="USD" data-bind="topup" value="${S.form.topup || ''}" aria-label="Top-up amount in US dollars"><button class="btn sm2" data-act="topup">Add</button></div><button class="lnk" style="margin-top:8px" data-act="toggleSandbox">Hide</button></div>` : `<button class="lnk" data-act="toggleSandbox">Show sandbox tools</button>`) : `<div class="note">To add money, send US dollars from your bank to the Shehnat account quoting your reference <b>SHE-${S.user.id}</b>. It appears here once received.</div>`}
    <h3>Withdraw</h3>${kycStatus() === 'approved' || S.user.role === 'company' ? `${field('Amount (USD)', 'wdAmt', { type: 'number' })}${bankForm()}<button class="btn" data-act="withdraw">Request withdrawal</button><p class="sub">Withdrawals are paid in US dollars to a bank account in your own name, after review. Withdrawals of ${usd(META.limits.largeWithdrawal * 100)} or more need extra approval, so allow more time. Your bank may charge its own fees.</p>` : '<p class="sub">Withdrawals open after your KYC is approved.</p>'}
    ${wd.length ? `<h3>Withdrawals</h3><table class="sheet"><tbody>${wd.map((x) => `<tr><th scope="row">${dt(x.created_at)}</th><td>${usd(x.amount)} · ${esc(x.status)}</td></tr>`).join('')}</tbody></table>` : ''}
    <h3>Statement</h3>${w.statement.length ? w.statement.map((s) => `<div class="ln"><span>${esc(s.memo || s.kind)}<br><small class="muted">${dt(s.at)}</small></span><b class="${s.amount < 0 ? 'neg' : ''}">${s.amount < 0 ? '−' : '+'}${usd(Math.abs(s.amount))}</b></div>`).join('') : '<div class="empty">No activity yet.</div>'}`,
};
acts.toggleSandbox = () => { S.showSandbox = !S.showSandbox; render(); };
acts.topup = () => busy(async () => { await api('POST', '/dev/topup', { amount_usd: Number(S.form.topup) }); S.form.topup = ''; toast('Added'); await reload(); });
acts.withdraw = () => busy(async () => {
  const f = S.form;
  await api('POST', '/wallet/withdrawals', { amount: Number(f.wdAmt), bank_country: f.wdCountry, bank_name: f.wdBank, account_holder: f.wdHolder, account: f.wdAcct, swift: f.wdSwift });
  ['wdAmt', 'wdAcct'].forEach((k) => { f[k] = ''; }); toast('Withdrawal requested'); await reload();
});
