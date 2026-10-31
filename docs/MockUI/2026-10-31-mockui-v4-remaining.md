# MockUI v4 remaining screens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the investor screens that already exist, then build the manager (company) screens, the remaining staff screens, and the shareholder path those screens share.

**Architecture:** Keep the throwaway prototype in `MockUI/v4/`. Domain rules stay in `logic.js`. Mutations stay in `store.js` and return `{ ok, error }` or `{ ok, errors }`. Screens stay in the four `screens-*.js` files and only call `ShehnatStore` and `ShehnatLogic`. A shareholder is a boolean on an investor or a manager, not a new role and not a new mode bar.

**Tech Stack:** Classic scripts, no build, no npm packages. Paper-column tokens already linked from `index.html`. Money is integer cents. `node MockUI/v4/logic.js` runs `selfCheck` at load.

**Spec:** `MockUI/v4-plan/PLAN.md` §4–§6 and §8, `MockUI/v4-plan/TASKS.md` milestones C–G, `MockUI/v4-plan/DESIGN-SYSTEM.md` §4–§6. Business rules: `business-req/BUSINESS_REQUIREMENTS.md` §5.4, §6, §11.

## Global Constraints

- Prototype only. Do not edit `Demo/`.
- No prototype bar, inspector, clock control, phone frame, or scenario dropdown. Personas are the seeded accounts. Password is `shehnat-demo-1`.
- One `localStorage` key, `shehnat-proto-v4`.
- Screen IDs stay P1–P8, I1–I14, M1–M13, S1–S17. Do not add a shareholder screen outside S13.
- Mode bars stay four items. Task screens (I6, I7, I12, I13, M5 submit, M10, M13 withdraw) hide the mode bar and show one action bar.
- Paper, ink, and logo green only. No glass, gold UI, count-up, sprout, door, or route draw. Motion is the existing fade.
- Investors see every listing figure (ADR 0004), including company capital, deposit, expected profit, manager share, and company result.
- PLAN §8: this prototype has no test suite. Domain checks go into `logic.selfCheck`. Each screen task ends with the click path in its Done when.
- Copy for field errors starts with `Error: `.
- `logic.js` must exit non-zero when `selfCheck` fails. Add `if (typeof process !== "undefined" && !report.ok) process.exitCode = 1;` next to the existing console error, once, in Task 1.

## Review Focus

- A shareholder buyer who is also an investor must not be paid twice for the same cent: capital payout is the contribution row; the 75% treasury split is a separate holder line. Task 13 asserts this in `selfCheck`.
- The proposer of a settlement, write-off, resale, overrun, unplanned cost, skip, plan change, or use of proceeds cannot approve it. Task 12 shows the sentence `Needs another staff member to approve.`
- A manager listing that is live, in review, or awaiting revised terms cannot be saved by `saveListing`. Task 4 keeps that refusal.
- Staff cannot invest, top up, or withdraw. Task 1 shows that sentence on I12 and I13 before submit.
- Suspending a manager holds that manager's settlement payout and lets ops complete their steps. Task 14.

## File map

| File | Responsibility |
|---|---|
| `MockUI/v4/logic.js` | Pure rules already present. Add only the checks named in Tasks 6, 9, 13. |
| `MockUI/v4/store.js` | Every new mutation named below. Screens do not write `state` except the existing document-view audit. |
| `MockUI/v4/screens-investor.js` | I4, I5, I10, I12, I13, I14 gaps. |
| `MockUI/v4/screens-public.js` | Demo-account label and You line when `user.shareholder` is true. |
| `MockUI/v4/screens-manager.js` | Replace the desk stub with M1–M12. Keep `#/list/new` and `#/list/edit/:id` as the M5 shell. |
| `MockUI/v4/screens-staff.js` | S1–S7 and S11–S17. Replace the empty listings and money placeholders. |
| `MockUI/v4/screens-staff-ops.js` | `[NEW]` S8, S9, S10. Add `<script src="screens-staff-ops.js">` before `start.js` in `index.html`. |
| `MockUI/v4/ui.js` | Manager Listings item goes to `#/listings` once M4 exists. No fifth nav item. |

