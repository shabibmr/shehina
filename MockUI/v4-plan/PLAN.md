# Mock UI v4: plan

> **PROTOTYPE, throwaway.** Nothing here is production code. The validated decisions go into `Demo/`, and the prototype itself is kept on a throwaway branch (`prototype/mockui-v4`), not on `main`.

> The task register, milestones and order of work are in [`TASKS.md`](TASKS.md). How the mock applies the design system is in [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md).

## 1. The question this prototype answers

**Does the agreed Shehnat product hold together end to end, for every role, on a phone, in the new design system with its motion?**

v1–v3 tested pieces of the model (listings, step plans) in plain styling. v4 is the first mock that:

- uses the **design system** (`docs/design-system.md`, `Demo/frontend/tokens.css`) and the draft brand assets;
- runs the **agreed workflow** in `business-req/BUSINESS_REQUIREMENTS.md` §5.4 and §11, not the older built one: multiple Shipments, Step plans that drive Stages, Revised terms, the deposit paid from the wallet, four-eyes Settlement, Write-off and Resale, Overrun fill, Shareholder Listings, deposit waiver, Reserve fund, gateway top-ups;
- lets one person **play every user type** (switching persona in one click) through **every screen**, with **temporary storage** so a journey survives a reload and can be reset;
- plays the **motion catalogue** in real screens, not in a lab.

What we expect to learn: missing screens or states, actions in the wrong place, flows with too many steps on a phone, figures investors can't understand, rules that feel wrong once clicked through (four-eyes, remainder rule, 14-day auto-withdraw, Overdue), and whether the motion helps or gets in the way.

## 2. Shape and how to run it

- **Location:** `MockUI/v4/`, next to v1–v3.
- **Run:** double-click `MockUI/v4/index.html`. There is no server and no build. It uses classic `<script>` files, not ES modules, so it works from `file://`.
- **Reuses the real design system** by relative path: `../../Demo/frontend/tokens.css` and `../../Demo/frontend/brand/*`. Prototype component CSS lives in `v4/proto.css`, starting from the styleguide's reference components.
- **Files:**

| File | Holds |
|---|---|
| `index.html` | Shell: header, screen host, tab bar or sidebar, sheet and toast layers, prototype bar |
| `proto.css` | Components and layouts (from `styleguide.css`, extended) |
| `logic.js` | **Pure** domain module, with no DOM: money maths (settlement §6.3 and §11.4, projection §6.4), Stage derivation from Steps, validations (IBAN, SWIFT, phone, DOB 18+, blocked countries, listing terms), the permission map, four-eyes checks, and state transitions as `(state, action) → state`. It could later move into `Demo/backend`. |
| `store.js` | Temporary storage: load and save the whole state as one JSON object in `localStorage` under the key `shehnat-proto-v4` (*PROTOTYPE, wipe me*). Also seed, reset, export and import, and the simulated clock. |
| `seed.js` | The demo world: personas, Listings in every status, wallets, history |
| `motion.js` | The motion catalogue as reusable functions (screen transitions, sheet, count-up, sprout, route, doors, cascade, tab bar, toast), honouring reduced motion. Ported from `styleguide.js`. |
| `ui.js` | Router, rendering helpers, components (cards, chips, money, forms, sheets, door, route, step board) |
| `screens-public.js`, `screens-investor.js`, `screens-manager.js`, `screens-staff.js` | One file per audience, registering screens |
| `../v4-plan/PLAN.md`, `../v4-plan/TASKS.md` | This plan and the task register |

- **Rule: surface the state.** A state inspector drawer always shows the current entity, the wallet and escrow balances, the ledger check and the latest audit entries, so every click visibly changes something.

## 3. Prototype controls (not part of the design under test)

A dark floating **prototype bar**, visually distinct from the app, holds:

