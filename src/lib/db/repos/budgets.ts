import { isCurrencyCode } from "../../../constants/currencies";
import { newId } from "../../ids";
import type { Budget, BudgetPeriod, Db } from "../types";
import { boolToInt, intToBool } from "../types";

type BudgetRow = {
  id: string;
  category_id: string | null;
  period: BudgetPeriod;
  month: string | null;
  limit_minor: number;
  currency: string;
  rollover: number;
  start_date: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

const SELECT = `SELECT id, category_id, period, month, limit_minor, currency, rollover,
                       start_date, is_active, created_at, updated_at
                FROM budgets`;

function mapBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    categoryId: row.category_id,
    period: row.period,
    month: row.month,
    limitMinor: row.limit_minor,
    currency: row.currency,
    rollover: intToBool(row.rollover),
    startDate: row.start_date,
    isActive: intToBool(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listBudgets(
  db: Db,
  options: { currency?: string; period?: BudgetPeriod; includeInactive?: boolean } = {},
): Promise<Budget[]> {
  const clauses: string[] = [];
  const params: string[] = [];

  if (options.currency) {
    clauses.push("currency = ?");
    params.push(options.currency.toUpperCase());
  }
  if (options.period) {
    clauses.push("period = ?");
    params.push(options.period);
  }
  if (!options.includeInactive) clauses.push("is_active = 1");

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await db.getAllAsync<BudgetRow>(
    `${SELECT} ${where} ORDER BY category_id IS NULL DESC, created_at`,
    params,
  );
  return rows.map(mapBudget);
}

export type UpsertBudget = {
  /** null = the overall budget. */
  categoryId: string | null;
  period: BudgetPeriod;
  /** `YYYY-MM` for that month only; null or omitted = the every-month limit. */
  month?: string | null;
  limitMinor: number;
  currency: string;
  startDate: string;
  rollover?: boolean;
};

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * One budget per (category, period, currency, month) and exactly one overall budget
 * per (period, currency, month) — the partial indexes enforce the NULL cases that a
 * plain UNIQUE constraint cannot. A month is part of the identity, so a standing
 * limit and its month override coexist. Upsert is manual because `ON CONFLICT`
 * cannot target a partial index by column list.
 */
export async function upsertBudgetInTransaction(db: Db, input: UpsertBudget): Promise<Budget> {
  if (!Number.isSafeInteger(input.limitMinor) || input.limitMinor <= 0) {
    throw new Error("A budget limit must be a positive integer in minor units");
  }
  if (!isCurrencyCode(input.currency)) throw new Error(`Unknown currency: ${input.currency}`);

  const month = input.month ?? null;
  if (month !== null) {
    if (input.period !== "monthly") {
      throw new Error("Only a monthly budget can be limited to one month");
    }
    if (!MONTH_KEY.test(month)) throw new Error(`Invalid budget month: ${month}`);
  }

  const currency = input.currency.toUpperCase();
  const now = new Date().toISOString();

  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM budgets
      WHERE period = ? AND currency = ? AND month IS ?
        AND ((? IS NULL AND category_id IS NULL) OR category_id = ?)`,
    [input.period, currency, month, input.categoryId, input.categoryId],
  );

  if (existing) {
    await db.runAsync(
      `UPDATE budgets SET limit_minor = ?, rollover = ?, start_date = ?, is_active = 1, updated_at = ?
        WHERE id = ?`,
      [
        Math.trunc(input.limitMinor),
        boolToInt(input.rollover ?? false),
        input.startDate,
        now,
        existing.id,
      ],
    );
    const row = await db.getFirstAsync<BudgetRow>(`${SELECT} WHERE id = ?`, [existing.id]);
    return mapBudget(row!);
  }

  const id = newId();
  await db.runAsync(
    `INSERT INTO budgets (id, category_id, period, month, limit_minor, currency, rollover, start_date, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      input.categoryId,
      input.period,
      month,
      Math.trunc(input.limitMinor),
      currency,
      boolToInt(input.rollover ?? false),
      input.startDate,
      now,
      now,
    ],
  );

  const row = await db.getFirstAsync<BudgetRow>(`${SELECT} WHERE id = ?`, [id]);
  return mapBudget(row!);
}

export async function upsertBudget(db: Db, input: UpsertBudget): Promise<Budget> {
  let saved: Budget | null = null;
  await db.withTransactionAsync(async () => {
    saved = await upsertBudgetInTransaction(db, input);
  });
  return saved!;
}

/**
 * Deactivating keeps the row so history and the "previous currency" section can
 * still explain it. Deleting a budget never touches transactions.
 */
export async function deactivateBudget(db: Db, id: string): Promise<void> {
  await db.runAsync("UPDATE budgets SET is_active = 0, updated_at = ? WHERE id = ?", [
    new Date().toISOString(),
    id,
  ]);
}

export async function deleteBudget(db: Db, id: string): Promise<void> {
  await db.runAsync("DELETE FROM budgets WHERE id = ?", [id]);
}
