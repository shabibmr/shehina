# Prompt: build the Shehnat demo app

Paste everything below the line into a fresh Claude Code session at the repo root (`E:\work\Shehna`).

---

You are building **the Shehnat demo app**: a clickable, fully working, front-end-only prototype of the whole product. One person can sign in as an **Investor**, a **Manager**, or **Staff** (owner / reviewer / ops / finance) and run a container-export deal from start to finish. What one role does shows up for the others, because **all roles share one persistent memory**.

It is a demo for stakeholders, not production. It has no backend, no network calls and no third-party packages. The goal is that a viewer who clicks through it believes the product exists, trusts its numbers, and enjoys its motion.

## 0. Read first (do not skip)

Before writing code, read these files. They are the source of truth. If this prompt and a file disagree, the file wins; list the disagreement in your final report.

1. `CLAUDE.md`: project rules (zero dependencies, USD only, cents internally, no inline scripts).
2. `GLOSSARY.md`: every domain term and business rule. Use its exact words in the UI.
3. `docs/design-system.md`: the Shehnat design system (tokens, components, motion catalogue, accessibility). **Follow it exactly.**
4. `docs/adr/0001` to `0005`: accepted decisions. Note ADR 0004 (investors see every Listing figure) and ADR 0005 (one brand theme).
5. `Demo/frontend/tokens.css`, `Demo/frontend/styleguide.css`, `Demo/frontend/styleguide.js`, `Demo/frontend/brand/*`: reuse the tokens, component CSS, existing icon paths and brand SVGs. Copy them; do not redraw what exists.
6. `Demo/backend/src/settlement.js`, `listings.js`, `wallet.js`, `config.js`: the real maths, stages, limits and withdrawal rules. Port the logic to the demo's JS.
7. `MockUI/v4-plan/PLAN.md` and `MockUI/v4/manager-dashboard.prototype.html`: earlier design thinking. Reuse good ideas, ignore anything that conflicts with the design system.
8. Memory notes: the name is **"Shehnat"** (never "Shehna"). The seed manager is a UAE business shipping from **Jebel Ali**. Everything is **USD**.

Where the backend README says investors can't see the manager's figures, ignore it: ADR 0004 reversed that. **Investors see every Listing figure**, but never uploaded documents and never *which* Shareholder is involved.

## 1. Output and constraints

- Create everything in `MockUI/demo/`. Entry point: `MockUI/demo/index.html`.
- **Zero third-party code.** Plain HTML, CSS, JavaScript. IBM Plex Sans from Google Fonts is the only external resource, with a system-font fallback so the app still works offline.
- It must work by **double-clicking `index.html`** (`file://`). So use classic `<script defer>` files that attach to one global `Shehnat` namespace, **not** ES modules. No build step.
- Suggested files: `index.html`, `tokens.css` (copied), `app.css`, `store.js`, `rules.js`, `seed.js`, `icons.js`, `motion.js`, `ui.js`, `investor.js`, `manager.js`, `staff.js`, `main.js`. Keep each file focused.
- No inline scripts and no inline event handlers (the real app runs under a strict CSP). Use event delegation. Escape every interpolated value with an `esc()` helper.
- Mobile first at 360px. Test at 320, 360, 768, 1024 and 1440px. Investor and manager screens: one column, max 600px. Staff console: tables and list/detail, sidebar from 1024px.
- Use **logical CSS properties only** (`margin-inline-start`, not `margin-left`), so right-to-left works. Put a hidden `dir` toggle in the dev panel (section 12) to prove it.
- Use semantic tokens (`--action`, `--surface-card`, ...) only, never the primitives. Light theme only. No look picker, no `data-look`.
- Money: store **integer cents**, format with a `usd()` helper, never use floats past input parsing (inputs accept at most 2 decimals). Use `−` (U+2212) for losses.
- Time: all logic reads a `now()` from the store's clock so the demo can time-travel (section 12).

## 2. The big idea: shared memory across roles

All state lives in **one store** in `store.js`, persisted to `localStorage` under the key `shehnat.demo.v1`. The store is the only thing that knows data; screens are pure functions of it.

**Requirements**

