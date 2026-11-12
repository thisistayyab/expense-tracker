import { isCurrencyCode } from "../../../constants/currencies";
import { newId } from "../../ids";
import type { Account, AccountType, Db } from "../types";
import { boolToInt, intToBool, nullable } from "../types";

type AccountRow = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  opening_balance_minor: number;
  color: string | null;
  icon: string | null;
  is_archived: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const SELECT = `SELECT id, name, type, currency, opening_balance_minor, color, icon,
                       is_archived, sort_order, created_at, updated_at
                FROM accounts`;

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    currency: row.currency,
    openingBalanceMinor: row.opening_balance_minor,
    color: row.color,
    icon: row.icon,
    isArchived: intToBool(row.is_archived),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type NewAccount = {
  name: string;
  type: AccountType;
  currency: string;
  openingBalanceMinor?: number;
  color?: string | null;
  icon?: string | null;
  sortOrder?: number;
};

export async function listAccounts(
  db: Db,
  options: { includeArchived?: boolean } = {},
): Promise<Account[]> {
  const rows = await db.getAllAsync<AccountRow>(
    `${SELECT} ${options.includeArchived ? "" : "WHERE is_archived = 0"} ORDER BY sort_order, name`,
  );
  return rows.map(mapAccount);
}

export async function getAccount(db: Db, id: string): Promise<Account | null> {
  const row = await db.getFirstAsync<AccountRow>(`${SELECT} WHERE id = ?`, [id]);
  return row ? mapAccount(row) : null;
}

export async function createAccount(db: Db, input: NewAccount): Promise<Account> {
  if (!input.name.trim()) throw new Error("An account needs a name");
  if (!isCurrencyCode(input.currency)) throw new Error(`Unknown currency: ${input.currency}`);

  const now = new Date().toISOString();
  const id = newId();
  await db.runAsync(
    `INSERT INTO accounts (id, name, type, currency, opening_balance_minor, color, icon, is_archived, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      id,
      input.name.trim(),
      input.type,
      input.currency.toUpperCase(),
      Math.trunc(input.openingBalanceMinor ?? 0),
      nullable(input.color ?? null),
      nullable(input.icon ?? null),
      input.sortOrder ?? 0,
      now,
      now,
    ],
  );
  return (await getAccount(db, id))!;
}

export async function updateAccount(
  db: Db,
  id: string,
  patch: { name?: string; color?: string | null; icon?: string | null; sortOrder?: number },
): Promise<void> {
  const current = await getAccount(db, id);
  if (!current) throw new Error(`Account not found: ${id}`);
  await db.runAsync(
    `UPDATE accounts
        SET name = ?, color = ?, icon = ?, sort_order = ?, updated_at = ?
      WHERE id = ?`,
    [
      patch.name?.trim() || current.name,
      patch.color === undefined ? current.color : nullable(patch.color),
      patch.icon === undefined ? current.icon : nullable(patch.icon),
      patch.sortOrder ?? current.sortOrder,
      new Date().toISOString(),
      id,
    ],
  );
}

export async function setAccountArchived(db: Db, id: string, archived: boolean): Promise<void> {
  await db.runAsync("UPDATE accounts SET is_archived = ?, updated_at = ? WHERE id = ?", [
    boolToInt(archived),
    new Date().toISOString(),
    id,
  ]);
}

/**
 * opening balance + income − expenses + transfers in − transfers out, restricted to
 * rows in the account's own currency. Currency is never converted.
 */
export async function accountBalance(db: Db, id: string): Promise<number> {
  const row = await db.getFirstAsync<{ balance: number }>(
    `SELECT a.opening_balance_minor
       + COALESCE((SELECT SUM(t.amount_minor) FROM transactions t
                   WHERE t.type = 'income' AND t.account_id = a.id AND t.currency = a.currency), 0)
       - COALESCE((SELECT SUM(t.amount_minor) FROM transactions t
                   WHERE t.type = 'expense' AND t.account_id = a.id AND t.currency = a.currency), 0)
       + COALESCE((SELECT SUM(t.amount_minor) FROM transactions t
                   WHERE t.type = 'transfer' AND t.transfer_account_id = a.id AND t.currency = a.currency), 0)
       - COALESCE((SELECT SUM(t.amount_minor) FROM transactions t
                   WHERE t.type = 'transfer' AND t.account_id = a.id AND t.currency = a.currency), 0)
       AS balance
     FROM accounts a WHERE a.id = ?`,
    [id],
  );
  return row?.balance ?? 0;
}
