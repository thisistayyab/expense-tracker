# Suffice

A private, local-first expense tracker for iOS and Android. Log what you spend, set one budget,
and see what is safe to spend today. No account, bank connection, analytics or cloud.

**The name.** *Suffice* is the verb meaning "to be enough." It is not an acronym. The name states
the product's one promise: an honest daily number for what is left to spend, rather than another
dashboard that asks you to track everything.

Built with Expo SDK 58, React Native, Expo Router, expo-sqlite and Geist.

## Status

P0–P6 are implemented. P7 (launch preparation) is code-complete: identity, icon/splash assets,
store identifiers, accessibility fixes, currency coverage, EAS profiles, listing copy, privacy
policy and the release checklist are in the repository. Physical-device accessibility checks,
store screenshots, production builds and store submissions remain blocked on hardware and store
accounts; see `RELEASE_CHECKLIST.md`.

## Run

```bash
npm install
npx expo start
```

Useful checks:

```bash
npx tsc --noEmit
npx expo lint
npx jest --ci
npx expo-doctor
```

This project uses `npm` and has a `package-lock.json`. Always install Expo packages with
`npx expo install` so the native versions match SDK 58.

## Product

- **Overview** — safe to spend, budget progress, recent activity, bills due.
- **Add** — one native number pad, amount first, category, optional item name/place/note.
- **Activity** — grouped history, search, filters, edit, delete and undo.
- **Budgets** — overall and category limits with warning/over states.
- **Insights** — six-month trend, category breakdown, top items and deterministic insights.
- **Habit** — recurring bills, local reminders, CSV export, JSON backup/restore, app lock.
- **Money** — ISO 4217 currencies with 0/2/3 decimals; no conversion, ever.

## Structure

```text
src/app/          Expo Router routes only
src/components/   shared UI kit
src/features/     feature screens and logic
src/lib/          db, domain, formatting, theme
assets/           fonts and launch art
blueprints/       product, data, design and phase source of truth
store/            listing copy and privacy policy
scripts/          asset generation
```

## Data and privacy

All data is stored in the app's local SQLite database. Exports are created only when you ask and
are shared through the system share sheet. App lock uses the device's authentication; it does not
encrypt the database. There is no analytics or crash-reporting SDK in v1. See
`store/privacy-policy.md`.

## Release

- Listing: `store/listing.md`
- Privacy: `store/privacy-policy.md`
- Checklist: `RELEASE_CHECKLIST.md`
- EAS: `eas.json` (`development`, `preview`, `production`)

The bundle identifier `com.suffice.money` is a placeholder until the namespace is reserved. The
name **Suffice** has not had trademark clearance; confirm it before creating store records.
