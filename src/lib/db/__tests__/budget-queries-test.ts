import { applyRegionSelection } from "../onboarding";
import { listAccounts } from "../repos/accounts";
import {
  deactivateBudget,
  listBudgets,
  upsertBudget,
} from "../repos/budgets";
import { listCategories } from "../repos/categories";
import { createRecurringRule, setRecurringActive, sumCommittedUnposted } from "../repos/recurring";
import { getSetting, SETTING_KEYS } from "../repos/settings";
import {
  countSpentInOtherCurrencies,
  createTransaction,
  earliestLocalDate,
  sumSpent,
  sumSpentByCategory,
} from "../repos/transactions";
import { seededDb } from "../testDb";

const MARCH = { currency: "USD", fromDate: "2026-03-01", toDate: "2026-03-31" };

async function expenseSetup() {
  const db = await seededDb("USD");
  const accounts = await listAccounts(db);
  const categories = (await listCategories(db)).filter((category) => category.kind === "expense");
  return { db, account: accounts[0], categories };
}

describe("spend aggregation for budgets", () => {
  test("groups expenses by category for one currency and window only", async () => {
    const { db, account, categories } = await expenseSetup();
    const [first, second] = categories;

    const base = {
      type: "expense" as const,
      currency: "USD",
      accountId: account.id,
      occurredAt: "2026-03-05T12:00:00.000Z",
      localDate: "2026-03-05",
    };

    await createTransaction(db, { ...base, amountMinor: 1_200, categoryId: first.id });
    await createTransaction(db, { ...base, amountMinor: 800, categoryId: first.id });
    await createTransaction(db, { ...base, amountMinor: 5_000, categoryId: second.id });
    await createTransaction(db, { ...base, amountMinor: 900, categoryId: null });
    await createTransaction(db, { ...base, amountMinor: 7_000, categoryId: first.id, type: "income" });
    await createTransaction(db, {
      ...base,
      amountMinor: 4_000,
      currency: "EUR",
      categoryId: first.id,
    });
    await createTransaction(db, {
      ...base,
      amountMinor: 100,
      localDate: "2026-04-01",
      categoryId: first.id,
    });

    const rows = await sumSpentByCategory(db, MARCH);
    const byCategory = new Map(rows.map((row) => [row.categoryId, row.spentMinor]));
    expect(byCategory.get(first.id)).toBe(2_000);
    expect(byCategory.get(second.id)).toBe(5_000);
    expect(byCategory.get(null)).toBe(900);
    expect(rows).toHaveLength(3);

    // The plan adds rows to the total, so the two must agree for the overall budget
    // to be honest.
    expect(await sumSpent(db, MARCH)).toBe(7_900);

    expect(await countSpentInOtherCurrencies(db, MARCH)).toEqual([{ currency: "EUR", count: 1 }]);
    expect(await earliestLocalDate(db)).toBe("2026-03-05");
  });

  test("an empty database has no earliest date", async () => {
    const db = await seededDb("USD");
    expect(await earliestLocalDate(db)).toBeNull();
  });
});

describe("committed unposted bills", () => {
  test("counts active expense rules due inside the window, in the active currency", async () => {
    const { db, account, categories } = await expenseSetup();
    const base = {
      type: "expense" as const,
      currency: "USD",
      accountId: account.id,
      categoryId: categories[0].id,
      frequency: "monthly" as const,
      startDate: "2026-03-01",
    };

    await createRecurringRule(db, { ...base, amountMinor: 95_000, nextDueAt: "2026-03-28" });
    await createRecurringRule(db, { ...base, amountMinor: 1_000, nextDueAt: "2026-03-10" });
    // After the window: belongs to a later period.
    await createRecurringRule(db, { ...base, amountMinor: 12_000, nextDueAt: "2026-04-02" });
    // Another currency: never added to USD.
    await createRecurringRule(db, {
      ...base,
      amountMinor: 5_000,
      currency: "EUR",
      nextDueAt: "2026-03-15",
    });
    // Income and inactive rules are not commitments.
    await createRecurringRule(db, {
      ...base,
      type: "income",
      amountMinor: 30_000,
      nextDueAt: "2026-03-20",
    });
    const paused = await createRecurringRule(db, {
      ...base,
      amountMinor: 7_000,
      nextDueAt: "2026-03-12",
    });
    await setRecurringActive(db, paused.id, false);

    expect(await sumCommittedUnposted(db, { ...MARCH, fromDate: "2026-03-10" })).toEqual({
      totalMinor: 96_000,
      count: 2,
    });
  });
});

describe("budget rows", () => {
  test("overall budget upsert stays a single row and deactivation keeps the record", async () => {
    const db = await seededDb("USD");

    const first = await upsertBudget(db, {
      categoryId: null,
      period: "monthly",
      limitMinor: 500_000,
      currency: "USD",
      startDate: "2026-03-01",
    });
    const second = await upsertBudget(db, {
      categoryId: null,
      period: "monthly",
      limitMinor: 600_000,
      currency: "USD",
      startDate: "2026-03-01",
    });

    expect(second.id).toBe(first.id);
    expect(second.limitMinor).toBe(600_000);
    expect(await listBudgets(db, { currency: "USD", period: "monthly" })).toHaveLength(1);

    await deactivateBudget(db, first.id);
    expect(await listBudgets(db, { currency: "USD", period: "monthly" })).toHaveLength(0);
    expect(
      await listBudgets(db, { currency: "USD", period: "monthly", includeInactive: true }),
    ).toHaveLength(1);
  });

  test("a first budget is saved in the same transaction as the region", async () => {
    const db = await seededDb("USD");

    await applyRegionSelection(
      db,
      { country: "JP", currency: "JPY", locale: "ja-JP" },
      { budget: { limitMinor: 300_000, period: "monthly", startDate: "2026-03-01" } },
    );

    expect(await getSetting(db, SETTING_KEYS.onboarded)).toBe("1");
    expect(await getSetting(db, SETTING_KEYS.currency)).toBe("JPY");
    expect(await getSetting(db, SETTING_KEYS.budgetPeriod)).toBe("monthly");

    const budgets = await listBudgets(db, { currency: "JPY", period: "monthly" });
    expect(budgets).toHaveLength(1);
    expect(budgets[0].categoryId).toBeNull();
    expect(budgets[0].limitMinor).toBe(300_000);
    // Only one account for the new currency, not one per onboarding run.
    const accounts = await listAccounts(db);
    expect(accounts.filter((account) => account.currency === "JPY")).toHaveLength(1);
  });

  test("skipping the budget writes no budget row", async () => {
    const db = await seededDb("USD");
    await applyRegionSelection(db, { country: "US", currency: "USD", locale: "en-US" });
    expect(await listBudgets(db)).toHaveLength(0);
    expect(await getSetting(db, SETTING_KEYS.onboarded)).toBe("1");
  });
});
