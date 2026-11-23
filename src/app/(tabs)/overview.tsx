import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_CLEARANCE } from "../../components/navigation/tabBar";
import {
  AppIcon,
  Button,
  Card,
  CategoryTile,
  EmptyState,
  Glass,
  Money,
  MonthSelector,
  PickerSheet,
  ProgressBar,
  SectionHeader,
  TactilePressable,
} from "../../components/ui";
import { useBudgetPlan } from "../../features/budgets/useBudgetPlan";
import { SafeToSpendSheet } from "../../features/overview/SafeToSpendSheet";
import { SpendBars } from "../../features/overview/SpendBars";
import { useOverviewAnalytics } from "../../features/overview/useOverviewAnalytics";
import { BillsDueCard } from "../../features/recurring/BillsDueCard";
import { listAccounts } from "../../lib/db/repos/accounts";
import { listCategories } from "../../lib/db/repos/categories";
import { getAllSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import { countTransactions, listTransactions } from "../../lib/db/repos/transactions";
import type { Db, Transaction } from "../../lib/db/types";
import { closestToLimit } from "../../lib/domain/budget-plan";
import { periodWindow, windowLabel } from "../../lib/domain/budget-period";
import { addDays, toIsoDate } from "../../lib/domain/dates";
import { formatMoney, formatMoneySpoken } from "../../lib/format/money";
import { haptics } from "../../lib/haptics";
import { subscribeLedgerChanged } from "../../lib/ledgerEvents";
import { iosEnter } from "../../lib/motion";
import { useOnboarding } from "../../lib/onboarding";
import { FONT_FAMILIES, useTheme } from "../../lib/theme";

/**
 * Dev-only proof that P1 booted: migrations ran and the seed landed. It is not part
 * of the product UI, so it never renders in a release build.
 */
function DataStatusCard() {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const { reset } = useOnboarding();
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"),
      listCategories(db),
      listAccounts(db),
      getAllSettings(db),
    ])
      .then(([version, categories, accounts, settings]) => {
        if (cancelled) return;
        const accountLabel = accounts.length === 1 ? "account" : "accounts";
        const onboarding = settings[SETTING_KEYS.onboarded] === "1" ? "done" : "pending";
        setSummary(
          `schema v${version?.user_version ?? 0} · ${categories.length} categories · ` +
            `${accounts.length} ${accountLabel} · ${settings[SETTING_KEYS.currency] ?? "USD"} · ` +
            `onboarding ${onboarding}`,
        );
      })
      .catch(() => {
        if (!cancelled) setSummary("database not ready");
      });

    return () => {
      cancelled = true;
    };
  }, [db]);

  return (
    <Card variant="muted" style={{ marginTop: 20 }}>
      <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
        Local data · dev
      </Text>
      <Text style={[theme.text.body, { color: theme.colors.textSecondary, marginTop: 6 }]}>
        {summary ?? "Opening the database…"}
      </Text>
      <View style={{ marginTop: 12, gap: 8 }}>
        <Button
          label="Data tools"
          variant="ghost"
          size="sm"
          onPress={() => router.push("/dev-data")}
        />
        <Button
          label="Show onboarding"
          variant="ghost"
          size="sm"
          onPress={() => {
            reset()
              .then(() => router.replace("/(onboarding)/welcome"))
              .catch(() => {});
          }}
        />
      </View>
    </Card>
  );
}

