# 06 — Decisions, Risks, Open Questions

## Architecture Decision Records

### ADR-001 — Local-first SQLite, no backend in v1
**Status:** accepted.
**Context:** The target user tracks personal money on one device. A backend adds auth, sync,
conflict resolution, hosting cost and a privacy story before any product value exists.
**Decision:** `expo-sqlite` is the source of truth; no accounts, no network calls for core flows.
**Consequences:** instant reads, trivial privacy claim, works offline. Cost: no multi-device,
no automatic backup — must be mitigated with export/backup before scale.

### ADR-002 — Money as integer cents
**Decision:** all amounts are `INTEGER` cents; formatting happens only at the edge.
**Consequences:** no float drift, no rounding surprises in sums. Input parsing must convert
once and validate.

### ADR-003 — Store both `occurred_at` and `local_date`
**Decision:** bucket periods by the local-date snapshot taken at entry.
**Consequences:** correct month attribution across timezones/DST; an extra column and the
discipline to set it everywhere (enforced by repository helper + `CHECK` constraint).

### ADR-004 — One `transactions` table for expense/income/transfer
**Decision:** type discriminator plus a nullable `transfer_account_id`.
**Consequences:** single index set and simple queries; requires every report to filter
`type='expense'` — documented as an invariant and covered by tests.

### ADR-005 — Expo Router file routes, feature code outside `src/app`
**Decision:** routes are thin; logic lives in `src/features` and `src/lib`.
**Consequences:** typed routes stay usable, screens stay testable, no accidental route files.

### ADR-006 — No global state library initially
**Decision:** SQLite live queries + small contexts for theme/settings.
**Consequences:** fewer deps, no cache invalidation bugs. Revisit if cross-screen derived state
starts duplicating.

### ADR-007 — Hand-built SVG charts
**Decision:** `react-native-svg` + small chart components instead of a chart library.
**Consequences:** full control over tokens/accessibility, no bundle bloat; costs ~1 day of work.

### ADR-008 — Deterministic rules before ML for categorization
**Decision:** `category_rules` table (item name contains/equals, place contains/equals, note
contains) + recent-history defaults.
**Consequences:** explainable, instant, testable, zero cost. ML only when there is evidence it
is the bottleneck. Rules run against the words the user actually typed, so they get better as
item names get used.

### ADR-010 — Entry starts from an explicit action; the app never opens into an input
**Status:** accepted (revision after design review).
**Context:** An earlier draft measured entry "from cold open" and pre-focused the amount field
on the empty home state. Reviewing it surfaced a real flaw: an app that greets you with a keyboard
feels like a data-entry form, invites accidental input, and makes the first screen feel like it
is demanding something before the user has decided to log anything. Speed is not worth that.
**Decision:** Home is always the launch screen. No keyboard or add sheet is mounted on
launch or resume. The add sheet opens only from the + button, a home-screen shortcut, or an
explicit deep link. The 5-second budget is measured from tapping + to a saved transaction.
**Consequences:** the first tap is always the user's, not the app's; the entry-speed metric is
honest about what it measures. Cost: one extra tap compared with auto-entry, which is the
correct trade for a screen that is for orientation, not typing.

### ADR-009 — Recurring items post on foreground, not via background tasks
**Decision:** on app foreground, post due occurrences idempotently and reschedule reminders.
**Consequences:** no background-task complexity; entries may appear late if the app is unused —
acceptable because the user has not been looking anyway.

### ADR-011 — Money is stored in the currency's minor unit, not in cents
**Status:** accepted (replaces the earlier "integer cents" rule).
**Context:** Adding a country/currency choice made the old rule wrong the moment a user picks
JPY (0 decimals), KRW (0) or KWD (3). `amount_cents` would either force fake subunits or a
second amount column per exponent.
**Decision:** columns are `*_minor INTEGER` and every money row stores its ISO 4217 `currency`.
The decimal count comes from `src/constants/currencies.ts` (`exponent` 0 | 2 | 3). Parsing and
formatting convert exactly once, at the edge, via `lib/domain/money.ts`.
**Consequences:** one code path for every currency, no float drift, exports serialize with the
row's own exponent. Cost: every amount needs its currency available at render time, and a
missing exponent must fail loudly in tests rather than defaulting to 2.

### ADR-012 — An entry has a name, a place and a note (item name is first-class)
**Status:** accepted (replaces the single `merchant` column).
**Context:** "Where did I spend it" (merchant) was doing three jobs: title, search key and
insight dimension. Users think first in *what they bought* — "chicken shawarma" — and the
category alone makes every report read "Food & Drink $412".
**Decision:** `transactions.item_name` (what), `transactions.place` (where), `transactions.note`
(anything else). All optional. List rows and detail titles use `item_name → place → category`;
search covers all three; insights group by item name.
**Consequences:** reports, search and detail become specific without new schema later. Cost:
typing — mitigated by keeping the field optional, one tap away, with recent-name suggestions,
and by never blocking Save on it. Success is measured (≥ 60% of entries named), not assumed.

