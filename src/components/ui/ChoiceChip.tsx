import type { ReactNode } from "react";
import { Platform, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme";
import { TactilePressable } from "./TactilePressable";

export type ChoiceChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** `accent` is the translucent tinted chip look; `solid` is the primary segmented pill look. */
  tone?: "solid" | "accent";
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Interactive Apple-style capsule chip with smooth matte contrast and spring press physics.
 */
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
  const isAccentTone = tone === "accent";

  const fg = selected
    ? isAccentTone
      ? theme.colors.accent
      : theme.colors.solidFg
    : theme.colors.textPrimary;

  return (
    <TactilePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      scaleTo={0.96}
      radius={999}
      style={[
        styles.chip,
        selected && !isAccentTone && Platform.OS === "ios" ? theme.shadow.chip : null,
        {
          borderRadius: theme.radius.chip,
          borderCurve: "continuous",
          borderColor: selected
            ? isAccentTone
              ? `${theme.colors.accent}44`
              : "transparent"
            : theme.colors.cardBorder,
          backgroundColor: selected
            ? isAccentTone
              ? theme.colors.accentSoft
              : theme.colors.solid
            : theme.colors.surfaceMuted,
        },
        style,
      ]}
    >
      {leading}
      <Text style={[theme.text.caption, styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </TactilePressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    overflow: "hidden",
  },
  label: {
    fontWeight: "600",
    fontSize: 13.5,
  },
});
