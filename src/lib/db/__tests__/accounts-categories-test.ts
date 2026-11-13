import {
  createAccount,
  listAccountBalances,
  listAccounts,
  updateAccount,
  setAccountArchived,
} from "../repos/accounts";
import {
  createCategory,
  getCategory,
  listCategories,
  reorderCategories,
  setCategoryArchived,
  updateCategory,
} from "../repos/categories";
import { createTransaction } from "../repos/transactions";
import { seededDb } from "../testDb";

async function accountsFixture() {
  const db = await seededDb();
  const [cash] = await listAccounts(db);
  const bank = await createAccount(db, {
    name: "Bank",
    type: "bank",
    currency: "USD",
    openingBalanceMinor: 1000,
  });
  const savings = await createAccount(db, { name: "Savings", type: "savings", currency: "USD" });
  const categories = await listCategories(db, { kind: "expense" });

  await createTransaction(db, {
    type: "expense",
    amountMinor: 500,
    currency: "USD",
    accountId: cash.id,
    categoryId: categories[0].id,
    occurredAt: "2026-11-12T12:00:00.000Z",
    localDate: "2026-11-12",
  });
  await createTransaction(db, {
    type: "income",
    amountMinor: 2000,
    currency: "USD",
    accountId: cash.id,
    occurredAt: "2026-11-12T12:00:00.000Z",
    localDate: "2026-11-12",
  });
  await createTransaction(db, {
    type: "transfer",
    amountMinor: 300,
    currency: "USD",
    accountId: cash.id,
    transferAccountId: bank.id,
    occurredAt: "2026-11-12T12:00:00.000Z",
    localDate: "2026-11-12",
  });

  return { db, cash, bank, savings };
}

describe("accounts", () => {
  test("computes balances and transaction counts on both transfer sides", async () => {
    const { db, cash, bank } = await accountsFixture();
    const balances = await listAccountBalances(db);
    const cashRow = balances.find((account) => account.id === cash.id)!;
    const bankRow = balances.find((account) => account.id === bank.id)!;
    expect(cashRow.balanceMinor).toBe(1200);
    expect(bankRow.balanceMinor).toBe(1300);
    expect(cashRow.transactionCount).toBe(3);
    expect(bankRow.transactionCount).toBe(1);
  });

  test("currency changes are blocked once an account has history", async () => {
    const { db, cash, savings } = await accountsFixture();
    await expect(updateAccount(db, cash.id, { currency: "EUR" })).rejects.toThrow("history");
    await updateAccount(db, savings.id, { currency: "EUR" });
    expect((await listAccounts(db)).find((account) => account.id === savings.id)?.currency).toBe(
      "EUR",
    );
  });

  test("archiving hides an account but keeps it available for management", async () => {
    const { db, savings } = await accountsFixture();
    await setAccountArchived(db, savings.id, true);
    expect((await listAccounts(db)).some((account) => account.id === savings.id)).toBe(false);
    expect(
      (await listAccountBalances(db, { includeArchived: true })).some(
        (account) => account.id === savings.id,
      ),
    ).toBe(true);
  });
});

describe("categories", () => {
  test("enforces one level of nesting", async () => {
    const db = await seededDb();
    const parent = await createCategory(db, { name: "Coffee", kind: "expense" });
    const child = await createCategory(db, {
      name: "Latte",
      kind: "expense",
      parentId: parent.id,
    });

    await expect(
      createCategory(db, { name: "Too deep", kind: "expense", parentId: child.id }),
    ).rejects.toThrow("one level");
  });

  test("a parent with children cannot be nested", async () => {
    const db = await seededDb();
    const parent = await createCategory(db, { name: "Parent", kind: "expense" });
    await createCategory(db, { name: "Child", kind: "expense", parentId: parent.id });
    const other = await createCategory(db, { name: "Other", kind: "expense" });
    await expect(updateCategory(db, parent.id, { parentId: other.id })).rejects.toThrow(
      "subcategories",
    );
  });

  test("archiving hides the parent and children from pickers but keeps history", async () => {
    const db = await seededDb();
    const parent = await createCategory(db, { name: "Coffee", kind: "expense" });
    const child = await createCategory(db, {
      name: "Latte",
      kind: "expense",
      parentId: parent.id,
    });
    await setCategoryArchived(db, parent.id, true);

    const active = await listCategories(db, { kind: "expense" });
    expect(active.some((category) => category.id === parent.id)).toBe(false);
    expect(active.some((category) => category.id === child.id)).toBe(false);
    expect(await getCategory(db, child.id)).not.toBeNull();

    const all = await listCategories(db, { kind: "expense", includeArchived: true });
    expect(all.some((category) => category.id === child.id)).toBe(true);
    expect(await db.getAllAsync("PRAGMA foreign_key_check")).toEqual([]);
  });

  test("reorders siblings transactionally", async () => {
    const db = await seededDb();
    const first = await createCategory(db, { name: "First", kind: "expense" });
    const second = await createCategory(db, { name: "Second", kind: "expense" });
    await reorderCategories(db, [second.id, first.id]);
    const firstRow = await db.getFirstAsync<{ sort_order: number }>(
      "SELECT sort_order FROM categories WHERE id = ?",
      [first.id],
    );
    const secondRow = await db.getFirstAsync<{ sort_order: number }>(
      "SELECT sort_order FROM categories WHERE id = ?",
      [second.id],
    );
    expect(secondRow?.sort_order).toBe(0);
    expect(firstRow?.sort_order).toBe(1);
  });
});
