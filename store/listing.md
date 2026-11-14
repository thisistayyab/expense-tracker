# Suffice — Store Listing

Prepared for the v1 launch. Character counts are for the store fields and must be re-checked
after any copy edit. Claims here are limited to what the shipped app does.

## Identity

| Field | Value |
| --- | --- |
| App name | **Suffice** |
| iOS subtitle (30) | `Private, offline money log` |
| Android short description (80) | `A private expense tracker. No account, no bank link, no analytics.` |
| Bundle / package | `com.suffice.money` |
| Primary category | Finance |
| Secondary category | Productivity |
| Age rating | 4+ / Everyone |
| Price | Free, no in-app purchases |
| Version | 1.0.0 (build 1) |

**Name meaning:** *Suffice* is the English verb meaning "to be enough." It is not an acronym and is
spelled s-u-f-f-i-c-e. The name is deliberate: the app promises one sufficient daily number, not a
complete financial dashboard.

The bundle identifier is a launch placeholder until the developer owns or deliberately reserves
that namespace. Change it in `app.json` before the first store record; it cannot be changed after
a store listing exists. `suffice.money` was unregistered when checked on 13 November 2026, but the
name and namespace still need trademark and store-name clearance.

## App Store

**Promotional text (170):**
> Know what is left before you spend it. Suffice turns your own entries into a daily safe-to-spend
> number, calm budgets and clear patterns — all stored on your phone.

**Description:**

Suffice is a private expense tracker for people who want the answer, not another dashboard. The
name comes from the verb meaning "to be enough" — one number for what is left to spend today.

Log what you spend in seconds, set one budget, and see what is safe to spend today. No account, no
bank connection, no ads and no analytics. Your entries stay in a local database on your device.

WHAT YOU CAN DO
• Log an expense, income or transfer with a native number pad
• Name what you bought and add a place or note when it matters
• Set an overall budget and optional category limits
• See safe to spend, progress and the bills still ahead
• Review six months of spending and income
• Track recurring bills and get a local reminder before they are due
• Lock the app with Face ID, Touch ID, fingerprint or your device passcode
• Export CSV or a complete JSON backup whenever you choose

WHAT IT DOES NOT DO
• No bank connection or account sign-up
• No cloud sync, ads, tracking or third-party analytics
• No currency conversion — every entry keeps the currency it was entered in
• No subscription

WHO IT IS FOR
Anyone who wants a calm, legible record of their own spending without handing their financial
life to a data business.

A NOTE ON YOUR DATA
Everything is stored on this device. Uninstalling the app removes its database. Export a backup
before changing phones. Backups are ordinary files and are not encrypted by Suffice; store them
somewhere you trust.

## Google Play

**Short description (80):**
`Private, offline expense tracking. No account, no bank link, no analytics.`

**Full description:** use the App Store description, replacing the bullets with `•` only if the
listing editor supports it. Keep the data-loss note.

## Keywords (Apple, 100 characters)

`expense tracker,budget,offline,private,spending,money,finance,recurring,no bank,local`

## Screenshot plan

Store screenshots must be captured from the shipped build, not from the design mockups. The
`add` mockup still shows the retired custom keypad and must not be submitted.

Required set, in this order:

1. **Overview** — populated hero, budget cards and recent rows.
2. **Add** — native keyboard visible, amount and item name filled, Save enabled.
3. **Budgets** — overall card and at least three category states (normal, warning, over).
4. **Insights** — breakdown, trend and one insight card.
5. **Activity** — grouped days, search and one active filter.
6. **Privacy** — the in-app plain-language privacy screen, optionally paired with a device-lock
   frame.

Rules:

- iPhone 6.7-inch: 1290 × 2796 or 1320 × 2868. iPhone 6.5-inch fallback: 1242 × 2688.
- Android phone: at least 1080 × 1920, 16:9 or taller, PNG or JPEG.
- Use the light theme for the first three, dark for at least two. No device frames required.
- Sample data only: no real names, merchants, balances or card digits.
- Capture at default text size. A separate 200% accessibility capture belongs in review notes,
  not in the store carousel.
- No text overlays that claim a feature the screenshot does not show.
- Do not use `blueprints/designs/mockups/png/*.png`; they are design references.

Capture commands (after installing the build):

```bash
# iOS Simulator
xcrun simctl io booted screenshot store/screenshots/ios-overview.png

# Connected Android device
adb exec-out screencap -p > store/screenshots/android-overview.png
```

A deterministic capture path, once the preview APK is installed (not Expo Go):

```bash
# replay onboarding, seed sample data, then capture each screen
adb exec-out screencap -p > store/screenshots/android-<screen>.png
```

## Privacy and support URLs

- Privacy policy: publish `store/privacy-policy.md` at a stable public HTTPS URL.
- Support: publish a page or mail link with a monitored address.
- Marketing URL: optional; omit until a real site exists.
- Both URLs are store-submission blockers until they resolve publicly.

## Review notes

Suffice has no login. To review the full app:

1. Complete onboarding with the default region.
2. Add an expense from the + button.
3. Set a budget from Budgets.
4. Export a CSV from Settings → Data to see the share sheet.
5. App lock is optional and uses the device's own authentication.

No special hardware is required. Local bill reminders need notification permission; denying it
leaves the in-app Bills due card working. Face ID wording is requested only when app lock is
enabled.

## Data safety answers

| Question | Answer |
| --- | --- |
| Collects or shares data? | No |
| Data types collected | None |
| Data shared with third parties | None |
| Data encrypted in transit | Not applicable — no transmission |
| Data deletion request | Delete all data in Settings, or uninstall the app |
| Ads or analytics | None |
| Crash reporting SDK | None |
| Account required | No |
| Bank connection | No |
| Sensitive permissions | Notifications (optional), biometrics (optional, handled by OS), document picker/share (user initiated) |
