# 09 — Flows

Every flow the app implements, as Mermaid diagrams. GitHub and most Markdown viewers render
these natively. Diagrams are the spec: if code disagrees with a diagram, one of them is a bug.

## Flow inventory

| # | Flow | Kind | Owner code |
| --- | --- | --- | --- |
| 1 | Cold start & routing | flowchart | `app/_layout.tsx`, `lib/db` |
| 2 | Onboarding | flowchart | `app/onboarding/*` |
| 3 | Add transaction | flowchart | `features/transactions/add` |
| 4 | Transaction lifecycle | state diagram | `lib/db/repos/transactions` |
| 5 | Safe-to-spend | flowchart | `lib/domain/safeToSpend` |
| 6 | Recurring posting | sequence | `features/recurring` |
| 7 | Search & filter | flowchart | `features/transactions/list` |
| 8 | Export / backup / restore | flowchart | `app/settings/data.tsx`, `features/settings/dataIO` |
| 9 | Module dependencies | flowchart | whole app |
| 11 | Change currency | flowchart | `features/settings/region` |

---

## 1. Cold start and routing

```mermaid
flowchart TD
  A["App launch"] --> B["Native splash stays visible"]
  B --> B2["Load Geist via expo-font<br/>splash held until ready"]
  B2 --> C["Open SQLite<br/>WAL + foreign_keys ON"]
  C --> D{"PRAGMA user_version<br/>matches latest?"}
  D -- "no" --> E["Run pending migrations<br/>inside ONE transaction"]
  E --> F{"Migration error?"}
  F -- "yes" --> X["Recovery screen<br/>Export DB / Reset / Retry"]
  F -- "no" --> G["Load settings + seed check<br/>country/currency missing →<br/>resolve device default + persist"]
  D -- "yes" --> G
  G --> H{"onboarded = true?"}
  H -- "no" --> I["Onboarding flow"]
  H -- "yes" --> J["Tabs / Home"]
  I --> K["Set onboarded = true"] --> J
  C -. "open error" .-> X
  J --> L["Home query resolves<br/>(single local read)"]
  L --> M["Hide splash<br/>(font already loaded)"]
```

Rules:
- Splash is hidden **after** the first home query resolves, not on a timer, so users never see a
  blank flash.
- Launch never routes to `add`. Home is the only entry point, and no keyboard is mounted; the add
  flow below always begins with a deliberate action (ADR-010).
- A migration failure must never wipe data silently; recovery offers export first.
- No network call is on this path, ever.

---

## 2. Onboarding

```mermaid
flowchart TD
  S["Welcome"] --> L["Read device locale<br/>expo-localization"]
  L --> C["Country picker<br/>detected country pinned<br/>suggested currency shown"]
  C --> CC{"Change currency?"}
  CC -- "yes" --> CP["Currency picker<br/>searchable"]
  CC -- "no" --> B
  CP --> B["First budget in chosen currency<br/>optional"]
  B --> Q{"Budget entered?"}
  Q -- "yes" --> W["Write in one transaction:<br/>country + currency + locale<br/>+ starter categories + account<br/>+ overall budget (with currency)"]
  Q -- "no" --> W2["Write: country + currency + locale<br/>+ categories + account"]
  W --> O["onboarded = true"]
  W2 --> O
  O --> H["Replace route → Home"]
  H --> E{"0 transactions?"}
  E -- "yes" --> ES["Home empty state<br/>no input mounted until CTA tap"]
  E -- "no" --> HD["Home populated"]
```

Edge cases:
- App killed mid-flow → resume at the first unfinished step (no partial writes; write only at the
  end, or one row per step with a resume marker).
- Skip on step 1 → device country/currency + starter categories, budget skipped, Home empty state.
- Country picked but currency overridden → both persist independently; a later country change
  suggests a currency but never overwrites an explicit choice without confirmation.
- User changes currency later in Settings → existing amounts are **not** converted; the app asks
  for confirmation and explains that history keeps its original currency (flow 10).

---

## 3. Add transaction

