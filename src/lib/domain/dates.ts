/**
 * Local-date arithmetic for periods and recurring bills.
 *
 * Dates are passed around as `YYYY-MM-DD` strings (the same shape stored in
 * `transactions.local_date`), and all math goes through UTC midnights. That means a
 * DST transition can never add or subtract an hour from "tomorrow", and a leap year
 * is a calendar question, not a timestamp one.
 */
export type IsoDate = string;

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type BudgetPeriod = "weekly" | "monthly" | "yearly";

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** The device's local calendar day, not UTC — "today" must match the user's wall clock. */
export function toIsoDate(date: Date): IsoDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromIsoDate(iso: IsoDate): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return new Date(fromIsoDate(iso).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((fromIsoDate(to).getTime() - fromIsoDate(from).getTime()) / DAY_MS);
}

export function daysBetweenInclusive(from: IsoDate, to: IsoDate): number {
  return daysBetween(from, to) + 1;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** 31 → 30 in April, 31 → 29/28 in February. Never overflows into the next month. */
export function clampDayOfMonth(year: number, month: number, day: number): number {
  return Math.min(Math.max(1, day), daysInMonth(year, month));
}

export function startOfMonth(iso: IsoDate): IsoDate {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonth(iso: IsoDate): IsoDate {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  return `${iso.slice(0, 7)}-${String(daysInMonth(year, month)).padStart(2, "0")}`;
}

export function startOfYear(iso: IsoDate): IsoDate {
  return `${iso.slice(0, 4)}-01-01`;
}

export function endOfYear(iso: IsoDate): IsoDate {
  return `${iso.slice(0, 4)}-12-31`;
}

/**
 * Weekly windows are anchored to a user-chosen date (payday), not to Monday, so a
 * "weekly" budget starts when the user's money does. Dates before the anchor still
 * land in a window: the floor division goes negative on purpose.
 */
export function startOfWeek(iso: IsoDate, anchorIso: IsoDate): IsoDate {
  const offset = daysBetween(anchorIso, iso);
  const windowIndex = Math.floor(offset / 7);
  return addDays(anchorIso, windowIndex * 7);
}

export function endOfWeek(iso: IsoDate, anchorIso: IsoDate): IsoDate {
  return addDays(startOfWeek(iso, anchorIso), 6);
}

/** The budget window containing `today`. Monthly/yearly are calendar-aligned. */
export function periodRange(
  period: BudgetPeriod,
  anchorIso: IsoDate,
  todayIso: IsoDate,
): { start: IsoDate; end: IsoDate } {
  switch (period) {
    case "weekly":
      return { start: startOfWeek(todayIso, anchorIso), end: endOfWeek(todayIso, anchorIso) };
    case "yearly":
      return { start: startOfYear(todayIso), end: endOfYear(todayIso) };
    default:
      return { start: startOfMonth(todayIso), end: endOfMonth(todayIso) };
  }
}

/** Days left including today, so the last day divides by one rather than by zero. */
export function daysRemainingInPeriod(
  period: BudgetPeriod,
  anchorIso: IsoDate,
  todayIso: IsoDate,
): number {
  const { end } = periodRange(period, anchorIso, todayIso);
  return Math.max(1, daysBetweenInclusive(todayIso, end));
}

export function addMonthsClamped(iso: IsoDate, months: number, preferredDay?: number): IsoDate {
  const date = fromIsoDate(iso);
  const totalMonths = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  const day = clampDayOfMonth(year, month, preferredDay ?? date.getUTCDate());
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addYearsClamped(iso: IsoDate, years: number, preferredDay?: number): IsoDate {
  const date = fromIsoDate(iso);
  const year = date.getUTCFullYear() + years;
  const month = date.getUTCMonth() + 1;
  const day = clampDayOfMonth(year, month, preferredDay ?? date.getUTCDate());
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type RecurrenceSpec = {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  intervalCount: number;
  /** 1–31; defaults to the start date's day. */
  dayOfMonth?: number | null;
  startDate: IsoDate;
};

/**
 * The next occurrence strictly after `afterIso`. Monthly/yearly clamp to the shorter
 * month, so a bill on the 31st lands on the 30th in April and a Feb 29 yearly rule
 * lands on Feb 28 in non-leap years — the date never rolls into March.
 */
export function nextDueDate(rule: RecurrenceSpec, afterIso: IsoDate): IsoDate {
  const every = Math.max(1, Math.trunc(rule.intervalCount));
  switch (rule.frequency) {
    case "daily":
      return addDays(afterIso, every);
    case "weekly":
      return addDays(afterIso, every * 7);
    case "monthly":
      return addMonthsClamped(afterIso, every, rule.dayOfMonth ?? undefined);
    default:
      return addYearsClamped(afterIso, every, rule.dayOfMonth ?? undefined);
  }
}
