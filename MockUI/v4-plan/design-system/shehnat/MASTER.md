# Shehnat paper column

Version 1. 31 October 2026.

This is the mobile theme locked from the layout research, with color taken from the logo file. Tokens are in [`tokens.css`](tokens.css) and [`tokens.json`](tokens.json). A screen uses semantic and component tokens only.

This file does not replace [`docs/design-system.md`](../../../../docs/design-system.md) or `Demo/frontend/tokens.css`. Those still describe the earlier sand, card, and motion system. Use this file to draw the next screen set.

The theme fits a product with one primary object and one utility. Here the object is a listing. The utility is the wallet. It is a poor fit for a two-price market or a map-first home. Do not force those into this frame.

## Color source

Sampled from [`docs/assets/SHEHNAT LOGO.png`](../../../../docs/assets/SHEHNAT%20LOGO.png) (1254×1254) on 31 October 2026. Every second pixel. Near-black ground and low-chroma compression specks were excluded.

| Sample | Pixels | Mean | Token |
| --- | --- | --- | --- |
| Green figures and wordmark | 39,754 | `#06503A` | `--color-green-800` |
| Gold leaf and tagline | 14,722 | `#B39047` | `--color-logo-gold` |

The 8-step buckets peaked at `#085038` and `#B09048`. Those are quantization bins, not the means. The file’s ground is black. It contains no paper color. Page paper `#F7F6F3` is an opaque neutral chosen so the green stays the only chroma on a reading screen.

`--color-logo-gold` is 2.78:1 on paper and 3.00:1 as white text on the gold. It cannot be text, a border, an icon layer, a tab, or a button. It appears only inside the logo artwork. Do not redraw the mark in CSS.

## Layout rules

- The screen is a masthead, then one inset column. On a phone the column is a single text measure, max 600px and centered from 600px up. One named component may bleed to the screen edge, or the first lines of body may overlap only the empty lower edge of a header image. Rows, prices, captions, and lists stay inset. If the header contains type, do not overlap that type. Gutters are 16px, and 24px from 600px. Use logical properties only (`padding-inline`, `margin-block`, `inset-inline-start`).
- Home shows one lead listing and the start of the next listing. The next listing’s title and its row stay fully above the bar. No equal cards, no carousel, no widget tiles.
- The mode bar has four sections and only sections. Investor: Home, Shipments, Wallet, You. Manager: Home, Listings, Wallet, You. Staff: Queue, Listings, Money, You. Search is a button in the masthead, not a fifth tab. You is the account. Do not also put a person icon that opens You. The bar does not hold invest, list, withdraw, create, or buy. A primary verb replaces one of the four only when that verb is the section. It does not add a fifth item or a floating button.
- One bottom container. Section screens use the mode bar. A task screen removes it and shows one action bar. Never both. Do not hard-code the bar to the bottom edge. On a wide staff window, or on a device that moves the bar to the side, the same four items move as one rail. Do not draw a second bar.
- Type and controls stay in the safe area, clear of the status bar, the home indicator, and the bar. A hit target is at least 44×44px, and at least 48×48px for a primary control, with at least 8px between targets. Scroll content ends below the bar, with the last row fully visible.

## Style rules

