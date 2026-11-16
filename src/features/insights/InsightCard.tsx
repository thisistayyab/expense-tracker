import { StyleSheet, Text, View } from "react-native";
import { AppIcon } from "../../components/ui";
import type { InsightCardData } from "../../lib/domain/insights";
import { useTheme } from "../../lib/theme";

/**
 * Deterministic insight banner with calm tonal tint and SF Symbol badge.
 */
export function InsightCard({ card }: { card: InsightCardData }) {
  const { theme } = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={card.segments.map((segment) => segment.text).join("")}
      style={[
        styles.card,
        theme.shadow.card,
        {
          backgroundColor: theme.colors.insightFrom,
          borderColor: theme.colors.cardBorder,
        },
      ]}
    >
      <View style={[styles.iconTile, { backgroundColor: theme.colors.accentSoft }]}>
        <AppIcon name="sparkles" size={16} color={theme.colors.accent} />
      </View>

      <Text style={[theme.text.body, styles.copy, { color: theme.colors.textPrimary }]}>
        {card.segments.map((segment, index) => (
          <Text
            key={index}
            style={
              segment.strong
                ? {
                    fontFamily: theme.text.bodyStrong.fontFamily,
                    fontWeight: "700",
                    color: theme.colors.textPrimary,
                  }
                : undefined
            }
          >
            {segment.text}
          </Text>
        ))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    lineHeight: 22,
  },
});
