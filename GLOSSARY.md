# Glossary

## Listing

A funded offer to finance one trade made of one or more Shipments. It has a funding target, a status and an escrow. It settles once, when every Shipment is sold, using the summed cost of goods and the summed sale price.

## Shipment

One container within a Listing, with its own Stage, cost of goods and sale price. The Manager declares the number of Shipments when creating the Listing, and it is fixed once the Listing is approved. The Listing's overall Stage is the least advanced Shipment's Stage. Goods are bought only once the Listing is fully funded, one Shipment at a time, and the total cost across Shipments may not exceed the capital raised.

_Open question_: what happens to a Shipment that is lost, seized or rejected by the buyer, since the Listing cannot settle until every Shipment is sold.

## Contribution

Any capital put into a Listing, from an Investor, the Manager or the Platform. Profit and loss are shared pro-rata across all Contributions.

_Avoid_: capital provider contribution, company contribution.

## Manager deposit

The Manager's own Contribution, 20% to 90% of the Listing's funding target. It counts toward the target. After the Listing is approved, the Manager pays it from their Wallet, and the Listing goes live in the same step. There is no bank transfer, finance confirmation or "deposit sent" flag. It can be waived when the Buyer is a Shareholder (see Deposit waiver).

## Deposit waiver

A staff decision that the Manager pays no Manager deposit, allowed only when the Buyer is a Shareholder. Owner or finance set it during the Listing review, and it is locked once the Listing is approved. In place of the deposit, the treasury puts in a stand-in Contribution (20% of the funding target by default, a setting of its own) when the Listing goes live. Investors fund the rest, and any balance still unfunded once the Listing is Overdue is filled from the treasury in the usual way. All or nothing: the Manager pays the full deposit or none. The Manager still receives the Manager share, but earns nothing on capital.

_Avoid_: manager capital waiver, zero-deposit listing.

_Avoid_: company capital, manager capital.

## Manager share

The Manager's performance cut of net profit (100 minus the investor share %), paid only when net profit is above zero. Separate from the profit the Manager earns on their Manager deposit as a Contribution.

## Service fee

The Platform's charge of 1% of the sale price, taken only on a profitable Listing and never more than the gross profit.

_Avoid_: service charge, platform revenue (that is the account the fee lands in).

## Reserve fund

A Platform money pot kept apart from the treasury. It receives whatever is left of the treasury's profit on a Shareholder Listing after the Shareholder share is paid (25% by default). It can never go negative, and only the owner moves money out of it, at their discretion.

_Avoid_: reserve, reserves (as a loose name for the treasury).

## Wallet

A user's balance on Shehna in US dollars. It is funded through the payment gateway, and only an approved Investor or Manager can top it up. Investors invest from it, Managers pay their Manager deposit from it, and withdrawals leave from it.

## Blocked country

A country on the configurable blocked list. People and businesses living or registered there cannot take part, and Listings and bank payouts cannot involve it. A user's country is checked when they submit, when they are approved, and again on every top-up, investment, deposit and withdrawal. Nationality is not checked.

## Overdue

A Listing that has been live for 5 days or more at Stage 0 without being fully funded. Staff may fill the remainder from the treasury or leave it open. There is no upper time limit and nothing is cancelled automatically.

## Top-up

Money added to a Wallet through a payment gateway payment that the user starts for a stated USD amount. The gateway's signed confirmation credits exactly that amount, once per payment. The user always receives the full amount, and the gateway's fee is the Platform's cost.

## Withdrawal

A request to move money out of a Wallet. The amount is held at once. Finance, or the owner for USD 10,000 and above, approves it, and only then is it paid out through the payment gateway. If the payout fails, the held money returns to the Wallet automatically and the user is told, and they can request again.

## Settlement

The final step of a Listing: the sale is recorded and every Contribution is paid out its capital plus or minus its share of the result, in one transaction. Ops can propose it only once every Shipment has reached Goods sold, with a sale price and a sale document (invoice or proof of payment) for each Shipment. The Listing's sale price is their sum. A different staff member (finance or owner) approves it before any money moves.

## Cancelled

A Listing ended before any Shipment's goods are purchased, by ops or the owner with a reason. Every Contribution is refunded in full. Once the first Shipment is bought a Listing cannot be cancelled, only settled, even at a loss.

## Rejected

A Listing a reviewer has turned down, with a reason. The Manager can edit and resubmit it, which returns it to review and clears the reason and assignment.

## Shariah compliance

A product requirement: Shehna must be structured so a Shariah board can certify it. The existing vocabulary (Investor, Manager, Manager share, Service fee) is kept as it is.

