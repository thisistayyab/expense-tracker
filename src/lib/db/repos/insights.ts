import type { Db } from "../types";

/**
 * Aggregate queries for P5. Every one is scoped to a single currency and a date
 * window, and transfers are excluded because moving money is not spending (02).
 *
 * They are written to be index-friendly: `currency + local_date` narrows first,
 * then SQLite groups a small result set. No row is loaded into JS to be summed.
 */

export type MonthlyTotal = {
  /** `YYYY-MM` of `local_date`. */
  month: string;
  expenseMinor: number;
  incomeMinor: number;
};

export async function monthlyTotals(
  db: Db,
  options: { currency: string; fromDate: string; toDate: string },
): Promise<MonthlyTotal[]> {
  const rows = await db.getAllAsync<{
    month: string;
    expense_minor: number;
    income_minor: number;
  }>(
    `SELECT substr(local_date, 1, 7) AS month,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END), 0) AS expense_minor,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END), 0) AS income_minor
       FROM transactions
      WHERE currency = ? AND local_date BETWEEN ? AND ?
        AND type IN ('expense', 'income')
      GROUP BY month
      ORDER BY month`,
    [options.currency.toUpperCase(), options.fromDate, options.toDate],
  );
  return rows.map((row) => ({
    month: row.month,
    expenseMinor: row.expense_minor ?? 0,
    incomeMinor: row.income_minor ?? 0,
  }));
}

export type NamedItemTotal = {
  /** Lowercased name, the grouping key. */
  key: string;
  /** One original spelling to show; casing is a user choice, not a data shape. */
  label: string;
  amountMinor: number;
  count: number;
};

/**
 * Top named items by spend. Grouping is case-insensitive because "Flat white" and
 * "flat white" are the same thing to a person; blank names are excluded here and
 * handled by `unnamedItemTotals` instead.
 */
export async function topItemTotals(
  db: Db,
  options: { currency: string; fromDate: string; toDate: string; limit?: number },
): Promise<NamedItemTotal[]> {
  const limit = Math.max(1, Math.min(50, Math.trunc(options.limit ?? 5)));
  const rows = await db.getAllAsync<{
    item_key: string;
    label: string;
    amount_minor: number;
    count: number;
  }>(
    `SELECT lower(trim(item_name)) AS item_key,
            MAX(item_name) AS label,
            COALESCE(SUM(amount_minor), 0) AS amount_minor,
            COUNT(*) AS count
       FROM transactions
      WHERE type = 'expense' AND currency = ?
        AND local_date BETWEEN ? AND ?
        AND item_name IS NOT NULL AND trim(item_name) <> ''
      GROUP BY item_key
      ORDER BY amount_minor DESC, label
      LIMIT ?`,
    [options.currency.toUpperCase(), options.fromDate, options.toDate, limit],
  );
  return rows.map((row) => ({
    key: row.item_key,
    label: row.label,
    amountMinor: row.amount_minor ?? 0,
    count: row.count,
  }));
}

export type UnnamedCategoryTotal = {
  /** null = no category either; shown as "Uncategorized". */
  categoryId: string | null;
  amountMinor: number;
  count: number;
};

/** Spend rows with no item name, grouped by category — the top-items fallback. */
export async function unnamedItemTotals(
  db: Db,
  options: { currency: string; fromDate: string; toDate: string; limit?: number },
): Promise<UnnamedCategoryTotal[]> {
  const limit = Math.max(1, Math.min(50, Math.trunc(options.limit ?? 5)));
  const rows = await db.getAllAsync<{
    category_id: string | null;
    amount_minor: number;
    count: number;
  }>(
    `SELECT category_id,
            COALESCE(SUM(amount_minor), 0) AS amount_minor,
            COUNT(*) AS count
       FROM transactions
      WHERE type = 'expense' AND currency = ?
        AND local_date BETWEEN ? AND ?
        AND (item_name IS NULL OR trim(item_name) = '')
      GROUP BY category_id
      ORDER BY amount_minor DESC
      LIMIT ?`,
    [options.currency.toUpperCase(), options.fromDate, options.toDate, limit],
  );
  return rows.map((row) => ({
    categoryId: row.category_id,
    amountMinor: row.amount_minor ?? 0,
    count: row.count,
  }));
}
