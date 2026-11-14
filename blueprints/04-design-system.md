# 04 — Design System

Tokens live in `src/lib/theme/tokens.ts`; components read them through `useTheme()`. Feature
components never hard-code a colour.

The interface follows the iOS HIG rather than a decorative style: **opaque system surfaces hold
content, translucent material is reserved for the navigation/control layer, and colour is used
sparingly.** Apple is explicit that Liquid Glass belongs to tab bars, toolbars and navigation
elements — not to lists, cards or table cells — and that applying it to content creates a
confusing hierarchy. Decorative gradients, glows and ambient colour behind content were removed
for exactly that reason. The P1–P6 mockups under `blueprints/designs/mockups` are historical.

## Brand

- Name: **Suffice** (*suh-FYSE*, the verb "to be enough"; not an acronym). Defined in About.
- Personality: calm, precise, quiet. The interface recedes; the number leads.
- Accent: **forest** — `#17614A` light, `#5FD3A3` dark, with `#2E8A66` as the second tone. It
  marks links, the selected tab, and one filled primary action per screen. It is not used as a
  background wash. Purple was the previous accent; it read as a generic app template against white
  cards, which is why the palette moved to warm paper and deep green.
- Categories use the earth tone ramp (forest, clay, ochre, plum, teal, indigo-slate) as a glyph
  tint on a 10–14% tile. A category colour never fills a card.
- No emoji in chrome. Tab, header, row, category and settings glyphs are stroke SVG on one grid.

## Layers

| Layer | Holds | Surface |
| --- | --- | --- |
| Navigation / controls | Floating tab bar, sheets, add button | `GlassView` on iOS 26; translucent capsule and `Glass` overlays elsewhere |
| Content | Text, cards, lists, charts | Opaque system background (`surface`, `bg`, `surfaceMuted`) |

Rules:

- **No glass behind text or numbers.** Sections are `Card` (opaque, borderless). On iOS the tab
  bar is the system's own; `Glass` is only for transient overlays and has no sheen or tint.
- **No gradients on content.** The hero is a flat `ink` (`#121317` light, `#1A1C22` dark) block.
- Depth comes from a warm canvas and hairline edges; cards cast no shadow at all. Only floating
  chrome is lifted: `shadow.sheet`, `shadow.fab` and the coloured `shadow.button` under a filled
  glass capsule.
- The canvas carries a faint vertical wash (`#F7F3E9` → `#EDE6D6` light, `#0E1310` → `#080B09`
  dark) so the flat surfaces sit on something. No colour blooms, no blobs.

## Color tokens

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `bg` / `bgTop` / `bgBottom` | `#F3EEE2` / `#F7F3E9` / `#EDE6D6` | `#0B0E0C` / `#0E1310` / `#080B09` | Screen canvas and its wash |
| `surface` | `#FFFFFF` | `#141913` | Cards, grouped list — pure white, so cards read as placed on paper rather than dissolving into it |
| `surfaceMuted` | `#F3EEE2` | `#1A201A` | Pressed rows, fills |
| `surfaceSunken` | `#E9E2D1` | `#232A22` | Tracks, wells |
| `border` | `#E3DCCB` | `#262E26` | Hairline separators |
| `cardBorder` | `rgba(20,23,19,.09)` | `rgba(255,255,255,.09)` | The hairline that replaces card shadows |
| `textPrimary` | `#121613` | `#F2F1EA` | Titles, amounts |
| `textSecondary` | `#5B615A` | `#A3AB9F` | Labels, subtitles |
| `textTertiary` | `#8B9088` | `#6F776C` | Placeholders, disabled |
| `accent` | `#17614A` | `#5FD3A3` | Links, selected tab, controls |
| `accentSoft` | `#E2EFE7` | `#12291F` | Selected chip / segment |
| `accentTop` / `accentBottom` | `#2F8C69` / `#114E39` | `#6ADFAF` / `#2E8F68` | Glass capsule gradient |
| `accentRim` / `specular` | `rgba(255,255,255,.26)` / `.34` | `rgba(255,255,255,.22)` / `.30` | Glass edge and highlight |
| `income` | `#16704F` | `#4FD39B` | Money in only |
| `warning` | `#B0781F` | `#F0BE63` | 80% threshold |
| `danger` | `#BC4B2E` | `#FF8A70` | Deletion, overspend |
| `ink` | `#151A16` | `#1A201A` | Hero card |
| `onInk` / `onInkMuted` | `#FFFDF8` / 72% | `#F2F1EA` / 72% | Text on the hero |
| `solid` | `#151A16` | `#F2F1EA` | Selected chip |
| `transfer` | `#8C5A8F` | `#C08BC3` | Transfers (never counted as spend) |
| `tabBar` / `sheet` | `rgba(255,253,248,.92)` / `#FFFFFF` | `rgba(20,25,19,.92)` / `#141913` | Chrome only |
| `scrim` | `rgba(13,18,15,.45)` | `rgba(0,0,0,.60)` | Sheet dimming |

