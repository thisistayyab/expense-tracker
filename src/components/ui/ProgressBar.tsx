import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

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

  const track = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    // Spring, not a timed ease: the fill arrives with a little momentum, so a
    // budget that just changed feels like it moved rather than faded in.
    progress.value = withSpring(clamped, { damping: 26, stiffness: 210, mass: 0.9 });
  }, [clamped, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: Math.max(0, progress.value * track.value),
  }));

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
      onLayout={(event) => {
        track.value = event.nativeEvent.layout.width;
      }}
      style={{
        height,
        borderRadius: height,
        backgroundColor: trackColor ?? theme.colors.surfaceSunken,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[
          { height: "100%", borderRadius: height, backgroundColor: fill },
          fillStyle,
        ]}
      />
    </View>
  );
}
