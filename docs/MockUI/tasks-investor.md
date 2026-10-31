# MockUI v4 — Investor task list

Parallel track. Implement this file on its own. Do not wait for the manager or staff lists.

**Owns:** `MockUI/v4/screens-investor.js`, and one line in `MockUI/v4/logic.js`.

**Does not edit:** `store.js`, `screens-manager.js`, `screens-staff.js`, `screens-staff-ops.js`, `screens-public.js`, `ui.js`, `index.html`, `seed.js`, `Demo/`.

**Contract the other tracks rely on:** I10 reads `L.settlement(...).treasuryProfit`, `.shareholder`, `.reserve`, and `.holders`. Staff posts those amounts later. This track only renders them.

## Constraints

- Prototype only. Paper, ink, and logo green. No glass, gold UI, count-up, sprout, door, or route draw.
- Field errors start with `Error: `.
- Investors see every listing figure (ADR 0004).
- Do not add a mode-bar item. I12 and I13 stay task screens: the mode bar hides, one action bar shows.
- Check domain changes with `node MockUI/v4/logic.js`. Exit 0 and no `Shehnat self-check` line.

## Tasks

### I-1. Self-check exits non-zero

- [x] In `logic.js`, next to the existing `console.error` for a failed `selfCheck`, add `if (typeof process !== "undefined" && !report.ok) process.exitCode = 1;`
- [x] Run `node MockUI/v4/logic.js`. Expected: exit 0 and no error line.
- [x] Do not add new `selfCheck` cases. The staff track owns the extra shareholder assertion.

### I-2. Explore label (I4)

Route: `#/shipments`.

- [x] On a live row, when `remaining > 0` and `remaining / fundingTarget <= 0.1`, append `Almost funded` in the row meta.
- [x] Do not show Overdue to an investor.

### I-3. Listing steps (I5)

Route: `#/listing/:id`, Shipments tab.

- [x] For each shipment, keep the stage name and list each step's name and state: `todo`, `in_progress`, `done`, `verified`, `blocked`, `skipped`.

### I-4. Settlement statement (I10)

Route: `#/statement/:id`.

- [x] Call `L.settlement` with `shareholderListing`, `shareholderSharePct`, `buyerShareholderId`, and `holders` set to the ids of users with `shareholder === true`.
- [x] When `shareholderListing` is true, add three lines: Treasury profit, Shareholder share, Reserve fund.
- [x] List each holder as `Shareholder` plus the amount. Do not print the person's name.
- [x] The signed-in user's capital profit stays on `My payout`. Do not add the shareholder split into `My payout`.

### I-5. Top-up and withdraw gates (I12, I13)

Routes: `#/top-up`, `#/withdraw`.

- [x] If `L.can(user, "topup")` or `L.can(user, "withdraw")` returns a sentence, or `application.status !== "approved"`, render that sentence and do not render the amount field or the action button.
- [x] Unapproved copy: `Finish verification before you add money.` and `Finish verification before you withdraw.`
- [x] Staff copy stays `Staff cannot invest or withdraw.`

### I-6. Withdrawal status banners (I14)

Route: `#/withdrawal/:id`.

- [x] `pending` and amount ≥ 1000000 cents: `This withdrawal is held.` and `Needs the owner`.
- [x] Other `pending`: `This withdrawal is held.` and `Pending`.
- [x] `paid`: `This withdrawal was paid.`
- [x] `declined`: `This withdrawal was declined.` plus `w.reason`.
- [x] `failed` stays `The payout failed and the money is back in your wallet.`

## Done when

- As Aisha, `#/shipments` shows `Almost funded` only on a listing with 10% or less left.
- `#/listing/cardamom` Shipments tab lists step names.
- Her completed profit statement and completed loss statement still show a signed Profit or Loss.
- As Ben, `#/top-up` shows the verification sentence and no Pay button.
- A seeded pending withdrawal and a seeded failed withdrawal show the banners above.
- `node MockUI/v4/logic.js` exits 0.

Leave `MockUI/v4-plan/TASKS.md` rows C3, C4, C6, and C7 for the integration pass. Do not mark another track's rows.
