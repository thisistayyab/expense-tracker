import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../../lib/theme";
import { liquidGlass } from "./Glass";
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
  style?: StyleProp<ViewStyle>;
};

/**
 * A filled capsule is layered glass, not a flat fill: a tinted vertical gradient
 * (light at the top edge, deep at the bottom), a white specular wash across the
 * upper half, a hairline rim where the light catches the edge, and a coloured
 * shadow underneath. Those four layers read as glass on any device — the native
 * `GlassView` is added on iOS 26 rather than being the only source of the effect.
 */
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
  const filled = variant === "primary" || variant === "accent";

  const foregroundColor = filled
    ? colors.accentFg
    : variant === "danger"
      ? colors.danger
      : colors.accent;

  const height = size === "md" ? 50 : 40;
  const corner = height / 2;
  const isInactive = disabled || loading;

  return (
    <TactilePressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      haptic={isInactive ? "none" : "tick"}
      radius={corner}
      flashColor={filled ? "rgba(255,255,255,0.22)" : "rgba(20,23,19,0.06)"}
      style={[
        {
          minHeight: height,
          paddingVertical: 8,
          borderRadius: corner,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 22,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          overflow: "hidden",
          backgroundColor: filled
            ? colors.accentFill
            : variant === "danger"
              ? colors.accentSoft
              : "transparent",
          borderWidth: filled ? StyleSheet.hairlineWidth : 0,
          borderColor: filled ? colors.accentRim : "transparent",
          opacity: isInactive ? 0.4 : 1,
        },
        filled ? theme.shadow.button : null,
        style,
      ]}
    >
      {filled ? (
        <LinearGradient
          colors={[colors.accentTop, colors.accentBottom]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {filled && liquidGlass ? (
        <GlassView
          pointerEvents="none"
          glassEffectStyle="clear"
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {filled ? (
        // The specular runs the full capsule and fades through three stops, so
        // there is no edge where the highlight stops — a hard band across the
        // middle is what made the previous version read as glossy plastic.
        <LinearGradient
          colors={["rgba(255,255,255,0.30)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0)"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {loading ? <ActivityIndicator color={foregroundColor} /> : null}
      <Text style={[theme.text.label, { color: foregroundColor }]}>{label}</Text>
    </TactilePressable>
  );
}

