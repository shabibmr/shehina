# Shehnat: business requirements extracted from the code

Source: `Demo/backend/src/*` and `Demo/frontend/*`, as upgraded to global scope on 2026-10-14. Every rule below is enforced in code unless marked *(UI only)* or listed under "Gaps".

- **Currency:** everything is US dollars (USD). Requests take dollars with at most 2 decimals; everything stored is whole **cents** (1 USD = 100 cents).
- **Reach:** investors and managers can be anywhere. Goods can be sourced anywhere and sold to a buyer anywhere. The platform is operated from the UAE.

---

## 1. Base idea

Shehnat is a platform for **crowd-funding container export shipments** from anywhere to anywhere.

- A **manager** (a business, or an individual trader, in any country) lists one shipment. Examples: a 40ft container of coffee, rice, building materials or textiles. They record where the goods are **sourced** and where the **buyer** is.
- The manager **puts in their own capital** first: at least 20% of the funding target.
- **Investors**, from any country, fund the rest from their Shehnat wallet. If investors don't fill it in time, **the platform** can fund the gap from its treasury.
- The manager buys the goods, ships them and sells them to the buyer.
- When the sale is recorded, the money is split automatically:
  - The platform takes a **1% service charge**, only if the shipment made a profit.
  - The manager takes a **manager share** of the profit.
  - The rest of the profit is shared **pro-rata across all capital**: investor, manager and platform money alike.
  - Everyone gets their capital back plus their profit share in their wallet.
- **Losses are shared pro-rata** by everyone who put in capital. Nobody pays a fee or a manager share on a loss.
- Everyone can withdraw from their wallet to a bank account anywhere in the world, after staff approve it.

Everything is checked by staff before it can touch money: investors pass identity checks, managers pass a registration review, and every listing is reviewed. All money moves through a double-entry ledger, and every important action is recorded in an audit log. A configurable **blocked-countries list** keeps the platform out of markets it can't serve.

---

## 2. User roles

| Role | How the account is created | What they can do |
|---|---|---|
| **Investor** (any country) | Self sign-up on the sign-in page | Complete identity checks (KYC). Browse live shipments. Invest once approved. Track the portfolio. Manage the wallet and withdraw. |
| **Manager** (any country; a business or an individual trader) | Self sign-up on the sign-in page ("I manage shipments"). Called `company` in the code, database and API. | Register once. List shipments once approved. Pay the capital deposit. Follow funding and results. Withdraw from the wallet. |
| **Staff: Owner** | The first one comes from `seed.js` (`OWNER_EMAIL`/`OWNER_PASSWORD`). Later owners are added by an owner. | **Everything.** Also manages staff, reads the audit log, runs the ledger check and approves withdrawals of USD 10,000 or more. |
| **Staff: Reviewer** | Added by an owner | Approves or rejects investors, managers and new listings. Assigns review items. |
| **Staff: Ops** | Added by an owner | Moves shipments through their stages, funds the remaining balance from the treasury, and completes or settles shipments. |
| **Staff: Finance** | Added by an owner | Confirms manager deposits, tops up the treasury, and approves or declines withdrawals under USD 10,000. |
| **Shareholder** *(planned, §11)* | Not a separate account. The owner marks an approved investor or manager account as a Shareholder. | Receives the Shareholder share of the treasury's profit on Listings where they are the buyer or the manager. |

Permission map (`perms.js`). The owner is included in every row.

| Permission | Roles | Covers |
|---|---|---|
| `review` | owner, reviewer | Application and listing decisions, assignments |
| `deposit` | owner, finance | Confirm manager deposit, treasury top-up |
| `ops` | owner, ops | Advance stage, fund remaining, complete |
| `wd` | owner, finance | Withdrawal decisions |
| `team` | owner | Staff management, audit log, ledger check |
| `read` | all staff | View all applications, listings, withdrawals, documents, overdue list |

Rules about staff:

- Staff cannot invest, list, withdraw or receive bank credits.
- An owner **cannot remove their own owner role** or **deactivate themself**.
- A deactivated user (any role) cannot sign in, and their existing tokens stop working.

---

## 3. Accounts and sign-in

- **Sign-up** (investor or manager only):
  - email (valid format, unique, stored in lower case)
  - name (1–120 characters)
  - password: at least 10 characters, with at least one letter and one digit
- Passwords are hashed with scrypt.
- **Session:** a signed token that is valid for 8 hours by default (`TOKEN_TTL_SEC`). The browser keeps it in `localStorage`.
- **Lockout:** 5 wrong passwords lock the account for 15 minutes. A failed attempt on a deactivated account also counts.
- Every registration and login is written to the audit log.

---

## 4. Countries and eligibility

