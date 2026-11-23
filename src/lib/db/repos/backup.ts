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
import { notifyLedgerChanged, notifyLedgerReset } from "../../ledgerEvents";
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

function isNewerTimestamp(candidate: string, current: string): boolean {
  const nextMs = Date.parse(candidate);
  const currentMs = Date.parse(current);
  if (Number.isFinite(nextMs) && Number.isFinite(currentMs)) {
    return nextMs > currentMs;
  }
  return candidate > current;
}

/** Update non-key columns of an existing row when the incoming backup row is strictly newer. */
async function updateIfNewer(
  db: Db,
  table: BackupTable,
  row: BackupRow,
  keyColumn: string,
  keyValue: string,
  currentUpdatedAt: string,
): Promise<void> {
  if (!isNewerTimestamp(String(row.updated_at), currentUpdatedAt)) return;
  const patchColumns = TABLE_COLUMNS[table].filter((column) => column !== keyColumn);
  await db.runAsync(
    `UPDATE ${table} SET ${patchColumns.map((column) => `${column} = ?`).join(", ")}
      WHERE ${keyColumn} = ?`,
    [...patchColumns.map((column) => row[column] ?? null), keyValue],
  );
}

/** Resolve primary or secondary UNIQUE conflicts cleanly so merge never drops newer rows or breaks FKs. */
async function mergeRow(
  db: Db,
  table: BackupTable,
  row: BackupRow,
  remapTagId: Map<string, string>,
  remapTransactionId: Map<string, string>,
): Promise<void> {
  if (table === "transaction_tags") {
    const resolved: BackupRow = {
      transaction_id:
        remapTransactionId.get(String(row.transaction_id)) ?? row.transaction_id,
      tag_id: remapTagId.get(String(row.tag_id)) ?? row.tag_id,
    };
    await db.runAsync(insertSql(table, true), rowValues(table, resolved));
    return;
  }

  if (table === "attachments") {
    const resolved: BackupRow = {
      ...row,
      transaction_id:
        remapTransactionId.get(String(row.transaction_id)) ?? row.transaction_id,
    };
    const result = await db.runAsync(insertSql(table, true), rowValues(table, resolved));
    if (result.changes === 0 && resolved.id != null) return;
    return;
  }

  if (table === "tags") {
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM tags WHERE id = ? OR name = ?",
      [String(row.id), String(row.name)],
    );
    if (existing) {
      if (existing.id !== String(row.id)) remapTagId.set(String(row.id), existing.id);
      return;
    }
    await db.runAsync(insertSql(table), rowValues(table, row));
    return;
  }

  if (table === "transactions") {
    let existing = await db.getFirstAsync<{ id: string; updated_at: string }>(
      "SELECT id, updated_at FROM transactions WHERE id = ?",
      [String(row.id)],
    );
    if (!existing && row.recurring_id !== null) {
      existing = await db.getFirstAsync<{ id: string; updated_at: string }>(
        "SELECT id, updated_at FROM transactions WHERE recurring_id = ? AND local_date = ?",
        [String(row.recurring_id), String(row.local_date)],
      );
    }
    if (existing) {
      if (existing.id !== String(row.id)) remapTransactionId.set(String(row.id), existing.id);
      await updateIfNewer(db, table, row, "id", existing.id, existing.updated_at);
      return;
    }
    await db.runAsync(insertSql(table), rowValues(table, row));
    return;
  }

  if (table === "budgets") {
    let existing = await db.getFirstAsync<{ id: string; updated_at: string }>(
      "SELECT id, updated_at FROM budgets WHERE id = ?",
      [String(row.id)],
    );
    if (!existing) {
      existing = await db.getFirstAsync<{ id: string; updated_at: string }>(
        `SELECT id, updated_at FROM budgets
          WHERE period = ? AND currency = ? AND month IS ?
            AND ((? IS NULL AND category_id IS NULL) OR category_id = ?)`,
        [
          row.period ?? null,
          row.currency ?? null,
          row.month ?? null,
          row.category_id ?? null,
          row.category_id ?? null,
        ],
      );
    }
    if (existing) {
      await updateIfNewer(db, table, row, "id", existing.id, existing.updated_at);
      return;
    }
    await db.runAsync(insertSql(table), rowValues(table, row));
    return;
  }

  const result = await db.runAsync(insertSql(table, true), rowValues(table, row));
  if (result.changes > 0) return;

  const keyColumn = table === "settings" ? "key" : "id";
  const key = row[keyColumn];
  if (key === undefined || key === null) return;
  if (!TABLE_COLUMNS[table].includes("updated_at")) return;

  const current = await db.getFirstAsync<{ updated_at: string }>(
    `SELECT updated_at FROM ${table} WHERE ${keyColumn} = ?`,
    [String(key)],
  );
  if (!current) return;
  await updateIfNewer(db, table, row, keyColumn, String(key), current.updated_at);
}

/** Verify cross-table invariants that row-by-row timestamp merges can otherwise break. */
async function assertMergedInvariants(db: Db): Promise<void> {
  const badCategory = await db.getFirstAsync<{ id: string }>(
    `SELECT c.id FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
      WHERE c.parent_id IS NOT NULL
        AND (c.parent_id = c.id OR p.id IS NULL OR p.parent_id IS NOT NULL OR p.kind != c.kind)
      LIMIT 1`,
  );
  if (badCategory) {
    throw new Error("Merge would create an invalid or nested category hierarchy");
  }

  const badRule = await db.getFirstAsync<{ id: string }>(
    `SELECT r.id FROM recurring_rules r
       JOIN accounts a ON a.id = r.account_id
      WHERE r.currency != a.currency OR (r.is_active = 1 AND a.is_archived = 1)
      LIMIT 1`,
  );
  if (badRule) {
    throw new Error("Merge would leave a recurring rule incompatible with its account");
  }

  const badRuleFee = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM recurring_rules WHERE type = 'income' AND fee_minor > 0 LIMIT 1",
  );
  if (badRuleFee) {
    throw new Error("Merge would leave an income recurring rule with a fee");
  }

  const badTx = await db.getFirstAsync<{ id: string }>(
    `SELECT t.id FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       LEFT JOIN accounts ta ON ta.id = t.transfer_account_id
      WHERE t.currency != a.currency OR (ta.id IS NOT NULL AND t.currency != ta.currency)
      LIMIT 1`,
  );
  if (badTx) {
    throw new Error("Merge would create a transaction currency mismatch with its account");
  }

  const badTxFee = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM transactions WHERE type = 'income' AND fee_minor > 0 LIMIT 1",
  );
  if (badTxFee) {
    throw new Error("Merge would leave an income transaction with a fee");
  }
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

    const remapTagId = new Map<string, string>();
    const remapTransactionId = new Map<string, string>();

    for (const table of BACKUP_INSERT_ORDER) {
      for (const row of payload.tables[table]) {
        if (mode === "replace") {
          await db.runAsync(insertSql(table), rowValues(table, row));
          continue;
        }
        await mergeRow(db, table, row, remapTagId, remapTransactionId);
      }
    }

    if (mode === "merge") {
      await assertMergedInvariants(db);
    }
  });

  if (mode === "replace") notifyLedgerReset();
  else notifyLedgerChanged();
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

  notifyLedgerReset();
  return seeded;
}
