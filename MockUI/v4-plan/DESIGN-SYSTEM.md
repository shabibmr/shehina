# Mock UI v4: design system

> **PROTOTYPE, throwaway.** This file says how the v4 mock applies the Shehnat design system. The canonical spec is [`docs/design-system.md`](../../docs/design-system.md) (ADR 0005). Where the two disagree, the spec wins. Anything the mock invents here and the walkthrough confirms goes back into the spec.
>
> Plan: [`PLAN.md`](PLAN.md) · Tasks: [`TASKS.md`](TASKS.md) (A2 builds these styles, A10 the motion, H1–H3 check them).

## 1. Sources the mock links, never copies

| What | Path from `MockUI/v4/` | Rule |
|---|---|---|
| Tokens | `../../Demo/frontend/tokens.css` | Linked first. The mock adds no colour, size, radius, shadow or timing of its own. |
| Reference components | `../../Demo/frontend/styleguide.css` | Ported into `proto.css` (button, input, amount input, card, chip, banner, money, shipment card, funding bar, route, sheet, toast, skeleton, empty state, tab bar). |
| Motion | `../../Demo/frontend/styleguide.js` | `bezier()`, `curve()`, `countUp`, `sprout`, `route`, `openDoor`, `cascade`, `fill`, tab pill and toast are ported into `motion.js`. |
| Icons | the `ICONS` map in `styleguide.js` | Copied into `ui.js` as inline SVG. New icons are drawn in the same duotone style. |
| Brand | `../../Demo/frontend/brand/` | `mark.svg` in the header, `logo-full.png` on splash and sign-in only, `app-icon.svg` as the favicon. |
| Fonts | Google Fonts: IBM Plex Sans 400/500/600/700, IBM Plex Sans Arabic | The mock works offline with the system font fallback. |

If the mock needs a value the tokens don't have, it is a finding: add it to `tokens.css` and the spec, not to `proto.css`.

## 2. Decisions the mock must show

| Area | In the mock |
|---|---|
| Theme | One light Shehnat theme. No look picker. |
| Colour | Green `--action` for every primary action, link and focus ring. Gold `--accent` only as decoration (icon second layer, vessel, sprout leaves, glint). Gold text only as `--text-accent` on light or `--text-accent-on-brand` on green. |
| Surfaces | Sand page, white cards with a 1px `--border`, green `--surface-brand` panels for the wallet and payout hero. Flat: shadows only on sheets, dialogs and toasts. |
| Money | Realised gain: `--gain`, `+`, ▲ and a word. Realised loss: `--loss`, `−` (U+2212), ▼ and a word. Projections: ink, no arrow, always "expected". Amounts are integer cents in state and formatted on render. |
| Numbers | Tabular figures; amounts, percentages, container IDs and IBANs isolated left to right (`.num`, `.money`). |
| Type | One `h1` per screen; sizes only from `--fs-*`; inputs at 16px or more. |
| Shape | `--r-md` cards and inputs, `--r-btn` buttons, `--r-lg` sheet tops, `--r-pill` chips only. |
| Layout | Mobile first at 360px. Investor and manager: one column, max `--w-content` (600px). Staff: cards on phones, sidebar plus list and detail from 1024px. |
| Direction | Logical properties only. The prototype bar flips `dir="rtl"` to prove it. |
| Touch | Every target at least `--tap` (44px). Primary action in the bottom half of the screen. |
| Investor view | Every Listing figure is visible to investors (ADR 0004). |
| Halal claim | Only inside the logo artwork. No "halal" or "Shariah-compliant" copy anywhere in the mock. |

## 3. Navigation per role

| Role | Phone tab bar (bottom, 64px + safe area) | ≥ 1024px |
|---|---|---|
| Visitor | none: splash → welcome → sign in or create account | same, centred at 600px |
| Investor | Home · Shipments · Wallet · Profile | same, centred at 600px |
| Manager | Home · My listings · Wallet · Profile | same, centred at 600px |
| Investor and manager (one person) | Home · Shipments · My listings · Wallet · Profile | same |
| Staff | Queue · Listings · Money · Team (owner) or More | Left sidebar (240px) with the same items plus Shareholders, Users, Settings, Audit log, Ledger |

