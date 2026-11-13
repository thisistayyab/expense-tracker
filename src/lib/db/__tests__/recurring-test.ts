import { processDueRecurring, postNextOccurrence } from "../../../features/recurring/processDue";
import { listAccounts } from "../repos/accounts";
import { listCategories } from "../repos/categories";
import {
  createRecurringRule,
  getRecurringRule,
  insertPostedOccurrence,
  listRecurringRules,
  listUpcomingRecurringRules,
  setRecurringActive,
  type RecurringRuleDraft,
} from "../repos/recurring";
import { listTransactions } from "../repos/transactions";
import { seededDb } from "../testDb";
import type { Db } from "../types";

type Seeded = { db: Db; accountId: string; categoryId: string };

async function seed(): Promise<Seeded> {
  const db = await seededDb("USD");
  const [account] = await listAccounts(db);
  const [category] = await listCategories(db, { kind: "expense" });
  return { db, accountId: account.id, categoryId: category.id };
}

function draft(seeded: Seeded, overrides: Partial<RecurringRuleDraft> = {}): RecurringRuleDraft {
  return {
    type: "expense",
    amountMinor: 120_000,
    currency: "USD",
    accountId: seeded.accountId,
    categoryId: seeded.categoryId,
    itemName: "Rent",
    frequency: "monthly",
    intervalCount: 1,
    dayOfMonth: 1,
    startDate: "2026-08-01",
    nextDueAt: "2026-08-01",
    autoPost: true,
    remindDays: 0,
    ...overrides,
  };
}

