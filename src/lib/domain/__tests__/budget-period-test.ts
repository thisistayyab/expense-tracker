import { earliestMonthOffset, periodWindow, windowLabel } from "../budget-period";

const TODAY = "2026-03-10";

describe("periodWindow", () => {
  test("monthly windows are calendar months and offset walks backwards", () => {
    expect(periodWindow("monthly", TODAY, TODAY, 0)).toEqual({
      start: "2026-03-01",
      end: "2026-03-31",
      isCurrent: true,
    });
    expect(periodWindow("monthly", TODAY, TODAY, -1)).toEqual({
      start: "2026-02-01",
      end: "2026-02-28",
      isCurrent: false,
    });
    expect(periodWindow("monthly", TODAY, TODAY, -12)).toEqual({
      start: "2025-03-01",
      end: "2025-03-31",
      isCurrent: false,
    });
  });

  test("a positive offset cannot look into the future", () => {
    expect(periodWindow("monthly", TODAY, TODAY, 3).start).toBe("2026-03-01");
  });

  test("yearly windows are whole calendar years", () => {
    expect(periodWindow("yearly", TODAY, TODAY, 0)).toEqual({
      start: "2026-01-01",
      end: "2026-12-31",
      isCurrent: true,
    });
    expect(periodWindow("yearly", TODAY, TODAY, -1).start).toBe("2025-01-01");
  });

  test("weekly windows stay anchored to the budget start date", () => {
    const window = periodWindow("weekly", "2026-03-04", TODAY, -5);
    expect(window).toEqual({ start: "2026-03-04", end: "2026-03-10", isCurrent: true });
    // Months are not an axis for a weekly budget.
    expect(periodWindow("weekly", "2026-03-04", TODAY, -1).start).toBe("2026-03-04");
  });
});

describe("earliestMonthOffset", () => {
  test("returns how far the month selector may go back", () => {
    expect(earliestMonthOffset("2025-11-20", TODAY)).toBe(-4);
    expect(earliestMonthOffset("2026-03-01", TODAY)).toBe(0);
    expect(earliestMonthOffset(null, TODAY)).toBe(0);
  });

  test("never offers a future month", () => {
    expect(earliestMonthOffset("2026-08-04", TODAY)).toBe(0);
  });
});

describe("windowLabel", () => {
  test("monthly and yearly labels include the year", () => {
    expect(windowLabel("monthly", { start: "2026-11-01", end: "2026-11-30", isCurrent: true })).toContain(
      "2026",
    );
    expect(windowLabel("yearly", { start: "2026-01-01", end: "2026-12-31", isCurrent: true })).toBe(
      "2026",
    );
  });

  test("weekly labels show both ends of the window", () => {
    expect(
      windowLabel("weekly", { start: "2026-03-04", end: "2026-03-10", isCurrent: true }),
    ).toMatch(/4.*10/);
  });
});
