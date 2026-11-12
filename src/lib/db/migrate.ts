import { migration001 } from "./migrations/001-initial";
import type { Db } from "./types";

export type Migration = {
  version: number;
  up(db: Db): Promise<void>;
};

/** Append-only, ordered. Adding a migration means appending here too. */
export const migrations: readonly Migration[] = [migration001];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1].version;

export type MigrationResult = {
  from: number;
  to: number;
  applied: number[];
};

async function currentVersion(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  return row?.user_version ?? 0;
}

/**
 * Apply every pending migration in order, each inside its own transaction, and
 * bump `user_version` at the end of it. Running this twice is a no-op, which the
 * tests and the dev screen both exercise.
 */
export async function migrate(db: Db): Promise<MigrationResult> {
  const from = await currentVersion(db);
  const applied: number[] = [];

  for (const migration of migrations) {
    if (migration.version <= from) continue;

    await db.withTransactionAsync(async () => {
      await migration.up(db);
      // PRAGMA does not accept bound parameters; the value is a literal integer.
      await db.execAsync(`PRAGMA user_version = ${Math.trunc(migration.version)}`);
    });

    applied.push(migration.version);
  }

  return { from, to: applied.length ? applied[applied.length - 1] : from, applied };
}
