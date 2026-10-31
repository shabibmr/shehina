---
status: accepted
---

# Investors see every figure on a Listing

Investors used to be shown less than the Manager: no Manager deposit, expected profit, Manager share or Manager result. We reversed that. Investors now see every Step and its expected and actual costs, expected and actual sale prices, expected profit, the Manager deposit and Manager share, treasury Contributions, and the full Settlement breakdown (with other Investors anonymised). They are also told that a Listing is a Shareholder Listing and whether the deposit was waived, but not which Shareholder. Only uploaded documents stay hidden. The aim is trust: Investors carry the risk, and with costs and sale prices visible, the hidden figures could be worked out anyway.

## Considered options

- **Hide only the Manager's own money** (deposit, Manager share, result). Rejected.
- **Show the uploaded documents too**, with personal data redacted. Rejected: redaction is costly to do and to check.

## Consequences

- This reverses the "investor privacy" rule enforced by `listings.view` and described in `CLAUDE.md` and `PROJECT_CONTEXT.md`. Those stay as they are until the code changes.
- It amends ADR 0001, which kept the Shareholder relationship hidden from Investors.
