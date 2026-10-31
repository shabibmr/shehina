'use strict';
const http = require('node:http');
const cfg = require('./config');
const db = require('./db');
const auth = require('./auth');
const apps = require('./applications');
const lst = require('./listings');
const wal = require('./wallet');
const L = require('./ledger');
const C = require('./countries');
const { HttpError, bad, forbidden } = require('./util');
const { can } = require('./perms');
const fs = require('node:fs');
const path = require('node:path');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
// Serve the web app (frontend/) at / and /web/*. Refuses anything outside that folder.
function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/web\//, '');
  const root = path.resolve(cfg.frontendDir), file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-cache' });
  res.end(fs.readFileSync(file));
  return true;
}

const routes = [];
const route = (method, pattern, handler, opts = {}) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
  routes.push({ method, re, keys, handler, public: !!opts.public, raw: !!opts.raw });
};
const staffOnly = (u) => { if (u.role !== 'staff') throw forbidden(); };
const num = (v) => { const n = Number(v); if (!Number.isInteger(n) || n < 1) throw bad('Bad id'); return n; };

// ---------- public reference data: currency, countries, rules and limits (the web app builds its forms from this) ----------
route('GET', '/meta', () => ({
  currency: cfg.currency,
  operator: { name: cfg.operator.name, country: cfg.operator.country, country_name: C.nameOf(cfg.operator.country) },
  countries: C.list(),
  blocked_countries: cfg.blockedCountries,
  categories: lst.CATEGORIES,
  id_types: apps.ID_TYPES,
  manager_types: apps.MANAGER_TYPES,
  rules: { fee_bps: cfg.feeBps, min_investor_share_pct: cfg.minInvestorSharePct, min_company_pct: cfg.minCompanyPct, max_company_pct: cfg.maxCompanyPct, overdue_days: cfg.overdueDays, max_upload_bytes: cfg.maxUploadBytes },
  limits: cfg.limits,
}), { public: true });

// ---------- auth ----------
route('POST', '/auth/register', (c) => { const u = auth.register(c.body); return { user: auth.publicUser(u) }; }, { public: true });
route('POST', '/auth/login', (c) => auth.login(c.body), { public: true });
route('GET', '/me', (c) => ({ user: auth.publicUser(c.user), kyc: c.user.role === 'investor' ? apps.mine(c.user, 'kyc') : undefined, company: c.user.role === 'company' ? apps.mine(c.user, 'company') : undefined }));
route('POST', '/documents', (c) => apps.saveDocument(c.user, c.body));
route('GET', '/documents/:id', (c) => { const d = apps.readDocument(c.user, num(c.params.id)); return { __file: d }; });
route('PUT', '/kyc', (c) => apps.submit(c.user, 'kyc', c.body));
route('GET', '/kyc', (c) => apps.mine(c.user, 'kyc'));
route('PUT', '/company/application', (c) => apps.submit(c.user, 'company', c.body));
route('GET', '/company/application', (c) => apps.mine(c.user, 'company'));

// ---------- investor ----------
route('GET', '/listings', (c) => ({ listings: lst.listLive(c.user, c.query) }));
route('GET', '/listings/:id', (c) => lst.one(c.user, num(c.params.id)));
route('POST', '/listings/:id/invest', (c) => lst.invest(c.user, num(c.params.id), c.body.amount));
route('GET', '/portfolio', (c) => ({ portfolio: lst.portfolio(c.user) }));
route('GET', '/wallet', (c) => wal.summary(c.user));
route('POST', '/wallet/withdrawals', (c) => wal.requestWithdrawal(c.user, c.body));
route('GET', '/wallet/withdrawals', (c) => ({ withdrawals: wal.mineW(c.user) }));

// ---------- company ----------
route('POST', '/company/listings', (c) => lst.create(c.user, c.body));
route('GET', '/company/listings', (c) => ({ listings: lst.forCompany(c.user) }));
route('POST', '/company/listings/:id/deposit-sent', (c) => lst.markDepositSent(c.user, num(c.params.id)));

// ---------- bank ----------
route('POST', '/webhooks/bank', (c) => wal.bankWebhook(c.rawBody, c.headers['x-signature']), { public: true, raw: true });
if (!cfg.prod) route('POST', '/dev/topup', (c) => wal.credit('dev-' + Date.now() + Math.random(), c.user.id, c.body.amount_usd, 'Sandbox top-up'));

