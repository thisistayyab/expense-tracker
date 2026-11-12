import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_CLEARANCE } from "../../components/navigation/FloatingTabBar";
import { Button, Card, EmptyState } from "../../components/ui";
import { listAccounts } from "../../lib/db/repos/accounts";
import { listCategories } from "../../lib/db/repos/categories";
import { getAllSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import type { Db } from "../../lib/db/types";
import { useTheme } from "../../lib/theme";

/**
 * Dev-only proof that P1 booted: migrations ran and the seed landed. It is not part
 * of the product UI, so it never renders in a release build.
 */
function DataStatusCard() {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
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
        setSummary(
          `schema v${version?.user_version ?? 0} · ${categories.length} categories · ` +
            `${accounts.length} ${accountLabel} · ${settings[SETTING_KEYS.currency] ?? "USD"}`,
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
      <View style={{ marginTop: 12 }}>
        <Button
          label="Data tools"
          variant="ghost"
          size="sm"
          onPress={() => router.push("/dev-data")}
        />
      </View>
    </Card>
  );
}

export default function OverviewScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

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
          <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
            {monthLabel}
          </Text>
          <Text style={[theme.text.title1, { color: theme.colors.textPrimary }]}>Overview</Text>

          <Card style={{ marginTop: 16 }}>
            <EmptyState
              title="Start with one"
              body="Logging an expense — price, category, and what it was — arrives in the next phase. Your money stays on this device."
            />
          </Card>

          {__DEV__ ? <DataStatusCard /> : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