## Order

1 investor gaps, 2 manager registration, 3 manager home and listings, 4 listing wizard, 5 listing review, 6 manager listing actions, 7 manager steps, 8 staff home and overdue, 9 staff money and team, 10 operations board, 11 operations money, 12 approvals and settlement, 13 shareholders, 14 users, settings, audit, ledger.

Do not start a task until the previous task's Done when has been walked. Update the matching row in `MockUI/v4-plan/TASKS.md` from ☐ to ☑ when that happens. Leave H and I unchecked.

---

### Task 1: Investor gaps

**Files:**
- Modify: `MockUI/v4/screens-investor.js`
- Modify: `MockUI/v4/logic.js` (exit code only)

**Interfaces:**
- Consumes: `L.remaining`, `L.fundingTarget`, `L.settlement`, `L.can`, `Store.user`, `Store.topup`, `Store.withdraw`
- Produces: no new functions. I10 reads `settled.treasuryProfit`, `settled.shareholder`, `settled.reserve`, `settled.holders`.

- [ ] **Step 1:** In `logic.js`, set `process.exitCode = 1` when `selfCheck` fails under Node. Run `node MockUI/v4/logic.js`. Expected: exit 0 and no `Shehnat self-check` line.

- [ ] **Step 2:** I4 `#/shipments`. On a live row, when `remaining > 0` and `remaining / fundingTarget <= 0.1`, append the words `Almost funded` in the row meta. Do not show Overdue.

- [ ] **Step 3:** I5 `#/listing/:id` Shipments tab. For each shipment, list each step's name and state (`todo`, `in_progress`, `done`, `verified`, `blocked`, `skipped`). Keep the stage name.

- [ ] **Step 4:** I10 `#/statement/:id`. Call `L.settlement` with `shareholderListing`, `shareholderSharePct`, `buyerShareholderId`, and `holders` equal to the ids of users with `shareholder === true`. When `shareholderListing` is true, add three lines: Treasury profit, Shareholder share, Reserve fund. List each holder as `Shareholder` plus the amount, not the person's name, except the signed-in user's own line, which stays `My payout` for their capital profit. Do not add the shareholder split into `My payout`.

- [ ] **Step 5:** I12 `#/top-up` and I13 `#/withdraw`. If `L.can(user, "topup")` or `L.can(user, "withdraw")` returns a sentence, or `application.status !== "approved"`, render that sentence and do not render the amount field or the action button. Use the existing store sentences: `Finish verification before you add money.` and `Finish verification before you withdraw.` Staff still get `Staff cannot invest or withdraw.`

- [ ] **Step 6:** I14 `#/withdrawal/:id`. Banner copy by status: `pending` and amount ≥ 1000000 cents → `This withdrawal is held.` and `Needs the owner`. Other `pending` → `This withdrawal is held.` and `Pending`. `paid` → `This withdrawal was paid.` `declined` → `This withdrawal was declined.` plus `w.reason`. `failed` stays `The payout failed and the money is back in your wallet.`

- [ ] **Done when:** As Aisha, `#/shipments` can show `Almost funded` only on a listing with 10% or less left. `#/listing/cardamom` Shipments tab lists step names. `#/statement` for her completed profit and her completed loss still shows a signed Profit or Loss. As Ben, `#/top-up` shows the verification sentence and no Pay button. A seeded pending withdrawal and a seeded failed withdrawal show the banners above.

### Task 2: Manager registration (M1, M2)

**Files:**
- Modify: `MockUI/v4/store.js`
- Modify: `MockUI/v4/screens-manager.js`

**Interfaces:**
- Consumes: `L.blocked`, `L.ageOk`, `L.phoneOk`, `Store.submitApplication` (leave it investor-only)
- Produces: `Store.submitManagerApplication(payload) -> { ok: true } | { ok: false, errors }`

`payload` fields: `kind` (`business` or `individual`), `legalName`, `regCountry`, `regNumber`, `signatory`, `dob`, `phone`, `residence`, `idType`, `idNumber`, `files` (array of `{ name, type, size }`), `declare` (boolean).

