# Suffice — A Complete Guide to the Application

**Document type:** Technical and product overview  
**Application version:** 1.0.0 (launch preparation)  
**Date:** 13 November 2026  
**Primary audience:** developers, reviewers, and readers who want to understand how the app works

---

## Abstract

Suffice is a local-first personal expense tracker for iOS and Android. It is designed to answer two questions quickly: *how much can I safely spend today?* and *where did my money go?* The application stores all financial records in a private SQLite database on the user's device. It does not require an account, does not connect to a bank, and does not contain advertising, analytics, or crash-reporting software.

This document explains the purpose of the application, the behaviour a user sees, the architecture that supports that behaviour, the data model, the central safe-to-spend calculation, the privacy and security model, the quality checks used during development, and the build and release process. It also states the current limitations so that the description remains accurate rather than promotional.

---

## The name and its meaning

**Suffice** is pronounced *suh-FYSE* (/səˈfaɪs/). It is an English verb meaning "to be enough or adequate for a purpose." It is not an acronym, and it is spelled s-u-f-f-i-c-e.

The name is the product's promise in one word. The application does not attempt to record every financial detail or to present the largest possible dashboard. It attempts to tell a person what is *enough* for the day, and to stop there. The same idea governs the safe-to-spend number: once the bills, the budget and the money already committed have been set aside, the amount that remains is, by definition, sufficient for the day. The app promises that number and nothing more.

The name also sets a limit on the product. "Enough" is not a claim of wealth, prediction or advice, and Suffice does not make those claims. It is a private record of what a person has spent and a calm estimate of what they can still spend.

---

## 1. Introduction

### 1.1 The problem

Most expense trackers fail in one of two ways.

First, **capturing an expense is slow**. A user may need to open several screens, complete many fields, and choose a category before saving a small purchase. When entry takes too long, people stop recording their spending within a few weeks.

Second, **the app reports the past but does not guide the present**. A monthly chart can show where money went, but it does not answer the practical question a person asks before buying dinner: *can I afford this today?*

### 1.2 The aim

Suffice is built around two commitments:

1. Recording an expense should take only a few seconds.
2. The home screen should show one honest number that describes what remains safe to spend.

All other features support these two commitments or remain optional.

### 1.3 Scope of version 1.0

Version 1.0 includes manual entry, accounts, editable categories, search and filters, budgets, safe-to-spend, spending insights, recurring bills with local reminders, CSV export, JSON backup and restore, app lock, dark mode, and onboarding with country and currency selection.

It deliberately excludes bank connections, user accounts, cloud synchronisation, shared household budgets, currency conversion, receipt OCR, and artificial-intelligence features. These exclusions are product decisions, not missing implementation details.

---

## 2. Summary of the application

| Property | Description |
| --- | --- |
| Name | **Suffice**, pronounced *suh-FYSE* (/səˈfaɪs/); from the verb meaning "to be enough" |
| Product type | Local-first personal expense tracker |
| Platforms | iOS and Android; a web build exists for development and review |
| Framework | Expo SDK 58 with React Native 0.88.1 and React 19.3.0 |
| Language | TypeScript, strict mode |
| Storage | SQLite on the device, using `expo-sqlite` |
| Navigation | Expo Router with file-based routes |
| Account required | No |
| Network required | No |
| Bank connection | No |
| Analytics or crash SDK | None |
| Price model | Free, with no in-app purchases in version 1.0 |
| Primary currency rule | One active currency at a time; no conversion |

The repository keeps the technical name `expense-tracker` for the slug, `expensetracker` for the URL scheme, and `expense-tracker.db` for the database file. Only the user-facing name is Suffice. This separation avoids unnecessary migrations and keeps internal identifiers stable.

---

## 3. Target user and design principles

### 3.1 Target user

The primary user is one person tracking their own money on one phone. They want cash-flow awareness rather than formal accounting. They may have cash, a bank account, and one or two cards, together with recurring bills such as rent or a phone plan. They are unwilling or unable to connect a bank account, and they prefer their financial data to remain on their device.

