import { BlurView } from "expo-blur";
import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { INSIGHT_PERIOD_OPTIONS, type InsightPeriod } from "../../lib/domain/insights";
import { haptics } from "../../lib/haptics";
import { SPRING_SNAPPY } from "../../lib/motion";
import { FONT_FAMILIES, useTheme } from "../../lib/theme";

type SegmentRect = { x: number; width: number };

/**
 * Animated iOS glass segmented control with spring-gliding thumb pill.
 */
export function PeriodControl({
  value,
  onChange,
}: {
  value: InsightPeriod;
  onChange: (next: InsightPeriod) => void;
}) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [rects, setRects] = useState<Partial<Record<InsightPeriod, SegmentRect>>>({});

  const thumbX = useSharedValue(0);
  const thumbW = useSharedValue(0);
  const thumbReady = useSharedValue(0);

  useEffect(() => {
    const rect = rects[value];
    if (!rect || rect.width <= 0) return;

    if (thumbReady.value === 0 || reduceMotion) {
      thumbX.value = rect.x;
      thumbW.value = rect.width;
      thumbReady.value = 1;
    } else {
      thumbX.value = withSpring(rect.x, SPRING_SNAPPY);
      thumbW.value = withSpring(rect.width, SPRING_SNAPPY);
    }
  }, [rects, reduceMotion, thumbReady, thumbW, thumbX, value]);

  const thumbStyle = useAnimatedStyle(() => ({
    opacity: thumbReady.value,
    width: thumbW.value,
    transform: [{ translateX: thumbX.value }],
  }));

  const isSelected = (opt: InsightPeriod) => value === opt;

  return (
    <View style={styles.outer}>
      <View
        style={[
          styles.track,
          Platform.OS === "ios" ? theme.shadow.chip : null,
          {
            backgroundColor:
              Platform.OS === "android" ? theme.colors.surface : theme.colors.glass,
            borderColor: theme.colors.cardBorder,
          },
        ]}
      >
        {Platform.OS === "ios" || Platform.OS === "web" ? (
          <BlurView
            pointerEvents="none"
            tint={theme.colors.blurTint}
            intensity={46}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollRow}
        >
          <View style={styles.itemsWrap}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.thumb,
                theme.scheme === "light" ? theme.shadow.chip : null,
                {
                  backgroundColor:
                    theme.scheme === "dark"
                      ? theme.colors.surfaceMuted
                      : theme.colors.surface,
                  borderColor:
                    theme.scheme === "dark"
                      ? "transparent"
                      : theme.colors.cardBorder,
                },
                thumbStyle,
              ]}
            />
            {INSIGHT_PERIOD_OPTIONS.map((option) => {
              const selected = isSelected(option.value);
              return (
                <Pressable
                  key={option.value}
                  onLayout={(event) => {
                    const { x, width } = event.nativeEvent.layout;
                    setRects((prev) => {
                      const prevRect = prev[option.value];
                      if (
                        prevRect &&
                        Math.abs(prevRect.x - x) < 0.5 &&
                        Math.abs(prevRect.width - width) < 0.5
                      ) {
                        return prev;
                      }
                      return { ...prev, [option.value]: { x, width } };
                    });
                  }}
                  onPress={() => {
                    if (option.value !== value) {
                      haptics.selection();
                      onChange(option.value);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={option.accessibilityLabel}
                  accessibilityState={{ selected }}
                  style={styles.segment}
                >
                  <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.25}
                    style={[
                      theme.text.caption,
                      {
                        color: selected ? theme.colors.textPrimary : theme.colors.textSecondary,
                        fontFamily: selected ? FONT_FAMILIES.bold : FONT_FAMILIES.medium,
                        fontSize: 13.5,
                        flexShrink: 1,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginTop: 14,
  },
  track: {
    borderRadius: 999,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  scrollRow: {
    padding: 4,
    flexGrow: 1,
  },
  itemsWrap: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    flexGrow: 1,
  },
  thumb: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  segment: {
    flexGrow: 1,
    minHeight: 34,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});
