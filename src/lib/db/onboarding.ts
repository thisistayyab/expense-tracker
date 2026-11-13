import { isCurrencyCode } from "../../constants/currencies";
import { newId } from "../ids";
import { upsertBudget } from "./repos/budgets";
import type { BudgetPeriod, Db } from "./types";

export type RegionSelection = {
  country: string;
  currency: string;
  locale: string;
};

/** Optional last onboarding step; a budget is never required to start. */
export type FirstBudget = {
  limitMinor: number;
  period: BudgetPeriod;
  startDate: string;
};

export type ApplyRegionOptions = {
  /** Written in the same transaction as the region, or not at all. */
  budget?: FirstBudget | null;
  now?: string;
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
 *
 * The first budget rides along in the same transaction: there is no moment where
 * onboarding is done but the app has been told about a limit it never saved.
 */
export async function applyRegionSelection(
  db: Db,
  region: RegionSelection,
  options: ApplyRegionOptions = {},
): Promise<void> {
  const country = region.country.toUpperCase();
  const currency = region.currency.toUpperCase();
  const locale = region.locale.trim() || "en-US";
  const now = options.now ?? new Date().toISOString();

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

    const budget = options.budget;
    if (
      budget &&
      Number.isSafeInteger(budget.limitMinor) &&
      budget.limitMinor > 0 &&
      isCurrencyCode(currency)
    ) {
      await upsertBudget(db, {
        categoryId: null,
        period: budget.period,
        limitMinor: budget.limitMinor,
        currency,
        startDate: budget.startDate,
      });
      // The period the user just budgeted in is the period every screen should use.
      await db.runAsync(
        `INSERT INTO settings (key, value, updated_at) VALUES ('budget_period', ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [budget.period, now],
      );
    }
  });
}
