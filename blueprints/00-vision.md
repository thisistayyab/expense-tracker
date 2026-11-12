# 00 — Vision, Audience, Scope

## One-line pitch

A local-first personal expense tracker that answers two questions in under five seconds:
**"how much can I still spend today?"** and **"where did my money go?"**

## The problem

Existing trackers fail in two predictable ways:

1. **Entry is slow.** Three screens, eight fields and a category picker to log a coffee —
   so people stop logging within two weeks.
2. **They report the past but don't guide the present.** A beautiful monthly donut chart
   does not tell you whether you can afford dinner out tonight.

This app is built around fixing exactly those two failures and treating everything else as
optional.

## Target user (v1)

- One person tracking their own money on one phone.
- Wants cash-flow awareness, not accounting.
- Has a handful of accounts (cash, bank, one or two cards) and recurring bills.
- Will not connect a bank account, or cannot (no coverage in their country).
- Is mildly privacy-sensitive: data stays on the device.

**Explicitly not targeted in v1:** accountants, freelancers needing invoicing/VAT,
households with shared budgets, business expense reports.

## The wedge (build the identity around this)

### 1. Five-second entry — from intent, never from launch

Tap **+** → the add sheet opens with its keypad ready → type the price → tap a category chip
(food, transport, …) → optionally name the item ("chicken shawarma") → Save. Date defaults to
now, account defaults to last-used, and note/place/tags/receipt live behind one "More" row. No
field beyond the amount is required to save.

The entry is **structured at the moment of capture**, not reconstructed later: every expense
carries a category, a price, and — when the user takes the extra tap — the name of the thing
that was bought plus a short note. That is the unit of data the whole app is built on; reports,
search and budgets are only as good as what was captured here.

The clock starts when the user decides to log something, **not** when the app launches. The app
never opens into an input: Home is the launch screen, no keyboard or keypad is mounted on start
or resume, and the add sheet appears only after an explicit action (the + button, a
widget/shortcut, or a deep link). An app that greets you with a keypad feels like a form and
invites accidental entries — that is a product flaw, not speed.

### 2. Safe-to-spend

A single number on the home screen: how much can be spent per remaining day in the current
budget period after committed bills, without breaking any budget.

```
discretionary_left = sum(active budget limits for period)
                   − sum(expenses in period, excluding committed recurring)
                   − sum(unposted recurring bills due before period end)
safe_to_spend      = max(0, discretionary_left / days_remaining_in_period)
```

This must be honest: if the number can be wrong, it must show *why* (e.g. "excludes 2 bills
you haven't logged"). Trust is the whole product.

### 3. Offline and instant

Every read is local SQLite. No spinner on the home screen after the first launch. No login.

## Principles

1. **Logging beats reporting.** If a feature adds taps to entry, it loses.
2. **One number, then detail.** Home surfaces safe-to-spend; depth lives one tap away.
3. **Local-first, forever-ish.** Device DB is the source of truth; sync is an add-on, never a
   requirement for the app to work.
4. **No forced categories.** Users can rename, recolor, delete and reorder the starter set.
5. **Undo over confirm.** Destructive actions are reversible for a few seconds; no modal
   interrogation for deleting a typo entry.
6. **Explain the math.** Any computed figure is inspectable by tapping it.
7. **Boring money handling.** Integer cents, explicit timezone rules, no floats, no cleverness.
8. **Platform-respectful.** Native navigation, native gestures, haptics on commit, correct
   dark mode, correct safe areas.
9. **Never open into an input.** No keyboard or keypad on launch or resume; input UI appears only
   after an explicit add action. Orientation first, typing second.
10. **One currency at a time.** The user picks a country and currency once; every amount is
    rendered in that currency with its real symbol and decimal rules. The app never adds two
    currencies together and never invents an exchange rate.

## Success metrics (v1)

| Metric | Target | Why |
| --- | --- | --- |
| Time from tapping + to saved | ≤ 5 s | Core promise, measured from intent — not from app launch |
| Sessions showing a keyboard before any tap | 0 | Launch must feel like an app, not a form |
| Transactions logged per active week | ≥ 10 | Habit signal |
| D7 / D30 retention | ≥ 35% / ≥ 15% | Real tracker, not novelty |
| Median entries per user per week | ≥ 8 | Validates fast entry |
| Entries that carry an item name | ≥ 60% | The new field has to earn its tap, or reports stay generic |
| Crash-free sessions | ≥ 99.5% | Trust |
| Users who open Insights at least weekly | ≥ 40% | Second promise works |

Instrumented locally at first (counters in SQLite); a real analytics service is a Tier 3
decision, and must be opt-in.

## v1 scope (what ships in 1.0)

In: manual entry with **category + item name + price + note** (plus optional place, tags and
receipt), accounts, editable categories, transaction list with search/filter/edit/delete,
monthly per-category budgets, safe-to-spend, category breakdown + 6-month trend, recurring
transactions with reminders, onboarding with **country & currency selection** and starter
categories, dark mode, offline-first storage, CSV export.

## Non-goals for v1

- Bank/aggregator sync (Plaid, Tink, GoCardless, etc.)
- User accounts, cloud sync, multi-device
- Shared/household budgets, splitting with friends, IOUs
- Gamification, streaks, challenges
- Investment/portfolio tracking, tax categories
- Multi-currency *conversion*: no FX rates, no cross-currency totals, no mixed-currency
  reports. Exactly one active currency at a time; older entries keep the currency they were
  logged in.
- Web app parity (web build exists; mobile is the product)
- Receipt OCR, AI chat, natural-language entry — planned, not in 1.0

## Product bets (and what would falsify them)

| Bet | Falsified if |
| --- | --- |
| Fast entry is the retention driver | Users with >20 entries/week still churn at D30 |
| Safe-to-spend is more useful than charts | Usage of the number is flat while insights tabs are used |
| Local-only is acceptable | >25% of churn interviews cite "no sync/backup" |
| Manual entry beats bank sync for the target user | Import attempts per user approach 0 and sync requests dominate feedback |
