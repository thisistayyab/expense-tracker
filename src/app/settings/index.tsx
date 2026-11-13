import Constants from "expo-constants";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ScrollView, Text } from "react-native";

import { Card, FieldRow, SectionHeader } from "../../components/ui";
import { getCountry } from "../../constants/countries";
import { listAccounts } from "../../lib/db/repos/accounts";
import { listCategories } from "../../lib/db/repos/categories";
import { getAllSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import type { Db } from "../../lib/db/types";
import { useTheme } from "../../lib/theme";

export default function SettingsScreen() {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const [region, setRegion] = useState<{ country: string; currency: string } | null>(null);
  const [counts, setCounts] = useState({ accounts: 0, categories: 0 });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        getAllSettings(db),
        listAccounts(db),
        listCategories(db),
      ])
        .then(([settings, accounts, categories]) => {
          if (cancelled) return;
          setRegion({
            country: settings[SETTING_KEYS.country] ?? "US",
            currency: settings[SETTING_KEYS.currency] ?? "USD",
          });
          setCounts({ accounts: accounts.length, categories: categories.length });
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  const country = region ? getCountry(region.country) : null;
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
    >
      <SectionHeader title="Preferences" />
      <Card>
        <FieldRow
          label="Country & currency"
          value={
            region ? `${country?.name ?? region.country} · ${region.currency}` : "Loading…"
          }
          onPress={() => router.push("/settings/region")}
        />
      </Card>

      <SectionHeader title="Library" />
      <Card>
        <FieldRow
          label="Categories"
          value={String(counts.categories)}
          onPress={() => router.push("/settings/categories")}
        />
        <FieldRow
          label="Accounts"
          value={String(counts.accounts)}
          showDivider
          onPress={() => router.push("/settings/accounts")}
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
  );
}
