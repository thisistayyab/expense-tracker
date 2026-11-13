import type { Budget, Category } from "../../db/types";
import { buildBudgetPlan, closestToLimit } from "../budget-plan";

const NOW = "2026-03-01T00:00:00.000Z";

function category(overrides: Partial<Category> & { id: string; name: string }): Category {
  return {
    parentId: null,
    kind: "expense",
    icon: "cart",
    color: "#5B5BF7",
    isArchived: false,
    sortOrder: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function budget(overrides: Partial<Budget> & { id: string }): Budget {
  return {
    categoryId: null,
    period: "monthly",
    limitMinor: 100_000,
    currency: "USD",
    rollover: false,
    startDate: "2026-03-01",
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const food = category({ id: "food", name: "Food", sortOrder: 0 });
const rent = category({ id: "rent", name: "Rent", sortOrder: 1 });

describe("buildBudgetPlan", () => {
  test("overall remaining subtracts spend and committed bills", () => {
    const plan = buildBudgetPlan({
      currency: "USD",
      period: "monthly",
      budgets: [budget({ id: "overall", limitMinor: 300_000 })],
      categories: [],
      spendByCategory: [],
      totalSpentMinor: 100_000,
      committedMinor: 50_000,
      committedCount: 2,
      daysRemaining: 10,
      isCurrentPeriod: true,
    });

    expect(plan.overallLimitMinor).toBe(300_000);
    expect(plan.remainingMinor).toBe(150_000);
    // The bar includes bills, so 150,000 of 300,000 is half.
    expect(plan.progress).toBeCloseTo(0.5);
    expect(plan.safePerDayMinor).toBe(15_000);
    expect(plan.committedCount).toBe(2);
  });

  test("no overall budget means no remaining number and no safe-to-spend", () => {
    const plan = buildBudgetPlan({
      currency: "USD",
      period: "monthly",
      budgets: [],
      categories: [],
      spendByCategory: [],
      totalSpentMinor: 12_000,
      daysRemaining: 20,
      isCurrentPeriod: true,
    });

    expect(plan.overallBudget).toBeNull();
    expect(plan.remainingMinor).toBeNull();
    expect(plan.safePerDayMinor).toBeNull();
    expect(plan.progress).toBe(0);
    expect(plan.state).toBe("ok");
  });

  test("overspending clamps the daily number at zero but keeps the negative remaining", () => {
    const plan = buildBudgetPlan({
      currency: "USD",
      period: "monthly",
      budgets: [budget({ id: "overall", limitMinor: 50_000 })],
      categories: [],
      spendByCategory: [],
      totalSpentMinor: 70_000,
      daysRemaining: 4,
      isCurrentPeriod: true,
    });

    expect(plan.remainingMinor).toBe(-20_000);
    expect(plan.safePerDayMinor).toBe(0);
    expect(plan.state).toBe("over");
  });

  test("rows are scoped to the currency and period, named from categories, and sorted", () => {
    const plan = buildBudgetPlan({
      currency: "USD",
      period: "monthly",
      budgets: [
        budget({ id: "b-rent", categoryId: "rent", limitMinor: 80_000, period: "monthly" }),
        budget({ id: "b-food", categoryId: "food", limitMinor: 40_000 }),
        budget({ id: "b-weekly", categoryId: "food", period: "weekly", limitMinor: 10_000 }),
        budget({ id: "b-eur", categoryId: "food", currency: "EUR", limitMinor: 30_000 }),
        budget({ id: "b-off", categoryId: "food", isActive: false }),
        budget({ id: "b-unknown", categoryId: "gone", limitMinor: 5_000 }),
      ],
      categories: [food, rent],
      spendByCategory: [
        { categoryId: "food", spentMinor: 32_000 },
        { categoryId: "rent", spentMinor: 80_000 },
        { categoryId: "gone", spentMinor: 4_000 },
        { categoryId: null, spentMinor: 9_999 },
      ],
      totalSpentMinor: 123_999,
      daysRemaining: 10,
      isCurrentPeriod: true,
    });

    expect(plan.rows.map((row) => row.name)).toEqual(["Food", "Rent", "Removed category"]);
    expect(plan.rows[0]).toMatchObject({
      spentMinor: 32_000,
      remainingMinor: 8_000,
      state: "warning",
    });
    expect(plan.rows[1].state).toBe("over");
    expect(plan.rows[1].remainingMinor).toBe(0);
    // The deleted-category row still counts its spend where it was recorded.
    expect(plan.rows[2].remainingMinor).toBe(1_000);
    expect(plan.totalCategoryLimitsMinor).toBe(125_000);
  });

  test("category limits exceeding the overall budget are a warning, not a removal", () => {
    const plan = buildBudgetPlan({
      currency: "USD",
      period: "monthly",
      budgets: [
        budget({ id: "overall", limitMinor: 100_000 }),
        budget({ id: "food", categoryId: "food", limitMinor: 80_000 }),
        budget({ id: "rent", categoryId: "rent", limitMinor: 80_000 }),
      ],
      categories: [food, rent],
      spendByCategory: [],
      totalSpentMinor: 0,
      daysRemaining: 31,
      isCurrentPeriod: true,
    });

    expect(plan.categoryLimitsExceedOverall).toBe(true);
    expect(plan.totalCategoryLimitsMinor).toBe(160_000);
    expect(plan.rows).toHaveLength(2);
  });

  test("a finished period keeps left-over money but has no per-day figure", () => {
    const plan = buildBudgetPlan({
      currency: "USD",
      period: "monthly",
      budgets: [budget({ id: "overall", limitMinor: 200_000 })],
      categories: [],
      spendByCategory: [],
      totalSpentMinor: 150_000,
      daysRemaining: 1,
      isCurrentPeriod: false,
    });

    expect(plan.remainingMinor).toBe(50_000);
    expect(plan.safePerDayMinor).toBeNull();
  });

  test("budgets in another currency are offered for recreation, never totalled", () => {
    const plan = buildBudgetPlan({
      currency: "USD",
      period: "monthly",
      budgets: [
        budget({ id: "overall", limitMinor: 200_000 }),
        budget({ id: "eur", currency: "EUR", limitMinor: 90_000 }),
      ],
      categories: [],
      spendByCategory: [],
      totalSpentMinor: 0,
      daysRemaining: 30,
      isCurrentPeriod: true,
    });

    expect(plan.previousCurrencyBudgets.map((row) => row.id)).toEqual(["eur"]);
    expect(plan.overallLimitMinor).toBe(200_000);
  });
});

describe("closestToLimit", () => {
  const rows = [
    { name: "Food", progress: 0.2 },
    { name: "Rent", progress: 1.2 },
    { name: "Fun", progress: 0.8 },
    { name: "Travel", progress: 0.4 },
  ].map((row, index) => ({
    budgetId: `b-${index}`,
    categoryId: `c-${index}`,
    name: row.name,
    icon: null,
    color: null,
    limitMinor: 100,
    spentMinor: Math.round(row.progress * 100),
    remainingMinor: 100 - Math.round(row.progress * 100),
    progress: row.progress,
    state: (row.progress >= 1 ? "over" : row.progress >= 0.8 ? "warning" : "ok") as
      | "ok"
      | "warning"
      | "over",
  }));

  test("shows the three closest to their limit, overspent first", () => {
    expect(closestToLimit(rows).map((row) => row.name)).toEqual(["Rent", "Fun", "Travel"]);
  });

  test("keeps the requested count bounded", () => {
    expect(closestToLimit(rows, 0)).toEqual([]);
    expect(closestToLimit(rows, 10)).toHaveLength(4);
  });
});
