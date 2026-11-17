import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme";

export type CardProps = {
  children: ReactNode;
  variant?: "surface" | "ink" | "muted" | "glass";
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Clean continuous-corner surface card (or smoked obsidian hero card for "ink").
 * Uses opaque stepped tonal surfaces so edges stay velvet-smooth on iOS and Android.
 */
export function Card({ children, variant = "surface", padded = true, style }: CardProps) {
  const { theme } = useTheme();
  const flat = StyleSheet.flatten(style);
  const corner =
    typeof flat?.borderRadius === "number"
      ? flat.borderRadius
      : variant === "ink"
        ? theme.radius.hero
        : theme.radius.card;

  const isInk = variant === "ink";
  const isMuted = variant === "muted";
  const isGlass = variant === "glass";

  const shadowStyle = isInk
    ? Platform.OS === "ios"
      ? theme.shadow.lift
      : undefined
    : isMuted
      ? undefined
      : theme.shadow.card;

  return (
    <View
      style={[
        shadowStyle,
        {
          borderRadius: corner,
          borderCurve: "continuous",
          backgroundColor: isInk
            ? theme.colors.ink
            : isMuted
              ? theme.colors.surfaceMuted
              : theme.colors.surface,
          padding: padded ? theme.space.xl : 0,
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: corner,
            borderCurve: "continuous",
            overflow: "hidden",
            borderWidth: isMuted ? 0 : StyleSheet.hairlineWidth,
            borderColor: isInk
              ? theme.colors.inkBorder
              : isGlass && theme.scheme === "dark"
                ? theme.colors.glassBorder
                : theme.colors.cardBorder,
          },
        ]}
      >
        {isInk ? (
          <LinearGradient
            colors={[theme.colors.heroFrom, theme.colors.heroTo]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </View>
      {children}
    </View>
  );
}
