# Shehnat: project context

A short brief for anyone (or any AI session) picking up this project. Longer detail is in `PROJECT_OVERVIEW.md` (plain-language explanation, worked examples, flows) and `BUSINESS_REQUIREMENTS.md` (roles, rules, data, gaps).

## What it is

Shehnat is a **global** platform that crowd-funds **container export shipments** as profit-sharing partnerships. It is **operated from the UAE**, and **every amount is in US dollars**.

- A **manager** (a business or an individual trader, in any country) lists a shipment and funds at least 20% of the target themselves.
- The goods can be **sourced in any country and sold to a buyer in any other**.
- **Investors**, from any country, fund the rest from their Shehnat wallet. The **platform** can fill any gap from its treasury.
- **Staff** review everyone, run the shipment through 7 stages, and settle it.
- On settlement, one transaction pays every wallet its capital plus profit:
  - 1% platform fee, on profitable shipments only
  - the manager's share (the investor gets 40–95% of net profit, the manager the rest)
  - the remaining profit split pro-rata over all capital
  - losses shared pro-rata

## Status

A working **demo / pilot-stage build**, not production-ready. Not done yet: licences and rules for each market served, real bank integration (USD escrow, payment references, bank feed), KYC/AML screening, tax, currency conversion, PostgreSQL, object storage for documents, notifications, mobile apps, legal text.

## Who uses it

| Role | Does |
|---|---|
| Investor (any country) | KYC, browse live shipments, invest, track portfolio, wallet, withdraw |
| Manager (any country; called `company` in the code and API) | Register once as a business or an individual, list shipments, pay deposit, follow funding and results |
| Staff: owner | Everything, plus team, audit log, ledger check, withdrawals of USD 10,000+ |
| Staff: reviewer | Approve or reject investors, managers and listings |
| Staff: ops | Advance stages, fund the gap from treasury, complete and settle |
| Staff: finance | Confirm manager deposits, treasury top-up, decide withdrawals under USD 10,000 |

## Core flow

`Manager registers → listing submitted → reviewer approves → manager deposits (≥20%) → finance confirms → LIVE → investors fund (or ops fills the gap after 5 days) → ops buys goods (needs 100% funded) → loaded → at sea → customs → goods sold → ops enters sale price → automatic settlement and payout → withdrawals via finance`

Listing status: `pending_review → awaiting_deposit → live → completed` (or `rejected`). Stages 0–6: Funding open, Goods purchased, Loaded at port, At sea, Customs cleared, Goods sold, Profit paid out.

## Countries

- Countries are ISO 3166-1 two-letter codes, validated by `src/countries.js`. The API also accepts English names.
- A **blocked list** (`BLOCKED_COUNTRIES`, default `CU,IR,KP,SY`, a placeholder for compliance to replace) stops people and businesses living or registered there, listings sourced from or sold into there, and payouts to banks there.
- The public `GET /meta` endpoint gives the web app its countries, limits, rules and currency.

## Tech

- **Location:** everything is in `Demo/`. The repo root is not a git repo.
- **Backend** (`Demo/backend/`): Node ≥ 22.13, **zero third-party dependencies** (`node:http`, `node:sqlite`, `node:crypto`, `node:test`). Do not add npm packages.
- **Frontend** (`Demo/frontend/`): plain ES modules, no build step, served by the backend under a strict CSP (no inline scripts or handlers). 18 screens, 3 visual themes, English only.
- **Backend modules:** `auth`, `applications` (KYC and manager registration, documents), `listings`, `settlement` (pure profit maths), `wallet` (withdrawals, webhook, staff, audit endpoints), `ledger`, `countries`. Supporting files: `server`, `db`, `config`, `perms`, `audit`, `util`, `seed`.
- **Data:** SQLite at `./data/shehnat.db`, with the schema re-run on every start (idempotent). New columns are also added by `upgrade()` in `db.js`. Delete `data/` to reset.

## Run it

From `Demo/backend/`:

```sh
npm test                                   # 27 tests
OWNER_EMAIL=you@x.com OWNER_PASSWORD='a-long-password-1' node src/seed.js   # first owner (PowerShell: set $env:... first)
npm start                                  # API + web app on http://localhost:8080
```

`npm run dev` fails on Windows, so use `npm start`. Production refuses to start without `TOKEN_SECRET` and `BANK_WEBHOOK_SECRET` of at least 32 characters.

## Conventions that matter

1. **Money:** requests take US dollars (max 2 decimals, fields like `amount_usd`), and everything stored or returned is **integer cents** (1 USD = 100 cents). Never use floats past the input boundary. Limits are in `cfg.limits` (whole dollars).
2. **All money movement goes through the double-entry ledger** (`post()` / `move()`). Wallet, escrow, hold, revenue and treasury accounts can't go negative.
3. **Investor privacy:** investors must never see the manager's capital, deposit, expected profit, manager share or result. Keep this when adding fields to `listings.view`.
4. **Audit:** every approval, rejection, assignment or payout must call `audit(...)`.
5. **Time:** use `cfg.now()`, never `Date.now()`, so tests can time-travel.
6. **Countries:** use `countries.country()` for every country field. Never store free text.
7. **Handlers are synchronous.** Throw `bad`, `forbidden`, `notFound` or `conflict` for 4xx errors.
8. **Tests:** each test file shares one in-memory database (uploads go to a temp folder), so use unique emails, and assert `L.verify().ok` after money flows.

## Known issues

- The bank webhook credits investors and managers that were never approved.
- A treasury top-up that reuses a bank reference silently books nothing.
- Investors can't close a gap smaller than the minimum investment, so only platform funding can.
- A rejected listing is final, because there is no resubmit path.
- Settlement pays all wallets with no second approval.
- The blocked list only checks where someone lives or is registered, with no name or counterparty screening.
- Flag emoji don't render on Windows browsers (the country name is always shown too).
