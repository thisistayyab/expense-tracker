import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, ScreenBackground } from "../../components/ui";
import { RegionEditor, type RegionValue } from "../../features/settings/RegionEditor";
import { applyRegionSelection } from "../../lib/db/onboarding";
import { getAllSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import { listCurrenciesInUse } from "../../lib/db/repos/transactions";
import type { Db } from "../../lib/db/types";
import { notifyLedgerChanged } from "../../lib/ledgerEvents";
import { useTheme } from "../../lib/theme";

/**
 * Same editor as onboarding, mounted from Settings. Changing the currency never
 * rewrites history: old rows keep their snapshot and totals simply stop including
 * them, so the confirmation spells that out before anything is written (09 flow 11).
 */
export default function SettingsRegionScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const db: Db = useSQLiteContext();
  const [value, setValue] = useState<RegionValue | null>(null);
  const [original, setOriginal] = useState<RegionValue | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    const settings = await getAllSettings(db);
    const next: RegionValue = {
      country: settings[SETTING_KEYS.country] ?? "US",
      currency: settings[SETTING_KEYS.currency] ?? "USD",
      locale: settings[SETTING_KEYS.locale] ?? "en-US",
    };
    setValue(next);
    setOriginal(next);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      load().catch((cause: unknown) => {
        if (!cancelled) setError(`Could not read settings: ${String(cause)}`);
      });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const write = (selection: RegionValue) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    applyRegionSelection(db, selection)
      .then(() => {
        notifyLedgerChanged();
        router.back();
      })
      .catch((cause: unknown) => {
        busyRef.current = false;
        setError(`Not saved: ${String(cause)}`);
        setBusy(false);
      });
  };

  const save = () => {
    if (!value || !original || busy || busyRef.current) return;

    if (value.currency.trim().toUpperCase() === original.currency.trim().toUpperCase()) {
      write(value);
      return;
    }

    busyRef.current = true;
    setBusy(true);
    listCurrenciesInUse(db)
      .then((usage) => {
        const hasHistory = usage.some((row) => row.currency === original.currency);
        busyRef.current = false;
        setBusy(false);
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
      .catch((cause: unknown) => {
        busyRef.current = false;
        setBusy(false);
        setError(`Could not check existing entries: ${String(cause)}`);
      });
  };

  if (!value) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenBackground />
        <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1 }}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
            {error ? (
              <>
                <Text style={[theme.text.body, { color: theme.colors.danger, textAlign: "center" }]}>
                  {error}
                </Text>
                <Button
                  label="Try again"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    load().catch((cause: unknown) =>
                      setError(`Could not read settings: ${String(cause)}`),
                    );
                  }}
                />
              </>
            ) : (
              <ActivityIndicator color={theme.colors.accent} />
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground />
      <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : 0}
        >
          <RegionEditor
            value={value}
            onChange={setValue}
            onContinue={save}
            continueLabel="Save"
            busy={busy}
            error={error}
            top={<View style={{ height: Platform.OS === "ios" ? insets.top + 46 : 8 }} />}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