Business requires `legalName`, `regCountry`, `regNumber`, `signatory`, and at least 3 files (registration, signatory identity, proof of address). Individual requires `legalName`, `dob`, `phone`, `residence`, `idNumber`, and at least 2 files. Both require `declare`. Blocked `regCountry` or `residence` returns `errors.residence = "Error: we cannot accept a residence in that country."` Age and phone use the existing helpers for an individual. On success set `application.status` to `pending`, push history `Submitted`, and notify the user.

- [ ] **Step 1:** Add `submitManagerApplication` and export it on `ShehnatStore`. Do not send a manager through `submitApplication`.

- [ ] **Step 2:** M1 `#/register`. Task screen, back, one action bar `Continue` / `Submit registration`. Steps: type → details → signatory or identity → documents → declaration. Documents copy differs by type. File picker stores name, type, and size only.

- [ ] **Step 3:** M2 `#/registration`. Pending, rejected with reason and `Fix and resubmit`, approved success banner, and the history list. From `#/desk`, the existing Almost there banner links here when status is not `approved`. A rejected manager can open M1 again.

- [ ] **Done when:** Mateo is pending and sees Almost there with no Create button that submits. A new manager account completes the business path and the individual path to `pending`. Priya can approve or reject that application on the existing `#/review/:id` screen. After approval the gate banner is gone.

### Task 3: Manager home and my listings (M3, M4)

**Files:**
- Modify: `MockUI/v4/screens-manager.js`
- Modify: `MockUI/v4/ui.js` nav: Listings href `#/listings`

**Interfaces:**
- Consumes: `L.exposureUsed`, `L.fundingTarget`, `user.exposureLimit`, `state.settings.exposureDefault`
- Produces: routes `#/desk` (M3) and `#/listings` (M4)

- [ ] **Step 1:** M3 `#/desk`. One panel: `Exposure` and the used amount of the limit, as a figure, not a ring. Then an Actions due list. Each row links to the screen that handles it: revised terms → `#/terms/:id` (Task 6), deposit due → `#/deposit/:id`, my open step → `#/step/:listingId/:stepId` (Task 7), late step → the same step screen. Empty copy: `Nothing needs you right now.`

- [ ] **Step 2:** M4 `#/listings`. Tabs: drafts, in review, action needed, live, completed, ended. Action needed is `awaiting_terms`, `approved` (deposit due), and `rejected`. Ended is `withdrawn` and `cancelled`. Draft and rejected rows link to `#/list/edit/:id`. Other rows link to `#/listing-desk/:id` (Task 6). Empty tab: `Nothing is in this list yet.`

- [ ] **Done when:** Kerala sees an exposure figure and at least one action that navigates. The four mode-bar items are unchanged. Listings no longer dumps every status on the home screen.

### Task 4: New listing wizard (M5, M6, M7)

**Files:**
- Modify: `MockUI/v4/screens-manager.js`
- Modify: `MockUI/v4/store.js` `buildListing` so each shipment keeps the steps the form sends, instead of always calling `L.defaultSteps`

**Interfaces:**
- Consumes: `L.defaultSteps`, `L.listingError`, `L.projection`, `L.CATEGORIES`, `Store.saveListing`, `Store.submitListing`
- Produces: the same `#/list/new` and `#/list/edit/:id` routes, now a four-step wizard. In-memory `form` survives add, remove, and a failed save.

Steps: 1 basics (name, category, source, buyer, certificate, prohibited-goods sentence) → 2 shipments (add, remove, goods, sale, planned start) → 3 step plan → 4 terms and preview. Preview shows funding target, cycle days, expected profit with the word `expected`, ROI this cycle, ROI per year, manager expected share, and exposure left. Submit is the only task-screen step: mode bar hidden, action bar `Submit for review`. Save draft stays a secondary button on every step and is not the action bar.

Step plan starts from `L.defaultSteps("new")` copied onto every shipment. The editor can add, remove, and reorder steps. Fields: name, owner (`manager` or `staff`), days, cost in dollars, stage tag (one of the existing tags or none), counterparty. Stage coverage uses `L.listingError`. A missing tag shows that function's sentence. Reorder does not change step ids already saved.