| Control | Purpose |
|---|---|
| **Persona switcher** | Become any seeded user in one tap (see §4). It shows the role chip. The current screen is kept when the new persona can see it, otherwise it goes to that persona's home. |
| **Clock** | Simulated "today", with +1 day, +5 days and +14 days. This drives Overdue (5 days), Late Steps and Listings, and auto-withdrawal (14 days). |
| **Scenarios** | Jump straight to a seeded situation, e.g. "Listing ready to settle", "Shareholder Listing with waiver", "Overdue Listing", "KYC rejected", "Revised terms waiting", "Withdrawal ≥ USD 10,000". |
| **Simulated outside events** | The payment gateway confirms or fails a top-up, a bank payout fails (money returns to the wallet), the buyer pays sale proceeds (full or short), the manager is suspended, a country is added to the blocked list. |
| **State inspector** | The drawer described in §2. |
| **Motion** | System, full or reduced (as in the styleguide). |
| **Direction** | Left to right or right to left. |
| **Frame** | A phone frame (390 × 844) on desktop, or full width (so the staff console's ≥1024px layout can be judged). |
| **Data** | Reset to seed, export JSON, import JSON. |

## 4. Personas (seed)

| Persona | Role | State at seed | Used for |
|---|---|---|---|
| Aisha Rahman | Investor, UAE | KYC approved, wallet USD 25,000, 3 investments (live, completed with profit, completed with loss) | The happy path, portfolio, statements |
| Ben Carter | Investor, UK | New, no KYC | Onboarding from scratch |
| Chen Li | Investor, Singapore | KYC pending | The pending state, and what the reviewer sees |
| Dina Haddad | Investor, Jordan | KYC rejected (photo ID unreadable) | Rejected → fix → resubmit |
| Kerala Spice Traders LLP | Manager (business), India | Approved, wallet USD 60,000, exposure limit USD 500,000 | Listing life cycle, deposit, Steps |
| Mateo Rojas | Manager (individual), Chile | Registration pending | The "Almost there" gate |
| Omar Al-Said | Manager **and Shareholder**, Oman | Approved, marked as a Shareholder | A Shareholder Listing as manager |
| Layla Nasser | Investor **and Shareholder**, UAE | Approved; a Shareholder buyer on one Listing | The Shareholder-buyer payout |
| Hadi Karim | Staff: owner | Active | Everything, including ≥ USD 10,000 withdrawals, team, settings, Reserve fund |
| Priya Nair | Staff: reviewer | Active | Reviews, assignment, Revised terms |
| Sam Okafor | Staff: ops | Active | Steps, costs, proposing settlement |
| Wei Zhang | Staff: ops (second) | Active | Four-eyes: verifying another ops user's work |
| Fatima Zaid | Staff: finance | Active | Withdrawals < USD 10,000, approving settlement and overrun fills, treasury, deposit waiver |

**Seeded Listings**, at least one in every status: draft · in review (assigned to Priya) · awaiting Revised terms · rejected (with history) · approved with the deposit due (day 12 of 14) · withdrawn · live and funding (fresh) · live and **Overdue** (day 6) · live with 2 Shipments running in parallel, one with a **Late** Step · live with one Shipment needing a Write-off decision · settlement proposed (waiting for finance) · completed at a profit · completed at a loss · cancelled (refunded) · a **Shareholder Listing** with a deposit waiver and a treasury stand-in.

## 5. Screen inventory

Each screen is built with its **loading (skeleton), empty, error and success** states where they apply. The IDs are used in the task register ([`TASKS.md`](TASKS.md)).

### Public and shared (P)

| ID | Screen | Notes |
|---|---|---|
| P1 | Splash | Full logo; the sprout grows; then it routes to sign-in or home |
| P2 | Welcome walkthrough (3 slides) | How it works · capital at risk · full transparency. Can be skipped. |
| P3 | Sign in | Errors: wrong password (attempts left), **locked for 15 minutes**, deactivated |
| P4 | Create account | "I want to invest" or "I manage shipments". Email, name, password (rules shown as you type) |
| P5 | Forgot password | Mock only: "a link was sent" |
| P6 | Notifications centre | Per persona, from state changes (approved, rejected, deposit due, payout, Late…) |
| P7 | Profile and settings | Personal details (read only after KYC), security, language (Arabic "coming soon"), sign out |
| P8 | Risk and legal | Risk disclosure; returns are estimates; operator and country; USD only |

### Investor (I)

| ID | Screen | Notes |
|---|---|---|
| I1 | Home | Wallet panel (count-up), portfolio summary, KYC banner by status, actions due, featured live Listings (cascade) |
| I2 | KYC wizard | Intro → personal → residence (blocked countries left out, with a note) → ID → documents (2 uploads, mock files) → review and declaration → submitted |
| I3 | KYC status | Pending · rejected (reason + "Fix and resubmit") · approved (sprout). Registration timeline of attempts. |
| I4 | Explore | Search; filters for category, sourced from, sold in, Shareholder Listing; sort; Overdue and "almost funded" badges |
| I5 | Listing detail | Door-opening transition. Tabs: Overview · Shipments and Steps · Figures (every figure, ADR 0004) · Timeline. Shareholder Listing and waiver disclosure. Risk note. |
| I6 | Invest sheet | Amount; minimum and **exactly-the-remainder** rule; wallet check with a "Top up" shortcut; expected profit (neutral, "expected"); confirm |
| I7 | Investment confirmed | Sprout ceremony, receipt, "Track this shipment" |
| I8 | Portfolio | Tabs: active · completed · ended (cancelled, refunded). Per-holding expected or realised result. |
| I9 | Track a Listing | Route per Shipment (draw and vessel), Stage per Shipment, Late with the revised date, timeline |
| I10 | Settlement statement | Sale price, costs, gross, fee, net, manager share, pool, **my payout**, other investors anonymised, treasury and Shareholder split where relevant |
| I11 | Wallet | Balance (count-up), held amount, statement (filter by type), withdrawals list |
| I12 | Top-up | Amount → mock **payment gateway** sheet → processing → success (credited) or failure. Approved users only. |
| I13 | Withdraw | Amount; bank country (blocked list), bank name, holder, IBAN or account (checksum and country match), SWIFT (8 or 11 characters, country match); note for ≥ USD 10,000 → held |
| I14 | Withdrawal status | Requested → approved and paid · declined (reason, returned) · payout failed (returned automatically) |

### Manager (M)

| ID | Screen | Notes |
|---|---|---|
| M1 | Registration wizard | Type (business or individual) → business details → owner or signatory → documents (**differ by type**) → declaration → submitted |
| M2 | Registration status and gate | "Almost there" gate on every manager screen until approved; pending, rejected (resubmit) or approved |
| M3 | Overview | Exposure used of the limit (bar), Listings by status, **actions due** (respond to Revised terms, pay deposit by day N, my Steps due, Late), wallet |
| M4 | My Listings | Tabs: drafts · in review · action needed · live · completed · ended |
| M5 | New Listing wizard | Basics (name, category, sourced from, buyer country (must differ), certificate, **prohibited goods** notice) → Shipments (add or remove; expected cost of goods, expected sale price, planned start) → Step plan → terms (deposit 20–90%, investor share 40–95%, minimum) → preview → save draft or submit |
| M6 | Step plan editor | Starts from the standard template; add, remove and reorder Steps; owner (manager or staff), duration, planned costs, Stage tag, counterparty; a **Stage coverage check**; copied to each Shipment |
| M7 | Live preview | Calculated funding target, cycle and expected profit; ROI per cycle and per year; manager's expected share and capital profit; **exposure check** |
| M8 | Listing detail (manager) | A status banner with the next action: edit or delete a draft, withdraw (before live), respond to Revised terms, pay the deposit (days left), funding progress, Shipments and Steps, figures (expected vs actual), settlement result |
| M9 | Revised terms | Side-by-side **diff** of the reviewer's changes; accept (→ approved) or decline (→ back to edit) |
| M10 | Pay deposit | Wallet check → top-up shortcut → pay → **goes live** (sprout "Listing is live") |
| M11 | My Step | A manager-owned Step: counterparty, required documents (upload), mark in progress or done |
| M12 | Propose a plan change | On a live Listing: add, remove or reorder Steps, durations, owners, tags, costs → sent for approval |
| M13 | Wallet, top-up, withdraw | Shared with I11–I14 |

### Staff console (S): phone first, full layout from 1024px

| ID | Screen | Notes |
|---|---|---|
| S1 | Home | Queues for this role, KPIs (live Listings, raised, treasury, Reserve fund), Overdue and Late counts, the ledger check (owner) |
| S2 | Review queue | Tabs: investors · managers · Listings. Assigned to me, unassigned, all. Assign or clear. |
| S3 | Application review | Fields, documents (mock viewer, "this view is logged"), blocked-country re-check, history of attempts; approve, or reject with a reason; only the assignee or an owner decides |
| S4 | Listing review | Terms and calculated figures; **market check** of the expected sale price (required on a Shareholder Listing); the Step plan with **required documents per Step** and Stage coverage; mark the **buyer as a Shareholder** (reviewer or owner); **waive the deposit** (finance or owner); exposure re-check; approve, reject with a reason, or send **Revised terms** |
| S5 | Revised terms editor | Edit any term or Step, with the diff the manager will see |
| S6 | Funding overdue | Listings at stage 0 for ≥ 5 days; **fill the remainder from the treasury** or leave it open |
| S7 | All Listings | Filter by status, Stage, Late, Shareholder; search |
| S8 | Listing operations | Per Shipment, a **Step board** (planned → in progress → done → verified; blocked; skip request); documents; **pay Step costs from escrow** with proof; **unplanned cost** (→ finance approval); **sale proceeds** (record, shortfall reason); **use proceeds** for a later Shipment (→ finance); **overrun fill** request; **Write-off or Resale** proposal; **cancel** (before goods are bought); **propose settlement** (only when the gate is met) |
| S9 | Approvals inbox | Every second-person decision in one place: settlement, overrun fill, unplanned cost, skip a Step, plan change, Write-off or Resale, use of proceeds, Resale to a Shareholder (owner). **The proposer can't approve** (shown, not hidden). |
| S10 | Settlement approval | The computed breakdown per Contribution; the treasury profit → **Shareholder share and Reserve fund**; approve (payout ceremony across wallets) or send back with a reason |
| S11 | Money | Withdrawals queue (approve with a reference, decline with a reason; **≥ USD 10,000 owner only**), treasury (balance, top-up with reference), platform revenue, **Reserve fund** (owner moves money out, audited) |
| S12 | Team (owner) | Staff list; add; change role; deactivate (not yourself; can't remove your own owner role) |
| S13 | Shareholders (owner) | Mark or unmark approved investors and managers; their Shareholder Listings and payouts |
| S14 | Users | Look up any investor or manager; suspend (payouts held); per-manager **exposure limit** (owner) |
| S15 | Settings (owner) | Exposure default, waiver stand-in %, Shareholder share %, auto-withdraw days, Overdue days, blocked countries, prohibited goods |
| S16 | Audit log | Filter by actor, action and entity; documents viewed |
| S17 | Ledger | Accounts (wallets, escrows, treasury, revenue, reserve, hold) with balances derived from entries; the sum-to-zero check |

**Total: 8 public + 14 investor + 13 manager + 17 staff = 52 screens**, plus the prototype bar.

## 6. End-to-end journeys to walk (acceptance scenarios)

Each journey must be completable by clicking only, switching persona where the journey says so.

1. **Investor onboarding.** Ben signs up → KYC wizard → submitted → *Priya* rejects with a reason → *Ben* fixes and resubmits → *Priya* approves (sprout) → Ben tops up through the gateway → invests the minimum.
2. **Manager onboarding.** Mateo (individual) completes registration (individual documents) → *Priya* approves → the gate lifts.
3. **Listing from draft to live.** Kerala drafts a Listing with 2 Shipments and an edited Step plan → preview → submit → *Priya* sends Revised terms (investor share 50 → 55%) → *Kerala* accepts → pays the deposit from the wallet (tops up first if short) → **live**.
4. **Funding with the remainder rule.** Aisha invests; a USD 300 remainder with a USD 1,000 minimum lets Chen (after approval) invest exactly USD 300 → 100% funded.
5. **Overdue.** Clock +5 days → the Listing appears on Funding overdue → *Sam* fills from the treasury.
6. **Running the Shipments.** *Sam* moves Steps; *Kerala* completes their own Step with a document; *Wei* verifies the payment Step; Stages advance by themselves; one Step goes Late (clock) → investors see the revised date; *Sam* pays Step costs from escrow; an unplanned cost → *Fatima* approves.
7. **A problem Shipment.** The buyer rejects Shipment 2 → *Sam* proposes a Resale → *Wei* approves → the new buyer pays the proceeds.
8. **Overrun.** Costs exceed the capital raised → *Sam* requests an overrun fill → *Fatima* approves → the treasury's Contribution dilutes the others.
9. **Settlement, four-eyes.** Every Shipment is sold → *Sam* proposes settlement → *Sam* can't approve it → *Fatima* approves → payout ceremony → Aisha sees her settlement statement and wallet credit.
10. **Shareholder Listing.** Omar lists with a Shareholder buyer (Layla) → *Priya* records the buyer link and does the market check → *Fatima* waives the deposit → approved → live with a treasury stand-in → … → settlement splits the treasury profit 75% to the Shareholders (shared equally by Omar and Layla, as two different Shareholders) and 25% to the Reserve fund → *Hadi* moves money out of the Reserve fund.
11. **Withdrawals.** Aisha withdraws USD 2,000 → *Fatima* approves with a reference; Aisha withdraws USD 12,000 → *Fatima* can't → *Hadi* approves; a payout failure (simulated) returns the money.
12. **Ending early.** A deposit left unpaid for 14 days (clock) → auto-withdrawn; *Sam* cancels a funded Listing before goods are bought → everyone is refunded.
13. **Owner admin.** *Hadi* adds a staff member, changes a role, tries to deactivate himself (refused), marks a Shareholder, sets a per-manager exposure limit, reads the audit log, and runs the ledger check.
14. **Compliance events.** The manager is suspended mid-Listing (simulated) → ops takes over their Steps → their payout is held at settlement. A country is added to the blocked list → a new withdrawal to it is refused.

## 7. Motion mapping

The motion map (which of the nine choreographies plays on which screen), the component inventory, navigation per role and the states every screen needs are in [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) §3–§6.

## 8. Out of scope

Real back-end calls, real payments, a real document viewer (mock files are coloured placeholders with a name and size), email and SMS, Arabic translation (the right-to-left layout is in scope; translated text isn't), dark theme, accessibility audit beyond keyboard and focus basics, tests.

## 9. Decisions taken for the prototype (open to change)

- **Temporary storage = `localStorage`**, one key, with reset, export and import, because the request asked for state that survives screen changes and reloads. It is clearly marked as prototype data.
- **The agreed workflow (§5.4, §11) wins over the built code** wherever they differ.
- **Uploads are simulated:** a file picker accepts any file but stores only its name, type and size; the viewer shows a placeholder.
- **The payment gateway is a mock sheet** that looks like a neutral third-party checkout (no real brand), with "Pay" and "Fail" buttons.
- **One shared Wallet set of screens** (I11–I14) serves investors and managers.
