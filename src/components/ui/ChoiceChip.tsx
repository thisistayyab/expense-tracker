import type { ReactNode } from "react";
import { StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../../lib/theme";
import { TactilePressable } from "./TactilePressable";

export type ChoiceChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** `accent` is the filter-badge look; `solid` is the primary segmented look. */
  tone?: "solid" | "accent";
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function ChoiceChip({
  label,
  selected = false,
  disabled = false,
  onPress,
  tone = "solid",
  leading,
  style,
  accessibilityLabel,
}: ChoiceChipProps) {
  const { theme } = useTheme();

  // Segmented look: idle chips are outlines on the surface, the chosen one is a
  // solid ink capsule. Every chip is the same height and has the same spring, so a
  // filter row behaves like one instrument.
  const selectedBackground = tone === "accent" ? theme.colors.accentSoft : theme.colors.solid;
  const selectedForeground = tone === "accent" ? theme.colors.accent : theme.colors.solidFg;
  const idleForeground = theme.colors.textSecondary;

  return (
    <TactilePressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      scaleTo={0.95}
      haptic="selection"
      flashColor={selected ? "rgba(255,255,255,0.16)" : "rgba(16,18,23,0.05)"}
      style={[
        {
          minHeight: 34,
          minWidth: 34,
          paddingVertical: 6,
          paddingHorizontal: 14,
          borderRadius: theme.radius.chip,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          overflow: "hidden",
          backgroundColor: selected ? selectedBackground : theme.colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: selected ? "transparent" : theme.colors.cardBorder,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {leading}
      <Text
        style={[
          theme.text.label,
          {
            color: selected ? selectedForeground : idleForeground,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TactilePressable>
  );
}
