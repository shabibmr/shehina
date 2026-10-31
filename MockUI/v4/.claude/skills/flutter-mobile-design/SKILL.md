---
name: flutter-mobile-design
description: This skill should be used when the user asks to build, design, or create mobile interfaces, screens, components, dashboards, onboarding flows, forms, or design systems using Flutter and Dart. Triggers include requests like "build me a home screen," "design a mobile dashboard," "create a Flutter widget," "make a settings page," "style this screen," or any mobile UI/frontend work. Produces creative, concept-driven, production-grade Flutter code with distinctive visual identity -- not generic AI aesthetics.
---

# Flutter Mobile Design

You are building mobile interfaces that make people stop mid-scroll and say "wait, what app is this?" Not "oh, another Material default." Every screen you produce should feel like it was crafted by a designer with opinions, not assembled from a widget catalog.

Your stack: **Flutter** + **Dart**. Your design systems: **Material 3**, **Cupertino**, **Adaptive**, or **Custom** -- configurable per project. Master them all. Use them with intention.

---

## 1. Settings Loading

Before starting any mobile design work, check for a local settings file at `.claude/flutter-mobile-design.local.md` in the project root.

If the file exists, parse it:
- Read the **YAML frontmatter** for configuration overrides
- Read the **markdown body** for additional project design context (brand guidelines, existing patterns, constraints)

**Supported settings with defaults:**

```yaml
design_system: adaptive    # material3 | cupertino | adaptive | custom
material_theme: seed_color # dynamic | seed_color | custom
state_management: riverpod # riverpod | bloc | provider | none
navigation: go_router      # go_router | auto_route | navigator2 | none
doc_lookup: on-demand      # always | on-demand
creativity: bold           # bold | balanced | conservative
platforms:                 # target platforms
  - android
  - ios
constraints: []            # list of free-form constraint strings
```

- `design_system`: Controls which design language to use. See Design System Modes below.
- `material_theme`: How to construct the Material 3 color scheme. `dynamic` uses the device wallpaper on Android 12+. `seed_color` generates a full scheme from one color. `custom` means hand-crafted `ColorScheme` with every role explicitly set.
- `state_management`: Which state management to wire into generated code. See State Management Integration below.
- `navigation`: Which routing solution to use. See Navigation Patterns below.
- `doc_lookup`: How aggressively to fetch documentation via context7. See Context7 Integration below.
- `creativity`: Dials the creative intensity. **Bold** means dramatic concepts, unexpected layouts, strong visual personality. **Balanced** means polished and distinctive but within conventional expectations. **Conservative** means clean, professional, and restrained -- still never generic, but not taking big swings.
- `platforms`: Target platforms. Affects adaptive decisions, safe area handling, and platform-specific features.
- `constraints`: Project-specific rules. Things like "minimum touch target 48x48", "no animations due to accessibility requirements", "brand colors locked to #1a1a2e and #e94560", "RTL support required". These override any creative suggestions that would violate them.

If the file has a markdown body, treat it as supplementary design context. A body might describe the brand voice, reference existing design decisions, or specify packages already in use.

If no settings file exists, use all defaults and proceed. Don't ask the user to create one. A template is available at `examples/settings-template.md` in the plugin directory.

---

## 2. Creative Design Process

This is the soul of the skill. You do not write a single widget until you have a concept. Ever.

### Before Writing Any Code

**a) Develop a Concept**

When the user describes what they want, propose **2-3 creative visual directions**. Not descriptions of functionality -- descriptions of *feeling* and *aesthetic*.

Bad: "Here's a home screen with a list and a bottom navigation bar."
Good: "Here's **Darkroom** -- a photography-inspired interface with edge-to-edge imagery, a matte black chrome, and content that emerges from shadow like a developing print. Navigation dissolves into the content. Interactions feel like adjusting dials -- rotational gestures, slide-to-reveal, long-press depth."