- [ ] **Step 1:** Persist `steps` from the form through `buildListing`. A shipment with no steps still gets `L.defaultSteps`.

- [ ] **Step 2:** Replace the single long form with the four steps. Keep add and remove shipment. Live, in-review, and awaiting-terms listings still render `This listing cannot be edited.`

- [ ] **Step 3:** Preview numbers come from `L.projection` and `L.cycleDays`. Submit calls `Store.submitListing`. A `listingError` stays on the preview step.

- [ ] **Done when:** Kerala saves a draft with two shipments and a reordered step, reloads, and sees the same steps. Submitting a plan with no Goods sold tag shows the stage-coverage error and does not leave `draft`. Exposure over the limit shows the exposure sentence.

### Task 5: Listing review (S4, S5)

**Files:**
- Modify: `MockUI/v4/store.js`
- Modify: `MockUI/v4/screens-staff.js` (replace `#/queue-listing/:id`)

**Interfaces:**
- Consumes: `L.can`, `L.canDecide`, `L.listingError`, `L.projection`
- Produces:
  - `Store.reviewListing(id, action, body) -> { ok: true } | { ok: false, error }`
  - `action` is `approve`, `reject`, or `revise`
  - `body` is `{ reason, marketNote, buyerShareholderId, waiver, terms }`
  - `terms` is `{ investorShare, companyPct, minimum, shipments }` and is stored as `listing.revised`

`approve` requires assignee or owner (`L.canDecide` on `listing.assigneeId`). A shareholder listing (`buyerShareholderId` set, or already `shareholderListing`) requires a non-empty `marketNote`. `waiver` requires `L.can(actor, "waiver")` to be `""`. Waiver sets `listing.waiver = true` and posts a treasury contribution of `waiverStandInPct` percent of the funding target from `platform:treasury` to `escrow:<id>`, memo `Deposit stand-in`. `reject` requires a reason and sets status `rejected`. `revise` stores `revised`, sets status `awaiting_terms`, and notes the manager. `buyerShareholderId` requires `L.can(actor, "buyer-shareholder")` to be `""` and the chosen user to have `shareholder === true`.

- [ ] **Step 1:** Implement `reviewListing`. Export it.

- [ ] **Step 2:** S4 `#/queue-listing/:id`. Show terms, projection figures, step names, required-document flag, stage coverage, assignee control (keep the current assign call), market-check field, buyer shareholder select (approved users with `shareholder`), waive-deposit control, approve, reject with reason sheet, and `Send revised terms` linking to S5.

- [ ] **Step 3:** S5 `#/revise/:id`. Edit investor share, manager capital percent, minimum, and step costs. Show the diff the manager will see (old value, new value). Send calls `reviewListing(id, "revise", { terms })`.

- [ ] **Done when:** Priya sends Cashew to Muscat back with investor share 55. Kerala is notified. Fatima, not Priya, can waive. A shareholder listing without a market note cannot be approved. The queue row no longer says the decision is on another screen.

### Task 6: Manager listing detail, revised terms, deposit (M8, M9, M10)

**Files:**
- Modify: `MockUI/v4/store.js`
- Modify: `MockUI/v4/screens-manager.js`

**Interfaces:**
- Consumes: `L.can(user, "deposit")`, `L.fourEyes` is not used here
- Produces:
  - `Store.respondTerms(id, accept) -> { ok, error }`
  - `Store.payDeposit(id) -> { ok, error, topup }`
  - `Store.withdrawListing(id) -> { ok, error }`

`respondTerms(true)` copies `listing.revised` onto the live terms, sets status `approved`, clears `revised`. `respondTerms(false)` sets status `rejected` with reason `Manager declined the revised terms.` so it can be edited again. `payDeposit` requires status `approved`, moves `companyPct` percent of the funding target from the manager wallet to `escrow:<id>`, sets status `live` and `liveAt`. Short wallet returns `{ ok: false, topup: true }`. `withdrawListing` is allowed only before `live`, sets status `withdrawn`.

