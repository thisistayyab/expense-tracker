import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

import { Button, Card, EmptyState, Money, SectionHeader } from "../../components/ui";
import { RecurringEditorSheet } from "../../features/recurring/RecurringEditorSheet";
import { postNextOccurrence } from "../../features/recurring/processDue";
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
import { useTheme } from "../../lib/theme";
import { refreshReminders } from "../../features/recurring/reminders";

function nextLabel(rule: RecurringRule): string {
  const today = toIsoDate(new Date());
  if (!rule.isActive) return `Paused · last due ${rule.nextDueAt}`;
  if (rule.nextDueAt < today) return `Overdue since ${rule.nextDueAt}`;
  if (rule.nextDueAt === today) return "Due today";
  return `Next ${rule.nextDueAt}`;
}

export default function RecurringScreen() {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [activeCurrency, setActiveCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [nextRules, settings] = await Promise.all([
      listRecurringRules(db, { includeInactive: true }),
      getAllSettings(db),
    ]);
    setRules(nextRules);
    setActiveCurrency(settings[SETTING_KEYS.currency] ?? "USD");
  }, [db]);

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

  const active = useMemo(() => rules.filter((rule) => rule.isActive), [rules]);
  const paused = useMemo(() => rules.filter((rule) => !rule.isActive), [rules]);

  const toggle = async (rule: RecurringRule, on: boolean) => {
    setBusyId(rule.id);
    try {
      await setRecurringActive(db, rule.id, on);
      await refreshReminders(db);
      haptics.selection();
      refresh();
    } catch (cause) {
      setError(`Could not change the rule: ${String(cause)}`);
    } finally {
      setBusyId(null);
    }
  };

  const post = async (rule: RecurringRule) => {
    setBusyId(rule.id);
    try {
      const result = await postNextOccurrence(db, rule);
      if (!result.posted) Alert.alert("Already posted", "This occurrence is already in Activity.");
      await refreshReminders(db);
      refresh();
    } catch (cause) {
      Alert.alert("Not posted", String(cause));
    } finally {
      setBusyId(null);
    }
  };

  const row = (rule: RecurringRule, index: number) => {
    const due = rule.nextDueAt <= toIsoDate(new Date());
    return (
      <View
        key={rule.id}
        style={{
          borderTopWidth: index === 0 ? 0 : 1,
          borderTopColor: theme.colors.border,
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => setEditing(rule)}
            accessibilityRole="button"
            accessibilityLabel={`${rule.itemName ?? "Recurring rule"}, ${nextLabel(rule)}`}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 0,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              opacity: pressed ? 0.65 : 1,
            })}
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
                {frequencyLabel(rule.frequency, rule.intervalCount)} · {nextLabel(rule)}
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
          </Pressable>
          <Switch
            value={rule.isActive}
            onValueChange={(value) => void toggle(rule, value)}
            disabled={busyId === rule.id}
            trackColor={{ false: theme.colors.surfaceSunken, true: theme.colors.accent }}
            thumbColor={theme.colors.surface}
            accessibilityLabel={`${rule.isActive ? "Pause" : "Resume"} ${rule.itemName ?? "rule"}`}
          />
        </View>
        {!rule.autoPost && due && rule.isActive ? (
          <Pressable
            onPress={() => void post(rule)}
            disabled={busyId === rule.id}
            accessibilityRole="button"
            accessibilityLabel={`Post ${rule.itemName ?? "bill"} now`}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              height: 30,
              paddingHorizontal: 12,
              borderRadius: 15,
              justifyContent: "center",
              backgroundColor: theme.colors.accentSoft,
              opacity: pressed || busyId === rule.id ? 0.6 : 1,
            })}
          >
            <Text style={[theme.text.caption, { color: theme.colors.accent, fontWeight: "600" }]}>
              Post this occurrence · {formatMoney(rule.amountMinor, rule.currency)}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
          Bills and income that repeat. Auto-post catches up every missed occurrence exactly once
          when you open the app; manual rules wait for you.
        </Text>

        <View style={{ marginTop: 14 }}>
          <Button label="+ New recurring rule" variant="accent" onPress={() => setAdding(true)} />
        </View>

        {loading && !rules.length ? (
          <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 28 }} />
        ) : null}

        {!loading && !rules.length ? (
          <View style={{ marginTop: 24 }}>
            <EmptyState
              title="Add your first bill"
              body="Rent, a phone bill or a salary. Auto-post keeps it current even after a month away."
              actionLabel="Add a recurring rule"
              onAction={() => setAdding(true)}
            />
          </View>
        ) : null}

        {active.length ? (
          <>
            <SectionHeader title="Active" />
            <Card padded={false}>{active.map(row)}</Card>
          </>
        ) : null}

        {paused.length ? (
          <>
            <SectionHeader title="Paused" />
            <Card padded={false}>{paused.map(row)}</Card>
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

      {adding ? (
        <RecurringEditorSheet
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            refresh();
            void refreshReminders(db).catch(() => 0);
          }}
        />
      ) : null}

      {editing ? (
        <RecurringEditorSheet
          rule={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
            void refreshReminders(db).catch(() => 0);
          }}
        />
      ) : null}
    </View>
  );
}
