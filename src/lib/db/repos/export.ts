import type { CsvTransaction } from "../../domain/csv";
import type { Db, TransactionType } from "../types";

type ExportRow = {
  id: string;
  type: TransactionType;
  amount_minor: number;
  currency: string;
  account_name: string;
  category_name: string | null;
  item_name: string | null;
  place: string | null;
  note: string | null;
  occurred_at: string;
  local_date: string;
  recurring_id: string | null;
  transfer_account_name: string | null;
};

/**
 * The export is a ledger, not a screen: no pagination, stable ordering, and both
 * sides of a transfer resolved to names so the file is readable without the app.
 */
export async function listTransactionsForExport(db: Db): Promise<CsvTransaction[]> {
  const rows = await db.getAllAsync<ExportRow>(
    `SELECT t.id, t.type, t.amount_minor, t.currency, a.name AS account_name,
            c.name AS category_name, t.item_name, t.place, t.note, t.occurred_at,
            t.local_date, t.recurring_id, ta.name AS transfer_account_name
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN accounts ta ON ta.id = t.transfer_account_id
      ORDER BY t.local_date, t.occurred_at, t.id`,
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    amountMinor: row.amount_minor,
    currency: row.currency,
    accountName: row.account_name,
    categoryName: row.category_name,
    itemName: row.item_name,
    place: row.place,
    note: row.note,
    occurredAt: row.occurred_at,
    localDate: row.local_date,
    recurringId: row.recurring_id,
    transferAccountName: row.transfer_account_name,
  }));
}
