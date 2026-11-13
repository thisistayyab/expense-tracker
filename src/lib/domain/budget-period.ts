import type { BudgetPeriod } from "../db/types";
import {
  addMonthsClamped,
  endOfMonth,
  endOfYear,
  fromIsoDate,
  periodRange,
  startOfMonth,
  startOfYear,
  type IsoDate,
} from "./dates";

/**
 * Which window a budget is measured against. Monthly and yearly are calendar
 * aligned; a weekly budget is anchored to its `budgets.start_date` (payday), not to
 * Monday. `monthOffset` walks backwards from the current month for the Home month
 * selector — 0 is the current period, -1 the previous month.
 */
export const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export type PeriodWindow = {
  start: IsoDate;
  /** Inclusive last day of the window. */
  end: IsoDate;
  isCurrent: boolean;
};

export function periodWindow(
  period: BudgetPeriod,
  anchorIso: IsoDate,
  todayIso: IsoDate,
  monthOffset = 0,
): PeriodWindow {
  if (period === "weekly") {
    // A weekly window is always "this week"; months are not a useful axis for it.
    const { start, end } = periodRange("weekly", anchorIso, todayIso);
    return { start, end, isCurrent: true };
  }

  const offset = Math.min(0, Math.trunc(monthOffset));
  if (period === "yearly") {
    // One step is one *year* here, not one month of the year.
    const year = Number(todayIso.slice(0, 4)) + offset;
    const reference = `${year}-01-01`;
    return { start: startOfYear(reference), end: endOfYear(reference), isCurrent: offset === 0 };
  }
  const reference = addMonthsClamped(startOfMonth(todayIso), offset, 1);
  return { start: startOfMonth(reference), end: endOfMonth(reference), isCurrent: offset === 0 };
}

/**
 * How far back the month selector may go: the month of the first transaction.
 * Always ≤ 0 and never positive, so "next" stops at the current month.
 */
export function earliestMonthOffset(earliestIso: IsoDate | null, todayIso: IsoDate): number {
  if (!earliestIso) return 0;
  const year = Number(earliestIso.slice(0, 4));
  const month = Number(earliestIso.slice(5, 7));
  const todayYear = Number(todayIso.slice(0, 4));
  const todayMonth = Number(todayIso.slice(5, 7));
  return Math.min(0, (year - todayYear) * 12 + (month - todayMonth));
}

/** "November 2026", "2026", "3 – 9 Nov 2026". */
export function windowLabel(period: BudgetPeriod, window: PeriodWindow): string {
  const start = fromIsoDate(window.start);
  if (period === "yearly") {
    return start.toLocaleDateString(undefined, { year: "numeric", timeZone: "UTC" });
  }
  if (period === "weekly") {
    const end = fromIsoDate(window.end);
    const short = (date: Date) =>
      date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
    return `${short(start)} – ${short(end)}`;
  }
  return start.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
