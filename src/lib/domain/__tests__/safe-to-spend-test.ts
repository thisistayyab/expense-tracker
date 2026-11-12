import { remainingAfterCommitments, safeToSpend } from "../safeToSpend";

describe("safeToSpend", () => {
  test("spreads what is left across the days left, ignoring committed bills", () => {
    expect(
      safeToSpend({ limitMinor: 100_000, spentMinor: 40_000, committedMinor: 10_000, daysRemaining: 10 }),
    ).toBe(5_000);
  });

  test("clamps at zero when overspent", () => {
    expect(safeToSpend({ limitMinor: 100_000, spentMinor: 120_000, daysRemaining: 10 })).toBe(0);
    expect(
      safeToSpend({ limitMinor: 100_000, spentMinor: 100_000, committedMinor: 1, daysRemaining: 5 }),
    ).toBe(0);
  });

  test("a zero or negative day count divides by one instead of crashing", () => {
    expect(safeToSpend({ limitMinor: 50_000, spentMinor: 0, daysRemaining: 0 })).toBe(50_000);
    expect(safeToSpend({ limitMinor: 50_000, spentMinor: 0, daysRemaining: -3 })).toBe(50_000);
  });

  test("no budget means no safe-to-spend number", () => {
    expect(safeToSpend({ limitMinor: 0, spentMinor: 0, daysRemaining: 30 })).toBe(0);
  });

  test("floors to whole minor units", () => {
    expect(safeToSpend({ limitMinor: 100, spentMinor: 0, daysRemaining: 3 })).toBe(33);
  });
});

describe("remainingAfterCommitments", () => {
  test("keeps overspend negative for the budget row", () => {
    expect(remainingAfterCommitments({ limitMinor: 10_000, spentMinor: 12_000 })).toBe(-2_000);
  });
});
