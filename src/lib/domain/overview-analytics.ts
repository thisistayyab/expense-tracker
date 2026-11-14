import {
  addDays,
  addMonthsClamped,
  daysBetweenInclusive,
  endOfMonth,
  startOfMonth,
} from "./dates";

/**
 * Overview analytics math — pure, no SQL and no React.
 *
 * Overview follows the month the budget screen is showing. A comparison only uses
 * the same number of days as the window being read, so a half-finished November is
 * never measured against a complete October.
 */

export type MonthAnalyticsWindow = {
  /** First day of the month being read. */
  from: string;
  /** Today for the current month, the last day for a finished one. */
  to: string;
  previousFrom: string;
  /** Same day-count back in the previous month (clamped in short months). */
  previousTo: string;
  daysCovered: number;
  isCurrent: boolean;
};

export function monthAnalyticsWindow(
  monthOffset: number,
  todayIso: string,
): MonthAnalyticsWindow {
  const offset = Math.min(0, Math.trunc(monthOffset));
  const monthStart = startOfMonth(addMonthsClamped(todayIso, offset, 1));
  const isCurrent = offset === 0;
  const to = isCurrent ? todayIso : endOfMonth(monthStart);
  const daysCovered = Math.max(1, daysBetweenInclusive(monthStart, to));
  const previousFrom = startOfMonth(addMonthsClamped(monthStart, -1, 1));
  const previousTo = addMonthsClamped(previousFrom, 0, daysCovered);

  return { from: monthStart, to, previousFrom, previousTo, daysCovered, isCurrent };
}

export type SpendBucketSpec = {
  key: string;
  /** Day of the month the bucket starts on; the chart axis label. */
  label: string;
  start: string;
  end: string;
  /** True for the bucket that contains today. */
  isCurrent: boolean;
  /** "1–7 Nov" — used in the chart's accessibility label. */
  rangeLabel: string;
};

function shortMonth(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Seven-day buckets starting on the 1st. Calendar weeks would leave a one-day
 * sliver at the start or end of most months, which reads as a spending spike; a
 * fixed seven-day block keeps every bar comparable.
 */
export function spendBucketSpecs(
  window: MonthAnalyticsWindow,
  todayIso: string,
): SpendBucketSpec[] {
  const specs: SpendBucketSpec[] = [];
  let cursor = window.from;

  while (cursor <= window.to) {
    const weekEnd = addDays(cursor, 6);
    const end = weekEnd < window.to ? weekEnd : window.to;
    const startDay = Number(cursor.slice(8, 10));
    const endDay = Number(end.slice(8, 10));
    const month = shortMonth(cursor);

    specs.push({
      key: cursor,
      label: String(startDay),
      start: cursor,
      end,
      isCurrent: todayIso >= cursor && todayIso <= end,
      rangeLabel:
        startDay === endDay ? `${startDay} ${month}` : `${startDay}–${endDay} ${month}`,
    });

    cursor = addDays(end, 1);
  }

  return specs;
}

export type SpendBucket = SpendBucketSpec & { spentMinor: number };

/** Adds the per-day totals into their bucket; days with no spend stay at zero. */
export function bucketDailySpend(
  specs: readonly SpendBucketSpec[],
  rows: readonly { localDate: string; spentMinor: number }[],
): SpendBucket[] {
  const buckets: SpendBucket[] = specs.map((spec) => ({ ...spec, spentMinor: 0 }));

  for (const row of rows) {
    const bucket = buckets.find(
      (candidate) => row.localDate >= candidate.start && row.localDate <= candidate.end,
    );
    // A row outside the window is a caller bug, not something to guess about.
    if (bucket) bucket.spentMinor += row.spentMinor;
  }

  return buckets;
}

/** Mean per bucket, for the chart's average line. Zero when there is nothing. */
export function averageBucketMinor(buckets: readonly SpendBucket[]): number {
  if (!buckets.length) return 0;
  const total = buckets.reduce((sum, bucket) => sum + bucket.spentMinor, 0);
  return Math.round(total / buckets.length);
}
