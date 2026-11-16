import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Money } from "../../components/ui";
import type { SpendBucket } from "../../lib/domain/overview-analytics";
import { formatMoneySpoken } from "../../lib/format/money";
import { haptics } from "../../lib/haptics";
import { SPRING_SETTLE } from "../../lib/motion";
import { useTheme } from "../../lib/theme";

const PLOT_HEIGHT = 82;

function Bar({
  height,
  highlighted,
  delay,
}: {
  height: number;
  highlighted: boolean;
  delay: number;
}) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const currentHeight = useSharedValue(reduceMotion ? height : 0);

  useEffect(() => {
    if (reduceMotion) {
      currentHeight.value = withTiming(height, { duration: 0 });
    } else {
      currentHeight.value = withDelay(delay, withSpring(height, SPRING_SETTLE));
    }
  }, [currentHeight, delay, height, reduceMotion]);

  const barStyle = useAnimatedStyle(() => ({
    height: currentHeight.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        barStyle,
        {
          backgroundColor: highlighted
            ? theme.colors.accentFill
            : theme.scheme === "dark"
              ? "rgba(255, 255, 255, 0.16)"
              : "rgba(12, 15, 24, 0.12)",
        },
      ]}
    />
  );
}

/**
 * Interactive Apple-style rounded spend cadence bars with frosted inspection pill.
 */
export function SpendBars({
  buckets,
  currency,
  averageMinor,
}: {
  buckets: readonly SpendBucket[];
  currency: string;
  averageMinor: number;
}) {
  const { theme } = useTheme();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const max = Math.max(1, ...buckets.map((bucket) => bucket.spentMinor));
  const avgHeight =
    averageMinor > 0 ? Math.min(PLOT_HEIGHT - 2, (averageMinor / max) * PLOT_HEIGHT) : 0;

  const activeBucket =
    buckets.find((b) => b.key === selectedKey) ??
    buckets.find((b) => b.isCurrent) ??
    buckets[buckets.length - 1];

  return (
    <View style={styles.root}>
      {activeBucket ? (
        <View
          style={[
            styles.readoutPill,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.cardBorder,
            },
          ]}
        >
          <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>
            {activeBucket.rangeLabel}
          </Text>
          <Money
            minor={activeBucket.spentMinor}
            currency={currency}
            tone="default"
            style={[theme.text.caption, { color: theme.colors.textPrimary, fontWeight: "700" }]}
          />
        </View>
      ) : null}

      <View style={styles.plotWrap}>
        {avgHeight > 4 ? (
          <View
            pointerEvents="none"
            style={[
              styles.averageLine,
              {
                bottom: avgHeight,
                borderColor:
                  theme.scheme === "dark" ? "rgba(255,255,255,0.16)" : "rgba(10,18,36,0.14)",
              },
            ]}
          />
        ) : null}

        <View style={styles.barsRow}>
          {buckets.map((bucket, index) => {
            const rawHeight = Math.round((bucket.spentMinor / max) * PLOT_HEIGHT);
            const barHeight = bucket.spentMinor > 0 ? Math.max(7, rawHeight) : 4;
            const highlighted = activeBucket?.key === bucket.key;

            return (
              <Pressable
                key={bucket.key}
                onPress={() => {
                  haptics.selection();
                  setSelectedKey((prev) => (prev === bucket.key ? null : bucket.key));
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${bucket.rangeLabel}: ${formatMoneySpoken(
                  bucket.spentMinor,
                  currency,
                )}`}
                style={styles.column}
              >
                <View style={styles.barSlot}>
                  <Bar
                    height={barHeight}
                    highlighted={highlighted}
                    delay={Math.min(index, 6) * 28}
                  />
                </View>
                <Text
                  style={[
                    theme.text.caption,
                    {
                      marginTop: 6,
                      color: highlighted ? theme.colors.accent : theme.colors.textTertiary,
                      fontWeight: highlighted ? "700" : "500",
                      fontSize: 11.5,
                      fontVariant: ["tabular-nums"],
                    },
                  ]}
                  numberOfLines={1}
                >
                  {bucket.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 12,
    gap: 10,
  },
  readoutPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  plotWrap: {
    position: "relative",
    height: PLOT_HEIGHT + 24,
    justifyContent: "flex-end",
  },
  averageLine: {
    position: "absolute",
    left: 0,
    right: 0,
    marginBottom: 22,
    borderTopWidth: 1,
    borderStyle: "dashed",
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  column: {
    flex: 1,
    alignItems: "center",
  },
  barSlot: {
    width: "100%",
    height: PLOT_HEIGHT,
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: 8,
    borderCurve: "continuous",
    overflow: "hidden",
  },
});
