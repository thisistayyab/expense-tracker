import { useFonts } from "expo-font";

/**
 * Geist variable (OFL). The mockups render the same file through @font-face, so
 * design review and the app can never drift apart.
 */
export const FONT_FAMILY = "Geist";

export function useAppFonts() {
  return useFonts({
    [FONT_FAMILY]: require("../../../assets/fonts/Geist-Variable.ttf"),
  });
}
