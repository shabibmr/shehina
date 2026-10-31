# MockUI v4 — Staff and shareholders task list

Parallel track. A shareholder is a flag on an investor or a manager, not a role and not a mode-bar item. Layla Nasser and Omar Al-Said keep the screens of their role.

**Owns:** `MockUI/v4/screens-staff.js`, new `MockUI/v4/screens-staff-ops.js`, the script tag for that file in `MockUI/v4/index.html` (before `start.js`), the shareholder line on You and in the demo-accounts sheet in `MockUI/v4/screens-public.js`, and the staff functions in `MockUI/v4/store.js`. In `MockUI/v4/logic.js`, add only the extra `selfCheck` case in S-8. In `MockUI/v4/ui.js`, add the staff side rail at `min-width: 1024px` only if it is missing. Do not change the manager Listings href.

**Does not edit:** `screens-investor.js`, `screens-manager.js`, `seed.js`, `Demo/`. I10 rendering belongs to the investor track. This track posts the amounts I10 already knows how to read.

**Shared file rule:** Add staff functions inside the existing store IIFE and add their names to the `ShehnatStore` export. Do not rewrite manager functions (`submitManagerApplication`, `respondTerms`, `payDeposit`, `withdrawListing`, `deleteDraft`, `completeStep`, `proposePlan`, `buildListing`).

## Store functions this track adds

| Function | Returns | Rule |
|---|---|---|
| `reviewListing(id, action, body)` | `{ ok, error }` | `action` is `approve`, `reject`, or `revise`. `body` is `{ reason, marketNote, buyerShareholderId, waiver, terms }`. `terms` is `{ investorShare, companyPct, minimum, shipments }` and is stored as `listing.revised`. |
| `fillOverdue(id)` | `{ ok, error }` | Ops only. Remainder from `platform:treasury` to `escrow:<id>`, memo a treasury contribution. |
| `decideWithdrawal(id, approve, text)` | `{ ok, error }` | Amount ≥ `settings.largeWithdrawal` (1000000 cents) requires owner. Smaller amounts require finance or owner. |
| `failWithdrawal(id)` | `{ ok, error }` | Owner only. Status `failed`. Money returns to the wallet. |
| `treasuryTopup(cents, reference)` | `{ ok, error }` | Reference required. |
| `moveReserve(cents, out)` | `{ ok, error }` | Owner only. Between `platform:reserve` and `platform:treasury`. |
| `addStaff({ name, email, role })` | `{ ok, error }` | Owner only. |
| `setStaffRole(id, role)` | `{ ok, error }` | Refuses the last owner: `Error: the owner role cannot be removed from this account.` |
| `deactivateStaff(id)` | `{ ok, error }` | Refuses the actor: `Error: you cannot deactivate your own account.` |
| `setStep(listingId, shipmentId, stepId, next, extra)` | `{ ok, error }` | `next` is `in_progress`, `done`, `verified`, `blocked`, `skipped`. `extra` is `{ reason, doc }`. |
| `opsMoney(listingId, kind, body)` | `{ ok, error }` | `kind` is `step-cost`, `unplanned`, `proceeds`, `use-proceeds`, `overrun`, `cancel`. |
| `proposeResolution(listingId, shipmentId, kind, body)` | `{ ok, error }` | `kind` is `writeoff` or `resale`. |
| `decideApproval(approvalId, approve, reason)` | `{ ok, error }` | Uses `L.fourEyes`. |
| `proposeSettlement(listingId)` | `{ ok, error }` | Every shipment at Goods sold. `L.can(actor, "propose-settlement")` is `""`. |
| `approveSettlement(listingId, reason)` | `{ ok, error }` | Finance or owner, not the proposer. |
| `setShareholder(userId, on)` | `{ ok, error }` | Owner only. Approved investor or manager. |
| `setSuspended(userId, on)` | `{ ok, error }` | Owner or reviewer. |
| `setExposure(managerId, cents)` | `{ ok, error }` | Owner only. Read by the existing `listingError`. |
| `saveSettings(patch)` | `{ ok, error }` | Owner only. |

`reviewListing`: `approve` requires assignee or owner (`L.canDecide` on `listing.assigneeId`). A shareholder listing requires a non-empty `marketNote`. `waiver` requires `L.can(actor, "waiver") === ""`. Waiver sets `listing.waiver = true` and posts `waiverStandInPct` percent of the funding target from `platform:treasury` to `escrow:<id>`, memo `Deposit stand-in`. `reject` requires a reason and sets status `rejected`. `revise` stores `revised`, sets status `awaiting_terms`, and notes the manager. `buyerShareholderId` requires `L.can(actor, "buyer-shareholder") === ""` and a user with `shareholder === true`.

