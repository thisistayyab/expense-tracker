import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../../lib/theme";

/**
 * True when the native liquid-glass view can render. Checked once at module load
 * and guarded: an iOS 26 beta without the API must fall back, not crash.
 */
export const liquidGlass = (() => {
  if (Platform.OS !== "ios") return false;
  try {
    return isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
})();

export type GlassTone = "thin" | "regular" | "thick";

export type GlassProps = {
  children?: ReactNode;
  tone?: GlassTone;
  radius?: number;
  padded?: boolean;
  interactive?: boolean;
  tintColor?: ColorValue;
  style?: StyleProp<ViewStyle>;
  /** Kept for API compatibility; the native material supplies its own sheen. */
  sheen?: boolean;
};

/**
 * Liquid Glass where the OS provides it, a translucent material everywhere else.
 * Chrome only — the tab capsule, sheets, floating controls — because glass over
 * glass (or glass under body text) is what makes an interface look muddy.
 */
export function Glass({
  children,
  tone = "regular",
  radius,
  padded = false,
  interactive = false,
  tintColor,
  style,
}: GlassProps) {
  const { theme } = useTheme();
  const corner = radius ?? theme.radius.card;

  const fill =
    tone === "thin"
      ? theme.colors.glassThin
      : tone === "thick"
        ? theme.colors.glassThick
        : theme.colors.glass;

  const sized = [padded ? styles.padded : null, style];

  if (liquidGlass) {
    return (
      <GlassView
        colorScheme={theme.scheme}
        glassEffectStyle={tone === "thick" ? "regular" : "clear"}
        isInteractive={interactive}
        tintColor={tintColor}
        style={[{ borderRadius: corner, overflow: "hidden" }, sized]}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: fill,
          borderRadius: corner,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: theme.colors.glassBorder,
          overflow: "hidden",
        },
        sized,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 16 },
});
