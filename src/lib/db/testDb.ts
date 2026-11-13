import { DatabaseSync } from "node:sqlite";
import type { SQLiteBindParams } from "expo-sqlite";

import { migrate } from "./migrate";
import { seedIfEmpty } from "./seed";
import type { Db } from "./types";

export function bindArgs(params?: SQLiteBindParams): (string | number | null)[] {
  if (!params) return [];
  const values = Array.isArray(params) ? params : Object.values(params);
  return values.map((value) =>
    value === undefined || value === null ? null : (value as string | number),
  );
}

export function createTestDb(): Db {
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
        lastInsertRowid: Number(result.lastInsertRowid),
      };
    }) as unknown as Db["runAsync"],
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

export async function seededDb(currency = "USD"): Promise<Db> {
  const db = createTestDb();
  await migrate(db);
  await seedIfEmpty(db, { country: "US", currency, locale: "en-US" });
  return db;
}
