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

export async function createCategory(db: Db, input: NewCategory): Promise<Category> {
  if (!input.name.trim()) throw new Error("A category needs a name");
  const now = new Date().toISOString();
  const id = newId();

  await db.runAsync(
    `INSERT INTO categories (id, parent_id, name, kind, icon, color, is_archived, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      id,
      input.parentId ?? null,
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

export async function updateCategory(
  db: Db,
  id: string,
  patch: { name?: string; icon?: string | null; color?: string | null; sortOrder?: number },
): Promise<void> {
  const current = await getCategory(db, id);
  if (!current) throw new Error(`Category not found: ${id}`);

  await db.runAsync(
    `UPDATE categories SET name = ?, icon = ?, color = ?, sort_order = ?, updated_at = ?
      WHERE id = ?`,
    [
      patch.name?.trim() || current.name,
      patch.icon === undefined ? current.icon : nullable(patch.icon),
      patch.color === undefined ? current.color : nullable(patch.color),
      patch.sortOrder ?? current.sortOrder,
      new Date().toISOString(),
      id,
    ],
  );
}

/** Archive, never delete: history keeps rendering and rows stay valid (02 rule 5). */
export async function setCategoryArchived(db: Db, id: string, archived: boolean): Promise<void> {
  await db.runAsync("UPDATE categories SET is_archived = ?, updated_at = ? WHERE id = ?", [
    boolToInt(archived),
    new Date().toISOString(),
    id,
  ]);
}
