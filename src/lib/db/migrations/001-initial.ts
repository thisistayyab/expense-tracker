import type { Db } from "../types";

/**
 * Migration 001 — the full v1 schema from blueprints/02-data-model.md.
 *
 * Append-only: never edit this file after it ships. Changes become migration 002.
 * `PRAGMA journal_mode` and `foreign_keys` are applied by `client.ts` on every open,
 * not here: pragmas are connection state, not schema.
 */
const DDL = `
CREATE TABLE accounts (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  type                  TEXT NOT NULL CHECK (type IN ('cash','bank','card','wallet','savings')),
  currency              TEXT NOT NULL,
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
  currency       TEXT NOT NULL,
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
  next_due_at    TEXT NOT NULL,
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
  currency            TEXT NOT NULL,
  account_id          TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  transfer_account_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id         TEXT REFERENCES categories(id) ON DELETE SET NULL,
  item_name           TEXT,
  place               TEXT,
  note                TEXT,
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
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  period      TEXT NOT NULL CHECK (period IN ('weekly','monthly','yearly')),
  limit_minor INTEGER NOT NULL CHECK (limit_minor > 0),
  currency    TEXT NOT NULL,
  rollover    INTEGER NOT NULL DEFAULT 0 CHECK (rollover IN (0,1)),
  start_date  TEXT NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  UNIQUE (category_id, period, currency)
);

-- SQLite treats NULLs as distinct, so the UNIQUE above does not stop duplicate
-- overall budgets. A partial index does.
CREATE UNIQUE INDEX idx_budget_overall
  ON budgets(period, currency) WHERE category_id IS NULL;

CREATE TABLE category_rules (
  id          TEXT PRIMARY KEY,
  match_type  TEXT NOT NULL CHECK (match_type IN (
                'item_contains','item_equals','place_contains','place_equals','note_contains')),
  pattern     TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  priority    INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at  TEXT NOT NULL
);

CREATE TABLE attachments (
  id             TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('receipt','other')),
  file_uri       TEXT NOT NULL,
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
`;

export const migration001 = {
  version: 1,
  async up(db: Db): Promise<void> {
    await db.execAsync(DDL);
  },
};
