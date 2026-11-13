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

export type AccountPatch = {
  name?: string;
  type?: AccountType;
  currency?: string;
  openingBalanceMinor?: number;
  color?: string | null;
  icon?: string | null;
  sortOrder?: number;
};

const ACCOUNT_TYPES: readonly AccountType[] = ["cash", "bank", "card", "wallet", "savings"];

/** True for both the source and destination side of a transfer. */
export async function accountHasTransactions(db: Db, id: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM transactions
      WHERE account_id = ? OR transfer_account_id = ?`,
    [id, id],
  );
  return (row?.count ?? 0) > 0;
}

export async function updateAccount(
  db: Db,
  id: string,
  patch: AccountPatch,
): Promise<void> {
  const current = await getAccount(db, id);
  if (!current) throw new Error(`Account not found: ${id}`);

  if (patch.name !== undefined && !patch.name.trim()) {
    throw new Error("An account needs a name");
  }
  if (patch.type !== undefined && !ACCOUNT_TYPES.includes(patch.type)) {
    throw new Error(`Unknown account type: ${patch.type}`);
  }

  const nextCurrency = patch.currency?.trim().toUpperCase() ?? current.currency;
  if (!isCurrencyCode(nextCurrency)) throw new Error(`Unknown currency: ${nextCurrency}`);
  if (nextCurrency !== current.currency && (await accountHasTransactions(db, id))) {
    throw new Error("An account with history cannot change currency");
  }
  if (nextCurrency !== current.currency) {
    const rules = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM recurring_rules WHERE account_id = ?",
      [id],
    );
    if ((rules?.count ?? 0) > 0) {
      throw new Error("An account with recurring rules cannot change currency");
    }
  }

  await db.runAsync(
    `UPDATE accounts
        SET name = ?, type = ?, currency = ?, opening_balance_minor = ?, color = ?, icon = ?,
            sort_order = ?, updated_at = ?
      WHERE id = ?`,
    [
      patch.name?.trim() || current.name,
      patch.type ?? current.type,
      nextCurrency,
      Math.trunc(patch.openingBalanceMinor ?? current.openingBalanceMinor),
      patch.color === undefined ? current.color : nullable(patch.color),
      patch.icon === undefined ? current.icon : nullable(patch.icon),
      patch.sortOrder ?? current.sortOrder,
      new Date().toISOString(),
      id,
    ],
  );
}

export async function setAccountArchived(db: Db, id: string, archived: boolean): Promise<void> {
  if (archived) {
    // A rule would otherwise keep posting into an account the UI no longer offers.
    const rules = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM recurring_rules WHERE account_id = ? AND is_active = 1",
      [id],
    );
    if ((rules?.count ?? 0) > 0) {
      throw new Error("Pause recurring rules before archiving this account");
    }
  }

  await db.runAsync("UPDATE accounts SET is_archived = ?, updated_at = ? WHERE id = ?", [
    boolToInt(archived),
    new Date().toISOString(),
    id,
  ]);
}

export type AccountWithBalance = Account & {
  balanceMinor: number;
  transactionCount: number;
};

/**
 * Every account with its computed balance in one query. The join matches a
 * transfer once on either side; the CASE decides whether it adds or subtracts.
 * Currency is never converted.
 */
export async function listAccountBalances(
  db: Db,
  options: { includeArchived?: boolean } = {},
): Promise<AccountWithBalance[]> {
  const rows = await db.getAllAsync<
    AccountRow & { balance_minor: number; transaction_count: number }
  >(
    `SELECT a.id, a.name, a.type, a.currency, a.opening_balance_minor, a.color, a.icon,
            a.is_archived, a.sort_order, a.created_at, a.updated_at,
            a.opening_balance_minor + COALESCE(SUM(CASE
              WHEN t.type = 'income' AND t.account_id = a.id THEN t.amount_minor
              WHEN t.type = 'expense' AND t.account_id = a.id THEN -t.amount_minor
              WHEN t.type = 'transfer' AND t.account_id = a.id THEN -t.amount_minor
              WHEN t.type = 'transfer' AND t.transfer_account_id = a.id THEN t.amount_minor
              ELSE 0 END), 0) AS balance_minor,
            COUNT(t.id) AS transaction_count
       FROM accounts a
       LEFT JOIN transactions t
         ON t.account_id = a.id OR t.transfer_account_id = a.id
      ${options.includeArchived ? "" : "WHERE a.is_archived = 0"}
      GROUP BY a.id
      ORDER BY a.sort_order, a.name`,
  );

  return rows.map((row) => ({
    ...mapAccount(row),
    balanceMinor: row.balance_minor ?? 0,
    transactionCount: row.transaction_count ?? 0,
  }));
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