- [ ] **Step 1:** Add the three store functions.

- [ ] **Step 2:** M8 `#/listing-desk/:id`. Status banner and one next action: edit draft, delete draft (`Store` removes a `draft` only), withdraw before live, respond to revised terms, pay deposit with days left (`autoWithdrawDays`), or read-only progress when live. Show shipments, steps, and expected versus actual figures.

- [ ] **Step 3:** M9 `#/terms/:id`. Side-by-side diff. Accept and decline call `respondTerms`.

- [ ] **Step 4:** M10 `#/deposit/:id`. Task screen. Show the deposit amount and the wallet balance. Shortfall links to `#/top-up`. Action bar `Pay deposit`. Success line on M8: `This listing is live.` No extra ceremony screen.

- [ ] **Done when:** Journey 3 clicks through from Kerala's draft to Priya's revised terms to Kerala's accept and deposit. The listing status becomes `live`. Withdraw on an approved listing before payment sets `withdrawn` and does not move money.

### Task 7: My step and plan change (M11, M12)

**Files:**
- Modify: `MockUI/v4/store.js`
- Modify: `MockUI/v4/screens-manager.js`

**Interfaces:**
- Produces:
  - `Store.completeStep(listingId, shipmentId, stepId, doc) -> { ok, error }`
  - `Store.proposePlan(listingId, steps) -> { ok, error }`

`completeStep` only if the step's owner is `manager`, the signed-in user manages the listing, and the step is `todo` or `in_progress`. Optional `doc` is `{ name, type, size }`. Set state `done`. If `verify` is true, leave it `done` until staff verifies. `proposePlan` stores `listing.planProposal = { proposerId, steps, status: "proposed" }` and does not change the live steps.

- [ ] **Step 1:** Add both functions. M11 `#/step/:listingId/:stepId`. Show counterparty, documents, `Mark in progress`, `Mark done`.

- [ ] **Step 2:** M12 `#/plan/:id`, only when status is `live`. Same editor as M6. Send stores the proposal. The live steps stay put until Task 12 approves it.

- [ ] **Done when:** Kerala marks her Ordering step done on a live listing and the stage number advances only when that step was the last one the stage needed. A plan proposal does not change the investor track screen.

M13 is already `#/wallet`, `#/top-up`, `#/withdraw`, `#/withdrawal/:id`. Do not duplicate those screens.

### Task 8: Staff home, overdue, all listings (S1, S6, S7)

**Files:**
- Modify: `MockUI/v4/screens-staff.js`
- Modify: `MockUI/v4/ui.js` only if the side rail is still missing at `min-width: 1024px`. The four items stay Queue, Listings, Money, You.

**Interfaces:**
- Consumes: `L.overdue(listing, state.now, state.settings.overdueDays)`, `L.can(user, "overdue-fill")`
- Produces: `Store.fillOverdue(id) -> { ok, error }`

`fillOverdue` posts the remaining funding target from `platform:treasury` to `escrow:<id>` as a treasury contribution and clears the overdue condition by filling the remainder. Ops only.

- [ ] **Step 1:** S1 `#/queue` becomes the home: one lead row (the next item this role can act on) and the next row. Panels, not a widget grid: live count, raised, treasury balance, reserve balance, overdue count, late count. Owner also sees `Ledger` OK or not from `L.verify`. Reviewer does not see treasury actions. The existing three queue tabs move to a link `Open the queue` and a route `#/queue-list` that keeps today's S2 behaviour.

- [ ] **Step 2:** S6 `#/overdue`. Rows where `L.overdue` is true. Action `Fill from treasury` calls `fillOverdue`. Secondary `Leave open` only navigates back.

- [ ] **Step 3:** S7 replace the empty `#/staff-listings`. Filters: status, stage, late, shareholder. Search by name. Rows link to `#/ops/:id` (Task 10) for ops and owner, and to `#/queue-listing/:id` for a reviewer when status is `in_review` or `awaiting_terms`.