The application is not designed for accountants, freelancers who need invoicing, households with shared budgets, or business expense reporting.

### 3.2 Design principles

The implementation follows ten principles:

1. **Logging beats reporting.** A feature that adds taps to entry is rejected.
2. **One number, then detail.** The home screen shows safe-to-spend; deeper information is one tap away.
3. **Local-first.** The device database is the source of truth. Synchronisation, if added later, must never be required for the app to work.
4. **No forced categories.** Users may rename, recolour, archive, and reorder the starter categories.
5. **Undo over confirmation.** Deleting a transaction is reversible for a short period instead of requiring a modal dialogue.
6. **Explain the mathematics.** Any computed figure can be inspected.
7. **Boring money handling.** Amounts are integers in minor units, dates are explicit, and floating-point arithmetic is avoided.
8. **Platform-respectful design.** Native navigation, native gestures, haptics, correct dark mode, and correct safe areas are required.
9. **Never open into an input.** The app never launches or resumes with a keyboard or the add sheet visible.
10. **One currency at a time.** Every amount is stored with the currency used at entry, and totals never mix currencies.

---

## 4. How a person uses the application

### 4.1 First launch and onboarding

On first launch, the app opens a dark welcome screen that explains the product in one sentence. The user then completes two short steps:

1. **Country and currency.** The device region and currency are detected automatically and placed first in the list. The user may change either value. The two selections are independent, which supports expatriates and people who earn in a currency different from their country's currency.
2. **First budget.** The user may enter an overall spending limit for the month, or skip this step.

Completing onboarding writes the country, currency, locale, an account in that currency, and the optional budget in a single database transaction. Starter categories are seeded when the database is first created, so the category library exists even if the user skips onboarding. It then marks onboarding as complete and opens the main tabs. If the process is interrupted, no partial setup is left behind.

The starter library contains twelve categories: Food & Drink, Groceries, Transport, Home, Bills & Utilities, Health, Shopping, Entertainment, Travel, Gifts, Fees, and Other.

### 4.2 Logging a transaction

The add screen is a modal sheet, opened only by an explicit action such as the floating plus button. It is never shown automatically at launch or resume.

The amount field is ready first and uses the operating system's numeric keyboard. The decimal key appears only for currencies that use decimals. The user types the price, optionally taps a category chip, optionally types what the item was, and saves. Date, account, place, and note are optional and live behind a details disclosure. The default account is the last account used in the active currency, and the date defaults to the present moment.

Saving is optimistic: the new row appears immediately and the sheet closes. A short undo message allows reversal. A guard prevents a double tap from creating two rows.

Three transaction types are supported: expense, income, and transfer. A transfer records a movement between two accounts and is excluded from spending reports.

### 4.3 Overview and safe-to-spend

The Overview tab is the launch screen. From top to bottom it contains:

- a month selector and a settings button;
- a dark hero card showing safe-to-spend per remaining day, the share of the budget used, and the days left;
- a short note when recurring bills that have not yet been logged are being set aside;
- up to three category budgets closest to their limit;
- three recent transactions;
- a note when transactions exist in another currency but are excluded from the total;
- a floating plus button.

Tapping the hero opens a breakdown sheet that explains the calculation in plain words: the budget limit, money already spent, committed bills, remaining days, and the resulting daily amount. This transparency is central to the product. A number that cannot be explained cannot be trusted.

When there are no transactions, the screen shows a guided empty state instead of the floating button, so the first action is explicit.

### 4.4 Activity

The Activity tab presents transactions grouped by day. Users can search across item names, places, notes, and categories, and can filter by transaction properties. Tapping a row opens a detail screen for editing. Deleting a row is reversible through an undo message. Rows display the item name when present, then the place, then the category name.

### 4.5 Budgets

