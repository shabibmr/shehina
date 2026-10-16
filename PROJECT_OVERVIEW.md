# Shehna: Project Overview

**Shehna** is an early-stage platform where people anywhere in the world can invest in export shipments and share in the profit when the goods sell. It is operated from the UAE, and every amount on it is in **US dollars (USD)**.

## The idea

A trader wants to export a container of goods, say basmati rice sourced in India and sold to a buyer in Kenya. The trader, called the **manager**, doesn't want to fund the whole shipment alone, so they list it on Shehna and investors put money in. The goods can be sourced anywhere and the buyer can be anywhere, and so can the manager and the investors. When the goods sell, the profit is split between everyone who put in money and the manager who ran the trade.

This works as a **profit-sharing partnership**:

- There is **no fixed interest** and no guaranteed return.
- Investors earn a share of real profit, and **losses are shared** in proportion to what each person put in.

## Who uses it

| Role | What they do |
|---|---|
| **Investors** (anywhere) | Sign up and pass identity checks (a government photo ID and proof of address), browse live shipments, invest from a wallet, track progress, collect payouts and withdraw to their bank. |
| **Managers** (anywhere) | A business or an individual trader. They register with their identity and business documents, list shipments and put in their own deposit (at least 20% of the target). In the code and API this role is still called `company`. |
| **Staff** | An owner, reviewers, operations and finance. They approve investors, managers and listings, confirm deposits, update shipment progress, settle shipments and approve withdrawals. |

## How a shipment works

1. A manager lists a shipment with a funding target, the country the goods come from, the country the buyer is in, a minimum investment, the expected profit and the investors' share of profit.
2. A reviewer approves it.
3. The manager sends its deposit, and finance confirms it arrived in the bank.
4. The listing goes live and investors fund it. If it isn't fully funded after 5 days, operations can fill the gap from the platform's own funds.
5. Operations moves it through the stages: goods bought, loaded at port, at sea, customs cleared, goods sold.
6. **Settlement:** the sale is recorded and every wallet is paid at once, capital plus or minus its share of the result.

**How profit is split:** the platform takes 1% of the sale price, but only if the shipment made a profit. The manager takes the agreed manager share of what's left. The rest is split by how much capital each person put in.

## Main rules built in

- **Investors see less than the manager does.** They never see the manager's capital, deposit, expected profit or manager share.
- **Money is tracked carefully.** Every movement goes through a double-entry ledger and is stored in whole cents (1 USD = 100 cents), so no rounding money is lost. Staff can check the ledger is consistent at any time.
- **Everything is logged.** Every approval, rejection, payout and change records who did it.
- **Large withdrawals need the owner.** Withdrawals of USD 10,000 or more need the owner's approval.
- **Open to the world, with a blocked list.** Anyone in any country can register, except people and businesses in countries on a blocked list (see *Countries and global reach*).

## Countries and global reach

