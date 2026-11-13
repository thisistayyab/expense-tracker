import { newId } from "../ids";
import type { Db } from "./types";

export type RegionSelection = {
  country: string;
  currency: string;
  locale: string;
};

/**
 * Last step of onboarding, and the same write Settings uses for a region change:
 * country, currency and locale land together with the onboarded flag, and the app
 * always has an active account in the chosen currency.
 *
 * One transaction, because a half-applied region would enter the first expense in
 * the wrong money. If the device-currency Cash account exists it is reused; only a
 * missing currency creates an account, so flipping back and forth never litters the
 * library with empty accounts.
 */
export async function applyRegionSelection(
  db: Db,
  region: RegionSelection,
  now = new Date().toISOString(),
): Promise<void> {
  const country = region.country.toUpperCase();
  const currency = region.currency.toUpperCase();
  const locale = region.locale.trim() || "en-US";

  await db.withTransactionAsync(async () => {
    const existing = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM accounts
        WHERE currency = ? AND is_archived = 0
        ORDER BY sort_order, name
        LIMIT 1`,
      [currency],
    );

    let accountId = existing[0]?.id;
    if (!accountId) {
      accountId = newId();
      await db.runAsync(
        `INSERT INTO accounts
           (id, name, type, currency, opening_balance_minor, color, icon, is_archived,
            sort_order, created_at, updated_at)
         VALUES (?, 'Cash', 'cash', ?, 0, NULL, NULL, 0, 0, ?, ?)`,
        [accountId, currency, now, now],
      );
    }

    const values: [string, string][] = [
      ["onboarded", "1"],
      ["country", country],
      ["currency", currency],
      ["locale", locale],
      ["last_account_id", accountId],
    ];

    for (const [key, value] of values) {
      await db.runAsync(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, value, now],
      );
    }
  });
}
