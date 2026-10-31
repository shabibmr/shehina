# Mock UI v4: design system

> **PROTOTYPE, throwaway.** This file says how the v4 mock applies the paper-column theme. The visual source is [`design-system/shehnat/MASTER.md`](design-system/shehnat/MASTER.md) and [`design-system/shehnat/tokens.css`](design-system/shehnat/tokens.css). [`docs/design-system.md`](../../docs/design-system.md) is the production spec. It still describes the earlier sand, card, and motion system. Where this mock and that spec disagree, the mock follows paper column. Anything the walkthrough confirms goes back as a proposal, not as an automatic edit.
>
> **One look.** Investor, manager, and staff use the same paper, ink, and green accent. Staff is denser because the window is wider, not because it has a second theme. There is no Glass look and no look picker.
>
> Plan: [`PLAN.md`](PLAN.md) · Tasks: [`TASKS.md`](TASKS.md) (A2 builds these styles, A10 the motion, H1–H3 check them).

## 1. Sources the mock links or ports

Components and icons are written for this mock. `styleguide.css` and `styleguide.js` are not the visual source. The mock adds no colour, size, radius, or timing of its own. Components use semantic and component tokens (`--color-primary`, `--color-muted-foreground`, `--button-height`), never the primitives (`--color-green-800`, `--color-logo-gold`).

| What | Path from `MockUI/v4/` | Rule |
|---|---|---|
| Tokens | `../v4-plan/design-system/shehnat/tokens.css` | Linked first. |
| Rules | `../v4-plan/design-system/shehnat/MASTER.md` | Layout, type, and the six-screen rhythm. This file says which screen uses which rule. |
| Brand | `../../Demo/frontend/brand/` | `mark.svg` in the masthead and as the favicon. `logo-full.png` on splash, sign-in, and P8 only. `app-icon.svg` as the home-screen icon. Gold inside that artwork stays. It is not an interface colour. |
| Fonts | Google Fonts: Newsreader 500/600, IBM Plex Sans 400/500/600, IBM Plex Sans Arabic 400/500/600 | The mock works offline with the system font fallback. Arabic, including titles, uses `--font-arabic`. |

If the mock needs a value the tokens don't have, it is a finding: add it to `design-system/shehnat/tokens.css` and `MASTER.md`, not to `proto.css`. The prototype bar and inspector (§4.3) are exempt, since they are outside the design under test.

## 2. Decisions the mock must show

| Area | In the mock |
|---|---|
| Theme | One light paper-column theme for every role. No look picker, no Glass, no blur, no gradient page. |
| Colour | Paper page `--color-background`. Ink `--color-foreground`. One accent, `--color-primary` (logo green), for the active section, a text link, the focus ring, and the primary button. `--color-logo-gold` is never used in CSS. Photography may be full colour. |
| Surfaces | Reading screens are square and flat: no card shadow, no box around the lead. A section rule is 1px `--color-rule`. List rows use the light hairline `--color-border`. Utility panels (wallet, money, a KPI group) are white, 12px radius, no shadow. Do not put a rounded panel on a reading screen. |
| Money | Realised gain: `--color-gain`, `+`, ▲ and a word. Realised loss: `--color-loss`, `−` (U+2212), ▼ and a word. Projections: ink, no arrow, always "expected". Amounts are integer cents in state and formatted on render. A price is at least 16px. |
| Numbers | Tabular figures; amounts, percentages, container IDs and IBANs isolated left to right (`.num`, `.money`). |
| Type | Newsreader for titles, IBM Plex Sans for body, buttons, tabs, and figures. One `h1` per screen. Body is 17px. Nothing a person must read is under 14px. Inputs are 17px. There is no 12px style. |
| Shape | Reading surfaces and inputs: square. Utility panels and the one primary button: `--radius-panel` (12px). No second radius, no pills on a reading screen. |
| Layout | Mobile first at 360px. Investor and manager: one inset column, max `--column-max` (600px). Staff: the same column below 1024px. From 1024px, a side rail of the same four sections, then list and detail (list 360–420px, detail fills the rest). |
| Direction | Logical properties only. The prototype bar flips `dir="rtl"` to prove it. |
| Touch | Every target at least `--size-hit` (44px). A primary control is `--size-control` (48px). At least 8px between targets. |
| Buttons | One primary button on the action bar (solid green, 48px, white label). At most one secondary beside it. Rejecting, declining, and sending back use the danger treatment (loss-coloured text and border, never a filled red button). On S4, for example: Approve is primary, Revised terms secondary, Reject danger. |
| Lead | A listing lead is one photograph, full bleed, radius 0. If there is no photograph, the lead is one opaque green field with the name in white serif. No door-colour hash and no goods-colour set. |
| Investor view | Every Listing figure is visible to investors (ADR 0004), including on I5 and I10. |
| Halal claim | Only inside the logo artwork. No "halal" or "Shariah-compliant" copy anywhere in the mock. |

