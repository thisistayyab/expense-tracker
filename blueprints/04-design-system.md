# 04 — Design System

All tokens live in `src/lib/theme/tokens.ts`; components consume them through `useTheme()`.
No hard-coded hex values inside feature components — that is the one rule that keeps dark mode
and future themes from rotting.

## Brand

- Name shown to users: **Expense Tracker** (rename before release; slug/scheme stay technical).
- Personality: **calm, precise, quietly premium.** A warm paper canvas, ink-dark money surfaces,
  one electric iris accent. No gradients on text, no playful mascots, no confetti — but depth,
  glow and large type are welcome on hero surfaces.
- Primary accent: **iris** `#5B5BF7` → `#8E6BF6` (two-stop gradient, 150°). This replaces the old
  flat `#208AEF`; `app.json` splash background moves to `#121317` to match the launch surface.
- The hero of every screen is a **number**. Type does the work that borders used to do.
- Native feel: platform tab behavior, native modals, `expo-symbols` on iOS with Material
  fallbacks on Android, glass only on the floating tab bar — never glass behind numbers.

## Color tokens

Light theme (default), with dark equivalents. Both themes are mocked up for every screen
(`designs/mockups/png/*.png` and `dark-*.png`).

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `bg` (canvas) | `#F4F4F1` | `#0B0C10` | Screen background — warm, never pure grey |
| `surface` | `#FFFFFF` | `#15171C` | Cards, sheets, list groups |
| `surfaceMuted` | `#F2F2EF` | `#1C1F25` | Segmented track, search fill, inset rows |
| `surfaceSunken` | `#EDEDE9` | `#23262D` | Progress tracks, disabled fills |
| `ink` (surface) | `#121317` | `#1A1C22` | Hero cards — dark in **both** themes |
| `solid` (control) | `#121317` | `#F5F5F3` | Active chip/segment/tab fills |
| `solidFg` | `#FFFFFF` | `#0B0C10` | Text on `solid` |
| `border` | `#EDEDE7` | `#262A31` | Hairlines **inside** groups only |
| `cardBorder` | `transparent` | `rgba(255,255,255,.055)` | 1 px card outline; replaces shadows on dark |
| `textPrimary` | `#0F1115` | `#F5F5F3` | Amounts, titles |
| `textSecondary` | `#6C727B` | `#A2A8B2` | Labels, captions |
| `textTertiary` | `#9AA0A8` | `#6E747D` | Placeholders, eyebrows, disabled |
| `accent` | `#5B5BF7` | `#8B8BFF` | Links, selection, focus, FAB |
| `accentAlt` | `#8E6BF6` | `#B49BFF` | Gradient partner, hero glow, ring |
| `accentSoft` | `#EEEEFE` | `#1E1E3A` | Selected pills, insight cards |
| `income` | `#12A150` | `#3ECF7C` | Income amounts only |
| `expense` | `#F0503F` | `#FF7A6B` | Overspend, destructive actions |
| `warning` | `#DE9A24` | `#F2B94B` | 80% budget threshold |
| `danger` | `#F0503F` | `#FF7A6B` | Delete, over-budget |
| `transfer` | `#7C6BF0` | `#A494FF` | Transfers (never counted as spend) |
| `onInk` | `#FFFFFF` | `#F5F5F3` | Text/icons on ink fills |

**Dark mode rules**

- Shadows are nearly invisible on black, so dark cards carry a `cardBorder` 1 px outline *in
  addition* to a deeper shadow. Never ship a dark card with only a shadow.
- The hero stays ink (`#1A1C22`) — it must read as a raised, quieter surface, not a white block.
- Solid controls invert: active chips, segments and the tab pill become **white with ink text**.
  Accent stays for links, selection outlines and the FAB, never for a filled control on dark.
- Tone tiles swap to deep tints (`#242245` iris, `#122A1D` mint, `#2E2411` amber, `#301A16`
  coral, `#142234` sky) while the glyph keeps its hue.
- Status bar and home indicator are light; the modal scrim is `rgba(0,0,0,.6)`.
- The onboarding welcome screen is dark in both themes (a fixed dark surface, not a theme).

Category accent ramp (assigned on create, editable): `#5B5BF7`, `#12A150`, `#DE9A24`, `#F0503F`,
`#2A6FC4`, `#8E6BF6`, `#0E8A8A`, `#B5765A`. Use the ramp color as the glyph at 100% on a 10–12%
tint tile (see `tone-*` in the mockup CSS); never fill a whole card with a category color.

