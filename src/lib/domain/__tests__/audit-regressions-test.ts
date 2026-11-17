import { formatMoney, parseMoneyInput, parseSignedMoneyInput, sanitizeMoneyInput } from "../../format/money";
import { transactionsToCsv } from "../csv";
import { addMonthsClamped, addYearsClamped } from "../dates";
import { firstDueOnOrAfter } from "../recurrence";
import { safeToSpend } from "../safeToSpend";

describe("domain audit regressions", () => {
  test("firstDueOnOrAfter never yields a date earlier than rule.startDate when dayOfMonth < startDate day", () => {
    const monthly = {
      frequency: "monthly" as const,
      intervalCount: 1,
      dayOfMonth: 5,
      startDate: "2026-11-15",
      endDate: null,
    };
    expect(firstDueOnOrAfter(monthly, "2026-11-15")).toBe("2026-12-05");
    expect(firstDueOnOrAfter(monthly, "2026-11-01")).toBe("2026-12-05");

    const yearly = {
      frequency: "yearly" as const,
      intervalCount: 1,
      dayOfMonth: 5,
      startDate: "2026-11-15",
      endDate: null,
    };
    expect(firstDueOnOrAfter(yearly, "2026-11-15")).toBe("2027-11-05");
  });

  test("transactionsToCsv neutralizes formula prefixes in text cells while preserving negative numbers", () => {
    const csv = transactionsToCsv([
      {
        id: "tx-1",
        type: "expense",
        amountMinor: 1250,
        currency: "USD",
        accountName: "=CMD|'/C calc'!A0",
        categoryName: "+SUM(1,2)",
        itemName: "-1+1",
        place: "@HYPERLINK(\"http://evil\")",
        note: "\t=1+1",
        occurredAt: "2026-11-15T10:00:00.000Z",
        localDate: "2026-11-15",
        recurringId: null,
        transferAccountName: null,
      },
    ]);

    const lines = csv.trim().split("\n");
    const row = lines[lines.length - 1];
    // Signed amount stays bare numeric for spreadsheet SUM().
    expect(row).toContain(",-12.50,");
    // Formula-prefixed text cells are single-quote neutralized.
    expect(row).toContain("'=CMD|'/C calc'!A0");
    expect(row).toContain("'+SUM(1,2)");
    expect(row).toContain("'-1+1");
    expect(row).toContain("'@HYPERLINK(");
    expect(row).toContain("'\t=1+1");
  });

  test("money formatting & parsing handle withCode signs, thousands commas, zero-decimal dots, and -0", () => {
    const formatted = formatMoney(-1250, "USD", { withCode: true });
    expect(formatted.startsWith("−USD")).toBe(true);
    expect(sanitizeMoneyInput("1,250", "USD")).toBe("1250");
    expect(sanitizeMoneyInput("1,250,000.50", "USD")).toBe("1250000.50");
    expect(parseMoneyInput("1200.", "JPY")).toBeNull();
    expect(parseSignedMoneyInput("-0", "USD")).toBe(0);
  });

  test("addMonthsClamped, addYearsClamped, and safeToSpend guard edge inputs", () => {
    expect(addMonthsClamped("2026-01-31", 1.9)).toBe("2026-02-28");
    expect(addYearsClamped("2024-02-29", 1.7)).toBe("2025-02-28");
    expect(safeToSpend({ limitMinor: 10_000, spentMinor: Number.NaN, committedMinor: -500, daysRemaining: 2 })).toBe(5_000);
  });
});
