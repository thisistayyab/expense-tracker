import { insertFixtureTransactions } from "../fixtures";
import { listAccounts } from "../repos/accounts";
import { monthlyTotals, topItemTotals, unnamedItemTotals } from "../repos/insights";
import {
  countSpentInOtherCurrencies,
  sumSpentByCategory,
  sumSpentForComparison,
} from "../repos/transactions";
import { seededDb } from "../testDb";

jest.setTimeout(120_000);

describe("16,000-row P5 fixture", () => {
  test("answers the insight aggregates inside the 50 ms gate", async () => {
    const db = await seededDb("USD");
    const [cash] = await listAccounts(db);
    const inserted = await insertFixtureTransactions(db, {
      accountId: cash.id,
      currency: "USD",
      months: 12,
      count: 16_000,
      endDate: "2026-11-12",
      seed: 20261114,
    });
    expect(inserted.inserted).toBe(16_000);

    // The same seven aggregates the Insights screen loads, over the same shapes:
    // a full year, the selected period and its comparison, plus month-to-date.
    const yearRange = { currency: "USD", fromDate: "2025-12-01", toDate: "2026-11-12" };
    const currentRange = { currency: "USD", fromDate: "2026-05-01", toDate: "2026-11-12" };
    const comparisonRange = { currency: "USD", fromDate: "2025-12-01", toDate: "2026-04-30" };

    // Warm once so the measurement is aggregation, not first statement preparation.
    await monthlyTotals(db, yearRange);

    /*
     * CPU time, not wall time: Jest runs this suite next to every other suite, and a
     * wall-clock measurement on a loaded machine reports the machine, not the query.
     */
    const cpuStart = process.cpuUsage();
    const [
      months,
      currentCategories,
      comparisonCategories,
      named,
      unnamed,
      otherCurrency,
      monthTotals,
    ] = await Promise.all([
      monthlyTotals(db, yearRange),
      sumSpentByCategory(db, currentRange),
      sumSpentByCategory(db, comparisonRange),
      topItemTotals(db, { ...currentRange, limit: 5 }),
      unnamedItemTotals(db, { ...currentRange, limit: 5 }),
      countSpentInOtherCurrencies(db, currentRange),
      sumSpentForComparison(db, {
        currency: "USD",
        currentFrom: "2026-11-01",
        previousFrom: "2026-10-01",
        previousTo: "2026-10-12",
        toDate: "2026-11-12",
      }),
    ]);
    const cpu = process.cpuUsage(cpuStart);
    const cpuMs = (cpu.user + cpu.system) / 1000;

    expect(months.length).toBeGreaterThan(0);
    expect(currentCategories.length).toBeGreaterThan(0);
    expect(comparisonCategories.length).toBeGreaterThan(0);
    expect(named.length).toBeGreaterThan(0);
    expect(Array.isArray(unnamed)).toBe(true);
    expect(Array.isArray(otherCurrency)).toBe(true);
    expect(monthTotals.currentMinor).toBeGreaterThanOrEqual(0);
    expect(currentCategories.reduce((total, row) => total + row.spentMinor, 0)).toBeGreaterThan(0);
    expect(cpuMs).toBeLessThan(50);
  });
});
