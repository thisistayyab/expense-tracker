import {
  Urbanist_400Regular,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
} from "@expo-google-fonts/urbanist";
import { useFonts } from "expo-font";

/**
 * Urbanist (OFL), loaded as four static faces. React Native cannot switch weights
 * inside one custom family on Android, so each weight is its own family and the
 * type tokens name the face they need.
 */
export const FONT_FAMILIES = {
  regular: "Urbanist_400Regular",
  medium: "Urbanist_500Medium",
  semibold: "Urbanist_600SemiBold",
  bold: "Urbanist_700Bold",
} as const;

export function useAppFonts() {
  return useFonts({
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
  });
}
