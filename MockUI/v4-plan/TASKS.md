# Mock UI v4: task register

> **PROTOTYPE, throwaway.** Nothing here is production code. The validated decisions go into `Demo/`, and the prototype itself is kept on a throwaway branch (`prototype/mockui-v4`), not on `main`.

> The design (question, shape, personas, screens, journeys, decisions) is in [`PLAN.md`](PLAN.md), and the design-system rules, components and motion map in [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md). In this file, **PLAN §n** points there and **BR §n** points to `business-req/BUSINESS_REQUIREMENTS.md`. Screen IDs (P1, I5, M8, S10 …) are defined in PLAN §5; journey numbers in PLAN §6.

## 1. Milestones

| # | Milestone | Outcome |
|---|---|---|
| A | Foundations | Shell, storage, logic module, seed, router, components, motion module, prototype bar |
| B | Public and auth | P1–P8 |
| C | Investor, and the reviews it needs | I1–I14, S2, S3; journeys 1 and 4, journey 11 from the investor side |
| D | Manager, and the Listing review it needs | M1–M13, S4, S5; journeys 2, 3, 12 (withdrawn part) |
| E | Staff: home, overdue and money | S1, S6, S7, S11, S12; journeys 5, 11 (staff side), 13 (part) |
| F | Staff: operations and settlement | S8–S10, journeys 6, 7, 8, 9, 12 (cancel part) |
| G | Shareholders, settings, audit, ledger | S13–S17, journeys 10, 13, 14 |
| H | Motion, right to left and finish | The full motion pass, and a final check of right to left, phone and desktop frames, and every empty, error and loading state |
| I | Walkthrough and capture | Walk all 14 journeys, write up findings, commit to `prototype/mockui-v4`, and open an issue with the findings and a pointer to the branch |

The review screens S2–S5 are built with the side they serve, so each check-in can be walked end to end: C needs a reviewer to reject and approve KYC, and D needs a reviewer to send Revised terms. They use the phone tab bar until E1 adds the staff home and the ≥ 1024px sidebar.

## 2. Task register

Status: ☐ to do · ◐ in progress · ☑ done. Size: S ≈ under 1 hour, M ≈ 1–3 hours, L ≈ more than 3 hours.

