import { isCurrencyCode } from "../../constants/currencies";
import { newId } from "../ids";
import { addDays, addMonthsClamped, startOfMonth } from "../domain/dates";
import type { Db } from "./types";

/**
 * Deterministic fixture data for performance work (P3 lists, P5 aggregates).
 * 12 months × ~167 rows ≈ 2,000 transactions. Seeded PRNG so the same call
 * produces the same rows and timings are comparable between runs.
 */
export type FixtureOptions = {
  accountId: string;
  currency: string;
  months?: number;
  count?: number;
  /** Inclusive last day of the range; defaults to today. */
  endDate?: string;
  seed?: number;
};

const ITEMS = [
  "Chicken shawarma",
  "Flat white",
  "Metro card",
  "Weekly shop",
  "Rent",
  "Phone bill",
  "Cinema tickets",
  "Gym membership",
  "Pasta night",
  "Taxi home",
  "New headphones",
  "Pharmacy",
];

const PLACES = [
  "Blue Bottle",
  "Corner Market",
  "City Transit",
  "Green Grocer",
  "Landlord",
  "Cinema City",
  "Neighbourhood Pharmacy",
  null,
];

const NOTES = ["with Sam", "work lunch", null, null, "reimbursable", null];

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function insertFixtureTransactions(
  db: Db,
  options: FixtureOptions,
): Promise<{ inserted: number; categoriesUsed: number }> {
  if (!isCurrencyCode(options.currency)) throw new Error(`Unknown currency: ${options.currency}`);

  const months = Math.max(1, options.months ?? 12);
  const count = Math.max(1, options.count ?? 2000);
  const endDate = options.endDate ?? new Date().toISOString().slice(0, 10);
  const startDate = startOfMonth(addMonthsClamped(endDate, -months));
  const rangeEnd = endDate;
  const random = mulberry32(options.seed ?? 20261112);

  const categories = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM categories WHERE kind = 'expense' AND is_archived = 0 ORDER BY sort_order",
  );
  if (!categories.length) throw new Error("Seed categories before inserting fixtures");

  const spanDays = Math.max(1, Math.round((Date.parse(rangeEnd) - Date.parse(startDate)) / 86_400_000));
  let inserted = 0;

  await db.withTransactionAsync(async () => {
    for (let index = 0; index < count; index += 1) {
      const localDate = addDays(startDate, Math.floor(random() * (spanDays + 1)));
      const category = categories[Math.floor(random() * categories.length)];
      const amountMinor = 150 + Math.floor(random() * 9_850);
      const isIncome = random() < 0.08;
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO transactions (id, type, amount_minor, currency, account_id, transfer_account_id,
                                   category_id, item_name, place, note, occurred_at, local_date,
                                   recurring_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        [
          newId(),
          isIncome ? "income" : "expense",
          amountMinor,
          options.currency.toUpperCase(),
          options.accountId,
          category.id,
          ITEMS[Math.floor(random() * ITEMS.length)],
          PLACES[Math.floor(random() * PLACES.length)],
          NOTES[Math.floor(random() * NOTES.length)],
          `${localDate}T12:00:00.000Z`,
          localDate,
          now,
          now,
        ],
      );
      inserted += 1;
    }
  });

  return { inserted, categoriesUsed: categories.length };
}

/** Removes fixture rows only — every transaction. Keeps categories and accounts. */
export async function clearTransactions(db: Db): Promise<number> {
  const result = await db.runAsync("DELETE FROM transactions");
  return result.changes;
}
