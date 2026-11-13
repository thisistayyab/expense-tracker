import { createAccount, listAccounts } from "../repos/accounts";
import { listCategories } from "../repos/categories";
import { createTransaction, listTransactions } from "../repos/transactions";
import { seededDb } from "../testDb";

async function fixture() {
  const db = await seededDb();
  const [cash] = await listAccounts(db);
  const euro = await createAccount(db, { name: "Euro", type: "bank", currency: "EUR" });
  const bank = await createAccount(db, { name: "Bank", type: "bank", currency: "USD" });
  const expenseCategories = await listCategories(db, { kind: "expense" });
  const incomeCategories = await listCategories(db, { kind: "income" });

  await createTransaction(db, {
    type: "expense",
    amountMinor: 1250,
    currency: "USD",
    accountId: cash.id,
    categoryId: expenseCategories[0].id,
    itemName: "Chicken shawarma",
    place: "Blue Bottle",
    note: "with Sam",
    occurredAt: "2026-11-12T12:00:00.000Z",
    localDate: "2026-11-12",
  });
  await createTransaction(db, {
    type: "expense",
    amountMinor: 450,
    currency: "USD",
    accountId: cash.id,
    categoryId: expenseCategories[1].id,
    itemName: "Flat white",
    occurredAt: "2026-11-11T12:00:00.000Z",
    localDate: "2026-11-11",
  });
  await createTransaction(db, {
    type: "income",
    amountMinor: 500_000,
    currency: "USD",
    accountId: cash.id,
    categoryId: incomeCategories[0].id,
    itemName: "Salary",
    occurredAt: "2026-11-01T12:00:00.000Z",
    localDate: "2026-11-01",
  });
  await createTransaction(db, {
    type: "transfer",
    amountMinor: 5000,
    currency: "USD",
    accountId: cash.id,
    transferAccountId: bank.id,
    occurredAt: "2026-11-12T13:00:00.000Z",
    localDate: "2026-11-12",
  });
  await createTransaction(db, {
    type: "expense",
    amountMinor: 2000,
    currency: "EUR",
    accountId: euro.id,
    itemName: "Hotel",
    occurredAt: "2026-11-10T12:00:00.000Z",
    localDate: "2026-11-10",
  });

  return { db, cash, bank, euro, categories: expenseCategories };
}

async function names(db: Awaited<ReturnType<typeof fixture>>["db"], filter: Parameters<typeof listTransactions>[1]) {
  return (await listTransactions(db, { ...filter, limit: 100 })).map(
    (row) => row.itemName ?? row.type,
  );
}

describe("transaction search and filters", () => {
  test("searches name, place, note, category and amount text", async () => {
    const { db } = await fixture();
    expect(await names(db, { text: "chicken" })).toEqual(["Chicken shawarma"]);
    expect(await names(db, { text: "blue" })).toEqual(["Chicken shawarma"]);
    expect(await names(db, { text: "with sam" })).toEqual(["Chicken shawarma"]);
    expect(await names(db, { text: "food" })).toEqual(["Chicken shawarma"]);
    expect(await names(db, { text: "12.50" })).toEqual(["Chicken shawarma"]);
    expect(await names(db, { text: "1250" })).toEqual(["Chicken shawarma"]);
  });

  test("filters by note presence, type, currency, account involvement and date", async () => {
    const { db, bank } = await fixture();
    expect(await names(db, { notePresent: true })).toEqual(["Chicken shawarma"]);
    expect(await names(db, { type: "income" })).toEqual(["Salary"]);
    expect(await names(db, { currency: "EUR" })).toEqual(["Hotel"]);
    expect(await names(db, { accountId: bank.id })).toEqual(["transfer"]);
    expect(
      await names(db, { fromDate: "2026-11-11", toDate: "2026-11-12" }),
    ).toEqual(["transfer", "Chicken shawarma", "Flat white"]);
  });

  test("caps the page and keeps the newest rows first", async () => {
    const { db } = await fixture();
    const rows = await listTransactions(db, { limit: 2 });
    expect(rows).toHaveLength(2);
    expect(rows[0].localDate >= rows[1].localDate).toBe(true);
  });
});
