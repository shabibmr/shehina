# Mock UI v4: walkthrough findings

> **PROTOTYPE, throwaway.** Captured for `prototype/mockui-v4`. Nothing here is a change to `Demo/` or to `main`.

The question was: does the agreed Shehnat product hold together end to end, for every role, on a phone, in the paper-column theme?

## How this was checked

A script drove all 14 journeys through `logic.js` on top of the seed. The ledger check stayed OK, and the boot self-check matched BR §6.4 and BR §11.4 to the cent, including the two-Shareholder split and the odd cent to the buyer.

This session had no browser tool, so the phone, desktop, and right-to-left frames were not clicked through. The CSS uses logical properties, isolates numbers left to right, clips the page horizontally, and lets the step board scroll inside itself. The prototype bar sets `dir="rtl"` and a 390×844 frame.

## Journeys

1. **Investor onboarding.** Works. Ben already has an account in the seed, so the click path is sign in, then the identity check, a rejection, a resubmit, approval, a gateway top-up, and the minimum investment. Create account is a new email.
2. **Manager onboarding.** Works after the prototype scenario "Mateo registration start", which clears his pending application so the wizard can be submitted. At seed he is pending, as PLAN §4 says.
3. **Listing to live.** A two-shipment draft, revised investor share, accept, deposit from the wallet, then live. The success is a line, not a ceremony.
4. **Remainder rule.** An investment that leaves USD 300 is refused for any other amount, and the exact USD 300 is accepted.
5. **Overdue.** After the clock moves, the overdue listing can be filled from the treasury.
6. **Steps.** A manager can finish their own step. Operations moves staff steps. A payment step counts toward its stage only once it is verified. A column change is a fade.
7. **Resale.** Operations proposes, a different operations user approves, then the new proceeds are recorded.
8. **Overrun.** Finance approves a treasury contribution, which dilutes the other capital.
9. **Settlement.** The owner who proposed it sees "Needs another staff member to approve". Finance approves. Wallets are credited. The statement shows a loss with a sign and the word Loss.
10. **Shareholder Listing.** The seeded dates listing is already waived and live. Settlement splits the treasury profit between the two Shareholders, with the odd cent available to the buyer, and the rest to the Reserve fund. The owner can move money out. The Reserve fund is not drawn on for a loss.
11. **Withdrawals.** Finance pays under USD 10,000. The larger one is refused for finance and paid by the owner. A simulated payout failure returns the money to the wallet.
12. **Ending early.** An approved deposit that sits for 14 days is withdrawn with no money moved. Operations can cancel a funded listing before goods are bought and refund every contribution.
13. **Owner admin.** Add staff, change a role, and self-deactivation is refused. Shareholder mark, a per-manager exposure limit, the audit log, and the ledger check all work.
14. **Compliance.** A suspended manager's step can be moved by operations. A bank country on the blocked list refuses the withdrawal.

## Hypotheses in PLAN §9

- **A failed bank payout returns the money.** Implemented, and the journey above completes. Not in BR §5.6, which only has approve and decline. Keep it as a hypothesis until someone decides.
- **One lead on Home is enough.** Built that way: one green lead, the next row above the bar, no count-up. Not confirmed by a person on a phone.
- **Notifications under You are findable.** There is no bell. Search is the only masthead action. Not confirmed by a person.

## What the mock simplified

- The new-listing wizard is one form (shipments, step template, terms, preview), not five separate visual steps. The preview is the task screen.
- Revised terms are edited on the listing review screen (investor share, plus the rest of the listing). S5 points back there. The manager still sees a diff and can accept or decline.
- The staff step board refuses a manager-owned step unless that manager is suspended. That matches the rule, and it is easy to miss in the board.
- Persona cash balances are brought to the PLAN §4 figures with a final seed adjustment, so the ledger still balances after the historical investments and settlements.
- Uploads store a name, type, and size. The gateway is a grey "Secure payment" sheet with Pay and Fail.
- Arabic copy is not translated. Right to left is a direction switch only.

## Not promoted

No rule from this walk was copied into `Demo/`. The branch is the record.
