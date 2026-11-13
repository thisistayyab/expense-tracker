# 01 — Architecture

## Stack (verified against the repo)

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | Expo SDK 58, RN 0.88.1, React 19.3.0 | Already installed |
| Language | TypeScript strict | Already configured |
| Routing | Expo Router 58 (`src/app/`) | Typed routes + React Compiler experiments on |
| Persistence | `expo-sqlite` (~58.0.16) | Local, reactive, offline-first |
| Region & currency | `expo-localization` | Device region/locale → default country + currency; formatting locale |
| UI primitives | RN core + `expo-image`, `expo-symbols`, `expo-glass-effect`, `@expo/ui`, Reanimated 4 | Already installed |
| Typography | `expo-font` + **Geist** variable (`assets/fonts/Geist-Variable.ttf`, OFL) | Same file used by the mockups; tabular figures on money |
| Charts | `react-native-svg` (hand-rolled chart components) | No chart library in v1 |
| Notifications | `expo-notifications` (~58.1.9), local scheduling only | Remote push not needed |
| Haptics | `expo-haptics` | Add when entry flow lands |
| Lock | `expo-local-authentication` | Tier 2 |
| Backup/export | `expo-file-system` + `expo-sharing` | Tier 2 for share, v1 can write a file |
| Camera/OCR | `expo-image-picker` (+ OCR later) | Tier 2 |
| State | No global store in v1; SQLite live queries + small contexts | Add Zustand only if prop drilling hurts |
| Reference data | Committed static tables in `src/constants/` | Countries and currencies ship with the app: offline, no network, no API key |
| Tests | Jest + `jest-expo` (not installed yet) | Pure logic tested first: money, dates, budgets |

Add every native package with `npx expo install <pkg>` so versions stay SDK-compatible.
Adding native modules means the app needs a development build (Expo Go only has bundled
modules) — plan `eas build --profile development` or `npx expo run:ios|android`.

## Layered design

```
src/app/                     routes only (thin screens)
   │
   ├─ src/features/*/         feature UI + hooks (add, transactions, budgets, insights)
   ├─ src/components/         shared presentational components
   ├─ src/lib/db/             connection, migrations, repositories, queries
   ├─ src/lib/domain/         pure functions: money, dates, budgets, safe-to-spend
   ├─ src/lib/theme/          tokens, ThemeProvider, useTheme
   ├─ src/lib/format/         currency / date / number formatting
   └─ src/constants/          countries.ts, currencies.ts, starter categories, account types
```

**Dependency direction (strict):**

```
app → features → components → theme/format
app/features → db/domain → format
```

Nothing imports upward. `lib/domain` stays pure: no React, no SQLite, no `expo-*` imports.
That is what makes money and budget math unit-testable without a device.

## Planned folder layout

```
src/
  app/
    _layout.tsx                  Root: providers, DB init, splash hold, fonts
    (tabs)/
      _layout.tsx                Tab navigator
      index.tsx                  Overview
      transactions.tsx           Activity
      budget.tsx                 Budgets
      insights.tsx               Charts & trends
    add.tsx                      Add transaction (modal)
    transaction/[id].tsx         Detail / edit
    settings/
      _layout.tsx
      index.tsx
      region.tsx                 Country & currency picker (shared with onboarding)
      categories.tsx
      accounts.tsx
      recurring.tsx
      data.tsx                   Export / import / reset
    onboarding/
      _layout.tsx
      welcome.tsx
      region.tsx                 Country → currency (one screen, two pickers)
      first-budget.tsx
  components/                    Shared UI (Money, CategoryChip, TextField, EmptyState, ...)
  features/
    transactions/                hooks + components for list/detail/add
    budgets/                     budget progress, period math
    insights/                    chart components + aggregations
    recurring/                   scheduling + posting logic
    settings/                    region/currency picker logic, preference writes
  lib/
    db/                          client.ts, migrations/, repos/*.ts
    domain/                      money.ts, dates.ts, budgets.ts, safeToSpend.ts
    theme/                       tokens.ts, ThemeProvider.tsx, useTheme.ts
    format/                      money.ts, dates.ts
  constants/
    countries.ts                 ISO 3166-1: code, name, default currency code
    currencies.ts                ISO 4217: code, symbol, name, exponent (0|2|3)
    categories.ts                Starter category set
    accounts.ts                  Account types
```

## Data flow

```
Screen
  └─ feature hook (useTransactions, useSafeToSpend)
       └─ repository (list/create/update/delete, SQL)
            └─ expo-sqlite (single connection, WAL)
```

- Screens never write SQL. Repositories are the only place SQL text lives.
- Writes go through one `withTransaction` helper so multi-table operations (transfer,
  recurring post) are atomic.
- Reads are reactive: after any mutation, the affected query re-emits. Prefer SQLite's live
  query hooks from `expo-sqlite`; **verify the current hook names on the SDK 58 SQLite page
  before wiring them**, since this API surface has changed across SDKs.
- Heavy aggregation (12-month trend, category breakdown) runs in SQL, not JS, so the JS
  thread stays free while the sheet animates.

## Currency and region

The user chooses a **country** and a **currency** once, on onboarding step 2, and can change
either later in Settings → Currency & region. Nothing about money is hard-coded to USD.

