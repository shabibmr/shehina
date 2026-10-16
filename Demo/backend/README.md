# Shehna backend

API for a global profit-sharing container-export investment platform, operated from the UAE. All money is in US dollars.
Investors anywhere fund shipments, managers anywhere (a business or an individual trader) list them, and staff review, run and settle them.
The goods can be sourced in one country and sold to a buyer in another.

Zero third-party packages: Node 22.13+ only (built-in HTTP server, SQLite, crypto, test runner).

## Run it

    npm test                                   # 27 tests, including every money flow
    OWNER_EMAIL=you@x.com OWNER_PASSWORD='a-long-password-1' node src/seed.js   # first owner account
    npm start                                  # http://localhost:8080  (sandbox top-up enabled)

On Windows use `npm start` (`npm run dev` uses POSIX syntax). Production: copy `.env.example`, set the two secrets (the server refuses to start without them) and the blocked countries list, build the Dockerfile.

## What it does

| Area | Rules built in |
| --- | --- |
| Accounts | Investors, managers, staff (owner, reviewer, ops, finance). Scrypt passwords, signed expiring tokens, lockout after 5 bad logins. |
| Currency | Everything is US dollars. Requests take dollars with at most 2 decimals; everything stored and returned is whole cents (1 USD = 100 cents). |
| Countries | Every country in the world (ISO 3166-1) except a configurable blocked list (`BLOCKED_COUNTRIES`, default `CU,IR,KP,SY`, a placeholder compliance must set). People and businesses in a blocked country cannot register, listings cannot be sourced from or sold into one, and payouts cannot go to a bank there. |
| Investor KYC | Form with any government ID type (passport, national ID, driving licence, residence permit) + 2 documents. Date of birth must be a real date and the investor 18 or older; phone must be international (`+` and country code). Only approved investors can invest. |
| Manager registration | A business or an individual trader, in any country. Business: registration document, owner ID, profile. Individual: owner ID, proof of address, trading profile. Only approved managers can list. |
| Listings | Manager submits, reviewer approves, manager pays its deposit (min 20% of target), finance confirms the bank receipt, then it goes live. Source and buyer countries must be real, different and not blocked. Target USD 1,000 to 10,000,000. |
| Investing | Any amount above the minimum up to what is left. Money moves wallet to the shipment's escrow account. |
| Funding overdue | `GET /admin/overdue` lists listings live 5+ days and not fully funded. Ops can fund the balance from the platform treasury. |
| Shipment | Stages 1-5 are posted by ops. Goods purchase needs full funding and the supplier payment (cost of goods). |
| Settlement | `complete` records the sale and pays every wallet at once (no approval): capital plus profit. 1% service charge on profitable shipments only; manager share; losses shared pro-rata. |
| Withdrawals | Wallet to a bank account anywhere: account holder, bank name, bank country, an IBAN (checksum and country checked) or account number, and the bank's SWIFT/BIC (its country must match). Held on request, finance approves or declines, USD 10,000+ needs the owner. |
| Privacy | Investors never see the manager's capital, deposit, expected profit, manager share or result. |
| Audit | Every approval, rejection, assignment, payout and change is recorded with who did it. |
| Ledger | Double-entry, integer cents, every transaction sums to zero, protected accounts cannot go negative. `GET /admin/ledger-check`. |

All limits live in `src/config.js` (`cfg.limits`, in whole dollars).

## API

All endpoints take and return JSON. Send `Authorization: Bearer <token>` except where noted.

Public: `GET /meta` (currency, countries, blocked countries, rules, limits, ID types), `POST /auth/register`, `POST /auth/login`, `POST /webhooks/bank` (HMAC signed, body `{event_id, user_id, amount_usd}`), `GET /health`
Everyone: `GET /me`, `POST /documents`, `GET /documents/:id`
Investor: `PUT|GET /kyc`, `GET /listings` (filters: `category`, `from`, `to`, `q`; countries as codes or names), `GET /listings/:id`, `POST /listings/:id/invest`, `GET /portfolio`, `GET /wallet`, `POST|GET /wallet/withdrawals`
Manager (role `company` in the API): `PUT|GET /company/application`, `POST|GET /company/listings`, `POST /company/listings/:id/deposit-sent`
Staff: `GET /admin/applications/investors|companies`, `POST /admin/applications/:id/decision|assign`, `GET /admin/listings`, `POST /admin/listings/:id/decision|assign|confirm-deposit|fund-remaining|advance|complete`, `GET /admin/overdue`, `GET /admin/withdrawals`, `POST /admin/withdrawals/:id/decision`, `POST /admin/treasury/topup` (`amount_usd`, `bank_ref`), `GET|POST /admin/staff`, `PATCH /admin/staff/:id`, `GET /admin/audit`, `GET /admin/ledger-check`

Amounts in requests are US dollars. Amounts in responses are integer cents. Countries are stored and returned as two-letter ISO codes. The web app gets names, flags and form options from `/meta`.

## Upgrading an older database

There are no migrations, but `db.js` adds the columns newer versions need every time it opens a database (`withdrawals.details`, `listings.product_cert`, copying any old certificate text). Older data keeps its old amounts as they were: if you ran an earlier AED version with real records, convert them before use. For a demo database, delete `data/` to start clean.

## What is NOT done yet (needs decisions, contracts or more build)

1. **Licences and approvals.** The platform is operated from the UAE but serves people worldwide, so each market's licence, exemption and investor-protection rules need legal advice. Do not take real money before they are in place. The default blocked list is only a placeholder.
2. **Bank.** A USD escrow account, a payment reference per user, and the real bank-feed webhook. `POST /webhooks/bank` and `/dev/topup` are stand-ins. The bank reference fields are entered by hand today. The webhook also credits accounts that are not yet approved.
3. **Currency conversion.** Everything is in dollars. Users who hold other currencies must convert outside the platform.
4. **KYC / AML provider.** Staff currently review documents by eye. Add sanctions and politically-exposed-person screening and an identity check (a vendor, or a national scheme) and record their result. Per-country document rules are not built.
5. **Tax.** No withholding or tax reporting.
6. **Database.** SQLite is fine for a pilot on one server. For launch move to managed PostgreSQL (SQL is plain; change `db.js`), with backups and encryption at rest.
7. **Document storage.** Files go to local disk. Move to encrypted object storage with a retention policy, and check where personal data may be stored for each user's country.
8. **Apps.** Investor mobile app (Android and iOS) still needs to be built on this API. The web app is English only.
9. **Notifications** (email, SMS, push), **rate limiting** at the edge, TLS, monitoring and alerting, a security review and penetration test.
10. **Legal text:** terms, risk disclosure, privacy policy, and wording for returns (estimates, not guarantees), per country and language.

## Front end (web app)

`../frontend` is a dependency-free web app (ES modules, no build step) for all three roles: investor, manager and the admin console. The backend serves it, so one process runs everything:

```
OWNER_EMAIL=you@example.com OWNER_PASSWORD='a-long-password' node src/seed.js   # once: first owner account
npm start            # then open http://localhost:8080
```

- Investors and managers register on the sign-in page; staff accounts are created by the owner under Team.
- In development (`NODE_ENV` not production) the wallet shows a sandbox top-up box. It is absent in production.
- The page runs under a strict Content-Security-Policy (no inline scripts), so keep new code in the `.js` modules.
- Tested end to end in a real browser: register, KYC, manager registration as an individual, approval, a Brazil-to-Japan listing, deposit, investing from Brazil, shipment updates, settlement, and a withdrawal to a US bank.
