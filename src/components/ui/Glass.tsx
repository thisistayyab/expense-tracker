import { BlurView, type BlurViewProps } from "expo-blur";
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
  /**
   * Overrides the iOS 26 material. `clear` keeps the background visible (cards);
   * `regular` frosts it, which navigation chrome needs so labels stay legible
   * over scrolling content.
   */
  effect?: "regular" | "clear";
  /** Target container ref required by Android `BlurView` to sample background content. */
  blurTarget?: BlurViewProps["blurTarget"];
};

const BLUR_INTENSITY: Record<GlassTone, number> = {
  thin: 30,
  regular: 52,
  thick: 78,
};

const ANDROID_BLUR_INTENSITY: Record<GlassTone, number> = {
  thin: 28,
  regular: 42,
  thick: 60,
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
  effect,
  blurTarget,
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
  const androidBlurred = Platform.OS === "android" && Boolean(blurTarget);
  const useBlur = Platform.OS === "ios" || Platform.OS === "web" || androidBlurred;

  if (liquidGlass) {
    return (
      <GlassView
        colorScheme={theme.scheme}
        glassEffectStyle={effect ?? (tone === "thick" ? "regular" : "clear")}
        isInteractive={interactive}
        tintColor={tintColor}
        style={[{ borderRadius: corner, borderCurve: "continuous", overflow: "hidden" }, sized]}
      >
        {children}
      </GlassView>
    );
  }

  const androidGlassTint =
    theme.scheme === "dark" ? "rgba(24, 27, 36, 0.34)" : "rgba(255, 255, 255, 0.42)";
  const androidFallbackBg =
    tone === "thin"
      ? theme.colors.surfaceMuted
      : theme.scheme === "dark"
        ? "#181B23"
        : "#FFFFFF";

  return (
    <View
      style={[
        {
          borderRadius: corner,
          borderCurve: "continuous",
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor:
            theme.scheme === "dark"
              ? androidBlurred
                ? "rgba(255, 255, 255, 0.16)"
                : theme.colors.glassBorder
              : androidBlurred
                ? "rgba(15, 23, 42, 0.11)"
                : theme.colors.cardBorder,
          backgroundColor:
            Platform.OS === "android" && !androidBlurred
              ? typeof tintColor === "string"
                ? tintColor
                : androidFallbackBg
              : undefined,
        },
        sized,
      ]}
    >
      {useBlur ? (
        <>
          <BlurView
            pointerEvents="none"
            blurTarget={androidBlurred ? blurTarget : undefined}
            blurMethod={androidBlurred ? "dimezisBlurViewSdk31Plus" : undefined}
            blurReductionFactor={androidBlurred ? 3.5 : undefined}
            tint={
              androidBlurred
                ? theme.scheme === "dark"
                  ? "systemThinMaterialDark"
                  : "systemThinMaterialLight"
                : theme.colors.blurTint
            }
            intensity={androidBlurred ? ANDROID_BLUR_INTENSITY[tone] : BLUR_INTENSITY[tone]}
            style={[StyleSheet.absoluteFill, { borderRadius: corner }]}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor:
                  typeof tintColor === "string"
                    ? tintColor
                    : androidBlurred
                      ? androidGlassTint
                      : fill,
              },
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
