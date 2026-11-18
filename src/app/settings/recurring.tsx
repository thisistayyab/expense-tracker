import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  appAlert,
  Button,
  Card,
  EmptyState,
  Money,
  ScreenBackground,
  SectionHeader,
  TactilePressable,
} from "../../components/ui";
import { RecurringEditorSheet } from "../../features/recurring/RecurringEditorSheet";
import { postNextOccurrence } from "../../features/recurring/processDue";
import { refreshReminders } from "../../features/recurring/reminders";
import {
  listRecurringRules,
  setRecurringActive,
} from "../../lib/db/repos/recurring";
import { getAllSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import type { Db, RecurringRule } from "../../lib/db/types";
import { toIsoDate } from "../../lib/domain/dates";
import { frequencyLabel } from "../../lib/domain/recurrence";
import { formatMoney } from "../../lib/format/money";
import { haptics } from "../../lib/haptics";
import { notifyLedgerChanged, subscribeLedgerChanged } from "../../lib/ledgerEvents";
import { FONT_FAMILIES, useTheme } from "../../lib/theme";

function nextLabel(rule: RecurringRule, today: string): string {
  if (!rule.isActive) return `Paused · last due ${rule.nextDueAt}`;
  if (rule.nextDueAt < today) return `Overdue since ${rule.nextDueAt}`;
  if (rule.nextDueAt === today) return "Due today";
  return `Next ${rule.nextDueAt}`;
}

export default function RecurringScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const db: Db = useSQLiteContext();
  const [today, setToday] = useState(() => toIsoDate(new Date()));
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [activeCurrency, setActiveCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetTarget, setSheetTarget] = useState<{ rule: RecurringRule | null } | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    const [nextRules, settings] = await Promise.all([
      listRecurringRules(db, { includeInactive: true }),
      getAllSettings(db),
    ]);
    setRules(nextRules);
    setActiveCurrency(settings[SETTING_KEYS.currency] ?? "USD");
    setError(null);
  }, [db]);

  useEffect(() => {
    const unsubLedger = subscribeLedgerChanged(() => {
      load().catch(() => {});
    });
    const subApp = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setToday(toIsoDate(new Date()));
        load().catch(() => {});
      }
    });
    return () => {
      unsubLedger();
      subApp.remove();
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      load()
        .catch((cause: unknown) => {
          if (!cancelled) setError(`Could not load recurring rules: ${String(cause)}`);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const refresh = () => {
    load().catch((cause: unknown) => setError(String(cause)));
  };

  const openNew = () => {
    setSheetTarget({ rule: null });
    setSheetVisible(true);
  };

  const openEdit = (rule: RecurringRule) => {
    setSheetTarget({ rule });
    setSheetVisible(true);
  };

  const active = useMemo(() => rules.filter((rule) => rule.isActive), [rules]);
  const paused = useMemo(() => rules.filter((rule) => !rule.isActive), [rules]);

  const toggle = async (rule: RecurringRule, on: boolean) => {
    if (busyRef.current || busyId) return;
    busyRef.current = true;
    setBusyId(rule.id);
    try {
      await setRecurringActive(db, rule.id, on);
      await refreshReminders(db);
      await load();
      notifyLedgerChanged();
      haptics.selection();
    } catch (cause) {
      setError(`Could not change the rule: ${String(cause)}`);
    } finally {
      busyRef.current = false;
      setBusyId(null);
    }
  };

  const post = async (rule: RecurringRule) => {
    if (busyRef.current || busyId) return;
    busyRef.current = true;
    setBusyId(rule.id);
    try {
      const currentToday = toIsoDate(new Date());
      setToday(currentToday);
      const result = await postNextOccurrence(db, rule, currentToday);
      if (!result.posted) {
        appAlert("Already posted", "This occurrence is already in Activity.");
      } else {
        notifyLedgerChanged();
      }
      await refreshReminders(db);
      await load();
    } catch (cause) {
      appAlert("Not posted", String(cause));
    } finally {
      busyRef.current = false;
      setBusyId(null);
    }
  };

  const anyBusy = Boolean(busyId);

  const row = (rule: RecurringRule, index: number) => {
    const due = rule.nextDueAt <= today;
    return (
      <View
        key={rule.id}
        style={{
          borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TactilePressable
            onPress={() => openEdit(rule)}
            disabled={anyBusy}
            haptic="selection"
            scaleTo={0.985}
            radius={12}
            accessibilityRole="button"
            accessibilityLabel={`${rule.itemName ?? "Recurring rule"}, ${nextLabel(rule, today)}`}
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[theme.text.bodyStrong, { color: theme.colors.textPrimary }]}
                numberOfLines={1}
              >
                {rule.itemName ?? "Recurring rule"}
              </Text>
              <Text
                style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}
                numberOfLines={1}
              >
                {frequencyLabel(rule.frequency, rule.intervalCount)} · {nextLabel(rule, today)}
                {rule.autoPost ? " · auto" : " · manual"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 2 }}>
              <Money minor={rule.amountMinor} currency={rule.currency} />
              {rule.currency !== activeCurrency ? (
                <Text style={[theme.text.caption, { color: theme.colors.textTertiary }]}>
                  {rule.currency} rule
                </Text>
              ) : null}
            </View>
          </TactilePressable>
          <Switch
            value={rule.isActive}
            onValueChange={(value) => void toggle(rule, value)}
            disabled={anyBusy}
            trackColor={{ false: theme.colors.surfaceSunken, true: theme.colors.accent }}
            thumbColor={theme.colors.surface}
            accessibilityLabel={`${rule.isActive ? "Pause" : "Resume"} ${rule.itemName ?? "rule"}`}
          />
        </View>
        {!rule.autoPost && due && rule.isActive ? (
          <TactilePressable
            onPress={() => void post(rule)}
            disabled={anyBusy}
            haptic="selection"
            scaleTo={0.95}
            radius={999}
            accessibilityRole="button"
            accessibilityLabel={`Post ${rule.itemName ?? "bill"} now`}
            style={{
              alignSelf: "flex-start",
              minHeight: 32,
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: 999,
              justifyContent: "center",
              backgroundColor: theme.colors.accentSoft,
              opacity: anyBusy ? 0.6 : 1,
            }}
          >
            <Text
              maxFontSizeMultiplier={1.3}
              style={[theme.text.caption, { color: theme.colors.accent, fontFamily: FONT_FAMILIES.bold }]}
            >
              Post this occurrence · {formatMoney(rule.amountMinor, rule.currency)}
            </Text>
          </TactilePressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground />
      <SafeAreaView edges={["left", "right"]} style={{ flex: 1 }}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        >
          <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
            Bills and income that repeat. Auto-post catches up every missed occurrence exactly once
            when you open the app; manual rules wait for you.
          </Text>

          <View style={{ marginTop: 14 }}>
            <Button
              label="New recurring rule"
              variant="accent"
              leftIcon="plus"
              disabled={anyBusy}
              onPress={openNew}
            />
          </View>

          {loading && !rules.length ? (
            <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 28 }} />
          ) : null}

          {!loading && !rules.length ? (
            <View style={{ marginTop: 24 }}>
              <EmptyState
                icon="repeat"
                title="Add your first bill"
                body="Rent, a phone bill or a salary. Auto-post keeps it current even after a month away."
                actionLabel="Add a recurring rule"
                onAction={openNew}
              />
            </View>
          ) : null}

          {active.length ? (
            <>
              <SectionHeader title="Active" />
              <Card variant="glass" padded={false}>{active.map(row)}</Card>
            </>
          ) : null}

          {paused.length ? (
            <>
              <SectionHeader title="Paused" />
              <Card variant="glass" padded={false}>{paused.map(row)}</Card>
            </>
          ) : null}

          {error ? (
            <Text style={[theme.text.caption, { color: theme.colors.danger, marginTop: 14 }]}>
              {error}
            </Text>
          ) : null}

          <Text
            style={[
              theme.text.caption,
              { color: theme.colors.textTertiary, marginTop: 18, textAlign: "center" },
            ]}
          >
            Rules in another currency keep posting in it. Nothing is converted.
          </Text>
        </ScrollView>
      </SafeAreaView>

      {sheetTarget ? (
        <RecurringEditorSheet
          visible={sheetVisible}
          rule={sheetTarget.rule}
          onClose={() => setSheetVisible(false)}
          onClosed={() => {
            if (!sheetVisible) setSheetTarget(null);
          }}
          onSaved={() => {
            setSheetVisible(false);
            refresh();
          }}
        />
      ) : null}
    </View>
  );
}
