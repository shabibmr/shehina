# Glossary

## Listing

A funded offer to finance one trade made of one or more Shipments. It has a funding target, a status and an escrow. It settles once, when every Shipment is sold, using the summed cost of goods and the summed sale price.

## Shipment

One container within a Listing, with its own Stage, Step plan, cost of goods and sale price. The Manager declares the number of Shipments when creating the Listing, and it is fixed once the Listing is approved. The Listing's overall Stage is the least advanced Shipment's Stage. Goods are bought only once the Listing is fully funded. Each Shipment has a planned start (days after full funding), so Shipments may run in parallel.

A Shipment that won't be sold to its Buyer (lost, seized, rejected or unpaid) goes through Write-off or Resale, whichever ops proposes and a second staff member approves case by case.

## Write-off

Closing a Shipment that will not be sold, treating it as sold for zero or for any insurance or salvage proceeds recorded, so its loss is shared pro-rata at Settlement. Proposed by ops with a reason and a document, approved by a different staff member.

## Resale

Selling a Shipment's goods to a new Buyer after the original Buyer rejected or failed to pay for them. The Shipment's sale price and sale document come from the Resale. A Resale to a Shareholder needs the owner's approval and a market-price check, and the owner decides at that point whether the Listing becomes a Shareholder Listing.

## Funding target

The total budget of a Listing's trade in US dollars (USD 1,000 – 10,000,000): the sum of every Shipment's expected cost of goods and every planned Step cost, so it always matches the plan the Manager submits together with the Investor share. The Manager also declares an expected sale price per Shipment, which reviewers check against the market; expected profit is derived from these, never entered. The Manager deposit counts toward it, and Investors (and, if needed, the treasury) fund the rest. It is fixed once the Listing is approved.

_Avoid_: shipping budget, total budget (as separate terms; they mean the Funding target).

## Investor share

The % of net profit (profit after the Service fee) that goes to capital, declared by the Manager when creating a Listing, together with the Funding target: a whole number from 40% to 95%. The Manager keeps the rest as the Manager share. For example, at 40% the Manager share is 60%, and the 40% pool is divided pro-rata over every Contribution (Investors, the Manager deposit and any treasury money). Investors see it before they invest, and it is fixed once the Listing is approved.

_Avoid_: profit share, investors' cut.

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

The Manager's performance cut of net profit (100 minus the Investor share %), paid only when net profit is above zero. Separate from the profit the Manager earns on their Manager deposit as a Contribution.

## Service fee

The Platform's charge of 1% of the sale price, taken only on a profitable Listing and never more than the gross profit.

_Avoid_: service charge, platform revenue (that is the account the fee lands in).

## Reserve fund

A Platform money pot kept apart from the treasury. It receives whatever is left of the treasury's profit on a Shareholder Listing after the Shareholder share is paid (25% by default). It can never go negative, and only the owner moves money out of it, at their discretion.

_Avoid_: reserve, reserves (as a loose name for the treasury).

## Wallet

A user's balance on Shehnat in US dollars. It is funded through the payment gateway, and only an approved Investor or Manager can top it up. Investors invest from it, Managers pay their Manager deposit from it, and withdrawals leave from it.

## Blocked country

A country on the configurable blocked list. People and businesses living or registered there cannot take part, and Listings and bank payouts cannot involve it. A user's country is checked when they submit, when they are approved, and again on every top-up, investment, deposit and withdrawal. Nationality is not checked. A Contribution already in a Live Listing when its owner is suspended or blocked stays in and shares the result, but the payout is held in their Wallet until compliance clears it.

## Cycle

The planned length of a Listing from full funding to the last Shipment's Goods sold: the latest Shipment's planned start plus its planned Step durations. It is derived from the Step plan, never entered. A Listing past its Cycle is Late.

## Late

A Listing past its Cycle, or a Step past its planned duration. It is flagged to staff, and Investors see the revised expected date. Nothing happens automatically and nobody is penalised.

## Overdue

A Listing that has been live for 5 days or more at Stage 0 without being fully funded. Staff may fill the remainder from the treasury or leave it open. There is no upper time limit and nothing is cancelled automatically.

## Top-up

Money added to a Wallet through a payment gateway payment that the user starts for a stated USD amount. The gateway's signed confirmation credits exactly that amount, once per payment. The user always receives the full amount, and the gateway's fee is the Platform's cost.

## Withdrawal