## 3. Navigation per role

The mode bar has four sections and only sections. It is opaque paper, 56px plus the safe area, with a 1px ink rule on the top. The active item is green icon and green label. Inactive items are ink. Labels are always shown. There is no pill and no badge.

| Role | Phone mode bar | ≥ 1024px |
|---|---|---|
| Visitor | none: splash → welcome → sign in or create account | same, centred at 600px |
| Investor | Home · Shipments · Wallet · You | same, centred at 600px |
| Manager | Home · Listings · Wallet · You | same, centred at 600px |
| Staff | Queue · Listings · Money · You | The same four items move into a side rail. No fifth item. |

An account is either an investor or a manager (BR §2), so there is no combined mode bar.

A task screen removes the mode bar and shows one action bar in its place. Never both. Task screens are I6, I7, I12, I13, the shared withdraw on M13, M10, and the submit step of M5. Leaving the task brings the mode bar back.

Where each screen lives:

| Section | Screens |
|---|---|
| Investor: Home | I1. From a listing: I8 portfolio, I9 track, I10 settlement statement |
| Investor: Shipments | I4, I5. I6 and I7 are the task, so the mode bar is gone there |
| Investor and manager: Wallet | I11. I12–I14 are tasks or status pushed from the wallet |
| Investor and manager: You | P6, P7, P8, and I2–I3 or M1–M2 |
| Manager: Home | M3, and from its actions due M11 |
| Manager: Listings | M4–M9, M12. M5's submit step and M10 are tasks |
| Staff: Queue | S1, S2–S6, S9, S10 |
| Staff: Listings | S7, S8 |
| Staff: Money | S11 |
| Staff: You | P6, P7. Owner also reaches S12–S17 from here. Other roles reach S14 read only from here |

- Masthead: 56px plus the top safe area, opaque paper, 1px ink rule on the bottom. Start side: the mark at 24px. End side: Search, 44×44px, labelled "Search". No wordmark, no wallet pill, no account icon, no bell. Search is not a fifth section.
- Home does not replace the masthead with a greeting. The `h1` is the lead listing's name, or the screen title on other section screens.
- On a pushed screen, Back (44×44, labelled "Back") replaces the mark. The Maker screen (a manager, opened from a listing) uses Back, a centred name, then a 1px ink rule, then listing rows.
- P6 opens from You. It is not a masthead control.
- The mode bar is not hard-coded to the bottom edge. From 1024px the staff rail is the same four items moved to the side. Do not draw a bar and a rail together.
- Back plays the return move in §5.

## 4. Component inventory

### 4.1 Shared

