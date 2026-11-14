import {
  ActivityIndicator,
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../../lib/theme";

export type ButtonVariant = "primary" | "accent" | "ghost" | "danger";

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}: ButtonProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const backgroundColor =
    variant === "primary"
      ? colors.solid
      : variant === "accent"
        ? colors.accent
        : "transparent";

  const foregroundColor =
    variant === "primary"
      ? colors.solidFg
      : variant === "accent"
        ? colors.accentFg
        : variant === "danger"
          ? colors.danger
          : colors.accent;

  const height = size === "md" ? 56 : 44;
  const isInactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={({ pressed }) => [
        {
          minHeight: height,
          paddingVertical: 8,
          borderRadius: height / 2,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 20,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          backgroundColor,
          opacity: isInactive ? 0.45 : pressed ? 0.86 : 1,
        },
        variant === "accent" ? theme.shadow.fab : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={foregroundColor} /> : null}
      <Text style={[theme.text.title3, { color: foregroundColor }]}>{label}</Text>
    </Pressable>
  );
}
