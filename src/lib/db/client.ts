import * as SQLite from "expo-sqlite";

import { detectRegionDefaults } from "../region";
import { migrate } from "./migrate";
import { seedIfEmpty } from "./seed";

/**
 * One connection, opened once. `initDatabase` is what the SQLiteProvider calls on
 * boot: pragmas → migrations → first-run seed. Screens never see this file.
 */
export const DATABASE_NAME = "expense-tracker.db";

async function applyPragmas(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA foreign_keys = ON;");
}

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await applyPragmas(db);

  const migration = await migrate(db);
  const seeded = await seedIfEmpty(db, detectRegionDefaults());

  if (__DEV__) {
    console.info(
      `[db] ${DATABASE_NAME} at user_version=${migration.to}` +
        ` (applied ${migration.applied.length ? migration.applied.join(",") : "none"}),` +
        ` seeded ${seeded.categories} categories${seeded.account ? " + Cash account" : ""}`,
    );
  }
}

let connection: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Single connection for code outside React (repositories, export/import).
 * Screens read through `useSQLiteContext()` so the provider lifecycle is honoured.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  connection ??= SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
    await applyPragmas(db);
    return db;
  });
  return connection;
}
