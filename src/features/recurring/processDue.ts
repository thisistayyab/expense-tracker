import {
  advanceRecurringRule,
  insertPostedOccurrence,
  listDueRecurringRules,
} from "../../lib/db/repos/recurring";
import type { Db, RecurringRule } from "../../lib/db/types";
import { addDays, toIsoDate, type IsoDate } from "../../lib/domain/dates";
import {
  firstDueOnOrAfter,
  isRuleFinished,
  occurrencesBetween,
} from "../../lib/domain/recurrence";

export type RecurringProcessResult = {
  rules: number;
  posted: number;
};

/**
 * Post every missed occurrence on app foreground (09 flow 6).
 *
 * Each occurrence gets its own row, never a lump sum, and `insertPostedOccurrence`
 * ignores a row that already exists. The cursor advances to the first occurrence
 * after the last processed one, so a crash mid-run leaves at most the same dates
 * to retry — which then insert zero rows.
 */
export async function processDueRecurring(
  db: Db,
  today: IsoDate = toIsoDate(new Date()),
): Promise<RecurringProcessResult> {
  const due = await listDueRecurringRules(db, today);
  let posted = 0;

  for (const rule of due) {
    if (rule.type === "transfer") continue;

    const dates = occurrencesBetween(rule, rule.nextDueAt, today);
    const lastProcessed = dates.length ? dates[dates.length - 1] : rule.nextDueAt;

    await db.withTransactionAsync(async () => {
      for (const date of dates) {
        posted += await insertPostedOccurrence(db, rule, date);
      }

      // Always move forward, even when the insert was a no-op: a duplicate row
      // means that occurrence is already accounted for.
      const next = firstDueOnOrAfter(rule, addDays(lastProcessed, 1));
      await advanceRecurringRule(db, rule.id, next, !isRuleFinished(rule, next));
    });
  }

  return { rules: due.length, posted };
}

/**
 * Advance one due manual rule by one occurrence. The Home bills card and the
 * recurring list use this for an unpaid manual bill; it is the same idempotent
 * insert path as auto-posting, so tapping twice cannot double-post.
 */
export async function postNextOccurrence(
  db: Db,
  rule: RecurringRule,
  today: IsoDate = toIsoDate(new Date()),
): Promise<{ posted: boolean; nextDueAt: IsoDate | null }> {
  if (!rule.isActive || rule.nextDueAt > today) {
    return { posted: false, nextDueAt: rule.nextDueAt };
  }

  let inserted = 0;
  await db.withTransactionAsync(async () => {
    inserted = await insertPostedOccurrence(db, rule, rule.nextDueAt);
    const next = firstDueOnOrAfter(rule, addDays(rule.nextDueAt, 1));
    await advanceRecurringRule(db, rule.id, next, !isRuleFinished(rule, next));
  });

  const next = firstDueOnOrAfter(rule, addDays(rule.nextDueAt, 1));
  return { posted: inserted > 0, nextDueAt: next };
}
