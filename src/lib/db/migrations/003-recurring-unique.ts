import type { Db } from "../types";

/**
 * Migration 003 — one posted row per recurring rule per local date.
 *
 * Posting already checks for an existing row, but the index is the guarantee:
 * two foregrounds racing on the same occurrence cannot both insert, and a restore
 * that would create a duplicate is rejected instead of doubling a bill.
 *
 * Partial on purpose: manual and transfer rows have `recurring_id = NULL`, and
 * SQLite treats NULLs as distinct, but a partial index keeps the index small and
 * states the invariant directly.
 */
const DDL = `
CREATE UNIQUE INDEX idx_tx_recurring_date
  ON transactions(recurring_id, local_date)
  WHERE recurring_id IS NOT NULL;
`;

export const migration003 = {
  version: 3,
  async up(db: Db): Promise<void> {
    await db.execAsync(DDL);
  },
};