| Component | Used on |
|---|---|
| Button (primary, secondary, danger, disabled). Pressed state changes colour only, no scale | every action bar, and a text link in the column where a button would be a second primary |
| Input, select, amount input (17px text, square, `$` prefix, minimum and "max 2 decimals" helper) | P3–P5, I2, I6, I12, I13, M1, M5, M6, S5, S11, S15 |
| Listing row (serif title, 14px meta, optional 56px image, row is the hit target, hairline inset with the column) | I1 next row, I4, I8, M4, S7 |
| Status word (14px, the status name, not a pill). On a reading screen it sits in the row. Inside a utility panel it may sit on its status background | lists and detail headers |
| Banner (info, warning, loss). Tinted background, bold lead sentence, the status word | KYC and registration gates, Revised terms, Overdue, Late, suspension, held payout |
| Money figure (hero 44px, a row price at least 16px, muted 14px "what and when" line). No count-up | I10, I11, M3, M10, S1, S10, S11 |
| Funding bar (`role="progressbar"`, green fill on the sunken track, no glint) | I5, M8, S6, S8 |
| Route, static (travelled part green, the rest hairline, no gold marker, no draw) | I5, I9, M8, S8. A stage list is enough when the route does not fit |
| Bottom sheet (`role="dialog"`, focus trap, Esc and scrim close). Flat ink scrim at 48%, no blur | short confirmations that are not already a task screen |
| Toast (above the bar, 2.4s) | after a non-money action. Never the only record of money |
| Skeleton (content-shaped, opacity pulse, still under reduced motion) | first paint of every screen |
| Empty state (one sentence, one action, no illustration collage) | every list |

### 4.2 New for the mock

| Component | Spec | Used on |
|---|---|---|
| **Lead** | One full-bleed image under the masthead, radius 0, no stroke. Headline on paper under the image. No photograph: one green field, white serif name. The next row stays fully above the bar | I1, and the header of I5 and M8 |
| **Utility panel** | White, 12px radius, 16px padding, no shadow. Stacks with 12px between panels. The last row sits inside the panel and above the bar | I11, M3 exposure, S1 figures, S11 |
| **More status words** | Withdrawn and Cancelled: muted text. Completed: ink plus a done icon. Overdue uses the warning colour. Each is the word, at 14px | lists and detail headers |
| **Success banner** | `--color-primary-subtle` background, a 4px start-side rule in `--color-primary`, a bold lead sentence, `role="status"`. Not `--color-gain`, which is kept for money results | I3 and M2 approved, settlement completed (S10), a withdrawal paid (I14) |
| **List row** | 72px when it has two lines, title 22px Newsreader, meta 14px, end slot for an amount or status word, chevron that mirrors, hairline divider | I3, I8, I11, I14, M4, S2, S6, S7, S11–S16 |
| **Segmented tabs** | In the column, not a second bar. Square, 44px, active face white with a 1px rule. No spring | I5 (4 tabs), I8, M8, S7, S11 |
| **Wizard stepper** | Numbered dots joined by a line. Done and current use `--color-primary`. Next uses `--color-input`. "Step 2 of 5" text beside it for screen readers. No spring | I2, M1, M5 |
| **Upload tile** | Square dashed `--color-input` box, 88px, "Choose file", then the file name, type and size with a remove button. Stores metadata only | I2, M1, M11, S8 |
| **Diff row** (Revised terms) | Label, old value struck through in muted text, arrow (mirrors), new value in ink on `--color-primary-subtle` | M9, S5 |
| **Step board** | The one staff surface that is not a single column. One column per state (To do · In progress · Done · Verified · Blocked · Skipped). Steps that need no verification (BR §5.4 step 8) go from Done straight to counting for their Stage. Cards are square, white, hairline, with Step name, owner, cost and document count. No door colour. A move between columns fades (§5). Horizontal scroll on phones; columns side by side from 1024px | S8 (read-only summary on I9 and M8 may be a stage list instead) |
| **KPI line** | 14px label, figure at least 16px, tabular. Not a 12px overline and not a tile grid | S1, M3, S11, inside a utility panel |
| **Data table** (≥ 1024px only) | Header row sunken, 48px rows, numbers end-aligned and tabular, sticky header, row is a link to the detail. Below 1024px the same data is list rows | S2, S7, S11, S14, S16, S17 |
| **Timeline** | Vertical line with dots, each entry: time (simulated clock), actor, action, reason | I3, M2, M8, S3, S4, S16 |
| **Statement block** | Two-column rows of label and amount, totals with a top rule, the final line at least 22px with gain or loss styling | I10, S10 |
| **Action bar** | Opaque paper, same height and safe area as the mode bar, 1px ink rule on top. One primary, at most one secondary, 8px apart. The primary label names the verb and the object ("Confirm investment") | task screens in §3 |
| **Confirm-with-reason sheet** | Sheet with a summary, a required reason field for rejects and Revised terms, and one action button naming the action | S3, S4, S5, S9, S10, S14 |
| **Mock gateway sheet** | A neutral third-party-looking checkout: grey header "Secure payment", no Shehnat green, amount, card field placeholder, "Pay" and "Fail" | I12, M10 |
| **Phone frame** | Prototype only: a 390 × 844 frame centred on a neutral ground, toggled from the prototype bar | the whole mock at ≥ 768px |

