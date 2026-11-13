import { DatabaseSync } from "node:sqlite";
import type { SQLiteBindParams } from "expo-sqlite";

import { migrate } from "../migrate";
import { createAccount, listAccounts } from "../repos/accounts";
import { listCategories } from "../repos/categories";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listRecentCategoryIds,
  listRecentItemNames,
  restoreTransaction,
  updateTransaction,
  type NewTransaction,
} from "../repos/transactions";
import { seedIfEmpty } from "../seed";
import type { Account, Category, Db } from "../types";

/**
 * Same five-method adapter as the migration tests: the real schema and real SQL run
 * against Node's built-in SQLite, so account/transfer persistence is verified rather
 * than mocked.
 */
function bindArgs(params?: SQLiteBindParams): (string | number | null)[] {
  if (!params) return [];
  const values = Array.isArray(params) ? params : Object.values(params);
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

type Fixture = {
  db: Db;
  cash: Account;
  bank: Account;
  categories: Category[];
};

async function seededDb(): Promise<Fixture> {
  const db = createTestDb();
  await migrate(db);
  await seedIfEmpty(db, { country: "US", currency: "USD", locale: "en-US" });

  const [cash] = await listAccounts(db);
  const bank = await createAccount(db, { name: "Bank", type: "bank", currency: "USD" });
  const categories = await listCategories(db, { kind: "expense" });
  return { db, cash, bank, categories };
}

function transaction(overrides: Partial<NewTransaction> & Pick<NewTransaction, "accountId">) {
  return {
    type: "expense" as const,
    amountMinor: 1250,
    currency: "USD",
    categoryId: null,
    itemName: null,
    place: null,
    note: null,
    occurredAt: "2026-11-12T12:00:00.000Z",
    localDate: "2026-11-12",
    ...overrides,
  };
}

async function backdate(db: Db, id: string, createdAt: string) {
  await db.runAsync("UPDATE transactions SET created_at = ? WHERE id = ?", [createdAt, id]);
}

describe("transactions repository", () => {
  test("accepts a caller-provided id for an optimistic insert", async () => {
    const { db, cash } = await seededDb();
    const optimisticId = "11111111-1111-4111-8111-111111111111";

    const created = await createTransaction(
      db,
      transaction({ id: optimisticId, accountId: cash.id, itemName: "Coffee" }),
    );

    expect(created.id).toBe(optimisticId);
    expect((await getTransaction(db, optimisticId))?.id).toBe(optimisticId);
  });

  test("editing persists an account change, not just the amount and category", async () => {
    const { db, cash, bank, categories } = await seededDb();
    const created = await createTransaction(
      db,
      transaction({
        accountId: cash.id,
        categoryId: categories[0].id,
        itemName: "Lunch",
        place: "Cafe",
        note: "with Sam",
      }),
    );

    await updateTransaction(db, created.id, {
      amountMinor: 999,
      accountId: bank.id,
      categoryId: categories[1].id,
      itemName: "Dinner",
      place: null,
      note: "changed",
      localDate: "2026-11-01",
    });

    const updated = (await getTransaction(db, created.id))!;
    expect(updated).toMatchObject({
      amountMinor: 999,
      accountId: bank.id,
      categoryId: categories[1].id,
      itemName: "Dinner",
      place: null,
      note: "changed",
      localDate: "2026-11-01",
      type: "expense",
      currency: "USD",
    });
    expect(updated.createdAt).toBe(created.createdAt);
  });

  test("editing a transfer moves both accounts and rejects the same account twice", async () => {
    const { db, cash, bank } = await seededDb();
    const created = await createTransaction(
      db,
      transaction({
        type: "transfer",
        amountMinor: 5000,
        accountId: cash.id,
        transferAccountId: bank.id,
      }),
    );

    await updateTransaction(db, created.id, {
      accountId: bank.id,
      transferAccountId: cash.id,
    });

    const swapped = (await getTransaction(db, created.id))!;
    expect(swapped.accountId).toBe(bank.id);
    expect(swapped.transferAccountId).toBe(cash.id);

    await expect(
      updateTransaction(db, created.id, { transferAccountId: bank.id }),
    ).rejects.toThrow("two different accounts");
    await expect(
      updateTransaction(db, created.id, { transferAccountId: null }),
    ).rejects.toThrow("needs a destination account");

    // Failed validation must not partially write the row.
    const unchanged = (await getTransaction(db, created.id))!;
    expect(unchanged.accountId).toBe(bank.id);
    expect(unchanged.transferAccountId).toBe(cash.id);
  });

  test("refuses to move a row onto an account in another currency", async () => {
    const { db, cash } = await seededDb();
    const euro = await createAccount(db, { name: "Euro", type: "bank", currency: "EUR" });
    const created = await createTransaction(db, transaction({ accountId: cash.id }));

    await expect(
      updateTransaction(db, created.id, { accountId: euro.id }),
    ).rejects.toThrow("currency");
    expect((await getTransaction(db, created.id))?.accountId).toBe(cash.id);
  });

  test("undo restores the exact row it deleted", async () => {
    const { db, cash, categories } = await seededDb();
    const created = await createTransaction(
      db,
      transaction({
        accountId: cash.id,
        categoryId: categories[0].id,
        itemName: "Pharmacy",
        place: "Corner",
        note: "receipt in bag",
      }),
    );
    const snapshot = (await getTransaction(db, created.id))!;

    await deleteTransaction(db, created.id);
    expect(await getTransaction(db, created.id)).toBeNull();

    await restoreTransaction(db, snapshot);
    expect(await getTransaction(db, created.id)).toEqual(snapshot);
  });
});

describe("recent-name chips", () => {
  test("returns five most recently created distinct names in the currency", async () => {
    const { db, cash } = await seededDb();
    const names = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];

    for (const [index, name] of names.entries()) {
      const row = await createTransaction(
        db,
        transaction({ accountId: cash.id, itemName: name, localDate: "2026-11-10" }),
      );
      await backdate(db, row.id, `2026-11-0${index + 1}T10:00:00.000Z`);
    }

    // Outside the 30-day window even though it was inserted last.
    const old = await createTransaction(
      db,
      transaction({ accountId: cash.id, itemName: "Golf", localDate: "2026-09-01" }),
    );
    await backdate(db, old.id, "2026-11-11T10:00:00.000Z");

    const euro = await createAccount(db, { name: "Euro", type: "bank", currency: "EUR" });
    const foreign = await createTransaction(
      db,
      transaction({
        accountId: euro.id,
        currency: "EUR",
        itemName: "Hotel",
        localDate: "2026-11-12",
      }),
    );
    await backdate(db, foreign.id, "2026-11-12T10:00:00.000Z");

    expect(
      await listRecentItemNames(db, { currency: "USD", sinceIso: "2026-10-01" }),
    ).toEqual(["Foxtrot", "Echo", "Delta", "Charlie", "Bravo"]);
  });
});

