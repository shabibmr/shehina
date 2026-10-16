# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Shehna: a global profit-sharing container-export investment platform, operated from the UAE, with every amount in US dollars. Investors anywhere fund shipments, managers anywhere (a business or an individual trader) list them, and staff (owner / reviewer / ops / finance) review, run and settle them. Goods can be sourced in any country and sold to a buyer in any other. All code lives in `Demo/`:

- `Demo/backend/` — Node API, **zero third-party dependencies** (built-in `node:http`, `node:sqlite`, `node:crypto`, `node:test`). Requires Node >= 22.13. Do not add npm packages.
- `Demo/frontend/` — dependency-free web app (plain ES modules, no build step) for all three roles, served by the backend.

`Demo/backend/README.md` holds the full endpoint list, business rules table and the "not done yet" list (licences per market, bank integration, KYC/AML screening, tax, Postgres, object storage, notifications, legal text).

## Commands

Run from `Demo/backend/`:

```sh
npm test                                                   # all tests (node --test test/*.test.js)
node --no-warnings --test test/money.test.js               # one file
node --no-warnings --test --test-name-pattern "profitable" test/money.test.js   # one test by name
OWNER_EMAIL=you@x.com OWNER_PASSWORD='a-long-password-1' node src/seed.js       # create first owner account
npm start                                                  # serves API + web app on PORT (default 8080)
```

- `npm run dev` uses POSIX `NODE_ENV=development ...` syntax and fails in PowerShell/cmd. On Windows, just use `npm start` (any `NODE_ENV` other than `production` is dev mode), or set the env var first (`$env:OWNER_EMAIL=...` in PowerShell).
- Default port is 8080 (`src/config.js`); the README's mention of `localhost:3000` is only correct if `PORT=3000`.
- Dev DB is `./data/shehna.db` (relative to cwd); uploads go to `./data/uploads`. Delete `data/` to reset.
- Production (`NODE_ENV=production`) refuses to start unless `TOKEN_SECRET` and `BANK_WEBHOOK_SECRET` are >= 32 chars. See `.env.example` and `Dockerfile`.

## Backend architecture

- **`server.js`** — hand-rolled router: `route(method, pattern, handler, {public, raw})`. Handlers are **synchronous**, receive `ctx = {params, query, body, rawBody, headers, user}` and return a JSON-able object (or `{__file}` for downloads). Throw `HttpError` helpers from `util.js` (`bad`, `forbidden`, `notFound`, `conflict`) for 4xx; anything else becomes a 500. Also serves `frontend/` at `/` and `/web/*` with a strict CSP, and a public `GET /meta` (currency, countries, blocked list, rules, limits) that the web app builds its forms from. `/dev/topup` exists only when not in production.
- **`db.js`** — single `DatabaseSync` handle; `schema.sql` is executed on every open (all `CREATE ... IF NOT EXISTS`, so schema changes must be idempotent — there are no migrations). Columns added after the first release are also added by `upgrade()` in `db.js` (checked with `PRAGMA table_info`) so older databases keep working: add a new column to both `schema.sql` and `upgrade()`. `tx(fn)` wraps `BEGIN IMMEDIATE`; nested `tx` calls join the outer transaction. `q.one/all/run` are the query helpers.
- **`ledger.js`** — double-entry ledger; **all money movement must go through `post()` / `move()`**. Entries in a txn must sum to zero, amounts are integers, and non-`allow_negative` accounts are checked for negative balance inside the same transaction (throws 409 `insufficient_funds`, rolling back). Balances are derived from entries, never stored. Accounts are created lazily by code: `user:<id>:wallet`, `escrow:<listingId>`, `platform:revenue`, `platform:treasury`, `withdrawals:hold`, `bank:external`. Supports idempotency keys. `verify()` backs `/admin/ledger-check` and tests.
- **`settlement.js`** — pure profit maths (`compute`, `projection`) in integer cents: 1% fee (`cfg.feeBps`) on profitable shipments only, company manager share of net profit, remainder split pro-rata over all capital (investor, company, platform contributions) via `util.allocate` (largest-remainder, always sums exactly). Losses are shared pro-rata.
- **`listings.js`** — listing lifecycle `pending_review → awaiting_deposit → live → completed` (or `rejected`), with shipment stages `STAGES[0..6]` advanced by ops; `complete` settles and pays all wallets in one transaction. `view(listing, viewer)` enforces **investor privacy**: investors never see company capital/deposit, expected profit, manager share or company result — keep this when adding fields.
- **`applications.js`** — investor KYC (`type='kyc'`) and manager registration (`type='company'`, which is the role name in the API and database; the web app calls it "manager") plus document upload/download. A manager is a `company` or an `individual` and uploads different documents for each. IDs are country-neutral (type + number). The country of residence or registration is checked against the blocked list at submission and again at approval. Only approved investors invest; only approved managers list.
- **`wallet.js`** — wallet summary, withdrawals to a bank anywhere (account holder, bank country, IBAN with checksum or account number, SWIFT/BIC; hold account; `cfg.limits.largeWithdrawal` (USD 10,000) and above needs owner approval), HMAC-signed bank webhook, treasury top-up, and also staff management and the audit log endpoints.
- **`perms.js`** — staff permission map (`can(user, action)`); owner can do everything. **`audit.js`** — every approval/rejection/assignment/payout must call `audit(...)`.
- **`countries.js`** — ISO 3166-1 country codes (names from `Intl.DisplayNames`). Countries are stored and exchanged as two-letter codes; `C.country(v, label)` validates one (accepts a code or an English name) and refuses blocked countries (`BLOCKED_COUNTRIES`, default `CU,IR,KP,SY`, a placeholder for compliance). Use it for every country field, never free text.
- **`config.js`** — all env settings, business constants and USD limits (`cfg.limits`, whole dollars); `cfg.now()` / `cfg.setClock()` is the injectable clock (use it instead of `Date.now()` so tests can time-travel, e.g. the 5-day funding-overdue rule).

**Money convention:** everything is US dollars. Request bodies take dollars (converted with `usdToCents`, max 2 decimals, field names like `amount_usd`); everything stored and returned is integer cents (1 USD = 100 cents). Never use floats for money past the input boundary.

## Tests

`test/helpers.js` `boot()` opens an in-memory DB, starts the real HTTP server on a random port, seeds owner + reviewer/ops/finance staff and returns `w.api(method, path, body, token)` plus `w.tokens`. Helpers `newInvestor`, `newCompany`, `liveListing` drive the full flow through the API. Each test file boots once in `before()`, so tests within a file share DB state — use unique emails. Tests should assert `L.verify().ok` after money flows.

## Frontend architecture

- `index.html` loads `main.js`, which imports `core.js` and the role modules (`auth.js`, `investor.js`, `company.js`, `admin.js`).
- `core.js` holds shared state `S`, the `META` reference data loaded from `/meta` at boot (`loadMeta`, `cname`, `flag`, `countryOpts`), money formatting (`usd`, `usdx`, `usdk`; amounts arrive in cents), the `api()` fetch client (Bearer token in `localStorage`), router (`go`, `render`), toast/icons and reusable components. Each role module registers screens on the shared `views` object (e.g. `views.adHome = {...}`).
- Served under a strict CSP: **no inline scripts or inline event handlers** — put all code in the `.js` modules. Escape interpolated values with `esc()`.
- Amounts arrive in cents; format with `usd()` / `usdx()`.
- Three visual themes (`container`, `majlis`, `oasis`) selected via `data-look` on `<html>`.
