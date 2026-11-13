import type { Category } from "../db/types";
import {
  addDays,
  addMonthsClamped,
  addYearsClamped,
  daysBetweenInclusive,
  endOfMonth,
  fromIsoDate,
  startOfMonth,
  startOfYear,
} from "./dates";

/**
 * P5 insight math — pure, no SQL and no React.
 *
 * Two rules drive everything here:
 *   1. All money is one currency in integer minor units. A figure is never mixed
 *      with another currency; the screen says what was left out instead.
 *   2. A comparison is only honest when the windows line up. "This month" compares
 *      month-to-date against the same days of last month, not against a full month.
 */

export type InsightPeriod = "month" | "last_month" | "last_3" | "last_6" | "year";

export const INSIGHT_PERIOD_OPTIONS: readonly {
  value: InsightPeriod;
  label: string;
  accessibilityLabel: string;
}[] = [
  { value: "month", label: "This month", accessibilityLabel: "This month" },
  { value: "last_month", label: "Last month", accessibilityLabel: "Last month" },
  { value: "last_3", label: "3M", accessibilityLabel: "Last 3 months" },
  { value: "last_6", label: "6M", accessibilityLabel: "Last 6 months" },
  { value: "year", label: "Year", accessibilityLabel: "This year" },
];

export type DateRange = { from: string; to: string };

export type InsightRanges = {
  current: DateRange;
  /** Equal-shaped window immediately before `current`, for delta copy. */
  comparison: DateRange;
  rangeLabel: string;
  comparisonLabel: string;
};

/**
 * Trailing windows include the current partial month, so the comparison window is
 * the same number of days immediately before it. Calendar-aligned "previous 3
 * months" would be a whole extra month longer and would read as a fake drop.
 */
function trailingMonths(todayIso: string, months: number): { current: DateRange; comparison: DateRange } {
  const currentStart = startOfMonth(addMonthsClamped(todayIso, -(months - 1), 1));
  const current = { from: currentStart, to: todayIso };
  const days = daysBetweenInclusive(current.from, current.to);
  const comparisonEnd = addDays(currentStart, -1);
  return {
    current,
    comparison: { from: addDays(comparisonEnd, -(days - 1)), to: comparisonEnd },
  };
}

export function insightRanges(period: InsightPeriod, todayIso: string): InsightRanges {
  switch (period) {
    case "last_month": {
      const start = startOfMonth(addMonthsClamped(todayIso, -1, 1));
      const comparisonStart = startOfMonth(addMonthsClamped(start, -1, 1));
      return {
        current: { from: start, to: endOfMonth(start) },
        comparison: { from: comparisonStart, to: endOfMonth(comparisonStart) },
        rangeLabel: "Last month",
        comparisonLabel: "the month before",
      };
    }
    case "last_3":
      return { ...trailingMonths(todayIso, 3), rangeLabel: "Last 3 months", comparisonLabel: "the previous period" };
    case "last_6":
      return { ...trailingMonths(todayIso, 6), rangeLabel: "Last 6 months", comparisonLabel: "the previous period" };
    case "year":
      return {
        current: { from: startOfYear(todayIso), to: todayIso },
        comparison: {
          from: startOfYear(addYearsClamped(todayIso, -1)),
          to: addYearsClamped(todayIso, -1),
        },
        rangeLabel: "This year",
        comparisonLabel: "last year",
      };
    case "month":
    default: {
      const previousStart = startOfMonth(addMonthsClamped(todayIso, -1, 1));
      const day = Number(todayIso.slice(8, 10));
      return {
        current: { from: startOfMonth(todayIso), to: todayIso },
        // Same calendar days as the current month so far, clamped in short months.
        comparison: { from: previousStart, to: addMonthsClamped(previousStart, 0, day) },
        rangeLabel: "This month",
        comparisonLabel: "last month",
      };
    }
  }
}

export function recentMonths(todayIso: string, count = 6): string[] {
  const first = addMonthsClamped(startOfMonth(todayIso), -(count - 1), 1);
  return Array.from({ length: count }, (_, index) =>
    addMonthsClamped(first, index, 1).slice(0, 7),
  );
}

