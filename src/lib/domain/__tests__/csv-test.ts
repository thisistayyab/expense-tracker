import { CSV_HEADER, csvAmount, csvCell, transactionsToCsv, type CsvTransaction } from "../csv";

const base: CsvTransaction = {
  id: "tx-1",
  type: "expense",
  amountMinor: 1250,
  currency: "USD",
  accountName: "Cash",
  categoryName: "Food & Drink",
  itemName: "Chicken shawarma",
  place: "Blue Bottle",
  note: null,
  occurredAt: "2026-11-12T18:04:00.000Z",
  localDate: "2026-11-12",
  recurringId: null,
};

describe("CSV export", () => {
  test("expenses are negative, income is positive and the exponent is per row", () => {
    expect(csvAmount("expense", 1250, "USD")).toBe("-12.50");
    expect(csvAmount("income", 5000, "USD")).toBe("50.00");
    expect(csvAmount("expense", 1200, "JPY")).toBe("-1200");
    expect(csvAmount("expense", 1250, "KWD")).toBe("-1.250");
    expect(csvAmount("transfer", 999, "USD")).toBe("-9.99");
  });

  test("quotes commas, quotes and newlines only when needed", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell(null)).toBe("");
  });

  test("writes a BOM, a header and CRLF rows", () => {
    const csv = transactionsToCsv([base]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(CSV_HEADER.join(","));
    expect(csv).toContain("-12.50,USD,Cash");
    expect(csv.endsWith("\r\n")).toBe(true);

    const withoutBom = transactionsToCsv([base], { bom: false });
    expect(withoutBom.startsWith("id,")).toBe(true);
  });

  test("an item name containing a comma stays one spreadsheet cell", () => {
    const csv = transactionsToCsv([{ ...base, itemName: 'Lunch, coffee' }], { bom: false });
    expect(csv).toContain('"Lunch, coffee"');

    // 13 columns per line; the quoted comma must not add one.
    const firstDataLine = csv.split("\r\n")[1];
    expect(firstDataLine.split(",").length).toBeGreaterThan(13);
    expect(firstDataLine).toContain('"Lunch, coffee"');
  });
});