Budgets may be set for the overall period or for individual categories. Three periods are supported: weekly, monthly, and yearly. Monthly and yearly periods follow the calendar, while weekly periods are anchored to a chosen start date so that a user can align them with payday.

Each budget stores its own currency. Progress is displayed as normal, warning, or over budget. Overspending is shown honestly: the remaining amount becomes negative, while the safe-to-spend figure is clamped at zero. A category budget may exceed the overall budget; the app warns the user but does not block the choice.

### 4.6 Insights

The Insights tab summarises spending rather than listing individual transactions. It includes:

- a category breakdown with proportions;
- the largest items by item name, with unnamed spending grouped separately;
- a six-month spending trend;
- short written observations, such as the change from the previous comparable period and the largest category;
- a period control for changing the comparison window;
- a count of active recurring expenses as context.

All figures are currency-scoped. Transactions in another currency are counted and disclosed but never added to the totals.

### 4.7 Recurring bills and reminders

A recurring rule describes an expense that repeats daily, weekly, monthly, or yearly, with an optional interval, an optional day of the month, a start date, and an optional end date. Each rule stores the next due date and the currency in which it posts.

When the app returns to the foreground, it checks for missed occurrences. Each missed occurrence becomes its own transaction, never a single lump sum. A partial unique index on the rule identifier and local date makes posting idempotent: a crash or a repeated check cannot create duplicates. Manually entered transactions remain separate from recurring ones.

Reminders are scheduled locally through the operating system. No push-notification server is involved. If notification permission is denied, the in-app "bills due" card still works.

### 4.8 Settings, data, and security

Settings provides access to:

- country, currency, and locale;
- appearance, with system, light, and dark options;
- accounts and categories;
- recurring bills;
- app lock;
- CSV export and JSON backup, restore, and reset;
- the in-app privacy explanation and the About screen.

App lock uses the device's own biometric or passcode authentication. It reduces casual access to the app after the phone has been unlocked, but it does **not** encrypt the database. The database relies on the operating system's app sandbox and device encryption.

---

## 5. System architecture

### 5.1 Technology stack

| Concern | Technology | Reason for the choice |
| --- | --- | --- |
| Application framework | Expo SDK 58 | Managed native configuration, consistent builds, and access to native modules |
| UI runtime | React Native 0.88.1, React 19.3.0 | Cross-platform native rendering from one codebase |
| Language | TypeScript, strict | Compile-time detection of type errors |
| Routing | Expo Router 58 | File-based routes, typed routes, modal and tab navigation |
| Database | `expo-sqlite` | Local relational storage with transactions and indexes |
| Region detection | `expo-localization` | Device region, currency, and locale defaults |
| Typography | Geist variable font via `expo-font` | Legible figures and consistent design |
| Interface | Opaque system surfaces with translucent navigation | iOS-style grouped lists, large titles and capsule controls |
| Charts | `react-native-svg` | Small, purpose-built chart components without a chart dependency |
| Notifications | `expo-notifications` | Local scheduling only |
| Authentication | `expo-local-authentication` | Device biometrics and passcode |
| Files and sharing | `expo-file-system`, `expo-sharing` | Local export and backup files through the system share sheet |
| Animation | React Native Reanimated | Gesture and sheet animation with reduced-motion support |
| Testing | Jest with `jest-expo` | Unit and integration tests without a device |

No global state library is used. Screens read from SQLite through repositories and small React contexts. This keeps the data flow direct and avoids duplicating database state in memory.

### 5.2 Layered design

The codebase is divided into layers with a strict dependency direction:

```text
src/app/                  route files only (thin screens)
   │
   ├─ src/features/*/      feature UI and hooks
   ├─ src/components/      shared presentational components
   ├─ src/lib/db/          connection, migrations, repositories, SQL queries
   ├─ src/lib/domain/      pure functions: money, dates, budgets, recurrence, insights
   ├─ src/lib/format/      currency, number and date formatting
   ├─ src/lib/theme/       design tokens, theme provider
   └─ src/constants/       countries, currencies, starter categories
```

