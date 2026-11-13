# 02 — Data Model

## Non-negotiable rules

1. **Money is an integer in the currency's minor unit, in a column named `*_minor`.** Never
   `REAL`. Never floats, not even briefly in a `useState`.
   - The number of decimal places is a property of the **currency**, not of the schema: USD/EUR
     2, JPY/KRW/ISK 0, KWD/BHD/TND 3 (see `src/constants/currencies.ts`, field `exponent`).
   - 12.50 USD → `1250`; 1200 JPY → `1200`; 1.250 KWD → `1250`.
   - Parse and format go through `lib/domain/money.ts` using that exponent. "Cents" is only
     correct for 2-decimal currencies, which is why the column is not called `_cents`.
2. **Every amount row records the currency it was entered in.** `transactions.currency`,
   `budgets.currency`, `recurring_rules.currency`, `accounts.currency` — all ISO 4217, snapshotted
   at write time and never rewritten by a settings change. Totals only ever sum rows sharing the
   active currency.
3. **Two time columns per transaction.**
   - `occurred_at` — UTC instant, ISO-8601 (`2026-11-12T18:04:00.000Z`).
   - `local_date` — `YYYY-MM-DD` captured in the device's timezone at entry.
     Month/period bucketing uses `local_date`, never `occurred_at`, so travel and DST cannot
     move a transaction between months.
4. **IDs are UUID v4 strings** generated in JS (`expo-crypto`, or a small helper), so rows can
   later be merged from another device without renumbering.
5. **Soft archive, hard delete.** Accounts and categories are archived (`is_archived`), not
   deleted, while referenced. Transactions are hard-deleted (with undo in the UI).
6. **Transfers are not expenses.** A transfer writes one row with `type='transfer'` plus a
   `transfer_account_id`; reporting excludes transfers.
7. **Sign is implied by type.** `amount_minor` is always positive; `type` says whether it moves
   money out (`expense`), in (`income`) or sideways (`transfer`).
8. **The name is the user's words.** `item_name` is what the thing was ("chicken shawarma"),
   `place` is where it came from ("Blue Bottle"), `note` is anything else. All three are free
   text and all three optional; display falls back `item_name → place → category name`.

## DDL (migration 001)

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE accounts (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  type                  TEXT NOT NULL CHECK (type IN ('cash','bank','card','wallet','savings')),
  currency              TEXT NOT NULL,                   -- ISO 4217, default = app currency
  opening_balance_minor INTEGER NOT NULL DEFAULT 0,
  color                 TEXT,
  icon                  TEXT,
  is_archived           INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0,1)),
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  parent_id   TEXT REFERENCES categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('expense','income')),
  icon        TEXT,
  color       TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0,1)),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX idx_categories_kind ON categories(kind, is_archived, sort_order);