Each concept gets:
- **A name** (evocative, not generic -- "Letterpress" not "Clean Layout")
- **A 2-sentence mood description** (what does it feel like to use?)
- **What makes it distinctive** (the one thing someone would remember)

Tailor concepts to the `creativity` setting:
- **Bold:** Push boundaries. Unusual layouts, dramatic typography, unexpected interactions, custom gesture vocabularies. The user wants to be surprised.
- **Balanced:** Distinctive but grounded. Strong visual identity within recognizable mobile patterns. The user wants to stand out without confusing users.
- **Conservative:** Refined and polished. The distinctiveness comes from perfect execution, thoughtful micro-interactions, and elevated taste rather than radical departures.

**b) Define the Visual Identity**

Once the user picks a direction (or you pick one for small tasks), lock in the design language:

- **Color palette** -- Build a `ColorScheme` with intention, not from a seed color alone. Define the dominant experience color, a sharp accent, surface hierarchy (3+ surface levels for depth), and semantic colors that match the concept. A "field journal" app's error state is different from a "neon arcade" app's error state. Always design for both light and dark themes from the start.
- **Typography system** -- A display family and a body family. Source from [Google Fonts](https://pub.dev/packages/google_fonts) for Flutter. The pairing should have contrast and character. Explain the choice ("Bricolage Grotesque for headlines gives it that handcrafted editorial weight; Instrument Sans for body keeps it crisp on small screens"). Define the full `TextTheme` with intentional size/weight/letter-spacing for each role.
- **Spacing rhythm** -- Define a base unit (4, 6, or 8 logical pixels) and a scale. Consistent spacing is the difference between "designed" and "thrown together." Create spacing constants or an extension on `BuildContext`.
- **Motion personality** -- Is animation snappy and mechanical? Fluid and organic? Dramatic with long curves? Bouncy and playful? The motion language should match the concept. A brutalist app doesn't do spring animations. A luxury brand doesn't do robotic slides. Define default `Duration`s and `Curve`s for the project.
- **Signature detail** -- One "oh, that's nice" moment. A custom page transition. A pull-to-refresh that tells a micro-story. A hero animation that morphs in an unexpected way. A haptic feedback pattern tied to interactions. A parallax effect in a scroll view. This is your calling card.

**c) Scale to the Ask**

Full application or multi-screen build? Full concept treatment. Take the time.

Single screen or view? Abbreviated concept -- propose the direction in a paragraph, define the key visual decisions, then build.

Single widget? Quick concept note -- 1-2 sentences establishing the vibe ("This stats card has a flight-instruments energy -- circular gauges, monospace readouts, a subtle scan-line texture"), then straight to code.

Don't waste the user's time with a 20-minute design exercise for a `ListTile`. But don't skip the concept for a full app either. Read the room.

**d) Then Build**

Implementation comes only after the concept is established and acknowledged. If the user says "just build it," that's permission to pick the strongest concept yourself and note what you chose. It is not permission to skip having a concept.

---

## 3. Design System Modes

Read the `design_system` setting and apply accordingly:

### Material 3 (`design_system: material3`)

Use Material 3 as the foundation. Customize deeply via `ThemeData`:
- **ColorScheme**: Never use `ColorScheme.fromSeed()` with defaults. Override specific roles to match the concept. Use `ColorScheme.fromSeed()` as a starting point, then replace key roles (`primary`, `secondary`, `tertiary`, `surface`, `surfaceContainerLowest` through `surfaceContainerHighest`).
- **TextTheme**: Override every role you use. Don't let `bodyMedium` be whatever the default is.
- **Component themes**: Use `ThemeData.copyWith()` to customize individual component themes (`ElevatedButtonThemeData`, `CardThemeData`, `AppBarTheme`, etc.). This is where you make Material look like *your* app, not *a* Material app.
- **Shape system**: M3's shape scale (small, medium, large, extraLarge) is customizable. A brutalist concept uses sharp corners. An organic concept uses higher radii. Define `ShapeBorder`s intentionally.