**Amount colour rule:** expenses are `textPrimary`; direction comes from the `−`/`+` sign and
`income` green. Red always means something is wrong.

## Typography

**Typeface: Urbanist** (OFL) via `@expo-google-fonts/urbanist` and `expo-font`; splash held until
loaded. React Native cannot choose a weight inside one custom family on Android, so each weight is
registered as its own family (`Urbanist_400Regular`, `500Medium`, `600SemiBold`, `700Bold`) and
every type token names the face it needs. Amounts set `fontVariant: ["tabular-nums"]`. Hero and
total amounts also set `adjustsFontSizeToFit` with a 0.7 minimum, so a long currency string shrinks
instead of colliding with its unit.

| Token | Size / line height | Weight | Tracking | Use |
| --- | --- | --- | --- | --- |
| `hero` | 40 / 44 | 700 | −1.2 | Safe-to-spend |
| `display` | 34 / 40 | 700 | −1.0 | Detail amount |
| `amountXL` | 48 / 52 | 700 | −1.6 | Add-sheet amount |
| `total` | 30 / 36 | 700 | −1.0 | Budget total |
| `title1` | 34 / 41 | 700 | −0.8 | Large screen title |
| `title2` | 22 / 28 | 700 | −0.5 | Sheet title |
| `title3` | 20 / 25 | 600 | −0.4 | Large inline values |
| `body` | 17 / 22 | 400 | −0.2 | Rows and prose (iOS body) |
| `bodyStrong` | 17 / 22 | 600 | −0.3 | Row titles |
| `label` | 16 / 21 | 600 | −0.1 | Buttons, values, chips |
| `eyebrow` | 13 / 18 | 500 | 0 | Pre-titles (plain case) |
| `caption` | 13 / 18 | 400 | 0 | Helper text |

Rules: one large title per screen, no eyebrow stacked above it on tab roots except the month /
currency context line. Section headers are 13 pt semibold secondary grey in sentence case
(`SectionHeader`), aligned with the text inside the card. Respect text scaling; cap the hero at
1.3×.

## Shape, depth, spacing

- **Radii**: cards `12`, hero `18`, sheets `28` (top), buttons and chips `999`, inputs `12`,
  icon tiles `10`. Past ~16 a card stops reading as a surface and starts reading as a web panel;
  `16` was tried and still looked like a template.
- **Depth**: content is flat. Cards are an opaque fill plus a one-hairline `cardBorder`; no card
  or chip casts a shadow, because a soft shadow under every white card is the single most
  template-looking pattern in mobile UI. Lift is reserved for things that actually float —
  `shadow.sheet` on sheets, `shadow.fab` on the add button, `shadow.glass` on the tab capsule where
  the system material is unavailable.
- **Spacing**: 4-pt grid, gutter `20`, card padding `16`, card gap `12`, section rhythm `22 / 7`.
- **Touch targets**: 44×44 iOS, 48×48 Android. List rows are `≥ 50` high.
- Screens scroll under the tab bar and add `TAB_BAR_CLEARANCE` bottom padding.

## Components

