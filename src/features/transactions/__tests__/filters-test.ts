import { activeFilterCount, dateRangeFor, EMPTY_FILTERS } from "../filters";

const today = "2026-11-12";

describe("transaction filter helpers", () => {
  test("month presets are calendar-aligned", () => {
    expect(dateRangeFor({ ...EMPTY_FILTERS, datePreset: "this_month" }, today)).toEqual({
      fromDate: "2026-11-01",
      toDate: today,
    });
    expect(dateRangeFor({ ...EMPTY_FILTERS, datePreset: "last_month" }, today)).toEqual({
      fromDate: "2026-10-01",
      toDate: "2026-10-31",
    });
  });

  test("rolling presets include today", () => {
    expect(dateRangeFor({ ...EMPTY_FILTERS, datePreset: "last_7" }, today)).toEqual({
      fromDate: "2026-11-06",
      toDate: today,
    });
    expect(dateRangeFor({ ...EMPTY_FILTERS, datePreset: "last_30" }, today)).toEqual({
      fromDate: "2026-10-14",
      toDate: today,
    });
  });

  test("custom ranges pass through only the chosen bounds", () => {
    expect(
      dateRangeFor(
        {
          datePreset: "custom",
          fromDate: "2026-01-02",
          toDate: null,
        },
        today,
      ),
    ).toEqual({ fromDate: "2026-01-02" });
  });

  test("counts only non-default filters", () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(
      activeFilterCount({
        ...EMPTY_FILTERS,
        datePreset: "last_7",
        type: "expense",
        accountId: "cash",
        categoryId: "food",
        currency: "USD",
        notePresent: true,
      }),
    ).toBe(6);
  });
});
