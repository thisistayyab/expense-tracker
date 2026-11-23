import { BACKUP_FORMAT, BACKUP_FORMAT_VERSION, validateBackup } from "../../domain/backup";
import { LATEST_SCHEMA_VERSION } from "../migrate";
import { accountBalance, createAccount, listAccountBalances, listAccounts } from "../repos/accounts";
import { dumpDatabase, restoreDatabase } from "../repos/backup";
import { monthlyTotals } from "../repos/insights";
import { createRecurringRule, sumCommittedUnposted } from "../repos/recurring";
import {
  createTransaction,
  listTransactions,
  sumFees,
  sumSpent,
  sumSpentByCategory,
  sumSpentByDay,
  sumSpentForComparison,
  updateTransaction,
} from "../repos/transactions";
import { seededDb } from "../testDb";

describe("db audit regressions", () => {
  test("sumCommittedUnposted counts multiple weekly occurrences and unpaid overdue manual bills", async () => {
    const db = await seededDb();
    const [cash] = await listAccounts(db);

    // Auto-posted weekly rule starting Nov 1, next due Nov 8 -> Nov 8, 15, 22 in [Nov 8, Nov 25] = 3 occurrences.
    await createRecurringRule(db, {
      type: "expense",
      amountMinor: 1_000,
      currency: "USD",
      accountId: cash.id,
      itemName: "Weekly pass",
      frequency: "weekly",
      intervalCount: 1,
      startDate: "2026-11-01",
      nextDueAt: "2026-11-08",
      autoPost: true,
    });

    // Manual unpaid rule already overdue (Nov 3, 10) -> both Nov 3 and Nov 10 still unpaid up through Nov 12.
    await createRecurringRule(db, {
      type: "expense",
      amountMinor: 500,
      currency: "USD",
      accountId: cash.id,
      itemName: "Manual milk",
      frequency: "weekly",
      intervalCount: 1,
      startDate: "2026-11-03",
      nextDueAt: "2026-11-03",
      autoPost: false,
    });

    // Finished rule (endDate < nextDueAt) must be ignored.
    await createRecurringRule(db, {
      type: "expense",
      amountMinor: 9_000,
      currency: "USD",
      accountId: cash.id,
      itemName: "Ended",
      frequency: "monthly",
      intervalCount: 1,
      dayOfMonth: 1,
      startDate: "2026-10-01",
      endDate: "2026-10-15",
      nextDueAt: "2026-11-01",
      autoPost: true,
    });

    const result = await sumCommittedUnposted(db, {
      currency: "USD",
      fromDate: "2026-11-08",
      toDate: "2026-11-25",
    });
    // Weekly pass: Nov 8, 15, 22 (3 * 1000 = 3000)
    // Manual milk: Nov 3, 10, 17, 24 (4 * 500 = 2000) -> 7 unposted occurrences total
    expect(result.totalMinor).toBe(5_000);
    expect(result.count).toBe(7);
  });

  test("merge restore remaps colliding tag names and recurring occurrences without constraint errors", async () => {
    const db = await seededDb();
    const [cash] = await listAccounts(db);

    const rule = await createRecurringRule(db, {
      type: "expense",
      amountMinor: 1_500,
      currency: "USD",
      accountId: cash.id,
      itemName: "Internet",
      frequency: "monthly",
      intervalCount: 1,
      dayOfMonth: 5,
      startDate: "2026-11-05",
      nextDueAt: "2026-12-05",
      autoPost: true,
    });

    await db.runAsync(
      "INSERT INTO tags (id, name, color, created_at) VALUES ('local-tag', 'work', NULL, '2026-11-01T00:00:00.000Z')",
    );
    await db.runAsync(
      `INSERT INTO transactions (id, type, amount_minor, currency, account_id, recurring_id, occurred_at, local_date, created_at, updated_at)
       VALUES ('local-rec-tx', 'expense', 1500, 'USD', ?, ?, '2026-11-05T08:00:00.000Z', '2026-11-05', '2026-11-05T08:00:00.000Z', '2026-11-05T08:00:00.000Z')`,
      [cash.id, rule.id],
    );
    await db.runAsync(
      "INSERT INTO transaction_tags (transaction_id, tag_id) VALUES ('local-rec-tx', 'local-tag')",
    );

    const tables = await dumpDatabase(db);
    // Remote backup uses DIFFERENT IDs for the same natural keys (`tags.name = 'work'` and recurring `(recurring_id, local_date)`).
    tables.tags = [
      { id: "remote-tag", name: "work", color: "#112233", created_at: "2026-11-02T00:00:00.000Z" },
    ];
    tables.transactions = [
      {
        id: "remote-rec-tx",
        type: "expense",
        amount_minor: 1500,
        fee_minor: 0,
        currency: "USD",
        account_id: cash.id,
        transfer_account_id: null,
        category_id: null,
        item_name: "Internet updated",
        place: null,
        note: null,
        occurred_at: "2026-11-05T09:00:00.000Z",
        local_date: "2026-11-05",
        recurring_id: rule.id,
        created_at: "2026-11-05T09:00:00.000Z",
        updated_at: "2026-11-06T09:00:00.000Z",
      },
    ];
    tables.transaction_tags = [{ transaction_id: "remote-rec-tx", tag_id: "remote-tag" }];

    const payload = {
      format: BACKUP_FORMAT,
      formatVersion: BACKUP_FORMAT_VERSION,
      schemaVersion: LATEST_SCHEMA_VERSION,
      appVersion: "1.0.0",
      exportedAt: "2026-11-10T00:00:00.000Z",
      tables,
    };
    const checked = validateBackup(payload, LATEST_SCHEMA_VERSION);
    if (!checked.ok) {
      throw new Error(`validateBackup failed: ${checked.errors.join(" | ")}`);
    }
    expect(checked.ok).toBe(true);

    await restoreDatabase(db, checked.payload, "merge");

    expect(await db.getAllAsync("PRAGMA foreign_key_check")).toEqual([]);
    const tagRows = await db.getAllAsync<{ id: string }>("SELECT id FROM tags WHERE name = 'work'");
    expect(tagRows).toHaveLength(1);
    const txRows = await db.getAllAsync<{ id: string }>(
      "SELECT id FROM transactions WHERE recurring_id = ? AND local_date = '2026-11-05'",
      [rule.id],
    );
    expect(txRows).toHaveLength(1);
    const linkRows = await db.getAllAsync<{ transaction_id: string; tag_id: string }>(
      "SELECT transaction_id, tag_id FROM transaction_tags",
    );
    expect(linkRows).toEqual([{ transaction_id: txRows[0].id, tag_id: tagRows[0].id }]);
  });

  test("rejects fractional or negative feeMinor on transactions and recurring rules", async () => {
    const db = await seededDb();
    const [cash] = await listAccounts(db);

    await expect(
      createTransaction(db, {
        type: "expense",
        amountMinor: 1_000,
        feeMinor: 12.5,
        currency: "USD",
        accountId: cash.id,
        occurredAt: "2026-11-12T12:00:00.000Z",
        localDate: "2026-11-12",
      }),
    ).rejects.toThrow(/fee_minor/);

    await expect(
      createTransaction(db, {
        type: "expense",
        amountMinor: 1_000,
        feeMinor: -0.5,
        currency: "USD",
        accountId: cash.id,
        occurredAt: "2026-11-12T12:00:00.000Z",
        localDate: "2026-11-12",
      }),
    ).rejects.toThrow(/fee_minor/);

    const valid = await createTransaction(db, {
      type: "expense",
      amountMinor: 1_000,
      feeMinor: 0,
      currency: "USD",
      accountId: cash.id,
      occurredAt: "2026-11-12T12:00:00.000Z",
      localDate: "2026-11-12",
    });

    await expect(updateTransaction(db, valid.id, { feeMinor: 2.25 })).rejects.toThrow(/fee_minor/);

    await expect(
      createRecurringRule(db, {
        type: "expense",
        amountMinor: 1_000,
        feeMinor: 12.5,
        currency: "USD",
        accountId: cash.id,
        frequency: "monthly",
        intervalCount: 1,
        dayOfMonth: 1,
        startDate: "2026-11-01",
        nextDueAt: "2026-11-01",
      }),
    ).rejects.toThrow(/recurring fee/);
  });

  test("transfer fees debit source account, match balance queries, count only the fee as spend, and match total search", async () => {
    const db = await seededDb();
    const [cash] = await listAccounts(db);
    const bank = await createAccount(db, {
      name: "Bank",
      type: "bank",
      currency: "USD",
      openingBalanceMinor: 0,
    });

    await createTransaction(db, {
      type: "transfer",
      amountMinor: 1_000,
      feeMinor: 150,
      currency: "USD",
      accountId: cash.id,
      transferAccountId: bank.id,
      itemName: "ATM transfer",
      occurredAt: "2026-11-12T12:00:00.000Z",
      localDate: "2026-11-12",
    });

    expect(await accountBalance(db, cash.id)).toBe(-1_150);
    expect(await accountBalance(db, bank.id)).toBe(1_000);
    const listed = await listAccountBalances(db);
    expect(listed.find((a) => a.id === cash.id)?.balanceMinor).toBe(-1_150);
    expect(listed.find((a) => a.id === bank.id)?.balanceMinor).toBe(1_000);

    const range = { currency: "USD", fromDate: "2026-11-01", toDate: "2026-11-30" };
    expect(await sumSpent(db, range)).toBe(150);
    expect(await sumSpentByCategory(db, range)).toEqual([{ categoryId: null, spentMinor: 150 }]);
    expect(await sumSpentByDay(db, range)).toEqual([{ localDate: "2026-11-12", spentMinor: 150 }]);
    expect(
      await sumSpentForComparison(db, {
        currency: "USD",
        currentFrom: "2026-11-01",
        previousFrom: "2026-10-01",
        previousTo: "2026-10-30",
        toDate: "2026-11-30",
      }),
    ).toEqual({ currentMinor: 150, previousMinor: 0 });
    expect(await monthlyTotals(db, range)).toEqual([
      { month: "2026-11", expenseMinor: 150, incomeMinor: 0 },
    ]);
    expect(await sumFees(db, range)).toEqual({ totalMinor: 150, count: 1 });

    expect(await listTransactions(db, { text: "10.00" })).toHaveLength(1);
    expect(await listTransactions(db, { text: "11.50" })).toHaveLength(1);
  });
});