- **Anyone can take part, from any country**, as an investor or as a manager. The platform is operated from the UAE, but nothing is limited to UAE residents, UAE goods or UAE buyers.
- **Goods can be sourced anywhere and sold anywhere.** Each listing records the country the goods are sourced from and the country the buyer is in. They must be real countries, they must differ, and neither can be on the blocked list.
- **Everything is in US dollars.** Wallets, listings, deposits, investments, fees and payouts. Users who hold other currencies convert outside the platform for now.
- **Blocked countries.** A configurable list (setting `BLOCKED_COUNTRIES`; the default `CU,IR,KP,SY` is a placeholder that compliance must replace). People and businesses living or registered there can't register, listings can't involve them, payouts can't go to banks there, and staff can't approve an earlier applicant whose country has since been added. A person from a blocked country who lives elsewhere is accepted, because only residence is checked.
- **Identity documents are country-neutral.** An ID type and number replace the old UAE-only Emirates ID.
- **Country names** are stored as two-letter codes and shown as names with flags (flags don't show on some Windows browsers, so the name is always shown too).

## Business limits

These are enforced by the backend, and requests outside them are refused with an error message. Every USD amount can have at most 2 decimals.

### Investors' share of profit: at least 40%

- Set by the manager on each listing, as a whole number from **40% to 95%**.
- It's the share of **net profit** (after the platform fee) that goes back to everyone who put in capital. The manager keeps the rest as its **manager share** for running the trade.
- Example: at 60%, capital providers share 60% of net profit and the manager share is 40%.
- The 60% is split by capital among **all** capital providers: investors, the manager's own deposit and any platform money. The manager earns both its manager share and a profit share on its own deposit.
- The manager share is only paid when net profit is above zero. There's no manager share on a loss.

### Manager's share of capital: 20–90%

- The manager must fund part of its own shipment, from **20% to 90%** of the target, set per listing as a whole number.
- **Deposit = target × manager share**, rounded to the nearest cent.
- The deposit **counts toward the target**, so investors only fund what's left. For a USD 500,000 target at 20%, the manager puts in USD 100,000 and investors fund USD 400,000.
- The manager sends the deposit by bank transfer, in US dollars. The listing only goes live after finance confirms it arrived and enters the bank reference.

### Shipment cycle: 1–365 days

- The expected time from funding to sale, as a whole number of days.
- It's used to turn the expected return per cycle into an **annual return** shown to investors: annual = cycle return × 365 ÷ cycle days.
- It's an estimate only. Nothing stops a shipment from finishing early or late.

### Funding target: USD 1,000 to 10 million

- The total capital the shipment needs, **including** the manager's deposit.
- Investors can invest any amount from the listing's minimum up to what's left to fund. Investing stops once the target is reached.
- Goods can't be bought until the full target is raised, and the cost of goods can't be more than the money raised.

### Document uploads: up to 5 MB

- Each file is at most **5 MB**, and only **PDF, JPEG or PNG** is accepted.
- The server reads the start of the file's contents to check it really is that type, so a renamed program is refused.
- Odd characters are removed from file names. Each file gets a fingerprint (SHA-256) and is saved so only the server account can read it.
- Files are sent as base64 text, which is about a third larger than the file, so a request can be up to 7.5 MB.
- A document can be opened only by the person who uploaded it or by staff, and every view is recorded in the audit log.

### Other limits

| Limit | Value |
|---|---|
| Minimum investment per listing | USD 1 to 1,000,000, and not more than the target |
| Single investment | USD 1 to 10,000,000 |
| Expected profit on a listing | USD 1 to 10,000,000 |
| Listing categories | Food, Building, Textiles, Energy, Other |
| Source and buyer country | Real countries, must be different, and neither can be on the blocked list |
| Platform service charge | 1% of the sale price, only on profitable shipments, never more than the profit |
| Funding overdue | Live 5+ days and not fully funded |
| Withdrawal amount | USD 1 to 10,000,000, to a bank account anywhere in the world (not in a blocked country) |
| Withdrawals needing the owner | USD 10,000 or more |
| Bank-webhook credit | USD 1 to 10,000,000 per event |
| Treasury top-up | USD 1 to 100,000,000 |
| Investor age | 18 or older |
| Password | At least 10 characters, with letters and numbers |
| Failed sign-ins | 5 wrong attempts lock the account for 15 minutes |
| Sign-in lasts | 8 hours (setting `TOKEN_TTL_SEC`) |

## Worked profit examples

All four examples use the same listing:

| Setting | Value |
|---|---|
| Funding target | USD 500,000 |
| Manager's share of capital | 20%, so a USD 100,000 deposit |
| Investors' share of profit | 60%, so the manager share is 40% |
| Expected profit | USD 60,000 |
| Cycle | 60 days |

Two investors fund the rest: **Investor A puts in USD 150,000** and **Investor B puts in USD 250,000**. Example 4 changes this mix.

The results below come from running the platform's own profit code (`settlement.js`) with these numbers.

### What investors see before investing

The listing shows an estimate. It assumes the whole target is spent on goods and they sell for target plus expected profit (USD 560,000):

- profit before fee: USD 60,000
- fee (1% of 560,000): USD 5,600
- net profit: USD 54,400
- capital providers' 60%: USD 32,640
- **estimated return per cycle:** 32,640 ÷ 500,000 = **6.5%**
- **estimated annual return:** 6.528% × 365 ÷ 60 = **39.7%**

These are estimates, not guarantees.

### Example 1: profit (goods bought for USD 500,000, sold for USD 560,000)

| Step | Calculation | USD |
|---|---|---|
| Profit before fee | 560,000 − 500,000 | 60,000 |
| Platform fee | 1% of 560,000 | 5,600 |
| Net profit | 60,000 − 5,600 | 54,400 |
| Manager share | 40% of 54,400 | 21,760 |
| Pool for capital providers | 54,400 − 21,760 | 32,640 |

The pool is split by capital:

| Who | Capital | Share of capital | Profit share | Capital back | Plus manager share | **Total paid** |
|---|---|---|---|---|---|---|
| Manager | 100,000 | 20% | 6,528 | 100,000 | 21,760 | **128,288** |
| Investor A | 150,000 | 30% | 9,792 | 150,000 | — | **159,792** |
| Investor B | 250,000 | 50% | 16,320 | 250,000 | — | **266,320** |
| Platform revenue | — | — | — | — | — | **5,600** |
| **Total** | | | | | | **560,000** |

How the money moves through the shipment's escrow account:

1. Manager deposit USD 100,000 comes in from the bank.
2. Investors move USD 400,000 from their wallets, so escrow holds USD 500,000.
3. The supplier is paid USD 500,000, so escrow is at 0.
4. The buyer pays USD 560,000 into escrow.
5. Settlement pays out exactly USD 560,000, so **escrow ends at zero**.

Each investor earns 6.528% on their capital.

### Example 2: loss (same purchase, sold for only USD 470,000)

| Step | Calculation | USD |
|---|---|---|
| Result | 470,000 − 500,000 | −30,000 |
| Platform fee | No fee on a loss | 0 |
| Manager share | None on a loss | 0 |
| Loss shared by capital | | −30,000 |

| Who | Capital | Share of capital | Share of loss | **Total paid** |
|---|---|---|---|---|
| Manager | 100,000 | 20% | −6,000 | **94,000** |
| Investor A | 150,000 | 30% | −9,000 | **141,000** |
| Investor B | 250,000 | 50% | −15,000 | **235,000** |
| **Total** | | | | **470,000** |

Everyone loses the same 6% of their capital. The manager takes its share of the loss on its deposit and earns nothing for managing.

### Example 3: tiny profit (sold for USD 502,000)

- Profit before fee is USD 2,000.
- 1% of the sale price would be USD 5,020, but the fee **can't be more than the profit**, so it's capped at USD 2,000.
- Net profit is 0, so there's no manager share and nobody gets a profit share.
- Everyone gets their capital back exactly, and the platform keeps the USD 2,000.

### Example 4: platform-funded balance and goods bought for less than raised

Investor B only puts in USD 200,000. After 5 days the listing is overdue, so operations funds the last **USD 50,000 from the platform treasury**. The goods cost **USD 480,000**, which is less than the USD 500,000 raised, and sell for USD 560,000.

| Step | Calculation | USD |
|---|---|---|
| Profit before fee | 560,000 − 480,000 | 80,000 |
| Platform fee | 1% of 560,000 | 5,600 |
| Net profit | | 74,400 |
| Manager share | 40% of 74,400 | 29,760 |
| Pool for capital providers | | 44,640 |

| Who | Capital | Share | Profit share | **Total paid** |
|---|---|---|---|---|
| Manager | 100,000 | 20% | 8,928 | **138,688** (includes 29,760 manager share) |
| Investor A | 150,000 | 30% | 13,392 | **163,392** |
| Investor B | 200,000 | 40% | 17,856 | **217,856** |
| Platform treasury | 50,000 | 10% | 4,464 | **54,464** |
| Platform revenue (fee) | | | | **5,600** |
| **Total** | | | | **580,000** |

- The total is USD 580,000: the USD 20,000 left over after buying the goods plus the USD 560,000 sale.
- Money not spent on goods is simply returned as part of each person's capital.
- Platform capital is paid like investor capital, and its payout goes back to the treasury.

### Rounding rules

- All maths is done in whole cents (1 USD = 100 cents).
- The fee is rounded to the nearest cent, and the manager share is rounded down.
- The pool is split so the parts **always add up exactly**. Leftover single cents go to whoever had the largest fraction cut off.
- No cent is ever created or lost.

## Step-by-step flows

### Investor sign-up and identity checks (KYC)

1. **Register.** The investor gives an email, password and name, and chooses the investor role.
   - The email is stored in lowercase and must not already be in use.
   - The password must be 10+ characters with letters and numbers. It's stored scrambled (scrypt), never as plain text.
2. **Sign in.** This gives them a sign-in token that lasts 8 hours. Five wrong passwords lock the account for 15 minutes.
3. **Upload two documents:** a government photo ID (passport, national ID card, driving licence or residence permit) and proof of address. Each upload is checked as described in *Document uploads* and returns a document number.
4. **Submit the KYC form,** together with the two document numbers:
   - Fields: full name, date of birth, nationality, country of residence, address, city, ID type and number, phone with country code, email, occupation and source of funds (text fields up to 200 characters).
   - The date of birth must be a real date and the investor must be **18 or older**. The phone must be international (a `+` and the country code).
   - The country of residence can't be on the blocked list. Nationality can be any country.
   - They must tick the confirmation box.
   - The documents must be ones they uploaded themselves.
   - The application becomes **pending**.
5. **Review queue.** Staff can see pending applications. The owner or a reviewer can **assign** one to a specific active reviewer. After that, only that reviewer or the owner can decide it.
6. **Decision.** A reviewer or the owner approves or rejects it. **Rejecting requires a reason**, which the investor sees. The decision, who made it and when are saved and written to the audit log.
7. **If rejected,** the investor can fix the form and submit again. It goes back to pending, and the old reason and assignment are cleared. They can't resubmit while it's pending or once it's approved.
8. **Once approved,** the investor can invest and withdraw. Before approval, money can still arrive in their wallet, but they can't invest it or withdraw it.

### Manager registration

It follows the same pattern as investor KYC, with different details. A manager can be a **business** or an **individual trader**, in any country:

1. **Register** with the manager role (called `company` in the API) and sign in.
2. **Choose the type and upload the documents:**
   - Business: registration or trade licence, the owner's photo ID, and a company profile.
   - Individual trader: their own photo ID, proof of address, and a trading profile.
3. **Submit the registration form:**
   - business or trading name, registration number (optional for an individual), state or region (optional)
   - country of registration or residence (can't be on the blocked list), address, city
   - business activities (up to 1,500 characters)
   - years trading and shipments exported so far (whole numbers, 0–100,000)
   - owner's name, nationality, ID type and ID number
   - phone with country code, email and the confirmation tick
4. **Review, assignment, decision and resubmission** work exactly as for investors.
5. **Once approved,** the manager can create listings and withdraw from its wallet. The listing journey then continues as described in *How a shipment works*.

### Withdrawals

1. **Request.** An approved investor or manager asks to withdraw an amount to a bank account anywhere in the world. They give the **bank country, bank name, account holder name and the account** (an IBAN, or an account number) plus the bank's **SWIFT/BIC code**. Staff accounts can't withdraw.
   - Spaces are removed and letters made capital.
   - An IBAN must pass its checksum and match the bank country. The SWIFT/BIC code must also belong to the bank country.
   - The bank country can't be on the blocked list. The account holder should be the user's own name, which finance checks when paying.
2. **Money is held straight away.** In the same step, the amount moves from the wallet to a **withdrawals hold** account.
   - If the wallet doesn't have enough, the request is refused with "Insufficient funds".
   - Held money can't be invested or withdrawn twice.
3. **Finance or the owner reviews** the pending list.
4. **Approve.** The approver makes the bank transfer outside the system and enters its **bank reference**. The money moves from the hold account out to the bank, and the request is marked approved.
   - **USD 10,000 or more can only be approved by the owner**, so large payments get a second pair of eyes.
5. **Decline.** A **reason is required**, the money moves from the hold account back to the wallet, and the request is marked declined.
6. A request can only be decided once. Every request, approval and decline is in the audit log. Users see their own requests and their status.

### Bank webhook (money arriving from the bank)

This is how the bank tells Shehna that a customer has transferred money in, so their wallet can be credited. Today it's a stand-in for the real bank connection.

1. **The call.** The bank sends `POST /webhooks/bank` without signing in. The body is JSON with:
   - `event_id`: the bank's unique number for this transfer
   - `user_id`: whose wallet to credit
   - `amount_usd`: the amount in US dollars
2. **Signature check.** The request must carry an `X-Signature` header.
   - It must equal the HMAC-SHA256 of the **exact raw body**, using the shared secret `BANK_WEBHOOK_SECRET`, written as hex.
   - The server works out the signature itself and compares the two in constant time, so the timing gives away nothing.
   - The body isn't read at all until the signature matches. If it doesn't match, the answer is **403 "Bad signature"**.
   - In production the server won't start unless the secret is at least 32 characters.
3. **Checks.**
   - `event_id` must be 1–100 characters.
   - The user must exist and must not be staff.
   - The amount must be USD 1–10,000,000 with at most 2 decimals.
   - The body must be valid JSON, otherwise the answer is a clear **400** error.
4. **Credit.** The amount moves in the ledger from the outside bank to the user's wallet. It's tied to the event id, so **if the bank sends the same event twice, it's credited only once**. The repeat answers `credited: false`, which also makes replaying a captured request harmless.
5. **Record.** The first credit is written to the audit log as a system action. The answer includes the new wallet balance.

Signing a test call:

```sh
BODY='{"event_id":"TX-1001","user_id":5,"amount_usd":2500}'
SIG=$(node -e "console.log(require('crypto').createHmac('sha256', process.argv[1]).update(process.argv[2]).digest('hex'))" "$BANK_WEBHOOK_SECRET" "$BODY")
curl -X POST http://localhost:8080/webhooks/bank -H "X-Signature: $SIG" -d "$BODY"
```

In development (not production), the wallet screen also has a **sandbox top-up**: `POST /dev/topup` uses the same credit path for the signed-in user.

Still to do for a real bank: work out who paid from a per-user payment reference or virtual account instead of a `user_id` in the message. The wallet screen tells users to quote the reference `SHE-<their id>`.

### Treasury top-ups (platform money in)

The **treasury** is the platform's own money. It's separate from **platform revenue**, which collects fees.

1. **What it's for.** When a listing is overdue, operations or the owner can fund the remaining balance from the treasury. That money earns profit or takes losses like any other capital, and its payout goes back to the treasury at settlement (see Example 4).
2. **Top up.** Finance or the owner records money the platform's owners have paid into its bank account. They enter the amount (USD 1–100,000,000) and the transfer's **bank reference** (required, up to 100 characters).
3. **Ledger.** The amount moves from the outside bank to the treasury. It's tied to the bank reference, so **entering the same reference twice credits only once**, which protects against double entry.
4. **Record.** It's written to the audit log, and the new treasury balance is returned.
5. **Can't go negative.** If the treasury doesn't have enough to fill a listing's balance, funding it is refused with "Insufficient funds" until it's topped up.

## Technical shape

- The backend (`Demo/backend/`) runs on Node.js with **no outside libraries**. It uses Node's built-in web server, SQLite database, encryption and test runner.
- The web app (`Demo/frontend/`) is plain JavaScript with no build step and covers all three roles. The backend serves it, so one process runs everything. It builds its country lists, limits and currency from the backend's public `/meta` endpoint.
- Automated tests run the whole flow end to end, including every way money moves.

## Status

It's a working pilot, not a launched product. According to its README, it still needs:

- licences, exemptions and investor-protection rules for each market it serves, plus the real blocked-country list from compliance
- a real bank connection with a USD escrow account (deposits are currently simulated)
- an identity-check and anti-money-laundering provider, with sanctions screening
- tax handling, and currency conversion for users who hold other currencies
- a production database (PostgreSQL) and secure file storage
- mobile apps
- notifications
- a security review
- legal terms and risk disclosures

The README says not to take real money until the licences and approvals are in place.
