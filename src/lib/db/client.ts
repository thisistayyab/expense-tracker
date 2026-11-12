import * as SQLite from "expo-sqlite";

/**
 * P0 owns the connection and its pragmas; P1 owns the schema, the migration
 * runner and the repositories. Keeping this file schema-free means the app can
 * boot (and the splash can be proven to wait for a real database) before any
 * table exists.
 */
export const DATABASE_NAME = "expense-tracker.db";

async function applyPragmas(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA foreign_keys = ON;");
}

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await applyPragmas(db);
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const version = row?.user_version ?? 0;
  if (__DEV__) {
    console.info(`[db] ${DATABASE_NAME} ready at user_version=${version}`);
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
