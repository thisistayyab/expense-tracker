import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  validateBackup,
  type BackupPayload,
} from "../../domain/backup";
import { LATEST_SCHEMA_VERSION } from "../migrate";
import { listAccounts } from "../repos/accounts";
import { dumpDatabase, resetAllData, restoreDatabase } from "../repos/backup";
import { listCategories } from "../repos/categories";
import { createRecurringRule } from "../repos/recurring";
import { getAllSettings, SETTING_KEYS } from "../repos/settings";
import {
  countTransactions,
  createTransaction,
  listTransactions,
  sumSpent,
} from "../repos/transactions";
import { seededDb } from "../testDb";
import type { Db } from "../types";

async function backupOf(db: Db): Promise<BackupPayload> {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: LATEST_SCHEMA_VERSION,
    appVersion: "1.0.0",
    exportedAt: "2026-11-13T09:00:00.000Z",
    tables: await dumpDatabase(db),
  };
}

async function seedMovements(db: Db): Promise<void> {
  const [account] = await listAccounts(db);
  const [category] = await listCategories(db, { kind: "expense" });

  await createTransaction(db, {
    type: "expense",
    amountMinor: 1250,
    currency: "USD",
    accountId: account.id,
    categoryId: category.id,
    itemName: "Chicken shawarma",
    occurredAt: "2026-11-12T12:00:00.000Z",
    localDate: "2026-11-12",
  });
  await createTransaction(db, {
    type: "income",
    amountMinor: 5000,
    currency: "USD",
    accountId: account.id,
    categoryId: null,
    itemName: "Refund",
    occurredAt: "2026-11-10T12:00:00.000Z",
    localDate: "2026-11-10",
  });
  await createRecurringRule(db, {
    type: "expense",
    amountMinor: 120_000,
    currency: "USD",
    accountId: account.id,
    categoryId: category.id,
    itemName: "Rent",
    frequency: "monthly",
    intervalCount: 1,
    dayOfMonth: 1,
    startDate: "2026-08-01",
    nextDueAt: "2026-12-01",
    autoPost: true,
  });
}

describe("JSON backup", () => {
  test("a real database validates and round-trips through replace", async () => {
    const source = await seededDb();
    await seedMovements(source);
    const payload = await backupOf(source);

    const validation = validateBackup(payload, LATEST_SCHEMA_VERSION);
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    expect(validation.counts.transactions).toBe(2);
    expect(validation.counts.recurring_rules).toBe(1);

    const target = await seededDb();
    await createTransaction(target, {
      type: "expense",
      amountMinor: 99,
      currency: "USD",
      accountId: (await listAccounts(target))[0].id,
      itemName: "Local only",
      occurredAt: "2026-11-01T12:00:00.000Z",
      localDate: "2026-11-01",
    });

    const counts = await restoreDatabase(target, validation.payload, "replace");
    expect(counts).toEqual(validation.counts);
    expect(await countTransactions(target)).toBe(2);

    // The P6 gate: every table, column and value must come back exactly, not just
    // the headline transaction rows.
    expect((await backupOf(target)).tables).toEqual(payload.tables);

    const restored = await listTransactions(target, { limit: 10 });
    expect(restored.map((row) => row.itemName).sort()).toEqual(["Chicken shawarma", "Refund"]);
    expect(
      await sumSpent(target, { currency: "USD", fromDate: "2026-11-01", toDate: "2026-11-30" }),
    ).toBe(1250);
  });

  test("merge keeps local rows and adds the backup's missing rows", async () => {
    const source = await seededDb();
    await seedMovements(source);
    const payload = await backupOf(source);

    const target = await seededDb();
    await createTransaction(target, {
      type: "expense",
      amountMinor: 99,
      currency: "USD",
      accountId: (await listAccounts(target))[0].id,
      itemName: "Local only",
      occurredAt: "2026-11-01T12:00:00.000Z",
      localDate: "2026-11-01",
    });

    await restoreDatabase(target, payload, "merge");
    const rows = await listTransactions(target, { limit: 10 });
    expect(rows).toHaveLength(3);
    expect(rows.some((row) => row.itemName === "Local only")).toBe(true);
  });

  test("merge lets a strictly newer backup row win, but not an older one", async () => {
    const db = await seededDb();
    const payload = await backupOf(db);
    const category = payload.tables.categories[0];

    category.name = "Renamed by backup";
    category.updated_at = "2027-01-01T00:00:00.000Z";
    await restoreDatabase(db, payload, "merge");

    const renamed = (await listCategories(db, { includeArchived: true })).find(
      (row) => row.id === String(category.id),
    );
    expect(renamed?.name).toBe("Renamed by backup");

    const older = await backupOf(db);
    const olderCategory = older.tables.categories.find((row) => row.id === category.id)!;
    olderCategory.name = "Stale name";
    olderCategory.updated_at = "2020-01-01T00:00:00.000Z";
    await restoreDatabase(db, older, "merge");

    const kept = (await listCategories(db, { includeArchived: true })).find(
      (row) => row.id === category.id,
    );
    expect(kept?.name).toBe("Renamed by backup");
  });
});