1. **One world.** Users, KYC and manager applications, listings, shipments, steps, contributions, wallets, withdrawals, ledger entries, notifications, audit log and settings are all in the store. The three roles are three views of it.
2. **Switching roles keeps everything.** A role switcher (section 12) swaps the signed-in user without resetting anything. If the investor invests $5,000, then you switch to Manager, the funding bar on the Manager's listing has already moved. Switch to Staff and the ledger and audit log show it.
3. **Per-user session memory.** Remember, for each user: last-open tab, scroll position per tab, open filters and sort, form drafts (KYC, new listing, withdrawal, invest amount), which onboarding hints were dismissed, and which notifications they have read. Coming back to a role puts it exactly where it was left.
4. **Event log.** Every state change goes through `store.dispatch(action)`, which (a) validates it against `rules.js`, (b) applies it, (c) appends an event `{id, at, actor, type, listingId?, note}` to the audit log, (d) writes any ledger entries, (e) creates notifications for affected users, and (f) saves. Never mutate state anywhere else.
5. **Double-entry ledger.** Every money movement posts balanced entries (sum zero) between named accounts: `user:<id>:wallet`, `escrow:<listingId>`, `platform:revenue`, `platform:treasury`, `platform:reserve`, `withdrawals:hold`, `bank:external`. Balances are derived from entries, never stored. A non-protected account may not go negative: throw `insufficient_funds` and change nothing. A `ledgerCheck()` function powers a green "Ledger balanced" check in the staff console.
6. **Live across tabs.** Listen to the `storage` event so two browser tabs (for example investor in one, staff in the other) stay in sync, with the same entrance animations for changes that arrive.
7. **Safe persistence.** Wrap every storage call in try/catch. If storage is blocked, run in memory and show a quiet banner: "Changes won't be saved." Version the schema; if the saved version is older, reset with a toast.
8. **Reset and export.** The dev panel has "Reset demo" (re-seed, confirm first), "Export state" (download JSON) and "Import state".
9. **Notifications are memory too.** Each user has an inbox. Events create notifications for the right people (see section 8). The bell shows an unread badge that scales in (motion 8).

## 3. Roles, sign-in and onboarding

**Sign-in screen.** The full logo (`brand/logo-full.png`) on sand, a short line ("Invest in real shipments."), and three big cards: *I invest*, *I manage shipments*, *Staff*. Each opens a sign-in with a prefilled demo account and a "Use demo account" button. Registration is a real flow (below). No real authentication: it just sets the current user.

**Seeded users** (enough that every screen has content on first load):

- Investors: *Amira Haddad* (approved, wallet $25,000, invests in 2 live listings, 1 completed with a profit), *Lucas Ferreira* (approved, Brazil), *Priya Nair* (KYC pending, to demo review).
- Managers: *Gulf Harvest Trading LLC* (business, UAE, approved, origin Jebel Ali), *Kenji Mori* (individual trader, Japan, approved), *Silk Route Imports* (registration pending).
- Staff: Owner (*Omar*), Reviewer, Ops, Finance (one each).
- Shareholders: mark two existing accounts as Shareholders (one investor, one manager). Investors are never told which.

**Investor onboarding (KYC).** A 4-step wizard with a progress rail: Identity (ID type: passport / national ID / driving licence / residence permit, number, country of residence, date of birth) → Contact (international phone starting `+`) → Documents (2 uploads, simulated with a file picker that only stores name and size) → Review and submit. Rules: age 18 or older, real date, phone with `+` and country code, **country not blocked** (CU, IR, KP, SY: show a calm, specific message, never a generic error). Status flows `draft → pending → approved | rejected` and appears on the investor's Home as a banner. Investors who aren't approved can browse but cannot invest.

**Manager registration.** A Business or an Individual trader (a segmented control). Business: registration document, owner ID, business profile. Individual: owner ID, proof of address, trading profile. Country of registration or residence is checked against the blocked list at submit and again at approval. Only approved managers can list.

**Staff** accounts are created by the owner under Team.

## 4. Screens per role

Use the exact tab sets from the design system. Every list has a skeleton state, an empty state (duotone icon, one sentence, one action) and an error state.

### 4.1 Investor (bottom tabs: Home · Shipments · Wallet · Profile)

