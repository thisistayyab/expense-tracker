import {
  advanceRecurringRule,
  getRecurringRule,
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

let pendingWork: Promise<unknown> = Promise.resolve();

function serializeRecurring<T>(task: () => Promise<T>): Promise<T> {
  const next = pendingWork.then(task, task);
  pendingWork = next.catch(() => undefined);
  return next;
}

/**
 * Post every missed occurrence on app foreground (09 flow 6).
 *
 * Each occurrence gets its own row, never a lump sum, and `insertPostedOccurrence`
 * ignores a row that already exists. The cursor advances to the first occurrence
 * after the last processed one, so a crash mid-run leaves at most the same dates
 * to retry — which then insert zero rows.
 */
export function processDueRecurring(
  db: Db,
  today: IsoDate = toIsoDate(new Date()),
): Promise<RecurringProcessResult> {
  return serializeRecurring(async () => {
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
  });
}

/**
 * Advance one due manual rule by one occurrence. The Home bills card and the
 * recurring list use this for an unpaid manual bill; it is the same idempotent
 * insert path as auto-posting, so tapping twice cannot double-post.
 */
export function postNextOccurrence(
  db: Db,
  rule: RecurringRule,
  today: IsoDate = toIsoDate(new Date()),
): Promise<{ posted: boolean; nextDueAt: IsoDate | null }> {
  return serializeRecurring(async () => {
    let inserted = 0;
    let next: IsoDate | null = rule.nextDueAt;

    await db.withTransactionAsync(async () => {
      const fresh = await getRecurringRule(db, rule.id);
      if (!fresh || !fresh.isActive || fresh.nextDueAt > today) {
        next = fresh?.nextDueAt ?? null;
        return;
      }

      inserted = await insertPostedOccurrence(db, fresh, fresh.nextDueAt);
      next = firstDueOnOrAfter(fresh, addDays(fresh.nextDueAt, 1));
      await advanceRecurringRule(db, fresh.id, next, !isRuleFinished(fresh, next));
    });

    return { posted: inserted > 0, nextDueAt: next };
  });
}
