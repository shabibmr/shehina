# Mock UI v4: design system

> **PROTOTYPE, throwaway.** This file says how the v4 mock applies the Shehnat design system. The canonical spec is [`docs/design-system.md`](../../docs/design-system.md) (ADR 0005). Where the two disagree, the spec wins. Anything the mock invents here and the walkthrough confirms goes back into the spec.
>
> **Two looks.** Investor and manager screens use the **Glass** look, taken from Variant E of `MockUI/v4/manager-dashboard.prototype.html` (§2.1). Staff screens keep the **flat console** look the spec describes (§2.2). Glass is a mock-only experiment until the walkthrough confirms it (§8); it is not yet in `docs/design-system.md`.
>
> Plan: [`PLAN.md`](PLAN.md) · Tasks: [`TASKS.md`](TASKS.md) (A2 builds these styles, A10 the motion, H1–H3 check them).

## 1. Sources the mock links or ports

Tokens and brand files are linked in place. Components, motion and icons are ported (copied and adapted), because `styleguide.js` is an ES module and won't load from `file://` next to classic scripts.

| What | Path from `MockUI/v4/` | Rule |
|---|---|---|
| Tokens | `../../Demo/frontend/tokens.css` | Linked first. The mock adds no colour, size, radius, shadow or timing of its own. Components use semantic tokens only (`--action`, `--text-muted`, …), never the primitives (`--green-800`, `--stone-500`, …). The Glass look needs values the tokens lack; they are listed in §2.1 as proposed tokens, to be added to `tokens.css` (not `proto.css`) before A2 builds the styles. Variant E uses the primitives and raw `rgb()` values directly; the mock must not copy that. |
| Reference components | `../../Demo/frontend/styleguide.css` | Ported into `proto.css` (button, input, amount input, card, chip, banner, money, shipment card, funding bar, route, sheet, toast, skeleton, empty state, tab bar). |
| Motion | `../../Demo/frontend/styleguide.js` | `bezier()`, `curve()`, `countUp`, `sprout`, `route`, `openDoor`, `cascade`, `fill`, tab pill and toast are ported into `motion.js`. |
| Icons | the `ICONS` map in `styleguide.js` | Copied into `ui.js` as inline SVG. New icons are drawn in the same duotone style. |
| Brand | `../../Demo/frontend/brand/` | `mark.svg` in the header and as the favicon, `logo-full.png` on splash, sign-in and P8 only, `app-icon.svg` as the home-screen icon. |
| Fonts | Google Fonts: IBM Plex Sans 400/500/600/700, IBM Plex Sans Arabic | The mock works offline with the system font fallback. |

If the mock needs a value the tokens don't have, it is a finding: add it to `tokens.css` and the spec, not to `proto.css`. The prototype bar and inspector (§4.3) are exempt, since they are outside the design under test.

## 2. Decisions the mock must show

| Area | In the mock |
|---|---|
| Theme | One light Shehnat theme in two looks, no look picker: **Glass** for investor and manager, **flat console** for staff (§2.1, §2.2). The look follows the role and is not switchable. |
| Colour | Green `--action` for every link and focus ring, and for the primary action on flat screens. Gold `--accent` only as decoration (icon second layer, vessel, sprout leaves, glint) and, in Glass, as the gold end of decorative gradients (§2.1). Gold text only as `--text-accent` on light or `--text-accent-on-brand` on green. |
| Surfaces | Flat (staff, and any screen outside Glass): sand page, white cards with a 1px `--border`, green `--surface-brand` panels for the wallet and payout hero, shadows only on sheets, dialogs and toasts. Glass (investor, manager): green gradient page with translucent blurred cards (§2.1). |
| Money | Realised gain: `--gain`, `+`, ▲ and a word. Realised loss: `--loss`, `−` (U+2212), ▼ and a word. Projections: ink, no arrow, always "expected". Amounts are integer cents in state and formatted on render. |
| Numbers | Tabular figures; amounts, percentages, container IDs and IBANs isolated left to right (`.num`, `.money`). |
| Type | One `h1` per screen; sizes only from `--fs-*`; inputs at 16px or more. On a Glass Home the `h1` is the greeting name (visually "Good morning, Sara"); on every other screen it is the screen title. |
| Shape | Flat: `--r-md` cards and inputs, `--r-btn` buttons, `--r-lg` sheet tops, `--r-pill` chips only. Glass: `--r-lg` glass cards and tiles, `--r-pill` for chips, the glass nav, the gradient primary button and chart bars; inputs stay `--r-md`. |
| Layout | Mobile first at 360px. Investor and manager: one column, max `--w-content` (600px). Staff: one column of cards below 600px, a two-column card grid with the bottom tab bar from 600 to 1023px, and the sidebar plus list and detail (list 360–420px, detail fills the rest, max `--w-console`) from 1024px. |
| Direction | Logical properties only. The prototype bar flips `dir="rtl"` to prove it. |
| Touch | Every target at least `--tap` (44px). Primary action in the bottom half of the screen. |
| Buttons | One primary button per screen (solid green on flat screens; the gold-to-green gradient pill on Glass, §2.1); other actions are secondary or ghost. Rejecting, declining and sending back use the danger button (red text and border, never a red fill). On S4, for example: Approve is primary, Revised terms secondary, Reject danger. |
| Doors | Each Listing's door colour comes from a stable hash of its ID (the six `--door-*` tokens). Every category (Food, Building, Textiles, Energy, Other) has a goods icon; the missing ones (Building, Energy, Other) are drawn in the same duotone style. |
| Investor view | Every Listing figure is visible to investors (ADR 0004). |
| Halal claim | Only inside the logo artwork. No "halal" or "Shariah-compliant" copy anywhere in the mock. |

