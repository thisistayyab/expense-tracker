import Constants from "expo-constants";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ScrollView, Text } from "react-native";

import { Card, FieldRow, SectionHeader } from "../../components/ui";
import { getCountry } from "../../constants/countries";
import { getAllSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import type { Db } from "../../lib/db/types";
import { useTheme } from "../../lib/theme";

export default function SettingsScreen() {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const [region, setRegion] = useState<{ country: string; currency: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getAllSettings(db)
        .then((settings) => {
          if (cancelled) return;
          setRegion({
            country: settings[SETTING_KEYS.country] ?? "US",
            currency: settings[SETTING_KEYS.currency] ?? "USD",
          });
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
