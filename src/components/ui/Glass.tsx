import { BlurView } from "expo-blur";
import { GlassContainer, GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme";

/**
 * True when the runtime provides iOS 26+ UIKit Liquid Glass (`UIGlassEffect`).
 * Callers avoid animating `opacity` directly on GlassView parents per Expo SDK 58 docs.
 */
export const liquidGlass = (() => {
  if (Platform.OS !== "ios") return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
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
  /** Adds a subtle top-edge light catch and diagonal optical sheen on blurred glass. */
  sheen?: boolean;
};

const BLUR_INTENSITY: Record<GlassTone, number> = {
  thin: 30,
  regular: 52,
  thick: 78,
};

/**
 * Native iOS Liquid Glass when supported, or hardware-accelerated BlurView +
 * optical specular highlight + frosted tint everywhere else.
 */
export function Glass({
  children,
  tone = "regular",
  radius,
  padded = false,
  interactive = false,
  tintColor,
  style,
  sheen = true,
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
        style={[{ borderRadius: corner, borderCurve: "continuous", overflow: "hidden" }, sized]}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        {
          borderRadius: corner,
          borderCurve: "continuous",
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.scheme === "dark" ? theme.colors.glassBorder : theme.colors.cardBorder,
          backgroundColor:
            Platform.OS === "android"
              ? typeof tintColor === "string"
                ? tintColor
                : tone === "thin"
                  ? theme.colors.surfaceMuted
                  : theme.scheme === "dark"
                    ? "#181B23"
                    : "#FFFFFF"
              : undefined,
        },
        sized,
      ]}
    >
      {Platform.OS === "ios" || Platform.OS === "web" ? (
        <>
          <BlurView
            pointerEvents="none"
            tint={theme.colors.blurTint}
            intensity={BLUR_INTENSITY[tone]}
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: typeof tintColor === "string" ? tintColor : fill },
            ]}
          />
        </>
      ) : null}
      {children}
    </View>
  );
}

export type GlassGroupProps = {
  children: ReactNode;
  spacing?: number;
  style?: StyleProp<ViewStyle>;
};

/** Groups sibling Glass surfaces so iOS 26 merges nearby Liquid Glass boundaries cleanly. */
export function GlassGroup({ children, spacing = 12, style }: GlassGroupProps) {
  if (liquidGlass) {
    return (
      <GlassContainer spacing={spacing} style={style}>
        {children}
      </GlassContainer>
    );
  }
  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({
  padded: { padding: 16 },
});