CREATE TABLE recurring_rules (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL CHECK (type IN ('expense','income','transfer')),
  amount_minor   INTEGER NOT NULL CHECK (amount_minor > 0),
  currency       TEXT NOT NULL,                  -- posting keeps this currency
  account_id     TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id    TEXT REFERENCES categories(id) ON DELETE SET NULL,
  item_name      TEXT,
  place          TEXT,
  note           TEXT,
  frequency      TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
  interval_count INTEGER NOT NULL DEFAULT 1 CHECK (interval_count > 0),
  day_of_month   INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  start_date     TEXT NOT NULL,
  end_date       TEXT,
  next_due_at    TEXT NOT NULL,          -- computed; local_date of next occurrence
  auto_post      INTEGER NOT NULL DEFAULT 0 CHECK (auto_post IN (0,1)),
  remind_days    INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX idx_recurring_due ON recurring_rules(is_active, next_due_at);

CREATE TABLE transactions (
  id                  TEXT PRIMARY KEY,
  type                TEXT NOT NULL CHECK (type IN ('expense','income','transfer')),
  amount_minor        INTEGER NOT NULL CHECK (amount_minor > 0),
  currency            TEXT NOT NULL,              -- ISO 4217 snapshot; never rewritten
  account_id          TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  transfer_account_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id         TEXT REFERENCES categories(id) ON DELETE SET NULL,
  item_name           TEXT,                       -- "What was it?" e.g. chicken shawarma
  place               TEXT,                       -- "Where?" e.g. Blue Bottle
  note                TEXT,                       -- "Anything to remember?"
  occurred_at         TEXT NOT NULL,
  local_date          TEXT NOT NULL CHECK (local_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  recurring_id        TEXT REFERENCES recurring_rules(id) ON DELETE SET NULL,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  CHECK (type <> 'transfer' OR transfer_account_id IS NOT NULL),
  CHECK (type =  'transfer' OR transfer_account_id IS NULL)
);
CREATE INDEX idx_tx_local_date   ON transactions(local_date DESC);
CREATE INDEX idx_tx_currency     ON transactions(currency, local_date);
CREATE INDEX idx_tx_category     ON transactions(category_id, local_date);
CREATE INDEX idx_tx_account      ON transactions(account_id, local_date);
CREATE INDEX idx_tx_item         ON transactions(lower(item_name));
CREATE INDEX idx_tx_place        ON transactions(lower(place));

CREATE TABLE tags (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  color      TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE transaction_tags (
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id         TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, tag_id)
);

CREATE TABLE budgets (
  id          TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE, -- NULL = overall budget
  period      TEXT NOT NULL CHECK (period IN ('weekly','monthly','yearly')),
  limit_minor INTEGER NOT NULL CHECK (limit_minor > 0),
  currency    TEXT NOT NULL,     -- currency the limit was typed in
  rollover    INTEGER NOT NULL DEFAULT 0 CHECK (rollover IN (0,1)),
  start_date  TEXT NOT NULL,     -- anchor date for weekly/yearly periods
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  UNIQUE (category_id, period, currency)
);

-- SQLite treats NULLs as distinct, so UNIQUE above does NOT stop duplicate
-- "overall" budgets (category_id IS NULL). Enforce it with a partial index:
CREATE UNIQUE INDEX idx_budget_overall
  ON budgets(period, currency) WHERE category_id IS NULL;

CREATE TABLE category_rules (
  id         TEXT PRIMARY KEY,
  match_type TEXT NOT NULL CHECK (match_type IN (
               'item_contains','item_equals','place_contains','place_equals','note_contains')),
  pattern    TEXT NOT NULL,               -- stored lowercased/trimmed
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  priority   INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL
);

CREATE TABLE attachments (
  id             TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('receipt','other')),
  file_uri       TEXT NOT NULL,          -- inside the app documents dir, copied on import
  width          INTEGER,
  height         INTEGER,
  created_at     TEXT NOT NULL
);
CREATE INDEX idx_attachments_tx ON attachments(transaction_id);

CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Documented settings keys (all values are strings; booleans are `'0'`/`'1'`):

| Key | Example | Meaning |
| --- | --- | --- |
| `onboarded` | `'1'` | Onboarding finished |
| `country` | `'US'` | ISO 3166-1 alpha-2, drives defaults and the region picker |
| `currency` | `'USD'` | ISO 4217, the **active** currency for new entries |
| `locale` | `'en-US'` | BCP 47 tag used for number/date formatting (from `expo-localization`, overridable) |
| `theme` | `'system'` | `system` \| `light` \| `dark` |
| `last_account_id` | uuid | Default account on the add sheet |
| `currency_changed_at` | ISO date | Used to explain "entries before this date are in another currency" |
| `budget_period` | `'monthly'` | `weekly` \| `monthly` \| `yearly`; the period Overview and Budgets measure by, written by onboarding and the Budgets period pill |

Future tables (documented, **not** created in v1): `goals`, `goal_contributions`,
`households`, `household_members`, `sync_outbox`, `ai_suggestions`.

## Why these choices

| Decision | Reason |
| --- | --- |
| One `transactions` table for all types | Simple month queries; transfers filtered by `type` |
| `local_date` snapshot | Correct period bucketing independent of timezone/DST |
| `item_name` / `place` / `note` split | The title of a row is what was bought; where and why are separate, optional and independently searchable |
| `currency` snapshot on every money row | A settings change must never rewrite history; totals filter by active currency instead of converting |
| `_minor` integer amounts + `currency` exponent | Works for 0-, 2- and 3-decimal currencies without a second code path |
| `budgets.category_id` nullable | "--overall--" budget without a magic category row |
| `UNIQUE (category_id, period, currency)` + partial index | One budget per category per period per currency **and** one overall budget per period (needed because SQLite allows multiple NULLs in a UNIQUE constraint) |
| `next_due_at` stored, not recomputed on read | Cheap "bills due" queries and stable reminders |
| `category_rules` table, no ML | Deterministic, explainable, testable; ML only if data justifies it |
| `settings` as string KV | Avoids schema churn for flags like country, currency and onboarding |

## Migrations

- `PRAGMA user_version` is the schema version. Migration files export
  `{ version, up(db) }`; the runner applies sequentially inside a transaction and bumps
  `user_version`.
- Every migration is append-only and idempotent-safe when re-run against an already-migrated DB.
- Never edit an applied migration; add a new one.
- Before shipping a release, test: fresh install, upgrade from previous release,
  and upgrade with a non-empty database.

## Derived values (canonical formulas)

Let `period` be the active budget period containing today and `cur` the active currency
(`settings.currency`). Amounts are in `cur`'s minor unit; `exponent` comes from the currency
table.

```
spent(category, period)      = SUM(amount_minor) WHERE type='expense' AND currency = cur
                               AND category_id = ? AND local_date BETWEEN [start, end]
spent(total, period)         = SUM(amount_minor) WHERE type='expense' AND currency = cur
                               AND local_date BETWEEN [start, end]
budget_remaining(cat)        = limit_minor − spent(cat, period)      -- budgets.currency = cur
committed_unposted(period)   = SUM(amount_minor) FROM recurring_rules
                               WHERE is_active=1 AND type='expense' AND currency = cur
                               AND next_due_at BETWEEN [today, period_end]
safe_to_spend                = max(0, (overall_limit − spent_total − committed_unposted)
                                   / max(1, days_remaining_in_period))
account_balance(acc)         = opening_balance_minor
                               + SUM(income into acc)
                               − SUM(expense from acc)
                               + SUM(transfers in) − SUM(transfers out)
                               -- restricted to rows whose currency = acc.currency
```

Rules:
- Budget periods are **calendar-aligned** for monthly/yearly; weekly is anchored to
  `budgets.start_date` so users can start on payday.
- "Committed" only counts recurring expenses not already posted in the current period.
- If a category is over budget, `budget_remaining` is negative; the UI shows overspend in the
  danger color and clamps only `safe_to_spend` at zero.
- **Currencies never mix.** Every aggregate carries `AND currency = cur`. Rows in another
  currency are counted and surfaced ("12 entries in USD not included") and are readable in
  Activity by filtering on currency — never silently added to a total.
- Money math is integer-only. Division for safe-to-spend happens once, at the edge, and its
  result is displayed, not stored.
- All of the above live in `src/lib/domain/` as pure functions with unit tests covering:
  month boundaries, DST change days, leap-year February, 31st-of-month recurring bills in
  30-day months, negative/zero remaining, empty budgets, and 0/2/3-decimal currency parsing.

## Data volume assumptions

- 30 transactions/week ≈ 1,560/year. Ten years ≈ 16k rows — trivial for SQLite.
- Aggregate queries are indexed on `local_date`; the 12-month trend runs as a single
  `GROUP BY substr(local_date,1,7)` query.
- Receipt images live on disk, referenced by URI; row stores only metadata. Enforce a max
  size on import and delete files when their transaction is deleted.

## Backup & portability

- **v1**: CSV export of transactions (all columns, ISO dates, decimal amounts, ISO currency
  code per row) written to the cache/documents dir and shared via the OS share sheet. Amounts are
  serialized with the row's own currency exponent, so a JPY row exports `1200`, not `12.00`. Also
  a full JSON dump of all tables (schema version included) for lossless backup.
- **Tier 2**: automatic backup to the user's cloud drive folder; import/restore of the JSON dump
  with validation before applying.
- Never make the app's core loop depend on a backup having happened.
