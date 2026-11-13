import type { Transaction } from "../db/types";

export type CurrencyTotal = {
  currency: string;
  /** Income − expenses. Transfers move money, so they never change a day total. */
  totalMinor: number;
};

export type TransactionDaySection = {
  date: string;
  data: Transaction[];
  totals: CurrencyTotal[];
};

/**
 * Group rows for Activity without ever adding currencies together. A transfer is
 * excluded from the net total because it moves money between two accounts rather
 * than changing what was earned or spent (02 rule 6).
 */
export function groupTransactionsByDay(rows: Transaction[]): TransactionDaySection[] {
  const ordered = [...rows].sort((left, right) => {
    if (left.localDate !== right.localDate) return right.localDate.localeCompare(left.localDate);
    return right.occurredAt.localeCompare(left.occurredAt);
  });

  const sections: TransactionDaySection[] = [];
  for (const row of ordered) {
    let section = sections[sections.length - 1];
    if (!section || section.date !== row.localDate) {
      section = { date: row.localDate, data: [], totals: [] };
      sections.push(section);
    }
    section.data.push(row);
  }

  return sections.map((section) => {
    const totals = new Map<string, number>();
    for (const row of section.data) {
      // Ensure a currency with only transfers still appears as 0 rather than
      // silently disappearing from the day's currency set.
      if (!totals.has(row.currency)) totals.set(row.currency, 0);
      if (row.type === "income") {
        totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amountMinor);
      } else if (row.type === "expense") {
        totals.set(row.currency, (totals.get(row.currency) ?? 0) - row.amountMinor);
      }
    }
    return {
      ...section,
      totals: [...totals.entries()].map(([currency, totalMinor]) => ({ currency, totalMinor })),
    };
  });
}

/** Sum a day's expense/income for one currency; used by tests and header helpers. */
export function dayNetForCurrency(rows: Transaction[], currency: string): number {
  return rows.reduce((total, row) => {
    if (row.currency.toUpperCase() !== currency.toUpperCase()) return total;
    if (row.type === "income") return total + row.amountMinor;
    if (row.type === "expense") return total - row.amountMinor;
    return total;
  }, 0);
}