- [ ] **Done when:** Journey 5. Advancing the clock is done by setting `state.now` in a temporary dev-only line that is removed before the task is marked done; the seeded overdue listing must already appear without that. Sam fills it. The treasury balance drops by the remainder. Priya's home does not show a Fill button.

### Task 9: Staff money and team (S11, S12)

**Files:**
- Modify: `MockUI/v4/store.js`
- Modify: `MockUI/v4/screens-staff.js` `#/staff-money`

**Interfaces:**
- Produces:
  - `Store.decideWithdrawal(id, approve, text) -> { ok, error }`
  - `Store.failWithdrawal(id) -> { ok, error }`
  - `Store.treasuryTopup(cents, reference) -> { ok, error }`
  - `Store.moveReserve(cents, out) -> { ok, error }`
  - `Store.addStaff({ name, email, role }) -> { ok, error }`
  - `Store.setStaffRole(id, role) -> { ok, error }`
  - `Store.deactivateStaff(id) -> { ok, error }`

`decideWithdrawal`: amount ≥ `settings.largeWithdrawal` (1000000 cents) requires owner (`L.can` action `withdraw-large`). Smaller amounts require finance or owner. Approve posts hold to `bank:external`, status `paid`, stores `reference`. Decline posts hold back to the wallet, status `declined`, stores `reason`. `failWithdrawal` is owner-only, status `failed`, money returns to the wallet. `moveReserve` is owner-only, between `platform:reserve` and `platform:treasury`. `deactivateStaff` refuses when `id` is the actor: `Error: you cannot deactivate your own account.`

- [ ] **Step 1:** Implement the store functions. Every one writes an audit row.

- [ ] **Step 2:** S11 `#/staff-money`. Four panels: withdrawals, treasury, platform revenue, reserve. Withdrawal rows approve or decline. Finance sees the owner sentence on a USD 10,000 row and no approve button. Treasury top-up asks for a reference. Reserve out is an owner button.

- [ ] **Step 3:** S12 `#/team`, owner only. Others see `You cannot do that.` List staff, add, change role, deactivate.

- [ ] **Done when:** Journey 11 staff side and the self-deactivate refusal in journey 13. Aisha's USD 2,000 withdrawal can be paid by Fatima. Her USD 12,000 withdrawal cannot. Hadi can. `failWithdrawal` on a paid row returns the cents and I14 shows the failed banner.

### Task 10: Operations board (S8, first slice)

**Files:**
- Create: `MockUI/v4/screens-staff-ops.js`
- Modify: `MockUI/v4/index.html` script order
- Modify: `MockUI/v4/store.js`

**Interfaces:**
- Produces: `Store.setStep(listingId, shipmentId, stepId, next, extra) -> { ok, error }`
- `next` is `in_progress`, `done`, `verified`, `blocked`, `skipped`
- `extra` is `{ reason, doc }`

Ops or owner only (`L.can` action `steps`), except `verified` and `skipped` which need a second person and are stored as proposals until Task 12. A step with `verify: true` does not count as verified for `L.shipmentStage` until state is `verified`. Column change uses the existing `Motion.fade` on the board. No door colour.

- [ ] **Step 1:** `setStep`. Block and skip require `reason`. Skip and verify go to `listing.approvals` as `{ type, proposerId, status: "proposed" }` and do not change the step yet.

- [ ] **Step 2:** S8 `#/ops/:id`. One board per shipment. Columns: To do, In progress, Done, Verified, Blocked, Skipped. Document placeholder on view, same logged sentence as S3.

- [ ] **Done when:** Journey 6 up to stage movement. Wei verifying a payment step is only a proposal until Task 12. A late step still shows the revised date on the investor track screen.

### Task 11: Operations money (S8, second slice)

**Files:**
- Modify: `MockUI/v4/store.js`
- Modify: `MockUI/v4/screens-staff-ops.js`

**Interfaces:**
- Produces: `Store.opsMoney(listingId, kind, body) -> { ok, error }`
- `kind` is `step-cost`, `unplanned`, `proceeds`, `use-proceeds`, `overrun`, `cancel`

