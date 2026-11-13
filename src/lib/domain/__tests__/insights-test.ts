import type { Category } from "../../db/types";
import {
  buildBreakdown,
  buildInsightCards,
  buildTopItems,
  buildTrend,
  insightRanges,
  monthDelta,
} from "../insights";

const NOW = "2026-03-01T00:00:00.000Z";

function category(id: string, name: string, color = "#5B5BF7"): Category {
  return {
    id,
    parentId: null,
    name,
    kind: "expense",
    icon: "cart",
    color,
    isArchived: false,
    sortOrder: 0,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe("insightRanges", () => {
  const today = "2026-03-10";

  test("this month compares against the same days of last month", () => {
    const ranges = insightRanges("month", today);
    expect(ranges.current).toEqual({ from: "2026-03-01", to: "2026-03-10" });
    expect(ranges.comparison).toEqual({ from: "2026-02-01", to: "2026-02-10" });
    expect(ranges.comparisonLabel).toBe("last month");
  });

  test("month-to-date clamps in a short previous month", () => {
    const ranges = insightRanges("month", "2026-03-31");
    expect(ranges.comparison).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });

  test("last month compares full calendar months", () => {
    const ranges = insightRanges("last_month", today);
    expect(ranges.current).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(ranges.comparison).toEqual({ from: "2026-01-01", to: "2026-01-31" });
  });

  test("3M and 6M compare the equal-length window immediately before", () => {
    const three = insightRanges("last_3", today);
    expect(three.current).toEqual({ from: "2026-01-01", to: "2026-03-10" });
    // 69 days including today, so the comparison is the 69 days before Jan 1 rather
    // than a full calendar quarter that would read as a fake drop.
    expect(three.comparison).toEqual({ from: "2025-10-24", to: "2025-12-31" });
    expect(three.comparisonLabel).toBe("the previous period");

    const six = insightRanges("last_6", today);
    expect(six.current).toEqual({ from: "2025-10-01", to: "2026-03-10" });
    expect(six.comparison).toEqual({ from: "2025-04-23", to: "2025-09-30" });
    expect(six.comparisonLabel).toBe("the previous period");
  });

  test("year compares against the same dates last year", () => {
    const ranges = insightRanges("year", today);
    expect(ranges.current).toEqual({ from: "2026-01-01", to: "2026-03-10" });
    expect(ranges.comparison).toEqual({ from: "2025-01-01", to: "2025-03-10" });
  });
});

describe("buildBreakdown", () => {
  const categories = [
    category("a", "Alpha"),
    category("b", "Beta"),
    category("c", "Gamma"),
    category("d", "Delta"),
    category("e", "Epsilon"),
    category("f", "Zeta"),
    category("g", "Eta"),
    category("h", "Theta"),
  ];
  const spend = [
    { categoryId: "a", spentMinor: 300 },
    { categoryId: "b", spentMinor: 200 },
    { categoryId: "c", spentMinor: 150 },
    { categoryId: "d", spentMinor: 100 },
    { categoryId: "e", spentMinor: 80 },
    { categoryId: "f", spentMinor: 70 },
    { categoryId: "g", spentMinor: 50 },
    { categoryId: "h", spentMinor: 30 },
    { categoryId: null, spentMinor: 20 },
  ];

  test("sorts by spend, keeps six rows and folds the rest into Other", () => {
    const rows = buildBreakdown(spend, categories, 1_000);
    expect(rows).toHaveLength(6);
    expect(rows.map((row) => row.name)).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
      "Delta",
      "Epsilon",
      "Other",
    ]);
    expect(rows[5].amountMinor).toBe(70 + 50 + 30 + 20);
    expect(rows[5].categoryId).toBeNull();
    expect(rows.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1);
    expect(rows[0].share).toBeCloseTo(0.3);
  });

  test("an unnamed row is labelled and never pressable", () => {
    const rows = buildBreakdown([{ categoryId: null, spentMinor: 500 }], categories, 500);
    expect(rows[0]).toMatchObject({ name: "Uncategorized", categoryId: null, share: 1 });
  });

  test("no spend means no rows, not a zero-percent bar", () => {
    expect(buildBreakdown([{ categoryId: "a", spentMinor: 0 }], categories, 0)).toEqual([]);
  });
});

describe("buildTopItems", () => {
  const categories = [category("food", "Food"), category("rent", "Rent")];

  test("merges named and category fallback rows by spend", () => {
    const rows = buildTopItems(
      [{ key: "flat white", label: "Flat white", amountMinor: 500, count: 5 }],
      [{ categoryId: "food", amountMinor: 700, count: 3 }],
      categories,
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      label: "Food",
      amountMinor: 700,
      count: 3,
      unnamed: true,
      categoryId: "food",
    });
    expect(rows[1]).toMatchObject({ label: "Flat white", unnamed: false });
  });

  test("keeps the requested top-five limit", () => {
    const named = Array.from({ length: 8 }, (_, index) => ({
      key: `item-${index}`,
      label: `Item ${index}`,
      amountMinor: 1000 - index * 10,
      count: 1,
    }));
    expect(buildTopItems(named, [], categories)).toHaveLength(5);
    expect(buildTopItems(named, [], categories, 2)).toHaveLength(2);
  });
});

