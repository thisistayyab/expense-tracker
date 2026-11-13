import {
  BACKUP_INSERT_ORDER,
  BACKUP_TABLES,
  TABLE_COLUMNS,
  type BackupCounts,
  type BackupPayload,
  type BackupRow,
  type BackupTable,
  type BackupTables,
} from "../../domain/backup";
import { getAllSettings, SETTING_KEYS } from "./settings";
import { seedStarterData, type SeedInput, type SeedResult } from "../seed";
import type { Db } from "../types";

export type RestoreMode = "replace" | "merge";

function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}

async function tableCount(db: Db, table: BackupTable): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`);
  return row?.count ?? 0;
}

async function readCounts(db: Db): Promise<BackupCounts> {
  const entries = await Promise.all(
    BACKUP_TABLES.map(async (table) => [table, await tableCount(db, table)] as const),
  );
  return Object.fromEntries(entries) as BackupCounts;
}

/** Every table, every column, in insertion order. */
export async function dumpDatabase(db: Db): Promise<BackupTables> {
  const tables = {} as BackupTables;
  for (const table of BACKUP_TABLES) {
    tables[table] = await db.getAllAsync<BackupRow>(
      `SELECT ${TABLE_COLUMNS[table].join(", ")} FROM ${table} ORDER BY rowid`,
    );
  }
  return tables;
}

function insertSql(table: BackupTable, orIgnore = false): string {
  return `INSERT ${orIgnore ? "OR IGNORE " : ""}INTO ${table} (${TABLE_COLUMNS[table].join(
    ", ",
  )}) VALUES (${placeholders(TABLE_COLUMNS[table].length)})`;
}

function rowValues(table: BackupTable, row: BackupRow): (string | number | null)[] {
  return TABLE_COLUMNS[table].map((column) => row[column] ?? null);
}

/** Merge: the backup wins only when its row is genuinely newer. */
async function mergeExistingRow(db: Db, table: BackupTable, row: BackupRow): Promise<void> {
  // Link rows have no timestamp and no id: an existing link is already correct.
  if (table === "transaction_tags") return;

  const keyColumn = table === "settings" ? "key" : "id";
  const key = row[keyColumn];
  if (key === undefined || key === null) return;

  const columns = TABLE_COLUMNS[table];
  if (!columns.includes("updated_at")) return;

  const current = await db.getFirstAsync<{ updated_at: string }>(
    `SELECT updated_at FROM ${table} WHERE ${keyColumn} = ?`,
    [String(key)],
  );
  if (!current) return;
  if (String(row.updated_at) <= current.updated_at) return;

  const patchColumns = columns.filter((column) => column !== keyColumn);
  await db.runAsync(
    `UPDATE ${table} SET ${patchColumns.map((column) => `${column} = ?`).join(", ")}
      WHERE ${keyColumn} = ?`,
    [...patchColumns.map((column) => row[column] ?? null), String(key)],
  );
}

/**
 * Replace or merge a payload that has already passed `validateBackup`.
 *
 * Foreign keys are deferred to commit so the insert order cannot reject a valid
 * backup (a category can reference a parent that appears later in the file). A
 * failed write rolls the whole thing back, leaving the current data untouched.
 */
export async function restoreDatabase(
  db: Db,
  payload: BackupPayload,
  mode: RestoreMode,
): Promise<BackupCounts> {
  await db.withTransactionAsync(async () => {
    await db.execAsync("PRAGMA defer_foreign_keys = ON");

    if (mode === "replace") {
      for (const table of [...BACKUP_INSERT_ORDER].reverse()) {
        await db.runAsync(`DELETE FROM ${table}`);
      }
    }

    for (const table of BACKUP_INSERT_ORDER) {
      for (const row of payload.tables[table]) {
        if (mode === "replace") {
          await db.runAsync(insertSql(table), rowValues(table, row));
          continue;
        }

        const result = await db.runAsync(insertSql(table, true), rowValues(table, row));
        if (result.changes === 0) await mergeExistingRow(db, table, row);
      }
    }
  });

  return readCounts(db);
}

/**
 * Delete all user data but keep settings, then reseed the starter library in the
 * same transaction (09 flow 8). The active currency, theme and onboarding state
 * survive, so the app lands on a clean populated Home rather than onboarding.
 */
export async function resetAllData(db: Db): Promise<SeedResult> {
  const settings = await getAllSettings(db);
  const input: SeedInput = {
    country: settings[SETTING_KEYS.country] ?? "US",
    currency: settings[SETTING_KEYS.currency] ?? "USD",
    locale: settings[SETTING_KEYS.locale] ?? "en-US",
  };

  let seeded: SeedResult = { categories: 0, account: false };
  await db.withTransactionAsync(async () => {
    await db.execAsync("PRAGMA defer_foreign_keys = ON");
    for (const table of [...BACKUP_INSERT_ORDER].reverse()) {
      if (table === "settings") continue;
      await db.runAsync(`DELETE FROM ${table}`);
    }
    seeded = await seedStarterData(db, input);
  });

  return seeded;
}