`Card` (flat `surface | muted | ink` with a hairline edge), `Glass` (native `GlassView` on iOS 26,
fallback material elsewhere; chrome only), `TactilePressable` (spring squish + selection haptic +
press flash; every tappable surface uses it), `Button` (tinted glass capsule on every platform: accent
vertical gradient, specular that fades through three stops so there is no band where it ends, a
single hairline rim, soft coloured shadow, spring press; plain accent secondary, tinted clay
destructive),
`ChoiceChip` (hairline outline when idle, ink fill when selected),
`SectionHeader` (13 pt semibold grey, sentence case, 16 pt inset so it lines up with the text inside the cards), `ListRow` (50 pt,
inset separator, chevron), `SettingsRow` (saturated tinted glyph tile + value + chevron), `Sheet`
(34 pt top radius, grabber, solid sheet), `MonthSelector` (bordered pill, ink chevrons), `ProgressBar`,
`ProgressRing`, `Money`, `CategoryTile`, `AppIcon`, `CategoryIcon`, `SettingsIcon`,
`FloatingTabBar` (glass capsule, spring selection pill, side add button), `SpendBars` (Overview
month trend: seven-day buckets, accent bars, dashed average hairline).

Every interactive element carries `accessibilityRole`, a full label, and selection state.

## Navigation chrome

- **Tab bar**: a floating capsule, inset `12` from the sides and `6` above the home indicator,
  `62` tall, holding the four destinations. Selection is a spring-animated accent-tinted pill;
  the add action is a separate 52 pt accent circle floating above the trailing end, so it never
  competes with navigation. That is the shape iOS 26 gave its system bar (Liquid Glass, floating
  over content). On iOS 26 the capsule is a real `GlassView`; elsewhere it falls back to the
  `tabBar` colour with a hairline edge and `shadow.glass`. It overlays content, so screens pad by
  `TAB_BAR_CLEARANCE`; nothing is welded to the screen edge.
- **Motion**: everything that moves uses one of two springs from `lib/motion.ts` — a short
  contraction on touch-down and a slower settle on release. Tab switches are instant, like an iOS
  tab bar: each screen paints its own full-bleed gradient, so a page-level slide or fade drags the
  background with it and reads as a panel sliding over the app — and re-compositing that gradient
  every frame stutters. The tab capsule springs into place, its selection pill springs between
  slots, progress bars and Overview's spend bars grow on springs (bars staggered 35 ms), and the
  add button springs on press. Nothing eases linearly over a fixed duration, nothing bounces for
  decoration, nothing animates on scroll.
- **Headers**: 20 pt gutter, one large title, trailing 36 pt hairline circle for Settings.
  Detail routes use the native stack header with a transparent background.
- **Add button**: flat `accentFill` circle, 52 pt, above the bar, no glow.
- **Sheets**: full width, 34 pt top corners, grabber, solid `sheet` background, scrim, keyboard
  translated by `Sheet` itself.

## Motion

Reanimated 4, springs by default: press `{damping 22, stiffness 340, mass .5}`, release
`{15, 240, .7}`, settle `{20, 190, .9}`. Timing is reserved for the two things that are not
physical — the 90 ms press flash and the undo window (`4 s`). Nothing on scroll-critical lists;
never delay the keyboard or Save; respect `reduceMotion`.

## Haptics

Selection on chip/tab; success on save; warning on delete and on crossing 100% (once per period).
All through `lib/haptics.ts`.

## Copy & tone

Second person, no shaming, no exclamation marks. Amounts always with currency. Name the entry
before the category. State mixed currencies plainly. Empty states describe the next action.
Estimates say so.

## Accessibility

- WCAG AA contrast in both themes; system label colours on system backgrounds.
- Hero amount is one accessible node, read through `formatMoneySpoken`.
- Charts and rings expose text equivalents; colour is never the only signal.
- Dynamic type to 200% does not clip the add sheet, budget rows or tab labels.
- Reduce-motion and reduce-transparency honoured; glass falls back to an opaque fill.
- Web keeps pressable roles and keyboard access.
