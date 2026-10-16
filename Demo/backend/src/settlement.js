'use strict';
// Profit maths in integer cents. Mirrors the prototype's rules:
//  gross = revenue - cost
//  fee   = 1% of revenue, only on profitable shipments, never more than gross
//  net   = gross - fee
//  company (manager) share = (100 - investor_share)% of net, only when net > 0
//  investor pool = net - manager share, split pro-rata over ALL capital (investors, company, platform)
//  losses are borne pro-rata by all capital providers; nobody gets less than zero
const cfg = require('./config');
const { allocate } = require('./util');

function compute({ contributions, cost, revenue, investorSharePct }) {
  const raised = contributions.reduce((s, c) => s + c.amount, 0);
  const gross = revenue - cost;
  const fee = gross > 0 ? Math.min(Math.round((revenue * cfg.feeBps) / 10000), gross) : 0;
  const net = gross - fee;
  const manager = net > 0 ? Math.floor((net * (100 - investorSharePct)) / 100) : 0;
  const pool = net - manager;
  const shares = allocate(pool, contributions.map((c) => c.amount));
  const lines = contributions.map((c, i) => ({ contribution_id: c.id, kind: c.kind, user_id: c.user_id, capital: c.amount, profit: shares[i], payout: c.amount + shares[i] }));
  return { raised, cost, revenue, gross, fee, net, manager, pool, lines };
}
// Expected figures shown on listings (before the sale). Uses the company's expected gross profit.
function projection({ target, expectedProfit, investorSharePct, cycleDays }) {
  const revenue = target + expectedProfit;
  const r = compute({ contributions: [{ id: 0, kind: 'investor', user_id: 0, amount: target }], cost: target, revenue, investorSharePct });
  const cycle = r.pool / target;
  return { revenue, gross: r.gross, fee: r.fee, net: r.net, investor_pool: r.pool, roi_cycle_pct: round1(cycle * 100), roi_annual_pct: round1((cycle * 365 / cycleDays) * 100) };
}
const round1 = (x) => Math.round(x * 10) / 10;
module.exports = { compute, projection };
