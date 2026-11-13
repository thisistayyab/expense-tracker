import { getCurrency, type Currency } from "../../constants/currencies";

/**
 * The only place a currency string is produced.
 *
 * Amounts arrive as integers in the currency's minor unit (12.50 USD = 1250,
 * 1200 JPY = 1200, 1.250 KWD = 1250). The exponent comes from the currency table,
 * never from the caller.
 *
 * Two rendering paths exist because Hermes ICU data varies by platform build:
 *   1. `Intl.NumberFormat` with `style: "currency"` — correct grouping, placement
 *      and decimal separator for the device locale.
 *   2. A static fallback built from the currency table — used when Intl throws or
 *      returns no digits. It groups like en-US and keeps letters-only symbols
 *      spaced ("KWD 1,250.000") so USD/EUR/JPY/KWD read identically from either
 *      path; see `scripts/check-money.mjs`.
 *
 * Minus signs are normalised to U+2212 so a negative amount matches the design
 * spec on every platform (Intl emits an ASCII hyphen).
 */

const MINUS = "\u2212";

export type MoneyFormatOptions = {
  /** BCP-47 tag; omit for the device locale. */
  locale?: string;
  /** Prefix the ISO code, e.g. "USD 12.50". */
  withCode?: boolean;
  /** Prefix "+" for positive amounts (income). */
  showPlus?: boolean;
};

export function normalizeSpaces(value: string): string {
  return value.replace(/[\u00A0\u202F]/g, " ");
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fallbackFormat(absoluteMinor: number, currency: Currency): string {
  const { exponent, symbol } = currency;
  const scale = 10 ** exponent;
  const whole = Math.floor(absoluteMinor / scale);
  const fraction = absoluteMinor - whole * scale;
  const decimals = exponent === 0 ? "" : `.${String(fraction).padStart(exponent, "0")}`;
  const spacer = /^[A-Za-z]/.test(symbol) ? " " : "";
  return `${symbol}${spacer}${groupThousands(String(whole))}${decimals}`;
}

function formatAbsolute(absoluteMinor: number, currency: Currency, locale?: string): string {
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.code,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: currency.exponent,
      maximumFractionDigits: currency.exponent,
    });
    const formatted = normalizeSpaces(formatter.format(absoluteMinor / 10 ** currency.exponent));
    return /\d/.test(formatted) ? formatted : fallbackFormat(absoluteMinor, currency);
  } catch {
    return fallbackFormat(absoluteMinor, currency);
  }
}

export function formatMoney(
  minor: number,
  code: string,
  options: MoneyFormatOptions = {},
): string {
  const currency = getCurrency(code);
  const safeMinor = Number.isFinite(minor) ? Math.trunc(minor) : 0;
  const negative = safeMinor < 0;
  const absolute = Math.abs(safeMinor);

  const value = formatAbsolute(absolute, currency, options.locale);
  let signed = value;
  if (negative) signed = `${MINUS}${value}`;
  else if (options.showPlus && absolute > 0) signed = `+${value}`;

  if (options.withCode && !signed.includes(currency.code)) {
    return `${currency.code} ${signed}`;
  }
  return signed;
}

/** Number of decimals the amount field must accept for this currency. */
export function decimalPlaces(code: string): number {
  return getCurrency(code).exponent;
}

/**
 * Keep an editable amount valid for the active currency while the user types:
 * digits and at most one decimal separator, no more fraction digits than the
 * exponent allows, and a nine-digit whole limit. 0-exponent currencies never keep
 * a separator or a fraction.
 */
export function sanitizeMoneyInput(input: string, code: string): string {
  const exponent = getCurrency(code).exponent;
  if (exponent === 0) {
    const whole = input.replace(/,/g, "").split(".")[0];
    return whole.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9);
  }

  // A decimal keypad may emit "," in some locales, so accept both while typing.
  // A dot wins when both appear, which drops grouping commas from pasted amounts.
  const normalized = input.includes(".") ? input : input.replace(/,/g, ".");
  const [wholeRaw = "", ...fractions] = normalized.replace(/[^\d.]/g, "").split(".");
  const whole = wholeRaw.replace(/^0+(?=\d)/, "").slice(0, 9);
  if (!fractions.length) return whole;
  return `${whole || "0"}.${fractions.join("").slice(0, exponent)}`;
}

/**
 * Same as `sanitizeMoneyInput`, but keeps an optional leading minus for an
 * opening balance (a card can start in debt). A lone minus is just empty input.
 */
export function sanitizeSignedMoneyInput(input: string, code: string): string {
  const negative = input.trim().startsWith("-");
  const positive = sanitizeMoneyInput(input.replace(/^\s*-/, ""), code);
  if (!positive || positive === "0") return positive;
  return negative ? `-${positive}` : positive;
}

/** 1250 USD → "12.50"; 1200 JPY → "1200"; 1250 KWD → "1.250". */
export function minorToDecimalString(minor: number, code: string): string {
  const { exponent } = getCurrency(code);
  const sign = minor < 0 ? "-" : "";
  const absolute = Math.abs(Math.trunc(minor));
  if (exponent === 0) return `${sign}${absolute}`;
  const scale = 10 ** exponent;
  const whole = Math.floor(absolute / scale);
  const fraction = String(absolute - whole * scale).padStart(exponent, "0");
  return `${sign}${whole}.${fraction}`;
}

/**
 * Parse keypad input into minor units. Rejects more decimals than the currency
 * has (12.555 USD is a typo, not a rounding opportunity) and anything that is not
 * a plain decimal number. Returns null when the input is not valid.
 */
export function parseSignedMoneyInput(
  input: string,
  code: string,
  decimalSeparator = ".",
): number | null {
  const negative = input.trim().startsWith("-");
  const value = parseMoneyInput(input.replace(/^\s*-/, ""), code, decimalSeparator);
  if (value === null) return null;
  return negative ? -value : value;
}

export function parseMoneyInput(
  input: string,
  code: string,
  decimalSeparator = ".",
): number | null {
  const { exponent } = getCurrency(code);
  const collapsed = input.trim().replace(/\s/g, "");
  // Only the *other* separator can be grouping: stripping the comma while it is the
  // decimal separator turned "1 250,75" into 125075 instead of 1250.75.
  const cleaned =
    decimalSeparator === "." ? collapsed.replace(/,/g, "") : collapsed.replace(/\./g, "");
  if (!cleaned) return null;

  const separatorPattern = decimalSeparator === "." ? /\./g : new RegExp(`\\${decimalSeparator}`, "g");
  const separatorCount = (cleaned.match(separatorPattern) ?? []).length;
  if (separatorCount > 1) return null;

  const normalised = decimalSeparator === "." ? cleaned : cleaned.replace(decimalSeparator, ".");
  if (!/^\d*\.?\d*$/.test(normalised)) return null;

  const [wholePart = "", fractionPart = ""] = normalised.split(".");
  if (!wholePart && !fractionPart) return null;
  if (fractionPart.length > exponent) return null;

  const whole = wholePart ? Number(wholePart) : 0;
  if (!Number.isSafeInteger(whole)) return null;

  const fraction = exponent === 0 ? 0 : Number(fractionPart.padEnd(exponent, "0"));
  const minor = whole * 10 ** exponent + fraction;
  return Number.isSafeInteger(minor) ? minor : null;
}