### 2.1 Glass look (investor and manager)

Source: Variant E, "Glass" (`manager-dashboard.prototype.html`, `VariantE` and the `E: GLASS` CSS block). It applies to every investor and manager screen, including forms, wizards and sheets' host screens. Sheets, toasts and the mock gateway sheet stay as in the spec.

| Part | Rule |
|---|---|
| Page | A green gradient behind the whole screen: `--green-800` at the top through `--green-700` and `--green-600` to `--green-200` and `--green-100` at the bottom, with a soft gold glow top end-side and a green glow on the start side. It scrolls with the content. |
| Glass card | Translucent white gradient (about 74% to 40%), 1px translucent white border, `--r-lg`, `blur(18px) saturate(1.5)`, soft green shadow and a 1px inset highlight. Replaces the flat card. Text on it is `--text` or `--text-muted`. |
| Dark glass | Translucent white at about 20% to 7% with white text and a stronger border. Only for the one hero per screen (exposure ring on manager Home, wallet and payout on investor screens). |
| Greeting header | Home only: "Good morning," and the first name as the `h1` in white, with the avatar (gold-to-green gradient, white border) and the notification dot (`--loss`) at the end. Other screens use the §3 header. |
| Primary action | One gold-to-green gradient pill, 52px, `--green-950` text, soft shadow, press scale. This is the only gold fill on a control. |
| Listing tiles | 148px glass tiles in a horizontal scroller with scroll snap, an initial or goods icon, name, status, amount or result. A tile that needs action gets a 2px inset `--gold-500` ring. Tiles are for Home only; the Listings tab uses the shipment card (§4.1) on glass. |
| Hero ring | 136px progress ring on dark glass, gold-to-green stroke, the percentage inside, three stat rows beside it. |
| Data marks | Gold-to-green gradient for bars and rings. A value is never carried by colour alone (rule from §7). |
| Floating nav | Sticky glass pill at the bottom with 4 items, labels always shown, the active item on a white pill. It replaces the flat tab bar on Glass screens and keeps its height, `--tap` targets and safe-area padding. |
| Fallbacks | No `backdrop-filter`: cards become 82% white and dark glass 70% green. `prefers-reduced-transparency`: cards become solid white and dark glass solid `--green-900`. The screen must be complete and readable in both. |

Proposed tokens (add to `tokens.css` and the spec; none exist today):

| Token | Value from Variant E |
|---|---|
| `--glass-bg` / `--glass-bg-dark` | the two translucent white gradients |
| `--glass-border` / `--glass-border-dark` | white at 60% / 38% |
| `--glass-blur` | `blur(18px) saturate(1.5)` |
| `--shadow-glass` | `0 10px 30px` green-950 at 16%, plus the inset highlight |
| `--gradient-page-glass` | the page gradient and two glows |
| `--gradient-gold-green` | gold-300 to green-200, in two directions (fill, and vertical for bars) |
| `--surface-glass-solid` / `--surface-glass-dark-solid` | the reduced-transparency fallbacks |

Variant E hard-codes these values; the mock must reference tokens (§1). Gold stays decorative: the gradient button text is `--green-950`, never gold text.