`decideWithdrawal`: approve posts hold to `bank:external`, status `paid`, stores `reference`. Decline posts hold back to the wallet, status `declined`, stores `reason`.

`setStep`: ops or owner (`L.can` action `steps`). Block and skip require `reason`. Skip and verify are stored on `listing.approvals` as `{ type, proposerId, status: "proposed" }` and do not change the step until `decideApproval`. A step with `verify: true` does not count for `L.shipmentStage` until state is `verified`.

`opsMoney`: `step-cost` moves escrow to `bank:external` and attaches `doc`. `unplanned`, `use-proceeds`, and `overrun` create an approval and do not move money. `proceeds` moves `bank:external` to escrow and stores a shortfall reason when the amount is under the expected sale. `cancel` is allowed only before any shipment has passed Goods purchased, refunds contributions to wallets, and sets status `cancelled`. Refusals: `Insufficient funds.` or `Error: goods have already been bought.`

`decideApproval`: the proposer sees `Needs another staff member to approve.` Approving applies the stored effect: verify step, skip step, unplanned cost, use proceeds, overrun contribution from treasury, write-off, resale, or plan change (copy `planProposal.steps` onto the live steps). Resale to a user with `shareholder === true` can be approved only by the owner.

`approveSettlement` calls `L.settlement` with `shareholderSharePct` from settings, `buyerShareholderId`, and `holders` equal to the ids of users with `shareholder === true`. Post each contribution payout to wallets, the fee to `platform:revenue`, each holder amount from `platform:treasury` to that user's wallet with memo `Shareholder share`, and `reserve` cents from `platform:treasury` to `platform:reserve` with memo `Reserve fund`. Set status `completed`. Do not export `splitEqual`. A suspended manager's payout stays in `withdrawals:hold` with reason `Payout held because the account is suspended.` Send back sets `settlement.status` to `returned` and stores the reason.

`setShareholder` sets `user.shareholder` and audits `Marked shareholder` or `Unmarked shareholder`.

`setSuspended(true)` on a manager changes that manager's open steps to owner `staff`.

`saveSettings` may change `overdueDays`, `autoWithdrawDays`, `waiverStandInPct`, `shareholderSharePct`, `exposureDefault`, `blocked`, and `prohibited` (array of strings).

Every function in this table writes an audit row.

## Constraints

- Prototype only. Staff mode bar stays Queue, Listings, Money, You. From 1024px those four become a side rail. Do not add a fifth item.
- No door colour, no celebration screen after settlement.
- Field errors start with `Error: `.
- `node MockUI/v4/logic.js` must exit 0 after S-8.

## Tasks

Work in order inside this file.

### S-1. Listing review (S4, S5)

- [x] Add `reviewListing`.
- [x] Replace `#/queue-listing/:id` with S4. Show terms, projection figures, step names, the required-document flag, stage coverage, the assignee control, a market-check field, a buyer-shareholder select of approved users with `shareholder === true`, a waive-deposit control, approve, reject with a reason sheet, and `Send revised terms`.
- [x] S5 `#/revise/:id`. Edit investor share, manager capital percent, minimum, and step costs. Show old value and new value. Send calls `reviewListing(id, "revise", { terms })`.
- [x] **Done when:** Priya sends Cashew to Muscat back with investor share 55 and Kerala is notified. Fatima, not Priya, can waive. A shareholder listing without a market note cannot be approved. The screen no longer says the decision is elsewhere.

### S-2. Staff home, overdue, all listings (S1, S6, S7)

- [x] Add `fillOverdue`.
- [x] S1 `#/queue`. One lead row for the next item this role can act on, then the next row. Panels: live count, raised, treasury balance, reserve balance, overdue count, late count. Owner also sees Ledger OK or not from `L.verify`. A reviewer does not see a Fill button.
- [x] Move today's three queue tabs to `#/queue-list`, linked as `Open the queue`.
- [x] S6 `#/overdue`. Rows where `L.overdue(listing, state.now, settings.overdueDays)` is true. `Fill from treasury` calls `fillOverdue`. `Leave open` navigates back.
- [x] S7 replaces the empty `#/staff-listings`. Filters: status, stage, late, shareholder. Search by name. Ops and owner rows link to `#/ops/:id`. A reviewer row in `in_review` or `awaiting_terms` links to `#/queue-listing/:id`.
- [x] **Done when:** The seeded overdue listing appears for Sam without a clock edit. Filling it drops the treasury by the remainder. Priya's home has no Fill button.

### S-3. Money and team (S11, S12)