- **Home.** Greeting; wallet panel (brand-green surface, money count-up, "Available" label); portfolio summary (invested, expected return, realised result) with expected and realised figures styled per the money rules; "Needs attention" banners (KYC state, a late shipment, a payout received); active investments as shipment cards with route progress.
- **Shipments** (marketplace). Filters (category: Food, Building, Textiles, Energy, Other; origin country; destination country; sort by return, funded %, days left) and search. Cards follow the design-system shipment card: door strip, name, route ("India → Netherlands · 90-day cycle"), 3 KPIs (expected return, target, minimum), funding bar, "% funded · $ raised of $ target · days left". Chips: Live, Late, Shareholder Listing (never names the Shareholder), Deposit waived.
- **Shipment detail.** Tall door header, then: summary and the **Invest** button pinned to the bottom half; route with vessel; **Timeline** (every Step: owner, planned duration, state, dates, expected and actual cost, with Late flags); **Numbers** (cost of goods, step costs, expected sale price, expected profit, Manager deposit, Manager share, Investor share %, treasury contributions, all labelled "expected" until real); contributors (other investors anonymised: "Investor #3"); the settlement breakdown once complete. **Uploaded documents are not shown** (show "Documents are reviewed by Shehnat" with a shield icon).
- **Invest sheet** (bottom sheet): amount input (`$` prefix, min and max helper text, remaining capacity), quick chips (min, $1,000, $5,000, max), live preview of "your share of the pool %" and "expected return" (neutral ink, "expected"), risk line ("Returns are estimates, not guarantees"), a confirm button. On success: money leaves the wallet to `escrow:<listing>`, the funding bar fills, the **sprout ceremony** plays, a receipt appears. Reject with a clear message if: not approved, below minimum, above what is left, wallet short ("Add $X to invest" with a top-up shortcut), country blocked, listing not live.
- **Wallet.** Balance (count-up), Top-up (sandbox, amount sheet, simulated gateway with a short processing animation, credits the exact amount once), Withdraw (see 4.4), transaction history (grouped by day, signed, labelled, filter chips).
- **Profile.** KYC status, personal details, notification preferences (toggles, stored only), documents list (names only), sign out.

### 4.2 Manager (bottom tabs: Home · My listings · Wallet · Profile)

- **Home.** Exposure used vs limit (a meter), listings by state, tasks ("Pay your deposit", "Answer revised terms", "Upload invoice for Step 4"), recent activity.
- **Create a Listing** (a multi-step wizard with draft autosave): 1 Goods (name, category, **prohibited goods check** against the configurable list shown inline) → 2 Shipments (declare the number of containers; fixed after approval; per-shipment cost of goods, expected sale price, planned start day) → 3 Step plan (start from the standard template: Ordering, Advances, Purchase, Payments, Transportation, Clearance, Receipts, Invoicing; each Step has owner, duration, expected cost, optional Stage tag, required documents; **each Stage from Goods purchased to Goods sold needs at least one tagged Step**, otherwise block with a precise message) → 4 Terms (Investor share 40–95%, Manager deposit 20–90% of target, minimum investment, buyer country, source country) → 5 Review. The **Funding target is derived** (the sum of cost of goods and all planned Step costs) and shown, never typed. Expected profit is derived, never typed. Live preview card updates as the user types. Rules: target $1,000 to $10,000,000; source and buyer countries real, different and not blocked; exposure limit checked on submit.
- **My listings.** Cards by state: Draft, In review, Revised terms (action needed), Approved (pay deposit), Live, Completed, Rejected, Withdrawn, Cancelled. Detail shows the same transparent numbers plus the review history (every rejection reason).
- **Actions.** Submit; edit and resubmit after rejection (clears the reason and assignment, history stays); accept or decline **Revised terms** (decline returns it to edit); pay the **Manager deposit** from the wallet (the listing goes Live in the same step; a bounce if the wallet is short, with top-up); withdraw the listing before Live; propose Step plan changes after Live (reviewer approves; finance approves any cost change); upload documents to a Step (simulated).
- **Wallet and Profile** as for the investor, with the registration status.

### 4.3 Staff

**Layout.** Under 1024px: bottom tabs (Queue · Listings · Money · Team/More). From 1024px: left sidebar (240px) and list/detail panes, tables for queues, ledger and audit log. Which tabs a user sees depends on their staff role (`can(user, action)` map); hidden actions are not just disabled: show a lock icon and a "Needs Finance" hint when relevant.

