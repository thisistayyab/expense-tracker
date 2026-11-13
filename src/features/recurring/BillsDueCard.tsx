import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";

import { Card, Money } from "../../components/ui";
import { listUpcomingRecurringRules } from "../../lib/db/repos/recurring";
import type { Db, RecurringRule } from "../../lib/db/types";
import { addDays, daysBetween, toIsoDate } from "../../lib/domain/dates";
import { formatMoney } from "../../lib/format/money";
import { useTheme } from "../../lib/theme";
import { postNextOccurrence } from "./processDue";
import {
  getReminderPermission,
  refreshReminders,
  requestReminderPermission,
  type ReminderPermission,
} from "./reminders";

function dueLabel(due: string, today: string): string {
  const days = daysBetween(today, due);
  if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

/**
 * The primary bill reminder (R10): it works with notifications denied, and shows
 * unpaid manual bills as overdue rather than letting them disappear. Posting here
 * goes through the same idempotent occurrence insert as auto-posting.
 */
export function BillsDueCard({ currency }: { currency: string }) {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const today = toIsoDate(new Date());
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [permission, setPermission] = useState<ReminderPermission>("undetermined");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [upcoming, status] = await Promise.all([
      listUpcomingRecurringRules(db, { currency, throughDate: addDays(today, 7), limit: 3 }),
      getReminderPermission(),
    ]);
    setRules(upcoming);
    setPermission(status);
  }, [currency, db, today]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      load().catch(() => {
        if (!cancelled) setRules([]);
      });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  if (!rules.length) return null;

  const enableReminders = async () => {
    setBusy(true);
    const next = await requestReminderPermission();
    setPermission(next);
    if (next === "granted") await refreshReminders(db);
    if (next === "denied") {
      Alert.alert(
        "Notifications are off",
        "Bills still appear here and stay set aside from safe to spend. You can enable reminders in system settings.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open settings", onPress: () => void Linking.openSettings() },
        ],
      );
    }
    setBusy(false);
  };

  const postNow = async (rule: RecurringRule) => {
    setBusy(true);
    try {
      const result = await postNextOccurrence(db, rule, today);
      if (!result.posted) {
        Alert.alert("Already posted", "This occurrence is already in Activity.");
      }
      await refreshReminders(db);
      await load();
    } catch (cause) {
      Alert.alert("Not posted", String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padded={false} style={{ marginTop: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 14,
        }}
      >
        <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>Bills due</Text>
        <Pressable
          onPress={() => router.push("/settings/recurring")}
          accessibilityRole="button"
          accessibilityLabel="Manage recurring bills"
          hitSlop={8}
        >
          <Text style={[theme.text.caption, { color: theme.colors.accent, fontWeight: "600" }]}>
            Manage
          </Text>
        </Pressable>
      </View>

      {rules.map((rule, index) => (
        <Pressable
          key={rule.id}
          onPress={() => router.push("/settings/recurring")}
          accessibilityRole="button"
          accessibilityLabel={`${rule.itemName ?? "Recurring bill"}, ${formatMoney(
            rule.amountMinor,
            rule.currency,
          )}, ${dueLabel(rule.nextDueAt, today)}${rule.autoPost ? "" : ", unpaid"}`}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 11,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: theme.colors.border,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[theme.text.bodyStrong, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {rule.itemName ?? "Recurring bill"}
            </Text>
            <Text style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
              {dueLabel(rule.nextDueAt, today)} · {rule.autoPost ? "Auto-posts" : "Unpaid"}
            </Text>
          </View>
          <Money minor={rule.amountMinor} currency={rule.currency} />
          {!rule.autoPost && rule.nextDueAt <= today ? (
            <Pressable
              onPress={() => void postNow(rule)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Post ${rule.itemName ?? "bill"} now`}
              hitSlop={8}
              style={({ pressed }) => ({
                minHeight: 32,
                paddingHorizontal: 10,
                borderRadius: 16,
                justifyContent: "center",
                backgroundColor: theme.colors.accentSoft,
                opacity: pressed || busy ? 0.6 : 1,
              })}
            >
              <Text style={[theme.text.caption, { color: theme.colors.accent, fontWeight: "600" }]}>
                Post
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      ))}

      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Text style={[theme.text.caption, { color: theme.colors.textTertiary, flex: 1 }]}>
          {permission === "granted"
            ? "Reminders are on for bills with a lead time."
            : permission === "unavailable"
              ? "Bills stay visible here; notifications are not available on this device."
              : "Notifications are off. Bills still appear here."}
        </Text>
        {permission === "denied" || permission === "undetermined" ? (
          <Pressable
            onPress={() => void enableReminders()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Turn on bill reminders"
            hitSlop={8}
          >
            <Text style={[theme.text.caption, { color: theme.colors.accent, fontWeight: "600" }]}>
              Turn on
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}
