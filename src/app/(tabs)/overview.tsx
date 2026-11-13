import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_CLEARANCE } from "../../components/navigation/FloatingTabBar";
import { Button, Card, EmptyState } from "../../components/ui";
import { listAccounts } from "../../lib/db/repos/accounts";
import { listCategories } from "../../lib/db/repos/categories";
import { getAllSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import { countTransactions } from "../../lib/db/repos/transactions";
import type { Db } from "../../lib/db/types";
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
    <Card variant="muted" style={{ marginTop: 12 }}>
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

export default function OverviewScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const db: Db = useSQLiteContext();
  const [count, setCount] = useState<number | null>(null);

  // Refresh on focus so a save or an undo is reflected without a reload.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      countTransactions(db)
        .then((next) => {
          if (!cancelled) setCount(next);
        })
        .catch(() => {
          if (!cancelled) setCount(0);
        });
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  const monthLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    [],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            gap: 4,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
                {monthLabel}
              </Text>
              <Text style={[theme.text.title1, { color: theme.colors.textPrimary }]}>Overview</Text>
            </View>
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

          {count === 0 ? (
            <Card style={{ marginTop: 16 }}>
              <EmptyState
                title="Start with one"
                body="Log your first expense — the price is the only required field. Everything stays on this device."
                actionLabel="Log your first expense"
                onAction={() => router.push("/add")}
              />
            </Card>
          ) : null}

          {__DEV__ ? <DataStatusCard /> : null}
        </ScrollView>
      </SafeAreaView>

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
