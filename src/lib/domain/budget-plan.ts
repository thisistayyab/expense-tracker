import type { Budget, BudgetPeriod, Category } from "../db/types";
import { budgetProgress, budgetState, totalLimits, type BudgetState } from "./budgets";
import { safeToSpend } from "./safeToSpend";

/**
 * One pure composition for both the Home hero and the Budgets screen, so the two
 * can never disagree about what "remaining" means (P4 gate).
 *
 * Everything is integer minor units in a single currency. Rows in another currency
 * are passed separately by the caller (`otherCurrencySpend`) and are never added
 * into any total here (02 rule 2).
 */
export type CategorySpend = {
  categoryId: string | null;
  spentMinor: number;
};

export type BudgetRow = {
  budgetId: string;
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  limitMinor: number;
  spentMinor: number;
  /** Negative when overspent; never clamped. */
  remainingMinor: number;
  /** 0–1+, uncapped so the bar can show overspend. */
  progress: number;
  state: BudgetState;
};

export type BudgetPlanInput = {
  currency: string;
  period: BudgetPeriod;
  /** Active budgets for every currency/period; filtered here. */
  budgets: readonly Budget[];
  categories: readonly Category[];
  spendByCategory: readonly CategorySpend[];
  totalSpentMinor: number;
  committedMinor?: number;
  committedCount?: number;
  daysRemaining: number;
  /** Wedding the plan to a past period means there is no "per day left". */
  isCurrentPeriod: boolean;
};

export type BudgetPlan = {
  currency: string;
  period: BudgetPeriod;
  /** The overall row, or null when the user has not set one. */
  overallBudget: Budget | null;
  overallLimitMinor: number | null;
  spentMinor: number;
  committedMinor: number;
  committedCount: number;
  daysRemaining: number;
  /** limit − spent − committed; null without an overall budget. */
  remainingMinor: number | null;
  /** spent + committed against the overall limit, so the bar includes bills. */
  progress: number;
  state: BudgetState;
  /** null when there is no limit, or when browsing a finished period. */
  safePerDayMinor: number | null;
  rows: BudgetRow[];
  totalCategoryLimitsMinor: number;
  /** Soft warning only: never blocks saving a limit (03 §6). */
  categoryLimitsExceedOverall: boolean;
  /** Active budgets typed in another currency, for the recreate section. */
  previousCurrencyBudgets: Budget[];
};

function categoryLookup(categories: readonly Category[]): Map<string, Category> {
  return new Map(categories.map((category) => [category.id, category]));
}

export function buildBudgetPlan(input: BudgetPlanInput): BudgetPlan {
  const currency = input.currency.toUpperCase();
  const activeForPeriod = input.budgets.filter(
    (budget) => budget.isActive && budget.period === input.period,
  );

  const overallBudget =
    activeForPeriod.find(
      (budget) => budget.currency === currency && budget.categoryId === null,
    ) ?? null;

  const matched = activeForPeriod.filter(
    (budget) => budget.currency === currency && budget.categoryId !== null,
  );

  // Rows without a category are real money and are already in `totalSpentMinor`;
  // they simply have no limit to compare against.
  const spend = new Map<string, number>();
  for (const row of input.spendByCategory) {
    if (row.categoryId === null) continue;
    spend.set(row.categoryId, (spend.get(row.categoryId) ?? 0) + row.spentMinor);
  }

  const categories = categoryLookup(input.categories);
  const rows: BudgetRow[] = matched
    .map((budget) => {
      const category = categories.get(budget.categoryId!);
      const spentMinor = spend.get(budget.categoryId!) ?? 0;
      const progress = budgetProgress(budget.limitMinor, spentMinor);
      return {
        budgetId: budget.id,
        categoryId: budget.categoryId!,
        // A budget outlives its category only if the category was hard-deleted;
        // ON DELETE CASCADE normally removes both together.
        name: category?.name ?? "Removed category",
        icon: category?.icon ?? null,
        color: category?.color ?? null,
        limitMinor: budget.limitMinor,
        spentMinor,
        remainingMinor: budget.limitMinor - spentMinor,
        progress,
        state: budgetState(progress),
      };
    })
    .sort((left, right) => {
      // Rows whose category no longer exists sort last instead of jumping to the top.
      const missing = Number.MAX_SAFE_INTEGER;
      const leftOrder = categories.get(left.categoryId)?.sortOrder ?? missing;
      const rightOrder = categories.get(right.categoryId)?.sortOrder ?? missing;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.name.localeCompare(right.name);
    });

  const overallLimitMinor = overallBudget?.limitMinor ?? null;
  const committedMinor = Math.max(0, input.committedMinor ?? 0);
  const committedCount = Math.max(0, input.committedCount ?? 0);
  const daysRemaining = Math.max(1, Math.trunc(input.daysRemaining));

  const remainingMinor =
    overallLimitMinor === null
      ? null
      : overallLimitMinor - input.totalSpentMinor - committedMinor;

  const progress =
    overallLimitMinor === null
      ? 0
      : budgetProgress(overallLimitMinor, input.totalSpentMinor + committedMinor);

  const safePerDayMinor =
    overallLimitMinor === null
      ? null
      : input.isCurrentPeriod
        ? safeToSpend({
            limitMinor: overallLimitMinor,
            spentMinor: input.totalSpentMinor,
            committedMinor,
            daysRemaining,
          })
        : null;

  const limits = rows.map((row) => row.limitMinor);

  return {
    currency,
    period: input.period,
    overallBudget,
    overallLimitMinor,
    spentMinor: input.totalSpentMinor,
    committedMinor,
    committedCount,
    daysRemaining,
    remainingMinor,
    progress,
    state: budgetState(progress),
    safePerDayMinor,
    rows,
    totalCategoryLimitsMinor: totalLimits(limits),
    categoryLimitsExceedOverall:
      overallLimitMinor !== null && totalLimits(limits) > overallLimitMinor,
    previousCurrencyBudgets: activeForPeriod.filter((budget) => budget.currency !== currency),
  };
}

/**
 * The budget cards on Home: the ones closest to their limit, overspent first.
 * Ties keep the category sort order from `buildBudgetPlan`.
 */
export function closestToLimit(rows: readonly BudgetRow[], count = 3): BudgetRow[] {
  return [...rows]
    .sort((left, right) => {
      if (right.progress !== left.progress) return right.progress - left.progress;
      return left.name.localeCompare(right.name);
    })
    .slice(0, Math.max(0, Math.trunc(count)));
}
