import { newId } from "../../ids";
import type { Category, CategoryKind, Db } from "../types";
import { boolToInt, intToBool, nullable } from "../types";

type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  kind: CategoryKind;
  icon: string | null;
  color: string | null;
  is_archived: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const SELECT = `SELECT id, parent_id, name, kind, icon, color, is_archived, sort_order,
                       created_at, updated_at
                FROM categories`;

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    kind: row.kind,
    icon: row.icon,
    color: row.color,
    isArchived: intToBool(row.is_archived),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type NewCategory = {
  name: string;
  kind: CategoryKind;
  parentId?: string | null;
  icon?: string | null;
  color?: string | null;
  sortOrder?: number;
};

export async function listCategories(
  db: Db,
  options: { kind?: CategoryKind; includeArchived?: boolean } = {},
): Promise<Category[]> {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (options.kind) {
    clauses.push("kind = ?");
    params.push(options.kind);
  }
  if (!options.includeArchived) {
    clauses.push("is_archived = 0");
    // Archiving a parent hides its children from pickers too. The children are
    // still returned by includeArchived so history and management can show them.
    clauses.push(
      "(parent_id IS NULL OR parent_id IN (SELECT id FROM categories WHERE is_archived = 0))",
    );
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await db.getAllAsync<CategoryRow>(
    `${SELECT} ${where} ORDER BY kind, sort_order, name`,
    params,
  );
  return rows.map(mapCategory);
}

export async function getCategory(db: Db, id: string): Promise<Category | null> {
  const row = await db.getFirstAsync<CategoryRow>(`${SELECT} WHERE id = ?`, [id]);
  return row ? mapCategory(row) : null;
}

async function validParentId(
  db: Db,
  input: { id?: string; parentId?: string | null; kind: CategoryKind },
): Promise<string | null> {
  const parentId = input.parentId ?? null;
  if (!parentId) return null;
  if (input.id && parentId === input.id) throw new Error("A category cannot parent itself");

  const parent = await getCategory(db, parentId);
  if (!parent) throw new Error("Parent category not found");
  if (parent.kind !== input.kind) throw new Error("A parent must have the same kind");
  if (parent.parentId) throw new Error("Categories support only one level of nesting");
  return parentId;
}

export async function createCategory(db: Db, input: NewCategory): Promise<Category> {
  if (!input.name.trim()) throw new Error("A category needs a name");
  const parentId = await validParentId(db, {
    parentId: input.parentId,
    kind: input.kind,
  });
  const now = new Date().toISOString();
  const id = newId();

  await db.runAsync(
    `INSERT INTO categories (id, parent_id, name, kind, icon, color, is_archived, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      id,
      parentId,
      input.name.trim(),
      input.kind,
      nullable(input.icon ?? null),
      nullable(input.color ?? null),
      input.sortOrder ?? 0,
      now,
      now,
    ],
  );

  return (await getCategory(db, id))!;
}

export type CategoryPatch = {
  name?: string;
  parentId?: string | null;
  icon?: string | null;
  color?: string | null;
  sortOrder?: number;
};

export async function updateCategory(
  db: Db,
  id: string,
  patch: CategoryPatch,
): Promise<void> {
  const current = await getCategory(db, id);
  if (!current) throw new Error(`Category not found: ${id}`);
  if (patch.name !== undefined && !patch.name.trim()) {
    throw new Error("A category needs a name");
  }

  const nextParentId =
    patch.parentId === undefined
      ? current.parentId
      : await validParentId(db, { id, parentId: patch.parentId, kind: current.kind });

  if (nextParentId) {
    const child = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM categories WHERE parent_id = ? LIMIT 1",
      [id],
    );
    if (child) throw new Error("Move its subcategories out before nesting this category");
  }

  await db.runAsync(
    `UPDATE categories SET parent_id = ?, name = ?, icon = ?, color = ?, sort_order = ?,
            updated_at = ?
      WHERE id = ?`,
    [
      nextParentId,
      patch.name?.trim() || current.name,
      patch.icon === undefined ? current.icon : nullable(patch.icon),
      patch.color === undefined ? current.color : nullable(patch.color),
      patch.sortOrder ?? current.sortOrder,
      new Date().toISOString(),
      id,
    ],
  );
}

/** Persist a sibling order in one transaction; used by the reorder controls. */
export async function reorderCategories(db: Db, orderedIds: string[]): Promise<void> {
  if (!orderedIds.length) return;
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const [index, id] of orderedIds.entries()) {
      await db.runAsync(
        "UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?",
        [index, now, id],
      );
    }
  });
}

/** Archive, never delete: history keeps rendering and rows stay valid (02 rule 5). */
export async function setCategoryArchived(db: Db, id: string, archived: boolean): Promise<void> {
  await db.runAsync("UPDATE categories SET is_archived = ?, updated_at = ? WHERE id = ?", [
    boolToInt(archived),
    new Date().toISOString(),
    id,
  ]);
}