### Cupertino (`design_system: cupertino`)

Use `CupertinoApp` and Cupertino widgets for an iOS-native feel:
- **CupertinoThemeData**: Customize `primaryColor`, `scaffoldBackgroundColor`, `textTheme`, and `barBackgroundColor`.
- **SF Pro aesthetic**: Cupertino defaults lean on San Francisco typography. You can still pair it with a custom display font for headers while keeping SF for body/system elements.
- **iOS patterns**: Use `CupertinoNavigationBar`, `CupertinoTabBar`, `CupertinoSliverNavigationBar` for large titles, `CupertinoActionSheet` for bottom sheets. These feel native; Material equivalents feel foreign on iOS.
- **Blur and vibrancy**: Cupertino design loves backdrop blur (`BackdropFilter`), frosted glass surfaces, and layered translucency. Lean into this.

### Adaptive (`design_system: adaptive`)

Platform-aware design that feels native on each platform:
- Use `Platform.isIOS` / `Platform.isAndroid` (or `Theme.of(context).platform`) to switch between Material and Cupertino widgets where it matters: navigation bars, tab bars, switches, sliders, date pickers, alert dialogs, page transitions.
- **Shared design language**: The color palette, typography (at least the display font), and concept should unify the experience. Platform-specific widgets handle the interaction model; the visual identity stays consistent.
- **Create adaptive wrapper widgets**: `AdaptiveScaffold`, `AdaptiveDialog`, `AdaptiveSwitch` -- thin wrappers that delegate to the right platform widget. Keep these in a `widgets/adaptive/` directory.
- **Don't over-adapt**: Not everything needs a platform fork. Cards, custom layouts, illustrations, animations -- keep these unified. Only fork where users have strong platform expectations (navigation, system controls, gestures).

### Custom (`design_system: custom`)

Build a fully custom design system from Flutter primitives:
- **No Material or Cupertino dependency** for visual components. Use `Container`, `GestureDetector`, `CustomPaint`, `AnimatedBuilder` as building blocks.
- **Custom component library**: Build your own buttons, cards, inputs, navigation. This is maximum creative control -- every pixel is yours.
- **Still use framework utilities**: `MediaQuery`, `SafeArea`, `Semantics`, `FocusTraversalGroup` -- the non-visual framework pieces are still essential.
- **Design token system**: Create a `DesignTokens` class or `InheritedWidget` that provides colors, typography, spacing, radii, and durations throughout the tree. This is your custom `ThemeData`.

---

## 4. State Management Integration

Wire state management into generated code based on the `state_management` setting.

### Riverpod (`state_management: riverpod`)

- Use **Riverpod 2.x** with code generation (`@riverpod` annotations, `riverpod_generator`).
- `AsyncValue` patterns for loading/error/data states -- design all three states, not just the happy path. Loading states and error states are design opportunities.
- `ConsumerWidget` / `ConsumerStatefulWidget` for widgets that read providers.
- `ref.watch()` in `build()`, `ref.read()` in callbacks. Never `ref.watch()` in callbacks.
- State notifiers for complex logic. Keep business logic out of widgets.
- Organize providers by feature: `features/auth/providers/`, `features/home/providers/`.

### BLoC (`state_management: bloc`)

- Use `flutter_bloc` with `Bloc` or `Cubit` classes.
- `BlocBuilder`, `BlocListener`, `BlocConsumer` for widget integration.
- Sealed class events, sealed class states with pattern matching.
- Keep blocs in `blocs/` or `features/<feature>/bloc/`.

### Provider (`state_management: provider`)

- Use `ChangeNotifier` with `Consumer` / `Selector` widgets.
- `context.watch<T>()` in `build()`, `context.read<T>()` in callbacks.
- Suitable for simpler state; don't fight it for complex async flows.

### None (`state_management: none`)

- Generate stateless examples. Use `StatefulWidget` for local UI state only.
- Let the user wire in their own state management.

---

## 5. Navigation Patterns

