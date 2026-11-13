import Constants from "expo-constants";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";

import { Card, SectionHeader } from "../../components/ui";
import { DeleteAllSheet } from "../../features/settings/DeleteAllSheet";
import { SettingsRow } from "../../features/settings/SettingsRow";
import { getCountry } from "../../constants/countries";
import { getCurrency } from "../../constants/currencies";
import { listAccounts } from "../../lib/db/repos/accounts";
import { listCategories } from "../../lib/db/repos/categories";
import { listRecurringRules } from "../../lib/db/repos/recurring";
import { getAllSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import type { Db } from "../../lib/db/types";
import { useTheme } from "../../lib/theme";

type Snapshot = {
  country: string;
  currency: string;
  theme: string;
  appLock: boolean;
  accounts: number;
  categories: number;
  recurring: number;
};

const EMPTY: Snapshot = {
  country: "US",
  currency: "USD",
  theme: "system",
  appLock: false,
  accounts: 0,
  categories: 0,
  recurring: 0,
};

export default function SettingsScreen() {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const [data, setData] = useState<Snapshot>(EMPTY);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    const [settings, accounts, categories, recurring] = await Promise.all([
      getAllSettings(db),
      listAccounts(db, { includeArchived: true }),
      listCategories(db, { includeArchived: true }),
      listRecurringRules(db, { includeInactive: true }),
    ]);
    setData({
      country: settings[SETTING_KEYS.country] ?? "US",
      currency: settings[SETTING_KEYS.currency] ?? "USD",
      theme: settings[SETTING_KEYS.theme] ?? "system",
      appLock: settings[SETTING_KEYS.appLock] === "1",
      accounts: accounts.length,
      categories: categories.length,
      recurring: recurring.length,
    });
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      load().catch(() => {
        if (!cancelled) setData(EMPTY);
      });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const country = getCountry(data.country);
  const currency = getCurrency(data.currency);
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const appearance = data.theme === "system" ? "System" : data.theme === "dark" ? "Dark" : "Light";

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.colors.bg }}
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
      >
        <SectionHeader title="Preferences" />
        <Card padded={false}>
          <SettingsRow
            label="Country"
            value={country.name}
            glyph="◎"
            tone="sky"
            onPress={() => router.push("/settings/region")}
          />
          <SettingsRow
            label="Currency"
            value={`${data.currency} ${currency.symbol}`}
            glyph="$"
            tone="mint"
            showDivider
            onPress={() => router.push("/settings/region")}
          />
          <SettingsRow
            label="Appearance"
            value={appearance}
            glyph="◐"
            tone="iris"
            showDivider
            onPress={() => router.push("/settings/appearance")}
          />
        </Card>

        <SectionHeader title="Library" />
        <Card padded={false}>
          <SettingsRow
            label="Categories"
            value={String(data.categories)}
            glyph="▤"
            tone="amber"
            onPress={() => router.push("/settings/categories")}
          />
          <SettingsRow
            label="Accounts"
            value={String(data.accounts)}
            glyph="◫"
            tone="sky"
            showDivider
            onPress={() => router.push("/settings/accounts")}
          />
          <SettingsRow
            label="Recurring"
            value={String(data.recurring)}
            glyph="↻"
            tone="mint"
            showDivider
            onPress={() => router.push("/settings/recurring")}
          />
        </Card>

        <SectionHeader title="Data" />
        <Card padded={false}>
          <SettingsRow
            label="Export CSV"
            value="Share"
            glyph="↗"
            tone="iris"
            onPress={() => router.push({ pathname: "/settings/data", params: { action: "csv" } })}
          />
          <SettingsRow
            label="Backup (JSON)"
            value="Save file"
            glyph="↓"
            tone="sky"
            showDivider
            onPress={() => router.push({ pathname: "/settings/data", params: { action: "backup" } })}
          />
          <SettingsRow
            label="Restore from backup"
            glyph="↑"
            tone="slate"
            showDivider
            onPress={() => router.push({ pathname: "/settings/data", params: { action: "restore" } })}
          />
          <SettingsRow
            label="App lock"
            value={data.appLock ? "On" : "Off"}
            glyph="⌾"
            tone="coral"
            showDivider
            onPress={() => router.push("/settings/security")}
          />
        </Card>

        <Pressable
          onPress={() => setDeleteOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Delete all data"
          style={({ pressed }) => ({
            minHeight: 46,
            marginTop: 16,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={[theme.text.label, { color: theme.colors.danger }]}>Delete all data</Text>
        </Pressable>

        <SectionHeader title="About" />
        <Card padded={false}>
          <SettingsRow
            label="About Expense Tracker"
            value={`v${version}`}
            glyph="i"
            tone="slate"
            onPress={() => router.push("/settings/about")}
          />
          <SettingsRow
            label="Privacy"
            value="Local only"
            glyph="◈"
            tone="slate"
            showDivider
            onPress={() => router.push("/settings/privacy")}
          />
        </Card>

        <Text
          style={[
            theme.text.caption,
            { color: theme.colors.textTertiary, marginTop: 20, textAlign: "center" },
          ]}
        >
          Expense Tracker {version} · works offline
        </Text>
      </ScrollView>

      <DeleteAllSheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          load().catch(() => {});
        }}
      />
    </>
  );
}