- The page is opaque paper `#F7F6F3`. Ink is `#141816`. The one accent is logo green `#06503A`. It marks the active section, a text link, and the primary button. Photography may be full color. Gold, a second green, and any other hue are not accents. Content does not sit on glass, blur, or a tinted photograph.
- Titles are Newsreader. Body, buttons, tabs, and figures are IBM Plex Sans at 17px for body, with tabular lining figures on every amount. Contrast is at least 4.5:1 for text under 18px. A title at 28px or larger may use 3:1. Nothing a person must read is under 14px. A price is at least 16px. Arabic, including Arabic titles, uses IBM Plex Sans Arabic, because Newsreader has no Arabic. Amounts, container IDs, and IBANs stay left to right (`direction: ltr; unicode-bidi: isolate`). Text wraps as it grows. Do not scale the tab labels because the body grew. The root font size stays 16px. Do not disable zoom.
- Reading screens use square corners and no card shadow. A section rule is 1px ink. A list row is separated by the light hairline, which is not a control boundary. Utility panels and the one primary button use 12px radius. Do not put a rounded panel on a reading screen. Inputs stay square.
- Icons are filled, 24px, one weight, no gold layer, and no emoji. The active section uses the green accent on both icon and label. Inactive icons use ink. No circular badge behind an icon. A decorative icon next to a visible label is hidden from assistive tech. An icon-only control has an accessible name. Directional icons mirror in right to left. The logo, the play icon, and numbers do not.
- Motion is a 160ms fade, or a 16px move that follows the finger when going back. Tab changes fade. They do not slide. Reduced motion keeps a 120ms fade and removes movement, blur, and bounce. One still lead on Home is the only hero. No count-up, no door swing, no sprout, no parallax, no spring on a utilitarian control. Pressed feedback is an opacity change to the pressed color within 100ms, without moving layout.

## Six screens

The masthead slot, the inset column, the green accent, and the rule of one bottom container stay. Each screen changes one thing.

1. **Front — Home.** The lead image is the one full-bleed, under the masthead. One serif headline sits with it. Only the top of the next listing shows, and that row stays above the four-item bar. If the listing has no photograph, the lead is one opaque green field with the name in white serif. It is not a colored door and not a collage.
2. **Latest — Shipments, or Listings, or Queue.** The bleed is withdrawn. Each row is a serif title, a 14px meta line, and a small image. Same masthead, same bar. The whole row is the hit target.
3. **Object — Listing.** The header image may bleed. The first lines may overlap only the empty lower edge of that image. After that, the body is the inset column: route, stage, funding, and the figures this role is allowed to see. The mode bar stays. Nothing floats on the picture. “Invest” or “Continue” opens the task. It is not a second bar.
4. **Maker — Manager.** The wordmark is replaced by a back control and a centered name, then a 1px ink rule, then the same rows as Latest. A portrait is not covered by a player or a bar. The mode bar stays.
5. **Utility — Wallet, or Money.** The prose column is replaced by a short stack of white panels on the same paper, using the green accent and no other hue. The balance is a 44px sans figure with a 14px line that says what it is. The same four-item bar stays. The last row sits fully inside its panel and fully above the bar.
6. **Task — Invest, withdraw, pay a deposit, or submit a listing.** The mode bar leaves. One action bar takes the bottom, with one primary button and at most one secondary. Leaving the task brings the mode bar back. There is no moment with both.

Staff at 1024px and wider use the same four names in a side rail, then a list and a detail. The detail follows the Object rules. Queues are rows, not cards and not a dashboard.

## What a listing may show

Investors see the listing figures the product already exposes. They do not see company capital, the company deposit, expected profit, the manager’s share, or the company result. A projection is ink, labelled “expected”, with no arrow and no gain color. A realised result uses gain or loss color, a sign (`+` or `−`), an arrow, and the word “Profit” or “Loss”. Color is never the only signal.

The words “Halal Investments” appear only inside the logo artwork. Do not set them as a tagline, a badge, or a footer.

## Palette

| Role | Token | Value | Contrast on paper |
| --- | --- | --- | --- |
| Page | `--color-background` | `#F7F6F3` | — |
| Panel, sheet, input | `--color-surface` | `#FFFFFF` | — |
| Ink | `--color-foreground` | `#141816` | 16.58:1 |
| Secondary text | `--color-muted-foreground` | `#666866` | 5.20:1 |
| Accent, link, primary | `--color-primary` | `#06503A` | 8.77:1. White label 9.48:1 |
| Primary hover | `--color-primary-hover` | `#246552` | White label 6.87:1 |
| Primary pressed | `--color-primary-active` | `#043A2A` | White label 12.78:1 |
| Section rule | `--color-rule` | `#141816` | — |
| Row hairline | `--color-border` | `#D7D7D4` | Decorative, 1.33:1 |
| Control border | `--color-input` | `#6F716E` | 4.56:1 |
| Logo gold | `--color-logo-gold` | `#B39047` | 2.78:1. Artwork only |