A request to move money out of a Wallet. The amount is held at once. Finance, or the owner for USD 10,000 and above, approves it, and only then is it paid out through the payment gateway. If the payout fails, the held money returns to the Wallet automatically and the user is told, and they can request again.

## Settlement

The final step of a Listing: the sale is recorded and every Contribution is paid out its capital plus or minus its share of the result, in one transaction. Ops can propose it only once every Shipment has reached Goods sold (or been written off) with its Sale proceeds received in escrow and a sale document (invoice or proof of payment). Each Shipment's sale price is the Sale proceeds actually received, and the Listing's sale price is their sum. A different staff member (finance or owner) approves it before any money moves, or sends it back to ops with a reason.

## Cancelled

A Listing ended before any Shipment's goods are purchased, by ops or the owner with a reason. Every Contribution is refunded in full. Once the first Shipment is bought a Listing cannot be cancelled, only settled, even at a loss.

## Rejected

A Listing a reviewer has turned down, with a reason. The Manager can edit and resubmit it, as many times as needed, which returns it to review and clears the reason and assignment. Earlier rejections and their reasons stay in the Listing's history.

## Draft

A Listing the Manager is still preparing: private to them, freely editable or deletable, and unseen by staff until submitted for Listing review.

## Listing review

A reviewer's check of a submitted Listing, ending in approval, rejection, or Revised terms.

## Revised terms

Changes a reviewer makes to a Listing under review (any term, including amounts, the Investor share and the Step plan), sent to the Manager to accept before the Listing can be approved. If the Manager declines, the Listing returns to them to edit and resubmit.

_Avoid_: counter-offer, amendment.

## Withdrawn

A Listing ended before it went Live, with no money moved: by the Manager at any point before Live, or automatically when the Manager leaves Revised terms unanswered or an approved Listing's Manager deposit unpaid for 14 days (a setting). It is final; the Manager lists again from scratch.

_Avoid_: expired, abandoned.

## Shariah compliance

A product requirement: Shehnat must be structured so a Shariah board can certify it. The existing vocabulary (Investor, Manager, Manager share, Service fee) is kept as it is. Until a Shariah board certifies it, Shehnat does not call itself halal or Shariah-compliant anywhere in the product; the "Halal Investments" tagline appears only inside the logo artwork.

_Open question_: the Service fee is charged on sale price, which a Shariah board may challenge.

## Prohibited goods

Goods that may not be listed because they are excluded on Shariah grounds. The list is configurable and shown to Managers when they create a Listing. A reviewer rejects a Listing for such goods, with a reason. The final list comes from the Shariah board.

## Manager negligence

Misconduct or failure of duty by a Manager (for example breach of the agreed terms or mishandling the goods) that makes the Manager personally liable for the resulting loss.

_Open question_: how a finding is made and how the loss is recovered (deferred).

## Manager

A person or business, anywhere, who lists a trade on Shehnat and puts in their own capital. A Manager is either a **Business** or an **Individual trader**. If a Manager is suspended or their country becomes a Blocked country while a Listing is Live, ops takes over their Steps, the Listing runs on (or is Cancelled, if no goods are bought yet), and their payout is held in their Wallet until compliance clears it.

_Avoid_: Company (legacy name in the code, API and database; not a separate concept).

## Exposure limit

The most a single Manager may have at stake on Shehnat at once: the sum of the Funding targets of their Listings in review, approved or Live. A platform-wide default applies (a setting), and the owner can set a different limit for an individual Manager. It is checked when a Listing is submitted and again when it is approved.

## Shareholder

A part-owner of Shehnat (the plan is about 10, each holding 1%), mostly importers. The stake is bought and documented outside the platform. On Shehnat, a Shareholder is an existing approved Investor or Manager account that the owner has marked as a Shareholder. Shehnat does not sell shares or pay dividends. A Shareholder acting as a Manager has the usual Manager benefits and obligations, including paying their own Manager deposit.

_Avoid_: equity investor (clashes with Investor).

## Buyer

The party who buys a Listing's goods, recorded by country. If the Buyer is a Shareholder, staff record which Shareholder during the Listing review. The Manager does not choose this, and the Shareholder does not confirm it.

## Treasury

The Platform's own capital. It can put money into a Listing as the stand-in under a Deposit waiver, to fill the balance of an Overdue Listing, or as an Overrun fill. Each of these is a Contribution that shares profit and loss pro-rata like any other.

## Shareholder Listing

