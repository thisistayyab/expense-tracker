import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SPRING_SNAPPY } from "../../lib/motion";
import { useTheme } from "../../lib/theme";

export type PagerProps = {
  /** Zero-based index of the active dot. */
  active: number;
  total?: number;
  tone?: "default" | "ink";
};

function Dot({
  isActive,
  activeColor,
  idleColor,
}: {
  isActive: boolean;
  activeColor: string;
  idleColor: string;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(isActive ? 1 : 0, { duration: 0 })
      : withSpring(isActive ? 1 : 0, SPRING_SNAPPY);
  }, [isActive, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: 6 + progress.value * 16,
    backgroundColor: interpolateColor(progress.value, [0, 1], [idleColor, activeColor]),
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

/** Morphing iOS onboarding capsule dots. */
export function Pager({ active, total = 3, tone = "default" }: PagerProps) {
  const { theme } = useTheme();
  const activeColor = tone === "ink" ? theme.colors.onInk : theme.colors.accent;
  const idleColor =
    tone === "ink"
      ? "rgba(255,255,255,0.28)"
      : theme.scheme === "dark"
        ? "rgba(255,255,255,0.22)"
        : "rgba(15,23,42,0.16)";

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Step ${active + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <Dot
          key={index}
          isActive={index === active}
          activeColor={activeColor}
          idleColor={idleColor}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
});