```mermaid
flowchart TD
  A["+ button / widget / deep link<br/>(explicit user action only)"] -->  B["Modal opens with amount field<br/>native numeric keyboard"]
  B --> T{"Type?"}
  T -- "Expense" --> C1["Category chips<br/>+ item name row + account + date"]
  T -- "Income" --> C2["Income categories<br/>+ item name row + account + date"]
  T -- "Transfer" --> C3["From account → To account<br/>no category" ]
  C1 --> F{"Name field focused?"}
  F -- "yes" -->  K["Keyboard open:<br/>sheet lifts, body scrolls,<br/>header + Save pinned (ADR-014)"]
  K --> NM["Item name typed (optional)<br/>trim · max 80 chars"]
  NM --> V
  F -- "no" --> V{"amount_minor > 0?"}
  C2 --> V
  C3 --> V3{"amount > 0 and<br/>from ≠ to?"}
  V -- "no" --> R["Save disabled<br/>no error until touch"]
  V -- "yes" --> S["Save pressed"]
  V3 -- "no" --> R
  V3 -- "yes" --> S
  S --> G{"already saving?"}
  G -- "yes" --> N["Ignore (idempotency guard)"]
  G -- "no" --> L["Lock inputs + button spinner"]
  L --> W["INSERT in withTransaction<br/>local_date = today in device tz<br/>currency = settings.currency<br/>amount_minor = typed × 10^exponent"]
  W --> OK{"insert ok?"}
  OK -- "yes" --> U["Dismiss modal<br/>optimistic row visible"]
  U --> H["Haptic success"]
  H --> Z["Undo snackbar 4s"]
  Z --> UD{"Undo tapped?"}
  UD -- "yes" --> D["DELETE row → restore list"]
  UD -- "no" --> DONE["Committed"]
  OK -- "no" --> ER["Keep modal open<br/>inline error + retry<br/>never lose typed input"]
```

Notes:
- Category is **not** required to save; it falls back to "Uncategorized" and can be fixed later.
- Item name is optional too. Empty stays `NULL` — never write `''`, or the fallback chain
  (`item_name → place → category`) and the "named entries" metric both break.
- `local_date`, `currency` and `amount_minor` are computed once at save and never recomputed.
- There is only one input surface: amount and name both use the OS keyboard; no second keypad is mounted.
- Deep link `expensetracker://add?amount=12.50` prefills the amount only.

---

## 4. Transaction lifecycle

```mermaid
stateDiagram-v2
  [*] --> Draft: open add modal
  Draft --> Draft: type / amount / category / date edits
  Draft --> Saved: valid + Save
  Draft --> Discarded: close with no input
  Draft --> ConfirmDiscard: close with input
  ConfirmDiscard --> Draft: keep editing
  ConfirmDiscard --> Discarded: discard
  Saved --> Saved: edit (UPDATE, bump updated_at)
  Saved --> DeletedPendingUndo: delete
  DeletedPendingUndo --> [*]: undo window expires
  DeletedPendingUndo --> Saved: Undo tapped (restore exact row)
  Saved --> PostedByRecurring: recurring auto-post
  PostedByRecurring --> Saved: edit allowed
  Discarded --> [*]
```

Invariants:
- `DeletedPendingUndo` is UI-only — the row is actually deleted; undo re-inserts the same id.
- Editing never changes `id` or `created_at`; only `updated_at`.
- Transfers can never have a category; expenses/incomes always keep their `category_id` unless
  the category is deleted (then `SET NULL` → "Uncategorized").

---

## 5. Safe-to-spend

```mermaid
flowchart TD
  A["Home renders"] --> AU["Resolve active currency<br/>settings.currency"]
  AU --> B["Resolve active period<br/>monthly by default"]
  B --> C["Sum active budget limits<br/>for the period, currency = active"]
  B --> D["Sum expenses in period<br/>type = expense, currency = active"]
  B --> E["Sum recurring expenses<br/>due before period end, currency = active<br/>not yet posted"]
  C --> F["remaining = limits − spent − committed"]
  D --> F
  E --> F
  F --> G{"remaining < 0?"}
  G -- "yes" --> H["safe = 0<br/>show overspend state"]
  G -- "no" --> I["days_left = period_end − today + 1"]
  I --> J["safe = remaining / max(1, days_left)"]
  J --> K["Hero: $X /day<br/>+ 'excludes N bills'"]
  H --> K
  K --> L{"User taps the hero?"}
  L -- "yes" --> M["Breakdown sheet:<br/>budget, spent, committed,<br/>days left, formula in words"]
  L -- "no" --> N["Idle"]
```