- **Queue** (default). Counts as badges: investor KYC, manager registrations, listings in review, deposit waiver decisions, withdrawals awaiting approval, overdue listings, late steps, settlements awaiting approval. Each row: assign to me / assign to someone, open, approve, reject (reason required).
- **Reviewer.** Reviews applications and listings. For a listing: checks the Step plan and required documents, checks expected cost and sale price against market (a small "market check" note field), checks prohibited goods, records the **Buyer** and whether the Buyer is a **Shareholder**, can **edit terms → Revised terms** sent to the Manager, approve or reject with a reason. Owner or finance set the **Deposit waiver** during review (only if the Buyer is a Shareholder; locked on approval; the treasury stands in with 20% of the target when it goes Live).
- **Ops.** Runs live listings. Per Shipment: mark Steps in progress, done (blocked until required documents are uploaded), verified (Steps needing verification: payment, customs, sale), blocked, or skipped (needs reason and reviewer approval; a skipped Step counts as done for its Stage tag and its planned cost is not paid). **Stages are never set by hand:** a Shipment reaches a Stage when every Step tagged with that Stage or an earlier one is done (and verified where needed). Stages (in this order): Funding open → Goods purchased → Loaded at port → At sea → Customs cleared → Goods sold → Profit paid out. A Stage never goes backwards. Ops pays Step costs from escrow with proof attached, total paid may not exceed capital raised. Ops can **fund the balance from the treasury** on an Overdue listing, request an **Overrun fill** (finance or owner approves, no cap, a normal Contribution), propose **Write-off** (reason, document, any salvage proceeds; a different staff member approves) or **Resale** (new Buyer; a Resale to a Shareholder needs owner approval and a market-price check), **Cancel** a listing before any goods are bought (all Contributions refunded in full), record **Sale proceeds** per Shipment (a shortfall needs a reason), and **propose Settlement** once every Shipment is sold or written off, proceeds are in escrow and a sale document is attached.
- **Finance.** Approves or declines withdrawals (the request already holds the money; **$10,000 and above needs the owner**), approves Settlement proposed by someone else (or sends it back to ops with a reason), approves unplanned Step costs, Overrun fills, and use of earlier Sale proceeds to pay a later Shipment's costs, and tops up the treasury.
- **Owner.** Everything, plus: Team (create staff, set role, deactivate), mark/unmark Shareholders, set the blocked countries list, per-manager exposure limit, platform settings (Service fee 1%, Shareholder share 75%, treasury stand-in 20%, overdue days 5, withdrawn-after 14 days, large withdrawal $10,000, prohibited goods list), move money out of the **Reserve fund**, suspend a user.
- **Money.** Treasury balance, Reserve fund, escrow list, platform revenue, ledger (filter by account) with a "Ledger balanced" check and a row-level drill-down to the balanced entries.
- **Audit log.** Searchable, filterable by actor and type; every approval, rejection, assignment, payout, waiver and change shows who, when, what, why.

### 4.4 Withdrawal (investor or manager)

Sheet with: amount, account holder, bank name, bank country (blocked countries refused), IBAN (verify the checksum and that the country prefix matches the bank country) **or** account number, and SWIFT/BIC (its country must match the bank country). On submit the amount is **held at once** (wallet → `withdrawals:hold`). Status chain: Requested → Approved → Paid, or Declined/Failed (the held money returns automatically and the user is told). Show the status as a mini stepper in the history row.

## 5. Business rules the demo must enforce

Put these in `rules.js` as small, pure, unit-testable functions. Show the user the rule that blocked them, in a plain sentence.