Wire navigation based on the `navigation` setting.

### GoRouter (`navigation: go_router`)

- Declarative route configuration with `GoRouter`.
- `ShellRoute` for persistent navigation (bottom nav, side drawer).
- `context.go()` for navigation, `context.push()` for stack pushes.
- Route guards via `redirect` for auth flows.
- Deep link support baked in.
- **Custom page transitions**: Use `CustomTransitionPage` to implement concept-matched transitions. A card-flip transition, a zoom-through, a slide-and-fade -- the transition is part of the design language.

### AutoRoute (`navigation: auto_route`)

- Code-generated routes with `@RoutePage()` annotations.
- `AutoTabsRouter` for tab-based navigation.
- `AutoRouter.of(context)` for programmatic navigation.

### Navigator 2.0 (`navigation: navigator2`)

- Raw `Router` + `RouterDelegate` + `RouteInformationParser`.
- Full control, maximum complexity. Use only when the routing model is genuinely complex enough to warrant it.

### None (`navigation: none`)

- Standalone screens. No routing wiring.
- Useful for component-level or single-screen work.

---

## 6. Aesthetic Standards

This is where the opinions live. Follow these or have a good reason not to.

### Typography

**Banned as primary typeface:** Roboto (it's the Material default -- it's invisible). Using Roboto unmodified signals "I didn't think about typography."

Every project gets a **distinctive pairing** via the `google_fonts` package:

- **Display font:** Can be dramatic. Serifs (Playfair Display, Fraunces, Instrument Serif), geometric sans (Space Grotesk, Satoshi, General Sans), monospace for the right concept (JetBrains Mono, IBM Plex Mono, Space Mono), or something with real personality (Clash Display, Cabinet Grotesk, Syne).
- **Body font:** Prioritize readability at mobile sizes. Plus Jakarta Sans, Outfit, Figtree for clean sans-serif. Source Serif 4, Newsreader, Literata for serif body text. DM Sans if you must go neutral, but pair it with a strong display font.
- **Cupertino exception:** When `design_system: cupertino`, body text may use the system font (SF Pro) for native feel. But still pair with a custom display font for headers. A Cupertino app with distinctive display typography immediately stands out.

Use `GoogleFonts.textTheme()` to build the full `TextTheme`. Specify `fontWeight`, `letterSpacing`, and `height` explicitly for each role you use. Don't leave these as defaults.

### Color

**Never use `ColorScheme.fromSeed()` unmodified.** It's a starting point, not a destination. If a user can run the Flutter counter template and see the same purple, you haven't designed anything.

Build palettes with intention:
- A **dominant color** that owns the experience
- A **sharp accent** for actions and highlights -- should contrast hard against the dominant
- **Surface hierarchy** -- at least 3 levels of surface color for depth and layering. M3 provides `surfaceContainerLowest` through `surfaceContainerHighest`. Use them. Or build your own if custom.
- **Semantic colors** that respect the concept -- a "nature journal" app's warning amber is different from a "stock trading" app's warning amber
- **Dark mode and light mode from the start.** Not "invert the colors." Redesign the palette for each mode. Dark mode gets its own surface hierarchy, its own accent adjustments, its own contrast ratios. Use `ThemeData` with both `brightness: Brightness.light` and `brightness: Brightness.dark`, switchable via a theme provider.

Define colors as constants in a dedicated file (`lib/theme/colors.dart` or `lib/design/tokens.dart`). Reference them in the `ThemeData`, not scattered across widgets.

### Motion

Motion on mobile is not decoration. It's spatial communication -- it tells users where things come from and where they go.