**Amount color rule (changed):** expenses are **ink**, not red. Direction is carried by the
`−`/`+` sign plus `income` green for money in. Coral/red is reserved for *overspend, errors and
destruction*, so a red number always means something is wrong. This makes a screen of normal
spending calm instead of alarming, and makes overspend instantly legible.

Rules: never color a number for emphasis alone; never put a category color on an amount; never
use pure white as a light-theme background (the canvas is warm on purpose).

## Typography

**Typeface: Geist** (variable, weights 100–900, SIL Open Font License). It replaces the system
stack — Geist is a contemporary grotesque with a tall x-height, restrained terminals and a real
`tnum` feature, so amounts line up without a mono face.

- File: `assets/fonts/Geist-Variable.ttf`, licence in `assets/fonts/OFL.txt`.
- Loaded with `expo-font` (`useFonts`, already installed). The splash stays visible until the
  font is ready — never render a frame in a fallback face and swap it (that is the classic FOUT
  flash on launch).
- Registered family name: `Geist`. Feature settings: `ss01` globally, `tnum` on every amount
  (verified: `1111` and `8888` measure identically at 40 px, proportional sans differs).
- Fallback chain `-apple-system, Roboto, sans-serif` only for the failure case where the font
  asset fails to load; log it locally, never crash.

| Token | Size / line height | Weight | Tracking | Use |
| --- | --- | --- | --- | --- |
| `hero` | 52 / 54 | 700 | −1.8 | Safe-to-spend |
| `display` | 42 / 46 | 700 | −1.5 | Detail amount |
| `amountXL` | 54 / 58 | 700 | −2.2 | Add-sheet amount |
| `total` | 34 / 40 | 700 | −1.3 | Budget total |
| `title1` | 31 / 36 | 700 | −0.9 | Screen titles (Activity, Budgets, Insights) |
| `title2` | 23 / 30 | 700 | −0.6 | Detail title, sheet headers |
| `title3` | 17 / 22 | 600 | −0.4 | Month selector |
| `body` | 15.5 / 22 | 400 | −0.2 | Row subtitles, prose |
| `bodyStrong` | 15.5 / 22 | 600 | −0.3 | Row titles, item names |
| `label` | 13 / 18 | 600 | −0.1 | Field labels, chip labels |
| `eyebrow` | 11 / 14 | 700 | +1.3, uppercase | Section labels, screen pre-titles |
| `caption` | 12 / 16 | 400 | 0 | Timestamps, helper text |

Rules: tight tracking only above 20 px, and Geist needs **less** negative tracking than SF did —
do not copy the old −2.8 values, they collide in this face. Respect system text scaling: cap the
hero at ~1.3 with `maxFontSizeMultiplier`, let everything else scale. Amounts must never
truncate: reserve the right edge of every row for the widest realistic currency string
(`KWD 1.250`, `CHF 1,234.50`, `¥12,400`).

## Shape, depth, spacing

- **Radii**: cards `24`, hero cards `28`, sheets `28–32` (top), buttons `28` (full pill),
  chips `17` (pill), icon tiles `14` (sized by `size × 0.33`), inputs `18`.
- **Shadows, not borders — in light mode.** Cards sit on the canvas with
  `0 10px 26px rgba(16,18,23,.07), 0 2px 5px rgba(16,18,23,.04)`. Hairlines are used **inside**
  groups only, inset to the text baseline. Ink cards get a deeper lift (`0 22px 48px`). In dark
  mode those shadows disappear into the canvas, so every card adds a 1 px `cardBorder` outline.
- **Ink hero surfaces** carry a single radial iris glow in the top-right (and a fainter one
  bottom-left). This is the app's signature; at most one per screen.
- Spacing scale: `2, 4, 8, 12, 16, 20, 24, 32, 40` (4-pt grid). Screen gutter `20` (24 on
  tablets); card padding `18`; gap between cards `12`; section header rhythm `16 / 8`.
- Minimum touch target `44×44` iOS, `48×48` Android.

## Signature components (build once, reuse)

