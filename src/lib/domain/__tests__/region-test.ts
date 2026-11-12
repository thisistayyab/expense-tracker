import { isSupportedCountry, resolveRegionDefaults } from "../region";

describe("resolveRegionDefaults", () => {
  test("uses the detected country and currency when both are known", () => {
    expect(
      resolveRegionDefaults({ regionCode: "jp", currencyCode: "jpy", languageTag: "ja-JP" }),
    ).toEqual({ country: "JP", currency: "JPY", locale: "ja-JP" });
  });

  test("an explicit currency wins over the country's default", () => {
    // An expat in Japan earning in USD must be able to log dollars.
    expect(resolveRegionDefaults({ regionCode: "JP", currencyCode: "USD" })).toEqual({
      country: "JP",
      currency: "USD",
      locale: "en-US",
    });
  });

  test("falls back to the country's currency when the detected code is unknown", () => {
    expect(resolveRegionDefaults({ regionCode: "JP", currencyCode: "XXX" })).toEqual({
      country: "JP",
      currency: "JPY",
      locale: "en-US",
    });
  });

  test("an unknown region falls back to the default country without losing a valid currency", () => {
    expect(resolveRegionDefaults({ regionCode: "ZZ", currencyCode: "EUR" })).toEqual({
      country: "US",
      currency: "EUR",
      locale: "en-US",
    });
  });

  test("empty input still gives a usable pair", () => {
    expect(resolveRegionDefaults()).toEqual({ country: "US", currency: "USD", locale: "en-US" });
    expect(isSupportedCountry("kw")).toBe(true);
    expect(isSupportedCountry("ZZ")).toBe(false);
  });
});
