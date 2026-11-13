# 05 — Roadmap

Milestones are sequential. Each one ends with something demoable on a device and a written
exit criterion — do not start the next until it is met.

## M0 — Foundations (0.5 week)

Scope:
- Install `expo-sqlite`, `expo-localization`, `expo-haptics`, `expo-notifications`,
  `react-native-svg`, `expo-local-authentication`, `expo-file-system`, `expo-sharing`,
  `expo-image-picker` via `npx expo install`.
- Create `src/lib/db` (connection, migration runner, migration 001 full schema),
  `src/lib/domain` (money/date/period helpers + tests), `src/lib/theme`.
- Bundle **Geist** (`assets/fonts/`, OFL) and load it with `expo-font` behind the splash; verify
  amounts use tabular figures on both platforms.
- Commit the reference data: `src/constants/countries.ts`, `currencies.ts` (ISO 4217 with
  exponent), starter categories; `lib/format/money.ts` with an `Intl`-free fallback.
- Root `_layout.tsx`: providers, DB init, splash hold, theme, font scaling.
- Dev build on one iOS and one Android target.

Exit: `npx tsc --noEmit` and `npx expo lint` pass; fresh install creates the DB and a seeded
set of categories; opening the app twice does not duplicate seeds.

## M1 — Core loop (1–1.5 weeks)

Scope:
- Add-transaction modal (expense + income + transfer), native numeric amount field, category chips,
  **item name field with recent-name suggestions**, note/place/tags behind the details row,
  account/date selection, validation, optimistic save, undo.
- Transactions tab: grouped list, search over item/place/note/category, filters, edit, delete.
- Accounts CRUD; categories CRUD (reorder, archive, icon/color).
- Onboarding step 2: **country → currency picker** (`settings/region.tsx` shared) with
  `expo-localization` defaults; currency-aware formatting everywhere.
- Onboarding step 3 (starter categories, optional overall budget) lands here or in M2 once
  budgets exist; the budgetless path must still finish.

Exit: 20 transactions can be entered and edited entirely offline in under 3 minutes total;
no duplicate on double-tap; deleting and undoing restores the exact row; back navigation
preserves scroll position.

## M2 — Meaning (1–1.5 weeks)

Scope:
- Period math (weekly/monthly/yearly, anchored), budgets CRUD, progress states.
- Safe-to-spend computation + breakdown sheet + Home hero.
- Insights: category breakdown, 6-month trend, top items (by item name), 2 text insights.
- Home assembly (hero, budget rows, recent list, empty state, FAB).

Exit: unit tests for period boundaries, DST, leap years, month-end recurring bills, and
overspend clamp all pass; safe-to-spend on Home matches the breakdown sheet to the cent;
10k seeded rows keep Insights under 50 ms.

## M3 — Habit (1 week)

Scope:
- Recurring rules: create/edit/list, auto-post on foreground, reminders via local
  notifications, missed-occurrence backfill.
- CSV export + full JSON backup/restore + reset.
- Dark mode polish, accessibility pass, empty/error/loading states, haptics.
- Performance pass: cold start, list scroll, chart render.

Exit: a full month of recurring bills posts exactly once each; export→spreadsheet→re-import
round-trips; dark mode has no unreadable surfaces; VoiceOver/TalkBack can log a transaction
end-to-end.

## M4 — Release 1.0 (0.5 week)

Scope:
- App identity: real name, icon, splash, store screenshots, listing copy.
- Privacy policy stating local-only storage and no analytics in v1.
- EAS build (`production` profile), TestFlight/internal track, crash reporting decision.
- Data-loss safeguards documented in-app ("your data lives on this device").

Exit: store-ready builds on both platforms; fresh install → onboarding → first transaction →
export works on a clean device; no console errors; Expo Doctor clean.

---

## 1.1 (post-launch, prioritize by telemetry)

Candidate set, pick 4–6:
- Receipt photo attach (and OCR if attach usage is high)
- Auto-categorization from item-name/place rules + history
- Top places leaderboard (once `place` coverage is high enough to be meaningful)
- Full country/currency metadata (localized names, flags from a sprite set)
- Exchange rates + multi-currency totals (needs a rate source, a rate cache and a
  "which rate was used" record — explicitly out of v1)
- Subscription detector view
- App lock (biometrics) + automatic cloud-drive backup
- Saved filters / custom reports
- Home-screen widget showing safe-to-spend
- Goals / savings targets
- Tag management UI
- Import from other trackers' CSV

Gate: at least two weeks of v1 usage data before adding features; fix retention issues first.

## Later / separate projects

Each of these is bigger than the whole v1 app and needs a business decision:
- Bank sync via an aggregator (coverage, per-user cost, compliance, webhook maintenance)
- Accounts + cloud sync + household sharing (backend, auth, conflict resolution, encryption)
- Natural-language entry / chat querying (parser first, model second)
- Apple Watch / Live Activity / Siri intents
- Web dashboard

## Sequencing rules

1. Never build a feature whose data model is not in `02-data-model.md`.
2. Never ship a screen that lacks empty, loading and error states.
3. Budget 20% of every milestone for polish and edge cases — it is always needed.
4. Any new dependency must be installable with `npx expo install` and must not require
   launching a second process for the app to work.

## Definition of done (every task)

- Typecheck and lint clean.
- Money math covered by a pure-function test when it touches `lib/domain`.
- Works offline with airplane mode on.
- Works in both themes; text scales without clipping.
- Destructive actions reversible or explicitly confirmed.
- Blueprint updated if behavior or schema changed.
