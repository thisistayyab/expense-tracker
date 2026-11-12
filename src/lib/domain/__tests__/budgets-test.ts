import {
  budgetProgress,
  budgetRemaining,
  budgetState,
  isOverOverallBudget,
  totalLimits,
} from "../budgets";

describe("budget arithmetic", () => {
  test("remaining goes negative on overspend, it is not clamped here", () => {
    expect(budgetRemaining(50_000, 32_000)).toBe(18_000);
    expect(budgetRemaining(50_000, 55_000)).toBe(-5_000);
  });

  test("progress and state follow the 80% warning threshold", () => {
    expect(budgetProgress(50_000, 25_000)).toBe(0.5);
    expect(budgetProgress(50_000, 40_000)).toBe(0.8);
    expect(budgetProgress(50_000, 75_000)).toBe(1.5);
    expect(budgetState(0.5)).toBe("ok");
    expect(budgetState(0.8)).toBe("warning");
    expect(budgetState(1)).toBe("over");
  });

  test("a zero limit cannot divide by zero", () => {
    expect(budgetProgress(0, 0)).toBe(0);
    expect(budgetProgress(0, 1)).toBe(1);
  });

  test("category limits can exceed the overall budget, but only as a warning", () => {
    expect(totalLimits([20_000, 25_000, 10_000])).toBe(55_000);
    expect(isOverOverallBudget(50_000, [20_000, 25_000, 10_000])).toBe(true);
    expect(isOverOverallBudget(60_000, [20_000, 25_000, 10_000])).toBe(false);
  });
});