- [x] Add `decideWithdrawal`, `failWithdrawal`, `treasuryTopup`, `moveReserve`, `addStaff`, `setStaffRole`, `deactivateStaff`.
- [x] S11 `#/staff-money`. Panels: withdrawals, treasury, platform revenue, reserve. Finance sees the owner sentence on a row of USD 10,000 or more and no approve button. Treasury top-up asks for a reference. Reserve out is an owner button.
- [x] S12 `#/team`, owner only. Others see `You cannot do that.` List, add, change role, deactivate.
- [x] **Done when:** Fatima can pay Aisha's USD 2,000 withdrawal and cannot pay a USD 12,000 one. Hadi can pay the large one. Hadi cannot deactivate himself. `failWithdrawal` on a paid row returns the cents.

### S-4. Operations board (S8)

- [x] Create `screens-staff-ops.js` and load it before `start.js`.
- [x] Add `setStep`.
- [x] S8 `#/ops/:id`. One board per shipment. Columns: To do, In progress, Done, Verified, Blocked, Skipped. A column change uses `Motion.fade`. Document view uses the same logged placeholder sentence as S3.
- [x] **Done when:** Sam can move a step. Wei verifying a payment step creates a proposal and does not change the step yet. A late step still shows its revised date on the investor track screen.

### S-5. Operations money (S8)

- [x] Add `opsMoney`.
- [x] On `#/ops/:id`, add sheets for step cost, unplanned cost, sale proceeds, use proceeds, overrun fill, and cancel.
- [x] **Done when:** An overrun request does not change balances. Cancel before goods are bought refunds contributions and sets `cancelled`. Cancel after Goods purchased returns `Error: goods have already been bought.`

### S-6. Approvals and settlement (S9, S10)

- [x] Add `proposeResolution`, `decideApproval`, `proposeSettlement`, and `approveSettlement`. Holder and reserve posts are included here, as specified above.
- [x] S9 `#/approvals`. One list. The proposer's row shows `Needs another staff member to approve.` and no approve button.
- [x] S10 `#/settlement/:id`. Render `L.settlement` rows. Approve and send back. No celebration screen.
- [x] Write-off and resale sheets on S8 call `proposeResolution`.
- [x] **Done when:** Hadi proposes a settlement, Hadi cannot approve it, Fatima approves it, and the investor wallet increases by the capital payout. Sam proposes a resale and Wei, not Sam, approves it. A resale to a shareholder waits for the owner.

### S-7. Shareholders (S13)

- [x] Add `setShareholder`.
- [x] S13 `#/shareholders`, linked from You for the owner only. List approved investors and managers, toggle the flag, and show each person's shareholder listings and shareholder amounts already posted.
- [x] Demo accounts: when `user.shareholder`, the meta is `Investor · Shareholder` or `Manager · Shareholder`. You shows one line `Shareholder` under the name. No new mode-bar item.
- [x] **Done when:** Hadi can unmark and mark Layla. Unmarking her does not change a completed statement. Omar's listing can record Layla as buyer and a market note on S4, Fatima can waive the deposit, and a later settlement pays both holders, with the odd cent to Layla.

### S-8. Shareholder self-check

- [x] In `logic.selfCheck`, add one case with two holders, buyer Layla, an odd cent, and an investor capital row that stays unchanged by the split. The capital profit and the shareholder amount are different numbers.
- [x] Run `node MockUI/v4/logic.js`. Expected: exit 0. Do not remove the investor track's `process.exitCode` line if it is already there. If it is not, leave it for that track.

### S-9. Users, settings, audit, ledger (S14–S17)

- [x] Add `setSuspended`, `setExposure`, and `saveSettings`.
- [x] S14 `#/users`. Search investors and managers. Suspend. Owner sets the exposure limit.
- [x] S15 `#/settings`. The settings fields listed above. Saving `overdueDays` changes which rows S6 shows.
- [x] S16 `#/audit`. Filter by actor, action, and entity. Document views from S3 and S8 appear.
- [x] S17 `#/ledger`. Group accounts by wallet, escrow, treasury, revenue, reserve, and hold. Balances from `L.verify`. When `ok` is false, show `Ledger does not balance.`
- [x] **Done when:** Hadi cannot remove his own owner role. Adding `IR` to the blocked list makes a new withdrawal to Iran return the existing country sentence. A suspended manager's settlement payout stays in hold, and ops can complete that manager's steps.

## Done when

S-1 through S-9 are checked. The mode bar still has four items. I10's markup was not edited.

Leave `MockUI/v4-plan/TASKS.md` for the integration pass. Journey 10 is complete only after this track and the investor I10 render are both merged.
