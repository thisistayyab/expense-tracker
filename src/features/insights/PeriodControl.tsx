import { Pressable, ScrollView, Text, View } from "react-native";

import { INSIGHT_PERIOD_OPTIONS, type InsightPeriod } from "../../lib/domain/insights";
import { useTheme } from "../../lib/theme";

/**
 * Segmented period switch (07). Five labels do not fit four equal segments, so the
 * track scrolls only when it must; each segment stays a 32 pt target with an
 * explicit selected state for screen readers.
 */
export function PeriodControl({
  value,
  onChange,
}: {
  value: InsightPeriod;
  onChange: (next: InsightPeriod) => void;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        marginTop: 14,
        padding: 3,
        borderRadius: 18,
        backgroundColor: theme.colors.surfaceMuted,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, gap: 2 }}
      >
        {INSIGHT_PERIOD_OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option.accessibilityLabel}
              style={({ pressed }) => ({
                flexGrow: 1,
                minHeight: 32,
                paddingVertical: 4,
                paddingHorizontal: 10,
                borderRadius: 15,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: selected ? theme.colors.solid : "transparent",
                opacity: pressed && !selected ? 0.6 : 1,
              })}
            >
              <Text
                numberOfLines={1}
                style={[
                  theme.text.caption,
                  {
                    fontWeight: "600",
                    color: selected ? theme.colors.solidFg : theme.colors.textSecondary,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
