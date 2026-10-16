'use strict';
// All settings come from environment variables. Production refuses to start with default secrets.
const env = process.env;
const prod = env.NODE_ENV === 'production';
const cfg = {
  prod,
  port: Number(env.PORT || 8080),
  dbFile: env.DB_FILE || (prod ? '/var/lib/shehna/shehna.db' : './data/shehna.db'),
  uploadDir: env.UPLOAD_DIR || './data/uploads',
  tokenSecret: env.TOKEN_SECRET || 'dev-only-secret-change-me',
  webhookSecret: env.BANK_WEBHOOK_SECRET || 'dev-only-webhook-secret',
  tokenTtlSec: Number(env.TOKEN_TTL_SEC || 8 * 3600),
  currency: 'USD',          // every wallet, listing and payout is in US dollars (stored as whole cents)
  operator: { name: 'Shehna', country: 'AE' },   // the platform is operated from the UAE
  // Countries we cannot accept people or trade from (ISO 3166-1 alpha-2, comma separated).
  // This default is a placeholder: compliance must set the real list for the licences held.
  blockedCountries: (env.BLOCKED_COUNTRIES !== undefined ? env.BLOCKED_COUNTRIES : 'CU,IR,KP,SY').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
  feeBps: 100,              // platform service charge: 1% of invoice price, profitable shipments only
  minInvestorSharePct: 40,  // minimum investor share of net profit
  minCompanyPct: 20,        // the manager must fund at least 20% of the target
  maxCompanyPct: 90,
  overdueDays: 5,           // funding overdue after this many days live
  // Limits in whole US dollars.
  limits: {
    minTarget: 1_000, maxTarget: 10_000_000,
    maxInvestment: 10_000_000, maxMinInvest: 1_000_000,
    maxExpectedProfit: 10_000_000, maxCostOfGoods: 1_000_000_000, maxSalePrice: 1_000_000_000,
    maxWithdrawal: 10_000_000, maxBankCredit: 10_000_000, maxTreasuryTopup: 100_000_000,
    largeWithdrawal: 10_000,   // at or above this, only the owner can approve a withdrawal
  },
  maxUploadBytes: 5 * 1024 * 1024,
  frontendDir: env.FRONTEND_DIR || require('node:path').resolve(__dirname, '../../frontend'),
  corsOrigin: env.CORS_ORIGIN || '*',
};
if (prod) {
  for (const k of ['TOKEN_SECRET', 'BANK_WEBHOOK_SECRET']) {
    if (!env[k] || env[k].length < 32) throw new Error(k + ' must be set to a random value of at least 32 characters in production');
  }
}
let clock = () => Date.now();
cfg.now = () => clock();
cfg.setClock = (fn) => { clock = fn || (() => Date.now()); };
module.exports = cfg;