describe("recurring posting", () => {
  test("a three-month-old rule posts every missed occurrence exactly once", async () => {
    const seeded = await seed();
    const rule = await createRecurringRule(seeded.db, draft(seeded));

    const first = await processDueRecurring(seeded.db, "2026-11-12");
    expect(first).toEqual({ rules: 1, posted: 4 });

    const rows = await listTransactions(seeded.db, { limit: 20 });
    expect(rows.map((row) => row.localDate).sort()).toEqual([
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
    ]);
    expect(rows.every((row) => row.recurringId === rule.id)).toBe(true);
    expect(rows.every((row) => row.amountMinor === 120_000)).toBe(true);

    // Running again on the same day cannot double-post.
    const second = await processDueRecurring(seeded.db, "2026-11-12");
    expect(second).toEqual({ rules: 0, posted: 0 });
    expect(await listTransactions(seeded.db, { limit: 20 })).toHaveLength(4);
  });

  test("the 31st clamps through February and resumes on March 31", async () => {
    const seeded = await seed();
    await createRecurringRule(
      seeded.db,
      draft(seeded, {
        startDate: "2026-01-31",
        nextDueAt: "2026-01-31",
        dayOfMonth: 31,
      }),
    );

    const result = await processDueRecurring(seeded.db, "2026-04-30");
    expect(result.posted).toBe(4);

    const rows = await listTransactions(seeded.db, { limit: 10 });
    expect(rows.map((row) => row.localDate).sort()).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  test("the database rejects a second row for the same rule and date", async () => {
    const seeded = await seed();
    const rule = await createRecurringRule(seeded.db, draft(seeded, { autoPost: false }));

    expect(await insertPostedOccurrence(seeded.db, rule, "2026-08-01")).toBe(1);
    expect(await insertPostedOccurrence(seeded.db, rule, "2026-08-01")).toBe(0);

    await expect(
      seeded.db.runAsync(
        `INSERT INTO transactions
           (id, type, amount_minor, currency, account_id, category_id, occurred_at, local_date,
            recurring_id, created_at, updated_at)
         VALUES ('duplicate', 'expense', 100, 'USD', ?, ?, '2026-08-01T12:00:00.000Z',
                 '2026-08-01', ?, '2026-08-01T12:00:00.000Z', '2026-08-01T12:00:00.000Z')`,
        [seeded.accountId, seeded.categoryId, rule.id],
      ),
    ).rejects.toThrow(/UNIQUE constraint failed/);
  });

  test("manual rules wait for the user and post one occurrence at a time", async () => {
    const seeded = await seed();
    const rule = await createRecurringRule(seeded.db, draft(seeded, { autoPost: false }));

    const auto = await processDueRecurring(seeded.db, "2026-11-12");
    expect(auto.posted).toBe(0);

    const posted = await postNextOccurrence(seeded.db, rule, "2026-11-12");
    expect(posted).toEqual({ posted: true, nextDueAt: "2026-09-01" });

    const after = await getRecurringRule(seeded.db, rule.id);
    expect(after?.nextDueAt).toBe("2026-09-01");
    expect(await listTransactions(seeded.db, { limit: 10 })).toHaveLength(1);

    // The next tap posts the next occurrence, not another copy of the first.
    const refreshed = (await getRecurringRule(seeded.db, rule.id))!;
    await postNextOccurrence(seeded.db, refreshed, "2026-11-12");
    expect(await listTransactions(seeded.db, { limit: 10 })).toHaveLength(2);
  });

  test("turning a rule off stops posting but keeps posted rows", async () => {
    const seeded = await seed();
    const rule = await createRecurringRule(seeded.db, draft(seeded, { nextDueAt: "2026-08-01" }));
    await insertPostedOccurrence(seeded.db, rule, "2026-08-01");
    await setRecurringActive(seeded.db, rule.id, false);

    const result = await processDueRecurring(seeded.db, "2026-11-12");
    expect(result.posted).toBe(0);

    const rows = await listTransactions(seeded.db, { limit: 10 });
    expect(rows).toHaveLength(1);
    expect(rows[0].localDate).toBe("2026-08-01");
  });

  test("an end date retires the rule after its last occurrence", async () => {
    const seeded = await seed();
    const rule = await createRecurringRule(
      seeded.db,
      draft(seeded, {
        frequency: "yearly",
        dayOfMonth: 29,
        startDate: "2024-02-29",
        nextDueAt: "2024-02-29",
        endDate: "2025-12-31",
      }),
    );

    const result = await processDueRecurring(seeded.db, "2026-11-12");
    expect(result.posted).toBe(2);

    const rows = await listTransactions(seeded.db, { limit: 10 });
    expect(rows.map((row) => row.localDate).sort()).toEqual(["2024-02-29", "2025-02-28"]);

    const retired = await getRecurringRule(seeded.db, rule.id);
    expect(retired?.isActive).toBe(false);
  });

  test("a rule cannot point at an account in another currency", async () => {
    const seeded = await seed();
    await expect(
      createRecurringRule(seeded.db, draft(seeded, { currency: "EUR" })),
    ).rejects.toThrow(/account must use the rule's currency/);
  });

  test("recurring transfers are refused rather than silently posting a one-sided move", async () => {
    const seeded = await seed();
    await expect(
      createRecurringRule(seeded.db, draft(seeded, { type: "transfer" })),
    ).rejects.toThrow(/not supported/);
  });

  test("the bills card leaves income rules out of bills due", async () => {
    const seeded = await seed();
    const [incomeCategory] = await listCategories(seeded.db, { kind: "income" });

    await createRecurringRule(
      seeded.db,
      draft(seeded, { itemName: "Rent", nextDueAt: "2026-08-01" }),
    );
    await createRecurringRule(
      seeded.db,
      draft(seeded, {
        type: "income",
        categoryId: incomeCategory.id,
        itemName: "Salary",
        startDate: "2026-08-02",
        nextDueAt: "2026-08-02",
      }),
    );

    const upcoming = await listUpcomingRecurringRules(seeded.db, {
      currency: "USD",
      throughDate: "2026-08-31",
    });
    expect(upcoming.map((rule) => rule.itemName)).toEqual(["Rent"]);
  });

  test("the list keeps active rules first and includes inactive ones on request", async () => {
    const seeded = await seed();
    await createRecurringRule(seeded.db, draft(seeded, { itemName: "Rent" }));
    const gym = await createRecurringRule(
      seeded.db,
      draft(seeded, { itemName: "Gym", startDate: "2026-12-01", nextDueAt: "2026-12-01" }),
    );
    await setRecurringActive(seeded.db, gym.id, false);

    expect(await listRecurringRules(seeded.db)).toHaveLength(1);
    expect(await listRecurringRules(seeded.db, { includeInactive: true })).toHaveLength(2);
  });
});