| Rule | Value |
|---|---|
| Currency | USD only; 2-decimal input; integer cents stored |
| Funding target | $1,000 to $10,000,000, derived from cost of goods + planned Step costs |
| Investor share | whole number 40–95% of net profit; the Manager keeps the rest |
| Manager deposit | 20–90% of target, paid from the Manager's wallet after approval; counts toward the target |
| Deposit waiver | Only when the Buyer is a Shareholder; set by owner or finance in review; all or nothing; treasury stands in with 20% of target at go-live |
| Service fee | 1% of the sale price, only on a profitable Listing, never more than gross profit |
| Net profit | Sale price − cost of goods − paid Step costs − Service fee |
| Manager share | (100 − Investor share)% of net profit, paid only when net profit > 0 |
| Pool split | The Investor-share pool is split pro-rata over **all** Contributions (investors, Manager deposit, treasury) with largest-remainder rounding so it sums exactly |
| Losses | Shared pro-rata over all Contributions; no Manager share, no Service fee |
| Overdue | Live ≥ 5 days at Stage 0 and not fully funded; staff may fill from treasury; nothing automatic |
| Withdrawn | Auto after 14 days of unanswered Revised terms or unpaid approved deposit |
| Large withdrawal | ≥ $10,000 needs the owner |
| Blocked countries | CU, IR, KP, SY (configurable): checked at submit, at approval, and on every top-up, investment, deposit and withdrawal; also source, buyer and bank countries |
| Four eyes | Write-off, Settlement and Resale-to-Shareholder are approved by a different staff member than the proposer |
| Cancel | Only before any goods are bought; full refunds |
| Shareholder Listing | Buyer or Manager is a Shareholder: the profit on treasury Contributions splits 75% to the Shareholder wallet(s) and 25% to the Reserve fund (equal split between two different Shareholders; one gets all); a treasury loss is borne by the treasury alone |
| Late | A Listing past its Cycle or a Step past its planned duration is flagged, never penalised |
| Cycle | Derived from the Step plan: latest Shipment planned start + its planned Step durations |
| Exposure limit | Sum of Funding targets of the Manager's Listings in review, approved or Live, checked on submit and approval |
| Idempotency | A top-up or settlement can't apply twice |

**Settlement worked example (use it as a test and as seed data):** Target $100,000, Investor share 60%, Manager deposit 25% ($25,000), investors $75,000. Cost of goods $90,000, Step costs $4,000, sale price $110,000. Fee = 1% × $110,000 = $1,100. Net profit = $110,000 − $90,000 − $4,000 − $1,100 = $14,900. Manager share = 40% × $14,900 = $5,960. Pool = $8,940 split pro-rata over $100,000 of Contributions: the Manager deposit earns 25% = $2,235, investors earn 75% = $6,705. The Manager receives $25,000 + $2,235 + $5,960. Verify the ledger balances after.

## 6. The money-moment flows to build end to end

Make these four "happy paths" playable in under three minutes each, with seed data that puts the demo at the start of each. A **Guided tour** menu in the dev panel jumps to each one.

1. **Invest.** Investor approved → opens a live shipment → Invest sheet → confirm → sprout → funding bar fills → Manager's notification arrives.
2. **List.** Manager creates a listing (wizard) → submits → Reviewer (switch role) approves with a tweak → Manager accepts revised terms → pays deposit → Live → investors fund it → fully funded.
3. **Run.** Ops works the Steps (documents, verify) → stages advance on their own → route vessel sails → sale proceeds recorded → settlement proposed → Finance approves → everyone paid → sprout for the Manager and the Investors.
4. **Cash out.** Investor withdraws $12,000 → held → Finance approves → Owner approval required → paid → history updates.

Also seed edge cases for the Staff to find: an Overdue listing, a Late step, a rejected listing with a reason history, a Shareholder Listing with a waived deposit, a loss-making completed listing (loss shared, no fee), a pending large withdrawal, and a blocked-country registration attempt.

## 7. Visual language (follow `docs/design-system.md`)

- **Brand:** green `#06503A` leads (actions, links, focus). Gold `#B39144` is decoration only, never text (use `--text-accent` for gold text). Sand page `#F7F4EC`, white cards, warm borders, flat (borders, no shadows, except sheets, dialogs and toasts).
- **Type:** IBM Plex Sans; tabular figures on every amount; the type scale from the tokens; one `h1` per screen. Overlines are labels, not headings.
- **Money colours:** realised gain = `--gain` with `+` and ▲ and the word "Profit"; realised loss = `--loss` with `−` and ▼ and the word "Loss"; **expected is neutral ink, labelled "expected", no arrows**. Colour is never the only signal.
- **Header:** the mark (24px) and "SHEHNAT" at the start; the wallet pill, bell and account at the end. No "Halal" claim anywhere except inside the logo artwork.
- **Doors:** each Listing has one of six door colours from a stable hash of its ID, with goods icons, never emoji.
- **Components:** use the design-system rules for Button (one primary per screen, danger = red outline, never red fill), Input (48px, visible labels, errors start with "!"), Chip, Banner, Funding bar, Route, Bottom sheet, Toast, Skeleton, Empty state.
- **Accessibility:** WCAG 2.1 AA; visible focus ring; 44px targets; sheets trap focus and close on Esc; `aria-live="polite"` for money changes; animated numbers carry the final value in `aria-label`.