### ADR-013 — Country and currency are user settings; the app never converts
**Status:** accepted.
**Context:** The app is for people whose currency is not USD, and "cents" plus a hard-coded `$`
was a silent US-only assumption. Bank-style FX would need rates, a rate source, cache and audit
— all v1 non-goals.
**Decision:** onboarding step 2 and Settings → Currency & region pick a country (ISO 3166-1)
and a currency (ISO 4217), defaulted from `expo-localization`. Everything renders in the active
currency with its symbol and exponent. Every money row snapshots the currency it was entered or
budgeted in, and all aggregates filter `currency = active`. Changing the currency never rewrites
or converts stored amounts; the UI states what stays behind.
**Consequences:** honest totals, no FX dependency, works for any country offline. Cost: a
currency switch fragments history visually — accepted, and surfaced with a footnote and a
filtered view rather than hidden. Accounts and transfers are single-currency by construction.

### ADR-014 — One native input surface in the add sheet
**Status:** accepted (revised after device feedback; the custom keypad was removed).
**Context:** A custom keypad plus the OS keyboard created two layouts. Focusing the item name
swapped surfaces, collapsed the sheet and made it drop behind the keyboard when the keyboard was
dismissed and reopened; the extra keypad also looked like a second form.
**Decision:** the amount is a native numeric field (`decimal-pad`, or `number-pad` for
0-exponent currencies). There is no custom keypad. The sheet keeps one stable layout: its body
scrolls, the header and Save stay pinned, and the whole sheet lifts above the keyboard. Numeric
limits live in `sanitizeMoneyInput` and the repository/parser, not in keypad state.
**Consequences:** one input surface, no keypad/keyboard swap, and no layout collapse. Cost: the
amount loses per-key haptics and depends on the platform keyboard's geometry; verify pad type
and sheet lift on both iOS and Android.

### ADR-015 — Bundled Geist typeface instead of the system stack
**Status:** accepted.
**Context:** The system stack made the app look like a form. Money apps live on typographic
confidence, and system faces differ so much across iOS/Android/Web that a single visual spec
was impossible to hold. Geist is a modern grotesque with a real `tnum` feature (tabular figures
without a mono face) and an OFL licence.
**Decision:** bundle `assets/fonts/Geist-Variable.ttf` (variable, 100–900), load it with
`expo-font` behind the splash, and use the same file in the mockup generator. All sizes/tracking
in `04` are tuned to this face.
**Consequences:** identical typography on every platform and in every mockup; amounts align in
columns. Cost: ~170 KB in the bundle and a startup dependency — the splash must be held until
the font resolves, so a font failure cannot produce a blank screen (fall back to the system face
and log locally).

## Risks

| # | Risk | Impact | Mitigation |
| --- | --- | --- | --- |
| R1 | Data loss (phone lost, app deleted, migration bug) | Fatal for trust | Export in v1; automatic backup in 1.1; migration tests on real DBs; never auto-wipe without typed confirmation |
| R2 | Scope creep (bank sync, sharing, AI) delays v1 indefinitely | No launch | Hard non-goals list; roadmap gates; blueprints updated only by explicit decision |
| R3 | Entry friction survives contact with real users | Core promise fails | Instrument taps/time; 5-user hallway test before M2 |
| R4 | Safe-to-spend feels wrong (unexpected bills, irregular income) | Users stop trusting the number | Breakdown sheet, "excludes N bills" transparency, allow excluding categories |
| R5 | Recurring date edge cases (31st in Feb, DST) | Wrong amounts/dates | Pure-function tests, clamp-to-month-end rule documented in code |
| R6 | Timezone drift on travel/backup restore | Transactions in wrong month | `local_date` snapshot; explicit tests |
| R7 | Expo SDK upgrade breaks native modules | Freeze before release | Pin SDK, upgrade only between releases with `expo-doctor` + dev build |
| R8 | Web build (`output: server`) breaks on native-only imports | CI/web failure | Platform-split modules, `.web.tsx` variants, no top-level native calls |
| R9 | Keyboard/amount-input jank on low-end Android | Entry feels slow | One native input surface, stable sheet layout, keyboard-lifted body, fixed Save; ADR-014 keeps one surface |
| R10 | Notification permission denied | Missed bill reminders | In-app "bills due" card as primary, notifications as enhancement |
| R11 | A currency switch silently changes what "spent this month" means | Users lose trust in every number | Per-row currency snapshots, aggregates filtered by active currency, explicit "N entries in USD not included" footnote, confirmation sheet before applying |
| R12 | The new item-name field slows entry down or is always skipped | The wedge breaks and reports stay generic | Field stays optional and one tap away, recent-name chips, save never blocked; measure named-entry rate (≥ 60%) |
| R13 | Currency symbol/decimal data is wrong for a rare currency | Amounts misread by a factor of 100 | `currencies.ts` is a single tested table; unit tests assert exponent handling for 0/2/3-decimal codes; parser rejects more decimals than allowed |
| R14 | `Intl` locale data missing on a device (Hermes ICU is build-dependent) | Garbled or code-only currency strings | `Money` has a tested `Intl`-free fallback built from the static symbol + exponent tables; never call `Intl` unguarded |
| R15 | Bundled font fails to load or blocks the splash | Blank launch or a font swap on first frame | Hold splash until `useFonts` resolves with a timeout; on failure fall back to the system stack, log locally, and never crash; font asset is committed with its OFL licence |
| R16 | Dark mode drifts into a tinted light theme | Low contrast, invisible cards, unreadable amounts | Both themes are mocked up per screen and reviewed (`design-board-dark.png`); dark cards carry an outline because shadows vanish on black; contrast checked on the dark surface, not on white |

