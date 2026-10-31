# MockUI v4 — Manager task list

Parallel track. A manager is the company role: a business or an individual. There is no separate company screen.

**Owns:** `MockUI/v4/screens-manager.js`. In `MockUI/v4/ui.js`, change only the manager Listings href to `#/listings`. In `MockUI/v4/store.js`, add only the functions in the block below.

**Does not edit:** `screens-investor.js`, `screens-staff.js`, `screens-staff-ops.js`, `screens-public.js`, `logic.js`, `index.html`, `seed.js`, `Demo/`.

**Shared file rule:** Add manager functions inside the existing store IIFE and add their names to the `ShehnatStore` export. Do not rewrite functions the staff track owns (`reviewListing`, `fillOverdue`, withdrawal decisions, `setStep`, `opsMoney`, settlement, `setShareholder`, settings).

## Store functions this track adds

| Function | Returns |
|---|---|
| `submitManagerApplication(payload)` | `{ ok: true }` or `{ ok: false, errors }` |
| `respondTerms(id, accept)` | `{ ok, error }` |
| `payDeposit(id)` | `{ ok, error, topup }` |
| `withdrawListing(id)` | `{ ok, error }` |
| `deleteDraft(id)` | `{ ok, error }` |
| `completeStep(listingId, shipmentId, stepId, doc)` | `{ ok, error }` |
| `proposePlan(listingId, steps)` | `{ ok, error }` |

`buildListing` changes so a shipment keeps the `steps` the form sends. A shipment with no steps still gets `L.defaultSteps`.

`submitManagerApplication` payload: `kind` (`business` or `individual`), `legalName`, `regCountry`, `regNumber`, `signatory`, `dob`, `phone`, `residence`, `idType`, `idNumber`, `files` (`{ name, type, size }[]`), `declare`.

- Business requires `legalName`, `regCountry`, `regNumber`, `signatory`, and at least 3 files.
- Individual requires `legalName`, `dob`, `phone`, `residence`, `idNumber`, and at least 2 files.
- Both require `declare`.
- Blocked `regCountry` or `residence`: `errors.residence = "Error: we cannot accept a residence in that country."`
- Individual age and phone use `L.ageOk` and `L.phoneOk`.
- On success: `application.status = "pending"`, history action `Submitted`, notify the user.
- Do not send a manager through `submitApplication`.

`respondTerms(true)` copies `listing.revised` onto the live terms, sets status `approved`, clears `revised`. `respondTerms(false)` sets status `rejected` with reason `Manager declined the revised terms.`

`payDeposit` requires status `approved`. It moves `companyPct` percent of the funding target from the manager wallet to `escrow:<id>`, sets status `live` and `liveAt`. A short wallet returns `{ ok: false, topup: true }`.

`withdrawListing` is allowed only before `live` and sets status `withdrawn` with no money movement.

`deleteDraft` removes a listing only when its status is `draft` and the signed-in manager owns it.

`completeStep` only if the step owner is `manager`, the signed-in user manages the listing, and the step is `todo` or `in_progress`. `doc` is `{ name, type, size }` or omitted. Set state `done`. A step with `verify: true` stays `done` until staff verifies it.

`proposePlan` stores `listing.planProposal = { proposerId, steps, status: "proposed" }` and does not change the live steps.

**Contract with staff:** Staff writes `listing.revised` via `reviewListing(id, "revise", { terms })`. `terms` is `{ investorShare, companyPct, minimum, shipments }`. This track only reads that object. To walk M9 before the staff list is merged, use the seeded listing that is already `awaiting_terms` if it has `revised`; if it does not, add `revised` on that one seeded row inside `screens-manager` test data is not allowed. Walk M9 after merge, or set `revised` through the store function only when the object is already present.

## Constraints

- Prototype only. Four mode-bar items: Home `#/desk`, Listings `#/listings`, Wallet, You.
- Task screens are M1 submit, M5's submit step, and M10. They hide the mode bar and show one action bar.
- M13 is already `#/wallet`, `#/top-up`, `#/withdraw`, `#/withdrawal/:id`. Do not duplicate them.
- Field errors start with `Error: `.
- Live, in-review, and awaiting-terms listings still cannot be saved by `saveListing`.

## Tasks

Work in order. Each task's done-when is inside this track.

### M-1. Registration (M1, M2)

