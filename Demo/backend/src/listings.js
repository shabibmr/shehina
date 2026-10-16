'use strict';
const { q, tx } = require('./db');
const cfg = require('./config');
const L = require('./ledger');
const { bad, forbidden, notFound, conflict, str, optStr, int, usdToCents } = require('./util');
const { audit } = require('./audit');
const { can } = require('./perms');
const apps = require('./applications');
const S = require('./settlement');
const C = require('./countries');
const LIM = cfg.limits;

const STAGES = ['Funding open', 'Goods purchased', 'Loaded at port', 'At sea', 'Customs cleared', 'Goods sold', 'Profit paid out'];
const CATEGORIES = ['Food', 'Building', 'Textiles', 'Energy', 'Other'];

const raised = (id) => q.one('SELECT COALESCE(SUM(amount),0) AS s FROM contributions WHERE listing_id = ?', id).s;
const contribs = (id) => q.all('SELECT * FROM contributions WHERE listing_id = ? ORDER BY id', id);
const getL = (id) => { const l = q.one('SELECT * FROM listings WHERE id = ?', id); if (!l) throw notFound('Listing not found'); return l; };
const companyDeposit = (l) => Math.round((l.target * l.company_pct) / 100);

function create(user, b) {
  if (user.role !== 'company') throw forbidden('Only managers list shipments');
  if (!apps.isApproved(user.id, 'company')) throw forbidden('Your registration must be approved first');
  const name = str(b.name, 'name', { max: 120 });
  if (!CATEGORIES.includes(b.category)) throw bad('Unknown category');
  const from = C.country(b.from_country, 'Goods sourced from'), to = C.country(b.to_country, 'Goods sold in');
  if (from === to) throw bad('Choose different source and buyer countries');
  const cycle = int(b.cycle_days, 'cycle_days', { min: 1, max: 365 });
  const target = usdToCents(b.target, 'target', { min: LIM.minTarget, max: LIM.maxTarget });
  const min = usdToCents(b.min_invest, 'min_invest', { min: 1, max: LIM.maxMinInvest });
  if (min > target) throw bad('Minimum investment cannot exceed the target');
  const sp = int(b.investor_share_pct, 'investor_share_pct', { min: cfg.minInvestorSharePct, max: 95 });
  const cp = int(b.company_pct, 'company_pct', { min: cfg.minCompanyPct, max: cfg.maxCompanyPct });
  const exp = usdToCents(b.expected_profit, 'expected_profit', { min: 1, max: LIM.maxExpectedProfit });
  const cert = optStr(b.product_cert, 'product_cert', { max: 80 }) || null;
  return tx(() => {
    const r = q.run(`INSERT INTO listings (company_user_id,name,category,from_country,to_country,cycle_days,target,company_pct,min_invest,investor_share_pct,expected_profit,product_cert,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      user.id, name, b.category, from, to, cycle, target, cp, min, sp, exp, cert, 'pending_review', cfg.now());
    const id = Number(r.lastInsertRowid);
    audit(user, 'listing.create', 'listing', id);
    return view(getL(id), user);
  });
}
function review(actor, id, { approve, reason }) {
  if (!can(actor, 'review')) throw forbidden('Your role cannot review listings');
  return tx(() => {
    const l = getL(id);
    if (l.status !== 'pending_review') throw conflict('This listing is not waiting for review');
    apps.ownerOnlyIfAssigned(actor, l);
    if (approve !== true && !(typeof reason === 'string' && reason.trim())) throw bad('Give a reason when rejecting');
    q.run('UPDATE listings SET status = ? WHERE id = ?', approve === true ? 'awaiting_deposit' : 'rejected', id);
    audit(actor, approve === true ? 'listing.approve' : 'listing.reject', 'listing', id, { reason });
    return view(getL(id), actor);
  });
}
function assign(actor, id, staffId) {
  if (!can(actor, 'review')) throw forbidden();
  getL(id);
  if (staffId !== null && !q.one("SELECT 1 FROM users WHERE id=? AND role='staff' AND active=1 AND staff_role IN ('owner','reviewer')", staffId)) throw bad('Pick an active reviewer');
  q.run('UPDATE listings SET assigned_to = ? WHERE id = ?', staffId, id);
  audit(actor, 'listing.assign', 'listing', id, { to: staffId });
  return view(getL(id), actor);
}
function markDepositSent(user, id) {
  const l = getL(id);
  if (user.role !== 'company' || l.company_user_id !== user.id) throw forbidden();
  if (l.status !== 'awaiting_deposit') throw conflict('No deposit is due for this listing');
  q.run('UPDATE listings SET company_paid = 1 WHERE id = ?', id);
  audit(user, 'listing.deposit_sent', 'listing', id);
  return view(getL(id), user);
}
// Finance confirms the bank received the company's deposit. Only then does the listing go live.
function confirmDeposit(actor, id, bankRef) {
  if (!can(actor, 'deposit')) throw forbidden('Your role cannot confirm deposits');
  const ref = str(bankRef, 'bank_ref', { max: 100 });
  return tx(() => {
    const l = getL(id);
    if (l.status !== 'awaiting_deposit') throw conflict('No deposit is due for this listing');
    const amt = companyDeposit(l);
    L.post({ kind: 'company_deposit', ref: `listing:${id}`, memo: `Company capital, bank ref ${ref}`, idemKey: `deposit:${id}`, lines: [{ account: L.bank(), amount: -amt }, { account: L.escrowOf(id), amount: amt }] });
    q.run('INSERT INTO contributions (listing_id, kind, user_id, amount, created_at) VALUES (?,?,?,?,?)', id, 'company', l.company_user_id, amt, cfg.now());
    q.run("UPDATE listings SET status='live', live_at=? WHERE id=?", cfg.now(), id);
    audit(actor, 'listing.deposit_confirmed', 'listing', id, { bank_ref: ref, amount: amt });
    return view(getL(id), actor);
  });
}
function invest(user, id, amountUsd) {
  if (user.role !== 'investor') throw forbidden('Only investors can invest');
  if (!apps.isApproved(user.id, 'kyc')) throw forbidden('Complete KYC and wait for approval before investing');
  const amt = usdToCents(amountUsd, 'amount', { min: 1, max: LIM.maxInvestment });
  return tx(() => {
    const l = getL(id);
    if (l.status !== 'live' || l.stage !== 0) throw conflict('This shipment is not open for funding');
    const left = l.target - raised(id);
    if (left <= 0) throw conflict('This shipment is fully funded');
    if (amt < l.min_invest) throw bad(`Minimum investment is USD ${l.min_invest / 100}`);
    if (amt > left) throw bad(`Only USD ${left / 100} is left to fund`);
    L.move(L.walletOf(user.id), L.escrowOf(id), amt, { kind: 'investment', ref: `listing:${id}`, memo: `Invested in ${l.name}` });
    q.run('INSERT INTO contributions (listing_id, kind, user_id, amount, created_at) VALUES (?,?,?,?,?)', id, 'investor', user.id, amt, cfg.now());
    audit(user, 'invest', 'listing', id, { amount: amt });
    return { listing_id: id, invested: amt, raised: raised(id), remaining: l.target - raised(id) };
  });
}
// Staff fill the unfunded balance from the platform treasury. That capital earns profit like any other.
function fundRemaining(actor, id) {
  if (!can(actor, 'ops')) throw forbidden('Your role cannot fund shipments');
  return tx(() => {
    const l = getL(id);
    if (l.status !== 'live' || l.stage !== 0) throw conflict('This shipment is not open for funding');
    const left = l.target - raised(id);
    if (left <= 0) throw conflict('Already fully funded');
    L.move(L.treasury(), L.escrowOf(id), left, { kind: 'platform_funding', ref: `listing:${id}`, memo: 'Platform funded the remaining balance' });
    q.run('INSERT INTO contributions (listing_id, kind, user_id, amount, created_at) VALUES (?,?,?,?,?)', id, 'platform', null, left, cfg.now());
    audit(actor, 'listing.fund_remaining', 'listing', id, { amount: left });
    return view(getL(id), actor);
  });
}
// Move one stage forward. Stage 0->1 needs full funding and the supplier payment (cost of goods).
function advance(actor, id, { note, cost_of_goods } = {}) {
  if (!can(actor, 'ops')) throw forbidden('Your role cannot update shipments');
  return tx(() => {
    const l = getL(id);
    if (l.status !== 'live') throw conflict('This shipment is not live');
    if (l.stage >= 5) throw conflict('Use complete to finish the shipment');
    const next = l.stage + 1;
    if (next === 1) {
      const r = raised(id);
      if (r < l.target) throw conflict('Fund the full target before buying the goods');
      const cost = usdToCents(cost_of_goods, 'cost_of_goods', { min: 1, max: LIM.maxCostOfGoods });
      if (cost > r) throw bad('Cost of goods cannot exceed the capital raised');
      L.move(L.escrowOf(id), L.bank(), cost, { kind: 'supplier_payment', ref: `listing:${id}`, memo: 'Goods purchased' });
      q.run('UPDATE listings SET cost_of_goods = ? WHERE id = ?', cost, id);
    }
    q.run('UPDATE listings SET stage = ? WHERE id = ?', next, id);
    q.run('INSERT INTO stage_updates (listing_id, stage, note, by_user, at) VALUES (?,?,?,?,?)', id, next, note ? String(note).slice(0, 500) : null, actor.id, cfg.now());
    audit(actor, 'listing.stage', 'listing', id, { stage: next, note });
    return view(getL(id), actor);
  });
}
// Complete: record the sale, split the money, pay everyone's wallet immediately. No approval step.
function complete(actor, id, { sale_price }) {
  if (!can(actor, 'ops')) throw forbidden('Your role cannot complete shipments');
  const revenue = usdToCents(sale_price, 'sale_price', { min: 0.01, max: LIM.maxSalePrice });
  return tx(() => {
    const l = getL(id);
    if (l.status !== 'live' || l.stage !== 5) throw conflict('The shipment must be at "Goods sold" before completing');
    const cs = contribs(id), esc = L.escrowOf(id);
    const r = S.compute({ contributions: cs, cost: l.cost_of_goods, revenue, investorSharePct: l.investor_share_pct });
    L.move(L.bank(), esc, revenue, { kind: 'sale_proceeds', ref: `listing:${id}`, memo: 'Buyer payment received' });
    const lines = [{ account: esc, amount: -(r.raised - r.cost + revenue) }];
    const add = (acc, amt) => { if (amt) lines.push({ account: acc, amount: amt }); };
    add(L.revenue(), r.fee);
    let companyExtra = r.manager;
    for (const ln of r.lines) {
      const acc = ln.kind === 'platform' ? L.treasury() : L.walletOf(ln.user_id);
      add(acc, ln.payout + (ln.kind === 'company' ? companyExtra : 0));
      if (ln.kind === 'company') companyExtra = 0;
    }
    L.post({ kind: 'settlement', ref: `listing:${id}`, memo: `Settlement of ${l.name}`, idemKey: `settle:${id}`, lines });
    q.run('INSERT INTO settlements (listing_id, raised, cost, revenue, gross, fee, net, manager_share, investor_pool, detail, at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', id, r.raised, r.cost, r.revenue, r.gross, r.fee, r.net, r.manager, r.pool, JSON.stringify(r.lines), cfg.now());
    q.run("UPDATE listings SET status='completed', stage=6, sale_price=?, completed_at=? WHERE id=?", revenue, cfg.now(), id);
    q.run('INSERT INTO stage_updates (listing_id, stage, note, by_user, at) VALUES (?,?,?,?,?)', id, 6, 'Profit paid out', actor.id, cfg.now());
    audit(actor, 'listing.complete', 'listing', id, { revenue, net: r.net });
    return view(getL(id), actor);
  });
}
function overdue(actor) {
  if (!can(actor, 'read')) throw forbidden();
  const cutoff = cfg.now() - cfg.overdueDays * 86400000;
  return q.all("SELECT * FROM listings WHERE status='live' AND stage=0 AND live_at <= ? ORDER BY live_at", cutoff)
    .filter((l) => raised(l.id) < l.target).map((l) => ({ ...view(l, actor), days_open: Math.floor((cfg.now() - l.live_at) / 86400000) }));
}

// ---- Views. Who sees what: investors never see the manager's own capital or profit. ----
function base(l) {
  const r = raised(l.id);
  const proj = S.projection({ target: l.target, expectedProfit: l.expected_profit, investorSharePct: l.investor_share_pct, cycleDays: l.cycle_days });
  return {
    id: l.id, name: l.name, category: l.category, from_country: l.from_country, to_country: l.to_country, cycle_days: l.cycle_days,
    target: l.target, raised: r, remaining: Math.max(0, l.target - r), funded_pct: Math.min(100, Math.floor((r * 100) / l.target)),
    min_invest: l.min_invest, investor_share_pct: l.investor_share_pct, status: l.status, stage: l.stage, stage_name: STAGES[l.stage],
    roi_cycle_pct: proj.roi_cycle_pct, roi_annual_pct: proj.roi_annual_pct, live_at: l.live_at,
  };
}
function view(l, viewer) {
  const v = base(l);
  const isStaff = viewer && viewer.role === 'staff' && can(viewer, 'read');
  const isOwner = viewer && viewer.role === 'company' && viewer.id === l.company_user_id;
  if (!isStaff && !isOwner) {                   // investors: no company capital, no manager share, no company profit
    const st = q.one('SELECT * FROM settlements WHERE listing_id = ?', l.id);
    if (st) v.settlement = { revenue: st.revenue, cost: st.cost, gross: st.gross, fee: st.fee, net: st.net, investor_pool: st.investor_pool };
    v.updates = q.all('SELECT stage, note, at FROM stage_updates WHERE listing_id = ? ORDER BY id', l.id).map((u) => ({ ...u, stage_name: STAGES[u.stage] }));
    if (viewer && viewer.role === 'investor') v.my_invested = q.one("SELECT COALESCE(SUM(amount),0) s FROM contributions WHERE listing_id=? AND user_id=? AND kind='investor'", l.id, viewer.id).s;
    return v;
  }
  v.company_pct = l.company_pct; v.company_deposit = companyDeposit(l); v.expected_profit = l.expected_profit;
  v.company_paid = !!l.company_paid; v.product_cert = l.product_cert; v.assigned_to = l.assigned_to; v.cost_of_goods = l.cost_of_goods;
  v.updates = q.all('SELECT stage, note, at FROM stage_updates WHERE listing_id = ? ORDER BY id', l.id).map((u) => ({ ...u, stage_name: STAGES[u.stage] }));
  const mine = S.projection({ target: l.target, expectedProfit: l.expected_profit, investorSharePct: l.investor_share_pct, cycleDays: l.cycle_days });
  v.company_expected = { manager_share: Math.floor((mine.net * (100 - l.investor_share_pct)) / 100), own_capital_profit: Math.round((mine.investor_pool * l.company_pct) / 100) };
  const st = q.one('SELECT * FROM settlements WHERE listing_id = ?', l.id);
  if (st) {
    const detail = JSON.parse(st.detail), co = detail.find((d) => d.kind === 'company');
    v.settlement = { revenue: st.revenue, cost: st.cost, gross: st.gross, fee: st.fee, net: st.net, manager_share: st.manager_share, investor_pool: st.investor_pool };
    if (isOwner || isStaff) v.company_result = co ? { capital: co.capital, own_capital_profit: co.profit, manager_share: st.manager_share, total_received: co.payout + st.manager_share } : null;
    if (isStaff) v.settlement.lines = detail;
  }
  if (isStaff) {
    v.company_user_id = l.company_user_id; v.platform_funded = q.one("SELECT COALESCE(SUM(amount),0) s FROM contributions WHERE listing_id=? AND kind='platform'", l.id).s;
    v.company = apps.present(q.one("SELECT * FROM applications WHERE user_id=? AND type='company'", l.company_user_id));
  }
  return v;
}
function listLive(viewer, f = {}) {
  let sql = "SELECT * FROM listings WHERE status = 'live'", a = [];
  if (f.category) { sql += ' AND category = ?'; a.push(f.category); }
  if (f.from) { sql += ' AND from_country = ?'; a.push(C.toCode(f.from) || f.from); }
  if (f.to) { sql += ' AND to_country = ?'; a.push(C.toCode(f.to) || f.to); }
  if (f.q) { sql += ' AND name LIKE ?'; a.push(`%${String(f.q).slice(0, 60)}%`); }
  return q.all(sql + ' ORDER BY live_at DESC LIMIT 200', ...a).map((l) => view(l, viewer));
}
function one(viewer, id) {
  const l = getL(id);
  const staff = viewer.role === 'staff' && can(viewer, 'read'), owner = viewer.role === 'company' && viewer.id === l.company_user_id;
  const holds = viewer.role === 'investor' && q.one("SELECT 1 FROM contributions WHERE listing_id=? AND user_id=? AND kind='investor'", id, viewer.id);
  if (!staff && !owner && !holds && l.status !== 'live') throw notFound('Listing not found');
  return view(l, viewer);
}
function forCompany(user) { return q.all('SELECT * FROM listings WHERE company_user_id = ? ORDER BY id DESC', user.id).map((l) => view(l, user)); }
function forStaff(actor, status) {
  if (!can(actor, 'read')) throw forbidden();
  return (status ? q.all('SELECT * FROM listings WHERE status = ? ORDER BY id DESC', status) : q.all('SELECT * FROM listings ORDER BY id DESC')).map((l) => view(l, actor));
}
// Investor portfolio: what I put in, current stage, and the final payout once completed.
function portfolio(user) {
  const rows = q.all("SELECT listing_id, SUM(amount) amt FROM contributions WHERE user_id = ? AND kind='investor' GROUP BY listing_id", user.id);
  return rows.map((r) => {
    const l = getL(r.listing_id), v = base(l);
    const out = { listing: v, invested: r.amt, expected_profit: Math.round((S.projection({ target: l.target, expectedProfit: l.expected_profit, investorSharePct: l.investor_share_pct, cycleDays: l.cycle_days }).investor_pool * r.amt) / l.target) };
    const st = q.one('SELECT detail FROM settlements WHERE listing_id = ?', l.id);
    if (st) { const mine = JSON.parse(st.detail).filter((d) => d.user_id === user.id && d.kind === 'investor'); out.paid_out = mine.reduce((s, d) => s + d.payout, 0); out.profit = mine.reduce((s, d) => s + d.profit, 0); }
    out.updates = q.all('SELECT stage, note, at FROM stage_updates WHERE listing_id = ? ORDER BY id', l.id).map((u) => ({ ...u, stage_name: STAGES[u.stage] }));
    return out;
  });
}
module.exports = { STAGES, CATEGORIES, create, review, assign, markDepositSent, confirmDeposit, invest, fundRemaining, advance, complete, overdue, listLive, one, forCompany, forStaff, portfolio, view, raised };