- Header: the mark (24px) and "SHEHNAT" on the start side; the wallet pill (investor and manager) and the notifications bell on the end side.
- The active tab gets the pill behind its icon (choreography 8). Labels are never hidden.
- Back is in the header on every pushed screen; it plays the screen transition in reverse.

## 4. Component inventory

### 4.1 From the spec (port as is)

| Component | Used on |
|---|---|
| Button (primary, secondary, ghost, danger, disabled; press scale) | every screen |
| Input, select, amount input (with `$` prefix, minimum and "max 2 decimals" helper) | P3–P5, I2, I6, I12, I13, M1, M5, M6, S5, S11, S15 |
| Card | every screen |
| Chip (Live, Pending, Late, Overdue, Rejected, Awaiting, Shareholder Listing, Withdrawn, Cancelled, Completed) | lists and detail headers |
| Banner (info, warning, loss, success) | KYC and registration gates, Revised terms, Overdue, Late, suspension, held payout |
| Money figure (hero `--fs-44`, key `--fs-34`, with a muted "what and when" line) | I1, I10, I11, M3, M10, S1, S10, S11 |
| Shipment card with door strip, route line, three KPIs, funding bar, footer line | I4, I8, M4, S7 |
| Funding bar (`role="progressbar"`) | cards, I5, M8, S6, S8 |
| Route (curved path, stage dots, gold vessel) | I5, I9, M8, S8 |
| Bottom sheet (`role="dialog"`, focus trap, Esc and scrim close) | every action with input or a confirmation |
| Toast (above the tab bar, 2.4s) | after every action, never the only record of money |
| Skeleton (content-shaped, warm shimmer) | first paint of every screen |
| Empty state (icon, one sentence, one action) | every list |

### 4.2 New for the mock (style from tokens; propose to the spec if they hold up)

| Component | Spec | Used on |
|---|---|---|
| **List row** | 56px minimum (72px with two lines), start icon or door swatch 40px, title `--fs-16` 600, sub line `--fs-14` muted, end slot for an amount or chip, chevron that mirrors in right to left, 1px `--border` divider | I3, I8, I11, I14, M4, S2, S6, S7, S11–S16 |
| **Segmented tabs** | Sunken track, `--r-pill` only for this control's thumb, 44px, active thumb white with `--border`; slides with `--ease-spring-soft` | I5 (4 tabs), I8, M8, S7, S11 |
| **Wizard stepper** | A row of numbered dots joined by a line; done = green filled with a tick, current = green ring, next = stone. "Step 2 of 5" text beside it for screen readers | I2, M1, M5 |
| **Upload tile** | Dashed `--border-input` box, 88px, documents icon, "Choose file" button, then the file name, type and size with a remove button. Simulated: stores metadata only | I2, M1, M11, S8 |
| **Diff row** (Revised terms) | Label, old value struck through in `--text-muted`, arrow (mirrors), new value in `--text` 600 on `--surface-accent-subtle` | M9, S5 |
| **Step board** | One column per state (To do · In progress · Done · Blocked · Skipped). Cards are 8px-radius white, with Step name, owner, cost and document count. Horizontal scroll on phones with scroll snap; columns side by side from 1024px | S8 (and read-only on I9, M8) |
| **KPI tile** | Overline label `--fs-12` caps, figure `--fs-22` 700 tabular, muted delta line | S1, M3, S11 |
| **Data table** (≥ 1024px only) | Header row sunken, 48px rows, numbers end-aligned and tabular, sticky header, row is a link to the detail. Below 1024px the same data renders as list rows | S2, S7, S11, S14, S16, S17 |
| **Timeline** | Vertical line with dots, each entry: time (simulated clock), actor, action, reason | I3, M2, M8, S3, S4, S16 |
| **Statement block** | Two-column rows of label and amount, totals with a top rule, the final line in `--fs-22` with gain or loss styling | I10, S10 |
| **Confirm-with-reason sheet** | Sheet with a summary, a required reason field for rejects and Revised terms, and the primary button naming the action ("Reject listing") | S3, S4, S5, S9, S10, S14 |
| **Mock gateway sheet** | A neutral third-party-looking checkout: grey header "Secure payment", no Shehnat green, amount, card field placeholder, "Pay" and "Fail" buttons | I12, M10 |
| **Phone frame** | Prototype only: a 390 × 844 rounded frame centred on a stone background, toggled from the prototype bar | the whole mock at ≥ 768px |