## 8. Notifications (the cross-role proof)

Every event notifies the right people, with an icon, one short line, a time, and a deep link that opens the exact screen. Examples:

- Investor invests → Manager: "Amira invested $5,000 in Rice to Rotterdam." (investor named as "Investor #4" if the viewer is another investor)
- Listing approved → Manager; Revised terms → Manager; Deposit paid → reviewer/ops; Fully funded → Manager, investors, ops; Stage advanced → investors, Manager; Step Late → Manager, ops; Settlement proposed → finance/owner; Payout → each Contribution holder; Withdrawal decision → requester; KYC decision → applicant.
- Bell sheet groups by Today / Earlier, shows an unread dot, and "Mark all read".

## 9. Animations (elaborate; this is a signature of the product)

Implement the **full choreography catalogue** from `docs/design-system.md` using the duration and easing tokens from `tokens.css`. Animate only `transform` and `opacity` (plus SVG `stroke-dashoffset` and the gold `filter: brightness()` glint). No motion libraries: CSS transitions, the Web Animations API and `requestAnimationFrame`. Build a `motion.js` module with small, reusable, interruptible helpers: `countUp(el, cents, opts)`, `cascade(listEl)`, `fillBar(el, pct)`, `sprout(host, opts)`, `drawRoute(svg, stageIndex, opts)`, `openDoor(card)`, `sheet.open/close`, `toast(msg)`, `pulseWake(el)`.