`InkCard` (radius 28, glow, one per screen), `Money` (the only place a currency string is
produced — symbol + exponent from the currency table), `AmountHero`, `IconTile` (tinted,
10–12% category color), `CategoryChip` (icon + label, ink when selected), `ProgressBar` (6 px,
rounded, states: normal / warning ≥80% / over), `ProgressRing` (78 px, 7 px stroke, for the
budget total), `AmountKeypad` (`.` hidden for 0-exponent currencies), `TextField`, `FieldRow`,
`SegmentedControl` (ink thumb), `Sheet`, `PickerSheet`, `ListRow`, `DayGroup` (one card per day
with an inset day header), `SectionHeader` (`eyebrow` + accent `See all`), `FloatingTabBar`,
`FAB` (60 px, iris gradient), `EmptyState`, `UndoSnackbar`, `MonthSelector`, `FilterSheet`,
`AreaChart` (SVG, gradient fill), `BreakdownBars`, `ConfirmDialog`, `SkeletonBlock`.

Every list row and chip carries `accessibilityRole`, a full `accessibilityLabel`
("Chicken shawarma, Food and Drink, minus 12 dollars 50, today") and `accessibilityState` for
selection.

## Navigation chrome

- **Floating tab bar**: 64 px tall pill, inset `16` from left/right/bottom, `32` radius,
  `rgba(255,255,255,.9)` + `blur(20) saturate(1.4)` (dark: `rgba(21,23,28,.92)`), soft shadow,
  1 px `cardBorder` in dark. Four destinations:
  **Overview · Activity · Budgets · Insights**. The active tab expands into an ink pill showing
  icon + label; inactive tabs are icon-only. Labels are always in the accessibility tree.
- **FAB**: 60 px, iris gradient, `bottom 96` (tab bar 64 + 16 + 16), `right 20`, glow
  `0 14px 30px rgba(91,91,247,.42)`. Not shown on the empty Home screen, which has an explicit
  primary CTA instead.
- Screens scroll **under** the floating bar; content lists add `bottom: 96` padding so the last
  row is never trapped behind it.

## Motion

Reanimated 4 is installed; keep it purposeful.

| Interaction | Duration | Easing |
| --- | --- | --- |
| Chip / tab select | 140 ms | `easeOut` |
| Ink pill expand (tab) | 220 ms | `easeOutCubic` |
| Sheet present | 280 ms | native sheet |
| Progress bar / ring fill | 420 ms | `easeOutCubic` |
| Hero number count-up | 600 ms | `easeOutCubic`, once per mount |
| Undo snackbar | 4 s visible, 200 ms in/out | `easeOut` |
| Keyboard/keypad swap (add) | 180 ms cross-fade | `easeOut` |

Rules: no animation on scroll-critical lists; nothing may delay the keypad; respect
`reduceMotion` (skip count-up, glow pulse and pill expansion).

## Haptics map

| Event | Haptic |
| --- | --- |
| Keypad digit | `selection` (light) |
| Category chip / tab | `selection` |
| Save success | `notificationSuccess` |
| Undo | `impactLight` |
| Delete | `notificationWarning` |
| Budget crossed 100% | `notificationWarning` (once per period, not per render) |

All haptics go through one `lib/haptics.ts` wrapper so they can be disabled later.

## Copy & tone

- Second person, no exclamation marks, no shaming ("Over budget" not "You failed").
- Amounts always include currency symbol/code; "12.50" alone is never shown.
- Name the entry, not the category, when both exist: "Chicken shawarma" over "Food & Drink".
  Category is context, never the title.
- When two currencies are involved, say so plainly: "12 entries in USD are not included in
  this total." Never imply a conversion happened.
- Empty states describe the next action, not the absence: "Start with one — log your first
  expense to see where your money goes."
- Numbers that are estimates say so: "≈", "excludes 2 bills".

## Accessibility checklist

- WCAG AA contrast on all text, in both themes. The iris accent on `accentSoft` passes; the
  accent on the warm canvas is for ≥16 px bold or ≥3:1 non-text only.
- Screen-reader order matches visual order; the hero number is a single accessible node.
- Money is read with its currency name ("42 dollars 80, US dollars"), not a bare symbol.
- Charts and rings expose a text equivalent; color is never the only signal (signs, labels).
- Dynamic type up to 200% does not clip the add sheet, budget rows or tab pill.
- Reduce-motion, reduce-transparency and the glow fallback (flat ink, no radial) honored.
- Keyboard/switch access works on web (pressables with roles, not unlabeled `Touchable`).