### 2.2 Flat console (staff)

Staff screens (S1–S17) keep the flat look: sand page, white bordered cards, green `--surface-brand` only for hero panels, `--r-md` cards, solid green primary button, the data table and sidebar from §3 and §4.2. The aim is density and calm for long sessions, so no blur, no gradients and no gold fills. A staff user never sees Glass, and an investor or manager never sees the console.

## 3. Navigation per role

| Role | Phone tab bar (bottom, 64px + safe area) | ≥ 1024px |
|---|---|---|
| Visitor | none: splash → welcome → sign in or create account | same, centred at 600px |
| Investor | Home · Shipments · Wallet · Profile (floating glass nav) | same, centred at 600px |
| Manager | Home · My listings · Wallet · Profile (floating glass nav) | same, centred at 600px |
| Staff | Queue · Listings · Money · Team (owner) or More | 600–1023px: the same tab bar over a two-column card grid. ≥ 1024px: left sidebar (240px) with the same items plus Shareholders, Users, Settings, Audit log, Ledger |

An account is either an investor or a manager (BR §2), so there is no combined tab bar.

Where each screen lives (a guess to test in the walkthrough):

| Tab | Screens |
|---|---|
| Investor: Home | I1, and from it I8 portfolio, I9 track, I10 settlement statement |
| Investor: Shipments | I4, I5, I6, I7 |
| Investor and manager: Wallet | I11–I14 (M13) |
| Investor and manager: Profile | P7, P8, and I2–I3 or M1–M2 |
| Manager: Home | M3, and from its actions due M11 |
| Manager: My listings | M4–M10, M12 |
| Staff: Queue | S1, S2–S5, S6, S9, S10 |
| Staff: Listings | S7, S8 |
| Staff: Money | S11 |
| Staff: Team (owner) | S12, S13, S14, S15, S16, S17 |
| Staff: More (other roles) | Profile, S14 users (read only) |
| Header bell (every signed-in role) | P6 |

- Header: the mark (24px) and "SHEHNAT" on the start side; the wallet pill (investor and manager) and the notifications bell on the end side. The spec puts the account there; the mock uses the bell instead, because the account is already the Profile tab (a hypothesis, PLAN §9). The header respects `env(safe-area-inset-*)`, like the tab bar. On a Glass Home the greeting row (§2.1) replaces this header; the mark and the wallet pill then move into the hero (mark small at the start of the greeting row, wallet as a stat row), and the bell is the avatar's notification dot, opening P6.
- The active tab gets the pill behind its icon (choreography 8). Labels are never hidden. On Glass the active item is a white pill inside the floating nav.
- Back is in the header on every pushed screen; it plays the screen transition in reverse.

## 4. Component inventory

### 4.1 From the spec (port as is)