`step-cost` moves escrow to `bank:external` and attaches `doc`. `unplanned`, `use-proceeds`, and `overrun` create an approval instead of moving money. `proceeds` moves `bank:external` to escrow and stores `shortfall` reason when the amount is under the expected sale. `cancel` is allowed only before any shipment stage has passed Goods purchased, refunds contributions to wallets, sets status `cancelled`.

- [ ] **Step 1:** Implement `opsMoney` through the ledger. Refusals return `Insufficient funds.` or `Error: goods have already been bought.`

- [ ] **Step 2:** Add the six actions to `#/ops/:id`, each in a sheet with amount and reason where the kind needs them.

- [ ] **Done when:** Journeys 8 and 12's cancel. An overrun request does not change balances before approval. A cancel after Goods purchased is refused.

### Task 12: Approvals and settlement (S9, S10)

**Files:**
- Modify: `MockUI/v4/store.js`
- Modify: `MockUI/v4/screens-staff-ops.js`
- Modify: `MockUI/v4/logic.js` `selfCheck` only if a new pure helper is added

**Interfaces:**
- Produces:
  - `Store.decideApproval(approvalId, approve, reason) -> { ok, error }`
  - `Store.proposeSettlement(listingId) -> { ok, error }`
  - `Store.approveSettlement(listingId, reason) -> { ok, error }`

`decideApproval` uses `L.fourEyes`. The proposer sees `Needs another staff member to approve.` Approving applies the stored effect (verify step, skip step, unplanned cost, use proceeds, overrun contribution from treasury, write-off, resale, plan change). `proposeSettlement` requires every shipment sold (stage at Goods sold) and `L.can(actor, "propose-settlement")`. `approveSettlement` requires finance or owner, not the proposer, then posts each payout row to wallets, fee to `platform:revenue`, and sets status `completed`. No celebration screen. The investor statement is the existing I10.

Write-off and resale are proposals created from S8: `Store.proposeResolution(listingId, shipmentId, kind, body)` where `kind` is `writeoff` or `resale`. Resale to a user with `shareholder === true` can be approved only by the owner.

- [ ] **Step 1:** Approvals inbox S9 `#/approvals`. One list. The proposer's row shows the four-eyes sentence and no approve button.

- [ ] **Step 2:** S10 `#/settlement/:id`. Render `L.settlement` rows. Approve and send back. Send back sets `settlement.status` to `returned` and stores the reason.

- [ ] **Step 3:** Wire write-off and resale sheets on S8.

- [ ] **Done when:** Journey 9. Hadi proposes, Hadi cannot approve, Fatima approves, Aisha's wallet increases by her payout, and `#/statement/:id` matches the S10 figures. Journey 7: Wei, not Sam, approves the resale.

### Task 13: Shareholders

**Files:**
- Modify: `MockUI/v4/store.js`
- Modify: `MockUI/v4/screens-staff.js`
- Modify: `MockUI/v4/screens-public.js`
- Modify: `MockUI/v4/screens-investor.js` I10, if Task 1 did not already pass holders from `state.users`
- Modify: `MockUI/v4/logic.js` `selfCheck`

**Interfaces:**
- Consumes: `reviewListing` waiver and `buyerShareholderId` from Task 5; `approveSettlement` from Task 12
- Produces: `Store.setShareholder(userId, on) -> { ok, error }`

Owner only. Target must be an approved investor or manager. Sets `user.shareholder`. Audit `Marked shareholder` or `Unmarked shareholder`.

Settlement pays holders like this. `approveSettlement` calls `L.settlement` with `shareholderSharePct` from settings, `buyerShareholderId`, and `holders` equal to the ids of users with `shareholder === true`. `L.settlement` already returns `holders` and `reserve`. Post each holder amount from `platform:treasury` to that user's wallet, memo `Shareholder share`. Post `reserve` cents from `platform:treasury` to `platform:reserve`, memo `Reserve fund`. Do this inside `approveSettlement`, not in the investor screen. Do not export `splitEqual`.

- [ ] **Step 1:** Extend `selfCheck` with one case: two holders, buyer Layla, odd cent, and the investor capital row unchanged after the split. The capital profit and the shareholder amount are different numbers. Run `node MockUI/v4/logic.js`. Expected: exit 0.