export function monthShortLabel(month: string): string {
  return fromIsoDate(`${month}-01`).toLocaleDateString(undefined, {
    month: "short",
    timeZone: "UTC",
  });
}

export type SpendRow = { categoryId: string | null; spentMinor: number };

export type BreakdownRow = {
  key: string;
  /** null for "Other" and "Uncategorized": neither can filter a list by category. */
  categoryId: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  amountMinor: number;
  /** 0–1 share of the period total, for the bar and the percent label. */
  share: number;
};

const MAX_BREAKDOWN_ROWS = 6;

/**
 * Category breakdown with the design's six-row cap: five largest plus "Other".
 * Percentages are against the period total, so a bar's width is readable without
 * a second scale.
 */
export function buildBreakdown(
  spend: readonly SpendRow[],
  categories: readonly Category[],
  totalMinor: number,
): BreakdownRow[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const total = Math.max(0, totalMinor);

  const rows: BreakdownRow[] = spend
    .filter((row) => row.spentMinor > 0)
    .map((row) => {
      const category = row.categoryId ? byId.get(row.categoryId) : null;
      return {
        key: row.categoryId ?? "uncategorized",
        categoryId: row.categoryId,
        name: row.categoryId ? (category?.name ?? "Removed category") : "Uncategorized",
        color: category?.color ?? null,
        icon: category?.icon ?? null,
        amountMinor: row.spentMinor,
        share: 0,
      };
    })
    .sort((left, right) => {
      if (right.amountMinor !== left.amountMinor) return right.amountMinor - left.amountMinor;
      return left.name.localeCompare(right.name);
    });

  let visible = rows;
  if (rows.length > MAX_BREAKDOWN_ROWS) {
    const head = rows.slice(0, MAX_BREAKDOWN_ROWS - 1);
    const tail = rows.slice(MAX_BREAKDOWN_ROWS - 1);
    visible = [
      ...head,
      {
        key: "other",
        categoryId: null,
        name: "Other",
        color: null,
        icon: null,
        amountMinor: tail.reduce((sum, row) => sum + row.amountMinor, 0),
        share: 0,
      },
    ];
  }

  return visible.map((row) => ({
    ...row,
    share: total > 0 ? Math.min(1, row.amountMinor / total) : 0,
  }));
}

export type NamedItemRow = { key: string; label: string; amountMinor: number; count: number };
export type UnnamedItemRow = { categoryId: string | null; amountMinor: number; count: number };

export type TopItemRow = {
  key: string;
  label: string;
  categoryId: string | null;
  amountMinor: number;
  count: number;
  /** True when the row fell back to a category because the entry had no name. */
  unnamed: boolean;
};

/**
 * Top items by spend. Named entries group case-insensitively; unnamed entries fall
 * back to their category and are marked so the row can say why it reads that way.
 */
export function buildTopItems(
  named: readonly NamedItemRow[],
  unnamed: readonly UnnamedItemRow[],
  categories: readonly Category[],
  limit = 5,
): TopItemRow[] {
  const byId = new Map(categories.map((category) => [category.id, category]));

  const rows: TopItemRow[] = [
    ...named.map((row) => ({
      key: `named:${row.key}`,
      label: row.label,
      categoryId: null,
      amountMinor: row.amountMinor,
      count: row.count,
      unnamed: false,
    })),
    ...unnamed.map((row) => ({
      key: `unnamed:${row.categoryId ?? "none"}`,
      label: row.categoryId ? (byId.get(row.categoryId)?.name ?? "Removed category") : "Uncategorized",
      categoryId: row.categoryId,
      amountMinor: row.amountMinor,
      count: row.count,
      unnamed: true,
    })),
  ];

  return rows
    .sort((left, right) => {
      if (right.amountMinor !== left.amountMinor) return right.amountMinor - left.amountMinor;
      return left.label.localeCompare(right.label);
    })
    .slice(0, Math.max(0, Math.trunc(limit)));
}

export type TrendPoint = {
  month: string;
  label: string;
  expenseMinor: number;
  incomeMinor: number;
};