- **Hero animations** for shared-element transitions. Every list-to-detail navigation should consider a hero. Customize the `flightShuttleBuilder` for non-default hero morphs.
- **Page transitions** that match the concept. Use `PageRouteBuilder` or GoRouter's `CustomTransitionPage`. A card-stack app slides cards. A document app cross-fades. A game app zooms through. Default `MaterialPageRoute` transition is a missed opportunity.
- **Staggered list animations.** When multiple items appear, stagger their entrance. Use `AnimatedList`, `ListView` with index-based `AnimationController` delays, or packages like `flutter_staggered_animations`.
- **Implicit animations first.** `AnimatedContainer`, `AnimatedOpacity`, `AnimatedPadding`, `AnimatedSwitcher`, `AnimatedCrossFade` -- these handle 70% of what you need with zero boilerplate. Reach for explicit `AnimationController` only for complex orchestration.
- **Scroll-driven effects.** `SliverAppBar` with `flexibleSpace` for collapsing headers. `CustomScrollView` with mixed slivers for parallax. `NotificationListener<ScrollNotification>` for scroll-linked transformations.
- **Haptic feedback.** `HapticFeedback.lightImpact()`, `.mediumImpact()`, `.heavyImpact()`, `.selectionClick()` -- tie these to meaningful interactions. A toggle switch click, a successful action, a threshold crossed. Haptics are the mobile signature detail that web can't match.
- **Match the concept.** A data dashboard is crisp: short durations (200-300ms), `Curves.easeOutCubic`, no overshoot. An editorial app is fluid: longer durations (400-600ms), `Curves.easeInOutCubic`, gentle curves. A playful app is bouncy: `Curves.elasticOut`, overshoot, spring physics via `SpringSimulation`.
- **`prefers-reduced-motion` respect.** Check `MediaQuery.of(context).disableAnimations` and provide reduced/no motion as a fallback.

### Layout

**Break the template intentionally.** The default for every AI mobile screen is a scrollable column of cards with uniform padding. You're better than that.

- **Edge-to-edge imagery** -- Let images and hero content bleed to the screen edge. Not everything lives inside 16px horizontal padding.
- **Overlapping elements** -- A profile avatar that breaks out of the header into the content area. A floating action element that overlaps two sections. Z-layer composition creates depth on a flat screen.
- **Varied content density** -- Alternate between dense information areas and breathing room. A stats section with tight data pairs, followed by a full-bleed image, followed by a spacious CTA.
- **Scroll-view composition** -- `CustomScrollView` with mixed `Sliver` types: `SliverAppBar` (collapsing), `SliverToBoxAdapter` (one-off widgets), `SliverList` (scrolling content), `SliverPersistentHeader` (sticky sections). This is how you build screens that feel crafted, not just stacked.
- **Responsive to screen size** -- Use `MediaQuery` and `LayoutBuilder` to adapt. A phone shows a single column; a tablet shows a master-detail. A foldable shows different layouts for folded/unfolded. Don't hard-code widths.
- **Safe areas with intention** -- `SafeArea` is mandatory, but don't blindly wrap everything. Let backgrounds extend behind the system bars (use `SystemChrome.setSystemUIOverlayStyle` for status bar appearance). Notches and dynamic islands are design constraints, not obstacles.

### Signature Details

Every project -- even a single widget -- gets at least one moment of delight. This is non-negotiable. It's the difference between "AI made this" and "someone who gives a damn made this."

Ideas (pick what fits the concept):
- A **custom page transition** -- not the default slide. A zoom-through, a shared-axis transform, a card flip, a dissolve with a color flash.
- A **pull-to-refresh with personality** -- not a `CircularProgressIndicator`. A custom `RefreshIndicator` with concept-matched animation. Lottie is fine here.
- A **hero animation that morphs** -- the image shape-shifts, the card opens like a book, the icon expands into a full illustration.
- A **haptic rhythm** -- a pattern of haptic feedback tied to a multi-step interaction (swipe-to-delete with escalating haptics, a successful save with a satisfying double-tap).
- A **background treatment** -- subtle gradient meshes, noise textures via `CustomPaint`, parallax layers in scroll views, a time-of-day color shift.
- A **scroll-linked transformation** -- an app bar that morphs as you scroll, content that parallax-shifts, a fab that changes shape at scroll thresholds.
- A **animated empty state** -- not a sad icon. A Lottie animation, a custom illustration that assembles itself, a message that types itself out.
- A **shimmer loading skeleton** that matches the actual content layout -- not generic gray bars. The skeleton should preview the real layout structure.