- [ ] **Step 2:** `setShareholder`. S13 `#/shareholders`, linked from You for the owner only. List approved investors and managers. Toggle. Show each person's shareholder listings and the shareholder amounts already posted.

- [ ] **Step 3:** Demo accounts sheet: when `user.shareholder`, meta is `Investor · Shareholder` or `Manager · Shareholder`. You screen shows one line `Shareholder` under the name. No new mode-bar item.

- [ ] **Step 4:** `approveSettlement` posts the holder lines and the reserve line. I10 shows them as specified in Task 1.

- [ ] **Done when:** Journey 10 can be clicked. Omar's listing, Priya sets buyer Layla and the market note, Fatima waives, the listing is live with a treasury stand-in, settlement pays Omar and Layla equal shareholder amounts with the odd cent to Layla, and Hadi moves reserve money out on S11. Unmarking Layla does not change a completed statement.

### Task 14: Users, settings, audit, ledger (S14–S17)

**Files:**
- Modify: `MockUI/v4/store.js`
- Modify: `MockUI/v4/screens-staff.js`

**Interfaces:**
- Produces:
  - `Store.setSuspended(userId, on) -> { ok, error }`
  - `Store.setExposure(managerId, cents) -> { ok, error }`
  - `Store.saveSettings(patch) -> { ok, error }`

`setSuspended` owner or reviewer. A suspended manager's steps become owner `staff` for ops. `approveSettlement` leaves that manager's payout in `withdrawals:hold` with reason `Payout held because the account is suspended.` `setExposure` is owner-only and is read by the existing `listingError`. `saveSettings` is owner-only and may change `overdueDays`, `autoWithdrawDays`, `waiverStandInPct`, `shareholderSharePct`, `exposureDefault`, `blocked`, and `prohibited` (array of strings). Blocked-country checks already read `state.settings.blocked`. Extend `setStaffRole` from Task 9 so it refuses to remove the last owner with `Error: the owner role cannot be removed from this account.`

- [ ] **Step 1:** S14 `#/users`. Search investors and managers. Suspend. Owner sets the exposure limit. A suspended user's withdraw call already returns the held sentence.

- [ ] **Step 2:** S15 `#/settings`. The fields above. Saving `overdueDays` changes which rows S6 shows.

- [ ] **Step 3:** S16 `#/audit`. Filter by actor, action, and entity. Document views from S3 and S8 are already audit rows and must appear.

- [ ] **Step 4:** S17 `#/ledger`. Accounts grouped by wallet, escrow, treasury, revenue, reserve, hold. Balances from `L.verify`. Show `Ledger does not balance.` when `ok` is false.

- [ ] **Done when:** Journey 13's remaining clicks and journey 14. Hadi cannot remove his own owner role (`setStaffRole` refuses the last owner with `Error: the owner role cannot be removed from this account.`). Adding `IR` to the blocked list makes a new withdrawal to Iran return the existing country sentence. A suspended manager's settlement payout stays in hold.

## Spec coverage

| Spec | Task |
|---|---|
| I4 almost funded, I5 steps, I10 treasury split, I12–I14 states | 1, 13 |
| M1–M2 registration, business and individual | 2 |
| M3–M4 | 3 |
| M5–M7 | 4 |
| S4–S5, buyer shareholder, waiver | 5 |
| M8–M10, journey 3 | 6 |
| M11–M12, M13 already built | 7 |
| S1, S6, S7, journey 5 | 8 |
| S11, S12, journeys 11 and 13 | 9 |
| S8 board, journey 6 | 10 |
| S8 money, journeys 8 and 12 | 11 |
| S9, S10, journeys 7 and 9 | 12 |
| Shareholder flag, S13, journey 10 | 13 |
| S14–S17, journeys 13 and 14 | 14 |

Public screens, I1–I3, I6–I9, I11, S2, and S3 are already built. This plan does not rebuild them.

## Out of scope

Milestone H (motion pass, right to left, width sweep) and milestone I (findings and the GitHub issue). Arabic copy. Real payments. Editing `Demo/`.
