import type { Db } from "../types";

/**
 * Migration 002 — covering index for the P5 insight aggregates.
 *
 * Every report query filters `currency = ?` and a `local_date` range, then reads
 * `type`, `category_id`, `amount_minor` and `item_name`. With those columns in the
 * index, SQLite can answer the trend, breakdown and top-item queries from the index
 * alone instead of following each matching row back to the table (the P5 gate is
 * 16k rows in under 50 ms).
 *
 * The existing `idx_tx_currency(currency, local_date)` remains for the list screen;
 * this one is a strict superset of its prefix, so the planner can prefer it for
 * aggregates without changing list plans.
 */
const DDL = `
CREATE INDEX idx_tx_insight
  ON transactions(currency, local_date, type, category_id, amount_minor, item_name);
`;

export const migration002 = {
  version: 2,
  async up(db: Db): Promise<void> {
    await db.execAsync(DDL);
  },
};