The dependency rule is:

```text
app → features → components → theme / format
app / features → db / domain → format
```

Nothing imports upward. In particular, `src/lib/domain` contains no React, SQLite, or Expo imports. This is what allows money, budget, date, and recurrence logic to be tested as ordinary functions without a simulator or a device.

Screens never contain SQL. Repositories are the only place where SQL text lives. Multi-table writes use a transaction helper so that operations such as posting a recurring bill or restoring a backup are atomic.

### 5.3 Project structure

```text
src/app/            Expo Router routes: onboarding, tabs, add, detail, settings
src/components/     shared UI kit, including Money, Sheet, Button, charts
src/features/       feature logic and screens: transactions, budgets, insights,
                    recurring, security, settings, onboarding, accounts, categories
src/lib/db/         database client, migrations, seed data, repositories
src/lib/domain/     pure business logic and its tests
src/lib/format/     money and date formatting
src/lib/theme/      design tokens and theme provider
src/constants/      ISO country and currency tables, starter categories
assets/             font files and generated launch artwork
blueprints/         product, architecture, data, screen and phase documentation
store/              store listing copy and privacy policy source
scripts/            deterministic brand asset generation
```

### 5.4 Data flow

A typical read follows this path:

```text
Screen
  └─ feature hook (for example, useInsights or useSafeToSpend)
       └─ repository function (SQL query)
            └─ expo-sqlite (single connection, WAL mode)
```

A write follows the same path in reverse. After a mutation, the affected hook reloads its data. Heavy aggregations, such as the six-month trend and category breakdown, run inside SQLite rather than JavaScript, so the interface remains responsive while sheets animate.

### 5.5 Startup sequence

1. The native splash screen remains visible.
2. The Geist font loads. The splash is held until the font is ready, preventing a visible font swap.
3. The database opens, and two pragmas are applied: write-ahead logging and foreign-key enforcement.
4. Migrations run from the database's recorded schema version to the latest version.
5. Settings load, including country, currency, locale, theme, and onboarding state. Missing values are resolved from the device and persisted.
6. If onboarding is incomplete, the app routes to the welcome flow; otherwise it opens the tabs.
7. The splash is hidden only after the first screen has data and the font is ready.

If a migration fails, the app is designed to offer recovery options rather than silently deleting user data.

### 5.6 Navigation map

```text
Root Stack
├─ (onboarding)        first launch only
│   ├─ welcome
│   ├─ region          country and currency
│   └─ first-budget
├─ (tabs)
│   ├─ overview        home and safe-to-spend
│   ├─ transactions    activity list
│   ├─ budget          budgets
│   └─ insights        charts and observations
├─ add                 modal transaction sheet
├─ transaction/[id]    detail and editing
└─ settings/*
    ├─ region, appearance, accounts, categories
    ├─ recurring, security, data, privacy, about
```

The add sheet is a modal so it can be dismissed without losing the list position. Detail screens push onto the current tab stack, so returning preserves scroll position.

---

## 6. Data model

### 6.1 Money is stored as integers

Every monetary value is stored as an integer in the currency's minor unit, in a column whose name ends in `_minor`. Floating-point values are never used for money.

The number of decimal places belongs to the currency, not to the schema:

| Currency | Exponent | Example input | Stored value |
| --- | --- | --- | --- |
| US dollar (USD) | 2 | 12.50 | 1250 |
| Japanese yen (JPY) | 0 | 1200 | 1200 |
| Kuwaiti dinar (KWD) | 3 | 1.250 | 1250 |

Parsing and formatting use the currency's exponent. The column is therefore called `amount_minor`, not `amount_cents`, because "cents" would be incorrect for zero-decimal and three-decimal currencies.

### 6.2 Every money row records its currency

