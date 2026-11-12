import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../../lib/theme";

export type CardProps = {
  children: ReactNode;
  variant?: "surface" | "ink" | "muted";
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * One card surface. In dark mode shadows vanish into the canvas, so every card
 * also carries the 1 px `cardBorder` outline (transparent in light mode).
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
          borderWidth: 1,
          borderColor: theme.colors.cardBorder,
          padding: padded ? 18 : 0,
          overflow: "hidden",
        },
        variant === "ink" ? theme.shadow.lift : theme.shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
