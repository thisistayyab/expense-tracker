import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

import { useTheme } from "../../lib/theme";

/**
 * The screen canvas: warm paper with a barely-there vertical wash. Flat white on
 * flat grey is the look the rest of the app is trying to escape, so the canvas is
 * the one place a gradient earns its keep — it gives the flat cards something to
 * sit on.
 */
export function ScreenBackground() {
  const { theme } = useTheme();

  return (
    <LinearGradient
      pointerEvents="none"
      colors={[theme.colors.bgTop, theme.colors.bgBottom]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