_Open question_: the Service fee is charged on sale price, which a Shariah board may challenge.

## Prohibited goods

Goods that may not be listed because they are excluded on Shariah grounds. The list is configurable and shown to Managers when they create a Listing. A reviewer rejects a Listing for such goods, with a reason. The final list comes from the Shariah board.

## Manager negligence

Misconduct or failure of duty by a Manager (for example breach of the agreed terms or mishandling the goods) that makes the Manager personally liable for the resulting loss.

_Open question_: how a finding is made and how the loss is recovered (deferred).

## Manager

A person or business, anywhere, who lists a trade on Shehna and puts in their own capital. A Manager is either a **Business** or an **Individual trader**.

_Avoid_: Company (legacy name in the code, API and database; not a separate concept).

## Shareholder

A part-owner of Shehna (the plan is about 10, each holding 1%), mostly importers. The stake is bought and documented outside the platform. On Shehna, a Shareholder is an existing approved Investor or Manager account that the owner has marked as a Shareholder. Shehna does not sell shares or pay dividends. A Shareholder acting as a Manager has the usual Manager benefits and obligations, including paying their own Manager deposit.

_Avoid_: equity investor (clashes with Investor).

## Buyer

The party who buys a Listing's goods, recorded by country. If the Buyer is a Shareholder, staff record which Shareholder during the Listing review. The Manager does not choose this, and the Shareholder does not confirm it.

## Treasury

The Platform's own capital. It can put money into a Listing, either as the stand-in under a Deposit waiver or to fill the balance of an Overdue Listing. Each of these is a Contribution that shares profit and loss pro-rata like any other.

## Shareholder Listing

A Listing whose Buyer, or whose Manager, is a Shareholder. The profit on every treasury Contribution on it is split at Settlement: the Shareholder share (75% by default, a setting fixed for the Listing when it is approved) is paid to the Shareholder's Wallet, and the rest goes to the Reserve fund. If the Manager and the Buyer are two different Shareholders, they split the Shareholder share equally. If one Shareholder is both, they receive all of it. A loss on treasury Contributions is borne by the treasury alone: the Shareholder takes none of it, and the Reserve fund is not drawn on automatically. Investors are not told that a Listing is a Shareholder Listing.

_Avoid_: equity investor listing, related listing.

_Open question_: related-party pricing. A Shareholder-Buyer who pays a low sale price lowers the Investors' profit. The reviewer checks the expected sale price against the market before approval, and the Settlement approver checks the sale document against it, but there is no fixed tolerance yet.

_Open question_: a Shariah board may treat the Shareholder share as a hidden discount to the Buyer on the sale price.

## Step plan

The ordered list of Steps a Listing goes through (for example Ordering, Advances, Purchase, Payments, Transportation, Clearance, Receipts, Invoicing). It starts from a standard template, the Manager adjusts it when submitting the Listing, and the reviewer approves or edits it as part of the Listing review. It is locked once the Listing is live; later changes need staff approval and are recorded in the timeline.

## Step

One unit of work in a Step plan, with an owner, a planned duration, expected costs and required documents.

## Step owner

The Shehna user responsible for a Step: the Manager or a named staff member. Outside parties are not owners.

## Counterparty

The outside party involved in a Step (freight forwarder, customs broker, supplier), recorded as plain text. A Counterparty has no login and does not change a Step's status.

## Step cost

A cost attached to a Step, first as an expected amount set in the Step plan, then as an actual amount. Unplanned Step costs can be added during the shipment and need finance approval. Every Step cost is paid by platform ops from the Listing's escrow, with proof attached, and the total paid may not exceed the capital raised. Paid Step costs are deducted from the sale price, together with the cost of goods, to give net profit. Investors see only per-Step totals of expected against actual.

_Avoid_: expense (implies the Manager pays and is reimbursed).

## Step state

Where a Step is in its life: planned, in progress, done, verified, plus blocked and skipped (skipping needs a reason and staff approval). A Step cannot be done until its required documents are uploaded, and Steps that need verification (payment, customs, sale) must be verified by ops. A Step past its planned duration is flagged late, with no automatic action.

## Stage

The fixed milestone sequence (Funding open to Profit paid out) that investors see. It is advanced by ops and is separate from Steps: the two are shown side by side and are not linked.

## Timeline

The time-ordered record of a Listing's Step state changes, each with who, when and a note. Everyone with access to the Listing sees the same timeline, including Investors: steps, owners, durations, states, dates and Step costs. Investors do not see uploaded documents, nor the Manager deposit, expected profit, Manager share or Manager result. Registration (Investor or Manager) keeps its own separate history of states and attempts, shown as a timeline too.