Transparency rules:
- Every input to the number is visible in the sheet — no hidden constants.
- If no overall budget exists, show `Set a budget to see this` rather than a misleading average.
- Irregular income is not part of the formula in v1 (documented limitation, not a silent guess).
- Rows in another currency are excluded and disclosed (count + a link to the filtered list); they
  are never converted, guessed at, or folded into the number.

---

## 6. Recurring posting

```mermaid
sequenceDiagram
  actor U as User
  participant App as App (foreground)
  participant R as RecurringService
  participant DB as SQLite
  participant N as Notifications

  U->>App: opens app
  App->>R: processDue()
  R->>DB: SELECT active rules WHERE next_due_at <= today
  DB-->>R: rules + next dates
  loop each missed occurrence still due
    R->>DB: INSERT OR IGNORE transaction (recurring_id, local_date)
    alt already posted (unique index)
      DB-->>R: ignored → skip
    else inserted
      DB-->>R: ok, advance next_due_at
    end
  end
  R->>N: replace scheduled reminders (remind_days before next due, 09:00)
  R-->>App: posted count
  App-->>U: silent (Bills due card and live queries update)
```

Details:
- Occurrences are computed from `start_date` + `interval_count`, never from the last posted date.
- Unique idempotency is a database guarantee: partial unique index on
  `(recurring_id, local_date)` where `recurring_id IS NOT NULL` (migration 003).

Edge cases:
- Missed months while the app was closed → post each missed occurrence individually, not a lump.
- 31st-of-month rule in February → clamp to the last day of that month, then resume the 31st.
- A yearly Feb 29 rule clamps to Feb 28 in non-leap years and resumes Feb 29 when it exists.
- Turning off a rule stops future posting but keeps already-posted transactions; an end date
  finishes a rule without deleting its history.
- Notifications are an enhancement; a "Bills due" card on Home exists as the primary reminder
  and is also the manual Post control for rules with auto-post off.

---

## 7. Search and filter

```mermaid
flowchart LR
  A["Query typed"] --> B["Debounce 150 ms"]
  B --> C{"empty query?"}
  C -- "yes" --> D["Base list query<br/>(date desc, limit 50/page)"]
  C -- "no" --> E["LIKE on lower(item_name)<br/>or lower(place) or lower(note)<br/>or category name or amount text"]
  F["Filter chips"] --> G["Filter sheet<br/>date / type / account<br/>category / currency / tag"]
  G --> H["Apply → build WHERE clauses<br/>parameterized only"]
  D --> I["UNION of conditions<br/>ORDER BY local_date DESC, created_at DESC"]
  E --> I
  H --> I
  I --> J["Group by local_date<br/>compute day totals in SQL"]
  J --> K["FlatList with sticky headers"]
  K --> L{"0 rows?"}
  L -- "yes" --> M["'No matches' + Clear filters"]
  L -- "no" --> N["Render rows<br/>swipe actions attached"]
```

Hard requirement: **all** SQL values are bound parameters; search text never concatenated.

Currency rule: results may span currencies (history is history), but day totals are computed per
currency and the header shows the active-currency total only.

---

## 8. Export, backup, restore

```mermaid
flowchart TD
  A["Settings → Data"] --> B{"Action?"}
  B -- "Export CSV" --> C["Query all transactions<br/>join category + account"]
  C --> D["Serialize minor units → decimal<br/>row's own exponent, ISO dates, BOM"]
  D --> E["Write to cache dir<br/>expense-tracker-YYYYMMDD.csv"]
  E --> F["Share sheet (expo-sharing)"]
  B -- "Backup JSON" --> G["Dump all ten tables<br/>+ format/schema/app version"]
  G --> H["Write backup-YYYYMMDD.json → share/save"]
  B -- "Restore JSON" --> I["DocumentPicker → parse"]
  I --> J{"valid format and<br/>schema_version ≤ current?"}
  J -- "no" --> K["Refuse: explain errors<br/>database untouched"]
  J -- "yes" --> L["Full validation + preview<br/>counts per table"]
  L --> M{"Replace or merge?"}
  M -- "Replace" --> N["BEGIN; DELETE all; INSERT in FK order; COMMIT"]
  M -- "Merge" --> O["Keep local rows; backup row wins<br/>only if updated_at is strictly newer"]
  N --> P["Reload settings/onboarding<br/>refresh reminders"]
  O --> P
  P --> Q["Reload queries → Home"]
  B -- "Delete all data" --> R["Typed confirmation: DELETE"]
  R --> S["Drop every data row<br/>keep settings; reseed 15 categories + Cash"]
  S --> T["Home empty state"]
```