1. **Screen transitions.** Shared horizontal axis: forward drills in (outgoing recedes 8% over 0.6× base, incoming slides from 24% and fades in); back reverses; right-to-left flips x. Tab switches are a 160ms crossfade with no slide (tabs are peers).
2. **Container doors (signature).** Tap a shipment card: label fades (0–160ms) → two 3D door leaves swing ±105° about their outer hinges (`perspective: 600px`, 100–520ms, second leaf 40ms behind) → the deep-green interior brightens with a pale-gold radial light (160–860ms) → the door strip grows from 72px to 100px as a **shared element** into the detail header while the content cascades in. Back: leaves swing shut with the soft spring ("thunk"), label returns.
3. **Bottom sheets.** Scrim fades in; the sheet rises with the bouncy spring (about 16% overshoot) and focus moves in; **drag to dismiss** follows the finger 1:1 and closes past 30% height or 0.5px/ms velocity, else springs back; close drops with the exit ease.
4. **Money count-up.** Wallet balance, settlement payout, "my return" and dashboard KPI tiles count from 0 (or the previous value) over the showpiece duration with the count ease (about 75% of the climb in the first 20%), formatted correctly on every frame, tabular figures so nothing jitters. Runs once per figure per session when 50% visible, and again on change. Decreases count down faster with no chip. Landing pops a chip ("▲ +$1,240.50 realised") with the soft spring. Screen readers hear only the final value.
5. **The sprout ceremony.** Only for three moments: investment confirmed, listing approved (Manager), payout received. Five beats over 2.2s: (1) the five people of the mark join one by one, 90ms apart, each scaling 20→100% with the spring; (2) the gold stem draws upward (`stroke-dashoffset`, `pathLength="1"`); (3) left, right then centre leaves unfurl with the grow ease (120ms apart, each 700ms); (4) a brightness glint wave passes over the leaves and a pale-gold halo breathes out; (5) six gold motes drift up and fade while the confirmation text rises 8px. One 10ms `navigator.vibrate` tick at beat 3 where supported. Tapping skips to the end frame. Confirmation details are readable from the first frame.
6. **Route progress.** An SVG curved path from origin to destination; the travelled part draws solid green (`stroke-dashoffset`) to the current stage; passed stops pop in with the spring as the line reaches them, upcoming stops pop after, 45ms apart; the **gold vessel** travels along the path with the leading edge (`getPointAtLength`), and on arrival its wake pulses three times (two rings, 400ms apart). A live stage advance draws only the new segment and sails the vessel from old to new stop. Mirrors in right-to-left.
7. **List cascade and funding fill.** Cards visible on first paint rise 8px and fade in, 45ms apart, capped at 360ms total; funding bars fill with `scaleX` (origin at the reading start) 120ms after their card, with a pale-gold glint at the tip when nearly landed.
8. **Tab bar.** The active pill springs to the new tab, the icon bumps (1 → 1.14 → 1), its gold layer pops from 30%; badges scale in with the soft spring.
9. **Feedback.** Press scale 0.97 (cards 0.99); toasts spring up, stay 2.4s, drop out, and replace rather than stack; skeletons shimmer warm sand every 1.4s then crossfade to real content with no layout jump; field errors turn the border red and fade the message in (no shaking); **pull-to-refresh** grows a small sprout tied to pull distance and spins its leaves once while "loading".
10. **Extra delight in the demo flows** (all must obey the three laws: every animation has a job, money moments are ceremonies, nothing waits for motion):
    - *Wallet to escrow:* when investing, a small coin-chip flies from the wallet pill to the funding bar along a curve, and the wallet figure counts down while the bar fills.
    - *Role switch:* the avatar morphs into the new role's badge and the screen does a shared-axis fade; a one-line "Now viewing as Reviewer" toast.
    - *Stage advance:* the vessel sails, the stage dot pops, and a thin gold shimmer sweeps the Stage label.
    - *Settlement reveal:* a staged waterfall: sale price → minus cost of goods → minus step costs → minus fee → net profit, each row rising in turn and its bar growing (`scaleX`) before the final profit figure counts up and its chip pops.
    - *Approval stamp:* an approve action in the staff console draws a green tick (`stroke-dashoffset`) in a circle that scales in with the spring, then the row slides out of the queue and the counts tick down.
    - *Ledger check:* the "Ledger balanced" badge draws its tick and gently pulses once.
    - *Late flag:* a warning chip pulses amber twice (not red, not shaking) when it first appears.
    - *Empty states:* the duotone icon floats up and down 4px over 3s (paused off-screen).
    - *Skeleton to content:* staggered per block, not all at once.
11. **Choreography rules.** At most **one showpiece** (count-up, route, sprout) runs at a time per screen, queued count-up first then route. Tapping during any transition jumps it to its end state and handles the tap. Pause looping animations when off-screen or when the tab is hidden. Target 60fps on a mid-range phone.
12. **Reduced motion is mandatory.** Respect `prefers-reduced-motion: reduce` via the tokens (durations collapse, distances go to 0), and make the JS helpers check `matchMedia` and jump to the final state (count-up shows the final value, sprout shows the final mark, route draws at once). Only short opacity crossfades remain. The dev panel has a "Force motion on" switch for demoing on machines with reduce-motion set, which the app itself never turns on unless the switch is used.

## 10. SVG and icons

- **Everything visual is inline SVG.** No emoji, no icon fonts, no raster images except the full logo on the sign-in and splash.
- Icons follow the design-system grid: 24 × 24, filled duotone with `.i1` (primary, green) and `.i2` (secondary, gold) layers; muted variants for inactive tabs; white and white-55% on doors and green panels. An icon must still make sense with the gold layer removed. Decorative icons get `aria-hidden="true"`; icon-only buttons get `aria-label`.
- Build `icons.js` as an object of path strings plus an `icon(name, {size, cls})` helper. Reuse the existing icons (home, shipments, wallet, invest, profile, alerts, documents, review, done, warning, route, crate, grain, textiles) and **draw the rest in the same style**: bell, shield-check, lock, clock, calendar, search, filter, sort, plus, minus, chevron (mirrors in RTL), arrow (mirrors in RTL), check, close, upload, download, bank, swap, coin, building, user, users, ship, container, anchor, port, truck, customs-stamp, invoice, handshake, scales (compare), flag, globe, pin, edit, trash, info, ledger, vault (treasury), leaf (reserve), eye, key, refresh, camera, building-store, and goods icons for Food, Building, Textiles, Energy, Other.
- **Custom SVG illustrations** (also duotone, brand colours, small and light): the container door (leaves, interior, label) in six door colours; the route map with the vessel; the sprout (five people, stem, three leaves, halo, motes) built from `brand/mark.svg`; empty-state spot illustrations (no shipments, empty wallet, empty queue, no notifications); a world dot-map or simple curved route backdrop; status stepper glyphs; the funding bar glint; a vessel silhouette.
- Keep paths short and tidy; reuse `<symbol>`/`<use>` for repeated shapes (doors, icons) to keep the DOM light.

