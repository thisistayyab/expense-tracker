import {
  addDays,
  addMonthsClamped,
  daysBetween,
  daysBetweenInclusive,
  daysInMonth,
  daysRemainingInPeriod,
  endOfMonth,
  isLeapYear,
  nextDueDate,
  periodRange,
  startOfWeek,
  toIsoDate,
} from "../dates";

describe("calendar days", () => {
  test("knows leap years", () => {
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2026, 4)).toBe(30);
  });

  test("month ends use the real month length", () => {
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
    expect(endOfMonth("2026-11-12")).toBe("2026-11-30");
  });

  test("adds days without drifting across DST", () => {
    // US DST starts 2026-03-08 and ends 2026-11-01; date math must not skip or repeat.
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(daysBetween("2026-11-01", "2026-11-30")).toBe(29);
    expect(daysBetweenInclusive("2026-11-01", "2026-11-30")).toBe(30);
  });

  test("reads today from the local calendar, not UTC", () => {
    expect(toIsoDate(new Date(2026, 10, 12, 23, 30))).toBe("2026-11-12");
  });
});

describe("periods", () => {
  test("monthly and yearly windows are calendar-aligned", () => {
    expect(periodRange("monthly", "2026-11-06", "2026-11-12")).toEqual({
      start: "2026-11-01",
      end: "2026-11-30",
    });
    expect(periodRange("yearly", "2026-11-06", "2026-11-12")).toEqual({
      start: "2026-01-01",
      end: "2026-12-31",
    });
  });

  test("weekly windows are anchored to the budget start date, not Monday", () => {
    expect(periodRange("weekly", "2026-11-06", "2026-11-12")).toEqual({
      start: "2026-11-06",
      end: "2026-11-12",
    });
    expect(startOfWeek("2026-11-13", "2026-11-06")).toBe("2026-11-13");
    // A date before the anchor still lands in a window instead of throwing.
    expect(startOfWeek("2026-11-05", "2026-11-06")).toBe("2026-10-30");
  });

  test("days remaining includes today, so the last day divides by one", () => {
    expect(daysRemainingInPeriod("monthly", "2026-11-01", "2026-11-12")).toBe(19);
    expect(daysRemainingInPeriod("monthly", "2026-11-01", "2026-11-30")).toBe(1);
  });
});

describe("month-end clamping", () => {
  test("a 31st lands on the last day of shorter months", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonthsClamped("2026-03-31", 1)).toBe("2026-04-30");
    expect(addMonthsClamped("2026-12-15", 1)).toBe("2027-01-15");
  });

  test("nextDueDate clamps monthly and yearly recurrences", () => {
    expect(
      nextDueDate(
        { frequency: "monthly", intervalCount: 1, dayOfMonth: 31, startDate: "2026-01-31" },
        "2026-01-31",
      ),
    ).toBe("2026-02-28");
    // Feb 29 yearly bill: 2029 and beyond clamp to Feb 28, never March 1.
    expect(
      nextDueDate(
        { frequency: "yearly", intervalCount: 1, dayOfMonth: 29, startDate: "2028-02-29" },
        "2028-02-29",
      ),
    ).toBe("2029-02-28");
    expect(
      nextDueDate(
        { frequency: "weekly", intervalCount: 2, startDate: "2026-11-06" },
        "2026-11-06",
      ),
    ).toBe("2026-11-20");
  });
});
