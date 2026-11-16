import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SPRING_SETTLE } from "../../lib/motion";
import { useTheme } from "../../lib/theme";

export type ProgressState = "normal" | "warning" | "over";

export type ProgressBarProps = {
  /** 0–1 is on budget; anything above 1 renders as "over". */
  value: number;
  height?: number;
  /** Force a state instead of deriving it from the value. */
  state?: ProgressState;
  color?: string;
  /** Track override — smoked glass hero needs an ink-track instead of surfaceSunken. */
  trackColor?: string;
};

export function progressStateFor(value: number): ProgressState {
  if (value >= 1) return "over";
  if (value >= 0.8) return "warning";
  return "normal";
}

/**
 * Smooth Apple Health-style capsule bar with critically damped spring motion and subtle specular top catch.
 */
export function ProgressBar({ value, height = 7, state, color, trackColor }: ProgressBarProps) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const resolvedState = state ?? progressStateFor(value);
  const clamped = Math.max(0, Math.min(value, 1));

  const trackWidth = useSharedValue(0);
  const progress = useSharedValue(reduceMotion ? clamped : 0);

  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(clamped, { duration: 0 })
      : withSpring(clamped, SPRING_SETTLE);
  }, [clamped, progress, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    width: Math.max(trackWidth.value > 0 && progress.value > 0.01 ? height : 0, trackWidth.value * progress.value),
  }));

  const fillColor =
    color ??
    (resolvedState === "over"
      ? theme.colors.danger
      : resolvedState === "warning"
        ? theme.colors.warning
        : theme.colors.accent);

  const trackBg = trackColor ?? theme.colors.surfaceSunken;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      onLayout={(event) => {
        trackWidth.value = event.nativeEvent.layout.width;
      }}
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackBg,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: fillColor,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    overflow: "hidden",
  },
});