A Listing whose Buyer, or whose Manager, is a Shareholder. The profit on every treasury Contribution on it is split at Settlement: the Shareholder share (75% by default, a setting fixed for the Listing when it is approved) is paid to the Shareholder's Wallet, and the rest goes to the Reserve fund. If the Manager and the Buyer are two different Shareholders, they split the Shareholder share equally. If one Shareholder is both, they receive all of it. A loss on treasury Contributions is borne by the treasury alone: the Shareholder takes none of it, and the Reserve fund is not drawn on automatically. Investors are told that a Listing is a Shareholder Listing (and whether the deposit was waived), but not which Shareholder.

_Avoid_: equity investor listing, related listing.

_Open question_: related-party pricing. A Shareholder-Buyer who pays a low sale price lowers the Investors' profit. The reviewer checks the expected sale price against the market before approval, and the Settlement approver checks the sale document against it, but there is no fixed tolerance yet.

_Open question_: a Shariah board may treat the Shareholder share as a hidden discount to the Buyer on the sale price.

## Step plan

The ordered list of Steps a Shipment goes through (for example Ordering, Advances, Purchase, Payments, Transportation, Clearance, Receipts, Invoicing). It starts from a standard template, the Manager adjusts it when submitting the Listing, and the reviewer approves or edits it as part of the Listing review. Every Shipment in a Listing gets its own copy of the approved plan. It is locked once the Listing is live; later changes are proposed by the Manager or ops, approved by a reviewer (and by finance for any cost change), and recorded in the timeline. A Stage already reached never goes backwards. Each Stage from Goods purchased to Goods sold must have at least one Step tagged with it.

## Step

One unit of work in a Step plan, with an owner, a planned duration, expected costs, an optional Stage tag and required documents. The reviewer decides which documents each Step requires.

## Step owner

The Shehnat user responsible for a Step: the Manager or a named staff member. Outside parties are not owners.

## Counterparty

The outside party involved in a Step (freight forwarder, customs broker, supplier), recorded as plain text. A Counterparty has no login and does not change a Step's status.

## Step cost

A cost attached to a Step, first as an expected amount set in the Step plan, then as an actual amount. Unplanned Step costs can be added during the shipment and need finance approval. Every Step cost is paid by platform ops from the Listing's escrow, with proof attached, and the total paid may not exceed the capital raised. Paid Step costs are deducted from the sale price, together with the cost of goods, to give net profit. Investors see every Step cost, expected and actual.

_Avoid_: expense (implies the Manager pays and is reimbursed).

## Sale proceeds

The money a Buyer pays for a Shipment, paid to Shehnat and credited to the Listing's escrow. A shortfall against the invoice is recorded with a reason. Sale proceeds stay in escrow until Settlement, except that finance may approve using them to pay a later Shipment's costs instead of an Overrun fill.

_Avoid_: revenue, sale price (that is the figure Settlement uses, equal to the proceeds received).

## Overrun fill

A treasury Contribution that covers actual costs (cost of goods plus Step costs) beyond the capital raised and any Sale proceeds finance allows to be used, requested by ops with proof and approved by finance or the owner, with no cap. Like any Contribution it shares profit and loss pro-rata, so it dilutes the other Contributions' slices.

_Avoid_: top-up (that is a Wallet payment), extra funding.

## Step state

Where a Step is in its life: planned, in progress, done, verified, plus blocked and skipped (skipping needs a reason and a reviewer's approval; a skipped Step counts as done for its Stage tag, and its planned cost is not paid). A Step cannot be done until its required documents are uploaded, and Steps that need verification (payment, customs, sale) must be verified by ops (the same ops user who marked it done may verify it). A Step past its planned duration is Late.

## Stage

The fixed milestone sequence (Funding open to Profit paid out) that investors see. A Shipment's Stage is driven by its Steps: a Step may carry a Stage tag, and the Shipment reaches a Stage when every Step tagged with that Stage or an earlier one is done (and verified, where required). Nobody advances a Stage by hand.

## Timeline

The time-ordered record of a Listing's Step state changes, each with who, when and a note. Everyone with access to the Listing sees the same timeline, including Investors: steps, owners, durations, states, dates, Step costs and sale prices, expected and actual. Investors also see the Listing's figures (expected profit, Manager deposit, Manager share, and the Settlement breakdown with other Investors anonymised). Only uploaded documents are hidden from them. Registration (Investor or Manager) keeps its own separate history of states and attempts, shown as a timeline too.
