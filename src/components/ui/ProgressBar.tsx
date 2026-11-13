import { View } from "react-native";

import { useTheme } from "../../lib/theme";

export type ProgressState = "normal" | "warning" | "over";

export type ProgressBarProps = {
  /** 0–1 is on budget; anything above 1 renders as "over". */
  value: number;
  height?: number;
  /** Force a state instead of deriving it from the value. */
  state?: ProgressState;
  color?: string;
  /** Track override — the ink hero needs a light track instead of surfaceSunken. */
  trackColor?: string;
};

export function progressStateFor(value: number): ProgressState {
  if (value >= 1) return "over";
  if (value >= 0.8) return "warning";
  return "normal";
}

export function ProgressBar({ value, height = 6, state, color, trackColor }: ProgressBarProps) {
  const { theme } = useTheme();
  const resolvedState = state ?? progressStateFor(value);
  const clamped = Math.max(0, Math.min(value, 1));

  const fill =
    color ??
    (resolvedState === "over"
      ? theme.colors.expense
      : resolvedState === "warning"
        ? theme.colors.warning
        : theme.colors.accent);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height,
        borderRadius: height,
        backgroundColor: trackColor ?? theme.colors.surfaceSunken,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: "100%",
          borderRadius: height,
          backgroundColor: fill,
        }}
      />
    </View>
  );
}
