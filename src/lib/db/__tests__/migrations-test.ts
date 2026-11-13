import { DatabaseSync } from "node:sqlite";
import type { SQLiteBindParams } from "expo-sqlite";

import { insertFixtureTransactions } from "../fixtures";
import { LATEST_SCHEMA_VERSION, migrate } from "../migrate";
import { applyRegionSelection } from "../onboarding";
import { accountBalance, listAccounts } from "../repos/accounts";
import { listBudgets, upsertBudget } from "../repos/budgets";
import { createCategory, listCategories } from "../repos/categories";
import { getAllSettings, getSetting, setSettings, SETTING_KEYS } from "../repos/settings";
import {
  countTransactions,
  createTransaction,
  listTransactions,
  sumSpent,
} from "../repos/transactions";
import { seedIfEmpty } from "../seed";
import type { Db } from "../types";

/**
 * Jest cannot execute the real `expo-sqlite` native module, but the repositories
 * only use five async methods. This adapter runs the *actual* migration SQL and the
 * *actual* queries against Node's built-in SQLite, so FK enforcement, CHECK
 * constraints and the currency filter are tested for real.
 */
function bindArgs(params?: SQLiteBindParams): (string | number | null)[] {
  if (!params) return [];
  const values = Array.isArray(params) ? params : Object.values(params);
  // Keep nulls: dropping them shifts every following placeholder by one, which is
  // exactly how a real adapter would corrupt a row.
  return values.map((value) =>
    value === undefined || value === null ? null : (value as string | number),
  );
}

function createTestDb(): Db {
  const native = new DatabaseSync(":memory:");
  native.exec("PRAGMA foreign_keys = ON;");

  return {
    execAsync: async (sql) => {
      native.exec(sql);
    },
    runAsync: (async (sql: string, params?: SQLiteBindParams) => {
      const result = native.prepare(sql).run(...bindArgs(params));
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    }) as Db["runAsync"],
    getAllAsync: (async (sql: string, params?: SQLiteBindParams) =>
      native.prepare(sql).all(...bindArgs(params))) as Db["getAllAsync"],
    getFirstAsync: (async (sql: string, params?: SQLiteBindParams) =>
      native.prepare(sql).get(...bindArgs(params)) ?? null) as Db["getFirstAsync"],
    withTransactionAsync: async (task) => {
      native.exec("BEGIN");
      try {
        await task();
        native.exec("COMMIT");
      } catch (error) {
        native.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

const REGION = { country: "US", currency: "USD", locale: "en-US" };

async function seededDb(): Promise<{ db: Db; accountId: string; categoryId: string }> {
  const db = createTestDb();
  await migrate(db);
  await seedIfEmpty(db, REGION);
  const [account] = await listAccounts(db);
  const [category] = await listCategories(db, { kind: "expense" });
  return { db, accountId: account.id, categoryId: category.id };
}

function expense(amountMinor: number, currency: string, accountId: string, categoryId: string) {
  return {
    type: "expense" as const,
    amountMinor,
    currency,
    accountId,
    categoryId,
    itemName: "Chicken shawarma",
    place: "Blue Bottle",
    occurredAt: "2026-11-12T12:00:00.000Z",
    localDate: "2026-11-12",
  };
}

describe("migrations", () => {
  test("creates the full schema and records user_version", async () => {
    const db = createTestDb();
    const result = await migrate(db);

    expect(result.to).toBe(LATEST_SCHEMA_VERSION);
    expect(result.applied).toEqual([1, 2, 3]);

    const tables = await db.getAllAsync<{ name: string }>(
      `SELECT name FROM sqlite_master
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name`,
    );
    expect(tables.map((table) => table.name)).toEqual([
      "accounts",
      "attachments",
      "budgets",
      "categories",
      "category_rules",
      "recurring_rules",
      "settings",
      "tags",
      "transaction_tags",
      "transactions",
    ]);

    // Migration 002 exists for the P5 report queries; losing it is a silent
    // regression in aggregate speed, so assert it is really there.
    const insightIndex = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_tx_insight'",
    );
    expect(insightIndex).toHaveLength(1);

    // Migration 003 proves recurring posting can never double-post an occurrence.
    const recurringIndex = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_tx_recurring_date'",
    );
    expect(recurringIndex).toHaveLength(1);
  });

  test("running migrations again is a no-op", async () => {
    const db = createTestDb();
    await migrate(db);
    const second = await migrate(db);

    expect(second.applied).toEqual([]);
    expect(second.to).toBe(LATEST_SCHEMA_VERSION);

    const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
    expect(version?.user_version).toBe(LATEST_SCHEMA_VERSION);
  });
});

describe("first-run seeding", () => {
  test("writes categories, a Cash account and the documented settings", async () => {
    const { db } = await seededDb();

    expect(await listCategories(db)).toHaveLength(15);
    const accounts = await listAccounts(db);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ name: "Cash", currency: "USD", type: "cash" });

    const settings = await getAllSettings(db);
    expect(settings[SETTING_KEYS.onboarded]).toBe("0");
    expect(settings[SETTING_KEYS.currency]).toBe("USD");
    expect(settings[SETTING_KEYS.country]).toBe("US");
    expect(settings[SETTING_KEYS.theme]).toBe("system");
    expect(settings[SETTING_KEYS.lastAccountId]).toBe(accounts[0].id);
  });

  test("a second launch does not duplicate seeds", async () => {
    const { db } = await seededDb();
    await seedIfEmpty(db, REGION);
    await seedIfEmpty(db, REGION);

    expect(await listCategories(db)).toHaveLength(15);
    expect(await listAccounts(db)).toHaveLength(1);
  });
});

