import type { TransactionType } from "../db/types";
import { minorToDecimalString } from "../format/money";

/**
 * CSV is deliberately plain: ISO dates, a `currency` column on every row, and the
 * amount serialized with that row's own exponent (JPY 1200, KWD 1.250, USD 12.50).
 * Expenses and transfers are negative so a spreadsheet's own SUM reproduces the
 * cash-flow direction without a lookup table; `type` still says what each row is.
 */

export type CsvTransaction = {
  id: string;
  type: TransactionType;
  amountMinor: number;
  currency: string;
  accountName: string;
  categoryName: string | null;
  itemName: string | null;
  place: string | null;
  note: string | null;
  occurredAt: string;
  localDate: string;
  recurringId: string | null;
  transferAccountName?: string | null;
};

export const CSV_HEADER = [
  "id",
  "occurred_at",
  "local_date",
  "type",
  "amount",
  "currency",
  "account",
  "category",
  "item_name",
  "place",
  "note",
  "transfer_account",
  "recurring_id",
] as const;

/** RFC 4180 quoting: only when needed, quotes doubled. */
export function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Neutralize spreadsheet formula triggers on free-form text columns (`=`, `+`,
 * `-`, `@`, `\t`, `\r`) while leaving numeric amount cells untouched for SUM().
 */
export function csvTextCell(value: string | null | undefined): string {
  const text = value ?? "";
  const safe = /^[\t\r ]*[=+\-@]|^[\t\r]/.test(text) ? `'${text}` : text;
  return csvCell(safe);
}

/** Positive for income, negative for expenses and transfers (money leaving). */
export function csvAmount(type: TransactionType, minor: number, currency: string): string {
  const absolute = minorToDecimalString(Math.abs(Math.trunc(minor)), currency);
  return type === "income" ? absolute : `-${absolute}`;
}

export function csvRow(row: CsvTransaction): string {
  return [
    csvTextCell(row.id),
    csvTextCell(row.occurredAt),
    csvTextCell(row.localDate),
    csvTextCell(row.type),
    csvCell(csvAmount(row.type, row.amountMinor, row.currency)),
    csvTextCell(row.currency),
    csvTextCell(row.accountName),
    csvTextCell(row.categoryName),
    csvTextCell(row.itemName),
    csvTextCell(row.place),
    csvTextCell(row.note),
    csvTextCell(row.transferAccountName ?? null),
    csvTextCell(row.recurringId),
  ].join(",");
}

/**
 * UTF-8 BOM by default: Excel misreads a bare UTF-8 CSV as the local code page and
 * turns `€`, `¥` and accented item names into mojibake. CRLF matches Excel's own
 * export and is accepted everywhere else.
 */
export function transactionsToCsv(
  rows: readonly CsvTransaction[],
  options: { bom?: boolean } = {},
): string {
  const lines = [CSV_HEADER.join(","), ...rows.map(csvRow)];
  const body = `${lines.join("\r\n")}\r\n`;
  return options.bom === false ? body : `\uFEFF${body}`;
}