**Every screen task** is done only when, besides its own "Done when", the screen has its loading, empty, error and success states (DESIGN-SYSTEM §6; error via the prototype bar's "Fail next action"), and works in right to left at 360px. H2 and H3 check this across the whole mock; they don't build it.

| ID | Task | Covers | Depends on | Size | Status | Done when |
|---|---|---|---|---|---|---|
| **A1** | Shell `index.html`: header (mark and wordmark), screen host, bottom tab bar or sidebar, sheet, scrim and toast layers, links to `tokens.css`, IBM Plex | all | — | M | ☑ | Opens by double-click with no console errors |
| A2 | `proto.css`: port the styleguide components; add list rows, tabs, steppers, a file-upload tile, diff rows, the step board, data tables (≥ 1024px), the phone frame. Logical properties only. | all | A1 | L | ☐ | Every component in DESIGN-SYSTEM §4 has a style; no off-scale values |
| A3 | `logic.js`: settlement (BR §6.3, BR §11.4 incl. two-Shareholder split and rounding), projection (BR §6.4), funding target, cycle and expected profit from Shipments and Steps; a boot self-check of the worked examples | I5, M7, S10 | — | M | ☐ | Reproduces the worked examples in BR §6.4 and BR §11.4 to the cent (self-check shown in the inspector) |
| A4 | `logic.js`: Stage derivation from Steps (tags, verification, skips, never backwards); Late; Overdue; auto-withdraw | I9, S8 | A3 | M | ☐ | Changing a Step state recomputes Stages correctly in every seeded case |
| A5 | `logic.js`: validations: password, email, DOB 18+, international phone, IBAN checksum and country, SWIFT, blocked countries (residence, source, buyer, bank country, and on every top-up, investment, deposit and withdrawal), listing term ranges, exposure limit, remainder rule | P4, I2, I6, I13, M5 | — | M | ☐ | Every rule in BR §3, §4, §6 and §7 gives a clear field message |
| A6 | `logic.js`: permission map (`perms.js` plus the BR §11.6 actions), assignee-only decisions, four-eyes (the proposer can't approve), staff can't invest or withdraw | S* | — | S | ☐ | A disallowed action shows the reason instead of the button |
| A7 | `logic.js`: a simple ledger (post, balance per account, verify) for wallets, escrow, hold, treasury, revenue, reserve; every money action goes through it | all money | A3 | M | ☐ | The ledger check stays OK after every journey |
| A8 | `store.js`: one-object state in `localStorage` (`shehnat-proto-v4`), save on every action, reset, export and import JSON, simulated clock | all | — | S | ☐ | Reload keeps state; reset restores the seed |
| A9 | `seed.js`: the personas in PLAN §4 and every seeded Listing status, with history, Step states, documents, wallets, platform account balances, demo password and audit | all | A3–A8 | L | ☐ | Every status in PLAN §4 is reachable without clicking; the ledger check passes at seed |
| A10 | `motion.js`: port the 9 choreographies from `styleguide.js` as reusable functions, plus the FLIP move for the step board; honour reduced motion | all | A1 | M | ☐ | Each function works in a real screen, and reduced motion gives instant end states |
| A11 | `ui.js`: router (hash routes, back stack, direction for transitions), screen registry, guards (role, KYC or registration gate), skeleton-then-render, toasts, sheets, confirm-with-reason sheet | all | A1, A10 | M | ☐ | Deep links work; back animates the right way |
| A12 | Prototype bar: persona switcher, clock, scenarios, simulated events, fail next action, skeleton delay, state inspector, motion, direction, frame, data | X | A3–A9, A11 | L | ☐ | Every control in PLAN §3 works |
| **B1** | P1 splash, P2 welcome walkthrough | P1, P2 | A11 | S | ☐ | The full logo fades in on splash (no sprout); the walkthrough can be skipped |
| B2 | P3 sign in (attempts, lockout, deactivated), P4 create account, P5 forgot password | P3–P5 | A5 | M | ☐ | 5 wrong passwords lock the account for 15 simulated minutes |
| B3 | P6 notifications (generated from state changes), P7 profile, P8 risk and legal | P6–P8 | A11 | M | ☐ | Approving or rejecting something creates a notification for the right persona |
| **C1** | I1 investor home | I1 | A9 | M | ☐ | The banner changes with KYC status; balance counts up |
| C2 | I2 KYC wizard, I3 KYC status and history | I2, I3 | A5 | L | ☐ | Journey 1 up to submission and resubmission |
| C3 | I4 explore with filters and sort | I4 | A9 | M | ☐ | Filters combine; empty state with "clear filters" |
| C4 | I5 Listing detail (4 tabs, every figure, Shareholder disclosure) | I5 | A3, A4 | L | ☐ | Shows every figure in BR §6.5 for investors |
| C5 | I6 invest sheet, I7 confirmed | I6, I7 | A5, A7 | M | ☐ | Journey 4, including the exact-remainder case |
| C6 | I8 portfolio, I9 track, I10 settlement statement | I8–I10 | A3, A4 | L | ☐ | A completed loss shows signed, labelled negative figures |
| C7 | I11 wallet, I12 gateway top-up, I13 withdraw, I14 withdrawal status | I11–I14 | A5, A7 | L | ☐ | Journey 11 from the investor side |
| C8 | S2 review queue and assignment, S3 application review (investor and manager applications) | S2, S3 | A6, A11 | M | ☐ | Journey 1 from the reviewer side, and Chen's approval in journey 4; only the assignee or owner can decide |
| **D1** | M1 registration wizard (business and individual documents), M2 status and gate | M1, M2 | A5, C8 | L | ☐ | Journey 2 |
| D2 | M3 overview (exposure, actions due), M4 my Listings | M3, M4 | A9 | M | ☐ | Actions due link to the right screens |
| D3 | M5 new Listing wizard, M6 Step plan editor, M7 live preview | M5–M7 | A3, A5 | L | ☐ | Journey 3 up to submission; Stage coverage and exposure errors shown |
| D4 | M8 Listing detail (manager), M9 Revised terms diff, M10 pay deposit | M8–M10 | A7, D6 | L | ☐ | Journey 3 to live; withdraw before live works |
| D5 | M11 my Step (documents, done), M12 propose a plan change, M13 shared wallet | M11–M13 | A4 | M | ☐ | The manager's Step completion moves the Stage when it is the last one needed |
| D6 | S4 Listing review (market check, required docs, buyer Shareholder, waiver, exposure), S5 Revised terms editor | S4, S5 | A3, A6, C8 | L | ☐ | Journey 3 (Revised terms); the buyer-Shareholder and waiver controls work for the right roles (journey 10 is walked in G) |
| **E1** | S1 staff home (role-aware queues and KPIs), the ≥ 1024px sidebar layout | S1 | A6, A9 | M | ☐ | Each staff persona sees only its own queues |
| E2 | S6 funding overdue, S7 all Listings | S6, S7 | A4 | M | ☐ | Journey 5 |
| E3 | S11 money (withdrawals, treasury, revenue, Reserve fund), S12 team | S11, S12 | A6, A7 | L | ☐ | Journey 11 (≥ USD 10,000 owner only) and journey 13 (self-deactivate refused) |
| **F1** | S8 Listing operations: step board per Shipment (To do, In progress, Done, Verified, Blocked, Skipped), documents, verify, block, skip request | S8 | A4, A10 | L | ☐ | Journey 6; cards animate between columns; a Step needing verification counts for its Stage only once Verified |
| F2 | S8 money actions: pay Step costs, unplanned cost, sale proceeds and shortfall, use proceeds, overrun fill, cancel | S8 | A7 | L | ☐ | Journeys 6, 8 and 12 (cancel and refund) |
| F3 | S8 Write-off and Resale proposals (Resale to a Shareholder → owner) | S8 | F1 | M | ☐ | Journey 7 |
| F4 | S9 approvals inbox (four-eyes), S10 settlement approval with the payout ceremony | S9, S10 | A3, A6 | L | ☐ | Journey 9; the owner who proposed sees "Needs another staff member to approve" |
| **G1** | S13 Shareholders, S14 users (suspend, per-manager exposure limit) | S13, S14 | A6 | M | ☐ | Journeys 10 and 14 (suspension holds the payout) |
| G2 | S15 settings, S16 audit log, S17 ledger | S15–S17 | A7 | M | ☐ | Changing a setting changes behaviour (e.g. Overdue days); every action is in the audit log |
| **H1** | Motion pass across every screen, per DESIGN-SYSTEM §5 | all | A10 | M | ☐ | Every row of the DESIGN-SYSTEM §5 table plays in its screen |
| H2 | Right-to-left check across every screen (logical properties, mirrored icons and route, numbers isolated left to right) | all | — | M | ☐ | No layout breaks in right to left at 360px |
| H3 | States check: skeleton, empty, error, success on every screen; 320 / 360 / 768 / 1024 / 1440px | all | — | M | ☐ | No horizontal overflow at any width |
| **I1** | Walk all 14 journeys; record findings (missing screens, awkward flows, rule surprises, the PLAN §9 hypotheses) in `MockUI/v4-plan/FINDINGS.md` | — | all | M | ☐ | Every journey completes, or its blocker is written down |
| I2 | Capture: commit to `prototype/mockui-v4`; open an issue with the findings, the questions they settle and a pointer to the branch | — | I1 | S | ☐ | The issue links the branch, and `main` has no prototype code |

**Totals:** 43 tasks (12 foundation, 3 public, 8 investor and application review, 6 manager and Listing review, 3 staff home and money, 4 staff operations, 2 admin, 3 finish, 2 capture), covering 52 screens and 14 journeys. By size: 4 S, 24 M, 15 L, roughly **70–165 hours** in all.

## 3. Order of work

A1 → A2 → A8 → A3–A7 → A9 → A10–A12 → B → C → D → E → F → G → H → I. Within C, build C8 before the end of C2 (the resubmission needs a rejection). Within D, build D6 before D4 (Revised terms come from the reviewer). After milestone C, each milestone is demoable on its own (switch to that persona and walk its journeys).


## 4. Check-ins (agreed 2026-10-31)

Build milestone by milestone and stop for review at these points. At each one, also flip the prototype bar to right to left and look at every new screen at 360px.

1. **After A + B + C:** foundations, public screens, the investor side and application review. Walk journeys 1 and 4 in full, and journey 11 as the investor (withdrawals wait in the hold until E adds the finance side), and react before the manager and staff sides are built on the same base.
2. **After D:** the manager side and Listing review (journeys 2 and 3).
3. **After E + F:** the staff home, money and operations side (journeys 5–9, 11 from the staff side, 12).
4. **After G + H:** admin, motion, and the final right-to-left and states check.
5. **I:** walkthrough findings and capture.

Update the Status column as tasks move (☐ → ◐ → ☑).
