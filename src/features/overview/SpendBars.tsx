import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

import type { SpendBucket } from "../../lib/domain/overview-analytics";
import { formatMoneySpoken } from "../../lib/format/money";
import { useTheme } from "../../lib/theme";

const PLOT_HEIGHT = 72;

function Bar({
  height,
  color,
  highlighted,
  delay,
}: {
  height: number;
  color: string;
  highlighted: boolean;
  delay: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    // A spring per bar, 35 ms apart: the chart fills like a row of switches being
    // thrown, not like a CSS transition of everything at once.
    progress.value = withDelay(
      delay,
      withSpring(1, { damping: 18, stiffness: 170, mass: 0.9 }),
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    height: Math.max(1, progress.value * height),
  }));

  return (
    <Animated.View
      style={[
        {
          width: "100%",
          maxWidth: 32,
          borderRadius: 4,
          backgroundColor: color,
          opacity: highlighted ? 1 : 0.24,
        },
        style,
      ]}
    />
  );
}

/**
 * Spending across the month in seven-day buckets. The whole chart is one
 * accessible image and the labels below carry the dates, so nothing depends on
 * reading a bar's height.
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
  const max = Math.max(1, ...buckets.map((bucket) => bucket.spentMinor));
  const currentIndex = buckets.findIndex((bucket) => bucket.isCurrent);
  const highlightIndex = currentIndex >= 0 ? currentIndex : Math.max(0, buckets.length - 1);
  const averageBottom =
    averageMinor > 0 ? Math.min(PLOT_HEIGHT, (averageMinor / max) * PLOT_HEIGHT) : null;

  const summary = buckets
    .map((bucket) => `${bucket.rangeLabel}: ${formatMoneySpoken(bucket.spentMinor, currency)}`)
    .join(". ");

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Spending by week. ${summary}`}
      style={{ marginTop: 16 }}
    >
      <View style={{ height: PLOT_HEIGHT }}>
        {averageBottom !== null ? (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: averageBottom,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderStyle: "dashed",
              borderTopColor: theme.colors.textTertiary,
            }}
          />
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: PLOT_HEIGHT }}>
          {buckets.map((bucket, index) => (
            <View
              key={bucket.key}
              style={{
                flex: 1,
                height: PLOT_HEIGHT,
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <Bar
                height={Math.max(3, Math.round((bucket.spentMinor / max) * PLOT_HEIGHT))}
                color={theme.colors.accent}
                highlighted={index === highlightIndex}
                delay={index * 35}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        {buckets.map((bucket, index) => (
          <Text
            key={bucket.key}
            style={[
              theme.text.caption,
              {
                flex: 1,
                textAlign: "center",
                fontSize: 11,
                lineHeight: 14,
                fontVariant: ["tabular-nums"],
                color:
                  index === highlightIndex
                    ? theme.colors.textSecondary
                    : theme.colors.textTertiary,
              },
            ]}
          >
            {bucket.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
