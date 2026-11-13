import { isCurrencyCode } from "../../../constants/currencies";
import type { IsoDate } from "../../domain/dates";
import { isIsoDate } from "../../domain/dates";
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

/** Every editable field; `nextDueAt` is computed by the caller and stored. */
export type RecurringRuleDraft = {
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
  startDate: IsoDate;
  endDate?: IsoDate | null;
  nextDueAt: IsoDate;
  autoPost?: boolean;
  remindDays?: number;
};

const FREQUENCIES: readonly RecurringFrequency[] = ["daily", "weekly", "monthly", "yearly"];

/**
 * The schedule details a rule can rely on: the account must exist in the rule's
 * currency, and a category must belong to the rule's kind. The pickers already
 * filter, but a repository is the last line of defence against a bad write.
 */
async function assertRuleLinks(db: Db, input: RecurringRuleDraft): Promise<void> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("A recurring rule needs a positive integer amount");
  }
  const currency = input.currency.trim().toUpperCase();
  if (!isCurrencyCode(currency)) throw new Error(`Unknown currency: ${input.currency}`);
  if (input.type === "transfer") {
    throw new Error(
      "Recurring transfers are not supported in v1: a rule stores a single account",
    );
  }
  if (!FREQUENCIES.includes(input.frequency)) {
    throw new Error(`Unknown frequency: ${input.frequency}`);
  }
  if (!isIsoDate(input.startDate)) throw new Error("A rule needs a real start date");
  if (!isIsoDate(input.nextDueAt)) throw new Error("A rule needs a real next due date");
  if (input.endDate && !isIsoDate(input.endDate)) throw new Error("The end date is invalid");
  if (input.endDate && input.endDate < input.startDate) {
    throw new Error("The end date cannot be before the start date");
  }
  if (input.dayOfMonth != null && (input.dayOfMonth < 1 || input.dayOfMonth > 31)) {
    throw new Error("The day of month must be between 1 and 31");
  }

  const account = await db.getFirstAsync<{ currency: string; is_archived: number }>(
    "SELECT currency, is_archived FROM accounts WHERE id = ?",
    [input.accountId],
  );
  if (!account) throw new Error(`Account not found: ${input.accountId}`);
  if (account.is_archived) throw new Error("That account is archived");
  if (account.currency.toUpperCase() !== currency) {
    throw new Error("The account must use the rule's currency");
  }

  if (input.categoryId) {
    const category = await db.getFirstAsync<{ kind: string }>(
      "SELECT kind FROM categories WHERE id = ?",
      [input.categoryId],
    );
    if (!category) throw new Error(`Category not found: ${input.categoryId}`);
    if (category.kind !== input.type) {
      throw new Error(`That is an ${category.kind} category, not ${input.type}`);
    }
  }
}

type NormalizedRecurringRule = RecurringRuleDraft & {
  categoryId: string | null;
  itemName: string | null;
  place: string | null;
  note: string | null;
  intervalCount: number;
  dayOfMonth: number | null;
  endDate: string | null;
  autoPost: boolean;
  remindDays: number;
};

/** Normalise before writing: monthly/yearly always keep an anchor day. */
function normalizeDraft(input: RecurringRuleDraft): NormalizedRecurringRule {
  const dayFromStart = Number(input.startDate.slice(8, 10));
  return {
    type: input.type,
    amountMinor: input.amountMinor,
    currency: input.currency.trim().toUpperCase(),
    accountId: input.accountId,
    categoryId: nullable(input.categoryId ?? null),
    itemName: nullable(input.itemName ?? null),
    place: nullable(input.place ?? null),
    note: nullable(input.note ?? null),
    frequency: input.frequency,
    intervalCount: Math.max(1, Math.trunc(input.intervalCount ?? 1)),
    dayOfMonth:
      input.frequency === "monthly" || input.frequency === "yearly"
        ? (input.dayOfMonth ?? dayFromStart)
        : null,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    nextDueAt: input.nextDueAt,
    autoPost: input.autoPost ?? false,
    remindDays: Math.max(0, Math.trunc(input.remindDays ?? 0)),
  };
}

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
    `${SELECT} ${where} ORDER BY is_active DESC, next_due_at, item_name`,
    params,
  );
  return rows.map(mapRule);
}

export async function getRecurringRule(db: Db, id: string): Promise<RecurringRule | null> {
  const row = await db.getFirstAsync<RecurringRow>(`${SELECT} WHERE id = ?`, [id]);
  return row ? mapRule(row) : null;
}

export async function createRecurringRule(
  db: Db,
  input: RecurringRuleDraft,
): Promise<RecurringRule> {
  await assertRuleLinks(db, input);
  const draft = normalizeDraft(input);
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
      draft.type,
      Math.trunc(draft.amountMinor),
      draft.currency,
      draft.accountId,
      draft.categoryId,
      draft.itemName,
      draft.place,
      draft.note,
      draft.frequency,
      draft.intervalCount!,
      draft.dayOfMonth ?? null,
      draft.startDate,
      draft.endDate,
      draft.nextDueAt,
      boolToInt(draft.autoPost ?? false),
      draft.remindDays!,
      now,
      now,
    ],
  );

  const row = await db.getFirstAsync<RecurringRow>(`${SELECT} WHERE id = ?`, [id]);
  return mapRule(row!);
}

