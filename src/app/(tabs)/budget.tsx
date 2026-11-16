import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_CLEARANCE } from "../../components/navigation/tabBar";
import {
  AppIcon,
  Button,
  Card,
  CategoryTile,
  Glass,
  Money,
  PickerSheet,
  ProgressBar,
  ProgressRing,
  SectionHeader,
  TactilePressable,
} from "../../components/ui";
import { BudgetEditorSheet } from "../../features/budgets/BudgetEditorSheet";
import { useBudgetPlan } from "../../features/budgets/useBudgetPlan";
import { deactivateBudget } from "../../lib/db/repos/budgets";
import { setSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import type { Budget, BudgetPeriod, Db } from "../../lib/db/types";
import { PERIOD_LABELS } from "../../lib/domain/budget-period";
import { toIsoDate } from "../../lib/domain/dates";
import { formatMoney } from "../../lib/format/money";
import { iosEnter } from "../../lib/motion";
import { useTheme } from "../../lib/theme";

type Editing = {
  categoryId: string | null;
  title: string;
  /** The row being edited in this currency; null when creating or recreating. */
  existing: Budget | null;
  initialLimitMinor?: number;
  /** Previous-currency row retired once its replacement is saved. */
  replacesBudgetId?: string;
};

const PERIODS: BudgetPeriod[] = ["weekly", "monthly", "yearly"];

function isBudgetPeriod(value: string): value is BudgetPeriod {
  return value === "weekly" || value === "monthly" || value === "yearly";
}

export default function BudgetsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const db: Db = useSQLiteContext();
  const today = useMemo(() => toIsoDate(new Date()), []);
  const [periodOverride, setPeriodOverride] = useState<BudgetPeriod | undefined>(undefined);
  const { data, loading, error, refresh } = useBudgetPlan({ period: periodOverride });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [picking, setPicking] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const firstFocus = useRef(true);

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

  const plan = data?.plan;
  const categoryById = useMemo(
    () => new Map((data?.categories ?? []).map((category) => [category.id, category])),
    [data],
  );

  const openOverall = () => {
    if (!plan) return;
    setEditing({ categoryId: null, title: "Overall budget", existing: plan.overallBudget });
  };

  const openCategory = (categoryId: string, budget: Budget | null) => {
    setEditing({
      categoryId,
      title: categoryById.get(categoryId)?.name ?? "Category limit",
      existing: budget,
    });
  };

  const openRecreate = (budget: Budget) => {
    if (!data) return;
    const name = budget.categoryId
      ? (categoryById.get(budget.categoryId)?.name ?? "Category limit")
      : "Overall budget";
    setEditing({
      categoryId: budget.categoryId,
      title: `${name} in ${data.currency}`,
      existing: null,
      initialLimitMinor: budget.limitMinor,
      replacesBudgetId: budget.id,
    });
  };

  const finishEditing = () => {
    const replaces = editing?.replacesBudgetId;
    setEditing(null);
    if (!replaces) {
      refresh();
      return;
    }
    // The old-currency budget is retired, not deleted: it stays as a record and can
    // be recreated again if the user switches back.
    deactivateBudget(db, replaces)
      .catch((cause: unknown) => {
        setActionError(`Could not retire the old limit: ${String(cause)}`);
      })
      .finally(() => refresh());
  };

  const changePeriod = (next: BudgetPeriod) => {
    if (next === data?.period) return;
    setActionError(null);
    setSettings(db, { [SETTING_KEYS.budgetPeriod]: next })
      // The hook reloads from the override, and the stored key keeps Overview in
      // step the next time it is opened.
      .then(() => setPeriodOverride(next))
      .catch((cause: unknown) => {
        setActionError(`Could not change the period: ${String(cause)}`);
      });
  };

  const rows = plan?.rows ?? [];
  const availableCategories = (data?.categories ?? []).filter(
    (category) =>
      category.kind === "expense" &&
      !category.isArchived &&
      !rows.some((row) => row.categoryId === category.id),
  );
  const pct = plan ? Math.round(plan.progress * 100) : 0;
  const ringColor =
    plan?.state === "over"
      ? theme.colors.expense
      : plan?.state === "warning"
        ? theme.colors.warning
        : theme.colors.accent;

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
          }}
        >
          <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary, marginTop: 8 }]}>
            {data ? `${PERIOD_LABELS[data.period]} · ${data.currency}` : "Budgets"}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 4,
            }}
          >
            <Text
              accessibilityRole="header"
              style={[theme.text.title1, { color: theme.colors.textPrimary }]}
            >
              Budgets
            </Text>
            <TactilePressable
              onPress={() => setPeriodOpen(true)}
              disabled={!data}
              haptic="selection"
              scaleTo={0.94}
              radius={999}
              accessibilityRole="button"
              accessibilityLabel={`Budget period, ${PERIOD_LABELS[data?.period ?? "monthly"]}`}
              hitSlop={6}
            >
              <Glass
                tone="regular"
                radius={999}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  height: 36,
                  paddingHorizontal: 14,
                }}
              >
                <Text style={[theme.text.label, { color: theme.colors.textPrimary }]}>
                  {PERIOD_LABELS[data?.period ?? "monthly"]}
                </Text>
                <AppIcon name="chevronDown" color={theme.colors.textSecondary} size={13} />
              </Glass>
            </TactilePressable>
          </View>

          {error || actionError ? (
            <Text style={[theme.text.caption, { color: theme.colors.danger, marginTop: 10 }]}>
              {error ?? actionError}
            </Text>
          ) : null}

          {!data ? (
            <View style={{ paddingTop: 40, alignItems: "center" }}>
              {loading ? <ActivityIndicator color={theme.colors.accent} /> : null}
            </View>
          ) : (
            <>
              <Animated.View entering={iosEnter(30)}>
                <Card variant="glass" style={{ marginTop: 16, padding: 20 }}>
                  {plan?.overallLimitMinor != null ? (
                    <>
                      <View
                        style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
                      >
                        <View style={{ flex: 1, gap: 6 }}>
                          <Text
                            style={[theme.text.eyebrow, { color: theme.colors.textSecondary }]}
                          >
                            Overall budget
                          </Text>
                          <Money
                            minor={plan.overallLimitMinor}
                            currency={data.currency}
                            tone="default"
                            size="total"
                          />
                          <Text
                            style={[theme.text.caption, { color: theme.colors.textSecondary }]}
                          >
                            {`${formatMoney(plan.spentMinor, data.currency)} spent · ${formatMoney(
                              plan.remainingMinor ?? 0,
                              data.currency,
                            )} left`}
                          </Text>
                        </View>
                        <ProgressRing value={plan.progress} size={78} stroke={8} color={ringColor}>
                          <Text
                            style={[
                              theme.text.label,
                              {
                                color: theme.colors.textPrimary,
                                fontWeight: "700",
                                fontVariant: ["tabular-nums"],
                              },
                            ]}
                          >
                            {`${pct}%`}
                          </Text>
                        </ProgressRing>
                      </View>
                      <View style={{ marginTop: 16 }}>
                        <ProgressBar
                          value={plan.progress}
                          state={plan.state === "ok" ? "normal" : plan.state}
                          color={ringColor}
                          trackColor={theme.colors.surfaceSunken}
                        />
                      </View>
                      <TactilePressable
                        onPress={openOverall}
                        haptic="selection"
                        scaleTo={0.95}
                        radius={999}
                        accessibilityRole="button"
                        accessibilityLabel="Edit overall budget"
                        hitSlop={6}
                        style={{
                          marginTop: 14,
                          alignSelf: "flex-start",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 999,
                          backgroundColor: theme.colors.accentSoft,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: `${theme.colors.accent}28`,
                        }}
                      >
                        <Text style={[theme.text.caption, { fontWeight: "700", color: theme.colors.accent }]}>
                          Edit overall limit
                        </Text>
                        <AppIcon name="chevronRight" color={theme.colors.accent} size={12} />
                      </TactilePressable>
                    </>
                  ) : (
                    <>
                      <Text style={[theme.text.eyebrow, { color: theme.colors.textSecondary }]}>
                        Overall budget
                      </Text>
                      <Text
                        style={[theme.text.title2, { color: theme.colors.textPrimary, marginTop: 6 }]}
                      >
                        No overall limit yet
                      </Text>
                      <Text
                        style={[
                          theme.text.body,
                          { color: theme.colors.textSecondary, marginTop: 6, maxWidth: 280 },
                        ]}
                      >
                        One number for everything you spend. Overview turns it into what is
                        safe to spend today.
                      </Text>
                      <View style={{ marginTop: 16, alignSelf: "flex-start" }}>
                        <Button
                          label="Set overall limit"
                          size="sm"
                          fullWidth={false}
                          onPress={openOverall}
                        />
                      </View>
                    </>
                  )}
                </Card>
              </Animated.View>

              {plan?.categoryLimitsExceedOverall ? (
                <Text
                  style={[
                    theme.text.caption,
                    { color: theme.colors.warning, marginTop: 10, paddingHorizontal: 4 },
                  ]}
                >
                  Category limits add up to more than the overall budget. That is allowed —
                  Overview keeps measuring against the overall number.
                </Text>
              ) : null}

              <Animated.View entering={iosEnter(90)}>
                <SectionHeader title="Category limits" />

                {rows.length ? (
                  <Card variant="glass" padded={false}>
                    {rows.map((row, index) => {
                      const budget =
                        data.budgets.find(
                          (candidate) =>
                            candidate.categoryId === row.categoryId &&
                            candidate.period === data.period &&
                            candidate.currency === data.currency,
                        ) ?? null;
                      const status =
                        row.remainingMinor < 0
                          ? `${formatMoney(Math.abs(row.remainingMinor), data.currency)} over`
                          : row.state === "warning"
                            ? `${Math.round(row.progress * 100)}% used`
                            : `${formatMoney(row.remainingMinor, data.currency)} left`;
                      return (
                        <TactilePressable
                          key={row.budgetId}
                          onPress={() => openCategory(row.categoryId, budget)}
                          haptic="selection"
                          scaleTo={0.985}
                          radius={14}
                          accessibilityRole="button"
                          accessibilityLabel={`${row.name} limit, ${status}`}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                            borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                            borderTopColor: theme.colors.border,
                          }}
                        >
                          <View
                            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                          >
                            <CategoryTile icon={row.icon} color={row.color} size={38} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={[theme.text.label, { color: theme.colors.textPrimary }]}
                                numberOfLines={1}
                              >
                                {row.name}
                              </Text>
                              <Text
                                style={[
                                  theme.text.caption,
                                  {
                                    color:
                                      row.remainingMinor < 0
                                        ? theme.colors.danger
                                        : row.state === "warning"
                                          ? theme.colors.warning
                                          : theme.colors.textSecondary,
                                    marginTop: 2,
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {status}
                              </Text>
                            </View>
                            <Money
                              minor={row.limitMinor}
                              currency={data.currency}
                              tone="muted"
                            />
                          </View>
                          <View style={{ marginTop: 10 }}>
                            <ProgressBar
                              value={row.progress}
                              height={5}
                              state={row.state === "ok" ? "normal" : row.state}
                            />
                          </View>
                        </TactilePressable>
                      );
                    })}
                  </Card>
                ) : (
                  <Card variant="glass" style={{ padding: 16 }}>
                    <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
                      No category limits yet. Add one and it appears on Overview.
                    </Text>
                    <View style={{ marginTop: 12, alignSelf: "flex-start" }}>
                      <Button
                        label="Add a category limit"
                        variant="ghost"
                        size="sm"
                        fullWidth={false}
                        disabled={availableCategories.length === 0}
                        onPress={() => setPicking(true)}
                      />
                    </View>
                  </Card>
                )}

                {rows.length ? (
                  <Button
                    label="Set a category limit"
                    variant="ghost"
                    size="sm"
                    fullWidth={false}
                    disabled={availableCategories.length === 0}
                    onPress={() => setPicking(true)}
                    style={{ marginTop: 10, alignSelf: "flex-start" }}
                  />
                ) : null}
              </Animated.View>

              {plan?.previousCurrencyBudgets.length ? (
                <>
                  <SectionHeader title="Another currency" />
                  <Card variant="glass" padded={false}>
                    {plan.previousCurrencyBudgets.map((budget, index) => {
                      const name = budget.categoryId
                        ? (categoryById.get(budget.categoryId)?.name ?? "Category limit")
                        : "Overall budget";
                      return (
                        <View
                          key={budget.id}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                            borderTopColor: theme.colors.border,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              style={[theme.text.label, { color: theme.colors.textPrimary }]}
                              numberOfLines={1}
                            >
                              {name}
                            </Text>
                            <Text
                              style={[
                                theme.text.caption,
                                { color: theme.colors.textSecondary, marginTop: 2 },
                              ]}
                              numberOfLines={1}
                            >
                              {`${formatMoney(budget.limitMinor, budget.currency)} ${
                                budget.currency
                              } · ${PERIOD_LABELS[budget.period]}`}
                            </Text>
                          </View>
                          <Button
                            label={`Recreate in ${data.currency}`}
                            variant="ghost"
                            size="sm"
                            fullWidth={false}
                            onPress={() => openRecreate(budget)}
                          />
                        </View>
                      );
                    })}
                  </Card>
                  <Text
                    style={[
                      theme.text.caption,
                      { color: theme.colors.textTertiary, marginTop: 8, paddingHorizontal: 4 },
                    ]}
                  >
                    Limits stay in the currency they were set in. Recreating copies the number
                    and retires the old limit; nothing is converted.
                  </Text>
                </>
              ) : null}

              <Text
                style={[
                  theme.text.caption,
                  {
                    color: theme.colors.textTertiary,
                    marginTop: 16,
                    paddingHorizontal: 4,
                  },
                ]}
              >
                {data.period === "weekly"
                  ? "Weekly budgets carry over — every week uses the same limit."
                  : data.period === "yearly"
                    ? "Yearly budgets carry over — they do not reset in January."
                    : "Monthly budgets carry over — they do not reset on the 1st."}
                {" Each period keeps its own limits."}
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <PickerSheet
        visible={picking}
        title="Set a limit for"
        options={availableCategories.map((category) => ({
          value: category.id,
          label: category.name,
        }))}
        searchable
        searchPlaceholder="Search categories"
        onSelect={(value) => openCategory(value, null)}
        onClose={() => setPicking(false)}
      />

      <PickerSheet
        visible={periodOpen}
        title="Budget period"
        options={PERIODS.map((value) => ({
          value,
          label: PERIOD_LABELS[value],
          secondary:
            value === "weekly"
              ? "Weeks start on the day the budget was created"
              : value === "monthly"
                ? "The whole calendar month"
                : "The whole calendar year",
        }))}
        selected={data?.period}
        onSelect={(value) => {
          if (isBudgetPeriod(value)) changePeriod(value);
        }}
        onClose={() => setPeriodOpen(false)}
      />

      {editing && data ? (
        <BudgetEditorSheet
          key={`${editing.categoryId ?? "overall"}-${editing.replacesBudgetId ?? "own"}`}
          visible
          currency={data.currency}
          period={data.period}
          startDate={editing.existing?.startDate ?? today}
          categoryId={editing.categoryId}
          title={editing.title}
          existing={editing.existing}
          initialLimitMinor={editing.initialLimitMinor}
          onClose={() => setEditing(null)}
          onSaved={finishEditing}
        />
      ) : null}
    </View>
  );
}
