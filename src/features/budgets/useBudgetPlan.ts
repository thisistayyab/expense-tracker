import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

import { listBudgets } from "../../lib/db/repos/budgets";
import { listCategories } from "../../lib/db/repos/categories";
import { sumCommittedUnposted } from "../../lib/db/repos/recurring";
import { getAllSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import {
  countSpentInOtherCurrencies,
  earliestLocalDate,
  sumSpent,
  sumSpentByCategory,
} from "../../lib/db/repos/transactions";
import type { Budget, BudgetPeriod, Category, Db } from "../../lib/db/types";
import { buildBudgetPlan, type BudgetPlan } from "../../lib/domain/budget-plan";
import {
  earliestMonthOffset,
  periodWindow,
  windowLabel,
  type PeriodWindow,
} from "../../lib/domain/budget-period";
import { daysRemainingInPeriod, toIsoDate } from "../../lib/domain/dates";

export type BudgetOverview = {
  currency: string;
  period: BudgetPeriod;
  label: string;
  window: PeriodWindow;
  /** The shared number Home and Budgets both render (P4 gate). */
  plan: BudgetPlan;
  /** Past months have no "per day left", only a left-over number. */
  isCurrentPeriod: boolean;
  budgets: Budget[];
  categories: Category[];
  /** Expense rows in the window that belong to another currency. */
  otherCurrency: { currency: string; count: number }[];
  monthOffset: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
};

const STORED_PERIODS: Record<string, BudgetPeriod> = {
  weekly: "weekly",
  monthly: "monthly",
  yearly: "yearly",
};

/**
 * One query surface for budgets, spend and committed bills. Both screens use it so
 * editing a limit on Budgets updates Home without a second calculation path.
 *
 * Reads happen in two phases: settings/budgets decide the window (a weekly budget
 * is anchored to its own start date), then the aggregates run against that window.
 */
export function useBudgetPlan(
  options: { monthOffset?: number; period?: BudgetPeriod } = {},
): {
  data: BudgetOverview | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const db: Db = useSQLiteContext();
  const monthOffset = Math.min(0, options.monthOffset ?? 0);
  const periodOverride = options.period;
  const [data, setData] = useState<BudgetOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    const today = toIsoDate(new Date());

    const [settings, budgets, categories, earliest] = await Promise.all([
      getAllSettings(db),
      listBudgets(db, { includeInactive: false }),
      listCategories(db, { includeArchived: true }),
      earliestLocalDate(db),
    ]);

    const currency = (settings[SETTING_KEYS.currency] ?? "USD").toUpperCase();
    const period =
      periodOverride ?? STORED_PERIODS[settings[SETTING_KEYS.budgetPeriod] ?? ""] ?? "monthly";

    // A weekly budget's start date is its anchor; monthly/yearly ignore it.
    const anchor =
      budgets.find(
        (budget) => budget.categoryId === null && budget.currency === currency && budget.period === period,
      )?.startDate ?? today;

    const window = periodWindow(period, anchor, today, monthOffset);
    const daysRemaining = window.isCurrent ? daysRemainingInPeriod(period, anchor, today) : 1;

    const [spendByCategory, totalSpent, committed, otherCurrency] = await Promise.all([
      sumSpentByCategory(db, { currency, fromDate: window.start, toDate: window.end }),
      sumSpent(db, { currency, fromDate: window.start, toDate: window.end }),
      // Only the current period has bills still to come; a finished period has none.
      window.isCurrent
        ? sumCommittedUnposted(db, { currency, fromDate: today, toDate: window.end })
        : Promise.resolve({ totalMinor: 0, count: 0 }),
      countSpentInOtherCurrencies(db, {
        currency,
        fromDate: window.start,
        toDate: window.end,
      }),
    ]);

    const plan = buildBudgetPlan({
      currency,
      period,
      budgets,
      categories,
      spendByCategory,
      totalSpentMinor: totalSpent,
      committedMinor: committed.totalMinor,
      committedCount: committed.count,
      daysRemaining,
      isCurrentPeriod: window.isCurrent,
    });

    if (request !== requestId.current) return;

    const earliestOffset = earliestMonthOffset(earliest, today);
    setData({
      currency,
      period,
      label: windowLabel(period, window),
      window,
      plan,
      isCurrentPeriod: window.isCurrent,
      budgets,
      categories,
      otherCurrency,
      monthOffset,
      canGoPrevious: monthOffset > earliestOffset,
      canGoNext: monthOffset < 0,
    });
    setError(null);
  }, [db, monthOffset, periodOverride]);

  const refresh = useCallback(() => {
    load().catch((cause: unknown) => {
      setError(`Could not load budgets: ${String(cause)}`);
    });
  }, [load]);

  useEffect(() => {
    let active = true;
    // `loading` starts true and is only cleared after the deferred load, so this
    // effect never sets state synchronously (which would cascade a second render).
    load()
      .catch((cause: unknown) => {
        if (active) setError(`Could not load budgets: ${String(cause)}`);
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