```
country (settings.country)  ──default──▶  currency (settings.currency)
        │                                          │
        │                                          ├─▶ <Money> symbol + exponent
        │                                          ├─▶ amount field exponent
        │                                          └─▶ every aggregate's WHERE clause
        └──▶ picker ordering (detected country pinned first)
```

- `src/constants/countries.ts` — every ISO 3166-1 alpha-2 code with an English display name
  and its primary currency code. Static data, committed, no runtime fetch.
- `src/constants/currencies.ts` — every ISO 4217 code with symbol, English name and `exponent`
  (`0` for JPY/KRW/ISK, `2` for most, `3` for KWD/BHD/TND/…).
- Defaults come from `expo-localization`'s `getLocales()[0]`: `regionCode` → country,
  `currencyCode` → currency, `languageTag` → `settings.locale`. If the detected currency is not
  in the table (rare), fall back to the country's currency, then to `USD` as a last resort and
  log it locally.
- Formatting: `lib/format/money.ts` wraps `Intl.NumberFormat(locale, { style: 'currency',
  currency })` and falls back to `symbol + grouped decimal string` built from the exponent when
  `Intl` returns a bare code (Hermes ICU data varies by platform/build). The fallback is the
  tested path — never assume `Intl` works.
- Rounding: parse to minor units with `Math.round(value * 10 ** exponent)` **once**; every
  subsequent operation is integer arithmetic.
- The amount field allows at most `exponent` decimals. `sanitizeMoneyInput` drops extra
  fraction digits and never keeps a separator or fraction for a 0-exponent currency (JPY).
  Input beyond that is ignored, not rounded silently.
- Changing currency **does not convert** anything. Existing rows keep their snapshot; the app
  explains this before applying and offers a filtered view of the other-currency rows.
- Currency and region lists are searchable, grouped (recent / detected / all) and never require
  a network call. They live in the same screen (`settings/region.tsx`) used by onboarding.

## Startup sequence

1. Native splash stays visible (already configured in `app.json`, now ink `#121317`).
2. Load Geist through `expo-font` and keep the splash up until it resolves — never mount the
   first screen in a fallback face and swap it (visible FOUT on every cold start).
3. Open DB, `PRAGMA journal_mode = WAL`, `PRAGMA foreign_keys = ON`.
4. Run migrations from `PRAGMA user_version` to the latest.
5. Load settings (`country`, `currency`, `locale`, onboarding flag) into the settings
   repository. If `country`/`currency` are missing, resolve the device default from
   `expo-localization` and persist it (also covers users who skipped onboarding).
6. If not onboarded → route to `/(onboarding)/welcome`; else `/(tabs)`.
7. Hide splash after the home query has data **and** the font is ready (no blank flash, no font
   swap).

Failure mode: if migrations throw, show a recovery screen offering **Export DB file** and
**Reset local data** rather than silently wiping.

## Navigation map

```
Root Stack
├─ (onboarding)          [first launch only]
│   ├─ welcome
│   ├─ region            country → currency
│   └─ first-budget
├─ (tabs)
│   ├─ index             Overview
│   ├─ transactions      Activity
│   ├─ budget            Budgets
│   └─ insights          Insights
├─ add                   presentation: 'modal'
├─ transaction/[id]
└─ settings/*
    ├─ region            also opened from onboarding
    └─ ...
```

Rules:
- `add` is a **modal** so it can be dismissed with a swipe without losing the list position.
- Tab bar: 4 tabs, no more (Overview · Activity · Budgets · Insights), rendered as a floating
  blurred pill; the active tab expands to show its label. Settings is reached from the Overview
  header.
- Detail screens push on the tab's stack so back returns to the same scroll position.
- Deep links: `expensetracker://transaction/<id>`, `expensetracker://add?amount=...` (price
  parse target), driven by the existing `scheme` in `app.json`.

## Platform notes

- **iOS / Android native dirs**: generated by CNG. Native config (notifications permission
  text, biometric usage strings, splash, icons) belongs in `app.json` and config plugins.
- **Web**: `web.output: "server"` means SSR is on. Any module that touches native-only APIs
  must be guarded or given a `.web.tsx` variant. Do not let web break mobile builds.
- **Dynamic type / accessibility**: respect font scaling; money display must not clip.
- **Time zones**: store UTC instants plus a `local_date` snapshot (see data model) so a trip
  across time zones cannot move last month's rent into this month.
- **Locale data**: never rely on `Intl` alone for currency symbols or decimal places — read them
  from `src/constants/currencies.ts`. Hermes ships different ICU data on Android vs iOS vs web,
  and `Intl.NumberFormat` silently degrades to `USD 12.50`-style output when a locale is missing.
- **RTL and long currency names**: the region picker and amount row must survive `de`, `ar` and
  `ja` strings without truncating the value side of a row.

## Build & release path

| Stage | Command / service |
| --- | --- |
| Dev | `npx expo start` |
| Dev build (native modules) | `npx expo run:ios\|android` or EAS `development` profile |
| Typecheck | `npx tsc --noEmit` |
| Lint | `npx expo lint` |
| Dependency health | `npx expo-doctor`, `npx expo install --fix` |
| Store builds | EAS Build (`eas build -p ios\|android`) |
| OTA | EAS Update, after the first store release |
| Submit | EAS Submit |

`package.json` uses `npm` today (there is a `package-lock.json` and no `bun.lock`), so use
`npx` rather than `bunx`.