describe("transactions", () => {
  test("totals only ever include the active currency", async () => {
    const { db, accountId, categoryId } = await seededDb();

    await createTransaction(db, expense(1250, "USD", accountId, categoryId));
    await createTransaction(db, expense(250, "USD", accountId, categoryId));
    await createTransaction(db, expense(999, "EUR", accountId, categoryId));

    expect(
      await sumSpent(db, { currency: "USD", fromDate: "2026-11-01", toDate: "2026-11-30" }),
    ).toBe(1500);
    expect(
      await sumSpent(db, { currency: "EUR", fromDate: "2026-11-01", toDate: "2026-11-30" }),
    ).toBe(999);
    expect(await listTransactions(db, { currency: "USD" })).toHaveLength(2);
  });

  test("a transfer needs a destination account", async () => {
    const { db, accountId } = await seededDb();
    await expect(
      db.runAsync(
        `INSERT INTO transactions (id, type, amount_minor, currency, account_id, occurred_at,
                                   local_date, created_at, updated_at)
         VALUES ('t1', 'transfer', 100, 'USD', ?, '2026-11-12T12:00:00.000Z',
                 '2026-11-12', '2026-11-12T12:00:00.000Z', '2026-11-12T12:00:00.000Z')`,
        [accountId],
      ),
    ).rejects.toThrow(/CHECK constraint failed/);
  });

  test("rows cannot reference an account that does not exist", async () => {
    const { db, categoryId } = await seededDb();
    await expect(
      createTransaction(db, expense(500, "USD", "missing-account", categoryId)),
    ).rejects.toThrow(/FOREIGN KEY constraint failed/);
  });

  test("account balance follows opening + income − expenses ± transfers", async () => {
    const { db, accountId, categoryId } = await seededDb();

    await createTransaction(db, {
      ...expense(1250, "USD", accountId, categoryId),
    });
    await createTransaction(db, {
      type: "income",
      amountMinor: 5000,
      currency: "USD",
      accountId,
      categoryId,
      itemName: "Salary",
      occurredAt: "2026-11-01T09:00:00.000Z",
      localDate: "2026-11-01",
    });

    expect(await accountBalance(db, accountId)).toBe(3750);
  });
});

