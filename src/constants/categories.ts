import type { ToneName } from "../lib/theme/tokens";

/**
 * Starter categories seeded on first launch (P1 writes them to SQLite).
 * `icon` is a semantic key the icon layer maps to expo-symbols / Material;
 * `color` comes from the category ramp in 04 and is stored per category so the
 * user can recolor it later.
 */
export type CategoryKind = "expense" | "income";

export type CategorySeed = {
  key: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  tone: ToneName;
};

export const starterExpenseCategories: readonly CategorySeed[] = [
  { key: "food", name: "Food & Drink", kind: "expense", icon: "utensils", color: "#DE9A24", tone: "amber" },
  { key: "groceries", name: "Groceries", kind: "expense", icon: "cart", color: "#12A150", tone: "mint" },
  { key: "transport", name: "Transport", kind: "expense", icon: "car", color: "#2A6FC4", tone: "sky" },
  { key: "home", name: "Home", kind: "expense", icon: "home", color: "#8E6BF6", tone: "iris" },
  { key: "shopping", name: "Shopping", kind: "expense", icon: "bag", color: "#F0503F", tone: "coral" },
  { key: "bills", name: "Bills & Utilities", kind: "expense", icon: "receipt", color: "#5B5BF7", tone: "iris" },
  { key: "health", name: "Health", kind: "expense", icon: "heart", color: "#0E8A8A", tone: "mint" },
  { key: "fun", name: "Fun", kind: "expense", icon: "sparkles", color: "#B5765A", tone: "amber" },
  { key: "education", name: "Education", kind: "expense", icon: "book", color: "#2A6FC4", tone: "sky" },
  { key: "travel", name: "Travel", kind: "expense", icon: "plane", color: "#5B5BF7", tone: "iris" },
  { key: "gifts", name: "Gifts", kind: "expense", icon: "gift", color: "#DE9A24", tone: "amber" },
  { key: "other-expense", name: "Other", kind: "expense", icon: "ellipsis", color: "#6C727B", tone: "slate" },
];

export const starterIncomeCategories: readonly CategorySeed[] = [
  { key: "salary", name: "Salary", kind: "income", icon: "wallet", color: "#12A150", tone: "mint" },
  { key: "freelance", name: "Freelance", kind: "income", icon: "briefcase", color: "#2A6FC4", tone: "sky" },
  { key: "other-income", name: "Other income", kind: "income", icon: "plus", color: "#6C727B", tone: "slate" },
];

export const starterCategories: readonly CategorySeed[] = [
  ...starterExpenseCategories,
  ...starterIncomeCategories,
];