function dayLabel(iso: string, today: string): string {
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function OverviewScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const db: Db = useSQLiteContext();
  const [today, setToday] = useState(() => toIsoDate(new Date()));
  const [monthOffset, setMonthOffset] = useState(0);
  const { data, loading, error, refresh } = useBudgetPlan({ monthOffset });
  const {
    data: analytics,
    error: analyticsError,
    refresh: refreshAnalytics,
  } = useOverviewAnalytics(data?.currency ?? null, monthOffset);
  const [prevPeriod, setPrevPeriod] = useState<string | undefined>(data?.period);
  if (data?.period && data.period !== prevPeriod) {
    setPrevPeriod(data.period);
    if (data.period !== "monthly" && monthOffset !== 0) {
      setMonthOffset(0);
    }
  }
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [openBudgetsOnClose, setOpenBudgetsOnClose] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);
  const firstFocus = useRef(true);
  const previousState = useRef<{ key: string; state: string } | null>(null);

  useEffect(() => {
    const unsubLedger = subscribeLedgerChanged(() => {
      refresh();
      refreshAnalytics();
    });
    const subApp = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setToday(toIsoDate(new Date()));
        refresh();
        refreshAnalytics();
      }
    });
    return () => {
      unsubLedger();
      subApp.remove();
    };
  }, [refresh, refreshAnalytics]);

  // Refresh on focus so a save or an undo is reflected without a reload. The first
  // focus is skipped because the hook already loaded on mount.
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return undefined;
      }
      refresh();
      refreshAnalytics();
      return undefined;
    }, [refresh, refreshAnalytics]),
  );

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    Promise.all([
      countTransactions(db),
      listTransactions(db, { currency: data.currency, limit: 3 }),
    ])
      .then(([total, rows]) => {
        if (cancelled) return;
        setCount(total);
        setRecent(rows);
        setRecentError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setRecentError(`Could not read recent activity: ${String(cause)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [db, data]);

  const plan = data?.plan;
  const minMonthOffset = data?.minMonthOffset ?? -24;
  const monthOptions = useMemo(() => {
    const count = Math.abs(minMonthOffset) + 1;
    return Array.from({ length: count }, (_, index) => {
      const offset = -index;
      const win = periodWindow("monthly", today, today, offset);
      return {
        value: String(offset),
        label: windowLabel("monthly", win),
        secondary: offset === 0 ? "Current month" : undefined,
      };
    });
  }, [minMonthOffset, today]);
  const currency = data?.currency ?? "USD";
  const rows = closestToLimit(plan?.rows ?? [], 3);
  const categoryById = new Map((data?.categories ?? []).map((category) => [category.id, category]));

  const heroAmount =
    plan == null
      ? 0
      : data?.isCurrentPeriod
        ? (plan.safePerDayMinor ?? 0)
        : (plan.remainingMinor ?? 0);
  const pct = plan ? Math.round(plan.progress * 100) : 0;
  const overColor =
    plan?.state === "over"
      ? theme.colors.expense
      : plan?.state === "warning"
        ? theme.colors.warning
        : theme.colors.accent;

  const otherCurrencies = data?.otherCurrency ?? [];
  const otherTotal = otherCurrencies.reduce((sum, row) => sum + row.count, 0);
  const otherCurrency = otherCurrencies[0]?.currency ?? null;

  // Crossing a limit is what deserves a warning, not merely being over it. The ref
  // remembers the last state per period, so re-opening the app is silent.
  useEffect(() => {
    if (!data || !plan || plan.overallLimitMinor === null) return;
    const key = `${data.period}:${data.window.start}`;
    const previous = previousState.current;
    if (previous && previous.key === key && previous.state !== "over" && plan.state === "over") {
      haptics.budget();
    }
    previousState.current = { key, state: plan.state };
  }, [data, plan]);

  const openCurrency = () => {
    if (!otherCurrency) return;
    // One currency filters Activity to it; several would make the count a lie, so
    // the unfiltered list opens instead and the badges show each currency.
    if (otherCurrencies.length === 1) {
      router.push({
        pathname: "/(tabs)/transactions",
        // The other params are cleared explicitly: a previous Insights drill-through
        // must not keep filtering the list after a footnote tap.
        params: { currency: otherCurrency, categoryId: "", from: "", to: "" },
      });
      return;
    }
    router.push({
      pathname: "/(tabs)/transactions",
      params: { currency: "", categoryId: "", from: "", to: "" },
    });
  };

  const openBudgets = () => {
    if (breakdownOpen) {
      setOpenBudgetsOnClose(true);
      setBreakdownOpen(false);
      return;
    }
    router.push("/(tabs)/budget");
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 20,
            paddingTop: 14,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              minHeight: 38,
            }}
          >
            {data?.period === "monthly" ? (
              <MonthSelector
                label={data.label}
                onPrevious={
                  data.canGoPrevious
                    ? () => setMonthOffset((value) => Math.max(data.minMonthOffset, value - 1))
                    : undefined
                }
                onNext={
                  data.canGoNext ? () => setMonthOffset((value) => Math.min(0, value + 1)) : undefined
                }
                onPressLabel={() => setMonthPickerOpen(true)}
                canGoPrevious={data.canGoPrevious}
                canGoNext={data.canGoNext}
              />
            ) : data ? (
              // While the plan is loading there is nothing meaningful to label, and
              // printing "Overview" here duplicated the page title underneath it.
              <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
                {data.label}
              </Text>
            ) : (
              <View />
            )}
            <TactilePressable
              onPress={() => router.push("/settings")}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={8}
              haptic="selection"
              scaleTo={0.9}
              radius={19}
            >
              <Glass
                tone="regular"
                radius={19}
                style={{
                  width: 38,
                  height: 38,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppIcon name="settings" color={theme.colors.textPrimary} size={18} />
              </Glass>
            </TactilePressable>
          </View>

          <Text
            accessibilityRole="header"
            style={[theme.text.title1, { color: theme.colors.textPrimary, marginTop: 16 }]}
          >
            Overview
          </Text>

          {error || recentError ? (
            <Text style={[theme.text.caption, { color: theme.colors.danger, marginTop: 10 }]}>
              {error ?? recentError}
            </Text>
          ) : null}

          {!data ? (
            <View style={{ paddingTop: 60, alignItems: "center" }}>
              {loading ? <ActivityIndicator color={theme.colors.accent} /> : null}
            </View>
          ) : null}

          {data && plan ? (
            <>
              <Animated.View entering={iosEnter(0)}>
                <TactilePressable
                  onPress={() => {
                    if (plan.overallLimitMinor === null) router.push("/(tabs)/budget");
                    else setBreakdownOpen(true);
                  }}
                  haptic="selection"
                  scaleTo={0.985}
                  radius={theme.radius.hero}
                  accessibilityRole="button"
                  accessibilityLabel={
                    plan.overallLimitMinor === null
                      ? "Set a budget"
                      : `${
                          data.isCurrentPeriod ? "Safe to spend" : "Left over"
                        } ${formatMoneySpoken(heroAmount, currency)}${
                          data.isCurrentPeriod ? " per day" : ""
                        }. Opens the breakdown.`
                  }
                  style={{ marginTop: 16 }}
                >
                  <Card variant="ink" style={{ padding: 22 }}>
                    {plan.overallLimitMinor === null ? (
                      <>
                        <Text style={[theme.text.eyebrow, { color: theme.colors.onInkMuted }]}>
                          Safe to spend
                        </Text>
                        <Text
                          style={[theme.text.title2, { color: theme.colors.onInk, marginTop: 8 }]}
                        >
                          Set a budget to see it
                        </Text>
                        <Text
                          style={[
                            theme.text.body,
                            { color: theme.colors.onInkMuted, marginTop: 6, maxWidth: 260 },
                          ]}
                        >
                          One limit turns everything you spend into a daily number you can act
                          on.
                        </Text>
                        <View
                          style={{
                            marginTop: 18,
                            alignSelf: "flex-start",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 999,
                            backgroundColor: "rgba(255,255,255,0.10)",
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: "rgba(255,255,255,0.14)",
                          }}
                        >
                          <Text style={[theme.text.label, { color: theme.colors.onInk }]}>
                            Set a budget
                          </Text>
                          <AppIcon name="chevronRight" color={theme.colors.onInk} size={13} />
                        </View>
                      </>
                    ) : (
                      <>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <Text style={[theme.text.eyebrow, { color: theme.colors.onInkMuted }]}>
                            {data.isCurrentPeriod ? "Safe to spend" : "Left over"}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 999,
                              backgroundColor: "rgba(255,255,255,0.10)",
                              borderWidth: StyleSheet.hairlineWidth,
                              borderColor: "rgba(255,255,255,0.18)",
                            }}
                          >
                            <Text
                              style={[
                                theme.text.caption,
                                {
                                  color: theme.colors.onInkMuted,
                                  fontFamily: FONT_FAMILIES.semibold,
                                  fontVariant: ["tabular-nums"],
                                },
                              ]}
                            >
                              {`${pct}% of budget`}
                            </Text>
                            <AppIcon
                              name="chevronRight"
                              color={theme.colors.onInkMuted}
                              size={11}
                            />
                          </View>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-end",
                            gap: 6,
                            marginTop: 8,
                          }}
                        >
                          <Money
                            minor={heroAmount}
                            currency={currency}
                            tone="onInk"
                            size="hero"
                            style={{ flexShrink: 1 }}
                          />
                          {data.isCurrentPeriod ? (
                            <Text
                              style={[
                                theme.text.caption,
                                { color: theme.colors.onInkMuted, paddingBottom: 7 },
                              ]}
                            >
                              per day
                            </Text>
                          ) : null}
                        </View>
                        <View style={{ marginTop: 14 }}>
                          <ProgressBar
                            value={plan.progress}
                            state={plan.state === "ok" ? "normal" : plan.state}
                            color={overColor}
                            trackColor={theme.colors.inkTrack}
                          />
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            marginTop: 10,
                          }}
                        >
                          <Text
                            style={[theme.text.caption, { color: theme.colors.onInkMuted }]}
                            numberOfLines={1}
                          >
                            {data.isCurrentPeriod
                              ? `${plan.daysRemaining} ${plan.daysRemaining === 1 ? "day" : "days"} left`
                              : data.label}
                          </Text>
                          <Text
                            style={[
                              theme.text.caption,
                              {
                                color: theme.colors.onInkMuted,
                                fontVariant: ["tabular-nums"],
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {`${formatMoney(plan.spentMinor, currency)} of ${formatMoney(
                              plan.overallLimitMinor,
                              currency,
                            )}`}
                          </Text>
                        </View>
                      </>
                    )}
                  </Card>
                </TactilePressable>
              </Animated.View>

              {otherCurrency && otherTotal > 0 ? (
                <TactilePressable
                  onPress={openCurrency}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${otherTotal} entries in ${otherCurrency}`}
                  hitSlop={6}
                  scaleTo={0.98}
                  haptic="selection"
                >
                  <Text
                    style={[
                      theme.text.caption,
                      { color: theme.colors.textSecondary, marginTop: 8, paddingHorizontal: 4 },
                    ]}
                  >
                    {`${otherTotal} ${otherTotal === 1 ? "entry" : "entries"} in ${
                      otherCurrencies.length === 1
                        ? otherCurrency
                        : `${otherCurrencies.length} currencies`
                    } not included — nothing is converted.`}
                  </Text>
                </TactilePressable>
              ) : plan.committedCount > 0 && data.isCurrentPeriod ? (
                <Text
                  style={[
                    theme.text.caption,
                    { color: theme.colors.textSecondary, marginTop: 8, paddingHorizontal: 4 },
                  ]}
                >
                  {`Spending excludes ${plan.committedCount} ${
                    plan.committedCount === 1 ? "bill" : "bills"
                  } you have not logged — they are set aside from safe to spend.`}
                </Text>
              ) : null}

              {!analytics ? (
                <Card style={{ marginTop: 18, minHeight: 88, justifyContent: "center" }}>
                  {analyticsError ? (
                    <Text style={[theme.text.caption, { color: theme.colors.danger }]}>
                      {__DEV__
                        ? `Spending summary unavailable. ${analyticsError}`
                        : "Spending summary unavailable right now."}
                    </Text>
                  ) : (
                    <ActivityIndicator color={theme.colors.accent} />
                  )}
                </Card>
              ) : null}

              {analytics ? (
                <Animated.View entering={iosEnter(60)}>
                  <SectionHeader
                    title={analytics.window.isCurrent ? "This month" : analytics.monthLabel}
                  />
                  <Card variant="glass">
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>
                        Total spent
                      </Text>
                      {analytics.delta && analytics.delta.direction !== "flat" ? (
                        <Text
                          style={[
                            theme.text.caption,
                            {
                              fontVariant: ["tabular-nums"],
                              color:
                                analytics.delta.direction === "up"
                                  ? theme.colors.expense
                                  : theme.colors.income,
                            },
                          ]}
                        >
                          {`${Math.abs(analytics.delta.pct)}% ${
                            analytics.delta.direction === "up" ? "more" : "less"
                          } than ${analytics.previousMonthLabel}`}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ marginTop: 6 }}>
                      <Money minor={analytics.spentMinor} currency={currency} size="total" />
                    </View>
                    {analytics.spentMinor > 0 ? (
                      <>
                        <SpendBars
                          buckets={analytics.buckets}
                          currency={currency}
                          averageMinor={analytics.averageMinor}
                        />
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            marginTop: 10,
                          }}
                        >
                          <Text
                            style={[theme.text.caption, { color: theme.colors.textTertiary }]}
                          >
                            Weekly average
                          </Text>
                          <Money
                            minor={analytics.averageMinor}
                            currency={currency}
                            size="caption"
                            tone="muted"
                          />
                        </View>
                      </>
                    ) : (
                      <Text
                        style={[
                          theme.text.body,
                          { color: theme.colors.textSecondary, marginTop: 12 },
                        ]}
                      >
                        {`Nothing logged in ${analytics.monthLabel} yet.`}
                      </Text>
                    )}
                  </Card>

                  {analytics.categories.length ? (
                    <>
                      <SectionHeader
                        title="Where it went"
                        actionLabel="Insights"
                        onAction={() => router.push("/(tabs)/insights")}
                      />
                      <Card variant="glass" padded={false}>
                        {analytics.categories.map((row, index) => (
                          <Fragment key={row.key}>
                            {index > 0 ? (
                              <View
                                style={{
                                  marginLeft: 36,
                                  height: StyleSheet.hairlineWidth,
                                  backgroundColor: theme.colors.border,
                                }}
                              />
                            ) : null}
                            <View
                              accessible
                              accessibilityLabel={`${row.name}, ${formatMoney(
                                row.amountMinor,
                                currency,
                              )}, ${Math.round(row.share * 100)}% of spending`}
                              style={{ paddingHorizontal: 16, paddingVertical: 12 }}
                            >
                              <View
                                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                              >
                                <View
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: row.color ?? theme.colors.textTertiary,
                                  }}
                                />
                                <Text
                                  numberOfLines={1}
                                  style={[
                                    theme.text.body,
                                    { flex: 1, color: theme.colors.textPrimary },
                                  ]}
                                >
                                  {row.name}
                                </Text>
                                <Text
                                  style={[
                                    theme.text.label,
                                    {
                                      color: theme.colors.textPrimary,
                                      fontVariant: ["tabular-nums"],
                                    },
                                  ]}
                                >
                                  {formatMoney(row.amountMinor, currency)}
                                </Text>
                                <Text
                                  style={[
                                    theme.text.caption,
                                    {
                                      width: 36,
                                      textAlign: "right",
                                      color: theme.colors.textSecondary,
                                      fontVariant: ["tabular-nums"],
                                    },
                                  ]}
                                >
                                  {`${Math.round(row.share * 100)}%`}
                                </Text>
                              </View>
                              <View style={{ marginTop: 8, marginLeft: 20 }}>
                                <ProgressBar
                                  value={row.share}
                                  height={5}
                                  color={row.color ?? theme.colors.accent}
                                />
                              </View>
                            </View>
                          </Fragment>
                        ))}
                      </Card>
                    </>
                  ) : null}
                </Animated.View>
              ) : null}

              <BillsDueCard currency={currency} />

              {count === 0 ? (
                <Card style={{ marginTop: 18 }}>
                  <EmptyState
                    title="Start with one"
                    body="Log your first expense — the price is the only required field. Everything stays on this device."
                    actionLabel="Log your first expense"
                    onAction={() => router.push("/add")}
                  />
                </Card>
              ) : (
                <>
                  <SectionHeader
                    title="Budgets"
                    actionLabel={plan.rows.length ? "See all" : undefined}
                    onAction={plan.rows.length ? openBudgets : undefined}
                  />

                  {rows.length ? (
                    <Card variant="glass" padded={false}>
                      {rows.map((row, index) => (
                        <Fragment key={row.budgetId}>
                          {index > 0 ? (
                            <View
                              style={{
                                marginLeft: 64,
                                height: StyleSheet.hairlineWidth,
                                backgroundColor: theme.colors.border,
                              }}
                            />
                          ) : null}
                          <TactilePressable
                            onPress={openBudgets}
                            haptic="selection"
                            scaleTo={0.985}
                            radius={14}
                            accessibilityRole="button"
                            accessibilityLabel={`${row.name} budget, ${Math.round(
                              row.progress * 100,
                            )}% used`}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 12,
                            }}
                          >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <CategoryTile icon={row.icon} color={row.color} size={36} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={[theme.text.body, { color: theme.colors.textPrimary }]}
                                numberOfLines={1}
                              >
                                {row.name}
                              </Text>
                              <Text
                                style={[theme.text.caption, { color: theme.colors.textSecondary }]}
                                numberOfLines={1}
                              >
                                {`${formatMoney(row.spentMinor, currency)} of ${formatMoney(
                                  row.limitMinor,
                                  currency,
                                )}`}
                              </Text>
                            </View>
                            {row.state !== "ok" ? (
                              <Text
                                style={[
                                  theme.text.caption,
                                  {
                                    color:
                                      row.state === "over"
                                        ? theme.colors.danger
                                        : theme.colors.warning,
                                  },
                                ]}
                              >
                                {row.state === "over" ? "Over" : `${Math.round(row.progress * 100)}%`}
                              </Text>
                            ) : null}
                          </View>
                            <View style={{ marginTop: 8 }}>
                              <ProgressBar
                                value={row.progress}
                                height={4}
                                state={row.state === "ok" ? "normal" : row.state}
                              />
                            </View>
                          </TactilePressable>
                        </Fragment>
                      ))}
                    </Card>
                  ) : (
                    <Card variant="glass" style={{ padding: 16, gap: 10 }}>
                      <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
                        No category limits yet. The overall budget already drives safe to
                        spend.
                      </Text>
                      <Button
                        label="Add category limits"
                        variant="ghost"
                        size="sm"
                        onPress={openBudgets}
                      />
                    </Card>
                  )}

                  {recent.length ? (
                    <>
                      <SectionHeader
                        title="Recent"
                        actionLabel="Activity"
                        onAction={() =>
                          router.push({
                            pathname: "/(tabs)/transactions",
                            params: { currency: "", categoryId: "", from: "", to: "" },
                          })
                        }
                      />

                      <Card variant="glass" padded={false}>
                        {recent.map((transaction, index) => {
                          const category = transaction.categoryId
                            ? categoryById.get(transaction.categoryId)
                            : null;
                          const title =
                            transaction.itemName ??
                            transaction.place ??
                            (transaction.type === "transfer"
                              ? "Transfer"
                              : (category?.name ?? "Expense"));
                          const subtitle = `${
                            transaction.type === "transfer"
                              ? "Transfer"
                              : (category?.name ?? "Uncategorized")
                          } · ${dayLabel(transaction.localDate, today)}${
                            transaction.feeMinor > 0
                              ? ` · ${formatMoney(
                                  transaction.feeMinor,
                                  transaction.currency,
                                )} fee`
                              : ""
                          }`;
                          return (
                            <Fragment key={transaction.id}>
                              {index > 0 ? (
                                <View
                                  style={{
                                    marginLeft: 64,
                                    height: StyleSheet.hairlineWidth,
                                    backgroundColor: theme.colors.border,
                                  }}
                                />
                              ) : null}
                              <TactilePressable
                                onPress={() => router.push(`/transaction/${transaction.id}`)}
                                haptic="selection"
                                scaleTo={0.985}
                                radius={14}
                                accessibilityRole="button"
                                accessibilityLabel={`${title}, ${formatMoneySpoken(
                                  transaction.amountMinor,
                                  transaction.currency,
                                )}${
                                  transaction.feeMinor > 0
                                    ? `, plus a ${formatMoneySpoken(
                                        transaction.feeMinor,
                                        transaction.currency,
                                      )} fee`
                                    : ""
                                }, ${subtitle}`}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 12,
                                  paddingHorizontal: 16,
                                  paddingVertical: 12,
                                }}
                              >
                              <CategoryTile
                                icon={
                                  transaction.type === "transfer"
                                    ? null
                                    : (category?.icon ?? null)
                                }
                                appIcon={transaction.type === "transfer" ? "transfer" : undefined}
                                color={category?.color ?? null}
                                size={36}
                              />
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                  style={[theme.text.label, { color: theme.colors.textPrimary }]}
                                  numberOfLines={1}
                                >
                                  {title}
                                </Text>
                                <Text
                                  style={[
                                    theme.text.caption,
                                    { color: theme.colors.textSecondary, marginTop: 2 },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {subtitle}
                                </Text>
                              </View>
                                <Money
                                  minor={transaction.amountMinor}
                                  currency={transaction.currency}
                                  tone={transaction.type === "income" ? "income" : "default"}
                                />
                              </TactilePressable>
                            </Fragment>
                          );
                        })}
                      </Card>
                    </>
                  ) : null}
                </>
              )}
            </>
          ) : null}

          {__DEV__ ? <DataStatusCard /> : null}
        </ScrollView>
      </SafeAreaView>

      {data && plan && plan.overallLimitMinor !== null ? (
        <SafeToSpendSheet
          visible={breakdownOpen}
          plan={plan}
          label={data.label}
          isCurrentPeriod={data.isCurrentPeriod}
          onClose={() => {
            setOpenBudgetsOnClose(false);
            setBreakdownOpen(false);
          }}
          onClosed={() => {
            if (openBudgetsOnClose) {
              setOpenBudgetsOnClose(false);
              router.push("/(tabs)/budget");
            }
          }}
          onOpenBudgets={openBudgets}
        />
      ) : null}

      <PickerSheet
        visible={monthPickerOpen}
        title="Select month"
        options={monthOptions}
        selected={String(monthOffset)}
        onSelect={(value) => setMonthOffset(Number(value))}
        onClose={() => setMonthPickerOpen(false)}
      />

    </View>
  );
}
