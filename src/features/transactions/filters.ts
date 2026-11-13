import type { TransactionType } from "../../lib/db/types";
import { addDays, addMonthsClamped, endOfMonth, startOfMonth } from "../../lib/domain/dates";

export type DateFilterPreset =
  | "all"
  | "today"
  | "this_month"
  | "last_month"
  | "last_7"
  | "last_30"
  | "custom";

export type TransactionFilters = {
  datePreset: DateFilterPreset;
  fromDate: string | null;
  toDate: string | null;
  type: "all" | TransactionType;
  accountId: string | null;
  categoryId: string | null;
  currency: string | null;
  notePresent: boolean;
};

export const EMPTY_FILTERS: TransactionFilters = {
  datePreset: "all",
  fromDate: null,
  toDate: null,
  type: "all",
  accountId: null,
  categoryId: null,
  currency: null,
  notePresent: false,
};

export const DATE_PRESET_LABELS: Record<DateFilterPreset, string> = {
  all: "Any time",
  today: "Today",
  this_month: "This month",
  last_month: "Last month",
  last_7: "Last 7 days",
  last_30: "Last 30 days",
  custom: "Custom range",
};

export function dateRangeFor(
  filters: Pick<TransactionFilters, "datePreset" | "fromDate" | "toDate">,
  today: string,
): { fromDate?: string; toDate?: string } {
  switch (filters.datePreset) {
    case "today":
      return { fromDate: today, toDate: today };
    case "this_month":
      return { fromDate: startOfMonth(today), toDate: today };
    case "last_month": {
      const start = addMonthsClamped(startOfMonth(today), -1, 1);
      return { fromDate: start, toDate: endOfMonth(start) };
    }
    case "last_7":
      return { fromDate: addDays(today, -6), toDate: today };
    case "last_30":
      return { fromDate: addDays(today, -29), toDate: today };
    case "custom":
      return {
        ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
        ...(filters.toDate ? { toDate: filters.toDate } : {}),
      };
    case "all":
    default:
      return {};
  }
}

/** The Apply badge count. Search text is intentionally a separate control. */
export function activeFilterCount(filters: TransactionFilters): number {
  let count = 0;
  if (filters.datePreset !== "all") count += 1;
  if (filters.type !== "all") count += 1;
  if (filters.accountId) count += 1;
  if (filters.categoryId) count += 1;
  if (filters.currency) count += 1;
  if (filters.notePresent) count += 1;
  return count;
}

export function hasFilters(filters: TransactionFilters): boolean {
  return activeFilterCount(filters) > 0;
}

export function typeLabel(type: TransactionFilters["type"]): string {
  if (type === "all") return "Any type";
  return type.charAt(0).toUpperCase() + type.slice(1);
}
