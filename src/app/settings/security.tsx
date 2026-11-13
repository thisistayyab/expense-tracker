import { useState } from "react";
import { ActivityIndicator, Switch, Text, View } from "react-native";

import { Card, SectionHeader } from "../../components/ui";
import { useAppLock } from "../../features/security/AppLockProvider";
import { useTheme } from "../../lib/theme";

export default function SecurityScreen() {
  const { theme } = useTheme();
  const { enabled, capability, enable, disable } = useAppLock();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (on: boolean) => {
    setBusy(true);
    setError(null);
    const result = on ? await enable() : await disable();
    if (!result.success) {
      setError(
        result.error === "user_cancel"
          ? "Cancelled — nothing changed."
          : `Could not verify: ${result.error ?? "try again"}`,
      );
    }
    setBusy(false);
  };

  const unavailable = capability?.available === false;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: 20 }}>
      <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
        App lock asks for your face, fingerprint or device passcode when the app opens or returns
        from the background. The data itself is still stored only on this device.
      </Text>

      <SectionHeader title="Lock" />
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 }}>
          <View style={{ flex: 1 }}>
            <Text style={[theme.text.bodyStrong, { color: theme.colors.textPrimary }]}>
              App lock
            </Text>
            <Text style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
              {unavailable
                ? (capability?.reason ?? "Not available on this device")
                : enabled
                  ? `On · ${capability?.label ?? "device verification"}`
                  : "Off"}
            </Text>
          </View>
          {busy || enabled === null ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : (
            <Switch
              value={Boolean(enabled)}
              onValueChange={(value) => void toggle(value)}
              disabled={unavailable || busy}
              trackColor={{ false: theme.colors.surfaceSunken, true: theme.colors.accent }}
              thumbColor={theme.colors.surface}
              accessibilityLabel="App lock"
            />
          )}
        </View>
      </Card>

      <Text style={[theme.text.caption, { color: theme.colors.textTertiary, marginTop: 12 }]}>
        If a face or fingerprint scan fails, the system offers “Use device passcode”. If this
        device has no screen lock at all, the lock screen offers to turn app lock off rather than
        trapping you.
      </Text>

      {error ? (
        <Text style={[theme.text.caption, { color: theme.colors.danger, marginTop: 14 }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
