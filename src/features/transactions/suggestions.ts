import type { CategoryKind, Db } from "../../lib/db/types";

/**
 * Pick a category for a typed name/place. Explicit rules win (highest priority
 * first); otherwise the most recently used active category of the matching kind
 * for the same item name in the active currency is reused. Returns null when
 * there is nothing honest to suggest — the form then stays on "Uncategorized".
 */
export async function suggestCategoryId(
  db: Db,
  input: {
    kind?: CategoryKind;
    itemName?: string | null;
    place?: string | null;
    currency: string;
  },
): Promise<string | null> {
  const itemName = input.itemName?.trim() ?? "";
  const place = input.place?.trim() ?? "";
  if (!itemName && !place) return null;

  const kindClause = input.kind ? "AND c.kind = ?" : "";

  const rule = await db.getFirstAsync<{ category_id: string }>(
    `SELECT r.category_id
       FROM category_rules r
       JOIN categories c ON c.id = r.category_id
       LEFT JOIN categories p ON p.id = c.parent_id
      WHERE r.is_active = 1
        AND r.pattern != ''
        AND c.is_archived = 0
        AND (c.parent_id IS NULL OR p.is_archived = 0)
        ${kindClause}
        AND (
          (r.match_type = 'item_contains'  AND ? != '' AND lower(?) LIKE '%' || lower(r.pattern) || '%') OR
          (r.match_type = 'item_equals'    AND ? != '' AND lower(?) = lower(r.pattern)) OR
          (r.match_type = 'place_contains' AND ? != '' AND lower(?) LIKE '%' || lower(r.pattern) || '%') OR
          (r.match_type = 'place_equals'   AND ? != '' AND lower(?) = lower(r.pattern))
        )
      ORDER BY r.priority DESC, r.created_at ASC
      LIMIT 1`,
    [
      itemName,
      itemName,
      itemName,
      itemName,
      place,
      place,
      place,
      place,
      ...(input.kind ? [input.kind] : []),
    ],
  );
  if (rule) return rule.category_id;

  if (!itemName) return null;
  const recentParams: string[] = [input.currency.toUpperCase(), itemName];
  if (input.kind) recentParams.push(input.kind);

  const recent = await db.getFirstAsync<{ category_id: string }>(
    `SELECT t.category_id
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       LEFT JOIN categories p ON p.id = c.parent_id
      WHERE t.category_id IS NOT NULL
        AND t.currency = ?
        AND lower(t.item_name) = lower(?)
        AND c.is_archived = 0
        AND (c.parent_id IS NULL OR p.is_archived = 0)
        ${kindClause}
      ORDER BY t.created_at DESC
      LIMIT 1`,
    recentParams,
  );
  return recent?.category_id ?? null;
}