### 4.3 Prototype controls (outside the design under test)

The prototype bar and state inspector must never be mistaken for product UI:

- Ink background (`--ink-900`), monospace labels, a "PROTOTYPE" tag, pinned to the top edge above the app header.
- No brand green, no motion tokens, no sprout; plain 120ms fades only.
- The inspector is a drawer from the end side, 360px wide (full width on phones), with JSON-ish rows: current entity, balances, ledger check (✓ or ✗ with the difference), last 10 audit entries.

## 5. Motion map

The nine choreographies are specified in the spec's motion chapter, including their beats, timings and reduced-motion fallbacks. The mock places them like this:

| Where | Choreography |
|---|---|
| Every push or pop between screens | 1 · shared-axis screen transition (direction-aware, flips in right to left) |
| Opening a Listing card (I4 → I5, M4 → M8, S7 → S8) | 2 · container doors |
| Invest, top-up, withdraw, pay deposit, every approve or reject with a reason, Step actions | 3 · bottom sheet |
| Wallet balances (I1, I11, M3), KPIs (S1), my payout (I10), settlement totals (S10) | 4 · money count-up |
| Investment confirmed (I7), KYC or registration approved (I3, M2), Listing live (M10), payout received (I10) | 5 · sprout ceremony (only these) |
| Track (I9), Listing detail Shipments tab (I5, M8), operations (S8) | 6 · route progress, and the vessel sailing on to a new Stage |
| Every list (I4, I8, M4, S2, S6, S7, S11) and funding bars | 7 · cascade and funding fill |
| Bottom tabs (phones) and sidebar (staff ≥ 1024px) | 8 · tab bar pill |
| Toasts for every action, skeletons on every screen's first paint (a simulated 400ms delay), button press | 9 · feedback |
| Step board (S8) | A card moves between columns (a FLIP move, `--dur-slow`, `--ease-standard`); the Stage chip pops when a Stage is reached |
| Segmented tabs, wizard stepper | Thumb slide and dot fill with `--ease-spring-soft`, `--dur-spring` |

Rules carried from the spec:

- Animate `transform` and `opacity` only (plus SVG `stroke-dashoffset` and the glint's `filter`).
- Nothing waits for motion: a tap during a transition jumps it to its end state.
- Figures are correct on the first frame; the count-up only reveals them.
- Reduced motion comes from the system, or is forced from the prototype bar (system / full / reduced). Under reduced motion every choreography shows its end state, with at most a 90ms fade.
- The sprout plays only on the four ceremony moments above, so it stays special.

## 6. States every screen needs

| State | Look |
|---|---|
| Loading | Skeleton shaped like the content for a simulated 400ms; no spinners for content |
| Empty | Duotone icon, one sentence about what will appear, one action |
| Error | Loss banner with a bold lead sentence and a "Try again" button; field errors under the field, starting with "!", linked with `aria-describedby` |
| Blocked by a gate | Info banner saying what is missing (KYC, registration, suspension) and one action to fix it |
| Not allowed (permissions, four-eyes) | The action is replaced by a muted line with the reason ("Needs another staff member to approve"), never a disabled button with no explanation |
| Success | Toast, plus the sprout on the four ceremony moments |

## 7. Accessibility checks (part of H3)

- Contrast: every text pair from the semantic tokens is at least 4.5:1 (already verified for the tokens); the mock must not put text on `--accent` or on door colours other than white.
- Keyboard: tab through every screen; sheets trap focus and return it on close; Esc closes sheets and the inspector.
- Screen readers: `h1` per screen, landmarks (`header`, `nav`, `main`), `aria-live="polite"` on the toast layer, progress bars with values, icon-only buttons with `aria-label`.
- Colour is never the only signal: every chip and money figure has a word or a sign.
- Widths: 320, 360, 768, 1024 and 1440px with no horizontal scroll, in both directions.

## 8. What the mock should teach the design system

Record these in `FINDINGS.md` during task I1:

- Which of the new components in §4.2 earned a place in the spec.
- Any token that was missing (a value the mock wanted but `tokens.css` lacked).
- Whether the motion felt right at real-screen density, especially the doors on every Listing open and the count-up on every wallet visit.
- Whether gold-as-decoration held up, or a screen wanted gold text where only `--text-accent` is allowed.
- Staff console density at 1024px and 1440px.
