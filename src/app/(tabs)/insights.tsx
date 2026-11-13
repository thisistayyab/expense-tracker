import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_CLEARANCE } from "../../components/navigation/FloatingTabBar";
import { Card, EmptyState, Money, SectionHeader } from "../../components/ui";
import { BreakdownBars } from "../../features/insights/BreakdownBars";
import { InsightCard } from "../../features/insights/InsightCard";
import { PeriodControl } from "../../features/insights/PeriodControl";
import { TrendChart } from "../../features/insights/TrendChart";
import { useInsights } from "../../features/insights/useInsights";
import { exportCsv } from "../../features/settings/dataIO";
import type { Db } from "../../lib/db/types";
import type { BreakdownRow, InsightPeriod } from "../../lib/domain/insights";
import { formatMoney } from "../../lib/format/money";
import { useTheme } from "../../lib/theme";

export default function InsightsScreen() {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<InsightPeriod>("month");
  const [exporting, setExporting] = useState(false);
  const { data, loading, error, refresh } = useInsights(period);
  const firstFocus = useRef(true);

  // A save on another tab must change these numbers without a reload. The first
  // focus is skipped because the hook already loaded on mount.
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return undefined;
      }
      refresh();
      return undefined;
    }, [refresh]),
  );

  const openCategory = (row: BreakdownRow) => {
    if (!row.categoryId || !data) return;
    router.push({
      pathname: "/(tabs)/transactions",
      params: {
        currency: data.currency,
        categoryId: row.categoryId,
        from: data.ranges.current.from,
        to: data.ranges.current.to,
      },
    });
  };

  const monthsWithData =
    data?.trend.filter((point) => point.expenseMinor > 0 || point.incomeMinor > 0).length ?? 0;
  const otherCurrencies = data?.otherCurrency ?? [];
  const otherTotal = otherCurrencies.reduce((sum, row) => sum + row.count, 0);

  const exportLedger = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await exportCsv(db);
      if (!result.shared) {
        Alert.alert("CSV saved", result.uri);
      }
    } catch (cause) {
      Alert.alert("CSV export failed", String(cause));
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
              {data ? `Insights · ${data.currency}` : "Insights"}
            </Text>
            {data?.hasAnyTransaction ? (
              <Pressable
                onPress={() => void exportLedger()}
                disabled={exporting}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Export transactions as CSV"
              >
                <Text
                  style={[
                    theme.text.caption,
                    { color: theme.colors.accent, fontWeight: "600" },
                  ]}
                >
                  {exporting ? "Exporting…" : "Export CSV"}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={[theme.text.title1, { color: theme.colors.textPrimary, marginTop: 4 }]}>
            Where it went
          </Text>

          <PeriodControl value={period} onChange={setPeriod} />

          {error ? (
            <Text style={[theme.text.caption, { color: theme.colors.danger, marginTop: 10 }]}>
              {error}
            </Text>
          ) : null}

          {!data ? (
            <View style={{ paddingTop: 60, alignItems: "center" }}>
              {loading ? <ActivityIndicator color={theme.colors.accent} /> : null}
            </View>
          ) : null}

          {data && !data.hasAnyTransaction ? (
            <Card style={{ marginTop: 16 }}>
              <EmptyState
                title="Nothing to read yet"
                body="Log a few expenses and this tab turns them into a breakdown, a six-month trend and your top items."
                actionLabel="Log your first expense"
                onAction={() => router.push("/add")}
              />
            </Card>
          ) : null}

          {data && data.hasAnyTransaction ? (
            <>
              <Card style={{ marginTop: 14 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
                    Where it went
                  </Text>
                  <Money
                    minor={data.totalSpentMinor}
                    currency={data.currency}
                    size="title3"
                  />
                </View>
                <Text
                  style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 4 }]}
                >
                  {`${data.ranges.rangeLabel} · ${data.breakdown.length ? "tap a category to see its entries" : "no spending recorded"}`}
                </Text>

                {data.breakdown.length ? (
                  <BreakdownBars
                    rows={data.breakdown}
                    currency={data.currency}
                    onPressCategory={openCategory}
                  />
                ) : (
                  <Text
                    style={[
                      theme.text.body,
                      { color: theme.colors.textSecondary, marginTop: 12 },
                    ]}
                  >
                    {`No spending in ${data.ranges.rangeLabel.toLowerCase()}.`}
                  </Text>
                )}
              </Card>

              <Card style={{ marginTop: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
                    Last 6 months
                  </Text>
                  {monthsWithData >= 2 && data.trendDelta ? (
                    <View
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 3,
                        borderRadius: 999,
                        backgroundColor: theme.colors.surfaceSunken,
                      }}
                    >
                      <Text
                        style={[
                          theme.text.caption,
                          {
                            fontWeight: "600",
                            color:
                              data.trendDelta.pct > 0
                                ? theme.colors.expense
                                : data.trendDelta.pct < 0
                                  ? theme.colors.income
                                  : theme.colors.textSecondary,
                          },
                        ]}
                      >
                        {`${data.trendDelta.pct > 0 ? "+" : ""}${data.trendDelta.pct}% vs ${data.trendDelta.monthLabel}`}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {monthsWithData >= 2 ? (
                  <>
                    <TrendChart points={data.trend} currency={data.currency} />
                    <Text
                      style={[
                        theme.text.caption,
                        { color: theme.colors.textTertiary, marginTop: 6 },
                      ]}
                    >
                      {`${data.trend[data.trend.length - 1]?.label ?? "This month"} so far: ${formatMoney(
                        data.trend[data.trend.length - 1]?.expenseMinor ?? 0,
                        data.currency,
                      )}`}
                    </Text>
                  </>
                ) : (
                  <Text
                    style={[
                      theme.text.body,
                      { color: theme.colors.textSecondary, marginTop: 10 },
                    ]}
                  >
                    Trend unlocks after next month — it needs two months of spending to compare.
                  </Text>
                )}
              </Card>

              {data.topItems.length ? (
                <>
                  <SectionHeader title="Top items" />
                  <Card padded={false}>
                    {data.topItems.map((item, index) => (
                      <View
                        key={item.key}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderTopWidth: index === 0 ? 0 : 1,
                          borderTopColor: theme.colors.border,
                        }}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            numberOfLines={1}
                            style={[theme.text.label, { color: theme.colors.textPrimary }]}
                          >
                            {item.label}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[
                              theme.text.caption,
                              { color: theme.colors.textSecondary, marginTop: 2 },
                            ]}
                          >
                            {item.unnamed
                              ? `No item name · ${item.count} ${item.count === 1 ? "entry" : "entries"}`
                              : `${item.count} ${item.count === 1 ? "entry" : "entries"}`}
                          </Text>
                        </View>
                        <Money minor={item.amountMinor} currency={data.currency} />
                      </View>
                    ))}
                  </Card>
                </>
              ) : null}

              {data.cards.length ? (
                <>
                  <SectionHeader title="Patterns" />
                  <View style={{ gap: 10 }}>
                    {data.cards.map((card) => (
                      <InsightCard key={card.id} card={card} />
                    ))}
                  </View>
                </>
              ) : null}

              {otherTotal > 0 ? (
                <Text
                  style={[
                    theme.text.caption,
                    {
                      color: theme.colors.textSecondary,
                      marginTop: 16,
                      paddingHorizontal: 4,
                    },
                  ]}
                >
                  {`${otherTotal} ${otherTotal === 1 ? "entry" : "entries"} ${
                    otherCurrencies.length === 1
                      ? `in ${otherCurrencies[0].currency}`
                      : `across ${otherCurrencies.length} currencies`
                  } ${otherTotal === 1 ? "is" : "are"} not included — nothing is converted.`}
                </Text>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
