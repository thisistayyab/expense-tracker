# Suffice — Privacy Policy

**Effective date:** 13 November 2026

Suffice is a local-first expense tracker published as a mobile application. This policy describes
what the app does with information on your device. It is written to match the shipped v1.0 app.

## The short version

- Suffice does not require an account.
- It does not connect to your bank.
- It does not send your financial data to us or to a third party.
- It contains no advertising, analytics or crash-reporting SDK.
- Your entries live in the app's private database on your device.

## Information you enter

You may enter transactions, accounts, categories, budgets, recurring bills, notes, places, dates,
amounts, currencies and settings. Suffice stores this information in a SQLite database inside the
app's private storage. The developer cannot access it.

Amounts are stored as integers in each currency's minor unit. The app does not convert currencies
or fetch exchange rates.

## Information the app does not collect

Suffice does not collect, transmit or sell:

- your name, email address, phone number or postal address;
- your bank credentials, card numbers or account numbers;
- your contacts, precise location, photos, microphone or advertising identifier;
- usage analytics, behavioral events, crash reports or diagnostics.

The app has no user account, no server-side profile and no cloud sync.

## Device permissions

Suffice asks only when a feature needs it:

- **Notifications** — used for optional local bill reminders. Reminders are scheduled on your
  device. Suffice does not use a push-notification server. You can deny permission and still use
  the in-app Bills due card.
- **Face ID / Touch ID / biometrics** — used only when you turn on App lock. Authentication is
  performed by your operating system. Suffice receives a success or failure result, never your
  face data, fingerprint or device passcode.
- **Files and sharing** — the system document picker is used when you restore a backup. The system
  share sheet is used only when you choose to export or share a file. The receiving app or service
  is chosen by you and is governed by its own privacy policy.
- **Photo library / camera** — not requested in v1. Receipt capture is not shipped.

## Backups and exports

CSV exports and JSON backups are created in the app's cache and handed to the system share sheet
only when you ask. They contain your financial entries. Suffice does not encrypt these files.
Store them somewhere you trust, and delete copies you no longer need.

## App lock and storage security

App lock prevents casual access to the app after it is backgrounded. It does not encrypt the
database. The database is protected by the operating system's app sandbox and device encryption.
Anyone who can unlock your phone and bypass the app lock may be able to access the app's data.

## Retention and deletion

Your data remains on the device until you delete it. You can:

- delete individual transactions, accounts or other records in the app;
- use **Settings → Delete all data** and type `DELETE` to remove the local database contents;
- uninstall the app, which removes its private app data according to the operating system.

Deletion is immediate and cannot be undone by Suffice. Export a backup first if you may want the
data later.

## Children

Suffice is a general-purpose finance tool and is not directed to children under 13. The app does
not knowingly collect personal information from anyone, including children.

## Changes

If a future version adds a network feature, analytics, crash reporting or cloud sync, this policy
and the store data-safety answers will be updated before that version ships. The effective date at
the top will change.

## Contact

**Developer:** Suffice  
**Privacy contact:** `privacy@suffice.money` *(placeholder — replace with a monitored address and
publish this policy at a stable public HTTPS URL before store submission.)*

This document is the source copy for the public privacy policy. The in-app
`Settings → Privacy` screen is a plain-language summary of the same practices.