## Open questions (need answers before/while building)

1. **App name** — "Expense Tracker" is the repo slug, not a brand. Needed before store assets.
2. **Country/currency set — resolved:** ship both full ISO lists as committed static data
   (`countries.ts`, `currencies.ts`), with the device-detected values pinned first. No curated
   subset: a missing currency is a correctness bug, not a smaller APK.
3. **Income model** — one-off income only in v1, or also expected monthly income used in
   safe-to-spend? (Recommendation: one-off only in v1; expected income in 1.1.)
4. **Budget period default** — calendar month vs payday-anchored month. (Recommendation:
   calendar month default, anchor supported for weekly.)
5. **Negative/refund handling** — refunds as income or as negative expense? (Recommendation:
   `type='expense'` with an optional `is_refund` flag would complicate v1; use income in v1
   and revisit.)
6. **Multi-currency in v1 — resolved:** one active currency at a time; every row snapshots its
   currency; totals never mix; no conversion. Remaining sub-question: should a currency switch
   auto-create a matching account (`Cash (EUR)`), or always ask? (Recommendation: ask once in the
   confirmation sheet, defaulting to yes.)
6b. **Item name vs place in the row title** — resolved to `item_name → place → category`. Open:
   when both exist, should the list subtitle show place before account? (Recommendation: yes
   once `place` coverage passes ~40%.)
6c. **Decimal key for 0-exponent currencies** — hidden entirely (recommended, matches ATMs and
   avoids a dead key) or shown-but-disabled?
7. **Analytics/crash reporting** — none in v1 vs opt-in. (Recommendation: none in v1; local
   counters only, decide after launch.)
8. **Category depth** — free-form nesting or max one level? (Recommendation: max one level.)
9. **Budget rollover** — per-category toggle (in schema) vs always on/off. (Recommendation:
   toggle, off by default.)
10. **Receipts storage** — documents dir with app-managed lifecycle (recommended) vs photo
    library reference (fragile permissions).

## Definition of done (release)

- [ ] All v1 screens from `03-screens.md` implemented with empty/loading/error states.
- [ ] Money/date/period pure functions unit-tested (boundaries, DST, leap year, month-end,
      0/2/3-decimal currencies, mixed-currency exclusion).
- [ ] Country/currency verified end to end: pick Japan → the amount field rejects decimals and
      amounts render `¥`; pick Kuwait → three decimals; switch back → no stored amount changed.
- [ ] Offline-only flow verified on device with airplane mode.
- [ ] Launch and resume verified to show no keyboard or add sheet.
- [ ] Dark mode and 200% text scaling verified on both platforms.
- [ ] CSV export and JSON backup verified on a clean device.
- [ ] `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor` clean.
- [ ] Typed routes compile after all route additions (`.expo/types` regenerated by `expo start`).
- [ ] Store assets, privacy policy and listing copy ready.
- [ ] Blueprints match the shipped code.

## Glossary

- **Active currency** — `settings.currency`; the only currency the app totals, budgets and
  formats in.
- **Committed** — budgeted recurring expense not yet posted, due before period end.
- **Exponent** — decimal places of a currency (USD 2, JPY 0, KWD 3). `amount_minor = amount ×
  10^exponent`.
- **Item name** — free-text "what was it" ("chicken shawarma"); the title of a transaction row.
- **Local date** — `YYYY-MM-DD` in the device timezone at the moment of entry.
- **Minor unit** — the currency's smallest unit (cent, yen, fils); all amounts are stored in it
  as integers.
- **Period** — the active budget window (weekly/monthly/yearly) containing today.
- **Place** — free-text "where it came from" ("Blue Bottle"); never required.
- **Rule** — deterministic item-name/place/note→category mapping used for auto-categorization.
