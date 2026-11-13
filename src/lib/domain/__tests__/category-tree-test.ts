import type { Category } from "../../db/types";
import { categoryNodes } from "../category-tree";

function category(overrides: Partial<Category>): Category {
  return {
    id: overrides.id ?? "category",
    parentId: null,
    name: "Category",
    kind: "expense",
    icon: null,
    color: null,
    isArchived: false,
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("category tree", () => {
  test("orders top-level categories and attaches direct children", () => {
    const nodes = categoryNodes(
      [
        category({ id: "transport", name: "Transport", sortOrder: 1 }),
        category({ id: "food", name: "Food", sortOrder: 0 }),
        category({ id: "coffee", name: "Coffee", parentId: "food", sortOrder: 1 }),
        category({ id: "latte", name: "Latte", parentId: "food", sortOrder: 0 }),
        category({ id: "income", name: "Salary", kind: "income", sortOrder: 0 }),
      ],
      "expense",
    );

    expect(nodes.map((node) => node.category.id)).toEqual(["food", "transport"]);
    expect(nodes[0].children.map((child) => child.id)).toEqual(["latte", "coffee"]);
  });

  test("includes archived rows for management, not just the picker query", () => {
    const nodes = categoryNodes(
      [category({ id: "old", name: "Old", isArchived: true })],
      "expense",
    );
    expect(nodes).toHaveLength(1);
    expect(nodes[0].category.isArchived).toBe(true);
  });
});