export async function updateRecurringRule(
  db: Db,
  id: string,
  input: RecurringRuleDraft,
): Promise<RecurringRule> {
  const current = await getRecurringRule(db, id);
  if (!current) throw new Error(`Recurring rule not found: ${id}`);
  await assertRuleLinks(db, input);
  const draft = normalizeDraft(input);

  await db.runAsync(
    `UPDATE recurring_rules
        SET type = ?, amount_minor = ?, currency = ?, account_id = ?, category_id = ?,
            item_name = ?, place = ?, note = ?, frequency = ?, interval_count = ?,
            day_of_month = ?, start_date = ?, end_date = ?, next_due_at = ?,
            auto_post = ?, remind_days = ?, updated_at = ?
      WHERE id = ?`,
    [
      draft.type,
      Math.trunc(draft.amountMinor),
      draft.currency,
      draft.accountId,
      draft.categoryId,
      draft.itemName,
      draft.place,
      draft.note,
      draft.frequency,
      draft.intervalCount!,
      draft.dayOfMonth ?? null,
      draft.startDate,
      draft.endDate,
      draft.nextDueAt,
      boolToInt(draft.autoPost ?? false),
      draft.remindDays!,
      new Date().toISOString(),
      id,
    ],
  );

  return (await getRecurringRule(db, id))!;
}

export async function setRecurringActive(db: Db, id: string, active: boolean): Promise<void> {
  if (active) {
    const account = await db.getFirstAsync<{ is_archived: number }>(
      `SELECT a.is_archived FROM recurring_rules r
         JOIN accounts a ON a.id = r.account_id
        WHERE r.id = ?`,
      [id],
    );
    if (!account) throw new Error(`Recurring rule not found: ${id}`);
    if (account.is_archived) {
      throw new Error("Restore the account before resuming this recurring rule");
    }
  }

  await db.runAsync("UPDATE recurring_rules SET is_active = ?, updated_at = ? WHERE id = ?", [
    boolToInt(active),
    new Date().toISOString(),
    id,
  ]);
}

export async function setNextDueAt(db: Db, id: string, nextDueAt: IsoDate): Promise<void> {
  await db.runAsync("UPDATE recurring_rules SET next_due_at = ?, updated_at = ? WHERE id = ?", [
    nextDueAt,
    new Date().toISOString(),
    id,
  ]);
}

/** Advance the stored cursor and, optionally, retire a finished rule. */
export async function advanceRecurringRule(
  db: Db,
  id: string,
  nextDueAt: IsoDate | null,
  active: boolean,
): Promise<void> {
  await db.runAsync(
    `UPDATE recurring_rules
        SET next_due_at = COALESCE(?, next_due_at), is_active = ?, updated_at = ?
      WHERE id = ?`,
    [nextDueAt, boolToInt(active), new Date().toISOString(), id],
  );
}

export async function deleteRecurringRule(db: Db, id: string): Promise<void> {
  await db.runAsync("DELETE FROM recurring_rules WHERE id = ?", [id]);
}

/** Active auto-post rules whose stored cursor has come due. */
export async function listDueRecurringRules(
  db: Db,
  throughDate: IsoDate,
): Promise<RecurringRule[]> {
  const rows = await db.getAllAsync<RecurringRow>(
    `${SELECT}
      WHERE is_active = 1 AND auto_post = 1 AND next_due_at <= ?
      ORDER BY next_due_at`,
    [throughDate],
  );
  return rows.map(mapRule);
}

/**
 * Bills for the Home card: active rules in one currency due by `throughDate`,
 * including overdue manual rules (an unpaid bill must not quietly disappear).
 */
export async function listUpcomingRecurringRules(
  db: Db,
  options: { currency: string; throughDate: IsoDate; limit?: number },
): Promise<RecurringRule[]> {
  const rows = await db.getAllAsync<RecurringRow>(
    `${SELECT}
      WHERE is_active = 1 AND type = 'expense' AND currency = ? AND next_due_at <= ?
      ORDER BY next_due_at
      LIMIT ?`,
    [options.currency.toUpperCase(), options.throughDate, Math.max(1, options.limit ?? 3)],
  );
  return rows.map(mapRule);
}

/**
 * Insert one occurrence. `OR IGNORE` plus the migration-003 unique index is what
 * makes backfill safe to retry: the row either appears once or already existed.
 * Returns the number of rows actually inserted (0 or 1).
 */
export async function insertPostedOccurrence(
  db: Db,
  rule: RecurringRule,
  localDate: IsoDate,
): Promise<number> {
  const occurredAt = new Date(`${localDate}T12:00:00`).toISOString();
  const now = new Date().toISOString();

  const result = await db.runAsync(
    `INSERT OR IGNORE INTO transactions
       (id, type, amount_minor, currency, account_id, transfer_account_id, category_id,
        item_name, place, note, occurred_at, local_date, recurring_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newId(),
      rule.type,
      rule.amountMinor,
      rule.currency,
      rule.accountId,
      rule.categoryId,
      rule.itemName,
      rule.place,
      rule.note,
      occurredAt,
      localDate,
      rule.id,
      now,
      now,
    ],
  );

  return result.changes;
}

/**
 * Bills already known but not yet logged, due between today and the end of the
 * period (02 committed_unposted). Safe-to-spend sets this money aside so the daily
 * number cannot silently spend the rent.
 *
 * Only active expense rules in the given currency count; transfers and income are
 * not commitments, and a rule due after the period ends belongs to a later one.
 */
export async function sumCommittedUnposted(
  db: Db,
  options: { currency: string; fromDate: string; toDate: string },
): Promise<{ totalMinor: number; count: number }> {
  const row = await db.getFirstAsync<{ total_minor: number; count: number }>(
    `SELECT COALESCE(SUM(amount_minor), 0) AS total_minor, COUNT(*) AS count
       FROM recurring_rules
      WHERE is_active = 1 AND type = 'expense' AND currency = ?
        AND next_due_at BETWEEN ? AND ?`,
    [options.currency.toUpperCase(), options.fromDate, options.toDate],
  );
  return { totalMinor: row?.total_minor ?? 0, count: row?.count ?? 0 };
}