describe("recent categories", () => {
  test("orders by last use, scopes to kind and currency, and respects the limit", async () => {
    const { db, cash, categories } = await seededDb();
    const euro = await createAccount(db, { name: "Euro", type: "bank", currency: "EUR" });

    const rows = [];
    for (const [index, category] of categories.slice(0, 3).entries()) {
      const row = await createTransaction(
        db,
        transaction({
          accountId: cash.id,
          categoryId: category.id,
          itemName: `Expense ${index}`,
        }),
      );
      await backdate(db, row.id, `2026-11-0${index + 1}T10:00:00.000Z`);
      rows.push(row);
    }

    const foreign = await createTransaction(
      db,
      transaction({
        accountId: euro.id,
        currency: "EUR",
        categoryId: categories[3].id,
        itemName: "Foreign",
      }),
    );
    await backdate(db, foreign.id, "2026-11-10T10:00:00.000Z");

    expect(
      await listRecentCategoryIds(db, { kind: "expense", currency: "USD", limit: 2 }),
    ).toEqual([categories[2].id, categories[1].id]);
    expect(await listRecentCategoryIds(db, { kind: "expense", currency: "USD" })).toEqual([
      categories[2].id,
      categories[1].id,
      categories[0].id,
    ]);

    const [incomeCategory] = await listCategories(db, { kind: "income" });
    const income = await createTransaction(
      db,
      transaction({
        type: "income",
        accountId: cash.id,
        categoryId: incomeCategory.id,
        itemName: "Salary",
      }),
    );
    await backdate(db, income.id, "2026-11-11T10:00:00.000Z");

    expect(await listRecentCategoryIds(db, { kind: "income", currency: "USD" })).toEqual([
      incomeCategory.id,
    ]);
  });
});
