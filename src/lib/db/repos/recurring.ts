import { isCurrencyCode } from "../../../constants/currencies";
import { newId } from "../../ids";
import type { Db, RecurringFrequency, RecurringRule, TransactionType } from "../types";
import { boolToInt, intToBool, nullable } from "../types";

type RecurringRow = {
  id: string;
  type: TransactionType;
  amount_minor: number;
  currency: string;
  account_id: string;
  category_id: string | null;
  item_name: string | null;
  place: string | null;
  note: string | null;
  frequency: RecurringFrequency;
  interval_count: number;
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  next_due_at: string;
  auto_post: number;
  remind_days: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

const SELECT = `SELECT id, type, amount_minor, currency, account_id, category_id, item_name,
                       place, note, frequency, interval_count, day_of_month, start_date,
                       end_date, next_due_at, auto_post, remind_days, is_active,
                       created_at, updated_at
                FROM recurring_rules`;

function mapRule(row: RecurringRow): RecurringRule {
  return {
    id: row.id,
    type: row.type,
    amountMinor: row.amount_minor,
    currency: row.currency,
    accountId: row.account_id,
    categoryId: row.category_id,
    itemName: row.item_name,
    place: row.place,
    note: row.note,
    frequency: row.frequency,
    intervalCount: row.interval_count,
    dayOfMonth: row.day_of_month,
    startDate: row.start_date,
    endDate: row.end_date,
    nextDueAt: row.next_due_at,
    autoPost: intToBool(row.auto_post),
    remindDays: row.remind_days,
    isActive: intToBool(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type NewRecurringRule = {
  type: TransactionType;
  amountMinor: number;
  currency: string;
  accountId: string;
  categoryId?: string | null;
  itemName?: string | null;
  place?: string | null;
  note?: string | null;
  frequency: RecurringFrequency;
  intervalCount?: number;
  dayOfMonth?: number | null;
  startDate: string;
  endDate?: string | null;
  nextDueAt: string;
  autoPost?: boolean;
  remindDays?: number;
};

export async function listRecurringRules(
  db: Db,
  options: { includeInactive?: boolean; currency?: string } = {},
): Promise<RecurringRule[]> {
  const clauses: string[] = [];
  const params: string[] = [];

  if (!options.includeInactive) clauses.push("is_active = 1");
  if (options.currency) {
    clauses.push("currency = ?");
    params.push(options.currency.toUpperCase());
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await db.getAllAsync<RecurringRow>(
    `${SELECT} ${where} ORDER BY next_due_at`,
    params,
  );
  return rows.map(mapRule);
}

export async function createRecurringRule(db: Db, input: NewRecurringRule): Promise<RecurringRule> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("A recurring rule needs a positive integer amount");
  }
  if (!isCurrencyCode(input.currency)) throw new Error(`Unknown currency: ${input.currency}`);
  if (input.type === "transfer") {
    throw new Error("Recurring transfers need two accounts; deferred until P6");
  }

  const id = newId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO recurring_rules (id, type, amount_minor, currency, account_id, category_id,
                                  item_name, place, note, frequency, interval_count, day_of_month,
                                  start_date, end_date, next_due_at, auto_post, remind_days,
                                  is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      input.type,
      Math.trunc(input.amountMinor),
      input.currency.toUpperCase(),
      input.accountId,
      nullable(input.categoryId ?? null),
      nullable(input.itemName ?? null),
      nullable(input.place ?? null),
      nullable(input.note ?? null),
      input.frequency,
      Math.max(1, Math.trunc(input.intervalCount ?? 1)),
      input.dayOfMonth ?? null,
      input.startDate,
      input.endDate ?? null,
      input.nextDueAt,
      boolToInt(input.autoPost ?? false),
      Math.max(0, Math.trunc(input.remindDays ?? 0)),
      now,
      now,
    ],
  );

  const row = await db.getFirstAsync<RecurringRow>(`${SELECT} WHERE id = ?`, [id]);
  return mapRule(row!);
}

export async function setRecurringActive(db: Db, id: string, active: boolean): Promise<void> {
  await db.runAsync("UPDATE recurring_rules SET is_active = ?, updated_at = ? WHERE id = ?", [
    boolToInt(active),
    new Date().toISOString(),
    id,
  ]);
}

export async function setNextDueAt(db: Db, id: string, nextDueAt: string): Promise<void> {
  await db.runAsync("UPDATE recurring_rules SET next_due_at = ?, updated_at = ? WHERE id = ?", [
    nextDueAt,
    new Date().toISOString(),
    id,
  ]);
}

export async function deleteRecurringRule(db: Db, id: string): Promise<void> {
  await db.runAsync("DELETE FROM recurring_rules WHERE id = ?", [id]);
}