Guarantees:
- Export includes transfers and income, with a `type` column so totals are reproducible.
- A restore validates **before** touching the database; a failed parse leaves data untouched.
- Replace is transactional and follows foreign-key insert order; merge never deletes a local row.
- Settings and the onboarding flag travel in the backup; the app reloads both after a restore.
- Never offer "delete all" as a swipeable row — typed confirmation only. Reset keeps settings and
  recreates the starter library in the active currency.

---

## 9. Module dependencies (build-time)

```mermaid
flowchart TD
  APP["src/app/**<br/>routes"] --> FEAT["src/features/**"]
  APP --> LIB["src/lib/**"]
  FEAT --> COMP["src/components/**"]
  FEAT --> DB["src/lib/db/**"]
  FEAT --> DOM["src/lib/domain/**"]
  COMP --> THEME["src/lib/theme/**"]
  COMP --> FMT["src/lib/format/**"]
  DB --> DOM
  DOM --> FMT
  DB --> SQLITE[("expo-sqlite")]
  FEAT --> NATIVE["expo-haptics / image-picker /<br/>notifications / sharing"]
  LIB --> NATIVE
```

Forbidden edges (would be caught in review):
- `lib/domain` importing React, `expo-*`, or `lib/db`.
- `components` importing `features` or repositories.
- `app/**` containing SQL or business math.

---

## 10. First-week user journey

```mermaid
journey
  title New user — first seven days
  section Day 1
    Install and onboard: 4: User
    Log first expense: 5: User
    See safe-to-spend: 5: User
  section Day 2-3
    Log 8-10 expenses per day: 3: User
    Name an item instead of a category: 4: User
    Fix a wrong category: 4: User
  section Day 4
    Set category budgets: 4: User
    Check budget progress: 5: User
  section Day 5-6
    Forget to log a day, backfill: 2: User
    Add a recurring bill: 4: User
  section Day 7
    Open Insights: 4: User
    Export a backup: 5: User
```

Pain points this reveals (design targets):
- Backfilling several days must be fast → date picker presets + duplicate action.
- A forgotten day must never make the home number look falsely healthy → "excludes N bills"
  and a "no entries today" nudge, not a silent average.
- Naming must not cost more than it gives → recent-name chips, optional field, and the list
  visibly rewarding a named entry (the row reads "Chicken shawarma", not "Food & Drink").

---

## 11. Change currency

```mermaid
flowchart TD
  A["Settings → Currency & region<br/>(or onboarding region step)"] --> B{"Currency differs from<br/>settings.currency?"}
  B -- "no" --> Z["No-op, close"]
  B -- "yes" --> C{"Onboarding, or no data<br/>in the current currency?"}
  C -- "yes" --> W["Write country + currency + locale<br/>in one transaction"]
  C -- "no" --> D["Confirmation sheet:<br/>past entries keep their currency<br/>totals show only the new one<br/>budgets stay until recreated"]
  D --> E{"User confirms?"}
  E -- "no" --> Z2["Nothing written"]
  E -- "yes" --> F{"Create a matching account<br/>in the new currency?"}
  F -- "yes" --> G["INSERT account for the new currency<br/>(default for new entries)"]
  F -- "no" --> W
  G --> W
  W --> H["Invalidate settings + all money queries"]
  H --> I["Amounts re-render in the new symbol/exponent<br/>Home footnote: 'N entries in USD not included'"]
  I --> J{"Budgets in the old currency?"}
  J -- "yes" --> K["Budget tab: 'Previous currency' section<br/>'Recreate in <CUR>' with typed amounts"]
  J -- "no" --> L["Done"]
```

Guarantees:
- No stored amount is ever rewritten by this flow — `transactions.currency`, `budgets.currency`,
  `accounts.currency` and `recurring_rules.currency` keep their snapshots.
- No conversion and no exchange rate is ever applied or displayed.
- The confirmation is required once per change; there is no silent switch path. Onboarding writes
  directly because no money exists yet.
- Changing only the country (same currency) writes `settings.country` with no confirmation —
  flags and names are presentation, money is not.
