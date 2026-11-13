import { Pressable, Text, View } from "react-native";

import type { BreakdownRow } from "../../lib/domain/insights";
import { formatMoney } from "../../lib/format/money";
import { useTheme } from "../../lib/theme";

/**
 * Horizontal bars, never a pie (03): many categories stay comparable and every row
 * carries its amount and share as text, so the bar is decoration rather than the
 * only representation.
 *
 * Only real categories are pressable. "Other" and "Uncategorized" have no id to
 * filter a list by, so they are plain rows instead of dead buttons.
 */
export function BreakdownBars({
  rows,
  currency,
  onPressCategory,
}: {
  rows: readonly BreakdownRow[];
  currency: string;
  onPressCategory?: (row: BreakdownRow) => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ marginTop: 10 }}>
      {rows.map((row) => {
        const percent = Math.round(row.share * 100);
        const interactive = Boolean(row.categoryId && onPressCategory);
        return (
          <Pressable
            key={row.key}
            disabled={!interactive}
            onPress={() => onPressCategory?.(row)}
            accessibilityRole={interactive ? "button" : undefined}
            accessibilityLabel={`${row.name}, ${formatMoney(row.amountMinor, currency)}, ${percent}% of spending${
              interactive ? ". Show matching transactions" : ""
            }`}
            style={({ pressed }) => ({
              paddingVertical: 8,
              opacity: pressed && interactive ? 0.6 : 1,
            })}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text
                numberOfLines={1}
                style={[theme.text.label, { color: theme.colors.textPrimary, flex: 1 }]}
              >
                {row.name}
              </Text>
              <Text
                style={[
                  theme.text.caption,
                  {
                    color: theme.colors.textSecondary,
                    fontVariant: ["tabular-nums"],
                  },
                ]}
              >
                {`${formatMoney(row.amountMinor, currency)} · ${percent}%`}
              </Text>
            </View>
            <View
              style={{
                marginTop: 6,
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.colors.surfaceMuted,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${Math.max(2, Math.min(100, row.share * 100))}%`,
                  height: "100%",
                  borderRadius: 4,
                  backgroundColor: row.color ?? theme.colors.textTertiary,
                }}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
