import {
  addDays,
  clampDayOfMonth,
  daysBetween,
  fromIsoDate,
  isIsoDate,
  type IsoDate,
} from "./dates";
import type { RecurringFrequency } from "../db/types";

/**
 * Recurring schedule math, anchored to `startDate` — never to the last posted
 * (possibly clamped) date. A bill on the 31st must be Feb 28, then Mar 31; advancing
 * from Feb 28 would silently turn it into a monthly bill on the 28th.
 */

export type RecurrenceRule = {
  frequency: RecurringFrequency;
  intervalCount: number;
  /** 1–31; defaults to the start date's day. */
  dayOfMonth?: number | null;
  startDate: IsoDate;
  endDate?: IsoDate | null;
};

/** A rule is over once the schedule has no occurrence on or before its end date. */
export function isRuleFinished(rule: RecurrenceRule, next: IsoDate | null): boolean {
  if (!next) return true;
  return Boolean(rule.endDate && next > rule.endDate);
}

function intervalOf(rule: RecurrenceRule): number {
  return Math.max(1, Math.trunc(rule.intervalCount || 1));
}

function anchorDay(rule: RecurrenceRule): number {
  const fromStart = Number(rule.startDate.slice(8, 10));
  const day = rule.dayOfMonth ?? fromStart;
  return Math.min(31, Math.max(1, day));
}

/** The occurrence at a zero-based index from `startDate`. */
export function occurrenceAt(rule: RecurrenceRule, index: number): IsoDate {
  const step = Math.max(0, Math.trunc(index));
  const every = intervalOf(rule);

  switch (rule.frequency) {
    case "daily":
      return addDays(rule.startDate, step * every);
    case "weekly":
      return addDays(rule.startDate, step * every * 7);
    case "monthly": {
      const start = fromIsoDate(rule.startDate);
      const total = start.getUTCFullYear() * 12 + start.getUTCMonth() + step * every;
      const year = Math.floor(total / 12);
      const month = (total % 12) + 1;
      const day = clampDayOfMonth(year, month, anchorDay(rule));
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    default: {
      const start = fromIsoDate(rule.startDate);
      const year = start.getUTCFullYear() + step * every;
      const month = start.getUTCMonth() + 1;
      const day = clampDayOfMonth(year, month, anchorDay(rule));
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
}

function firstIndexOnOrAfter(rule: RecurrenceRule, date: IsoDate): number {
  if (date <= rule.startDate) return 0;
  const every = intervalOf(rule);

  if (rule.frequency === "daily" || rule.frequency === "weekly") {
    const stepDays = rule.frequency === "weekly" ? every * 7 : every;
    return Math.ceil(daysBetween(rule.startDate, date) / stepDays);
  }

  const start = fromIsoDate(rule.startDate);
  const target = fromIsoDate(date);
  const startMonths = start.getUTCFullYear() * 12 + start.getUTCMonth();
  const targetMonths = target.getUTCFullYear() * 12 + target.getUTCMonth();
  const diff = rule.frequency === "monthly"
    ? targetMonths - startMonths
    : target.getUTCFullYear() - start.getUTCFullYear();

  let index = Math.max(0, Math.floor(diff / every));
  // Calendar clamping means the estimate can be one short (e.g. the 31st compared
  // with a shorter month). Walk forward at most twice; the schedule is monotonic.
  for (let guard = 0; guard < 3 && occurrenceAt(rule, index) < date; guard += 1) {
    index += 1;
  }
  return index;
}

/** First occurrence on or after `date`, or null when the rule has ended. */
export function firstDueOnOrAfter(rule: RecurrenceRule, date: IsoDate): IsoDate | null {
  if (!isIsoDate(rule.startDate)) return null;
  const next = occurrenceAt(rule, firstIndexOnOrAfter(rule, date));
  return isRuleFinished(rule, next) ? null : next;
}

/** Next occurrence strictly after `date` (an already-posted date is not returned). */
export function nextDueAfter(rule: RecurrenceRule, date: IsoDate): IsoDate | null {
  return firstDueOnOrAfter(rule, addDays(date, 1));
}

/**
 * Every unposted occurrence from `fromDate` through `throughDate`, inclusive.
 * The window is from the rule's stored `next_due_at`, so a rule that has been
 * closed for months yields one date per missed bill rather than one lump sum.
 */
export function occurrencesBetween(
  rule: RecurrenceRule,
  fromDate: IsoDate,
  throughDate: IsoDate,
  limit = 1000,
): IsoDate[] {
  if (!isIsoDate(fromDate) || !isIsoDate(throughDate) || fromDate > throughDate) return [];

  const dates: IsoDate[] = [];
  let index = firstIndexOnOrAfter(rule, fromDate);

  while (dates.length < Math.max(1, limit)) {
    const occurrence = occurrenceAt(rule, index);
    if (occurrence > throughDate) break;
    if (isRuleFinished(rule, occurrence)) break;
    dates.push(occurrence);
    index += 1;
  }

  return dates;
}

/** Human label for a rule's cadence, used by settings and the bills card. */
export function frequencyLabel(
  frequency: RecurringFrequency,
  intervalCount: number,
): string {
  const every = Math.max(1, Math.trunc(intervalCount || 1));
  if (every === 1) {
    return { daily: "Every day", weekly: "Every week", monthly: "Every month", yearly: "Every year" }[
      frequency
    ];
  }
  const units: Record<RecurringFrequency, string> = {
    daily: "days",
    weekly: "weeks",
    monthly: "months",
    yearly: "years",
  };
  return `Every ${every} ${units[frequency]}`;
}