### 4.3 Prototype controls (outside the design under test)

The prototype bar and state inspector must never be mistaken for product UI:

- Ink background, monospace labels, a "PROTOTYPE" tag, pinned to the top edge above the masthead.
- No brand green as decoration, no product motion. Plain 120ms fades only.
- The inspector is a drawer from the end side, 360px wide (full width on phones), with JSON-ish rows: current entity, balances, ledger check (✓ or ✗ with the difference), last 10 audit entries.

## 5. Motion

Motion explains a change of place. It is not a catalogue.

| Where | What plays |
|---|---|
| Tab and section changes | 160ms fade. No slide |
| Push to a detail | 160ms fade |
| Back | The screen follows the finger up to 16px, then finishes. Reduced motion fades |
| Opening and closing a sheet | The sheet follows the finger. The scrim fades. No bounce |
| Press | The control's pressed colour, within 100ms. No scale and no layout shift |
| Step board (S8) | The card fades into the new column. No spring |
| Skeleton | Opacity pulse. Reduced motion shows still blocks |

Do not play a count-up, a sprout, a door swing, a drawing route, a list cascade, a tab pill, a glint, or a spring. One still lead on Home is the only hero.

Reduced motion, from the system or forced from the prototype bar, is a 120ms fade. Movement distance becomes 0. A tap during a transition jumps that transition to its end. Figures are final on the first frame.

Animate `transform` and `opacity` only. Nothing waits for motion.

## 6. States every screen needs

| State | Look |
|---|---|
| Loading | Skeleton shaped like the content for a simulated 400ms. No spinner in place of content |
| Empty | One sentence about what will appear, and one action |
| Error | Loss banner with a bold lead sentence and a "Try again" button. Field errors sit under the field, start with the word "Error", and are linked with `aria-describedby` |
| Blocked by a gate | Info banner saying what is missing (KYC, registration, suspension) and one action to fix it. On Home the banner sits above the lead |
| Not allowed (permissions, four-eyes) | The action is replaced by a muted line with the reason ("Needs another staff member to approve"), never a disabled button with no explanation |
| Success | The task screen shows the result, or a success banner (§4.2) where a status changes for good. A toast may repeat a non-money change. No sprout |

## 7. Accessibility checks (part of H3)

- Contrast: body and meta on paper `#F7F6F3` and on white panels meet 4.5:1. Large titles may meet 3:1. Do not put text on gold. White text only on the green lead field or the primary button. The pairs are recorded in `MASTER.md`.
- Keyboard: tab through every screen with a visible 2px `--color-ring` at a 2px offset. Sheets trap focus and return it on close. Esc closes sheets and the inspector.
- Screen readers: one `h1` per screen, landmarks (`header`, `nav`, `main`), `aria-live="polite"` on the toast layer, money changes announced with the final value, progress bars with values, icon-only buttons with `aria-label`. A decorative icon next to a visible label is hidden.
- Colour is never the only signal: every status and money figure has a word or a sign.
- Type grows by wrapping. Tab labels do not grow with the body. Do not disable zoom.
- Widths: 320, 360, 768, 1024 and 1440px with no horizontal scroll, in both directions. The last row sits above the bar.

## 8. What the mock should teach the design system

Record these in `FINDINGS.md` during task I1:

- Which of the new components in §4.2 earned a place in `MASTER.md`.
- Any token that was missing.
- Whether one lead on Home is enough to find a listing, or whether people look for a catalog.
- Whether Search in the masthead, with notifications under You, is findable.
- Whether the wallet panels read as the same system as Home.
- Whether the S8 step board still feels like one theme.
- Staff density at 1024px and 1440px with a four-item rail.
- Whether square reading screens and 12px utility panels stay distinct when a screen mixes a statement and a panel.