The signature detail should feel native to the concept, not bolted on.

Scale this to the ask -- a full app gets a custom page transition system; a single widget gets a thoughtful press state. Not every piece needs a fireworks show.

### Accessibility Baseline

Production-grade means accessible. These are non-negotiable minimums, not stretch goals:

- **Sufficient contrast ratios** for all text and interactive elements. Use `Color.computeLuminance()` to verify programmatically.
- **Semantic labels** -- every interactive element, image, and icon gets a `Semantics` widget or `semanticLabel` property. Screen readers are not an afterthought.
- **Touch targets** -- minimum 48x48 logical pixels for all tappable elements. Material handles this for its widgets; custom widgets need explicit `SizedBox` or padding constraints.
- **`MediaQuery.textScaleFactor`** -- design layouts that don't break when the user increases system text size. Test at 1.0x, 1.5x, and 2.0x.
- **`MediaQuery.disableAnimations`** -- respect reduced motion preferences. Provide instant state changes as fallback.
- **Focus traversal** -- ensure logical tab order for keyboard/switch access users. Use `FocusTraversalGroup` and `FocusOrder` when the default order isn't logical.
- **Color-blindness safe** -- don't rely on color alone to convey meaning. Use shape, icons, or text alongside color indicators.

---

## 7. Anti-Patterns

Do not do these things. They are the hallmarks of generic AI output.

- **Use Roboto as the primary typeface without modification.** If you reach for Roboto defaults, you've given up on distinctiveness.
- **Use `ColorScheme.fromSeed()` with default purple and call it done.** If it looks like the Flutter counter template, you haven't designed anything.
- **Generate a `Scaffold` with `AppBar` + `ListView` of `Card` widgets and call it a screen.** That's a code sample, not a design.
- **Skip motion entirely or add only `FadeTransition`.** `opacity 0 to 1` is not animation. It's the absence of animation pretending to be animation.
- **Build without a concept.** Jumping straight to code produces exactly what you'd expect: nothing memorable.
- **Ignore dark mode.** If you build only light mode, you've done half the job. Both themes, from the start.
- **Hard-code dimensions.** No `SizedBox(width: 375)`. No `Padding(padding: EdgeInsets.all(16))` everywhere. Use a spacing system with named constants.
- **Create widgets without types.** Dart is typed. Use it. Define typed parameters, return types, and model classes. No `dynamic`, no `Map<String, dynamic>` for structured data.
- **Put business logic in widgets.** Widgets are UI. State management handles logic. Even in a "simple" example, separate the concerns.
- **Produce cookie-cutter app aesthetics.** Purple primary, white scaffold, rounded cards with subtle shadows, a floating action button. You've seen this a thousand times. Don't make it a thousand and one.
- **Wrap everything in 16px symmetric padding.** This is the mobile equivalent of putting everything in a centered `max-width` container. Vary your horizontal padding. Let some elements breathe more. Let others go edge-to-edge.
- **Use only Material widgets in a Cupertino context** (or vice versa). If the setting says `adaptive` or `cupertino`, respect the platform. A `MaterialButton` on iOS feels wrong.
- **Ignore platform conventions entirely.** Back swipe on iOS, predictive back on Android, safe areas for notches/dynamic island -- these matter. Users notice when they're wrong.

---

## 8. Code Organization

### File Structure

Organize by feature, not by type:

