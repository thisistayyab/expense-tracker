import { listAccounts } from "../repos/accounts";
import { listCategories } from "../repos/categories";
import { monthlyTotals, topItemTotals, unnamedItemTotals } from "../repos/insights";
import { createTransaction, sumSpentForComparison } from "../repos/transactions";
import { seededDb } from "../testDb";

const NOW = "2026-01-01T00:00:00.000Z";

async function setup() {
  const db = await seededDb("USD");
  const [cash] = await listAccounts(db);
  const categories = (await listCategories(db)).filter((category) => category.kind === "expense");
  // A second account so transfers are legal and can be proven excluded.
  await db.runAsync(
    `INSERT INTO accounts
       (id, name, type, currency, opening_balance_minor, color, icon, is_archived,
        sort_order, created_at, updated_at)
     VALUES ('acc-bank', 'Bank', 'bank', 'USD', 0, NULL, NULL, 0, 1, ?, ?)`,
    [NOW, NOW],
  );
  return { db, cash, categories };
}

const base = {
  type: "expense" as const,
  currency: "USD",
  occurredAt: "2026-01-05T12:00:00.000Z",
  localDate: "2026-01-05",
};

describe("monthlyTotals", () => {
  test("groups by month, separates income, and excludes transfers and other currencies", async () => {
    const { db, cash, categories } = await setup();

    await createTransaction(db, {
      ...base,
      amountMinor: 1_000,
      accountId: cash.id,
      categoryId: categories[0].id,
    });
    await createTransaction(db, {
      ...base,
      amountMinor: 2_000,
      accountId: cash.id,
      categoryId: categories[1].id,
      localDate: "2026-01-20",
    });
    await createTransaction(db, {
      ...base,
      type: "income",
      amountMinor: 5_000,
      accountId: cash.id,
      localDate: "2026-02-01",
    });
    await createTransaction(db, {
      ...base,
      amountMinor: 7_000,
      currency: "EUR",
      accountId: cash.id,
      localDate: "2026-02-02",
    });
    await createTransaction(db, {
      ...base,
      amountMinor: 300,
      accountId: cash.id,
      localDate: "2025-12-31",
    });
    await createTransaction(db, {
      ...base,
      type: "transfer",
      amountMinor: 4_000,
      accountId: cash.id,
      transferAccountId: "acc-bank",
      localDate: "2026-02-03",
    });

    const rows = await monthlyTotals(db, {
      currency: "USD",
      fromDate: "2026-01-01",
      toDate: "2026-02-28",
    });

    expect(rows).toEqual([
      { month: "2026-01", expenseMinor: 3_000, incomeMinor: 0 },
      { month: "2026-02", expenseMinor: 0, incomeMinor: 5_000 },
    ]);
  });
});

describe("comparison totals", () => {
  test("sums month-to-date and the same days last month in one scan", async () => {
    const { db, cash, categories } = await setup();
    const row = (amountMinor: number, localDate: string, currency = "USD") =>
      createTransaction(db, {
        ...base,
        amountMinor,
        currency,
        accountId: cash.id,
        categoryId: categories[0].id,
        localDate,
      });

    await row(1_000, "2026-03-05");
    // After the current cut-off: neither side.
    await row(500, "2026-03-20");
    await row(700, "2026-02-07");
    // After the previous cut-off: neither side.
    await row(200, "2026-02-20");
    await row(9_999, "2026-03-05", "EUR");

    expect(
      await sumSpentForComparison(db, {
        currency: "USD",
        currentFrom: "2026-03-01",
        previousFrom: "2026-02-01",
        previousTo: "2026-02-10",
        toDate: "2026-03-10",
      }),
    ).toEqual({ currentMinor: 1_000, previousMinor: 700 });
  });
});

describe("top item aggregates", () => {
  test("groups names case-insensitively and leaves blanks to the fallback query", async () => {
    const { db, cash, categories } = await setup();
    const item = (amountMinor: number, itemName: string | null, categoryId: string) =>
      createTransaction(db, {
        ...base,
        amountMinor,
        accountId: cash.id,
        categoryId,
        itemName,
        localDate: "2026-01-05",
      });

    await item(500, "Flat White", categories[0].id);
    await item(300, "flat white", categories[0].id);
    await item(200, "Latte", categories[0].id);
    await item(400, "", categories[1].id);
    await item(100, null, categories[0].id);
    await createTransaction(db, {
      ...base,
      type: "income",
      amountMinor: 900,
      accountId: cash.id,
      itemName: "Flat White",
      localDate: "2026-01-06",
    });

    const range = { currency: "USD", fromDate: "2026-01-01", toDate: "2026-01-31" };
    const named = await topItemTotals(db, { ...range, limit: 2 });

    expect(named).toHaveLength(2);
    expect(named[0]).toMatchObject({ key: "flat white", amountMinor: 800, count: 2 });
    expect(named[1]).toMatchObject({ key: "latte", amountMinor: 200, count: 1 });
    expect(named.map((row) => row.key)).not.toContain("");

    const unnamed = await unnamedItemTotals(db, range);
    expect(unnamed).toHaveLength(2);
    expect(unnamed[0]).toMatchObject({
      categoryId: categories[1].id,
      amountMinor: 400,
      count: 1,
    });
    expect(unnamed[1]).toMatchObject({
      categoryId: categories[0].id,
      amountMinor: 100,
      count: 1,
    });
  });
});
