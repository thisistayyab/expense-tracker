import {
  firstDueOnOrAfter,
  frequencyLabel,
  nextDueAfter,
  occurrenceAt,
  occurrencesBetween,
  type RecurrenceRule,
} from "../recurrence";

function rule(overrides: Partial<RecurrenceRule> = {}): RecurrenceRule {
  return {
    frequency: "monthly",
    intervalCount: 1,
    dayOfMonth: 31,
    startDate: "2026-01-31",
    endDate: null,
    ...overrides,
  };
}

describe("recurrence occurrences", () => {
  test("a bill on the 31st clamps in short months and resumes on the 31st", () => {
    const monthly = rule();

    expect(occurrenceAt(monthly, 0)).toBe("2026-01-31");
    expect(occurrenceAt(monthly, 1)).toBe("2026-02-28");
    expect(occurrenceAt(monthly, 2)).toBe("2026-03-31");
    expect(occurrenceAt(monthly, 3)).toBe("2026-04-30");
    expect(occurrenceAt(monthly, 4)).toBe("2026-05-31");
  });

  test("an interval counts from the start anchor, not the clamped date", () => {
    const everyTwoMonths = rule({ intervalCount: 2 });

    expect(occurrenceAt(everyTwoMonths, 1)).toBe("2026-03-31");
    expect(occurrenceAt(everyTwoMonths, 2)).toBe("2026-05-31");
    expect(occurrenceAt(everyTwoMonths, 3)).toBe("2026-07-31");
  });

  test("a Feb 29 yearly bill clamps to Feb 28 and returns on the leap year", () => {
    const leap = rule({
      frequency: "yearly",
      dayOfMonth: 29,
      startDate: "2024-02-29",
    });

    expect(occurrenceAt(leap, 1)).toBe("2025-02-28");
    expect(occurrenceAt(leap, 2)).toBe("2026-02-28");
    expect(occurrenceAt(leap, 4)).toBe("2028-02-29");
  });

  test("daily and weekly intervals advance by the right number of days", () => {
    const daily = rule({ frequency: "daily", intervalCount: 3, startDate: "2026-11-01" });
    const weekly = rule({ frequency: "weekly", intervalCount: 2, startDate: "2026-11-01" });

    expect(occurrenceAt(daily, 2)).toBe("2026-11-07");
    expect(occurrenceAt(weekly, 2)).toBe("2026-11-29");
  });

  test("firstDueOnOrAfter never returns an earlier date", () => {
    const monthly = rule();

    expect(firstDueOnOrAfter(monthly, "2026-02-10")).toBe("2026-02-28");
    expect(firstDueOnOrAfter(monthly, "2026-03-01")).toBe("2026-03-31");
    expect(firstDueOnOrAfter(monthly, "2025-12-01")).toBe("2026-01-31");
    expect(nextDueAfter(monthly, "2026-02-28")).toBe("2026-03-31");
  });
});

describe("recurrence windows", () => {
  test("a three-month-old monthly rule yields every missed occurrence", () => {
    const monthly = rule({ startDate: "2026-08-01", dayOfMonth: 1 });

    expect(occurrencesBetween(monthly, "2026-08-01", "2026-11-12")).toEqual([
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
    ]);
  });

  test("the end date is inclusive and stops the schedule", () => {
    const ended = rule({ endDate: "2026-03-31" });

    expect(occurrencesBetween(ended, "2026-01-31", "2026-05-31")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
    expect(firstDueOnOrAfter(ended, "2026-04-01")).toBeNull();
  });

  test("an empty window is empty even for a valid rule", () => {
    expect(occurrencesBetween(rule(), "2026-05-01", "2026-04-01")).toEqual([]);
    expect(occurrencesBetween(rule(), "not-a-date", "2026-05-01")).toEqual([]);
  });

  test("frequency labels read naturally", () => {
    expect(frequencyLabel("monthly", 1)).toBe("Every month");
    expect(frequencyLabel("weekly", 2)).toBe("Every 2 weeks");
    expect(frequencyLabel("daily", 3)).toBe("Every 3 days");
  });
});