Status colors are not accents. They never paint a tab, a link, or a primary button. Gain `#2F7D1F` is a different green from the brand (4.77:1 on paper, 4.66:1 on `#EEF6E9`). Loss `#B42318` is 6.08:1. Warning `#93370D` is 6.96:1. Info `#1F5E8C` is 6.40:1. Each status also has a word.

## Type

Load [Newsreader](https://fonts.google.com/specimen/Newsreader) at 500 and 600, and [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) plus IBM Plex Sans Arabic at 400, 500, and 600. The catalog pairing was Newsreader and Roboto. Roboto is not used. IBM Plex Sans is the plain UI face this product already has, and it has an Arabic companion. Playfair Display and Inter are not this theme.

| Use | Face | Size | Weight | Line height |
| --- | --- | --- | --- | --- |
| Home headline, maker name | Newsreader | 34px | 500 | 1.15 |
| Screen title when a title is needed | Newsreader | 28px | 500 | 1.2 |
| Row title | Newsreader | 22px | 500 | 1.25 |
| Body | IBM Plex Sans | 17px | 400 | 1.5 |
| Button, price, tab label | IBM Plex Sans | 16px | 500 | 1.3 |
| Meta: route, date, “as of” | IBM Plex Sans | 14px | 400 | 1.4 |
| Wallet balance, settlement | IBM Plex Sans | 44px | 500 | 1.1 |

One `h1` per screen. Do not skip heading levels. Meta is not a heading. Reading text stays within 66 characters on a wide column.

## Components

### Masthead

Opaque paper, 56px plus the top safe area, 1px ink rule on the bottom. Start side: the mark at 24px, clear space at least 25% of the mark’s width. End side: search, 44×44px, labelled “Search”. No wallet pill and no account icon. On Maker, the mark is replaced by back (44×44, labelled “Back”) and the centered name. The rule under that name is the section rule.

### Mode bar

Opaque paper, 56px plus the bottom safe area, 1px ink rule on the top. Four labelled items, equal width. Active: green icon and green 16px label. Inactive: ink icon and ink label. No pill, no badge, no translucency. The selected item exposes selected state to assistive tech.

### Action bar

Same paper, height, and safe area as the mode bar. It exists only on a task screen. One primary button. At most one secondary button beside it, with 8px between them. The primary label is a verb plus the object (“Confirm investment”), not “Submit”.

### Button

| | Default | Hover | Pressed | Disabled |
| --- | --- | --- | --- | --- |
| Primary fill | `--color-primary` | `--color-primary-hover` | `--color-primary-active` | `--color-surface-sunken` |
| Primary text | white | white | white | `--color-muted-foreground` |
| Secondary fill | transparent | `--color-surface-sunken` | `--color-surface-sunken` | `--color-surface-sunken` |
| Secondary text | ink | ink | ink | muted |
| Secondary border | `--color-input` | `--color-input` | `--color-input` | `--color-border` |

Height 48px. Radius 12px. Horizontal padding 16px. Label 16px. A destructive action is loss-colored text and a loss-colored border, never a filled red button. One primary button on the action bar. A text link in the column is green 17px, not a button.

### Input

Height 48px. Text 17px. Square. White fill. 1px `--color-input` border. The label is visible. Placeholder text is not the label. Focus is a 2px green ring, 2px outside the control. An error uses the loss border and a message under the field that starts with the word “Error”, tied to the field. An amount input shows a `$` prefix, `inputmode="decimal"`, and stays left to right. Helper text states the minimum and “max 2 decimals”.

### Listing row

Minimum height 72px. The row is one control. Serif title, 14px meta, optional 56px image on the inline end. Image radius 0. Separator is the row hairline, inset with the column, not edge to edge. Pressed background is `--color-green-100`. No shadow and no card.

### Lead

Full bleed under the masthead. Radius 0. No stroke and no shadow. The headline sits on paper under the image, or in white on the green field when there is no photo. A credit, if any, is 14px and sits on a paper strip, not on the photograph. The next row is not clipped by the bar.

### Utility panel

White, 12px radius, 16px padding, no shadow. Panels stack with 12px between them. The panel holds the balance or a group of statement rows. Statement rows use the same type as Latest and do not become cards inside the panel. A status word sits on its status background inside the panel. It does not become a row of loose chips.

### Money figure

44px or, in a row, at least 16px. Tabular lining figures. Under a hero figure, 14px muted text says what the number is and when it was true. Realised gain and loss use their status color plus a sign, an arrow, and a word. Expected figures stay ink.

### Sheet

Used for a short confirm that is still the task, not a second navigation layer. White, 12px top radius, 1px top rule, over an ink scrim at 48% opacity. The scrim is flat, not blurred. Focus moves into the sheet. Esc and the scrim close it. The action bar remains the one bottom container. The sheet does not add another bar.

### Focus, empty, loading, error

- Focus is always visible: 2px `--color-ring`, 2px offset. Do not remove it.
- Empty: one sentence and one action. No illustration collage.
- Loading: paper-colored blocks in the shape of the lead or the rows. No spinner in place of content. The shimmer is an opacity pulse. Reduced motion shows still blocks.
- A failed action keeps the typed values and shows the error on the field. A form with several errors also moves focus to a summary that links to each field.
- A toast may confirm a non-money change. A money result is on the task screen itself, not only in a toast.

## Anti-patterns

- Liquid Glass, blur, refraction, or a translucent bar. A gold accent paired with glass.
- A second accent. Gold in the interface. A door palette of several hues. Neon. A purple-blue gradient. A progress line in a new hue.
- A mini player, a floating action button, or a toolbar stacked on the mode bar.
- More than four sections, a More tab, or an action stored in the mode bar. A person icon that duplicates You. A wallet pill that duplicates Wallet.
- Body under 16px, any required text under 14px, a price under 16px, light weights at small sizes, emoji as icons, duotone gold icons.
- Equal cards, bento tiles, a widget dashboard, chips that leave their panel, and a lead so tall that the next listing is a clipped headline.
- Rounded panels on a reading screen. More than one radius. Asymmetric corners. Springs that bounce.
- A two-price buy box, a map used as the home, or a swipe-video home.
- Copying the logo’s gold into CSS components, or setting the logo’s tagline as interface copy.
- The earlier showpieces: container doors that swing, a sprout ceremony, a money count-up, a route that draws itself.

## Type and color checks

Checked 31 October 2026 against `#F7F6F3` unless noted.

| Pair | Ratio |
| --- | --- |
| `#141816` on paper | 16.58:1 |
| `#666866` on paper | 5.20:1 |
| `#06503A` on paper | 8.77:1 |
| White on `#06503A` | 9.48:1 |
| White on `#246552` | 6.87:1 |
| White on `#043A2A` | 12.78:1 |
| `#6F716E` on paper | 4.56:1 |
| `#B39047` on paper | 2.78:1, fails, artwork only |
| `#2F7D1F` on paper | 4.77:1 |
| `#B42318` on paper | 6.08:1 |
| `#93370D` on paper | 6.96:1 |
| `#1F5E8C` on paper | 6.40:1 |

## Sources

Layout lock: [`reports/Mobile layout themes 2024 2026.md`](../../reports/Mobile%20layout%20themes%202024%202026.md), section 4, and the notes under `research_notes/Mobile layout themes 2024 2026/`. The structural references are The Atlantic’s masthead and four-item bar (frames of 27 October 2026) and the Apple News Format license that a bleed is a named exception. Platform limits used as constraints, not as the look: Apple’s materials rule against glass in the content layer, 44×44pt hits, about 17pt body, 4.5:1 text; Material’s rule against a navigation bar and a toolbar together; 48×48dp targets.

Typography search, ui-ux-pro-max 2.13.0, domain `typography`, query “editorial news serif readable body”. First match: Newsreader for long-form titles. The catalog’s Roboto body and its Playfair/Inter luxury pair were not used.

Product rules kept from the current Shehnat spec, not from the visual research: investor privacy, labelled money, and the logo tagline staying inside the artwork. See `docs/design-system.md` and ADR 0004.
