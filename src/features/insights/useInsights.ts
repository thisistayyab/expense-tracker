import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

import { listCategories } from "../../lib/db/repos/categories";
import {
  monthlyTotals,
  topItemTotals,
  unnamedItemTotals,
} from "../../lib/db/repos/insights";
import { listRecurringRules } from "../../lib/db/repos/recurring";
import { getAllSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import {
  countSpentInOtherCurrencies,
  countTransactions,
  sumSpentByCategory,
  sumSpentForComparison,
} from "../../lib/db/repos/transactions";
import type { Db } from "../../lib/db/types";
import {
  buildBreakdown,
  buildInsightCards,
  buildTopItems,
  buildTrend,
  insightRanges,
  monthDelta,
  monthShortLabel,
  type BreakdownRow,
  type CategoryComparison,
  type InsightCardData,
  type InsightPeriod,
  type InsightRanges,
  type TopItemRow,
  type TrendPoint,
} from "../../lib/domain/insights";
import { addMonthsClamped, startOfMonth, toIsoDate } from "../../lib/domain/dates";

export type InsightsOverview = {
  currency: string;
  period: InsightPeriod;
  ranges: InsightRanges;
  totalSpentMinor: number;
  breakdown: BreakdownRow[];
  topItems: TopItemRow[];
  trend: TrendPoint[];
  trendDelta: { pct: number; monthLabel: string } | null;
  cards: InsightCardData[];
  otherCurrency: { currency: string; count: number }[];
  hasAnyTransaction: boolean;
};

/**
 * All the numbers the Insights screen shows, computed once per load so the
 * breakdown total, the cards and the drill-through ranges cannot drift apart.
 */
export function useInsights(period: InsightPeriod): {
  data: InsightsOverview | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const db: Db = useSQLiteContext();
  const [data, setData] = useState<InsightsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    const today = toIsoDate(new Date());
    const ranges = insightRanges(period, today);
    const monthRanges = insightRanges("month", today);

    const [settings, categories, totalTransactions] = await Promise.all([
      getAllSettings(db),
      listCategories(db, { includeArchived: true }),
      countTransactions(db),
    ]);
    const currency = (settings[SETTING_KEYS.currency] ?? "USD").toUpperCase();

    const [
      spend,
      comparisonSpend,
      monthly,
      named,
      unnamed,
      otherCurrency,
      monthTotals,
      recurringRules,
    ] = await Promise.all([
      sumSpentByCategory(db, {
        currency,
        fromDate: ranges.current.from,
        toDate: ranges.current.to,
      }),
      sumSpentByCategory(db, {
        currency,
        fromDate: ranges.comparison.from,
        toDate: ranges.comparison.to,
      }),
      monthlyTotals(db, {
        currency,
        fromDate: startOfMonth(addMonthsClamped(today, -5, 1)),
        toDate: today,
      }),
      topItemTotals(db, {
        currency,
        fromDate: ranges.current.from,
        toDate: ranges.current.to,
      }),
      unnamedItemTotals(db, {
        currency,
        fromDate: ranges.current.from,
        toDate: ranges.current.to,
      }),
      countSpentInOtherCurrencies(db, {
        currency,
        fromDate: ranges.current.from,
        toDate: ranges.current.to,
      }),
      // The trend pill always compares month-to-date against the same days of last
      // month, so it agrees with the total insight card instead of measuring a
      // partial month against a full one.
      sumSpentForComparison(db, {
        currency,
        currentFrom: monthRanges.current.from,
        previousFrom: monthRanges.comparison.from,
        previousTo: monthRanges.comparison.to,
        toDate: today,
      }),
      // The recurring rules are not transactions yet, but their count is useful
      // context for the current period and is already currency-scoped.
      listRecurringRules(db, { currency }),
    ]);

    if (request !== requestId.current) return;

    // The grouped rows already contain every expense row (uncategorized included),
    // so their sum is the period total; a second scan could only drift from it.
    const totalSpent = spend.reduce((total, row) => total + row.spentMinor, 0);
    const comparisonTotal = comparisonSpend.reduce((total, row) => total + row.spentMinor, 0);

    const breakdown = buildBreakdown(spend, categories, totalSpent);
    const topItems = buildTopItems(named, unnamed, categories);
    const trend = buildTrend(monthly, today);

    const currentByCategory = new Map<string, number>();
    for (const row of spend) currentByCategory.set(row.categoryId ?? "", row.spentMinor);
    const previousByCategory = new Map<string, number>();
    for (const row of comparisonSpend) previousByCategory.set(row.categoryId ?? "", row.spentMinor);
    const categoryById = new Map(categories.map((category) => [category.id, category]));

    const ids = new Set([...currentByCategory.keys(), ...previousByCategory.keys()]);
    const categoryComparisons: CategoryComparison[] = [...ids].map((id) => ({
      name: id ? (categoryById.get(id)?.name ?? "Removed category") : "Uncategorized",
      currentMinor: currentByCategory.get(id) ?? 0,
      previousMinor: previousByCategory.get(id) ?? 0,
    }));

    const cards = buildInsightCards({
      totalMinor: totalSpent,
      previousTotalMinor: comparisonTotal,
      categories: categoryComparisons,
      breakdown,
      comparisonLabel: ranges.comparisonLabel,
      subscriptionCount: recurringRules.filter((rule) => rule.type === "expense").length,
    });

    const monthPill = monthDelta(monthTotals.currentMinor, monthTotals.previousMinor);

    setData({
      currency,
      period,
      ranges,
      totalSpentMinor: totalSpent,
      breakdown,
      topItems,
      trend,
      trendDelta: monthPill
        ? {
            pct: monthPill.pct,
            monthLabel: monthShortLabel(monthRanges.comparison.from.slice(0, 7)),
          }
        : null,
      cards,
      otherCurrency,
      hasAnyTransaction: totalTransactions > 0,
    });
    setError(null);
  }, [db, period]);

  const refresh = useCallback(() => {
    load().catch((cause: unknown) => {
      setError(`Could not read insights: ${String(cause)}`);
    });
  }, [load]);

  useEffect(() => {
    let active = true;
    load()
      .catch((cause: unknown) => {
        if (active) setError(`Could not read insights: ${String(cause)}`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  return { data, loading, error, refresh };
}
