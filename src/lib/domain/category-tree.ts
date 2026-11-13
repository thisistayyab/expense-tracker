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
