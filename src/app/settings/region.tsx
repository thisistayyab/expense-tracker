import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Alert, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RegionEditor, type RegionValue } from "../../features/settings/RegionEditor";
import { applyRegionSelection } from "../../lib/db/onboarding";
import { getAllSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import { listCurrenciesInUse } from "../../lib/db/repos/transactions";
import type { Db } from "../../lib/db/types";
import { useTheme } from "../../lib/theme";

/**
 * Same editor as onboarding, mounted from Settings. Changing the currency never
 * rewrites history: old rows keep their snapshot and totals simply stop including
 * them, so the confirmation spells that out before anything is written (09 flow 11).
 */
export default function SettingsRegionScreen() {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const [value, setValue] = useState<RegionValue | null>(null);
  const [original, setOriginal] = useState<RegionValue | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getAllSettings(db)
        .then((settings) => {
          if (cancelled) return;
          const next: RegionValue = {
            country: settings[SETTING_KEYS.country] ?? "US",
            currency: settings[SETTING_KEYS.currency] ?? "USD",
            locale: settings[SETTING_KEYS.locale] ?? "en-US",
          };
          setValue(next);
          setOriginal(next);
        })
        .catch((cause: unknown) => {
          if (!cancelled) setError(`Could not read settings: ${String(cause)}`);
        });
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  const write = (selection: RegionValue) => {
    setBusy(true);
    setError(null);
    applyRegionSelection(db, selection)
      .then(() => router.back())
      .catch((cause: unknown) => {
        setError(`Not saved: ${String(cause)}`);
        setBusy(false);
      });
  };

  const save = () => {
    if (!value || !original || busy) return;

    if (value.currency.trim().toUpperCase() === original.currency.trim().toUpperCase()) {
      write(value);
      return;
    }

    listCurrenciesInUse(db)
      .then((usage) => {
        const hasHistory = usage.some((row) => row.currency === original.currency);
        if (!hasHistory) {
          write(value);
          return;
        }

        Alert.alert(
          `Change currency to ${value.currency}?`,
          `Past entries keep ${original.currency} and are never converted. ` +
            `Totals will show ${value.currency} only, and budgets in ` +
            `${original.currency} stay until you recreate them.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: `Change to ${value.currency}`, onPress: () => write(value) },
          ],
        );
      })
      .catch((cause: unknown) => setError(`Could not check existing entries: ${String(cause)}`));
  };

  if (!value) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
        <RegionEditor
          value={value}
          onChange={setValue}
          onContinue={save}
          continueLabel="Save"
          busy={busy}
          error={error}
        />
      </SafeAreaView>
    </View>
  );
}
