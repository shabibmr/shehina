# Shehnat design system

Version 0.1 (draft) · 31 Oct 2026

This is the target look and behaviour for the Shehnat web app, for all three roles (investor, manager, staff). The tokens live in [`Demo/frontend/tokens.css`](../Demo/frontend/tokens.css), and the live reference is `Demo/frontend/styleguide.html` (served at `/web/styleguide.html` when the backend runs). The app (`Demo/frontend/styles.css` and the role modules) still uses the three old looks and moves to this system in a separate piece of work.

## Decisions at a glance

| Area | Decision |
|---|---|
| Themes | One Shehnat brand theme. The Container, Majlis and Oasis looks and the look picker go. Light only at launch. |
| Brand colours | Green `#06503A` leads (actions, links, focus). Gold `#B39144` is decoration only. |
| Neutrals | Warm sand page `#F7F4EC`, white cards, warm grey borders. |
| Money | Realised results are coloured, signed and labelled. Projections stay neutral ink and say "expected". |
| Type | IBM Plex Sans, with IBM Plex Sans Arabic for Arabic later. Tabular figures. |
| Layout | Mobile first. Investor and manager screens: one column, max 600px. Staff console: tables, list and detail, sidebar from 1024px. |
| Direction | English only at launch, but every layout must work right to left. |
| Navigation | Bottom tab bar (4 or 5 tabs). The staff console uses a left sidebar from 1024px. |
| Shape | 8px cards and inputs, 10px buttons, pills for chips only. Flat: borders, not shadows. |
| Shipments | Keep the container door, in six brand door colours, with goods icons instead of emoji. |
| Icons | Duotone: green primary layer, gold secondary layer. |
| Motion | Expressive and choreographed, with a full reduced-motion fallback. |
| Halal claim | The "Halal Investments" tagline appears only inside the logo artwork. See **Shariah compliance** in [`GLOSSARY.md`](../GLOSSARY.md). |
| Investor view | Investors see every Listing figure ([ADR 0004](adr/0004-full-transparency-for-investors.md), issue #1). |

The decision to replace the three looks with one brand theme is recorded in [ADR 0005](adr/0005-one-brand-theme.md).

## Principles

1. **Trust before delight.** This is people's money. Every screen answers "what is my money doing?" first. Delight comes after, and never gets in the way of that answer.
2. **Real figures, honestly labelled.** Never make a projection look like a result. "Expected" figures are neutral, results are coloured, and every colour has a word or sign beside it.
3. **Thumb first.** Design at 360px, one hand, outdoors. Primary actions sit in the bottom half of the screen. Touch targets are at least 44px.
4. **Motion explains.** Every animation shows where you came from, what changed, or that money moved. Motion that does none of those is cut.
5. **One brand, everywhere.** Green and gold from the logo, sand from the region, and the container door from the product.

## Brand assets

| Asset | File | Use |
|---|---|---|
| Full logo | `Demo/frontend/brand/logo-full.png` (copy of `docs/assets/SHEHNAT LOGO.png`) | Sign-in, splash, about page: about 160px and up only |
| Mark | `Demo/frontend/brand/mark.svg` | Header, favicon, small sizes (16–96px) |
| App icon | `Demo/frontend/brand/app-icon.svg` | Home-screen icon, reversed out of brand green |
| Horizontal lockup | `Demo/frontend/brand/lockup.svg` | Reference only. In the app, build it in HTML (mark plus the word "SHEHNAT" set in IBM Plex Sans) |

- All the SVGs are **drafts** hand-drawn from the logo. A designer should refine the figures, fix the uneven joints in the original artwork, convert the lockup's wordmark to outlines, and supply a 512px PNG app icon and a `maskable` version.
- Clear space around the mark is at least 25% of its width. Never recolour the mark beyond the two approved versions: green and gold on light, or sand and pale gold on green.
- The full logo carries the "HALAL INVESTMENTS" tagline. Don't repeat that claim anywhere else in the product until a Shariah board has certified it.
- The 468 KB PNG is too heavy to use for anything but the splash. A designer-traced SVG of the full logo replaces it later.

## Colour

Components use **semantic tokens** only (`--action`, `--text-muted`, `--surface-card`, …), never the primitives (`--green-800`, `--sand-100`, …). That lets a dark theme be added later by redefining only the semantic block.

### Roles

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--surface-page` | `#F7F4EC` sand | Page background | — |
| `--surface-card` | `#FFFFFF` | Cards, sheets, inputs | — |
| `--surface-sunken` | `#EFE9DC` | Tracks, skeletons, inactive chips | — |
| `--surface-brand` | `#06503A` | Wallet panel, hero panels, app icon | white text 9.48:1 |
| `--text` | `#14231C` | Body text | 14.85:1 on sand |
| `--text-muted` | `#6B6458` | Secondary text, labels | 5.32:1 on sand |
| `--text-link` / `--action` | `#06503A` | Links, primary buttons, focus ring | 8.62:1 on sand |
| `--text-accent` | `#7E6224` | The only gold allowed as text on light surfaces | 5.22:1 on sand |
| `--text-accent-on-brand` | `#D9C28A` | Gold text on green panels | 5.43:1 on green |
| `--accent` | `#B39144` | Decoration only: icon second layer, highlights, the vessel marker | 2.98:1, never text |
| `--border` | `#E4DDCD` | Card borders and dividers (decorative) | — |
| `--border-input` | `#857B67` | Form control borders (need 3:1) | 4.18:1 on white |

### Money and status

| Meaning | Text | Background | Rule |
|---|---|---|---|
| Realised gain | `--gain` `#2F7D1F` | `--gain-bg` | Always with `+` and ▲, plus a word ("Profit"). The hue is deliberately different from the brand green, so a gain never looks like a button. |
| Realised loss | `--loss` `#B42318` | `--loss-bg` | Always with `−` (U+2212) and ▼, plus a word ("Loss"). |
| Expected (projection) | `--expected` (= `--text`) | none | Always labelled "expected". Never green, never red, and no arrows. |
| Warning (late, overdue) | `--warning` `#93370D` | `--warning-bg` | Banner with a bold lead sentence. |
| Info (in review, awaiting) | `--info` `#1F5E8C` | `--info-bg` | — |

Colour is never the only signal. Every state also has a word, a sign or an icon.

### Container doors

Each Listing gets one of six door colours, picked by a stable hash of its ID: `--door-green`, `--door-gold`, `--door-clay`, `--door-olive`, `--door-teal`, `--door-umber`. White text on each passes at least 4.8:1.

## Typography

- **Family:** `--font-sans` = IBM Plex Sans, with IBM Plex Sans Arabic for Arabic text (`:lang(ar)` switches to `--font-arabic`). Both load from Google Fonts, which the existing CSP already allows.
- **Weights:** 400 body, 500 labels, 600 card titles and buttons, 700 page titles and key figures.
- **Figures:** `font-variant-numeric: tabular-nums lining-nums` on every amount, so columns and counters don't jitter.
- **Numbers in right to left:** amounts, percentages, container IDs and IBANs are always isolated left to right (`direction: ltr; unicode-bidi: isolate`), so "+$1,240.50" never reorders to "$1,240.50+".

| Token | Size | Use |
|---|---|---|
| `--fs-44` | 44px | Hero money figure (wallet balance, settlement payout) |
| `--fs-34` | 34px | Page title, large figures |
| `--fs-28` | 28px | Section title |
| `--fs-22` | 22px | Card title, KPI figures |
| `--fs-18` | 18px | Lead text, list titles |
| `--fs-16` | 16px | Body. Also the minimum for inputs, so iOS doesn't zoom. |
| `--fs-14` | 14px | Secondary text, buttons in dense rows |
| `--fs-12` | 12px | Overlines (caps, `--tracking-caps`), chips, helper text |

Use one `h1` per screen and don't skip heading levels. Overlines are labels, not headings.

## Space, shape and elevation

- **Spacing:** steps of 4px, from `--sp-1` (4) to `--sp-12` (48). Page gutter `--gutter` is 16px. Use no off-scale values.
- **Radius:** `--r-md` 8px for cards, inputs and doors. `--r-btn` 10px for buttons. `--r-lg` 16px for the top corners of sheets and dialogs. `--r-pill` for chips and status pills only. `--r-sm` 4px for code and tiny tags.
- **Elevation:** flat. Cards have a 1px `--border` and no shadow. Shadows only on things that float: sheets (`--shadow-sheet`), dialogs (`--shadow-dialog`), toasts (`--shadow-toast`). The bottom nav uses a 1px top rule.

## Layout

Design at 360px first, and test at 320, 360, 768, 1024 and 1440px.

| Width | Investor and manager | Staff console |
|---|---|---|
| < 600px | One column, 16px gutters, bottom tab bar | Same: one column, cards instead of tables |
| 600–1023px | One column centred at max 600px | Two-column card grid, bottom tab bar |
| ≥ 1024px | One column centred at max 600px | Left sidebar nav (240px), list and detail (list 360–420px, detail fills the rest), tables for queues, ledger and audit log, max 1280px |

- Use logical CSS properties only (`margin-inline-start`, `inset-inline-end`, `padding-block`, …), never `left` or `right`, so right to left works without overrides.
- Directional icons (arrows, chevrons, the route "→") mirror in right to left. Logos, the play icon and numbers don't.
- Respect `env(safe-area-inset-*)` on the header and bottom nav.

## Navigation

- **Phones:** a fixed bottom tab bar of 64px plus the safe area, with 4 or 5 tabs per role. Each tab has a duotone icon and a label (labels are never hidden). Anything else goes under the last tab ("More" or "Profile").
  - Investor: Home · Shipments · Wallet · Profile
  - Manager: Home · My listings · Wallet · Profile
  - Staff: Queue · Listings · Money · Team (owner) or More
- **Staff ≥ 1024px:** the tab bar becomes a left sidebar with the same items plus secondary ones (Audit log, Ledger check, Settings).
- The active tab gets a sand-green pill behind its icon, and its icon turns full duotone. Inactive icons use stone with gold at 40%.
- The header shows the mark (24px) and "SHEHNAT" on the start side, and the wallet pill and account on the end side.

## Components

The reference implementations are in `Demo/frontend/styleguide.css`.

| Component | Rules |
|---|---|
| **Button** | 48px high (44px small). Primary: green fill, white text. Secondary: white with a green border. Ghost: text only. Danger: red text and border, never a red fill. Disabled: sand fill and stone text. One primary button per screen. Press: scale `--press-scale` (0.97) for `--dur-instant`. |
| **Input** | 48px, 16px text, `--border-input`, 8px radius. Focus: green border plus a 3px `--green-100` ring. Errors: red border plus a message below that starts with "!", linked with `aria-describedby`. Labels always visible, never placeholder-only. |
| **Amount input** | 22px semibold, `$` prefix, `inputmode="decimal"`, left to right in every direction. Helper text states the minimum and "max 2 decimals". |
| **Card** | White, 1px border, 8px radius, 16px padding. |
| **Chip** | Pill, 12px semibold. Live (green subtle with a dot), Pending (sunken), Late (warning), Rejected (loss), Shareholder Listing (gold subtle with gold-700 text), Awaiting (info). |
| **Banner** | Tinted background, 4px start-side rule, bold lead sentence, then the detail. Uses `role="status"`. |
| **Money figure** | See Colour → Money. Key figures use `--fs-34` or `--fs-44`. Under every figure, a muted line says what it is and when. |
| **Shipment card** | The door strip (72px; 56px thin in lists; 100px tall on detail screens), then the name, route ("India → Netherlands · 90-day cycle"), three KPIs (expected return, target, minimum), the funding bar, and a line with "% funded · raised of target · days left". |
| **Funding bar** | 8px pill on `--surface-sunken`, green fill, with `role="progressbar"` and `aria-valuenow`. |
| **Route** | A curved path from origin to destination: the travelled part solid green, the rest dotted sand. Stage stops are dots. The vessel is a gold marker at the current stage. It mirrors in right to left, with origin at the reading start. |
| **Bottom sheet** | White, 16px top radius, grab handle, `--shadow-sheet`, over `--scrim`. Use `role="dialog"` and `aria-modal`, trap focus, and close on scrim tap or Esc. |
| **Toast** | Ink background, white text, 8px radius, above the tab bar, `role="status"`, 2.4s. Never the only record of a money action. |
| **Skeleton** | Sand blocks shaped like the content, with a warm shimmer. Never a spinner for content. |
| **Empty state** | Mark or a duotone icon, one sentence about what will appear here, and one action. |

## Icons

- **Grid:** 24 × 24, about a 2px safe margin, filled shapes (no outline style).
- **Duotone:** the primary layer `.i1` is filled with `--icon-1` (green). The secondary layer `.i2` (or `.i2s` for strokes) uses `--icon-2` (gold). Inactive icons use `--icon-1-muted` and `--icon-2-muted`. On doors and green panels, the layers are white and white at 55%.
- The gold layer is an accent. An icon must stay understandable with that layer removed.
- **Set so far:** home, shipments, wallet, invest, profile, alerts, documents, review, done, warning, route, plus goods icons for doors (crate, grain, textiles). Add more goods categories by drawing in the same style.
- Icons are inline SVG paths in the JS modules (no icon library, no npm packages). Decorative icons get `aria-hidden="true"`. Icon-only buttons need `aria-label`.

## Motion

Motion in Shehnat is **expressive and choreographed**. It is a signature of the brand, not decoration, and it follows three laws:

1. **Every animation has a job.** It shows *where you came from* (spatial), *what just changed* (feedback), or *that money moved* (ceremony). An animation with none of those jobs is cut.
2. **Money moments are ceremonies.** Investing, being approved and getting paid out are the emotional peaks of the product. They get the richest motion. Routine screens get quick, quiet motion.
3. **Nothing waits for motion.** Input is never blocked by an animation. A tap during a transition jumps the animation to its end state and handles the tap. The figures are correct on the first frame, and motion only reveals them.

### Tokens

| Duration token | Default | Use |
|---|---|---|
| `--dur-instant` | 90ms | Press feedback, toggles, checkbox ticks |
| `--dur-fast` | 160ms | Hover, small fades, scrim in, tab icon swap, the door label fading |
| `--dur-base` | 260ms | Screen transitions, sheet dismiss, toast exit |
| `--dur-slow` | 420ms | Door leaves swinging, shared-element moves, list items rising |
| `--dur-deliberate` | 700ms | Funding bar fill, progress bars, door interior light |
| `--dur-showpiece` | 1400ms | Money count-up, route drawing |
| `--dur-ceremony` | 2200ms | The full sprout sequence on success screens |
| `--dur-spring` | 640ms | Any spring: sheets, chips popping, tab pill, toasts |
| `--stagger` | 45ms | Delay between items in a cascade |
| `--stagger-max` | 360ms | The cap on total stagger, so long lists never wait |

| Easing token | Curve | Use |
|---|---|---|
| `--ease-standard` | `cubic-bezier(.2,0,0,1)` | Anything moving on screen from A to B |
| `--ease-enter` | `cubic-bezier(.05,.7,.1,1)` | Things arriving: fast start, long gentle settle |
| `--ease-exit` | `cubic-bezier(.3,0,.8,.15)` | Things leaving: they accelerate away and don't linger |
| `--ease-count` | `cubic-bezier(.16,1,.3,1)` | Number count-up: most of the climb happens early, then the last digits settle |
| `--ease-grow` | `cubic-bezier(.34,1.3,.64,1)` | Organic growth (leaves, stems) with a slight overshoot |
| `--ease-spring` | `linear(…)` bouncy spring, about 16% overshoot | Sheets, the tab pill, success pops |
| `--ease-spring-soft` | `linear(…)` soft spring, about 2.5% overshoot | Toasts, chips, door leaves closing |

Distances: `--move-screen` 24% (screen slide), `--move-small` 8px (items rising, toasts), `--press-scale` 0.97. Browsers without `linear()` fall back to a `cubic-bezier` overshoot (see the `@supports` block in `tokens.css`).

Animate `transform` and `opacity` only, except SVG `stroke-dashoffset` for drawing lines and `filter: brightness()` for the gold glint. Never animate layout properties (width, height, top, margin).

### Choreography catalogue

Each entry gives the trigger, the beats with their timings, and the reduced-motion fallback. The styleguide's motion lab plays every one.

#### 1. Screen transitions (shared horizontal axis)

- **Trigger:** moving between screens. Forward is drilling in; back is returning.
- **Forward:** the outgoing screen fades out and recedes 8% towards the reading start over `--dur-base × 0.6`, with `--ease-exit`. The incoming screen starts at `--move-screen` (24%) towards the reading end with opacity 0. After a quarter of `--dur-base` it slides home and fades in over `--dur-base`, with `--ease-enter`.
- **Back:** the same with the directions reversed.
- **Right to left:** all directions flip (multiply x by −1).
- **Tab switches** use no slide: a 160ms crossfade, because tabs are peers, not depth.
- **Reduced:** a 120ms crossfade, with no movement.

#### 2. Container doors: opening a shipment (signature)

- **Trigger:** tapping a shipment card.
- **Beat 1 (0–160ms):** the door label (goods icon and container ID) fades out with `--ease-exit`.
- **Beat 2 (100–520ms):** the two door leaves swing outward in 3D (`perspective: 600px`). The leaf on the reading-start side rotates −105° about its outer hinge, and the other leaf rotates +105°, 40ms later. Duration `--dur-slow`, `--ease-standard`.
- **Beat 3 (160–860ms):** the interior, deep green with a pale-gold radial light, brightens from 50% to 120% (`--dur-deliberate`, `--ease-enter`), as if light spills out of the container.
- **Beat 4 (in the app):** the door strip becomes the header of the detail screen. It grows from the card's height (72px) to the tall door (100px) as a shared element, and the detail content rises in with the list cascade (see 7).
- **Closing (back):** the leaves swing shut with `--ease-spring-soft` over `--dur-spring`, which gives a soft "thunk". The label fades back in once they are closed.
- **Reduced:** the leaves and label crossfade (120ms), with no 3D.

#### 3. Bottom sheet

- **Open:** the scrim fades in over `--dur-fast`. The sheet rises from 100% to 0 with `--ease-spring` over `--dur-spring`, overshooting about 16% and settling. Focus moves to the sheet's first control.
- **Close:** the sheet drops to 100% over `--dur-base × 0.8` with `--ease-exit`, and the scrim fades out over `--dur-base`.
- **Drag to dismiss:** the sheet follows the finger 1:1. If released past 30% of its height, or faster than 0.5px/ms, it closes; otherwise it springs back with `--ease-spring-soft`.
- **Reduced:** a 120ms fade, with no movement.

#### 4. Money count-up

- **Where:** wallet balance, settlement payout, the investor's "my return" on completed Listings, and KPI tiles on dashboards. Not in tables or lists.
- **When:** once per figure per session, the first time it enters the viewport (at 50% visible), and again only when the value changes.
- **How:** the figure counts from 0 (or from the previous value when it changes) to its value over `--dur-showpiece` with `--ease-count`, so about 75% of the climb happens in the first 20% of the time. Every frame shows a correctly formatted amount, rounded to cents. Tabular figures keep the width steady.
- **Landing:** when the count lands, the related chip (for example "▲ +$1,240.50 realised") pops in from 60% scale with `--ease-spring-soft`.
- **On change:** if a balance goes down (withdrawal, investment), it counts down over `--dur-deliberate`, with no chip.
- **Accessibility:** the element carries the final value for screen readers (`aria-label`), and only the visible text animates. Screen readers never hear intermediate numbers.
- **Reduced:** the final value appears at once.

#### 5. The sprout (success ceremony)

- **Where:** only three moments: investment confirmed, Listing approved (manager), and settlement payout received. Nowhere else, so it keeps its meaning.
- **Total:** `--dur-ceremony` (2.2s), in five beats.
  1. **The ring joins (0–800ms):** the five people of the mark appear one by one, bottom first and then outward in alternation, 90ms apart. Each scales from 20% to 100% with `--ease-spring`.
  2. **The stem rises (450–1050ms):** the gold stem draws upward (`stroke-dashoffset` 1 → 0 on `pathLength="1"`), with `--ease-standard`.
  3. **The leaves unfurl (900–1840ms):** the left leaf grows from its base (scale 0 → 1, rotating from −35°), then the right (from +35°), then the centre leaf lifts 6px as it grows. They are 120ms apart, each 700ms, with `--ease-grow`.
  4. **The glint (1500–2250ms):** a brightness wave (1 → 1.45 → 1) passes over the leaves, 70ms apart. A pale-gold halo behind the sprout breathes out (scale 0.5 → 1.7, opacity 0.5 → 0).
  5. **Motes and message (1600–2500ms):** six small gold leaves drift up 16–26px with a slight spin and fade. The confirmation message rises 8px into place (`--dur-slow`, `--ease-enter`).
- **Haptics:** where the platform supports it (`navigator.vibrate`), one short 10ms tick at beat 3.
- **Interruptible:** tapping skips to the final frame. The confirmation details (amount, Listing, reference) are on screen and readable from the first frame, below the sprout.
- **Reduced:** the final mark and message fade in over 120ms.

#### 6. Route progress

- **Where:** shipment detail and the investor's portfolio cards.
- **Beats:** the travelled part of the route draws from the origin port to the current stage (`--dur-showpiece`, `--ease-standard`). The stage stops already passed pop in (`--ease-spring`) as the line reaches them, and the stops still ahead pop in after, `--stagger` apart. The gold vessel marker travels along the path with the line's leading edge. On arrival its wake pulses outward three times (scale 1 → 2.6, fading, 1.2s each, two rings 400ms apart), then it rests.
- **When a stage advances** (live update): only the new segment draws, and the vessel sails from its old stop to the new one over `--dur-slow`.
- **Right to left:** the drawing mirrors (origin at the reading start), and the port labels stay readable.
- **Reduced:** the final state is drawn at once, with no wake.

#### 7. List cascade and funding fill

- **Lists of cards** (shipments, portfolio, review queue): on first render each card rises `--move-small` and fades in over `--dur-slow` with `--ease-enter`, `--stagger` apart and capped at `--stagger-max`. Only cards visible on first paint cascade. Cards scrolled to later just appear.
- **Funding bars:** they fill from 0 to their value (`scaleX`, transform-origin on the reading start) over `--dur-deliberate` with `--ease-enter`, starting 120ms after their card. When the fill nearly lands, a pale-gold glint flashes at the tip (600ms).
- **Reduced:** everything appears at once.

#### 8. Tab bar

- **Switching tabs:** the highlight pill springs to the new tab (`--ease-spring`, `--dur-spring`). The new icon gives a small bump (scale 1 → 1.14 → 1, `--dur-base`). Its gold layer pops in from 30% scale (`--ease-spring`). The screen content crossfades over 160ms.
- **Badges** (new items in a queue): a red dot scales in with `--ease-spring-soft`.
- **Reduced:** the pill and icon change instantly.

#### 9. Feedback: press, toast, loading, errors

- **Press:** buttons and tappable cards scale to `--press-scale` (cards to 0.99) for `--dur-instant` and spring back on release.
- **Toast:** it rises from below the edge with `--ease-spring-soft` (`--dur-spring`), stays 2.4s, then leaves by dropping 8px and fading (`--dur-base`, `--ease-exit`). A new toast replaces the old one without stacking.
- **Skeleton:** a warm sand shimmer sweeping towards the reading end every 1.4s. Swapping in real content is a 160ms crossfade, with no layout jump (skeletons match content sizes).
- **Field error:** the field border turns red and the message fades in. No shaking, because shaking reads as scolding, and the user is handling money.
- **Pull to refresh** (lists): a small sprout grows as you pull (stem then leaves, tied to pull distance). Releasing past the threshold spins its leaves once while loading.

### Reduced motion

`prefers-reduced-motion: reduce` collapses every duration token (to 1ms, or 120ms for crossfades) and every distance token (to 0) in `tokens.css`. That one switch removes all movement. Components then need no special cases, because they read the tokens. JavaScript-driven motion (count-up, the sprout, the route vessel, cascades) checks `matchMedia('(prefers-reduced-motion: reduce)')` and jumps straight to the final state. The skeleton shimmer stops. What remains is short opacity crossfades, so changes are still noticeable without anything moving.

This is required, not optional. Many users (and this repo's dev machine) have reduce motion switched on. The styleguide's **Motion** switch previews full motion on such devices; the app itself always honours the setting.

### Performance budget

- Run at 60fps on a mid-range Android phone. Animate only `transform`, `opacity` and the two SVG exceptions above.
- At most one showpiece (count-up, route or sprout) runs on a screen at a time. If several are in view, they queue: the count-up first, then the route.
- No motion libraries. Use CSS transitions, the Web Animations API (`element.animate`) and `requestAnimationFrame` only.
- Pause looping animations (shimmer, wake) when off-screen or when the tab is hidden.

## Accessibility

- WCAG 2.1 AA: 4.5:1 for text, 3:1 for large text and UI boundaries. All the token pairs above are checked, and the styleguide shows the live ratios.
- Visible focus everywhere: a 2px `--focus-ring` with a 2px offset.
- Touch targets are at least 44 × 44px.
- Every motion has a reduced fallback (see above), and nothing essential depends on motion.
- Money changes are announced through a polite live region with the final value.
- Use `lang="ar"` and `dir="rtl"` on Arabic content. Numbers stay isolated left to right.

## Migrating the app

Not started. The suggested order:

1. Load `tokens.css` and IBM Plex in `index.html`, and set the favicon and `theme-color` (`#06503A`).
2. Swap the header logo (`LOGO` in `core.js`) for the mark plus wordmark, and remove the look picker and the `data-look` styles.
3. Map the old variables (`--acc`, `--ink`, `--mut`, …) to the semantic tokens, then replace them component by component with the styleguide versions.
4. Replace emoji on the doors with goods icons, and the door colours with the six door tokens.
5. Add the motion catalogue, starting with screen transitions, sheets and the count-up, then the doors, sprout and route.
6. Build the staff console's ≥1024px layout.
7. Show investors every Listing figure (issue #1, ADR 0004).
