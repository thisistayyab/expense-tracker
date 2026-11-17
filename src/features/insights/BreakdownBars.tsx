import { StyleSheet, Text, View } from "react-native";
import {
  AppIcon,
  CategoryTile,
  Money,
  ProgressBar,
  TactilePressable,
} from "../../components/ui";
import type { BreakdownRow } from "../../lib/domain/insights";
import { formatMoneySpoken } from "../../lib/format/money";
import { categoryRamp, FONT_FAMILIES, useTheme } from "../../lib/theme";

/**
 * Interactive category spend breakdown with spring-animated bars, squircle
 * tiles, and tabular figures.
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
    <View style={styles.list}>
      {rows.map((row, index) => {
        const color = row.color ?? categoryRamp[index % categoryRamp.length];
        const pct = Math.round(row.share * 100);
        const tappable = Boolean(row.categoryId && onPressCategory);

        const body = (
          <View style={styles.rowWrap}>
            <CategoryTile icon={row.icon} color={color} size={36} />
            <View style={styles.rowMain}>
              <View style={styles.topLine}>
                <Text
                  style={[theme.text.bodyStrong, styles.name, { color: theme.colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {row.name}
                </Text>
                <View style={styles.rightMeta}>
                  <Money
                    minor={row.amountMinor}
                    currency={currency}
                    tone="default"
                    style={[theme.text.bodyStrong, { color: theme.colors.textPrimary }]}
                  />
                  <View
                    style={[
                      styles.pctPill,
                      {
                        backgroundColor:
                          theme.scheme === "dark" ? `${color}28` : `${color}16`,
                      },
                    ]}
                  >
                    <Text
                      maxFontSizeMultiplier={1.25}
                      style={[
                        theme.text.caption,
                        styles.pctText,
                        { color: theme.scheme === "dark" ? theme.colors.textPrimary : color },
                      ]}
                    >
                      {pct}%
                    </Text>
                  </View>
                  {tappable ? (
                    <AppIcon
                      name="chevronRight"
                      size={12}
                      color={theme.colors.textTertiary}
                      weight="bold"
                    />
                  ) : null}
                </View>
              </View>
              <ProgressBar value={row.share} height={6} color={color} />
            </View>
          </View>
        );

        const spoken = `${row.name}, ${formatMoneySpoken(row.amountMinor, currency)}, ${pct} percent`;

        return tappable ? (
          <TactilePressable
            key={row.key}
            onPress={() => onPressCategory?.(row)}
            accessibilityRole="button"
            accessibilityLabel={spoken}
            scaleTo={0.985}
            radius={14}
            style={styles.rowPress}
          >
            {body}
          </TactilePressable>
        ) : (
          <View
            key={row.key}
            accessible
            accessibilityLabel={spoken}
            style={styles.rowStatic}
          >
            {body}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 8,
    gap: 4,
  },
  rowPress: {
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 8,
    marginHorizontal: -6,
  },
  rowStatic: {
    paddingVertical: 8,
  },
  rowWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowMain: {
    flex: 1,
    gap: 7,
    minWidth: 0,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 15.5,
  },
  rightMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pctPill: {
    minWidth: 38,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    alignItems: "center",
  },
  pctText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILIES.bold,
    fontVariant: ["tabular-nums"],
  },
});
