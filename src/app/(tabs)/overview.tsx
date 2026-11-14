import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_CLEARANCE } from "../../components/navigation/FloatingTabBar";
import {
  Button,
  Card,
  CategoryTile,
  EmptyState,
  Money,
  MonthSelector,
  ProgressBar,
  SectionHeader,
} from "../../components/ui";
import { useBudgetPlan } from "../../features/budgets/useBudgetPlan";
import { SafeToSpendSheet } from "../../features/overview/SafeToSpendSheet";
import { BillsDueCard } from "../../features/recurring/BillsDueCard";
import { listAccounts } from "../../lib/db/repos/accounts";
import { listCategories } from "../../lib/db/repos/categories";
import { getAllSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import { countTransactions, listTransactions } from "../../lib/db/repos/transactions";
import type { Db, Transaction } from "../../lib/db/types";
import { closestToLimit } from "../../lib/domain/budget-plan";
import { addDays, toIsoDate } from "../../lib/domain/dates";
import { formatMoney, formatMoneySpoken } from "../../lib/format/money";
import { haptics } from "../../lib/haptics";
import { useOnboarding } from "../../lib/onboarding";
import { useTheme } from "../../lib/theme";

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
  const today = toIsoDate(new Date());
  const [monthOffset, setMonthOffset] = useState(0);
  const { data, loading, error, refresh } = useBudgetPlan({ monthOffset });
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const firstFocus = useRef(true);
  const previousState = useRef<{ key: string; state: string } | null>(null);

  // Refresh on focus so a save or an undo is reflected without a reload. The first
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
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [db, data]);

  const plan = data?.plan;
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
        : theme.colors.accentAlt;

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
    router.push("/(tabs)/transactions");
  };

  const openBudgets = () => {
    setBreakdownOpen(false);
    router.push("/(tabs)/budget");
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
              minHeight: 38,
            }}
          >
            {data?.period === "monthly" ? (
              <MonthSelector
                label={data.label}
                onPrevious={data.canGoPrevious ? () => setMonthOffset((value) => value - 1) : undefined}
                onNext={data.canGoNext ? () => setMonthOffset((value) => value + 1) : undefined}
                canGoPrevious={data.canGoPrevious}
                canGoNext={data.canGoNext}
              />
            ) : (
              <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
                {data?.label ?? "Overview"}
              </Text>
            )}
            <Pressable
              onPress={() => router.push("/settings")}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={8}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.surface,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={[theme.text.title3, { color: theme.colors.textPrimary }]}>⚙</Text>
            </Pressable>
          </View>

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

          {data && plan ? (
            <>
              <Pressable
                onPress={() => {
                  if (plan.overallLimitMinor === null) router.push("/(tabs)/budget");
                  else setBreakdownOpen(true);
                }}
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
                style={({ pressed }) => ({ opacity: pressed ? 0.94 : 1 })}
              >
                <Card
                  variant="ink"
                  style={{
                    marginTop: 14,
                    borderRadius: theme.radius.hero,
                    padding: 20,
                  }}
                >
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
                      <View style={{ marginTop: 14, alignSelf: "flex-start" }}>
                        <Text style={[theme.text.label, { color: theme.colors.accentAlt }]}>
                          Set a budget →
                        </Text>
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
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 999,
                            backgroundColor: theme.colors.inkTrack,
                          }}
                        >
                          <Text style={[theme.text.caption, { color: theme.colors.onInk }]}>
                            {`${pct}% used`}
                          </Text>
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
                              theme.text.title3,
                              { color: theme.colors.onInkMuted, paddingBottom: 6 },
                            ]}
                          >
                            / day
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
                          marginTop: 8,
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
                          style={[theme.text.caption, { color: theme.colors.onInkMuted }]}
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
              </Pressable>

              {otherCurrency && otherTotal > 0 ? (
                <Pressable
                  onPress={openCurrency}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${otherTotal} entries in ${otherCurrency}`}
                  hitSlop={6}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
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
                </Pressable>
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
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 10, paddingRight: 4 }}
                    >
                      {rows.map((row) => (
                        <Pressable
                          key={row.budgetId}
                          onPress={openBudgets}
                          accessibilityRole="button"
                          accessibilityLabel={`${row.name} budget, ${Math.round(
                            row.progress * 100,
                          )}% used`}
                          style={({ pressed }) => ({ width: 158, opacity: pressed ? 0.75 : 1 })}
                        >
                          <Card padded={false} style={{ padding: 14, gap: 8 }}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <CategoryTile icon={row.icon} color={row.color} size={34} />
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
                            <Text
                              style={[theme.text.label, { color: theme.colors.textPrimary }]}
                              numberOfLines={1}
                            >
                              {row.name}
                            </Text>
                            <ProgressBar
                              value={row.progress}
                              height={5}
                              state={row.state === "ok" ? "normal" : row.state}
                            />
                            <Text
                              style={[theme.text.caption, { color: theme.colors.textSecondary }]}
                              numberOfLines={1}
                            >
                              {`${formatMoney(row.spentMinor, currency)} of ${formatMoney(
                                row.limitMinor,
                                currency,
                              )}`}
                            </Text>
                          </Card>
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : (
                    <Card style={{ padding: 16, gap: 10 }}>
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

                  <SectionHeader
                    title="Recent"
                    actionLabel="Activity"
                    onAction={() => router.push("/(tabs)/transactions")}
                  />

                  <Card padded={false}>
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
                      } · ${dayLabel(transaction.localDate, today)}`;
                      return (
                        <Pressable
                          key={transaction.id}
                          onPress={() => router.push(`/transaction/${transaction.id}`)}
                          accessibilityRole="button"
                          accessibilityLabel={`${title}, ${formatMoneySpoken(
                            transaction.amountMinor,
                            transaction.currency,
                          )}, ${subtitle}`}
                          style={({ pressed }) => ({
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderTopWidth: index === 0 ? 0 : 1,
                            borderTopColor: theme.colors.border,
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <CategoryTile
                            icon={
                              transaction.type === "transfer"
                                ? "ellipsis"
                                : (category?.icon ?? null)
                            }
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
                        </Pressable>
                      );
                    })}
                  </Card>
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
          onClose={() => setBreakdownOpen(false)}
          onOpenBudgets={openBudgets}
        />
      ) : null}

      {count !== null && count > 0 ? (
        <Pressable
          onPress={() => router.push("/add")}
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
          style={({ pressed }) => [
            {
              position: "absolute",
              right: 20,
              bottom: insets.bottom + TAB_BAR_CLEARANCE,
              width: 60,
              height: 60,
              borderRadius: 30,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.accent,
              opacity: pressed ? 0.85 : 1,
            },
            theme.shadow.fab,
          ]}
        >
          <Text
            style={{
              color: theme.colors.accentFg,
              fontSize: 32,
              lineHeight: 34,
              fontWeight: "300",
            }}
          >
            +
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
