import {
  formatMoney,
  minorToDecimalString,
  parseMoneyInput,
  sanitizeMoneyInput,
} from "../money";

describe("parseMoneyInput", () => {
  test("parses 2-decimal currencies into minor units", () => {
    expect(parseMoneyInput("12.50", "USD")).toBe(1250);
    expect(parseMoneyInput("12.5", "USD")).toBe(1250);
    expect(parseMoneyInput("12.", "USD")).toBe(1200);
    expect(parseMoneyInput("0.99", "EUR")).toBe(99);
  });

  test("parses 0-decimal currencies without a fraction", () => {
    expect(parseMoneyInput("1200", "JPY")).toBe(1200);
    expect(parseMoneyInput("1200.00", "JPY")).toBeNull();
  });

  test("parses 3-decimal currencies", () => {
    expect(parseMoneyInput("1.250", "KWD")).toBe(1250);
    expect(parseMoneyInput("0.001", "KWD")).toBe(1);
  });

  test("rejects more decimals than the currency allows instead of rounding", () => {
    expect(parseMoneyInput("12.555", "USD")).toBeNull();
    expect(parseMoneyInput("1.2505", "KWD")).toBeNull();
    expect(parseMoneyInput("1200.5", "JPY")).toBeNull();
  });

  test("strips grouping commas and spaces", () => {
    expect(parseMoneyInput("1,250.00", "USD")).toBe(125000);
    expect(parseMoneyInput(" 1 250,75 ", "EUR", ",")).toBe(125075);
  });

  test("rejects empty and malformed input", () => {
    expect(parseMoneyInput("", "USD")).toBeNull();
    expect(parseMoneyInput("   ", "USD")).toBeNull();
    expect(parseMoneyInput("abc", "USD")).toBeNull();
    expect(parseMoneyInput("1.2.3", "USD")).toBeNull();
    expect(parseMoneyInput("-5", "USD")).toBeNull();
  });
});

describe("sanitizeMoneyInput", () => {
  test("clamps USD to two decimals and one separator", () => {
    expect(sanitizeMoneyInput("12.345", "USD")).toBe("12.34");
    expect(sanitizeMoneyInput("1.2.3", "USD")).toBe("1.23");
    expect(sanitizeMoneyInput("0012", "USD")).toBe("12");
    expect(sanitizeMoneyInput("abc12.5x", "USD")).toBe("12.5");
  });

  test("accepts a comma decimal separator but treats grouping commas correctly", () => {
    expect(sanitizeMoneyInput("12,5", "USD")).toBe("12.5");
    expect(sanitizeMoneyInput("1,250.75", "USD")).toBe("1250.75");
  });

  test("JPY never keeps a separator or fraction", () => {
    expect(sanitizeMoneyInput("1200.50", "JPY")).toBe("1200");
    expect(sanitizeMoneyInput("1,200", "JPY")).toBe("1200");
    expect(sanitizeMoneyInput(".", "JPY")).toBe("");
  });

  test("keeps three decimals for KWD", () => {
    expect(sanitizeMoneyInput("1.2505", "KWD")).toBe("1.250");
  });
});

describe("minorToDecimalString", () => {
  test("uses the currency exponent", () => {
    expect(minorToDecimalString(1250, "USD")).toBe("12.50");
    expect(minorToDecimalString(5, "USD")).toBe("0.05");
    expect(minorToDecimalString(1200, "JPY")).toBe("1200");
    expect(minorToDecimalString(1250, "KWD")).toBe("1.250");
  });
});

describe("formatMoney", () => {
  test("formats with the currency exponent, not a hard-coded 2", () => {
    expect(formatMoney(1250, "USD", { locale: "en-US" })).toBe("$12.50");
    expect(formatMoney(12400, "JPY", { locale: "en-US" })).toBe("¥12,400");
    expect(formatMoney(1250, "KWD", { locale: "en-US" })).toBe("KWD 1.250");
  });

  test("uses U+2212 for negatives and an optional plus for income", () => {
    expect(formatMoney(-1250, "USD", { locale: "en-US" })).toBe("\u2212$12.50");
    expect(formatMoney(1250, "USD", { locale: "en-US", showPlus: true })).toBe("+$12.50");
  });
});