- Countries are **ISO 3166-1** codes (244 inhabited countries and territories). They are stored as two-letter codes. The API also accepts English names and common short names (for example `India`, `UK`, `USA`) and converts them.
- **Blocked list:** `BLOCKED_COUNTRIES` (default `CU,IR,KP,SY`; a placeholder that compliance must replace). It is applied to:

| Where | Rule |
|---|---|
| Investor's country of residence | Refused at submission (403), and refused at approval if the country was added to the list after they applied |
| Manager's country of registration or residence | Same |
| Listing source country and buyer country | Refused (403) |
| Bank country for a withdrawal | Refused (403) |
| Nationality, owner nationality | **Not** checked: only where someone lives or is registered matters |

- The web app builds all country dropdowns from the public `GET /meta` endpoint. Blocked countries are left out of residence, source, buyer and bank country lists, and each form shows a note naming them.

---

## 5. Workflows

### 5.1 Investor onboarding (KYC)

1. Sign up as an investor.
2. Upload 2 documents: a government photo ID (passport, national ID card, driving licence or residence permit) and proof of address.
3. Fill in the KYC form (§7.2) and tick *"I confirm these details are true and I understand investments can lose value."*
4. Submit. The status becomes `pending`, and the investor can't edit it while it waits.
5. A reviewer or the owner approves or rejects it. **A rejection needs a reason**, which the investor sees.
6. If rejected, the investor fixes the details and resubmits. The status goes back to `pending` and the earlier decision is cleared.
7. Once approved, the investor can invest and withdraw.

Status flow: `none → pending → approved | rejected → (resubmit) pending …`

### 5.2 Manager registration

This works the same way as KYC, with the manager form (§7.3). The manager chooses a **type**:

- **Business:** documents are business registration or trade licence, owner photo ID, and company profile.
- **Individual trader:** documents are own photo ID, proof of address, and a trading profile. A registration number is optional.

They tick *"I confirm these details are true and I am authorised to act for this business."*

- Until the manager is approved, every manager screen sends the user back to registration ("Almost there").
- Only approved managers can list shipments or withdraw.

### 5.3 Review assignment (applications and listings)

- A reviewer or the owner can assign an item to a specific **active reviewer or owner**, or clear the assignment.
- Once an item is assigned, **only that person or an owner** can decide it.

### 5.4 Shipment listing lifecycle

> **Agreed change, not built yet (2026-10-31):** the workflow below is the agreed one. The code still has the older, simpler flow: one shipment per listing, stages advanced by hand, a final rejection, a single expected-profit figure, a "deposit sent" flag with finance confirming a bank transfer, and settlement by one ops user with no approval. Terms are defined in `GLOSSARY.md`. ADRs 0002 (overrun fill), 0003 (Steps drive Stages) and 0004 (full transparency for investors) record the less obvious choices.

```
draft ──submit──▶ in_review ──reject (reason)──▶ rejected ──edit + resubmit──▶ in_review
                     │  └──revised terms──▶ awaiting_terms ──accept──▶ approved
                     │                          └──decline──▶ back to the manager to edit
                     │ approve
                     ▼
                  approved ── manager pays the deposit from their wallet
                     │       (with a deposit waiver, the treasury stand-in is booked at approval, §11.3)
                     ▼
live, stage 0 "Funding open" ── investors invest / treasury fills an Overdue remainder
                     │ 100% funded
                     ▼
live, stages 1–5 per Shipment ── driven by each Shipment's Steps
                     │ every Shipment at "Goods sold" with its sale proceeds in escrow,
                     │ or written off
                     ▼
settlement proposed (ops) ──send back (reason)──▶ live
                     │ approve (finance or owner, not the proposer)
                     ▼
completed, stage 6 "Profit paid out"

Withdrawn: by the manager at any time before live, or automatically after 14 days with
           revised terms unanswered or the deposit unpaid. No money has moved. Final.
Cancelled: by ops or the owner, with a reason, any time before the first Shipment's
           goods are bought. Every contribution is refunded in full. Final.
```

Each step in detail:

