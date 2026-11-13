import type { Db } from "../../lib/db/types";

/**
 * Pick a category for a typed name/place. Explicit rules win (highest priority
 * first); otherwise the most recently used category for the same item name in the
 * active currency is reused. Returns null when there is nothing honest to suggest —
 * the form then stays on "Uncategorized" rather than guessing.
 */
export async function suggestCategoryId(
  db: Db,
  input: { itemName?: string | null; place?: string | null; currency: string },
): Promise<string | null> {
  const itemName = input.itemName?.trim() ?? "";
  const place = input.place?.trim() ?? "";
  if (!itemName && !place) return null;

  const rule = await db.getFirstAsync<{ category_id: string }>(
    `SELECT category_id
       FROM category_rules
      WHERE is_active = 1 AND (
        (match_type = 'item_contains'  AND lower(?) LIKE '%' || lower(pattern) || '%') OR
        (match_type = 'item_equals'    AND lower(?) = lower(pattern)) OR
        (match_type = 'place_contains' AND lower(?) LIKE '%' || lower(pattern) || '%') OR
        (match_type = 'place_equals'   AND lower(?) = lower(pattern))
      )
      ORDER BY priority DESC, created_at ASC
      LIMIT 1`,
    [itemName, itemName, place, place],
  );
  if (rule) return rule.category_id;

  if (!itemName) return null;
  const recent = await db.getFirstAsync<{ category_id: string }>(
    `SELECT category_id
       FROM transactions
      WHERE category_id IS NOT NULL AND currency = ? AND lower(item_name) = lower(?)
      ORDER BY created_at DESC
      LIMIT 1`,
    [input.currency.toUpperCase(), itemName],
  );
  return recent?.category_id ?? null;
}
