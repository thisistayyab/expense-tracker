import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../../lib/theme";

export type CardProps = {
  children: ReactNode;
  variant?: "surface" | "ink" | "muted";
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A flat block with a hairline edge: no drop shadow at all. A shadow on every
 * white card is what makes a screen read as a template — depth here comes from the
 * warm canvas around the card and from glass chrome above it, so the only lift in
 * the app is the floating bar, the sheets and the hero.
 */
export function Card({ children, variant = "surface", padded = true, style }: CardProps) {
  const { theme } = useTheme();

  const backgroundColor =
    variant === "ink"
      ? theme.colors.ink
      : variant === "muted"
        ? theme.colors.surfaceMuted
        : theme.colors.surface;

  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: theme.radius.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: variant === "ink" ? "rgba(255,255,255,0.10)" : theme.colors.cardBorder,
          padding: padded ? 16 : 0,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
