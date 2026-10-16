import { S, esc, num, usd, usdx, dt, dday, api, views, acts, go, reload, render, toast, busy, can, RL, door, route, roiK, voy, stages, progress, table, ln, field, openDoc, mini, ST, META, cname, show } from './core.js';

const KYC_LABELS = { name: 'Full name', dob: 'Date of birth', nationality: 'Nationality', residence: 'Lives in', address: 'Address', city: 'City', id_type: 'ID type', id_number: 'ID number', phone: 'Phone', occupation: 'Occupation', source_of_funds: 'Source of funds', email: 'Email' };
const CO_LABELS = { manager_type: 'Type', company_name: 'Business or trading name', registration_no: 'Registration no.', registered_in: 'Registered in (region)', residence: 'Country', address: 'Address', city: 'City', activities: 'Activities', owner_name: 'Owner', owner_nationality: 'Owner nationality', owner_id_type: 'Owner ID type', owner_id_number: 'Owner ID no.', phone: 'Phone', email: 'Email', years_in_business: 'Years trading', shipments_exported: 'Shipments exported' };
const DOC_LABELS = { id_document: 'Photo ID', proof_of_address: 'Proof of address', business_registration: 'Business registration', owner_id: 'Owner photo ID', company_profile: 'Company profile' };
const reviewerName = (rs, id) => { const r = rs.find((x) => x.id === id); return r ? r.name : 'Unassigned'; };
const assignSel = (rs, kind, id, cur) => can('review') ? `<label class="fld">Assigned to</label><select data-on="assign" data-kind="${kind}" data-arg="${id}" aria-label="Assign reviewer"><option value="">Unassigned</option>${rs.map((r) => `<option value="${r.id}"${r.id === cur ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select>` : '';
const docLinks = (docs) => Object.entries(docs).map(([k, id]) => `<button class="lnk" data-act="viewDoc" data-arg="${id}">${esc(DOC_LABELS[k] || k)}</button>`).join(' · ') || '<span class="muted">None</span>';
const decideBtns = (kind, id, ok = 'Approve') => can('review') ? `<div class="inl" style="margin-top:10px"><button class="btn sm2" data-act="approve" data-kind="${kind}" data-arg="${id}">${ok}</button><button class="btn sm2 alt" data-act="rejectAsk" data-kind="${kind}" data-arg="${id}">Reject</button></div>` : '';
acts.viewDoc = (el) => openDoc(el.dataset.arg);

// ---------- Overview ----------
views.adHome = {
  load: async () => ({ ships: (await api('GET', '/admin/listings')).listings, check: can('team') ? await api('GET', '/admin/ledger-check') : null }),
  html: ({ ships, check }) => {
    const by = (s) => ships.filter((l) => l.status === s), b = S.badges || {};
    const raised = by('live').reduce((s, l) => s + l.raised, 0);
    return `<h1>Hello, ${esc(S.user.name)}</h1><p class="sub">${RL[S.user.staff_role]} · ${esc(S.user.email)}</p>
    <div class="kpi" style="margin:10px 0"><div class="k2"><b>${b.review || 0}</b><span>To review</span></div><div class="k2"><b>${by('live').length}</b><span>Live shipments</span></div><div class="k2"><b>${usd(raised)}</b><span>Raised, live</span></div></div>
    <div class="kpi" style="margin:10px 0"><div class="k2"><b>${b.overdue || 0}</b><span>Funding overdue</span></div><div class="k2"><b>${b.wd || 0}</b><span>Withdrawals waiting</span></div><div class="k2"><b>${by('completed').length}</b><span>Completed</span></div></div>
    ${check ? `<div class="${check.ok ? 'note' : 'warn'}">Ledger check: ${check.ok ? 'every transaction balances.' : 'PROBLEM FOUND. Do not release money; contact engineering.'}</div>` : ''}
    ${b.overdue ? `<div class="warn"><b>${b.overdue} shipment(s) not fully funded after 5 days.</b> <button class="lnk" data-act="nav" data-arg="adOver">Open</button></div>` : ''}`;
  },
};

// ---------- Review (investors / companies / new listings / deposits) ----------
views.adReview = {
  load: async () => {
    const o = { rs: (await api('GET', '/admin/reviewers')).reviewers };
    if (can('review')) { o.inv = (await api('GET', '/admin/applications/investors?status=pending')).applications; o.co = (await api('GET', '/admin/applications/companies?status=pending')).applications; o.ls = (await api('GET', '/admin/listings?status=pending_review')).listings; }
    if (can('deposit')) o.dep = (await api('GET', '/admin/listings?status=awaiting_deposit')).listings;
    return o;
  },
  html: (d) => {
    const tabs = [['inv', 'Investors', d.inv], ['co', 'Managers', d.co], ['ls', 'New listings', d.ls], ['dep', 'Deposits', d.dep]].filter((t) => t[2]);
    const cur = tabs.find((t) => t[0] === S.form.rtab) || tabs[0];
    const body = !cur ? '' : cur[0] === 'inv' ? d.inv.map((a) => appCard(a, d.rs, KYC_LABELS, 'app')).join('') : cur[0] === 'co' ? d.co.map((a) => appCard(a, d.rs, CO_LABELS, 'app')).join('') : cur[0] === 'ls' ? d.ls.map((l) => listingReview(l, d.rs)).join('') : d.dep.map(depositCard).join('');
    return `<h1>Review</h1><div class="tabs">${tabs.map((t) => `<button class="pill${cur && cur[0] === t[0] ? ' on' : ''}" data-act="rtab" data-arg="${t[0]}">${t[1]}<span class="badge">${t[2].length}</span></button>`).join('')}</div>${cur && cur[2].length ? body : '<div class="empty">Nothing waiting. All clear.</div>'}`;
  },
};
acts.rtab = (el) => { S.form.rtab = el.dataset.arg; render(); };
function appCard(a, rs, labels) {
  return `<div class="card"><div class="row"><b>${esc(a.data.company_name || a.data.name)}</b><span class="sub">Submitted ${dday(a.submitted_at)}</span></div>${table('', Object.keys(labels).map((k) => [labels[k], show(k, a.data[k])]))}<p class="sub"><b>Documents:</b> ${docLinks(a.docs)}</p>${assignSel(rs, 'app', a.id, a.assigned_to)}${decideBtns('app', a.id)}</div>`;
}
function listingReview(l, rs) {
  const c = l.company && l.company.data;
  return `<div class="card"><div class="row"><b>${esc(l.name)}</b><span class="chip">${esc(l.category)}</span></div><div class="rt">${route(l)}</div>
  ${table('Terms', [['Goods sourced from', esc(cname(l.from_country))], ['Buyer in', esc(cname(l.to_country))], ['Product certificate', esc(l.product_cert || 'None')], ['Funding target', usd(l.target)], ['Cycle', l.cycle_days + ' days'], ['Expected profit', usd(l.expected_profit)], ['Manager capital', `${l.company_pct}% (${usd(l.company_deposit)})`], ['Investor share', l.investor_share_pct + '%'], ['Minimum investment', usd(l.min_invest)], ['Investor ROI', `${l.roi_annual_pct}% a year (${l.roi_cycle_pct}% over ${l.cycle_days} days)`], ['Manager share', usd(l.company_expected.manager_share)]])}
  ${c ? table('Manager', [['Name', esc(c.company_name)], ['Type', show('manager_type', c.manager_type)], ['Based in', show('residence', c.residence)], ['Registration no.', esc(c.registration_no || 'None (individual)')], ['Shipments exported', esc(c.shipments_exported)], ['Years trading', esc(c.years_in_business)]]) : ''}${assignSel(rs, 'listing', l.id, l.assigned_to)}${decideBtns('listing', l.id, 'Approve listing')}</div>`;
}
function depositCard(l) {
  return `<div class="card"><div class="row"><b>${esc(l.name)}</b><span class="chip">${l.company_paid ? 'Company says paid' : 'Waiting for company'}</span></div>${table('', [['Manager', esc((l.company && l.company.data.company_name) || '')], ['Deposit due (USD)', usd(l.company_deposit)], ['Reference', 'LISTING-' + l.id]])}
  <label class="fld" for="ref${l.id}">Bank reference of the transfer</label><div class="inl"><input id="ref${l.id}" type="text" data-bind="ref${l.id}" value="${esc(S.form['ref' + l.id] || '')}"><button class="btn sm2" data-act="confirmDep" data-arg="${l.id}">Confirm received</button></div></div>`;
}
acts.assign = (el) => busy(async () => { const v = el.value ? Number(el.value) : null; await api('POST', el.dataset.kind === 'app' ? `/admin/applications/${el.dataset.arg}/assign` : `/admin/listings/${el.dataset.arg}/assign`, { staff_id: v }); toast('Assigned'); await reload(); });
acts.approve = (el) => busy(async () => { await api('POST', el.dataset.kind === 'app' ? `/admin/applications/${el.dataset.arg}/decision` : `/admin/listings/${el.dataset.arg}/decision`, { approve: true }); toast('Approved'); await reload(); });
acts.rejectAsk = (el) => { S.rej = { kind: el.dataset.kind, id: el.dataset.arg }; S.form.rejReason = ''; S.sheet = () => `<div class="scrim" data-act="closeSheet"></div><div class="panel" role="dialog" aria-modal="true" aria-label="Reject"><h3 style="margin:0">Reason for rejecting</h3><p class="sub">The applicant will see this, so say what they need to fix.</p><textarea id="rejReason" rows="4" data-bind="rejReason" aria-label="Reason"></textarea><div class="inl" style="margin-top:10px"><button class="btn sm2" data-act="rejectGo">Reject</button><button class="btn sm2 alt" data-act="closeSheet">Cancel</button></div></div>`; render(); };
acts.rejectGo = () => busy(async () => { const r = S.rej; if (!(S.form.rejReason || '').trim()) { toast('Give a reason'); return; } await api('POST', r.kind === 'app' ? `/admin/applications/${r.id}/decision` : `/admin/listings/${r.id}/decision`, { approve: false, reason: S.form.rejReason }); S.sheet = null; toast('Rejected'); await reload(); });
acts.confirmDep = (el) => busy(async () => { await api('POST', `/admin/listings/${el.dataset.arg}/confirm-deposit`, { bank_ref: S.form['ref' + el.dataset.arg] }); toast('Deposit confirmed. Listing is live.'); await reload(); });

// ---------- Overdue ----------
views.adOver = {
  load: async () => (await api('GET', '/admin/overdue')).listings,
  html: (ls) => `<h1>Funding overdue</h1><p class="sub">Not fully funded after 5 days. Fund the balance from platform capital, or wait.</p>${ls.length ? ls.map((l) => `<div class="card"><div class="row"><b>${esc(l.name)}</b><span class="chip">${l.days_open} days open</span></div><div class="bar"><i style="width:${l.funded_pct}%"></i></div><div class="row fb"><span>${usd(l.raised)} of ${usd(l.target)}</span><span>${usd(l.remaining)} left</span></div><button class="btn" data-act="fundRest" data-arg="${l.id}" data-amt="${l.remaining}">Fund remaining ${usd(l.remaining)}</button></div>`).join('') : '<div class="empty">Nothing overdue.</div>'}`,
};
acts.fundRest = (el) => busy(async () => { await api('POST', `/admin/listings/${el.dataset.arg}/fund-remaining`); toast('Funded from platform capital'); await reload(); });

// ---------- Shipments ----------
views.adShips = {
  load: async () => (await api('GET', '/admin/listings')).listings,
  html: (ls) => {
    const f = (S.form.sfilter || 'all'), q = (S.form.sq || '').toLowerCase();
    const shown = ls.filter((l) => (f === 'all' || l.status === f) && (!q || l.name.toLowerCase().includes(q) || String(l.id) === q));
    return `<h1>Shipments</h1><div class="cols" style="gap:8px;margin:10px 0"><input type="text" placeholder="Search by name or number" value="${esc(S.form.sq || '')}" data-bind="sq" data-on="sfilterGo" aria-label="Search"><select data-bind="sfilter" data-on="sfilterGo" aria-label="Status">${[['all', 'All'], ['pending_review', 'Under review'], ['awaiting_deposit', 'Awaiting deposit'], ['live', 'Live'], ['completed', 'Completed'], ['rejected', 'Rejected']].map((o) => `<option value="${o[0]}"${f === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></div>
    ${shown.length ? shown.map((l) => mini(l, 'adOpen', l.status === 'live' ? l.stage_name : l.status.replace('_', ' '), `${l.funded_pct}% funded · ${usd(l.target)}`, l.funded_pct)).join('') : '<div class="empty">No shipments.</div>'}`;
  },
};
acts.sfilterGo = () => render();
acts.adOpen = (el) => go('adDetail', { id: el.dataset.arg });
views.adDetail = {
  load: (p) => api('GET', '/admin/listings/' + p.id),
  html: (l) => {
    const live = l.status === 'live', nextI = l.stage + 1, canOps = can('ops');
    const act = !live || !canOps ? '' : l.stage === 0 ? (l.remaining > 0 ? `<div class="note">Fully fund the target to continue. ${usd(l.remaining)} still to raise.</div>${can('ops') ? `<button class="btn" data-act="fundRest" data-arg="${l.id}">Fund remaining ${usd(l.remaining)} from platform</button>` : ''}` : advForm(l, true)) : l.stage < 5 ? advForm(l, false) : `<div class="card"><h3>Enter the sale price</h3><p class="sub">Buyer paid? Enter the total sale price. Profit is settled and paid to wallets immediately.</p>${field('Sale price (USD)', 'sale', { type: 'number' })}<button class="btn" data-act="completeGo" data-arg="${l.id}">Settle and pay out</button></div>`;
    const s = l.settlement, lines = s && s.lines;
    return `<button class="ghost" data-act="nav" data-arg="adShips">← Shipments</button><h1>${esc(l.name)} <small class="muted">#${l.id}</small></h1><div class="rt">${route(l)}</div><span class="chip">${esc(l.status.replace('_', ' '))}</span> ${live ? `<span class="chip">${esc(l.stage_name)}</span>` : ''}
    ${live || l.status === 'completed' ? `<div class="bar"><i style="width:${l.funded_pct}%"></i></div><div class="row fb"><span>${usd(l.raised)} of ${usd(l.target)}</span><span>Platform funded ${usd(l.platform_funded || 0)}</span></div>${voy(l, progress(l, l.updates))}${stages(l, l.updates)}` : ''}${act}
    ${table('Terms', [['Goods sourced from', esc(cname(l.from_country))], ['Buyer in', esc(cname(l.to_country))], ['Target', usd(l.target)], ['Cycle', l.cycle_days + ' days'], ['Expected profit', usd(l.expected_profit)], ['Manager capital', `${l.company_pct}%`], ['Investor share', l.investor_share_pct + '%'], ['Cost of goods', l.cost_of_goods ? usd(l.cost_of_goods) : 'Not purchased yet']])}
    ${l.company ? table('Manager', [['Name', esc(l.company.data.company_name)], ['Type', show('manager_type', l.company.data.manager_type)], ['Based in', show('residence', l.company.data.residence)], ['Contact', esc(l.company.data.phone)], ['Documents', docLinks(l.company.docs)]]) : ''}
    ${s ? table('Settlement', [['Sale price', usd(s.revenue)], ['Cost', usd(s.cost)], ['Gross profit', usd(s.gross)], ['Platform service charge', usd(s.fee)], ['Net profit', usd(s.net)], ['Manager share', usd(s.manager_share)], ['Investor pool', usd(s.investor_pool)]]) : ''}
    ${lines ? `<h3>Payouts</h3><table class="sheet"><tbody>${lines.map((d) => `<tr><th scope="row">${esc(d.kind)}${d.user_id ? ' #' + d.user_id : ''}</th><td>${usdx(d.capital)} + profit ${usdx(d.profit)} = ${usdx(d.payout)}</td></tr>`).join('')}</tbody></table>` : ''}`;
  },
};
const advForm = (l, first) => `<div class="card"><h3>Move to: ${ST[l.stage + 1][0]}</h3>${first ? `<p class="sub">Paying the supplier moves money out of escrow.</p>${field('Cost of goods paid to supplier (USD)', 'cost', { type: 'number' })}` : ''}${field('Note for investors (optional)', 'note')}<button class="btn" data-act="advanceGo" data-arg="${l.id}" data-first="${first ? 1 : 0}">Post update</button></div>`;
acts.advanceGo = (el) => busy(async () => { const body = { note: S.form.note || undefined }; if (el.dataset.first === '1') body.cost_of_goods = S.form.cost; await api('POST', `/admin/listings/${el.dataset.arg}/advance`, body); S.form.note = ''; S.form.cost = ''; toast('Update posted'); await reload(); });
acts.completeGo = (el) => busy(async () => { await api('POST', `/admin/listings/${el.dataset.arg}/complete`, { sale_price: S.form.sale }); S.form.sale = ''; toast('Settled. Wallets credited.'); await reload(); });

// ---------- Money: withdrawals + treasury ----------
views.adWd = {
  load: async () => ({ wd: (await api('GET', '/admin/withdrawals?status=pending')).withdrawals }),
  html: ({ wd }) => `<h1>Money</h1><h3>Withdrawals waiting</h3>${wd.length ? wd.map((w) => `<div class="card"><div class="row"><b>${esc(w.user_name)}</b><b>${usd(w.amount)}</b></div>${table('', [['Account holder', esc(w.bank ? w.bank.account_holder : '')], ['Bank', esc(w.bank ? w.bank.bank_name : '')], ['Bank country', w.bank ? show('bank_country', w.bank.bank_country) : ''], ['IBAN or account no.', esc(w.iban)], ['SWIFT/BIC', esc(w.bank ? w.bank.swift : '')], ['Requested', dt(w.created_at)]])}${w.amount >= META.limits.largeWithdrawal * 100 ? `<p class="sub">${usd(META.limits.largeWithdrawal * 100)} or more: owner approval only.</p>` : ''}<label class="fld" for="wr${w.id}">Bank reference (after you paid)</label><input id="wr${w.id}" type="text" data-bind="wr${w.id}" value="${esc(S.form['wr' + w.id] || '')}"><div class="inl" style="margin-top:10px"><button class="btn sm2" data-act="wdOk" data-arg="${w.id}">Mark paid</button><button class="btn sm2 alt" data-act="wdNo" data-arg="${w.id}">Reject</button></div></div>`).join('') : '<div class="empty">No withdrawals waiting.</div>'}
    ${can('deposit') ? `<h3>Platform treasury</h3><p class="sub">Record funds you moved into the platform account. This is the pool used to fund unfunded balances.</p>${field('Amount (USD)', 'tAmt', { type: 'number' })}${field('Bank reference', 'tRef')}<button class="btn" data-act="treasury">Record top-up</button>` : ''}`,
};
acts.wdOk = (el) => busy(async () => { await api('POST', `/admin/withdrawals/${el.dataset.arg}/decision`, { approve: true, bank_ref: S.form['wr' + el.dataset.arg] }); toast('Marked paid'); await reload(); });
acts.wdNo = (el) => busy(async () => { const r = (S.form['wr' + el.dataset.arg] || '').trim(); if (!r) { toast('Type the reason in the reference box first'); return; } await api('POST', `/admin/withdrawals/${el.dataset.arg}/decision`, { approve: false, reason: r }); toast('Rejected, funds returned'); await reload(); });
acts.treasury = () => busy(async () => { await api('POST', '/admin/treasury/topup', { amount_usd: S.form.tAmt, bank_ref: S.form.tRef }); S.form.tAmt = ''; S.form.tRef = ''; toast('Recorded'); await reload(); });

// ---------- Team + audit ----------
views.adTeam = {
  load: async () => ({ staff: (await api('GET', '/admin/staff')).staff, audit: (await api('GET', '/admin/audit?limit=60')).audit }),
  html: ({ staff, audit }) => `<h1>Team</h1>${staff.map((u) => `<div class="card"><div class="row"><b>${esc(u.name)}</b><span class="chip">${RL[u.staff_role]}${u.active ? '' : ' · off'}</span></div><div class="sub">${esc(u.email)}</div>${u.id !== S.user.id ? `<div class="inl" style="margin-top:8px"><select data-on="staffRole" data-arg="${u.id}" aria-label="Role">${Object.keys(RL).map((r) => `<option value="${r}"${u.staff_role === r ? ' selected' : ''}>${RL[r]}</option>`).join('')}</select><button class="btn sm2 alt" data-act="staffToggle" data-arg="${u.id}" data-active="${u.active ? 0 : 1}">${u.active ? 'Turn off' : 'Turn on'}</button></div>` : ''}</div>`).join('')}
    <h3>Add a team member</h3>${field('Name', 'sName')}${field('Email', 'sEmail', { type: 'email' })}${field('Temporary password (10+ characters)', 'sPass', { type: 'password' })}${field('Role', 'sRole', { opts: ['reviewer', 'ops', 'finance', 'owner'] })}<button class="btn" data-act="staffAdd">Add</button>
    <h3>Activity log</h3><div class="wide"><table class="sheet"><tbody>${audit.map((a) => `<tr><th scope="row">${dt(a.at || a.created_at)}</th><td>${esc(a.actor_name || 'System')} · ${esc(a.action)} ${esc(a.entity || '')} ${esc(a.entity_id || '')}</td></tr>`).join('')}</tbody></table></div>`,
};
acts.staffAdd = () => busy(async () => { await api('POST', '/admin/staff', { name: S.form.sName, email: S.form.sEmail, password: S.form.sPass, staff_role: S.form.sRole || 'reviewer' }); ['sName', 'sEmail', 'sPass'].forEach((k) => { S.form[k] = ''; }); toast('Added'); await reload(); });
acts.staffRole = (el) => busy(async () => { await api('PATCH', `/admin/staff/${el.dataset.arg}`, { staff_role: el.value }); toast('Role changed'); await reload(); });
acts.staffToggle = (el) => busy(async () => { await api('PATCH', `/admin/staff/${el.dataset.arg}`, { active: el.dataset.active === '1' }); await reload(); });