Transactions, budgets, recurring rules, and accounts each store an ISO 4217 currency code. The code is written when the row is created and is never rewritten by a later settings change. Aggregates include a currency condition, so totals only ever combine rows in the active currency.

If a user changes the active currency, older rows keep their original currency. The interface discloses how many rows are excluded, and Activity can filter to them. The application never invents an exchange rate and never converts an amount.

### 6.3 Dates use two representations

Each transaction stores:

- `occurred_at`: a UTC instant in ISO-8601 format;
- `local_date`: a `YYYY-MM-DD` date captured in the device's timezone at entry.

Budget periods and monthly reports use `local_date`, not `occurred_at`. This prevents travel across time zones or daylight-saving changes from moving a transaction into a different month.

### 6.4 Tables

The schema is at version 3. The principal tables are:

| Table | Purpose |
| --- | --- |
| `transactions` | Expenses, income, and transfers, with item name, place, note, account, category, date, currency, and optional recurring link |
| `accounts` | Cash, bank, card, wallet, and savings accounts, each with its own currency and opening balance |
| `categories` | Expense and income categories, with optional parent, icon, colour, order, and archive flag |
| `budgets` | Overall or category limits for weekly, monthly, or yearly periods, in a specific currency |
| `recurring_rules` | Repeating transactions, with cadence, next due date, auto-post flag, and reminder offset |
| `settings` | Key-value preferences such as country, currency, locale, theme, and app-lock state |
| `tags`, `transaction_tags` | Tag definitions and links; the schema is prepared, but the tag management interface is a later feature |
| `attachments` | Receipt metadata and file references; schema only in version 1.0 |
| `category_rules` | Deterministic rules that suggest a category from an item name or place |

Useful constraints and indexes include:

- a partial unique index that allows only one overall budget per period and currency, because SQLite treats null values as distinct in a normal unique constraint;
- a partial unique index on recurring rule and local date, which prevents duplicate posting;
- indexes on local date, currency, category, account, item name, and place for list and report queries;
- a covering index added in migration 2 for insight aggregations.

### 6.5 Settings

Settings are stored as strings in a key-value table. Documented keys include onboarding state, country, currency, locale, theme, app-lock state, last used account, the date of the last currency change, and the active budget period. A key-value table avoids schema changes for simple preferences.

### 6.6 Migrations

The database records its schema version using SQLite's `PRAGMA user_version`. Migration files are applied in order inside a transaction, and the version is advanced only when the migration succeeds. Migrations are append-only: an applied migration is never edited. Before release, three paths are tested: a fresh install, an upgrade from the previous release, and an upgrade with existing data.

---

## 7. Core calculations

### 7.1 Budget periods

A budget period is the time window against which spending is measured. Monthly and yearly periods follow calendar boundaries. Weekly periods are anchored to the budget's start date, allowing a user to begin the week on payday.

The period determines which transactions count and how many days remain. The same period logic is shared by the Overview hero and the Budgets screen so that the two screens cannot disagree.

### 7.2 Safe-to-spend

Safe-to-spend is the central derived value. It answers the question: *if the remaining budget were spread evenly over the remaining days, how much could be spent today?*

The implemented formula is:

```text
remaining = overall_limit − spent_in_period − committed_unposted_bills
safe_to_spend = max(0, remaining / max(1, days_remaining))
```

Where:

- **overall_limit** is the active overall budget for the period, in the active currency;
- **spent_in_period** is the sum of expenses in the period and currency;
- **committed_unposted_bills** is the sum of active recurring expenses due later in the period that have not yet been posted;
- **days_remaining** includes today and is never less than one;
- the result is rounded down to a whole minor unit and clamped at zero.

Committed bills are subtracted because a number that ignores known future obligations would be misleading. The interface states when such bills are being set aside, so the user can see why the figure is lower.

