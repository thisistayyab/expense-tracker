/**
 * Safe-to-spend, exactly as specified in 02-data-model.md:
 *
 *   max(0, overall_limit − spent_total − committed_unposted) / max(1, days_remaining)
 *
 * Committed bills are recurring expenses due later in the period that have not been
 * logged yet; they are set aside so today's number is not a lie. The result is
 * floored to whole minor units and always clamped at zero — overspend shows as zero
 * here while the budget row still shows the negative remaining.
 */
export type SafeToSpendInput = {
  limitMinor: number;
  spentMinor: number;
  committedMinor?: number;
  daysRemaining: number;
};

export function remainingAfterCommitments({
  limitMinor,
  spentMinor,
  committedMinor = 0,
}: Omit<SafeToSpendInput, "daysRemaining">): number {
  return Math.trunc(limitMinor) - Math.trunc(spentMinor) - Math.trunc(committedMinor);
}

export function safeToSpend(input: SafeToSpendInput): number {
  const days = Math.max(1, Math.trunc(input.daysRemaining));
  const remaining = remainingAfterCommitments(input);
  if (remaining <= 0) return 0;
  return Math.floor(remaining / days);
}
