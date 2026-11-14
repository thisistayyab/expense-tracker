import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

import { listCategories } from "../../lib/db/repos/categories";
import {
  sumSpentByCategory,
  sumSpentByDay,
  sumSpentForComparison,
} from "../../lib/db/repos/transactions";
import type { Db } from "../../lib/db/types";
import { toIsoDate, fromIsoDate } from "../../lib/domain/dates";
import {
  buildBreakdown,
  monthDelta,
  monthShortLabel,
  type BreakdownRow,
  type MonthDelta,
} from "../../lib/domain/insights";
import {
  averageBucketMinor,
  bucketDailySpend,
  monthAnalyticsWindow,
  spendBucketSpecs,
  type MonthAnalyticsWindow,
  type SpendBucket,
} from "../../lib/domain/overview-analytics";

export type OverviewAnalytics = {
  currency: string;
  monthLabel: string;
  window: MonthAnalyticsWindow;
  spentMinor: number;
  /** null when the previous month has nothing to divide by. */
  delta: MonthDelta | null;
  previousMonthLabel: string;
  buckets: SpendBucket[];
  averageMinor: number;
  categories: BreakdownRow[];
};

/**
 * The numbers behind Overview's analytics section. Everything is scoped to one
 * currency and the month the budget screen is showing, so a save on another tab
 * changes this only after `refresh()` — the same rule the budget hook follows.
 */
export function useOverviewAnalytics(
  currency: string | null,
  monthOffset: number,
): {
  data: OverviewAnalytics | null;
  /** Why the numbers are missing; null while loading or once they arrive. */
  error: string | null;
  refresh: () => void;
} {
  const db: Db = useSQLiteContext();
  const [data, setData] = useState<OverviewAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!currency) return;

    const request = ++requestId.current;
    const today = toIsoDate(new Date());
    const window = monthAnalyticsWindow(monthOffset, today);

    const [comparison, daily, spend, categories] = await Promise.all([
      sumSpentForComparison(db, {
        currency,
        currentFrom: window.from,
        previousFrom: window.previousFrom,
        previousTo: window.previousTo,
        toDate: window.to,
      }),
      sumSpentByDay(db, { currency, fromDate: window.from, toDate: window.to }),
      sumSpentByCategory(db, { currency, fromDate: window.from, toDate: window.to }),
      listCategories(db, { includeArchived: true }),
    ]);

    if (request !== requestId.current) return;

    // The grouped rows contain every expense in the window, so their total is the
    // period total; the comparison query supplies the matching previous window.
    const spentMinor = comparison.currentMinor;
    const buckets = bucketDailySpend(spendBucketSpecs(window, today), daily);
    const monthDate = fromIsoDate(window.from);

    setError(null);
    setData({
      currency,
      monthLabel: monthDate.toLocaleDateString(undefined, {
        month: "long",
        timeZone: "UTC",
      }),
      window,
      spentMinor,
      delta: monthDelta(spentMinor, comparison.previousMinor),
      previousMonthLabel: monthShortLabel(window.previousFrom.slice(0, 7)),
      buckets,
      averageMinor: averageBucketMinor(buckets),
      categories: buildBreakdown(spend, categories, spentMinor, 4),
    });
  }, [currency, db, monthOffset]);

  const refresh = useCallback(() => {
    load().catch((cause: unknown) => {
      // The section shows this instead of vanishing, so a failed read is visible
      // rather than looking like the app simply has nothing to chart.
      setError(String(cause));
    });
  }, [load]);

  useEffect(() => {
    // Without a currency there is nothing to read, and setting state here would be
    // a synchronous update inside an effect. The guard also stops a stale month
    // from a previous currency showing after Settings switches it.
    if (!currency) return undefined;

    let active = true;
    load().catch((cause: unknown) => {
      if (!active) return;
      setData(null);
      setError(String(cause));
    });
    return () => {
      active = false;
    };
  }, [currency, load]);

  return { data: data && data.currency === currency ? data : null, error, refresh };
}
