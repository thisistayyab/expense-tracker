import { countries, currencyForCountry, DEFAULT_COUNTRY_CODE } from "../../constants/countries";
import { DEFAULT_CURRENCY_CODE, isCurrencyCode } from "../../constants/currencies";

/**
 * Pure resolution of device region → app defaults. No `expo-localization` import
 * here, so the fallback chain is unit-testable.
 *
 * Order: a valid detected country wins; an unknown one falls back to the default
 * country. The currency is the detected one when it is in the table, otherwise the
 * country's primary currency — the same rule as 01-architecture.md.
 */
export type RegionInput = {
  regionCode?: string | null;
  currencyCode?: string | null;
  languageTag?: string | null;
};

export type RegionDefaults = {
  country: string;
  currency: string;
  locale: string;
};

const countryCodes = new Set(countries.map((country) => country.code));

export function isSupportedCountry(code: string | null | undefined): boolean {
  return typeof code === "string" && countryCodes.has(code.toUpperCase());
}

export function resolveRegionDefaults(input: RegionInput = {}): RegionDefaults {
  const detectedCountry = input.regionCode?.toUpperCase();
  const country = isSupportedCountry(detectedCountry) ? detectedCountry! : DEFAULT_COUNTRY_CODE;

  const detectedCurrency = input.currencyCode?.toUpperCase();
  const currency = isCurrencyCode(detectedCurrency)
    ? detectedCurrency!
    : currencyForCountry(country) || DEFAULT_CURRENCY_CODE;

  const locale = input.languageTag?.trim() || "en-US";

  return { country, currency, locale };
}
