import type { Db } from "../types";

/**
 * Migration 005 — an optional fee attached to a transaction or recurring rule.
 *
 * Some accounts charge a fee on a payment, withdrawal or transfer. The fee is
 * money that leaves the account but is not part of the price of the item, so it
 * gets its own column instead of being folded into `amount_minor`. Reports add it
 * to spending (it is real money spent) while the transaction still shows what was
 * bought for how much. `fee_minor = 0` is the default, so every existing row stays
 * exactly as it was.
 *
 * Fees are kept in the row's own currency and follow the same minor-unit rule as
 * amounts: integer, never a float.
 */
const DDL = `
ALTER TABLE transactions
  ADD COLUMN fee_minor INTEGER NOT NULL DEFAULT 0 CHECK (fee_minor >= 0);

ALTER TABLE recurring_rules
  ADD COLUMN fee_minor INTEGER NOT NULL DEFAULT 0 CHECK (fee_minor >= 0);

-- Migration 002's covering index predates this column. Without rebuilding it,
-- every insight aggregate would follow each matching row back to the table to
-- read fee_minor, which costs far more than the fee arithmetic itself.
DROP INDEX IF EXISTS idx_tx_insight;
CREATE INDEX idx_tx_insight
  ON transactions(currency, local_date, type, category_id, amount_minor, fee_minor, item_name);

-- Fee totals are read per currency, date window, and type; partial + covering keeps it small and fast.
CREATE INDEX idx_tx_fee
  ON transactions(currency, local_date, type, fee_minor) WHERE fee_minor > 0;
`;

export const migration005 = {
  version: 5,
  async up(db: Db): Promise<void> {
    await db.execAsync(DDL);
  },
};