/** Six calendar months ending with the current one; missing months read as zero. */
export function buildTrend(
  monthly: readonly { month: string; expenseMinor: number; incomeMinor: number }[],
  todayIso: string,
  count = 6,
): TrendPoint[] {
  const byMonth = new Map(monthly.map((row) => [row.month, row]));
  return recentMonths(todayIso, count).map((month) => {
    const row = byMonth.get(month);
    return {
      month,
      label: monthShortLabel(month),
      expenseMinor: row?.expenseMinor ?? 0,
      incomeMinor: row?.incomeMinor ?? 0,
    };
  });
}

export type MonthDelta = { pct: number; direction: "up" | "down" | "flat" };

/** null when there is no previous value to divide by — never a fake 100%. */
export function monthDelta(currentMinor: number, previousMinor: number): MonthDelta | null {
  if (previousMinor <= 0) return null;
  const pct = Math.round(((currentMinor - previousMinor) / previousMinor) * 100);
  if (pct === 0) return { pct: 0, direction: "flat" };
  return { pct, direction: pct > 0 ? "up" : "down" };
}

export type InsightSegment = { text: string; strong?: boolean };
export type InsightCardData = { id: string; segments: InsightSegment[] };

export type CategoryComparison = {
  name: string;
  currentMinor: number;
  previousMinor: number;
};

export type InsightInput = {
  totalMinor: number;
  previousTotalMinor: number;
  categories: readonly CategoryComparison[];
  breakdown: readonly BreakdownRow[];
  comparisonLabel: string;
  maxCards?: number;
};

export const INSIGHT_TOTAL_THRESHOLD = 0.1;
export const INSIGHT_CATEGORY_THRESHOLD = 0.15;
export const INSIGHT_CONCENTRATION_THRESHOLD = 0.4;
/** Ignore changes under 500 minor units (5.00 in a two-decimal currency) as noise. */
const MIN_CATEGORY_CHANGE_MINOR = 500;

/**
 * Deterministic insight cards (no AI, no random ordering). Priority:
 * overall change → biggest category change → concentration. Two at most, matching
 * the design, and every sentence is assembled from the numbers shown above it.
 */
export function buildInsightCards(input: InsightInput): InsightCardData[] {
  const cards: InsightCardData[] = [];
  const maxCards = Math.max(0, Math.trunc(input.maxCards ?? 2));

  if (input.previousTotalMinor > 0) {
    const delta = monthDelta(input.totalMinor, input.previousTotalMinor);
    if (delta && delta.direction !== "flat" && Math.abs(delta.pct) >= INSIGHT_TOTAL_THRESHOLD * 100) {
      cards.push({
        id: "total",
        segments: [
          { text: "Spending is " },
          { text: `${Math.abs(delta.pct)}%`, strong: true },
          { text: ` ${delta.direction === "up" ? "higher" : "lower"} than ${input.comparisonLabel}.` },
        ],
      });
    }
  }

  let best: CategoryComparison | null = null;
  let bestChange = 0;
  for (const category of input.categories) {
    if (category.previousMinor <= 0) continue;
    const change = category.currentMinor - category.previousMinor;
    if (Math.abs(change) < MIN_CATEGORY_CHANGE_MINOR) continue;
    const pct = Math.round((change / category.previousMinor) * 100);
    if (Math.abs(pct) < INSIGHT_CATEGORY_THRESHOLD * 100) continue;
    if (Math.abs(change) > bestChange) {
      best = category;
      bestChange = Math.abs(change);
    }
  }

  if (best) {
    const pct = Math.round(
      ((best.currentMinor - best.previousMinor) / best.previousMinor) * 100,
    );
    cards.push({
      id: "category",
      segments: [
        { text: best.name },
        { text: " is " },
        { text: `${Math.abs(pct)}%`, strong: true },
        { text: ` ${pct > 0 ? "above" : "below"} ${input.comparisonLabel}.` },
      ],
    });
  }

  const top = input.breakdown[0];
  if (
    input.breakdown.length >= 2 &&
    input.totalMinor > 0 &&
    top &&
    top.share >= INSIGHT_CONCENTRATION_THRESHOLD
  ) {
    cards.push({
      id: "concentration",
      segments: [
        { text: top.name },
        { text: " took " },
        { text: `${Math.round(top.share * 100)}%`, strong: true },
        { text: " of your spending." },
      ],
    });
  }

  return cards.slice(0, maxCards);
}