**Worked example.** Suppose the overall monthly budget is 3,000.00 USD, the user has spent 1,240.00 USD, recurring bills of 560.00 USD are due before the month ends, and 10 days remain. In minor units, the remaining amount is 300,000 − 124,000 − 56,000 = 120,000. Dividing by 10 gives 12,000 minor units, or **120.00 USD per day**.

The calculation lives in a pure function with unit tests. Overspending produces zero for safe-to-spend, while the budget row still shows the negative remainder. This distinction is intentional: the daily guidance cannot be negative, but the budget report must remain truthful.

### 7.3 Budget progress

Progress is the ratio of spending to the limit. For the overall budget, committed bills are included in the numerator so that the progress bar reflects obligations as well as completed spending. Category rows compare category spending with category limits. The interface distinguishes a normal state, a warning state near the limit, and an over-budget state.

### 7.4 Recurring posting

A recurring rule stores its next due date as a date, not as a computed value produced on every read. When the app becomes active, due rules are processed:

1. Collect every occurrence between the stored next due date and today.
2. Insert one transaction per occurrence inside a transaction.
3. Rely on the partial unique index to ignore an occurrence that already exists.
4. Advance the next due date to the first occurrence after the last processed date.
5. Deactivate the rule when its end condition is reached.

Because the cursor advances and inserts are idempotent, a crash during processing can cause a retry but cannot cause a duplicate charge.

---

## 8. Privacy and security model

Suffice follows a data-minimisation approach. The application does not create an account, does not operate a server, and does not transmit financial records. The developer cannot read the user's database.

The app requests permissions only when a feature needs them:

| Permission | Use | If denied |
| --- | --- | --- |
| Notifications | Local reminders for recurring bills | The in-app bills card continues to work |
| Face ID, Touch ID, fingerprint, or device passcode | Optional app lock | The app remains usable without the lock |
| Document picker and share sheet | User-initiated backup, restore, and export | Other features are unaffected |
| Photo library or camera | Not used in version 1.0 | Not applicable |

Exports and backups are ordinary files created only when the user asks. They contain financial data and are **not encrypted by the app**. The privacy policy advises storing them somewhere trusted and deleting copies that are no longer needed.

App lock is an access barrier, not database encryption. Anyone who can unlock the phone and bypass the app lock may be able to reach the app's data. The database is protected by the operating system's sandbox and device encryption.

No advertising, analytics, behavioural tracking, or third-party crash-reporting SDK is included. This decision is recorded as an architecture decision in the project's decision log.

---

## 9. Reliability, accessibility, and quality assurance

### 9.1 Data protection

- All multi-table writes are transactional.
- Backup files are fully validated before any write occurs: table names, column names, SQL types, allowed enum values, currency codes, unique identifiers, foreign keys, and duplicate constraints.
- Restore offers two modes: **replace**, which clears and re-inserts everything in foreign-key order, and **merge**, which keeps local rows and accepts a backup row only when its update time is strictly newer.
- A rejected backup leaves the database untouched.
- Reset requires the user to type `DELETE`, keeps preferences, reseeds starter categories and one Cash account, and cancels scheduled reminders.

### 9.2 Accessibility

Accessibility is treated as part of correctness:

- Monetary values are announced with their currency name, not only an ISO code, through a dedicated speech formatter.
- Transaction rows include formatted, signed amounts in their accessibility labels.
- The add-sheet amount is capped in scale so that the fixed hero layout cannot overflow.
- Chips, fields, and the date picker expand with larger text.
- Activity rows use minimum heights rather than fixed heights that clip.
- Reduced-motion settings affect tab, sheet, chart, and snackbar animation.
- Currency inputs follow the currency's decimal rules; zero-decimal currencies do not show a decimal key.

### 9.3 Automated verification

At the time of writing, the repository passes:

| Check | Result |
| --- | --- |
| TypeScript (`tsc --noEmit`) | 0 errors |
| Lint (`expo lint`) | 0 errors |
| Jest | 23 suites, 165 tests passing |
| Expo Doctor | 20 of 20 checks |
| Expo export (all platforms) | Completes successfully |
| JavaScript bundles for iOS and Android | Both produced |