## 11. Copy: concise

- Short, plain, active sentences. One idea per line. No jargon where a common word works.
- Buttons: verb + object, max 3 words ("Invest", "Pay deposit", "Submit listing").
- Titles max 4 words; helper text max 1 line; banners: a bold lead sentence (max 8 words), then one short detail line.
- Errors say what to do: "Add $120 to invest." not "Insufficient funds error".
- Labels never rely on placeholders. Numbers are always paired with a unit or label.
- Use the Glossary's words exactly: **Listing, Shipment, Manager, Investor, Contribution, Manager deposit, Investor share, Manager share, Service fee, Settlement, Treasury, Reserve fund, Wallet, Step, Stage, Late, Overdue.** Never "Company" (legacy), "revenue" for sale price, or "top-up" for an Overrun fill.
- Expected figures always say "expected". Returns are "estimates, not guarantees". Do not claim "halal" or "Shariah-compliant" outside the logo.
- English only; keep strings in one `strings` object so Arabic can be added later.

## 12. Dev panel (demo control, hidden behind a small floating button)

A bottom-corner gear opens a sheet with:

- **Role switcher** (Investor ▸ pick a seeded investor, Manager ▸ pick, Staff ▸ pick a role). Keyboard shortcut `Alt+1/2/3`.
- **Time travel:** "+1 day", "+5 days", "+14 days" (drives Overdue, Late, Withdrawn).
- **Guided tour** to each flow in section 6 and the seeded edge cases.
- **Motion:** force motion on, slow motion (×3) for presentations, replay last animation.
- **Direction:** LTR / RTL toggle (proves logical CSS).
- **Network feel:** off / fast / slow (adds 0 / 300 / 1200ms skeleton time before data appears).
- **State:** Reset, Export, Import, and a "Ledger check" button.

## 13. Quality bar and verification

Do not stop at "it renders". Verify in a real browser using the Chrome tools, and fix what you find.

1. Unit-test `rules.js` and the ledger with a tiny in-page test runner (a hidden `?test` URL flag that prints pass/fail): the settlement worked example, rounding that always sums to the total, the loss case, the Shareholder split, IBAN checksum, blocked countries, age check, derived target and cycle, stage-from-steps, withdrawal hold/return, no negative balances.
2. Walk all four flows in section 6 across the roles, in two tabs, and confirm the cross-role memory (a change in one role appears in the others after a role switch, and live across tabs).
3. Check the console is empty of errors, `localStorage` blocked still works (in-memory banner), and reset/import/export round-trip.
4. Check 320 / 360 / 768 / 1024 / 1440 widths with no horizontal scroll, RTL mode, reduced-motion on and off, keyboard-only navigation of the invest sheet, and contrast of every token pair used.
5. Record one GIF of each of the four flows (`gif_creator`, meaningful file names, extra frames before and after) and save them to `MockUI/demo/recordings/`.
6. Finish with a short report: what was built, file list, which deliberate simplifications exist (for example payment gateway and KYC are simulated), any doc/rule conflicts found, and anything you could not verify. State plainly what is verified and what is not.

## 14. How to work

- Plan briefly, then build in thin, verifiable slices: store + rules + seed → shell, tokens, icons, motion helpers → investor flow → manager flow → staff flows → notifications → dev panel → polish and tests. Run the app after each slice.
- Match the surrounding code style: plain, short functions, few comments, descriptive names, no clever abstractions.
- Don't add features beyond this prompt. Don't invent business rules; where the glossary is silent, pick the simplest rule, put it in `rules.js` with a one-line comment `// ASSUMPTION:`, and list it in the final report.
- Write temporary scripts to `.claude/scratch/` and delete them when done.
