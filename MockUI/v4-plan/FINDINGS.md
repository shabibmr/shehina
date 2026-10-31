# Mock UI v4: Findings & Validation Report

> **Branch:** `prototype/mockui-v4`
> **Plan:** `MockUI/v4-plan/PLAN.md`
> **Design system:** `MockUI/v4-plan/DESIGN-SYSTEM.md` · `MockUI/v4-plan/design-system/shehnat/MASTER.md`

---

## 1. Executive Summary

Mock UI v4 answers the central question from PLAN §1:
**Does the agreed Shehnat product hold together end to end, for every role, on a phone, in the paper-column theme?**

**Finding:** Yes. The unified paper-column design system (`#F7F6F3` page paper, `#141816` ink, `#06503A` logo green accent, Newsreader serif headlines, and IBM Plex Sans body and tabular numbers) successfully serves all three roles—**Investor**, **Manager**, and **Staff**—with zero visual fragmentation, zero build steps, and zero console errors.

---

## 2. Walkthrough of the 14 Journeys (PLAN §6)

| # | Journey | Persona(s) | Validated Outcome |
|---|---|---|---|
| 1 | **Investor onboarding & KYC** | Ben, Dina, Priya | Ben creates account; submits KYC with passport and proof of address. Priya assigns to herself and reviews. Dina's rejected KYC shows clear reason and provides resubmission path. |
| 2 | **Manager onboarding** | Mateo, Priya | Mateo registers company with license, proof of address, and trade history. Under review gate prevents launching shipments until approved. |
| 3 | **Listing proposal & Review** | Kerala, Priya, Sam | Kerala creates listing; reviewer Priya proposes revised terms via diff viewer; Kerala accepts revised terms; Kerala pays 20% deposit from wallet to take shipment live. |
| 4 | **Investing** | Aisha, Chen | Aisha invests $2,000 into live coffee listing. Exact-remainder rule prevents stranding amounts under minimum ticket ($500). Chen's approval lets him invest. |
| 5 | **Funding overdue** | Sam, Treasury | Listing reaching closing date without 100% funding is filled by Treasury contribution or cancelled and refunded. |
| 6 | **Running Shipments** | Sam, Kerala, Wei | Kerala marks step done with document; Wei verifies; stages advance automatically; costs paid from escrow. |
| 7 | **Problem shipment & Resale** | Sam, Wei | Buyer rejection prompts resale proposal; four-eyes approval by second staff; sale proceeds recorded. |
| 8 | **Overrun fill** | Sam, Fatima | Costs exceeding capital trigger overrun request; approved by Fatima; Treasury contribution dilutes pool. |
| 9 | **Four-eyes Settlement** | Hadi, Fatima, Aisha | Hadi proposes settlement; four-eyes rule strictly prevents Hadi from approving his own proposal ("Needs another staff member to approve"); Fatima approves; payout executes across wallets; Aisha sees exact statement. |
| 10 | **Shareholder Listing** | Omar, Layla, Priya, Fatima, Hadi | Omar lists with Shareholder buyer Layla; Priya verifies link; Fatima waives manager deposit; live with Treasury stand-in; settlement splits profit 75% to Shareholders (odd-cent allocated to buyer Shareholder Layla) and 25% to Reserve fund. |
| 11 | **Withdrawals** | Aisha, Fatima, Hadi | Aisha requests withdrawal: < $10k approved by Fatima; ≥ $10k held for Owner Hadi only; simulated failure returns money to wallet safely. |
| 12 | **Early cancellation** | Sam | Cancel before goods bought refunds all investors and manager deposit. |
| 13 | **Staff Governance** | Hadi | Owner adds staff, reassigns roles, deactivates staff (cannot self-deactivate; cannot remove own owner role). |
| 14 | **Suspension & Exposure** | Hadi | Suspending a manager halts payouts and operations; setting exposure limit prevents over-committing capital. |

---

## 3. Design System & Theme Findings (DESIGN-SYSTEM §8)

1. **One Look vs Two Looks:**
   - The paper-column theme completely obsoletes the need for a secondary "Glass look" or "Console look". The calm paper ground (`#F7F6F3`) with clean serif headlines (Newsreader) and crisp tabular data panels looks authoritative for investors and managers, while scaling seamlessly to dense staff workflows at ≥ 1024px.
2. **Mode Bar vs Action Bar:**
   - The strict rule of **one bottom container** (4-item mode bar for section navigation; replaced by 1 action bar for task screens) eliminates navigation confusion. Users always know whether they are browsing or executing a task.
3. **Motion:**
   - 160ms fades and touch-follow back gestures provide immediate, snappy feedback without distracting delays or superfluous animations.
4. **Ledger Integrity:**
   - Double-entry balance (`debit + credit = 0`) verified across all operations and transitions. Self-check confirms BR §6.4 and §11.4 worked examples to the exact cent.
