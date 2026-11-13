import type { Db } from "../types";

/** Documented keys from 02-data-model.md. Values are always strings. */
export const SETTING_KEYS = {
  onboarded: "onboarded",
  country: "country",
  currency: "currency",
  locale: "locale",
  theme: "theme",
  lastAccountId: "last_account_id",
  currencyChangedAt: "currency_changed_at",
  /** weekly | monthly | yearly — the period Overview and Budgets both honour. */
  budgetPeriod: "budget_period",
  /** '1' when the biometric / device-passcode lock is enabled. */
  appLock: "app_lock",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export async function getSetting(db: Db, key: SettingKey): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [key],
  );
  return row?.value ?? null;
}

export async function getAllSettings(db: Db): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    "SELECT key, value FROM settings",
  );
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

/**
 * Upsert several keys atomically. Any multi-key write (region changes, onboarding
 * finish) must go through here so it cannot half-apply.
 */
export async function setSettings(
  db: Db,
  values: Partial<Record<SettingKey, string>>,
  now = new Date().toISOString(),
): Promise<void> {
  const entries = Object.entries(values).filter(
    (entry): entry is [SettingKey, string] => typeof entry[1] === "string",
  );
  if (!entries.length) return;

  await db.withTransactionAsync(async () => {
    for (const [key, value] of entries) {
      await db.runAsync(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, value, now],
      );
    }
  });
}

export async function deleteSetting(db: Db, key: SettingKey): Promise<void> {
  await db.runAsync("DELETE FROM settings WHERE key = ?", [key]);
}
