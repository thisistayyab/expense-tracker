import type { Category, CategoryKind } from "../db/types";

export type CategoryNode = {
  category: Category;
  children: Category[];
};

function ordered(categories: Category[]): Category[] {
  return [...categories].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.name.localeCompare(right.name);
  });
}

/**
 * One level only (02): every top-level category owns its direct children. Rows
 * with an orphaned parent are still shown at the top so data is never invisible.
 */
export function categoryNodes(categories: Category[], kind: CategoryKind): CategoryNode[] {
  const scoped = categories.filter((category) => category.kind === kind);
  const ids = new Set(scoped.map((category) => category.id));
  const top = ordered(scoped.filter((category) => !category.parentId || !ids.has(category.parentId)));

  return top.map((category) => ({
    category,
    children: ordered(scoped.filter((child) => child.parentId === category.id)),
  }));
}

/**
 * Returns categories safe to show in pickers: excludes archived categories and
 * subcategories whose parent is archived, unless explicitly included (e.g. an
 * existing historical selection being edited).
 */
export function selectableCategories(
  categories: readonly Category[],
  options: { kind?: CategoryKind; includeIds?: readonly (string | null | undefined)[] } = {},
): Category[] {
  const included = new Set((options.includeIds ?? []).filter((id): id is string => Boolean(id)));
  const archivedIds = new Set(
    categories.filter((entry) => entry.isArchived).map((entry) => entry.id),
  );
  return categories.filter((category) => {
    if (options.kind && category.kind !== options.kind) return false;
    if (included.has(category.id)) return true;
    if (category.isArchived) return false;
    if (category.parentId && archivedIds.has(category.parentId)) return false;
    return true;
  });
}
