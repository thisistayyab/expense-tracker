# 03 — Screens

Every route below is a file under `src/app/` (the only place routes may live). Screens stay
thin: layout + feature hooks. All copy in this document is placeholder-quality and should be
localized later.

Legend: **[v1]** ships in 1.0, **[1.1]** next, **[later]** needs a backend or a project.

---

## 1. Onboarding — `(onboarding)/welcome.tsx`, `region.tsx`, `first-budget.tsx` [v1]

**Purpose:** three taps to a working app, in the user's own money; never show an empty home
screen.

| Step | Content | Writes |
| --- | --- | --- |
| Welcome | App name, one sentence, "Get started" | `settings.onboarded=false` until finish |
| Country & currency | Searchable country list with the detected country pinned first; the currency they get is shown as a row under the list (tap to change); "Detected automatically · change anytime" footnote | `settings.country`, `settings.currency`, `settings.locale` |
| First budget | "What do you want to spend this month?" numeric field **in the chosen currency**, skippable | `budgets` overall row incl. `currency` |

**States:** initial, search with no matches ("No countries match \"xyz\"" + clear), validation
error (amount ≤ 0), finishing (single write transaction).
**Done when:** finishing writes country + currency + starter categories + default account +
optional overall budget in one transaction, sets `onboarded=true`, and replaces the route to
`/(tabs)` (no back to onboarding).
**Edge cases:**
- Device region or currency not in the shipped tables → fall back to the country's currency, then
  `USD`; log locally, never block the step.
- Picking a country whose currency the user does not want (expat, USD-earning household) → the
  currency row is independent; changing it never changes the country again.
- Skipping onboarding → device country/currency + starter categories, Home empty state.
- App killed mid-flow → resume at the first unfinished step (no partial writes).

**Starter categories (seeded):** Food & Drink, Groceries, Transport, Home, Bills & Utilities,
Health, Shopping, Entertainment, Travel, Gifts, Fees, Other. Icons from `expo-symbols` on iOS
with a cross-platform fallback set; each gets a color from the palette ramp.

---

## 2. Overview (Home) — `(tabs)/overview.tsx` [v1]

**Purpose:** the five-second answer.

**Layout (top → bottom):**
1. Header: month selector (`November 2026` with a chevron) and a circular settings button. No
   account filter here — accounts are filtered in Activity.
2. **Safe-to-spend hero:** an ink card carrying the large amount, the share of budget used, a
   progress track of period spend vs total budget, and the days-left line. Tapping it opens a
   breakdown sheet (spent, committed bills, remaining days, formula in plain words).
3. One 11 pt "excludes N bills you haven't logged" truth line under the hero — outside the card,
   so it never competes with the number.
4. Budget cards: up to 3 categories closest to their limit in a peeking horizontal row with
   progress bars and overspend state; "See all" → Budgets tab.
5. Recent transactions: 3 rows in one grouped card. Title is `item_name`, falling back to
   `place`, then the category name; subtitle is `category · relative day`.
6. If transactions exist in a currency other than the active one, a 12 pt tertiary footnote
   sits under the hero: "12 entries in USD are not included" → opens Activity filtered to that
   currency. Never merge them into the number, never convert.
7. Floating **+** button (bottom-right, above the floating tab bar) → `add` modal.
8. Empty state (no transactions yet): centered gradient icon, "Start with one", one sentence, and
   a primary "Log your first expense" button plus two setup rows. **No FAB** in this state — the
   CTA is the only entry point. No keyboard is shown until that button is tapped, so
   the home screen never mounts an input.

**States:** loading (skeleton matching layout, not a spinner), empty, populated, error
(retry + "your data is on this device" reassurance).
**Interactions:** pull-to-refresh is a no-op (local data) — do not add one; instead the screen
is always current. Long-press a transaction → quick actions (edit, duplicate, delete). Expense
amounts render in ink; only income is green, and coral is reserved for overspend.
**Acceptance:** cold start to interactive < 1.5 s on a mid-range Android device with 10k rows;
no layout shift when data arrives; money never wraps; launch and resume never show a keyboard
or the add sheet.

