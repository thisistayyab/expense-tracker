import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../../lib/theme";
import { TactilePressable } from "./TactilePressable";

export type ButtonVariant = "primary" | "accent" | "ghost" | "danger";

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Tactile Apple-style pill button with clean matte surfaces and spring press physics.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = true,
  leftIcon,
  style,
}: ButtonProps) {
  const { theme } = useTheme();
  const { colors, text, radius, shadow } = theme;

  const isGhost = variant === "ghost";
  const isAccent = variant === "accent";
  const isDanger = variant === "danger";
  const height = size === "sm" ? 42 : 54;

  const textColor = isGhost
    ? colors.textPrimary
    : isAccent || isDanger
      ? colors.accentFg
      : colors.solidFg;

  const fillColor = isAccent
    ? colors.accentFill
    : isDanger
      ? colors.danger
      : isGhost
        ? colors.surfaceMuted
        : colors.solid;

  const buttonShadow =
    Platform.OS === "ios"
      ? isAccent
        ? shadow.button
        : isGhost
          ? undefined
          : shadow.card
      : isAccent
        ? shadow.button
        : undefined;

  return (
    <TactilePressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      scaleTo={0.975}
      radius={radius.pill}
      flashColor={
        isGhost
          ? theme.scheme === "dark"
            ? "rgba(255,255,255,0.06)"
            : "rgba(10,18,36,0.05)"
          : "rgba(255,255,255,0.14)"
      }
      style={[
        styles.base,
        {
          height,
          borderRadius: radius.pill,
          borderCurve: "continuous",
          backgroundColor: fillColor,
          borderWidth: isGhost ? StyleSheet.hairlineWidth : 0,
          borderColor: isGhost ? colors.cardBorder : "transparent",
        },
        fullWidth ? styles.full : styles.fit,
        buttonShadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon}
          <Text
            style={[
              size === "sm" ? text.caption : text.label,
              {
                color: textColor,
                fontWeight: "600",
                fontSize: size === "sm" ? 14 : 16,
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      )}
    </TactilePressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  full: { width: "100%" },
  fit: { alignSelf: "flex-start" },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
