/**
 * Budget arithmetic. All values are integers in the active currency's minor unit;
 * the only division here is for a display ratio.
 */
export type BudgetState = "ok" | "warning" | "over";

/** Threshold where a category starts showing the warning color (04). */
export const WARNING_THRESHOLD = 0.8;

/** Negative means overspent; never clamped here, the UI decides how to show it. */
export function budgetRemaining(limitMinor: number, spentMinor: number): number {
  return Math.trunc(limitMinor) - Math.trunc(spentMinor);
}

export function budgetProgress(limitMinor: number, spentMinor: number): number {
  if (limitMinor <= 0) return spentMinor > 0 ? 1 : 0;
  return spentMinor / limitMinor;
}

export function budgetState(progress: number): BudgetState {
  if (progress >= 1) return "over";
  if (progress >= WARNING_THRESHOLD) return "warning";
  return "ok";
}

/**
 * Sum of per-category limits. Used for the soft warning when category limits exceed
 * the overall budget — a warning, never a block.
 */
export function totalLimits(limits: readonly number[]): number {
  return limits.reduce((sum, limit) => sum + Math.trunc(limit), 0);
}

export function isOverOverallBudget(overallLimitMinor: number, categoryLimits: readonly number[]): boolean {
  return totalLimits(categoryLimits) > Math.trunc(overallLimitMinor);
}