// ---------- staff ----------
route('GET', '/admin/applications/:type', (c) => { staffOnly(c.user); return { applications: apps.list(c.user, c.params.type === 'investors' ? 'kyc' : 'company', c.query.status) }; });
route('POST', '/admin/applications/:id/decision', (c) => apps.decide(c.user, num(c.params.id), c.body));
route('POST', '/admin/applications/:id/assign', (c) => apps.assign(c.user, num(c.params.id), c.body.staff_id === null ? null : num(c.body.staff_id)));
route('GET', '/admin/listings', (c) => ({ listings: lst.forStaff(c.user, c.query.status) }));
route('GET', '/admin/listings/:id', (c) => { staffOnly(c.user); return lst.one(c.user, num(c.params.id)); });
route('POST', '/admin/listings/:id/decision', (c) => lst.review(c.user, num(c.params.id), c.body));
route('POST', '/admin/listings/:id/assign', (c) => lst.assign(c.user, num(c.params.id), c.body.staff_id === null ? null : num(c.body.staff_id)));
route('POST', '/admin/listings/:id/confirm-deposit', (c) => lst.confirmDeposit(c.user, num(c.params.id), c.body.bank_ref));
route('POST', '/admin/listings/:id/fund-remaining', (c) => lst.fundRemaining(c.user, num(c.params.id)));
route('POST', '/admin/listings/:id/advance', (c) => lst.advance(c.user, num(c.params.id), c.body));
route('POST', '/admin/listings/:id/complete', (c) => lst.complete(c.user, num(c.params.id), c.body));
route('GET', '/admin/overdue', (c) => ({ listings: lst.overdue(c.user) }));
route('GET', '/admin/withdrawals', (c) => ({ withdrawals: wal.listWithdrawals(c.user, c.query.status) }));
route('POST', '/admin/withdrawals/:id/decision', (c) => wal.decideWithdrawal(c.user, num(c.params.id), c.body));
route('POST', '/admin/treasury/topup', (c) => wal.treasuryTopup(c.user, c.body));
route('GET', '/admin/staff', (c) => ({ staff: wal.listStaff(c.user) }));
route('POST', '/admin/staff', (c) => wal.addStaff(c.user, c.body));
route('PATCH', '/admin/staff/:id', (c) => wal.updateStaff(c.user, num(c.params.id), c.body));
route('GET', '/admin/audit', (c) => ({ audit: wal.auditLog(c.user, Number(c.query.limit) || 100) }));
route('GET', '/admin/ledger-check', (c) => { if (!can(c.user, 'team')) throw forbidden(); return L.verify(); });
route('GET', '/health', () => ({ ok: true, dev: !cfg.prod }), { public: true });
route('GET', '/admin/reviewers', (c) => { if (!can(c.user, 'read')) throw forbidden(); return { reviewers: require('./db').q.all("SELECT id, name, staff_role FROM users WHERE role='staff' AND active=1 AND staff_role IN ('owner','reviewer') ORDER BY id") }; });

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', (d) => { n += d.length; if (n > limit) { reject(new HttpError(413, 'Request too large', 'too_large')); req.destroy(); } else chunks.push(d); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
async function handle(req, res) {
  const cors = { 'Access-Control-Allow-Origin': cfg.corsOrigin, 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
  const send = (status, obj, extra = {}) => { const body = JSON.stringify(obj); res.writeHead(status, { 'Content-Type': 'application/json', ...cors, ...extra }); res.end(body); };
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname.startsWith('/web/')) && serveStatic(req, res, url.pathname)) return;
    const r = routes.find((x) => x.method === req.method && x.re.test(url.pathname));
    if (!r) throw new HttpError(404, 'Not found', 'not_found');
    const m = r.re.exec(url.pathname), params = {};
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
    const rawBody = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req, cfg.maxUploadBytes * 1.5) : '';
    let body = {};
    if (rawBody && !r.raw) { try { body = JSON.parse(rawBody); } catch { throw bad('Body must be valid JSON'); } }
    const ctx = { params, query: Object.fromEntries(url.searchParams), body, rawBody, headers: req.headers, user: null };
    if (!r.public) ctx.user = auth.authenticate(req.headers.authorization);
    const out = r.handler(ctx);
    if (out && out.__file) {
      res.writeHead(200, { 'Content-Type': out.__file.meta.mime, 'Content-Disposition': `attachment; filename="${out.__file.meta.filename}"`, ...cors });
      return res.end(out.__file.data);
    }
    send(200, out);
  } catch (e) {
    if (e instanceof HttpError) return send(e.status, { error: e.message, code: e.code });
    console.error('Unhandled error:', e);
    send(500, { error: 'Something went wrong', code: 'server_error' });
  }
}
function createServer() { db.get(); return http.createServer((req, res) => { handle(req, res); }); }
if (require.main === module) {
  const s = createServer();
  s.listen(cfg.port, () => console.log(`Shehnat API listening on :${cfg.port} (${cfg.prod ? 'production' : 'development'})`));
}
module.exports = { createServer };
