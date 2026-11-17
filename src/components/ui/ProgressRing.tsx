import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { SPRING_SETTLE } from "../../lib/motion";
import { useTheme } from "../../lib/theme";

export type ProgressRingProps = {
  /** 0–1 is on budget; anything above 1 renders as a full ring. */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: ReactNode;
  accessibilityLabel?: string;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Animated circular ring gauge using critically damped UIKit-like spring motion.
 */
export function ProgressRing({
  value,
  size = 82,
  stroke = 8,
  color,
  trackColor,
  children,
  accessibilityLabel,
}: ProgressRingProps) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const safeValue = Number.isFinite(value) ? value : 0;
  const clamped = Math.max(0, Math.min(safeValue, 1));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(reduceMotion ? clamped : 0);

  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(clamped, { duration: 0 })
      : withSpring(clamped, SPRING_SETTLE);
  }, [clamped, progress, reduceMotion]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
    strokeOpacity: progress.value <= 0.001 ? 0 : 1,
  }));

  const resolvedColor = color ?? (safeValue >= 1 ? theme.colors.danger : theme.colors.accent);
  const resolvedTrack = trackColor ?? theme.colors.surfaceSunken;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.wrap, { width: size, height: size }]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedTrack}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedCircleProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          fill="none"
        />
      </Svg>
      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});
