# Suffice — v1 Release Checklist

Status on 14 November 2026. `[x]` means verified in this repository or by a command run here.
`[ ]` means it needs an installed build, a device, store accounts or a public URL that this
environment does not have. Nothing build-, device- or store-gated is claimed as done.

## 0. Building the test APK

Expo Go runs the JavaScript bundle but not the app's own identity, so the device gates below need an
installed build. The `preview` profile sets `distribution: "internal"`, which makes EAS produce a
signed APK rather than an AAB; installation does not need Google Play.

```bash
npx eas-cli@latest login
npx eas-cli@latest init                      # once: writes extra.eas.projectId
npx eas-cli@latest build -p android --profile preview
```

Commit the working tree before building. EAS archives the project through git and `cli.requireCommit`
is not set, so uncommitted P7 work is easy to leave out of a build by mistake.

Open the build URL on the Android device, download the APK, allow "Install unknown apps" for the
browser or Files app, and install. EAS creates the upload keystore on the first build; keep that Expo
account, because a lost keystore blocks updates to an installed app.

Expo Go data is sandboxed and does not move into `com.suffice.money`. Before switching, use
Settings → Data → Backup (JSON) in Expo Go, install, then restore the file.

A local `npx expo run:android --variant release` build is the alternative, but on Windows it needs a
project path with no spaces and short enough for the NDK's Ninja (this repository's
`D:\Platforms\Mobile Apps\expense-tracker` is not), plus a JDK and the Android SDK on `PATH`.

- [ ] EAS `preview` APK built and downloaded.
- [ ] APK installed as `com.suffice.money` (not Expo Go) on a clean device or emulator.

## 1. Build and code

- [x] `npx tsc --noEmit` — zero errors.
- [x] `npx expo lint` — zero errors and no new warnings.
- [x] `npx expo-doctor` — all checks pass.
- [x] Jest suite green.
- [x] Production dependency set resolves; no new runtime dependency added for P7.
- [x] Expo SDK 58 configuration valid; `ios/` and `android/` remain generated.
- [x] Typed routes compile with every existing route.
- [x] `eas.json` has `development`, `preview` and `production` profiles.
- [x] Web export completes and a headless Chrome boot reaches onboarding with SQLite and Geist loaded.
- [ ] Native iOS and Android bundles build on EAS.
- [ ] EAS project linked (`eas init`) and `extra.eas.projectId` present.
- [ ] Production build succeeds for iOS and Android.
- [ ] Preview build installs on a clean device.
- [ ] No console errors during the clean-device walkthrough.

## 2. Identity and assets

- [x] User-facing name is **Suffice** in the app, lock screen, About and store copy.
- [x] iOS bundle identifier and Android package set to `com.suffice.money` (placeholder namespace).
- [x] 1024 × 1024 opaque app icon, no transparency.
- [x] Android adaptive foreground and monochrome icon, with `#121317` background.
- [x] Splash mark and `#121317` launch background.
- [x] Web favicon.
- [x] Asset generator committed at `scripts/generate-brand-assets.py`.
- [ ] `suffice.money` registered and the name cleared for store use and trademark.
- [ ] Icon and splash reviewed on a physical home screen and in both OS icon shapes.
- [ ] Store screenshots captured from the shipped build (not the design mockups).

## 3. Accessibility and visual matrix

- [x] Money is announced with its currency name rather than a bare ISO string.
- [x] Transaction-row accessibility labels include formatted, signed amounts.
- [x] Add-sheet amount input is capped at 1.3× so the fixed hero sizing cannot overflow.
- [x] Add-sheet chips, name field, place field and details card can grow with text.
- [x] Add-sheet chips and date-picker targets have expanded hit areas.
- [x] Activity rows use `minHeight` instead of a clipping fixed height.
- [x] Reduce-motion handling covers tab, sheet modal presentation, chart and snackbar motion.
- [x] JPY fields use `number-pad`/no decimal key in the add sheet, onboarding budget and budget editor.
- [x] Currency matrix tests cover USD (2), JPY (0), KWD (3) and CHF (letter symbol).
- [ ] VoiceOver: add flow including item name, category, account, date and Save.
- [ ] TalkBack: the same add flow, including native number pad behavior.
- [ ] 200% text scale sweep on iOS and Android, light and dark.
- [ ] Dark-mode contrast sweep on a real OLED screen.
- [ ] Reduce-motion and reduce-transparency sweep on both platforms.

## 4. Core behavior on a clean device

- [ ] Fresh install → onboarding → first transaction → budget → export.
- [ ] Airplane mode from first launch; add, edit, delete and budget still work.
- [ ] Launch and resume never show a keyboard or the add sheet.
- [ ] A three-month-old recurring rule posts each missed occurrence exactly once.
- [ ] Notification permission grant and denial both leave a usable Bills due card.
- [ ] Face ID / Touch ID / fingerprint and “Use device passcode” fallback work.
- [ ] CSV opens in a spreadsheet with correct signs and decimals.
- [ ] JSON backup restores on a second clean device with identical totals.
- [ ] Delete all data requires `DELETE`, clears rows and leaves a usable app.

## 5. Store package

- [x] Listing copy and character counts drafted in `store/listing.md`.
- [x] Privacy policy source written in `store/privacy-policy.md`.
- [x] Data-safety answers prepared.
- [x] Screenshot scene list and capture plan prepared.
- [ ] Privacy policy published at a public HTTPS URL.
- [ ] Support URL and monitored contact address published.
- [ ] App Store record, bundle ID and build uploaded.
- [ ] Google Play record, package and internal-track build uploaded.
- [ ] Store review notes pasted from `store/listing.md`.
- [ ] Age rating, category and pricing confirmed in both consoles.

## 6. Decision and go/no-go

Crash reporting: **no third-party SDK in v1** (ADR-016). The app has a local error boundary and
Expo/OS logs only. Revisit only after launch evidence and a new privacy review.

The release is **not go** until every device and store item above is checked. The repository is
code-complete for P7, but the P7 gate in `blueprints/08-work-phases.md` requires hardware and store
accounts.