Tests focus on pure logic and database behaviour: money parsing and formatting across 0-, 2-, and 3-decimal currencies, budget period boundaries, daylight-saving changes, leap years, month-end recurrence, safe-to-spend clamping, backup validation, migrations, filters, and query performance.

These checks do not replace testing on a physical device. Screen-reader behaviour, biometric prompts, notification delivery, and clean-device installation still require hardware.

---

## 10. Benefits

### 10.1 Benefits for the user

- **Speed.** The entry path is amount, optional category, and save; most other fields are optional.
- **Clarity.** One daily number answers the practical spending question, and the calculation can be inspected.
- **Privacy.** Financial records stay on the device, with no account, bank connection, analytics, or advertising.
- **Offline operation.** Every read and write is local. The app works without a network connection.
- **Honest reporting.** Committed bills are disclosed instead of being ignored, and overspending is shown rather than hidden.
- **Currency correctness.** Zero-, two-, and three-decimal currencies are handled according to their own rules, without conversion or mixed totals.
- **Portability.** CSV export and complete JSON backup allow the user to take their data elsewhere.
- **Accessibility.** Screen-reader labels, scalable text, and reduced-motion support are built into the interface.

### 10.2 Benefits for the developer or maintainer

- **Testable core.** Business logic is pure and independent of React or SQLite.
- **Clear boundaries.** Routes are thin, repositories own SQL, and dependencies point in one direction.
- **Predictable money arithmetic.** Integer minor units eliminate a large class of rounding defects.
- **Stable identifiers.** User-facing branding can change without renaming the database, scheme, or package slug.
- **Managed native configuration.** Icons, splash screens, permissions, and identifiers are declared in `app.json`; native folders are generated rather than edited by hand.
- **Explicit release evidence.** The checklist distinguishes checks performed in the repository from checks that require hardware or store accounts.

### 10.3 Trade-offs

The design accepts several costs in exchange for these benefits:

- Without bank sync, users must enter transactions manually.
- Without cloud sync, moving to a new phone depends on exporting and restoring a backup.
- Without analytics, product decisions cannot rely on remote usage data.
- Without currency conversion, users who spend in several currencies see separate figures rather than one combined total.
- App lock does not encrypt the database.
- The web build is a development and review surface, not a full product target.

These are deliberate limitations, documented so that users and reviewers are not misled.

---

## 11. Building and releasing the application

### 11.1 Development commands

```bash
npm install
npx expo start          # development server
npx tsc --noEmit        # type check
npx expo lint           # lint
npx jest --ci           # test suite
npx expo-doctor         # dependency and configuration health
```

Expo packages must be installed with `npx expo install` rather than a plain package-manager command, because Expo resolves versions compatible with the installed SDK.

### 11.2 Bundling

A JavaScript bundle can be produced without any store account:

```bash
npx expo export --platform all
```

This writes Hermes bytecode for iOS and Android and static files for the web into `dist/`. The native bundles are the JavaScript payload that a native shell loads; they are not installable applications on their own.

### 11.3 Native and store builds

The repository does not commit `ios/` or `android/` directories. They are generated by Expo's Continuous Native Generation. A local native build requires the platform toolchain: Android needs a JDK and the Android SDK, while iOS needs macOS and Xcode.

Store builds use EAS, configured through `eas.json` with three profiles:

| Profile | Purpose |
| --- | --- |
| `development` | Development client with native modules |
| `preview` | Internal distribution build for testing |
| `production` | Store build with automatic version increment |

Typical commands are:

```bash
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile production --platform android
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --platform android --profile production
```

These commands require an Expo account and, for iOS distribution, an Apple Developer account. No such accounts are configured in the current environment.

### 11.4 Release gate

The project distinguishes between a complete code package and a completed release. The code package includes the identity, icon and splash assets, store identifiers, listing copy, privacy policy, EAS profiles, accessibility work, and the release checklist.