| Component | Used on |
|---|---|
| Button (primary, secondary, ghost, danger, disabled; press scale) | every screen |
| Input, select, amount input (with `$` prefix, minimum and "max 2 decimals" helper) | P3–P5, I2, I6, I12, I13, M1, M5, M6, S5, S11, S15 |
| Card | every screen |
| Chip (Live, Pending, Late, Rejected, Shareholder Listing, Awaiting, plus Overdue in the warning colour, as the spec's colour table says) | lists and detail headers |
| Banner (info, warning, loss) | KYC and registration gates, Revised terms, Overdue, Late, suspension, held payout |
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
| **More status chips** | Withdrawn and Cancelled: `--surface-sunken` with `--text-muted`, like Pending. Completed: `--surface-brand-subtle` with `--text` and a done icon. Each with its word | lists and detail headers |
| **Success banner** | Like the spec's banners: `--surface-brand-subtle` background, a 4px start-side rule in `--border-brand`, the done icon, a bold lead sentence in `--text`, `role="status"`. Not `--gain`, which is kept for money results | I3 and M2 approved, settlement completed (S10), a withdrawal paid (I14) |
| **List row** | 56px minimum (72px with two lines), start icon or door swatch 40px, title `--fs-18` 600, sub line `--fs-14` muted, end slot for an amount or chip, chevron that mirrors in right to left, 1px `--border` divider | I3, I8, I11, I14, M4, S2, S6, S7, S11–S16 |
| **Segmented tabs** | Sunken track and thumb both `--r-md` (pills stay for chips only), 44px, active thumb white with `--border`; slides with `--ease-spring-soft` | I5 (4 tabs), I8, M8, S7, S11 |
| **Wizard stepper** | A row of numbered dots joined by a line; done = `--action` filled with a tick, current = `--action` ring, next = `--border-input` ring with a `--text-muted` number. "Step 2 of 5" text beside it for screen readers | I2, M1, M5 |
| **Upload tile** | Dashed `--border-input` box, 88px, documents icon, "Choose file" button, then the file name, type and size with a remove button. Simulated: stores metadata only | I2, M1, M11, S8 |
| **Diff row** (Revised terms) | Label, old value struck through in `--text-muted`, arrow (mirrors), new value in `--text` 600 on `--surface-accent-subtle` | M9, S5 |
| **Step board** | One column per state (To do · In progress · Done · Verified · Blocked · Skipped). Steps that need no verification (BR §5.4 step 8) go from Done straight to counting for their Stage; Done cards that need it show "Awaiting verification". Cards are white with `--r-md`, with Step name, owner, cost and document count. Horizontal scroll on phones with scroll snap; columns side by side from 1024px | S8 (and read-only on I9, M8) |
| **KPI tile** | Overline label `--fs-12` caps, figure `--fs-22` 700 tabular, muted delta line | S1, M3, S11 |
| **Data table** (≥ 1024px only) | Header row sunken, 48px rows, numbers end-aligned and tabular, sticky header, row is a link to the detail. Below 1024px the same data renders as list rows | S2, S7, S11, S14, S16, S17 |
| **Timeline** | Vertical line with dots, each entry: time (simulated clock), actor, action, reason | I3, M2, M8, S3, S4, S16 |
| **Statement block** | Two-column rows of label and amount, totals with a top rule, the final line in `--fs-22` with gain or loss styling | I10, S10 |
| **Confirm-with-reason sheet** | Sheet with a summary, a required reason field for rejects and Revised terms, and one action button naming the action: primary for approvals ("Approve listing"), danger for rejects, declines and send-backs ("Reject listing") | S3, S4, S5, S9, S10, S14 |
| **Mock gateway sheet** | A neutral third-party-looking checkout: grey header "Secure payment", no Shehnat green, amount, card field placeholder, "Pay" and "Fail" buttons | I12, M10 |
| **Glass card, dark glass, glass nav** | As §2.1. Glass replaces the flat Card, the Money-figure panel and the tab bar on investor and manager screens. Content, hierarchy and the money rules (§2) do not change. | every investor and manager screen |
| **Hero ring** | §2.1: ring plus three stat rows; "Exposure used" with percentage, "Room left", live count, wallet. The figures carry text, so the ring is decoration with `aria-hidden` and the numbers are real text | M3 (and the investor Home equivalent for invested share, I1) |
| **Gradient button** | §2.1 primary action pill, 52px, press scale, loading and disabled states (disabled: 50% opacity and no shadow, with the reason line from §6) | primary action on every investor and manager screen |
| **Listing tile** | §2.1 horizontal scroller of 148px glass tiles with an action ring | M3, I1 |
| **Gradient bar chart** | 7 bars, rounded, gold-to-green, last bar outlined, week labels below. Bars grow with `transform: scaleY`; the chart has a text summary for screen readers | M3 exposure history |
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
| Wallet balances (I1, I11, M3), KPIs (S1), my payout (I10), the final payout line on S10 (not the statement rows: the spec keeps count-up out of tables and lists) | 4 · money count-up, once per figure per session and again when the value changes (as the spec says) |
| Investment confirmed (I7), Listing live (M10), payout received (I10) | 5 · sprout ceremony (only these three). The spec's second moment is "Listing approved"; the mock uses "Listing live" instead as a hypothesis (PLAN §9). KYC and registration approval get a success banner, and the splash has no sprout. |
| Track (I9), portfolio cards (I8), Listing detail Shipments tab (I5, M8), operations (S8) | 6 · route progress, and the vessel sailing on to a new Stage |
| Every list (I4, I8, M4, S2, S6, S7, S11) and funding bars | 7 · cascade and funding fill |
| Bottom tabs (phones), floating glass nav (investor, manager) and sidebar (staff ≥ 1024px) | 8 · tab bar pill |
| Hero ring (M3, I1) and gradient bars (M3) | 4 · count-up, with the ring's `stroke-dashoffset` fill (`--dur-showpiece`, `--ease-count`) and the bars' `scaleY` rise (`--dur-deliberate`, `--ease-enter`), staged with the cascade |
| Glass cards and Listing tiles on first paint | 7 · cascade (`--stagger`) |
| Toasts for every action, skeletons on every screen's first paint (a simulated 400ms delay), button press | 9 · feedback |
| Step board (S8) | A card moves between columns (a FLIP move, `--dur-slow`, `--ease-standard`); the Stage chip pops when a Stage is reached |
| Segmented tabs, wizard stepper | Thumb slide and dot fill with `--ease-spring-soft`, `--dur-spring` |

Rules carried from the spec:

- Animate `transform` and `opacity` only (plus SVG `stroke-dashoffset` and the glint's `filter`).
- Nothing waits for motion: a tap during a transition jumps it to its end state.
- Figures are correct on the first frame; the count-up only reveals them.
- Reduced motion comes from the system, or is forced from the prototype bar (system / full / reduced). Under reduced motion every choreography shows its end state, with at most a 120ms crossfade.
- The sprout plays only on the three ceremony moments above, so it stays special. The spec's other sprout, pull to refresh (choreography 9), is out of scope: the mock's data is local, so there is nothing to refresh.
- On M3 the ring fill counts as the one showpiece; the bars and tiles run as a cascade, not a second showpiece. Blur and glass opacity are never animated.
- At most one showpiece (count-up, route or sprout) runs at a time; on I10 the sprout plays first and the count-up of "my payout" follows.

## 6. States every screen needs

| State | Look |
|---|---|
| Loading | Skeleton shaped like the content for a simulated 400ms; no spinners for content |
| Empty | Duotone icon, one sentence about what will appear, one action |
| Error | Loss banner with a bold lead sentence and a "Try again" button; field errors under the field, starting with "!", linked with `aria-describedby` |
| Blocked by a gate | Info banner saying what is missing (KYC, registration, suspension) and one action to fix it |
| Not allowed (permissions, four-eyes) | The action is replaced by a muted line with the reason ("Needs another staff member to approve"), never a disabled button with no explanation |
| Success | Toast, plus the sprout on the three ceremony moments, or the success banner (§4.2) where a status changes for good |

## 7. Accessibility checks (part of H3)

- Contrast: every text pair from the semantic tokens is at least 4.5:1 (already verified for the tokens); the mock must not put text on `--accent` or on door colours other than white. On Glass, text sits on a translucent surface over a gradient, so check each text style against the lightest and the darkest background it can land on (page top, page bottom, with and without the blur), and again in the two fallbacks of §2.1. White text only on dark glass or the top of the page; `--text` and `--text-muted` only on glass cards. Anything under 4.5:1 is a finding.
- Keyboard: tab through every screen with a visible 2px `--focus-ring` at a 2px offset; sheets trap focus and return it on close; Esc closes sheets and the inspector.
- Screen readers: `h1` per screen, landmarks (`header`, `nav`, `main`), `aria-live="polite"` on the toast layer, money changes announced in a polite live region with the final value (count-ups carry it in `aria-label`), progress bars with values, icon-only buttons with `aria-label`.
- Colour is never the only signal: every chip and money figure has a word or a sign.
- Widths: 320, 360, 768, 1024 and 1440px with no horizontal scroll, in both directions.

## 8. What the mock should teach the design system

Record these in `FINDINGS.md` during task I1:

- Which of the new components in §4.2 earned a place in the spec.
- Any token that was missing (a value the mock wanted but `tokens.css` lacked).
- Whether the motion felt right at real-screen density, especially the doors on every Listing open and the count-up on the first wallet visit of a session.
- Whether "Listing live" is the right sprout moment for managers (PLAN §9).
- Whether the bell in the header (instead of the account) works, with the account living in the Profile tab (PLAN §9).
- Whether the success banner and the extra status chips earned a place in the spec's banner and chip rules.
- Whether gold-as-decoration held up, or a screen wanted gold text where only `--text-accent` is allowed.
- Staff console density at 1024px and 1440px.
- Whether Glass held up beyond Home: forms, wizards, long lists and the wallet, on a phone and at 600px, and whether it should stay mock-only or go into the spec and ADR 0005.
- Whether the glass tokens of §2.1 are the right set, and whether the gold-to-green gradient button and bars broke the "gold is decoration" rule.
- Contrast and legibility of text on glass over the gradient, and the cost of `backdrop-filter` on low-end phones.
- Whether two looks (Glass and flat console) feel like one brand, and whether investors and managers who also see staff-style screens (statements, tables) notice the break.