---

## 3. Add transaction — `add.tsx` (modal) [v1]

**Purpose:** the wedge. Capture a structured expense — price, category, what it was — in ≤ 5
taps and ≤ 5 seconds **from tapping +**. This sheet is never the first thing a user sees.

**Fields, in order on screen** (`*` = required to save):

| Field | Control | Required | Notes |
| --- | --- | --- | --- |
| Price* | numeric text field (native decimal/number pad) | yes (> 0) | Currency from Settings; decimals limited by the currency exponent |
| Category | chip row + "More…" searchable sheet | no | Falls back to "Uncategorized"; recent categories first |
| Item name | single-line text row, "What was it?" | no | e.g. `Chicken shawarma`; max 80 chars; trimmed on save |
| Account | row → picker | no | Defaults to last used account **in the active currency** |
| Date | row → presets + picker | no | Defaults to now |
| Place | text input inside details | no | e.g. `Blue Bottle` — where it came from |
| Note | multi-line input inside details | no | "Anything to remember?" |
| Tags | tag chips inside details | no | [1.1] management UI, tags still storable |
| Receipt | attach photo inside details | no | [1.1] |

Receipt, tags and place all live in the same details disclosure; none of them is required, and
the sheet never expands details by default.

**Behavior:**
- Never auto-presented: not on cold start, not on resume, not from a notification tap. Only the
  + button, a home-screen shortcut, or an explicit deep link opens it. A notification opens the
  relevant transaction or bill instead.
- Price uses the OS numeric keyboard (decimal pad, or number pad for 0-decimal currencies).
  There is only one input surface, so moving between amount and name never swaps keyboards or
  collapses the sheet; decimals are clamped to the currency exponent. Success haptic on save.
- The item-name row is one tap away and optional: the fast path stays price → category → Save.
- While the name field is empty, up to 5 recently used item names (last 30 days, grouped
  case-insensitively) appear as small chips under it; typing hides them, and tapping one fills
  the field and dismisses the keyboard.
- Category defaults from `category_rules` matched against the item name and place, then recent
  history, but never blocks saving without one.
- Save is optimistic: row appears in the list, modal dismisses, undo snackbar for 4 s.
- Editing an existing transaction reuses this screen with prefilled values.
- `?amount=...` deep-link param prefills for widgets/shortcuts.

**States:** default, keyboard open (the whole sheet lifts above the OS keyboard, the body
scrolls, and the header plus Save stay pinned), details expanded, income mode (income categories,
no transfer account row), transfer mode (from-account + to-account, category and item-name
hidden), income vs expense vs transfer to/from account filtered to the active currency,
validation (`amount_minor` > 0; transfer needs a different destination account), saving (button
spinner, inputs locked).
**Acceptance:** one-handed reachable for all primary controls; median price+category save ≤ 5 s
and ≤ 8 s including an item name; save works offline always; double-tap Save cannot create two
rows (idempotency guard while in-flight); launching the app ten times never presents a keyboard
or this sheet; the OS keyboard never covers Save or the amount.

---

## 4. Activity (Transactions) — `(tabs)/transactions.tsx` [v1]

**Purpose:** find and fix anything.

**Layout:** sticky search field; filter chips (date range, type, account, category, currency,
note present); one grouped card per day with a day-total header; each row shows a tinted
category icon tile, `item_name` (fallback `place`, then category), a subtitle of
`category · account`, and the amount. Rows carrying a note show a note glyph before the
subtitle.

**Behavior:**
- Search matches item name, place, note, category name and amount text (SQLite `LIKE` on
  lowercased columns; FTS later if needed).
- Day totals are computed per currency; if a day contains rows in two currencies the header
  shows the active currency total and a `+1 other` marker (never a summed total).
- The currency filter row exists only when more than one currency is present in the data.
- Filters are a bottom sheet with Apply/Reset; active filter count badge on the bar.
- Swipe right → edit; swipe left → delete (with undo). Long-press → duplicate, change category.
- Sticky section headers; `getItemLayout`-style fixed row height for long lists; FlatList (or
  FlashList if added later) with `keyExtractor` = id.
