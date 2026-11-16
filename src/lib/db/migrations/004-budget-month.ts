import type { Db } from "../types";

/**
 * Migration 004 — budgets gain an optional calendar month.
 *
 * Until now a budget was a standing limit: one number for every month, so raising
 * December also rewrote January. `month` is NULL for the standing limit and
 * `YYYY-MM` for a limit that applies to that month only; `domain/budget-plan.ts`
 * resolves a month's row over the standing one.
 *
 * The original table carried `UNIQUE (category_id, period, currency)`, which would
 * reject a month row next to its standing row, so the table is rebuilt with that
 * uniqueness moved into partial indexes — SQLite cannot drop a table constraint.
 * No other table references `budgets`, so the rebuild is safe with foreign keys on.
 */
const DDL = `
CREATE TABLE budgets_v4 (
  id          TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  period      TEXT NOT NULL CHECK (period IN ('weekly','monthly','yearly')),
  month       TEXT CHECK (
                month IS NULL OR (
                  period = 'monthly'
                  AND length(month) = 7
                  AND month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
                  AND CAST(substr(month, 6, 2) AS INTEGER) BETWEEN 1 AND 12
                )
              ),
  limit_minor INTEGER NOT NULL CHECK (limit_minor > 0),
  currency    TEXT NOT NULL,
  rollover    INTEGER NOT NULL DEFAULT 0 CHECK (rollover IN (0,1)),
  start_date  TEXT NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Existing limits are standing limits: they keep applying to every month.
INSERT INTO budgets_v4
  (id, category_id, period, month, limit_minor, currency, rollover, start_date,
   is_active, created_at, updated_at)
SELECT id, category_id, period, NULL, limit_minor, currency, rollover, start_date,
       is_active, created_at, updated_at
  FROM budgets;

DROP TABLE budgets;
ALTER TABLE budgets_v4 RENAME TO budgets;

-- Standing limits: one overall and one per category, per period and currency.
CREATE UNIQUE INDEX idx_budget_standing_overall
  ON budgets(period, currency) WHERE month IS NULL AND category_id IS NULL;
CREATE UNIQUE INDEX idx_budget_standing_category
  ON budgets(category_id, period, currency) WHERE month IS NULL AND category_id IS NOT NULL;

-- Month-specific limits: one overall and one per category, per period, currency and month.
CREATE UNIQUE INDEX idx_budget_month_overall
  ON budgets(period, currency, month) WHERE month IS NOT NULL AND category_id IS NULL;
CREATE UNIQUE INDEX idx_budget_month_category
  ON budgets(category_id, period, currency, month)
  WHERE month IS NOT NULL AND category_id IS NOT NULL;
`;

export const migration004 = {
  version: 4,
  async up(db: Db): Promise<void> {
    await db.execAsync(DDL);
  },
};
