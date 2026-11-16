import Constants from "expo-constants";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, ScreenBackground, SectionHeader, TactilePressable } from "../../components/ui";
import { DeleteAllSheet } from "../../features/settings/DeleteAllSheet";
import { SettingsRow } from "../../features/settings/SettingsRow";
import { getCountry } from "../../constants/countries";
import { currencyLabel, getCurrency } from "../../constants/currencies";
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
    <View style={{ flex: 1 }}>
      <ScreenBackground />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
      >
        <SectionHeader title="Preferences" />
        <Card variant="glass" padded={false}>
          <SettingsRow
            label="Country"
            value={country.name}
            icon="globe"
            tone="sky"
            onPress={() => router.push("/settings/region")}
          />
          <SettingsRow
            label="Currency"
            value={currencyLabel(currency)}
            icon="currency"
            tone="mint"
            showDivider
            onPress={() => router.push("/settings/region")}
          />
          <SettingsRow
            label="Appearance"
            value={appearance}
            icon="appearance"
            tone="iris"
            showDivider
            onPress={() => router.push("/settings/appearance")}
          />
        </Card>

        <SectionHeader title="Library" />
        <Card variant="glass" padded={false}>
          <SettingsRow
            label="Categories"
            value={String(data.categories)}
            icon="categories"
            tone="amber"
            onPress={() => router.push("/settings/categories")}
          />
          <SettingsRow
            label="Accounts"
            value={String(data.accounts)}
            icon="accounts"
            tone="sky"
            showDivider
            onPress={() => router.push("/settings/accounts")}
          />
          <SettingsRow
            label="Recurring"
            value={String(data.recurring)}
            icon="recurring"
            tone="mint"
            showDivider
            onPress={() => router.push("/settings/recurring")}
          />
        </Card>

        <SectionHeader title="Data" />
        <Card variant="glass" padded={false}>
          <SettingsRow
            label="Export CSV"
            value="Share"
            icon="export"
            tone="iris"
            onPress={() => router.push({ pathname: "/settings/data", params: { action: "csv" } })}
          />
          <SettingsRow
            label="Backup (JSON)"
            value="Save file"
            icon="download"
            tone="sky"
            showDivider
            onPress={() => router.push({ pathname: "/settings/data", params: { action: "backup" } })}
          />
          <SettingsRow
            label="Restore from backup"
            icon="upload"
            tone="slate"
            showDivider
            onPress={() => router.push({ pathname: "/settings/data", params: { action: "restore" } })}
          />
          <SettingsRow
            label="App lock"
            value={data.appLock ? "On" : "Off"}
            icon="lock"
            tone="coral"
            showDivider
            onPress={() => router.push("/settings/security")}
          />
        </Card>

        <TactilePressable
          onPress={() => setDeleteOpen(true)}
          haptic="selection"
          scaleTo={0.97}
          radius={theme.radius.card}
          accessibilityRole="button"
          accessibilityLabel="Delete all data"
          style={{
            minHeight: 48,
            marginTop: 18,
            borderRadius: theme.radius.card,
            borderCurve: "continuous",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: `${theme.colors.danger}32`,
            backgroundColor: `${theme.colors.danger}16`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={[theme.text.label, { color: theme.colors.danger, fontWeight: "700" }]}>
            Delete all data
          </Text>
        </TactilePressable>

        <SectionHeader title="About" />
        <Card variant="glass" padded={false}>
          <SettingsRow
            label="About Suffice"
            value={`v${version}`}
            icon="info"
            tone="slate"
            onPress={() => router.push("/settings/about")}
          />
          <SettingsRow
            label="Privacy"
            value="Local only"
            icon="shield"
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
          Suffice {version} · works offline
        </Text>
      </ScrollView>

      <DeleteAllSheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          load().catch(() => {});
        }}
      />
    </View>
  );
}
