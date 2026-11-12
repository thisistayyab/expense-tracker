import { getLocales } from "expo-localization";

import { resolveRegionDefaults, type RegionDefaults } from "./domain/region";

/**
 * Thin platform wrapper around the pure resolver: reads the device's first locale
 * once and lets `domain/region` decide what is valid.
 *
 * The detected currency is a hint, not a verdict — a user can pick a different one
 * on the region screen, and that choice is persisted over this default.
 */
export function detectRegionDefaults(): RegionDefaults {
  const [device] = getLocales();
  return resolveRegionDefaults({
    regionCode: device?.regionCode,
    currencyCode: device?.currencyCode,
    languageTag: device?.languageTag,
  });
}