The release gate is not yet met. Outstanding items include physical-device accessibility testing, notification and biometric verification, a clean-device install and restore test, store screenshots, an EAS project link, production builds, an internal-track upload, and public privacy and support URLs. The domain `suffice.money` was unregistered when checked, but the name and namespace still require reservation and trademark clearance.

---

## 12. Current status and limitations

| Area | Status |
| --- | --- |
| Core features (P0–P6) | Implemented |
| Launch preparation code (P7) | Implemented |
| Typecheck, lint, unit tests, Expo Doctor, web export | Passing |
| Native bundles for iOS and Android | Produced by `expo export` |
| Physical-device testing | Not performed in this environment |
| Store screenshots | Not captured |
| EAS project link and production builds | Not configured |
| Store submission | Not performed |
| Domain and trademark clearance | Pending |

Known functional boundaries in version 1.0:

- Receipt attachments, tag management, and automatic categorisation rules have database structures but no complete user interface.
- The web build supports review and development; mobile is the intended product.
- App lock depends on the device's authentication and does not encrypt data at rest.
- The application does not provide bank synchronisation, cloud backup, shared budgets, or multi-currency conversion.

---

## 13. Planned direction

The roadmap treats post-launch work as evidence-driven rather than automatic. Candidate features for version 1.1 include receipt photos, improved automatic categorisation, a places leaderboard, saved filters, a home-screen widget, savings goals, and an improved tag interface. Exchange rates and multi-currency totals are explicitly deferred because they require a rate source, a cache, and a record of which rate was used.

Bank synchronisation, user accounts, cloud sync, household sharing, and natural-language entry are considered separate projects rather than small additions, because each introduces a backend, authentication, compliance work, or conflict resolution.

---

## 14. Glossary

| Term | Meaning |
| --- | --- |
| **Minor unit** | The smallest unit of a currency: cents for USD, yen for JPY, fils for KWD |
| **Exponent** | The number of decimal places a currency uses: 0, 2, or 3 |
| **Local date** | The calendar date at the place and time of entry, stored as `YYYY-MM-DD` |
| **Safe-to-spend** | The remaining budget, after committed bills, divided across the remaining days of the period |
| **Committed bill** | A recurring expense due later in the period that has not yet been posted as a transaction |
| **Local-first** | A design in which the device database is the primary source of truth and the app works without a network |
| **CNG** | Continuous Native Generation: native projects are generated from configuration instead of being committed |
| **EAS** | Expo Application Services, used for cloud builds and store submission |
| **Hermes bytecode** | The compiled JavaScript format used by React Native on mobile devices |
| **Idempotent** | An operation that can be repeated without changing the result or creating duplicates |

---

## 15. References

The repository contains the authoritative design and engineering documents:

- `blueprints/00-vision.md` — problem, audience, scope, principles, and success metrics
- `blueprints/01-architecture.md` — stack, layers, data flow, navigation, and startup
- `blueprints/02-data-model.md` — schema, money and date rules, derived formulas, backup design
- `blueprints/03-screens.md` — purpose, states, and acceptance criteria for every route
- `blueprints/04-design-system.md` — tokens, typography, spacing, components, and motion
- `blueprints/05-roadmap.md` — release scope and sequencing
- `blueprints/06-decisions-and-risks.md` — architecture decisions, risks, and open questions
- `blueprints/07-page-designs.md` — wireframes and layout measurements
- `blueprints/08-work-phases.md` — phase tasks, gates, and verification evidence
- `blueprints/09-flows.md` — end-to-end flow diagrams
- `store/listing.md` and `store/privacy-policy.md` — store copy and public privacy policy source
- `RELEASE_CHECKLIST.md` — verified code checks and outstanding device and store tasks

Where this guide and the blueprints differ, the blueprints and the shipped code take precedence; this document is an explanatory summary, not a second specification.
