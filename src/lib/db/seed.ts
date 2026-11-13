import { starterCategories } from "../../constants/categories";
import { isCurrencyCode } from "../../constants/currencies";
import { newId } from "../ids";
import { SETTING_KEYS } from "./repos/settings";
import type { Db } from "./types";

export type SeedInput = {
  country: string;
  currency: string;
  locale: string;
  now?: string;
};

export type SeedResult = {
  categories: number;
  account: boolean;
};

async function count(db: Db, table: "categories" | "accounts"): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`);
  return row?.count ?? 0;
}

/**
 * The writes behind first-run seeding, with no transaction of their own. Callers
 * that already hold one (reset-all) use this directly; `seedIfEmpty` wraps it.
 */
export async function seedStarterData(db: Db, input: SeedInput): Promise<SeedResult> {
  const currency = isCurrencyCode(input.currency) ? input.currency.toUpperCase() : "USD";
  const now = input.now ?? new Date().toISOString();
  let seededCategories = 0;
  let seededAccount = false;

  if ((await count(db, "categories")) === 0) {
    for (const [index, category] of starterCategories.entries()) {
      await db.runAsync(
        `INSERT INTO categories (id, parent_id, name, kind, icon, color, is_archived, sort_order, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [newId(), category.name, category.kind, category.icon, category.color, index, now, now],
      );
      seededCategories += 1;
    }
  }

  let accountId: string | null = null;
  if ((await count(db, "accounts")) === 0) {
    accountId = newId();
    await db.runAsync(
      `INSERT INTO accounts (id, name, type, currency, opening_balance_minor, color, icon, is_archived, sort_order, created_at, updated_at)
       VALUES (?, 'Cash', 'cash', ?, 0, NULL, NULL, 0, 0, ?, ?)`,
      [accountId, currency, now, now],
    );
    seededAccount = true;
  }

  for (const [key, value] of Object.entries({
    [SETTING_KEYS.onboarded]: "0",
    [SETTING_KEYS.country]: input.country.toUpperCase(),
    [SETTING_KEYS.currency]: currency,
    [SETTING_KEYS.locale]: input.locale,
    [SETTING_KEYS.theme]: "system",
    [SETTING_KEYS.appLock]: "0",
  })) {
    await db.runAsync(
      "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
      [key, value, now],
    );
  }

  if (accountId) {
    // A reset deletes the old account but keeps settings, so this key can point at
    // a row that no longer exists. Upsert it to the account just seeded.
    await db.runAsync(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [SETTING_KEYS.lastAccountId, accountId, now],
    );
  }

  return { categories: seededCategories, account: seededAccount };
}

/**
 * First-run seeding: starter categories, one Cash account in the active currency,
 * and the documented settings defaults.
 *
 * Idempotent by construction — categories and accounts are only written when their
 * table is empty, and settings use `INSERT OR IGNORE` — so a second launch (or a
 * second call in the same launch) changes nothing. All of it is one transaction,
 * so a crash cannot leave a half-seeded library.
 */
export async function seedIfEmpty(db: Db, input: SeedInput): Promise<SeedResult> {
  let result: SeedResult = { categories: 0, account: false };
  await db.withTransactionAsync(async () => {
    result = await seedStarterData(db, input);
  });
  return result;
}
