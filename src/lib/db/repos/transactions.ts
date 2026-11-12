import { isCurrencyCode } from "../../../constants/currencies";
import { newId } from "../../ids";
import type { Db, Transaction, TransactionType } from "../types";
import { nullable } from "../types";

type TransactionRow = {
  id: string;
  type: TransactionType;
  amount_minor: number;
  currency: string;
  account_id: string;
  transfer_account_id: string | null;
  category_id: string | null;
  item_name: string | null;
  place: string | null;
  note: string | null;
  occurred_at: string;
  local_date: string;
  recurring_id: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = `id, type, amount_minor, currency, account_id, transfer_account_id,
                 category_id, item_name, place, note, occurred_at, local_date,
                 recurring_id, created_at, updated_at`;

const SELECT = `SELECT ${COLUMNS} FROM transactions`;

/** Search joins categories for its name, so every column must be qualified. */
const SELECT_WITH_CATEGORY = `SELECT ${COLUMNS.split(",")
  .map((column) => `t.${column.trim()}`)
  .join(", ")}
  FROM transactions t LEFT JOIN categories c ON c.id = t.category_id`;

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amountMinor: row.amount_minor,
    currency: row.currency,
    accountId: row.account_id,
    transferAccountId: row.transfer_account_id,
    categoryId: row.category_id,
    itemName: row.item_name,
    place: row.place,
    note: row.note,
    occurredAt: row.occurred_at,
    localDate: row.local_date,
    recurringId: row.recurring_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type NewTransaction = {
  type: TransactionType;
  amountMinor: number;
  currency: string;
  accountId: string;
  transferAccountId?: string | null;
  categoryId?: string | null;
  itemName?: string | null;
  place?: string | null;
  note?: string | null;
  occurredAt: string;
  localDate: string;
  recurringId?: string | null;
};

export type TransactionFilter = {
  currency?: string;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  fromDate?: string;
  toDate?: string;
  /** Case-insensitive search over item name, place, note and category name. */
  text?: string;
  limit?: number;
  offset?: number;
};

function assertAmount(amountMinor: number): void {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("amount_minor must be a positive integer in the currency's minor unit");
  }
}

function buildFilter(filter: TransactionFilter): { where: string; params: (string | number)[] } {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filter.currency) {
    clauses.push("t.currency = ?");
    params.push(filter.currency.toUpperCase());
  }
  if (filter.type) {
    clauses.push("t.type = ?");
    params.push(filter.type);
  }
  if (filter.accountId) {
    clauses.push("t.account_id = ?");
    params.push(filter.accountId);
  }
  if (filter.categoryId) {
    clauses.push("t.category_id = ?");
    params.push(filter.categoryId);
  }
  if (filter.fromDate) {
    clauses.push("t.local_date >= ?");
    params.push(filter.fromDate);
  }
  if (filter.toDate) {
    clauses.push("t.local_date <= ?");
    params.push(filter.toDate);
  }
  if (filter.text?.trim()) {
    const like = `%${filter.text.trim().toLowerCase()}%`;
    clauses.push(
      `(lower(t.item_name) LIKE ? OR lower(t.place) LIKE ? OR lower(t.note) LIKE ?
        OR lower(c.name) LIKE ?)`,
    );
    params.push(like, like, like, like);
  }

  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

export async function listTransactions(
  db: Db,
  filter: TransactionFilter = {},
): Promise<Transaction[]> {
  const { where, params } = buildFilter(filter);
  const limit = Math.max(1, Math.min(500, Math.trunc(filter.limit ?? 100)));
  const offset = Math.max(0, Math.trunc(filter.offset ?? 0));

  const rows = await db.getAllAsync<TransactionRow>(
    `${SELECT_WITH_CATEGORY}
     ${where}
     ORDER BY t.local_date DESC, t.occurred_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return rows.map(mapTransaction);
}

export async function getTransaction(db: Db, id: string): Promise<Transaction | null> {
  const row = await db.getFirstAsync<TransactionRow>(`${SELECT} WHERE id = ?`, [id]);
  return row ? mapTransaction(row) : null;
}

export async function createTransaction(db: Db, input: NewTransaction): Promise<Transaction> {
  assertAmount(input.amountMinor);
  if (!isCurrencyCode(input.currency)) throw new Error(`Unknown currency: ${input.currency}`);
  if (input.type === "transfer" && !input.transferAccountId) {
    throw new Error("A transfer needs a destination account");
  }

  const id = newId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO transactions (id, type, amount_minor, currency, account_id, transfer_account_id,
                               category_id, item_name, place, note, occurred_at, local_date,
                               recurring_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.type,
      Math.trunc(input.amountMinor),
      input.currency.toUpperCase(),
      input.accountId,
      input.type === "transfer" ? input.transferAccountId! : null,
      nullable(input.categoryId ?? null),
      nullable(input.itemName ?? null),
      nullable(input.place ?? null),
      nullable(input.note ?? null),
      input.occurredAt,
      input.localDate,
      input.recurringId ?? null,
      now,
      now,
    ],
  );

  return (await getTransaction(db, id))!;
}

export async function updateTransaction(
  db: Db,
  id: string,
  patch: Partial<Omit<NewTransaction, "id">>,
): Promise<void> {
  const current = await getTransaction(db, id);
  if (!current) throw new Error(`Transaction not found: ${id}`);

  if (patch.amountMinor !== undefined) assertAmount(patch.amountMinor);

  await db.runAsync(
    `UPDATE transactions
        SET amount_minor = ?, category_id = ?, item_name = ?, place = ?, note = ?,
            occurred_at = ?, local_date = ?, updated_at = ?
      WHERE id = ?`,
    [
      Math.trunc(patch.amountMinor ?? current.amountMinor),
      patch.categoryId === undefined ? current.categoryId : nullable(patch.categoryId),
      patch.itemName === undefined ? current.itemName : nullable(patch.itemName),
      patch.place === undefined ? current.place : nullable(patch.place),
      patch.note === undefined ? current.note : nullable(patch.note),
      patch.occurredAt ?? current.occurredAt,
      patch.localDate ?? current.localDate,
      new Date().toISOString(),
      id,
    ],
  );
}

export async function deleteTransaction(db: Db, id: string): Promise<void> {
  await db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);
}

/**
 * Total spent for one currency in a date window. Transfers are excluded (02 rule 6)
 * and rows in another currency are never added in — that is the whole point of the
 * `currency` snapshot.
 */
export async function sumSpent(
  db: Db,
  options: { currency: string; fromDate: string; toDate: string; categoryId?: string },
): Promise<number> {
  const params: (string | number)[] = [
    options.currency.toUpperCase(),
    options.fromDate,
    options.toDate,
  ];
  let categoryClause = "";
  if (options.categoryId) {
    categoryClause = "AND category_id = ?";
    params.push(options.categoryId);
  }

  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount_minor), 0) AS total
       FROM transactions
      WHERE type = 'expense' AND currency = ? AND local_date BETWEEN ? AND ? ${categoryClause}`,
    params,
  );
  return row?.total ?? 0;
}

export async function countTransactions(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM transactions");
  return row?.count ?? 0;
}

/** Currencies present in the data, for the "12 entries in USD are not included" note. */
export async function listCurrenciesInUse(db: Db): Promise<{ currency: string; count: number }[]> {
  return db.getAllAsync<{ currency: string; count: number }>(
    "SELECT currency, COUNT(*) AS count FROM transactions GROUP BY currency ORDER BY count DESC",
  );
}