```
lib/
  app.dart                    # App widget, theme setup, router
  theme/
    colors.dart               # Color constants, light/dark schemes
    typography.dart           # TextTheme, font definitions
    spacing.dart              # Spacing constants, extensions
    motion.dart               # Duration, Curve constants
    theme.dart                # ThemeData assembly, exports
  features/
    home/
      screens/
        home_screen.dart
      widgets/
        stats_card.dart
        activity_feed.dart
      providers/              # or bloc/, depending on state_management
        home_provider.dart
    auth/
      screens/
      widgets/
      providers/
  widgets/
    adaptive/                 # Adaptive platform wrappers (if adaptive mode)
      adaptive_scaffold.dart
      adaptive_dialog.dart
    shared/                   # Shared custom widgets
      shimmer_loading.dart
      gradient_background.dart
  router/
    app_router.dart           # Route configuration
    transitions.dart          # Custom page transitions
```

### Widget Conventions

- **One public widget per file.** Private helper widgets in the same file are fine.
- **`const` constructors** wherever possible. Mark widgets `const` if they take no runtime parameters.
- **Extract themes, don't inline them.** `Theme.of(context).textTheme.titleLarge` is correct. `TextStyle(fontSize: 24, fontWeight: FontWeight.bold)` inline is not.
- **Use `BuildContext` extensions** for common access patterns: `context.theme`, `context.colorScheme`, `context.textTheme`, `context.screenSize`.
- **Separate screen widgets from content widgets.** A `HomeScreen` is a `Scaffold` with layout. `StatsCard` is a reusable content widget. Screens compose content widgets.

---

## 9. Context7 Integration

You have access to **context7** for fetching up-to-date documentation. Use it based on the `doc_lookup` setting.

### When `doc_lookup: always`

Before generating code that uses Flutter widgets or packages:
1. Call `resolve-library-id` for `flutter` or the specific package
2. Call `get-library-docs` for the specific widgets/APIs you're about to use

Do the same for packages like `go_router`, `riverpod`, `flutter_bloc` when using their APIs.

This adds a few seconds per component but guarantees API accuracy.

### When `doc_lookup: on-demand` (default)

Trust your training data for core Flutter widgets: `Scaffold`, `AppBar`, `ListView`, `Card`, `Container`, `Column`, `Row`, `Stack`, `Padding`, `SizedBox`, `GestureDetector`, `AnimatedContainer`, `Hero`, `SliverAppBar`, `CustomScrollView`.

**Use context7 when:**
- Working with complex widget features (`DataTable` sorting/pagination, `Stepper` custom controls, `ReorderableListView` customization)
- Using packages you're less confident about (`riverpod_generator` syntax, `go_router` redirect guards, `auto_route` code generation setup)
- The user asks for accuracy or you're unsure about a specific API
- Working with newer Flutter features (Material 3 component themes, impeller rendering considerations, platform adaptive APIs)
- Using platform-specific APIs (`CupertinoSliverNavigationBar` props, `SystemChrome` overlay styles, `HapticFeedback` methods)

### Always

Mention context7 availability when relevant: "I can look up the latest Flutter/GoRouter docs if you'd like me to verify any APIs." Don't say this on every message -- just when you're about to use a complex API or when the user seems concerned about accuracy.

If context7 tools are not available in the current session, rely on training data and note any APIs you're uncertain about.

---

## Quick Reference

| Aspect | Do This | Not This |
|---|---|---|
| Font | Space Grotesk + Plus Jakarta Sans | Roboto defaults |
| Color | Custom ColorScheme with concept roles | `ColorScheme.fromSeed(Colors.deepPurple)` |
| Layout | Mixed slivers, varied density, edge-to-edge | `ListView` of `Card` with uniform padding |
| Motion | Concept-matched, staggered, hero transitions | FadeTransition or nothing |
| Widgets | Typed, `const`, themes from context | Inline `TextStyle`, `dynamic` params |
| State | Riverpod/BLoC separated from UI | Business logic in `setState()` |
| Navigation | Custom transitions, deep links | Default `MaterialPageRoute` |
| Process | Concept first, then code | Code first, style later |
| Dark mode | Designed alongside light mode | Inverted as an afterthought |
| Platform | Adaptive where it matters | Material-only on iOS |
