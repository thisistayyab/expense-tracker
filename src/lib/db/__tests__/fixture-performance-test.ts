import { listAccounts } from "../repos/accounts";
import { listTransactions } from "../repos/transactions";
import { insertFixtureTransactions } from "../fixtures";
import { groupTransactionsByDay } from "../../domain/transaction-groups";
import { seededDb } from "../testDb";

describe("5,000-row P3 fixture", () => {
  test("inserts, queries and groups the P3 target without orphaning rows", async () => {
    const db = await seededDb();
    const [cash] = await listAccounts(db);
    const result = await insertFixtureTransactions(db, {
      accountId: cash.id,
      currency: "USD",
      months: 12,
      count: 5_000,
      endDate: "2026-11-12",
      seed: 20261113,
    });

    expect(result.inserted).toBe(5_000);
    const rows = await listTransactions(db, { limit: 5_000 });
    expect(rows).toHaveLength(5_000);
    expect(rows[0].localDate >= rows[rows.length - 1].localDate).toBe(true);
    expect(groupTransactionsByDay(rows).length).toBeGreaterThan(300);
    expect(await db.getAllAsync("PRAGMA foreign_key_check")).toEqual([]);
  });
});