- Tapping a row → `transaction/[id]`.

**States:** empty (no data at all), no results (filters too narrow, with "Clear filters"),
loading first page only.
**Acceptance:** 5k rows scroll at 60 fps; typing in search does not jank (debounced 150 ms);
deleting the last item of a day removes the header.

---

## 5. Transaction detail / edit — `transaction/[id].tsx` [v1]

**Layout:** hero (category icon tile, `item_name` as title, `category · place · relative date`
metadata, amount), then rows: Category, Place, Note, Account, Date, Currency (read-only tag —
only shown when the row's currency differs from the active one), Tags, Receipt, attachments
grid, then "Edit transaction" and a separate "Delete transaction". Edit pushes the same form used
by `add` (one implementation).
**Empty fields:** rows with no value are hidden, not shown as empty placeholders; a transaction
with only a price still renders category + amount + date.
**Currency rule:** editing an old-currency row keeps its original currency (editable amount
only in that currency) — the app never silently re-labels history.
**Behavior:** swipe-back saves nothing (edit is explicit); delete → undo snackbar, then pop.
**Edge cases:** deleted/unknown id → friendly "not found" state with a back action, no crash.

---

## 6. Budget — `(tabs)/budget.tsx` [v1]

**Purpose:** set the limits that make safe-to-spend real.

**Layout:**
- Header: period label + period pill (opens the picker).
- "Overall budget" ink card with a progress ring (create/edit inline).
- Category list: limit, spent, remaining; progress bar; tap → set/edit limit sheet with a
  numeric keypad and quick "+10% / -10%" chips.
- Toggle: "Roll over unused" per category.
- Copy last month's budgets action.

**Rules:** one budget per category per period per currency; deleting a budget leaves
transactions intact; soft warning (not a block) when total category limits exceed the overall
budget. Limits are typed in the active currency and only count toward safe-to-spend when
`budgets.currency` matches it; budgets in another currency appear in a collapsed "Previous
currency" section with a one-tap "Recreate in <CUR>" action.
**States:** no budgets yet (CTA), partially configured, all over budget.
**Acceptance:** editing a limit updates Home's safe-to-spend immediately (shared query).

---

## 7. Insights — `(tabs)/insights.tsx` [v1]

**Layout:**
- Period switch (This month / Last month / Last 3 / Last 6 / Year).
- **Category breakdown:** horizontal-bar list (better than a pie for many categories) with
  amounts and % of total; tapping a category filters Transactions.
- **Trend:** 6-month bar chart of expense totals, income as a second series, month delta label.
- **Top items** list (top 5 by spend): grouped by case-insensitive `item_name`; rows without a
  name fall back to their category and say so ("Uncategorized items"). This is why naming
  entries matters — the list is useless when the field is always skipped.
- Insight cards (2–3): "Groceries is 22% above last month", "3 subscriptions detected".
- All figures are for the active currency only; a footnote appears if rows in another currency
exist.
- Export button → CSV.

**States:** < 2 months of data (show only breakdown with a "trend unlocks after next month"
note), no data, error.
**Acceptance:** all charts computed from SQL aggregates in < 50 ms for 16k rows; charts have
text summaries accessible to screen readers (a chart must never be the only representation).

---

## 8. Settings — `settings/index.tsx` [v1]

Rows, grouped as Preferences (Country, Currency, Appearance), Library (Categories, Accounts,
Recurring) and Data (Export CSV, Backup, App lock [1.1]): Country shows the country name and
Currency the symbol + code; each row leads with a tinted icon tile. A quiet version line sits
below, and a destructive "Delete all data" behind a typed confirmation at the bottom.
**Acceptance:** any setting change persists immediately and is reflected without app restart;
changing the currency re-renders every amount in the app with the new symbol and decimals
(without converting any stored value).

## 9. Currency & region — `settings/region.tsx` [v1]

**Purpose:** the one place both onboarding and Settings edit country + currency. Same component,
two entry points (onboarding step 2 pushes it without a back chevron).

**Layout:** current selection card (country name, flag glyph, currency `USD $ · US Dollar`);
search field; country list grouped `Detected` / `All countries`; a "Currency" row above the list
that opens the currency picker sheet with its own search.

**Behavior:**
- Selecting a country immediately suggests its currency ("United States usually uses USD —
  use USD?") but never forces it; an explicit currency choice survives later country changes.
- Currency change with existing data opens a confirmation that states the three consequences in
  plain words: past entries keep their currency, budgets stay in the old currency until
  recreated, totals show only the new currency.
- Writes `settings.country` / `settings.currency` / `settings.locale` in one transaction, then
  invalidates the settings query so every screen re-renders.
- Search matches country name, ISO code and currency code ("japan", "JP", "yen").

**States:** unchanged selection, dirty (Continue/Apply enabled), confirming currency change,
write error (retry, selection preserved).
**Acceptance:** selecting Japan then typing an amount shows `¥` and a number pad with no decimal
separator; switching back to USD formats the same screen with two decimals; no stored amount changed.

## 10. Categories — `settings/categories.tsx` [v1]

Tabs Expense / Income. Reorder (drag), add, rename, re-icon, recolor, archive. Archiving a
category hides it from pickers but keeps history and shows it tagged "Archived" in lists.
Subcategories under a parent; moving a subcategory re-parents, never deletes.

## 11. Accounts — `settings/accounts.tsx` [v1]

List with computed balances, account type and color. Add/edit: name, type, opening balance, and
currency. New accounts default to the active currency; an account's currency is shown as a
`CurrencyTag` whenever it differs from the active one.

**Currency rule:** an account's currency is fixed once it has transactions. It can be changed
only when its history is empty, and the picker explains that. The add sheet only offers accounts
in the active currency, plus a "＋ New <CUR> account" row so a currency switch never blocks
entry. Archive requires zero balance or explicit confirmation ("history stays viewable").
Transfer action creates a `transfer` transaction between two accounts **in the same currency**.

## 12. Recurring — `settings/recurring.tsx` [v1]

List of rules with next due date and amount (each in the rule's own currency); toggle active;
add/edit: amount, currency, category, item name, place, note, account, frequency, interval, day
of month, start/end, "auto-post", "remind N days before ". Rules in a currency other than the
active one keep posting in it and are marked with a `CurrencyTag`.
**Behavior:** on app foreground, post anything with `auto_post=1` and `next_due_at <= today`
once (idempotent via `recurring_id` + `local_date` uniqueness check), then advance
`next_due_at`. Reminders are scheduled local notifications at 9:00 local time.
**Edge cases:** Feb 29 yearly births month-end clamping; missed months while the app was
closed post all missed occurrences (each once), not one lump sum.

## 13. Data — `settings/data.tsx` [v1]

Export CSV (transactions), export full JSON backup, import JSON (validate schema version,
preview counts, then replace or merge), reset all data.
**Acceptance:** exported CSV re-imports into a spreadsheet with correct signs, dates and a
`currency` column, amounts serialized with each row's own exponent (JPY `1200`, not `12.00`);
JSON restore round-trips byte-equal data for all tables, including country/currency settings.

---

## Screens planned after v1

| Screen | Release | Notes |
| --- | --- | --- |
| Receipt capture + attach | 1.1 | `expo-image-picker`; OCR later |
| Goals | 1.1 | target amount, deadline, contributions table |
| Subscription manager | 1.1 | derived from recurring rules + recurring item-name/place patterns |
| Top places leaderboard | 1.1 | only meaningful once `place` coverage is high |
| App lock | 1.1 | `expo-local-authentication`, settings toggle |
| Natural-language entry | later | "coffee 4.50" parser first, LLM optional |
| Bank sync | later | provider + per-user cost + compliance review |
| Household sharing | later | needs auth + backend + conflict strategy |