describe("backup validation", () => {
  test("refuses a backup from a newer schema version", async () => {
    const db = await seededDb();
    const payload = await backupOf(db);
    payload.schemaVersion = LATEST_SCHEMA_VERSION + 1;

    const result = validateBackup(payload, LATEST_SCHEMA_VERSION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/newer app/);
  });

  test("refuses a transaction pointing at a missing account", async () => {
    const db = await seededDb();
    await seedMovements(db);
    const payload = await backupOf(db);
    payload.tables.transactions[0].account_id = "missing";

    const result = validateBackup(payload, LATEST_SCHEMA_VERSION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/missing account/);
  });

  test("refuses duplicate recurring occurrences and unknown columns", async () => {
    const db = await seededDb();
    const [account] = await listAccounts(db);
    const rule = await createRecurringRule(db, {
      type: "expense",
      amountMinor: 500,
      currency: "USD",
      accountId: account.id,
      itemName: "Gym",
      frequency: "monthly",
      intervalCount: 1,
      dayOfMonth: 1,
      startDate: "2026-11-01",
      nextDueAt: "2026-12-01",
      autoPost: true,
    });
    const payload = await backupOf(db);
    const base = {
      type: "expense",
      amount_minor: 500,
      currency: "USD",
      account_id: account.id,
      transfer_account_id: null,
      category_id: null,
      item_name: "Gym",
      place: null,
      note: null,
      occurred_at: "2026-11-01T12:00:00.000Z",
      local_date: "2026-11-01",
      recurring_id: rule.id,
      created_at: "2026-11-01T12:00:00.000Z",
      updated_at: "2026-11-01T12:00:00.000Z",
    };
    payload.tables.transactions.push(
      { id: "a", ...base },
      { id: "b", ...base },
    );
    payload.tables.transactions[0].mystery = 1;

    const result = validateBackup(payload, LATEST_SCHEMA_VERSION);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const errors = result.errors.join(" ");
      expect(errors).toMatch(/same recurring occurrence/);
      expect(errors).toMatch(/unknown column mystery/);
    }
  });

  test("refuses a transaction whose currency disagrees with its account", async () => {
    const db = await seededDb();
    await seedMovements(db);
    const payload = await backupOf(db);
    payload.tables.transactions[0].currency = "EUR";

    const result = validateBackup(payload, LATEST_SCHEMA_VERSION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/its account is USD/);
  });

  test("refuses an active recurring rule whose account is archived", async () => {
    const db = await seededDb();
    await seedMovements(db);
    const payload = await backupOf(db);
    const rule = payload.tables.recurring_rules[0];
    const account = payload.tables.accounts.find((row) => row.id === rule.account_id)!;
    account.is_archived = 1;

    const result = validateBackup(payload, LATEST_SCHEMA_VERSION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/archived account/);
  });
});

describe("reset all data", () => {
  test("drops data, keeps settings and reseeds the starter library", async () => {
    const db = await seededDb();
    await seedMovements(db);
    await db.runAsync(
      "INSERT INTO tags (id, name, color, created_at) VALUES ('t1', 'work', NULL, '2026-11-01T00:00:00.000Z')",
    );

    const result = await resetAllData(db);

    expect(result.categories).toBe(15);
    expect(result.account).toBe(true);
    expect(await countTransactions(db)).toBe(0);
    expect(await listCategories(db, { includeArchived: true })).toHaveLength(15);
    expect(await listAccounts(db, { includeArchived: true })).toHaveLength(1);
    expect(await db.getAllAsync("SELECT * FROM tags")).toHaveLength(0);

    const settings = await getAllSettings(db);
    expect(settings[SETTING_KEYS.currency]).toBe("USD");
    expect(settings[SETTING_KEYS.country]).toBe("US");

    // The old default account is gone; the remembered id must point at the new Cash.
    const [account] = await listAccounts(db, { includeArchived: true });
    expect(settings[SETTING_KEYS.lastAccountId]).toBe(account.id);
  });

  test("refuses a remembered account that is not in the backup", async () => {
    const db = await seededDb();
    const payload = await backupOf(db);
    const setting = payload.tables.settings.find(
      (row) => row.key === SETTING_KEYS.lastAccountId,
    )!;
    setting.value = "missing-account";

    const result = validateBackup(payload, LATEST_SCHEMA_VERSION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/remembered account/);
  });
});