- [x] Add `submitManagerApplication` and export it.
- [x] M1 `#/register`. Task screen, back, action bar `Continue` / `Submit registration`. Steps: type → details → signatory or identity → documents → declaration. Document copy differs by type. The file picker stores name, type, and size only.
- [x] M2 `#/registration`. Pending, rejected with reason and `Fix and resubmit`, approved success banner, and the history list.
- [x] `#/desk` Almost there banner links to `#/registration` when status is not `approved`. A rejected manager can open M1 again.
- [x] **Done when:** Mateo is pending, sees Almost there, and has no submit action. A new manager completes the business path and the individual path to `pending`. After an approval made on the existing `#/review/:id` screen, the gate banner is gone.

### M-2. Home and my listings (M3, M4)

- [x] M3 `#/desk`. One panel titled `Exposure`: used amount of the limit (`user.exposureLimit` or `settings.exposureDefault`) from `L.exposureUsed`. A figure, not a ring.
- [x] Actions due. Empty copy: `Nothing needs you right now.` Links: revised terms `#/terms/:id`, deposit due `#/deposit/:id`, my open step and a late step `#/step/:listingId/:stepId`.
- [x] M4 `#/listings`. Tabs: drafts, in review, action needed, live, completed, ended. Action needed is `awaiting_terms`, `approved`, and `rejected`. Ended is `withdrawn` and `cancelled`.
- [x] Draft and rejected rows link to `#/list/edit/:id`. Other rows link to `#/listing-desk/:id`. Empty tab: `Nothing is in this list yet.`
- [x] Point the manager Listings mode item at `#/listings`.
- [x] **Done when:** Kerala sees an exposure figure and at least one action that navigates. Home no longer lists every status. The mode bar still has four items.

### M-3. New listing wizard (M5, M6, M7)

Routes stay `#/list/new` and `#/list/edit/:id`. In-memory `form` survives add, remove, and a failed save.

Steps: 1 basics (name, category, source, buyer, certificate, prohibited-goods sentence) → 2 shipments (add, remove, goods, sale, planned start) → 3 step plan → 4 terms and preview.

Preview shows funding target, cycle days, expected profit with the word `expected`, ROI this cycle, ROI per year, manager expected share, and exposure left. Numbers come from `L.projection` and `L.cycleDays`.

Submit is the only task-screen step. Action bar: `Submit for review`. Save draft is a secondary button on every step.

The step plan starts from `L.defaultSteps("new")` copied onto every shipment. The editor can add, remove, and reorder. Fields: name, owner (`manager` or `staff`), days, cost in dollars, stage tag or none, counterparty. Coverage uses `L.listingError`. Reorder does not change step ids already saved.

- [x] Persist `steps` through `buildListing`.
- [x] Replace the single form with the four steps. A listing that cannot be edited still says `This listing cannot be edited.`
- [x] Submit calls `Store.submitListing`. A `listingError` stays on the preview step.
- [x] **Done when:** Kerala saves a draft with two shipments and a reordered step, reloads, and sees the same steps. Submitting without a Goods sold tag shows the stage-coverage error and leaves the listing in `draft`. Exposure over the limit shows the exposure sentence.

### M-4. Listing detail, revised terms, deposit (M8, M9, M10)

- [x] Add `respondTerms`, `payDeposit`, `withdrawListing`, and `deleteDraft`.
- [x] M8 `#/listing-desk/:id`. Status banner and one next action: edit draft, delete draft, withdraw before live, respond to revised terms, pay deposit with days left (`autoWithdrawDays`), or read-only progress when live. Show shipments, steps, and expected versus actual figures.
- [x] M9 `#/terms/:id`. Side-by-side diff of `listing.revised`. Accept and decline call `respondTerms`.
- [x] M10 `#/deposit/:id`. Task screen. Show the deposit and the wallet balance. A shortfall links to `#/top-up`. Action bar `Pay deposit`. Success line on M8: `This listing is live.`
- [x] **Done when:** Accepting revised terms sets the listing to `approved`. Paying the deposit sets it to `live` and moves the deposit into escrow. Withdraw on an approved listing before payment sets `withdrawn` and does not move money. The full click-through with Priya is the integration check after the staff track lands.

### M-5. My step and plan change (M11, M12)

- [x] Add `completeStep` and `proposePlan`.
- [x] M11 `#/step/:listingId/:stepId`. Counterparty, documents, `Mark in progress`, `Mark done`.
- [x] M12 `#/plan/:id`, only when status is `live`. Same editor as the wizard's step plan. Send stores the proposal. Live steps stay unchanged.
- [x] **Done when:** Kerala marks her Ordering step done on a live listing, and the stage advances only when that step was the last one the stage needed. A plan proposal does not change `#/track/:id`.

## Done when

M-1 through M-5 are checked. Wallet screens were not copied. `saveListing` still refuses a live listing.

Leave `MockUI/v4-plan/TASKS.md` for the integration pass.
