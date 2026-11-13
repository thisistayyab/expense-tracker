import type { Transaction } from "../../db/types";
import { dayNetForCurrency, groupTransactionsByDay } from "../transaction-groups";

function row(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? "tx",
    type: "expense",
    amountMinor: 1000,
    currency: "USD",
    accountId: "cash",
    transferAccountId: null,
    categoryId: null,
    itemName: null,
    place: null,
    note: null,
    occurredAt: "2026-11-12T12:00:00.000Z",
    localDate: "2026-11-12",
    recurringId: null,
    createdAt: "2026-11-12T12:00:00.000Z",
    updatedAt: "2026-11-12T12:00:00.000Z",
    ...overrides,
  };
}

describe("transaction day groups", () => {
  test("groups by local date and computes per-currency net totals", () => {
    const rows = [
      row({ id: "expense", amountMinor: 1250 }),
      row({ id: "income", type: "income", amountMinor: 5000 }),
      row({ id: "euro", currency: "EUR", amountMinor: 1000 }),
      row({
        id: "transfer",
        type: "transfer",
        amountMinor: 9999,
        transferAccountId: "bank",
      }),
      row({
        id: "old",
        localDate: "2026-11-11",
        amountMinor: 500,
        occurredAt: "2026-11-11T12:00:00.000Z",
      }),
    ];

    const sections = groupTransactionsByDay(rows);
    expect(sections.map((section) => section.date)).toEqual(["2026-11-12", "2026-11-11"]);
    expect(sections[0].data).toHaveLength(4);
    expect(sections[0].totals).toEqual(
      expect.arrayContaining([
        { currency: "USD", totalMinor: 3750 },
        { currency: "EUR", totalMinor: -1000 },
      ]),
    );
    expect(sections[1].totals).toEqual([{ currency: "USD", totalMinor: -500 }]);
  });

  test("transfers never change a day total", () => {
    const rows = [
      row({ id: "one", type: "transfer", transferAccountId: "bank", amountMinor: 5000 }),
      row({ id: "two", type: "expense", amountMinor: 500 }),
    ];
    expect(dayNetForCurrency(rows, "USD")).toBe(-500);
  });
});
