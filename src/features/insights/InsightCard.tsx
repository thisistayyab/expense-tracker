import { Text, View } from "react-native";

import type { InsightCardData } from "../../lib/domain/insights";
import { useTheme } from "../../lib/theme";

/**
 * One sentence per card, with only the number bold (07). No gradient dependency is
 * installed, so the card uses the accentSoft surface the gradient was built from;
 * the inset and radius match the design.
 */
export function InsightCard({ card }: { card: InsightCardData }) {
  const { theme } = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={card.segments.map((segment) => segment.text).join("")}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 16,
        borderRadius: 22,
        backgroundColor: theme.colors.accentSoft,
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: theme.colors.accent,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: theme.colors.accentFg, fontSize: 14, fontWeight: "700" }}>✦</Text>
      </View>
      <Text
        style={[
          theme.text.body,
          { flex: 1, fontSize: 13.5, lineHeight: 19, color: theme.colors.textPrimary },
        ]}
      >
        {card.segments.map((segment, index) => (
          <Text key={index} style={segment.strong ? { fontWeight: "700" } : undefined}>
            {segment.text}
          </Text>
        ))}
      </Text>
    </View>
  );
}