describe("buildTrend", () => {
  test("returns six months, filling gaps with zero", () => {
    const points = buildTrend(
      [
        { month: "2026-01", expenseMinor: 100, incomeMinor: 0 },
        { month: "2026-03", expenseMinor: 300, incomeMinor: 50 },
      ],
      "2026-03-10",
    );

    expect(points.map((point) => point.month)).toEqual([
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
    expect(points[3]).toMatchObject({ expenseMinor: 100, incomeMinor: 0 });
    expect(points[4]).toMatchObject({ expenseMinor: 0, incomeMinor: 0 });
    expect(points[5]).toMatchObject({ expenseMinor: 300, incomeMinor: 50 });
    expect(points.every((point) => point.label.length > 0)).toBe(true);
  });
});

describe("monthDelta", () => {
  test("reports up, down, flat and refuses to divide by zero", () => {
    expect(monthDelta(300, 200)).toEqual({ pct: 50, direction: "up" });
    expect(monthDelta(100, 200)).toEqual({ pct: -50, direction: "down" });
    expect(monthDelta(200, 200)).toEqual({ pct: 0, direction: "flat" });
    expect(monthDelta(100, 0)).toBeNull();
  });
});

describe("buildInsightCards", () => {
  test("states the overall change above the ten percent threshold", () => {
    const cards = buildInsightCards({
      totalMinor: 1_220,
      previousTotalMinor: 1_000,
      categories: [],
      breakdown: [],
      comparisonLabel: "last month",
    });

    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("total");
    expect(cards[0].segments.map((segment) => segment.text).join("")).toBe(
      "Spending is 22% higher than last month.",
    );
    expect(cards[0].segments.find((segment) => segment.strong)?.text).toBe("22%");
  });

  test("ignores noise below ten percent", () => {
    expect(
      buildInsightCards({
        totalMinor: 1_050,
        previousTotalMinor: 1_000,
        categories: [],
        breakdown: [],
        comparisonLabel: "last month",
      }),
    ).toEqual([]);
  });

  test("names the category with the biggest qualifying change", () => {
    const cards = buildInsightCards({
      totalMinor: 10_000,
      previousTotalMinor: 10_000,
      categories: [
        { name: "Groceries", currentMinor: 12_200, previousMinor: 10_000 },
        { name: "Transport", currentMinor: 9_000, previousMinor: 10_000 },
      ],
      breakdown: [],
      comparisonLabel: "last month",
    });

    expect(cards.map((card) => card.id)).toEqual(["category"]);
    expect(cards[0].segments.map((segment) => segment.text).join("")).toBe(
      "Groceries is 22% above last month.",
    );
  });

  test("ignores category changes too small to matter", () => {
    const cards = buildInsightCards({
      totalMinor: 1_000,
      previousTotalMinor: 1_000,
      categories: [{ name: "Sweets", currentMinor: 120, previousMinor: 100 }],
      breakdown: [],
      comparisonLabel: "last month",
    });
    expect(cards).toEqual([]);
  });

  test("reports concentration when one category dominates", () => {
    const cards = buildInsightCards({
      totalMinor: 1_000,
      previousTotalMinor: 0,
      categories: [],
      breakdown: [
        {
          key: "food",
          categoryId: "food",
          name: "Food",
          color: null,
          icon: null,
          amountMinor: 500,
          share: 0.5,
        },
        {
          key: "rent",
          categoryId: "rent",
          name: "Rent",
          color: null,
          icon: null,
          amountMinor: 200,
          share: 0.2,
        },
      ],
      comparisonLabel: "last month",
    });

    expect(cards).toHaveLength(1);
    expect(cards[0].segments.map((segment) => segment.text).join("")).toBe(
      "Food took 50% of your spending.",
    );
  });

  test("never shows more than two cards", () => {
    const cards = buildInsightCards({
      totalMinor: 12_000,
      previousTotalMinor: 10_000,
      categories: [{ name: "Food", currentMinor: 13_000, previousMinor: 10_000 }],
      breakdown: [
        {
          key: "food",
          categoryId: "food",
          name: "Food",
          color: null,
          icon: null,
          amountMinor: 520,
          share: 0.52,
        },
        {
          key: "rent",
          categoryId: "rent",
          name: "Rent",
          color: null,
          icon: null,
          amountMinor: 200,
          share: 0.2,
        },
      ],
      comparisonLabel: "last month",
      maxCards: 2,
    });

    expect(cards.map((card) => card.id)).toEqual(["total", "category"]);
    expect(
      buildInsightCards({
        totalMinor: 1_200,
        previousTotalMinor: 1_000,
        categories: [],
        breakdown: [],
        comparisonLabel: "last month",
        maxCards: 0,
      }),
    ).toEqual([]);
  });
});
