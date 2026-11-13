import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui";
import { useTheme } from "../../lib/theme";
import { useAppLock } from "./AppLockProvider";

/**
 * Opaque lock surface. It never unmounts the app underneath (so returning from the
 * lock keeps the screen and scroll position), but hides it from accessibility.
 * Authentication is attempted once automatically; every failure leaves an explicit
 * Unlock button, and a device without any screen lock can turn the setting off.
 */
export function LockScreen() {
  const { theme } = useTheme();
  const { capability, unlock, turnOffUnavailable } = useAppLock();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  const attempt = async () => {
    setBusy(true);
    setError(null);
    const result = await unlock();
    if (!result.success) {
      setError(
        result.error === "user_cancel"
          ? "Cancelled. Unlock when you are ready."
          : `Could not verify: ${result.error ?? "try again"}`,
      );
    }
    setBusy(false);
  };

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void attempt();
    // The first prompt is allowed to run once per mount by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unavailable = capability?.available === false;

  return (
    <View
      style={{
        ...({ position: "absolute", inset: 0 } as const),
        backgroundColor: theme.colors.bg,
      }}
    >
      <SafeAreaView style={{ flex: 1, padding: 28, justifyContent: "center", gap: 16 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: theme.colors.accent,
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 30, color: theme.colors.accentFg }}>⌾</Text>
        </View>

        <Text style={[theme.text.title1, { color: theme.colors.textPrimary, textAlign: "center" }]}>
          Expense Tracker is locked
        </Text>
        <Text
          style={[
            theme.text.body,
            { color: theme.colors.textSecondary, textAlign: "center", maxWidth: 300, alignSelf: "center" },
          ]}
        >
          {unavailable
            ? capability?.reason ?? "This device cannot verify you right now."
            : `Use ${capability?.label ?? "your device lock"} to open it. After a failed scan, choose “Use device passcode”.`}
        </Text>

        {error ? (
          <Text style={[theme.text.caption, { color: theme.colors.danger, textAlign: "center" }]}>
            {error}
          </Text>
        ) : null}

        {unavailable ? (
          <Button
            label="Turn off app lock"
            variant="ghost"
            onPress={() =>
              Alert.alert(
                "Turn off app lock?",
                "This device has no screen lock, so the app cannot verify you. Your data stays on the device.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Turn off",
                    style: "destructive",
                    onPress: () => {
                      void turnOffUnavailable();
                    },
                  },
                ],
              )
            }
          />
        ) : (
          <Button label="Unlock" variant="accent" onPress={attempt} loading={busy} />
        )}

        <Pressable
          onPress={() => {
            setError(null);
          }}
          accessibilityRole="button"
          accessibilityLabel="Clear error"
          style={{ height: 1, opacity: 0 }}
        />
      </SafeAreaView>
    </View>
  );
}