1. **Create** (approved manager only). The listing starts as a **draft**: private to the manager, freely editable or deletable, and unseen by staff. Submitting runs every check and sends it to review. The full field list is in §6.1. The manager first declares the terms the deal is built on:
   - **Shipments:** how many containers the trade has. Each Shipment has its own **expected cost of goods**, **expected sale price** and **planned start** (days after full funding), so Shipments may run in parallel.
   - **Step plan:** starts from the standard template (Ordering, Advances, Purchase, Payments, Transportation, Clearance, Receipts, Invoicing). The manager adjusts it, with an owner, planned duration and **planned Step costs** for each Step, and tags Steps with the Stage they complete (rule in step 8). Every Shipment gets its own copy of the approved plan. The reviewer decides which documents each Step requires.
   - **Funding target** (the total budget): **calculated, never entered**. It is the sum of every Shipment's expected cost of goods and every planned Step cost. Expected profit is also calculated: total expected sale price − funding target.
   - **Cycle:** **calculated, never entered**. It is the latest Shipment's planned start plus its planned Step durations.
   - **Investor share:** the % of net profit (profit after the 1% service fee) that goes to capital. The manager keeps the rest as the manager share. *Example:* at an investor share of 40%, the manager share is 60%, and the 40% pool is divided pro-rata over all capital (investors, the manager's deposit and any treasury money), as in §6.3.

   Investors see every term before they invest (§6.5). Everything is fixed once the listing is approved.
2. **Submit and review** (reviewer or owner). On submission, and again at approval, the manager's **exposure limit** is checked: the funding targets of all their listings in review, approved or live must stay within it. The limit is a platform-wide default (a setting), and the owner can set a different one per manager. The reviewer checks the terms, including the expected cost and sale prices against the market (required on a Shareholder Listing, §11.2), sets the required documents for each Step, and does one of three things:
   - **Approve:** the listing moves to `approved`.
   - **Reject** with a reason: the listing moves to `rejected`. The manager can edit and resubmit it as many times as needed. Each resubmit returns it to review and clears the reason and assignment, and earlier rejections stay in its history.
   - **Revised terms:** the reviewer changes any term (amounts, investor share, Step plan, Shipment count) and sends it to the manager. If the manager **accepts**, the listing is approved with the revised terms. If they **decline**, it returns to them to edit and resubmit.
   - During review, staff also record whether the buyer is a Shareholder, and owner or finance may waive the deposit (§11).
3. **Pay deposit** (the manager, from their wallet):
   - The manager pays `funding target × company_pct %` from their wallet balance. If the wallet doesn't cover it, they top it up first through the payment gateway (§5.5).
   - In one transaction, the deposit moves from the wallet into the listing's escrow and is recorded as the manager's contribution. The listing becomes **live**, and the `live_at` time is stamped.
   - There is no bank transfer to escrow, no "deposit sent" flag and no finance confirmation.
4. **Deposit waiver** (§11.3): if owner or finance waived the deposit during the review, the treasury stand-in is booked into escrow at approval, and the listing goes live straight away.
5. **Withdrawn** (before live only): the manager can withdraw the listing at any point before it goes live. It is withdrawn automatically if revised terms are left unanswered, or an approved listing's deposit is left unpaid, for **14 days** (a setting). No money has moved, and it is final: the manager lists again from scratch.
6. **Funding** (only while live and at stage 0):
   - Approved investors invest at least the listing's **minimum**, or **exactly the remainder** if less than the minimum is left, and never more than the remainder. The amount must be covered by their **wallet balance**.
   - The money moves from the wallet to the listing's escrow. **An investment is final.** It comes back early only if the listing is cancelled.
   - **Overdue:** a listing that has been live for **5 days or more** at stage 0 without being fully funded appears on the staff "Funding overdue" screen. Ops or the owner can fill the remainder from the treasury, or leave it open. There is no time limit, and nothing is cancelled automatically.
7. **Cancel** (ops or owner, with a reason): allowed only before the first Shipment's goods are bought. Every contribution is refunded in full to the wallet or treasury it came from.
8. **Run the Shipments** (stages 1–5, per Shipment):
   - Goods are bought only once the listing is **100% funded**. Each Shipment starts on its planned start.
   - Each Shipment's Stage is **driven by its Steps**, and nobody advances it by hand. A Step can carry a Stage tag ("Goods purchased", "Loaded at port", "At sea", "Customs cleared", "Goods sold"). A Shipment reaches a Stage when every Step tagged with that Stage, or an earlier one, is done, and verified where verification is required (payment, customs, sale). Any ops user may verify a Step, including the one who marked it done. When approving the plan, the reviewer makes sure every Stage has at least one tagged Step. A Stage already reached never goes backwards.
   - A Step can't be done until its required documents are uploaded. A Step can be **skipped** with a reason and a reviewer's approval. It then counts as done for its Stage tag, and its planned cost is not paid.
   - **Changing a live plan** (adding, removing or reordering Steps, or changing durations, owners or Stage tags): the manager or ops proposes the change and a reviewer approves it, with finance also approving any cost change. The cycle is recalculated, and every change is recorded in the timeline.
   - The listing's overall Stage is its least advanced Shipment's Stage.
   - **Step costs** (including the cost of goods) are paid by ops from escrow, with proof. Unplanned Step costs need finance approval. Paid costs may never exceed the capital raised.
   - **Sale proceeds:** the buyer pays Shehnat, and the money is credited to the listing's escrow for that Shipment. Any shortfall against the invoice is recorded with a reason. Proceeds stay in escrow until settlement, except that finance may approve using them to pay a later Shipment's costs.
   - **Overrun fill:** if actual costs would exceed the capital raised (and any proceeds finance allows to be used), ops requests an overrun fill with proof, and finance or the owner approves it. There is **no cap**. The treasury puts the money in as a contribution that shares profit and loss pro-rata, so it dilutes everyone else's slice (ADR 0002).
   - **Late:** a Step past its planned duration, or a listing past its cycle, is flagged to staff, and investors see the revised expected date. Nothing happens automatically and nobody is penalised.
   - **Suspended or blocked users:** if the manager is suspended, or their country is added to the blocked list, while the listing is live, ops takes over the manager's Steps and the listing runs on (or ops cancels it, if no goods have been bought yet). An investor's contribution stays in and shares the result in the same situation. Either way, the person's payout is held in their wallet until compliance clears it.
   - Investors see everything on the listing except uploaded documents (§6.5).
9. **A Shipment that won't be sold to its buyer** (lost, seized, rejected or unpaid): ops proposes one of two outcomes case by case, and a different staff member approves:
   - **Write-off:** the Shipment counts as sold for zero, or for any insurance or salvage proceeds recorded, and its loss is shared pro-rata.
   - **Resale:** the goods are sold to a new buyer, whose country must pass the blocked-country check. The Resale's sale price and sale document become the Shipment's. A Resale to a **Shareholder** needs the owner's approval and a market-price check, and the owner decides then whether the listing becomes a Shareholder Listing.
10. **Settlement:**
    - **Propose** (ops or owner): allowed once every Shipment has reached "Goods sold" with its sale proceeds received in escrow and a sale document (invoice or proof of payment), or has been written off. Each Shipment's sale price is the **proceeds actually received**, and the listing's sale price is their sum.
    - **Approve** (finance or owner, never the person who proposed it): settlement runs (§6.3), and **every contribution is paid in one transaction**, together with any unused capital. The approver can instead **send it back** to ops with a reason.
    - The listing becomes `completed`, stage 6.

### 5.5 Wallet top-up

> **Agreed change, not built yet (2026-10-31):** top-ups go through a **payment gateway** and are reconciled automatically, with no manual checks.
> - The user starts a payment for a stated USD amount.
> - The gateway's signed confirmation credits exactly that amount, once per payment.
> - Only approved investors and managers can top up.
> - The user always receives the full amount. The gateway's fee is the platform's cost.
>
> The bank-transfer webhook described below is the current code and is to be replaced.

- **Production:** the bank calls `POST /webhooks/bank`.
  - The call carries an HMAC-SHA256 signature in `x-signature`, and a JSON body `{event_id, user_id, amount_usd}`.
  - A body that isn't valid JSON gets a clear 400 error.
  - Duplicates are ignored by `event_id`.
  - Investor and manager accounts can be credited, but staff accounts cannot.
  - The wallet screen tells users to send US dollars quoting the reference `SHE-<their user id>`.
- **Development only:** a "sandbox top-up" box adds test money (`/dev/topup`, field `amount_usd`). This route doesn't exist in production.

### 5.6 Withdrawal

1. An **approved** investor or manager requests an amount and gives their bank details: **bank country, bank name, account holder name, IBAN or account number, and SWIFT/BIC code**.
   - Spaces are ignored. Account numbers are upper-cased.
   - If the account starts with two letters and two digits it is treated as an **IBAN**: its checksum must pass and its country must match the bank country.
   - The SWIFT/BIC must be 8 or 11 characters, and its country part must match the bank country.
   - The bank country can't be on the blocked list.
   - The account holder should be the user's own name; finance checks this when paying.
2. The money moves immediately from the wallet to a **hold** account. The wallet balance must cover it.
3. Finance or the owner decides:
   - **Approve:** needs a bank reference, and the money leaves the platform. **USD 10,000 or more can only be approved by the owner.**
   - **Decline:** needs a reason, and the money goes back to the wallet. Finance can decline any amount.

### 5.7 Treasury top-up

Finance or the owner records platform money coming in, with an amount in USD and a bank reference. This funds the "fund remaining" step.

### 5.8 Staff management (owner)

- Add staff: name, email, password and role.
- Change a staff member's role, or activate or deactivate them.
- View the activity log (latest 60 in the UI; the API allows up to 500).
- Run the ledger integrity check, which shows on the owner's home screen.

---

## 6. Business rules and limits

All limits are in `config.js` (`cfg.limits`, whole dollars) and are published to the web app through `/meta`.

### 6.1 Listing terms

> **Agreed change, not built yet (2026-10-31):** the funding target and cycle become calculated from the Shipments and Step plan, and expected profit is replaced by an expected cost of goods and an expected sale price per Shipment (§5.4). The code still takes the target, cycle and expected profit as entered fields.

| Field | Rule |
|---|---|
| Name | 1–120 characters |
| Category | One of: Food, Building, Textiles, Energy, Other |
| Goods sourced from / buyer is in | Required real countries, **must differ**, neither on the blocked list |
| Shipments | 1 or more, fixed at approval. Each has an expected cost of goods, an expected sale price and a planned start (days after full funding). |
| Step plan | One copy per Shipment. Each Step has an owner, a planned duration, planned Step costs, an optional Stage tag and the documents the reviewer requires. Every Stage from "Goods purchased" to "Goods sold" needs at least one tagged Step. |
| Funding target | **Calculated:** Σ expected cost of goods + Σ planned Step costs. Must be **USD 1,000 – 10,000,000**, and within the manager's exposure limit. |
| Cycle | **Calculated:** the latest Shipment's planned start + its planned Step durations. 1–365 days. |
| Expected profit | **Calculated:** Σ expected sale price − funding target. |
| Manager capital | **20%–90%** of the target (whole %) |
| Minimum investment | USD 1 – 1,000,000, and no more than the target |
| Investor share of net profit | **40%–95%** (whole %). The manager's share is the rest. |
| Product certificate | Optional text, up to 80 characters (for example an ISO or organic certificate number) |

### 6.2 Money rules

- **Investment:** USD 1 – 10,000,000 per request. It must be at least the listing's minimum (or exactly the remainder, when less than the minimum is left), no more than the remainder, and covered by the wallet. *(Remainder rule agreed, not built.)*
- **Costs:** the cost of goods and paid Step costs together may never exceed the capital raised. Beyond that, finance may approve using sale proceeds already received, or an uncapped treasury overrun fill (§5.4 step 8). Any unused capital stays in escrow and is paid back at settlement. *(Agreed, not built.)*
- **Sale price:** USD 0.01 – 1,000,000,000 per Shipment. It is the sale proceeds actually received in escrow. *(Agreed, not built.)*
- **Withdrawals:** USD 1 – 10,000,000. USD 10,000 or more needs owner approval.
- **Bank credit:** USD 1 – 10,000,000 per event.
- **Treasury top-up:** USD 1 – 100,000,000.

### 6.3 Settlement formula (`settlement.js`)

```
sale price = Σ sale proceeds received (Write-off: insurance or salvage proceeds, or 0)
costs      = Σ cost of goods + Σ paid Step costs                (Step costs: agreed, not built)
gross      = sale price − costs
fee        = 1% of sale price, only if gross > 0, never more than gross
net        = gross − fee
manager    = (100 − investor_share)% of net, only if net > 0   (rounded down → manager)
pool       = net − manager                                       (negative on a loss)
each contribution's profit = its pro-rata slice of pool (largest-remainder rounding, sums exactly)
each payout = its capital + its profit
```

- Contributions come from three places: investors, the manager's deposit and platform funding (the deposit-waiver stand-in, an Overdue fill or an overrun fill).
- Payouts go to these accounts:
  - investor and manager **wallets** (held there, not withdrawable, while the person is suspended or blocked)
  - the **treasury**, for the platform's own capital
  - **platform revenue**, for the fee
- On a loss there is no fee and no manager share. The (negative) pool reduces everyone's capital pro-rata.


### 6.4 Projected returns shown before the sale

```
revenue = target + expected_profit
ROI per cycle  = investor pool ÷ target
ROI per year   = ROI per cycle × 365 ÷ cycle_days        (both rounded to 0.1%)
```

These figures are worked out as if the whole target were investor money.

The manager also sees what they expect to earn:
- a manager share of `net × (100 − investor_share)%`
- profit on their own capital of `pool × company_pct%`

Investors see an expected profit of `pool × their amount ÷ target`.

*Example:* target USD 100,000, expected profit 20,000, investor share 40%, 60-day cycle.
- fee 1,200 → net 18,800
- manager share 11,280 → pool 7,520
- **ROI 7.5% per cycle, 45.7% per year**

*Tested example (a Brazil-to-Japan trade, US-based investor):* target 20,000, investor puts in 16,000, goods cost 18,000, sold for 24,000, investor share 60%. Gross 6,000, fee 240, net 5,760, manager share 2,304, pool 3,456.

### 6.5 Privacy: who sees what on a listing

> **Agreed change, not built yet (2026-10-31):** investors see **every figure** on a listing, and only uploaded documents stay hidden from them (ADR 0004). The code still hides the manager's capital, deposit, expected profit, manager share and result from investors (`listings.view`).

| Data | Investor / public | Owning manager | Staff |
|---|---|---|---|
| Name, route, category, cycle, target, raised, remaining, % funded, minimum, investor share, stage, ROI | ✔ | ✔ | ✔ |
| Shipments, Step plan, Step states, owners, dates, notes, timeline | ✔ | ✔ | ✔ |
| Expected and actual cost of goods, Step costs, expected and actual sale prices, expected profit | ✔ | ✔ | ✔ |
| Manager capital %, deposit amount, manager share, the manager's projected and actual result | ✔ | ✔ | ✔ |
| Treasury contributions (stand-in, Overdue fill, overrun fill); that it is a Shareholder Listing and whether the deposit was waived; the Shareholder share and Reserve fund split | ✔ | ✔ | ✔ |
| Settlement breakdown: sale price, costs, gross, fee, net, pool, payout per contribution | ✔ (other investors anonymised) | ✔ (investors anonymised) | ✔ |
| Own invested amount | ✔ (own) | – | – |
| Which Shareholder the buyer or manager is | ✗ | ✗ | ✔ |
| Uploaded documents, manager's registration file | ✗ | ✔ (own documents) | ✔ |

Visibility rules:
- Investors can browse **live** listings only.
- A non-live listing is visible to an investor only if they invested in it.
- Managers see only their own listings.


### 6.6 Documents

- Accepted types: PDF, JPEG or PNG, up to 5 MB. The file's real content is checked against its type (magic bytes), so a renamed executable is refused.
- The file name is cleaned.
- Each file is stored with its SHA-256 hash.
- Documents attached to an application must belong to the applicant.
- A document can be viewed by **its owner or any staff member**. **Every view is logged.**

### 6.7 Integrity

- Every ledger transaction sums to zero.
- These accounts can never go negative: wallets, escrow, hold, revenue and treasury. A breach rolls back the whole action with *"Insufficient funds"*.
- Deposit confirmation, settlement, bank credits and treasury top-ups are **idempotent**, so a repeat call doesn't double-book.
- Balances are always calculated from ledger entries and are never stored.

---

## 7. Data collected

### 7.1 Account (`users`)

- email, name, password hash
- role: investor, company (manager) or staff; plus the staff role
- active flag, failed-login count, lock-until time, created time

### 7.2 Investor KYC (`applications.type='kyc'`)

| Field | Rule |
|---|---|
| name | Text, as on the ID |
| dob | A real date `YYYY-MM-DD`; the investor must be 18 or older |
| nationality | Any country |
| residence | Country of residence; **not** on the blocked list |
| address, city | Text |
| id_type | passport, national_id, drivers_licence or residence_permit |
| id_number | Text |
| phone | International format: `+`, country code and 7–15 digits in total. Spaces, dashes and brackets are removed. |
| occupation, source_of_funds | Text |
| email | Valid email |
| ack | Confirmation tick (must be true) |

- **Documents:** government photo ID, proof of address.
- Text fields are 1–200 characters each.

### 7.3 Manager registration (`applications.type='company'`)

- type: `company` or `individual`
- business or trading name
- registration or licence number (optional) and state, region or free zone (optional, up to 80 characters each)
- country of registration or residence (not blocked), address, city
- business activities and products (up to 1,500 characters)
- owner or signatory: name, nationality, ID type, ID number
- phone (international format), business email
- years trading, shipments exported so far (whole numbers 0–100,000)
- confirmation tick

**Documents:**
- Business: registration or trade licence, owner photo ID, company profile.
- Individual: own photo ID, proof of address, trading profile.

Each application also records:
- its status
- who it is assigned to
- who decided it, and when
- the rejection reason
- when it was submitted

### 7.4 Shipment listing (`listings`)

- **Set by the manager:** the terms in §6.1.
- **Set by the system or staff:**
  - status and stage
  - assigned reviewer
  - deposit-sent flag
  - cost of goods
  - sale price
  - created, live and completed times

### 7.5 Money and activity

- **Contributions:** listing, source (investor, manager or platform), user and amount.
- **Stage updates:** stage, note, which staff member, and when.
- **Settlements:** raised, cost, revenue, gross, fee, net, manager share, investor pool, and a per-contribution breakdown.
- **Withdrawals:** user, amount, account (IBAN or account number), bank details (holder, bank name, bank country, SWIFT/BIC), status, decided by and when, bank reference.
- **Ledger:** accounts, transactions (type, reference, idempotency key, memo) and entries.
  - Account names are `user:<id>:wallet`, `escrow:<listing>`, `platform:revenue`, `platform:treasury`, `withdrawals:hold` and `bank:external`.
- **Documents:** owner, kind, file name, type, SHA-256, size, storage path and upload time.
- **Audit log:** time, actor and their role, action, entity and detail.
  - Logged actions: register, login, document upload and view, KYC and manager submit (with the country), approve, reject and assign, listing create, approve, reject, assign, deposit sent, deposit confirmed, fund remaining, stage and complete, invest, wallet top-up, treasury top-up, withdrawal request (with the bank country), approve and decline, staff create and update.

### 7.6 In the browser

`localStorage` holds the sign-in token and the chosen visual theme (container, majlis or oasis).

---

## 8. Screens (18)

| Role | Screens |
|---|---|
| Everyone | Sign in / create account |
| Investor (6) | Explore shipments (search, category, sourced-from and sold-in filters) · Shipment details and invest · KYC · My portfolio · Track a shipment · Wallet (balance, statement, withdrawals with bank details) |
| Manager (5) | Registration (business or individual) · Overview · My shipments · Shipment details (deposit, funding, terms, expected and actual result) · List a shipment (with a live ROI preview) |
| Staff (7) | Home (items to review, live count, amount raised, ledger check) · Review (investors, managers, new listings, deposits) · Funding overdue · Shipments · Shipment details (deposit, fund, advance, complete) · Money (withdrawals with bank details, treasury) · Team (staff and activity log) |

Every page shows a footer: the platform operator and country, that it is open to investors and managers worldwide, and that amounts are in US dollars.

---

## 9. Not built yet (from the backend README)

1. Licences, exemptions and investor-protection rules for each market served, and the real blocked-country list from compliance.
2. Bank integration: a USD escrow account, a payment reference per user, and a real bank feed. Bank references are typed in by hand today.
3. Currency conversion for users who hold other currencies.
4. KYC/AML provider: sanctions and politically-exposed-person screening, and an identity check. Staff currently check documents by eye. Per-country document rules.
5. Tax withholding and reporting.
6. PostgreSQL instead of SQLite, with backups and encryption at rest.
7. Encrypted object storage for documents, with a retention policy, and rules on where each country's personal data may be stored.
8. Native mobile app for investors, and languages other than English.
9. Notifications (email, SMS, push), rate limiting, TLS, monitoring, and a security review.
10. Legal text: terms, risk disclosure, privacy policy, and wording that returns are estimates, per country and language.
11. Shareholders, Shareholder Listings, the deposit waiver and the Reserve fund (§11).

---

## 10. Gaps and inconsistencies found in the code

Fixed in the global upgrade:
- ~~A signed but malformed webhook body returned a generic 500 error.~~ It now returns a 400.
- ~~The UI told investors to quote their email on a bank transfer while the webhook matched a user ID.~~ The wallet now shows the reference `SHE-<id>`. The webhook still matches on `user_id`, so the bank feed must map the reference to it.
- ~~Date of birth, phone and ID type were only length-checked.~~ Date of birth (real date, 18+), phone (international) and ID type are now validated.

Still open:
1. **Bank credits ignore approval status.** The webhook credits any investor or manager, even one whose KYC or registration was never approved. Withdrawals do check approval. *(Resolved by the agreed change in §5.5: only approved users can top up through the gateway.)*
2. **Treasury top-ups are de-duplicated by bank reference.** Entering the same reference twice silently books nothing the second time.
3. **A remaining amount smaller than the minimum investment can't be filled by investors.** For example, USD 300 left on a listing with a minimum of USD 1,000. Only platform funding can close it. *(Resolved by the agreed change in §5.4: an investor may invest exactly the remainder.)*
4. **A rejected listing is final.** There is no edit-and-resubmit path, unlike applications. *(Resolved by the agreed change in §5.4.)*
5. **The deposit-sent flag is informational only.** Finance can confirm a deposit the manager never marked as sent. *(Goes away with the agreed change in §5.4: the deposit is paid from the wallet.)*
6. **Settlement has no second approval.** One ops user enters the sale price and every wallet is paid at once. *(Resolved by the agreed change in §5.4: ops proposes, a different finance or owner user approves, and the sale proceeds must be in escrow.)*
7. **The blocked list only checks where someone lives or is registered.** It does not screen names, owners' nationalities or counterparties, and a person who moves country isn't re-checked until their next submission.
8. **The account-holder name isn't compared to the user's name.** Finance checks it by eye.
9. **Flag emoji don't render on Windows browsers.** The country name is always shown next to it.
10. **Existing data in AED is not converted.** Older databases keep their numbers as they were.

---

## 11. Planned: Shareholders and Shareholder Listings

**Status: agreed on 2026-10-31, not built yet.** Source: `docs/Equitry Invesstors/New User-Equity Investor.txt`, and the decisions recorded in `GLOSSARY.md` and `docs/adr/0001-shareholder-share-of-treasury-profit.md`.

### 11.1 Who Shareholders are

- About **10 Shareholders**, each owning **1% of Shehnat**, mostly importers. Their money goes to Shehnat's expenses and treasury.
- The stake is bought and documented **outside the platform**. Shehnat doesn't sell shares, keep a share register or pay dividends.
- On Shehnat, the **owner marks** an existing **approved** investor or manager account as a Shareholder, and can remove the mark. Both actions are audited. A Shareholder has no extra screens: payouts arrive in their wallet.
- A Shareholder who lists a trade as a **manager** keeps the usual manager benefits and obligations, including paying their own manager deposit.

### 11.2 Shareholder Listing

A Listing is a **Shareholder Listing** when its **buyer** or its **manager** is a Shareholder.

- **Buyer link:** today the buyer is recorded only as a country. During the listing review, staff (`review`) also record **which Shareholder** the buyer is, if any. The manager doesn't choose this and the Shareholder doesn't confirm it. It is locked at approval.
- The reviewer **checks the expected sale price against the market** before approval, because a Shareholder-buyer who pays a low price lowers the investors' profit. The settlement approver checks the sale document against it. There is no fixed tolerance yet.
- **Investors are told** that a Listing is a Shareholder Listing, whether the deposit was waived, the treasury amounts and the Shareholder share and Reserve fund split, but **not which Shareholder** (§6.5, ADR 0004).
- The same Shareholder may be both the manager and the buyer.

### 11.3 Deposit waiver (only when the buyer is a Shareholder)

- **Owner or finance** (`deposit`) may waive the manager deposit during the listing review, before approval. It is audited and locked once the Listing is approved.
- It is **all or nothing**: the manager pays the full deposit or none of it.
- When the Listing goes live, the treasury puts in a **stand-in contribution** of the waiver stand-in % of the funding target (**default 20%**, a setting of its own, separate from the 20–90% manager deposit range).
- Investors fund the rest. If the Listing becomes **Overdue**, ops or the owner fill the balance from the treasury as usual (§5.4 step 6). Nothing is filled automatically.
- The manager still receives the **manager share** of net profit, but earns nothing on capital because they put none in.
- There is no waiver when only the manager is a Shareholder.

### 11.4 Settlement on a Shareholder Listing

The formula in §6.3 is unchanged, **including the 1% service fee on the sale price**. One extra step applies to the treasury's profit:

```
treasury profit   = sum of the pool slices of every treasury contribution on the Listing
                    (the waiver stand-in and any Overdue fill)
if treasury profit > 0:
  shareholder     = shareholder_share% of treasury profit       (default 75%, fixed when the Listing is approved)
  reserve         = treasury profit − shareholder                (default 25%)
treasury payout   = treasury capital (+ treasury profit if ≤ 0)
```

- The **Shareholder share** is paid to the Shareholder's **wallet**, and the rest to the **Reserve fund**, in the same settlement transaction.
- If the manager and the buyer are **two different Shareholders**, they split the Shareholder share **equally**. If one Shareholder is both, they get all of it.
- **Loss:** treasury contributions lose pro-rata like everyone else's. The Shareholder bears none of the loss, and the Reserve fund is not drawn on automatically.
- Rounding *(proposed)*: the Shareholder share is rounded down to the cent and the remainder goes to the Reserve fund. In an equal split between two Shareholders, the odd cent goes to the buyer.

*Example:* target USD 100,000, buyer is a Shareholder, deposit waived, investor share 60%.
- The treasury stand-in is 20,000. Investors put in 70,000. The Listing goes Overdue and the treasury fills 10,000, so the treasury holds 30,000 (30%).
- Cost of goods 95,000, sold for 110,000 → gross 15,000, fee 1,100, net 13,900.
- Manager share (40%) 5,560 → pool 8,340.
- Investors' slice (70%) 5,838. Treasury's slice (30%) 2,502.
- Treasury profit 2,502 → **Shareholder 1,876.50**, **Reserve fund 625.50**. The treasury gets its 30,000 capital back.

### 11.5 Reserve fund

- A new platform ledger account, separate from the treasury (proposed name `platform:reserve`). It **can never go negative**.
- It receives the Reserve fund part of the treasury's profit on Shareholder Listings.
- Only the **owner** moves money out of it, at their discretion. Every move is audited.

### 11.6 Settings, permissions and audit

| Setting | Default | Rule |
|---|---|---|
| Waiver stand-in % | 20% | Treasury stand-in for a waived manager deposit, as a % of the funding target |
| Shareholder share % | 75% | Share of the treasury's profit paid to the Shareholder; the rest goes to the Reserve fund. Fixed for each Listing at approval. |

| Action | Who |
|---|---|
| Mark or unmark a Shareholder | owner |
| Record the buyer as a Shareholder (listing review) | reviewer, owner |
| Waive the manager deposit (listing review) | finance, owner |
| Move money out of the Reserve fund | owner |

New audited actions: shareholder mark and unmark, buyer-shareholder link, deposit waiver, waiver stand-in funding, shareholder payout, Reserve fund movement.

### 11.7 Open questions

1. A fixed tolerance for related-party sale prices, if any.
2. A Shariah board may treat the Shareholder share as a hidden discount to the buyer on the sale price.
3. ~~Whether investors should be told about the Shareholder relationship.~~ Resolved: they are told, but not which Shareholder (ADR 0004).
