import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppIcon, Card, ScreenBackground, SectionHeader, TactilePressable } from "../../components/ui";
import { setSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import type { Db } from "../../lib/db/types";
import { haptics } from "../../lib/haptics";
import { useTheme, type ThemePreference } from "../../lib/theme";

const OPTIONS: { value: ThemePreference; label: string; body: string }[] = [
  { value: "system", label: "System", body: "Follow the device's light or dark setting." },
  { value: "light", label: "Light", body: "Daylight ambient canvas with frosted glass." },
  { value: "dark", label: "Dark", body: "Deep midnight obsidian canvas with smoked glass." },
];

export default function AppearanceScreen() {
  const { theme, preference, setPreference } = useTheme();
  const db: Db = useSQLiteContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (value: ThemePreference) => {
    if (busy || value === preference) return;
    haptics.selection();
    setPreference(value);
    setBusy(true);
    setError(null);
    try {
      await setSettings(db, { [SETTING_KEYS.theme]: value });
    } catch (cause) {
      setPreference(preference);
      setError(`Not saved: ${String(cause)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
      >
        <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
          Appearance is a display preference only; no amount, date or currency changes with it.
        </Text>

        <SectionHeader title="Theme" />
        <Card variant="glass" padded={false}>
          {OPTIONS.map((option, index) => {
            const selected = option.value === preference;
            return (
              <TactilePressable
                key={option.value}
                onPress={() => void choose(option.value)}
                disabled={busy}
                haptic="selection"
                scaleTo={0.985}
                radius={14}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${option.label} theme`}
                style={{
                  minHeight: 66,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: theme.colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[theme.text.bodyStrong, { color: theme.colors.textPrimary }]}>
                    {option.label}
                  </Text>
                  <Text style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                    {option.body}
                  </Text>
                </View>
                {selected ? (
                  <AppIcon name="checkmarkCircle" color={theme.colors.accent} size={20} />
                ) : null}
              </TactilePressable>
            );
          })}
        </Card>

        {error ? (
          <Text style={[theme.text.caption, { color: theme.colors.danger, marginTop: 14 }]}>
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
