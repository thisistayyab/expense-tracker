import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card, SectionHeader } from "../../components/ui";
import { setSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import type { Db } from "../../lib/db/types";
import { haptics } from "../../lib/haptics";
import { useTheme, type ThemePreference } from "../../lib/theme";

const OPTIONS: { value: ThemePreference; label: string; body: string }[] = [
  { value: "system", label: "System", body: "Follow the device's light or dark setting." },
  { value: "light", label: "Light", body: "Warm paper canvas, white cards." },
  { value: "dark", label: "Dark", body: "Deep ink canvas, outlined cards." },
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
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: 20 }}>
      <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
        Appearance is a display preference only; no amount, date or currency changes with it.
      </Text>

      <SectionHeader title="Theme" />
      <Card padded={false}>
        {OPTIONS.map((option, index) => {
          const selected = option.value === preference;
          return (
            <Pressable
              key={option.value}
              onPress={() => void choose(option.value)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label} theme`}
              style={({ pressed }) => ({
                minHeight: 64,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 16,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: theme.colors.border,
                opacity: pressed ? 0.65 : 1,
              })}
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
                <Text style={[theme.text.title3, { color: theme.colors.accent }]}>✓</Text>
              ) : null}
            </Pressable>
          );
        })}
      </Card>

      {error ? (
        <Text style={[theme.text.caption, { color: theme.colors.danger, marginTop: 14 }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
