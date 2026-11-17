import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { FadeIn, ReduceMotion, useReducedMotion } from "react-native-reanimated";
import { useTheme } from "../../lib/theme";
import { AppIcon } from "./AppIcon";
import { TactilePressable } from "./TactilePressable";

export type MonthSelectorProps = {
  label: string;
  onPrevious?: () => void;
  onNext?: () => void;
  onPressLabel?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
};

/**
 * Frosted glass month capsule that shows only active navigation arrows and lets
 * the user tap the month label to pick any month directly.
 */
export function MonthSelector({
  label,
  onPrevious,
  onNext,
  onPressLabel,
  canGoPrevious = false,
  canGoNext = false,
}: MonthSelectorProps) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();

  const showPrevious = Boolean(canGoPrevious && onPrevious);
  const showNext = Boolean(canGoNext && onNext);
  const buttonFill =
    theme.scheme === "dark" ? "rgba(255, 255, 255, 0.09)" : "rgba(12, 15, 24, 0.06)";

  const arrow = (
    direction: "chevronLeft" | "chevronRight",
    onPress: () => void,
    accessibilityLabel: string,
  ) => (
    <TactilePressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      scaleTo={0.86}
      radius={999}
      style={[styles.arrow, { backgroundColor: buttonFill }]}
    >
      <AppIcon name={direction} size={15} color={theme.colors.textPrimary} weight="bold" />
    </TactilePressable>
  );

  const labelContent = (
    <View style={styles.labelWrap}>
      <Animated.Text
        key={label}
        numberOfLines={1}
        entering={reduceMotion ? undefined : FadeIn.duration(160).reduceMotion(ReduceMotion.System)}
        accessibilityLiveRegion="polite"
        style={[theme.text.label, { color: theme.colors.textPrimary, flexShrink: 1 }]}
      >
        {label}
      </Animated.Text>
    </View>
  );

  return (
    <View
      style={[
        styles.pill,
        Platform.OS === "ios" ? theme.shadow.chip : null,
        {
          paddingLeft: showPrevious ? 5 : 16,
          paddingRight: showNext ? 5 : 16,
          backgroundColor:
            Platform.OS === "android" ? theme.colors.surface : theme.colors.glass,
          borderColor:
            theme.scheme === "dark" ? theme.colors.glassBorder : theme.colors.cardBorder,
        },
      ]}
    >
      {Platform.OS === "ios" || Platform.OS === "web" ? (
        <View pointerEvents="none" style={styles.blurClip}>
          <BlurView
            pointerEvents="none"
            tint={theme.colors.blurTint}
            intensity={44}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : null}
      {showPrevious && onPrevious ? arrow("chevronLeft", onPrevious, "Previous month") : null}
      {onPressLabel ? (
        <TactilePressable
          onPress={onPressLabel}
          accessibilityRole="button"
          accessibilityLabel={`${label}, select month`}
          hitSlop={6}
          haptic="selection"
          scaleTo={0.96}
          radius={14}
          style={styles.labelPress}
        >
          {labelContent}
        </TactilePressable>
      ) : (
        labelContent
      )}
      {showNext && onNext ? arrow("chevronRight", onNext, "Next month") : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    flexShrink: 1,
    minHeight: 40,
    borderRadius: 999,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 5,
    gap: 4,
  },
  blurClip: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    overflow: "hidden",
  },
  arrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  labelPress: {
    flexShrink: 1,
  },
  labelWrap: {
    flexShrink: 1,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
