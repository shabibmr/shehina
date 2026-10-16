-- Money is stored as integer cents (1 USD = 100 cents). Never floats.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('investor','company','staff')),
  staff_role TEXT CHECK (staff_role IN ('owner','reviewer','ops','finance')),
  active INTEGER NOT NULL DEFAULT 1,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  path TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
-- One application per user. Investor KYC and manager (company or individual) registration.
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('kyc','company')),
  status TEXT NOT NULL CHECK (status IN ('draft','pending','approved','rejected')),
  data TEXT NOT NULL,           -- JSON of form fields
  docs TEXT NOT NULL,           -- JSON {docKind: documentId}
  assigned_to INTEGER REFERENCES users(id),
  decided_by INTEGER REFERENCES users(id),
  decided_at INTEGER,
  reason TEXT,
  submitted_at INTEGER,
  UNIQUE (user_id, type)
);
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  from_country TEXT NOT NULL,         -- ISO country code: where the goods are sourced and shipped from
  to_country TEXT NOT NULL,           -- ISO country code: where the buyer is
  cycle_days INTEGER NOT NULL,
  target INTEGER NOT NULL,            -- cents
  company_pct INTEGER NOT NULL,       -- manager's own funding, % of target
  min_invest INTEGER NOT NULL,        -- cents
  investor_share_pct INTEGER NOT NULL,
  expected_profit INTEGER NOT NULL,   -- cents, manager's estimate (gross)
  product_cert TEXT,                  -- optional product certificate (organic, ISO or other quality mark)
  status TEXT NOT NULL CHECK (status IN ('pending_review','rejected','awaiting_deposit','live','completed')),
  stage INTEGER NOT NULL DEFAULT 0,   -- 0 funding open .. 6 profit paid out
  assigned_to INTEGER REFERENCES users(id),
  company_paid INTEGER NOT NULL DEFAULT 0,  -- company says it sent the deposit
  cost_of_goods INTEGER,              -- cents, set when goods are purchased
  sale_price INTEGER,                 -- cents, set at completion
  created_at INTEGER NOT NULL,
  live_at INTEGER,
  completed_at INTEGER
);
CREATE TABLE IF NOT EXISTS contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL REFERENCES listings(id),
  kind TEXT NOT NULL CHECK (kind IN ('investor','company','platform')),
  user_id INTEGER REFERENCES users(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS stage_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL REFERENCES listings(id),
  stage INTEGER NOT NULL,
  note TEXT,
  by_user INTEGER NOT NULL REFERENCES users(id),
  at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settlements (
  listing_id INTEGER PRIMARY KEY REFERENCES listings(id),
  raised INTEGER NOT NULL, cost INTEGER NOT NULL, revenue INTEGER NOT NULL,
  gross INTEGER NOT NULL, fee INTEGER NOT NULL, net INTEGER NOT NULL,
  manager_share INTEGER NOT NULL, investor_pool INTEGER NOT NULL,
  detail TEXT NOT NULL, at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  iban TEXT NOT NULL,                 -- IBAN or bank account number
  details TEXT,                       -- JSON: account holder, bank name, bank country, SWIFT/BIC
  status TEXT NOT NULL CHECK (status IN ('pending','approved','declined')),
  decided_by INTEGER REFERENCES users(id),
  decided_at INTEGER,
  bank_ref TEXT,
  created_at INTEGER NOT NULL
);
-- Double-entry ledger. Every transaction's entries sum to zero.
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,                 -- wallet, escrow, hold, revenue, treasury, external
  allow_negative INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ledger_txns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  ref TEXT,
  idem_key TEXT UNIQUE,
  memo TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ledger_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  txn_id INTEGER NOT NULL REFERENCES ledger_txns(id),
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  amount INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entries_account ON ledger_entries(account_id);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  actor_id INTEGER,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id INTEGER,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_contrib_listing ON contributions(listing_id);