describe("fixtures", () => {
  test("the seeder writes the requested rows inside the date range", async () => {
    const { db, accountId } = await seededDb();

    const result = await insertFixtureTransactions(db, {
      accountId,
      currency: "USD",
      months: 3,
      count: 60,
      endDate: "2026-11-12",
      seed: 7,
    });

    expect(result.inserted).toBe(60);
    expect(await countTransactions(db)).toBe(60);

    const range = await db.getFirstAsync<{ first: string; last: string }>(
      "SELECT MIN(local_date) AS first, MAX(local_date) AS last FROM transactions",
    );
    expect(range?.first).toBe("2026-08-01");
    expect(range?.last! <= "2026-11-12").toBe(true);
  });

  test("is deterministic for a given seed", async () => {
    const { db, accountId } = await seededDb();
    const options = { accountId, currency: "USD", months: 2, count: 10, endDate: "2026-11-12", seed: 99 };
    await insertFixtureTransactions(db, options);
    // rowid = insertion order; ids are random UUIDs and would reshuffle the rows.
    const first = await db.getAllAsync<{ amount_minor: number }>(
      "SELECT amount_minor FROM transactions ORDER BY rowid",
    );
    await db.runAsync("DELETE FROM transactions");
    await insertFixtureTransactions(db, options);
    const second = await db.getAllAsync<{ amount_minor: number }>(
      "SELECT amount_minor FROM transactions ORDER BY rowid",
    );

    expect(second.map((row) => row.amount_minor)).toEqual(first.map((row) => row.amount_minor));
  });
});

describe("budgets", () => {
  test("there is exactly one overall budget per period and currency", async () => {
    const { db } = await seededDb();

    await upsertBudget(db, {
      categoryId: null,
      period: "monthly",
      limitMinor: 100_000,
      currency: "USD",
      startDate: "2026-11-01",
    });
    await upsertBudget(db, {
      categoryId: null,
      period: "monthly",
      limitMinor: 120_000,
      currency: "USD",
      startDate: "2026-11-01",
    });

    const budgets = await listBudgets(db, { currency: "USD", period: "monthly" });
    expect(budgets).toHaveLength(1);
    expect(budgets[0].limitMinor).toBe(120_000);
  });

  test("a currency-scoped budget never hides behind the same category in another currency", async () => {
    const { db, categoryId } = await seededDb();

    await upsertBudget(db, {
      categoryId,
      period: "monthly",
      limitMinor: 40_000,
      currency: "USD",
      startDate: "2026-11-01",
    });
    await upsertBudget(db, {
      categoryId,
      period: "monthly",
      limitMinor: 35_000,
      currency: "EUR",
      startDate: "2026-11-01",
    });

    expect(await listBudgets(db, { currency: "USD" })).toHaveLength(1);
    expect(await listBudgets(db, { currency: "EUR" })).toHaveLength(1);
  });
});

describe("settings", () => {
  test("setSettings upserts without duplicating keys", async () => {
    const { db } = await seededDb();

    await setSettings(db, { [SETTING_KEYS.currency]: "EUR" });
    await setSettings(db, { [SETTING_KEYS.currency]: "KWD" });

    const rows = await db.getAllAsync<{ key: string }>(
      "SELECT key FROM settings WHERE key = ?",
      [SETTING_KEYS.currency],
    );
    expect(rows).toHaveLength(1);
    expect(await getSetting(db, SETTING_KEYS.currency)).toBe("KWD");
  });

  test("categories can be created without touching the starter set", async () => {
    const { db } = await seededDb();
    const created = await createCategory(db, { name: "Coffee", kind: "expense" });

    expect(created.name).toBe("Coffee");
    expect(await listCategories(db, { kind: "expense" })).toHaveLength(13);
  });
});

describe("onboarding region step", () => {
  test("writes the region, creates one matching account and is idempotent", async () => {
    const { db } = await seededDb();

    await applyRegionSelection(db, { country: "JP", currency: "JPY", locale: "ja-JP" });
    await applyRegionSelection(db, { country: "JP", currency: "JPY", locale: "ja-JP" });

    expect(await getSetting(db, SETTING_KEYS.onboarded)).toBe("1");
    expect(await getSetting(db, SETTING_KEYS.currency)).toBe("JPY");
    expect(await getSetting(db, SETTING_KEYS.country)).toBe("JP");

    const accounts = await listAccounts(db);
    const yenAccounts = accounts.filter((account) => account.currency === "JPY");
    expect(yenAccounts).toHaveLength(1);
    expect(await getSetting(db, SETTING_KEYS.lastAccountId)).toBe(yenAccounts[0].id);

    // The seed's device-currency account is kept, not deleted or relabelled.
    expect(accounts.filter((account) => account.currency === "USD")).toHaveLength(1);
  });
});
