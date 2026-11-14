import type { ReactNode } from "react";
import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../../lib/theme";

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
  const selectedBackground =
    tone === "accent" ? theme.colors.accentSoft : theme.colors.solid;
  const selectedForeground = tone === "accent" ? theme.colors.accent : theme.colors.solidFg;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        {
          minHeight: 34,
          minWidth: 34,
          paddingVertical: 6,
          paddingHorizontal: 14,
          borderRadius: 17,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: selected ? selectedBackground : theme.colors.surfaceSunken,
          opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
        },
        style,
      ]}
    >
      {leading}
      <Text
        style={[
          theme.text.caption,
          {
            fontWeight: "600",
            color: selected ? selectedForeground : theme.colors.textSecondary,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
