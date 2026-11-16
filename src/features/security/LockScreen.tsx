import { useEffect, useRef, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon, Button, Glass, ScreenBackground } from "../../components/ui";
import { iosEnter } from "../../lib/motion";
import { useTheme } from "../../lib/theme";
import { useAppLock } from "./appLockContext";

/**
 * Full-screen frosted biometric lock overlay preserving navigation & scroll underneath.
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
    if (attempted.current || capability === null || !capability.available) return;
    attempted.current = true;
    void attempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capability]);

  const unavailable = capability?.available === false;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <ScreenBackground />
      <SafeAreaView style={styles.safe}>
        <Animated.View entering={iosEnter(0)} style={styles.center}>
          <Glass
            tone="regular"
            radius={28}
            style={[styles.emblem, Platform.OS === "ios" ? theme.shadow.lift : null]}
          >
            <View
              style={[
                styles.emblemCore,
                { backgroundColor: theme.colors.accentSoft },
              ]}
            >
              <AppIcon
                name={Platform.OS === "ios" ? "faceid" : "lock"}
                size={32}
                color={theme.colors.accent}
                weight="semibold"
              />
            </View>
          </Glass>

          <Text style={[theme.text.title1, styles.title, { color: theme.colors.textPrimary }]}>
            Suffice is locked
          </Text>
          <Text style={[theme.text.body, styles.subtitle, { color: theme.colors.textSecondary }]}>
            {unavailable
              ? capability?.reason ?? "This device cannot verify you right now."
              : "Your financial ledger stays private and on this device."}
          </Text>

          {error ? (
            <View
              style={[
                styles.errorPill,
                {
                  backgroundColor:
                    theme.scheme === "dark"
                      ? "rgba(255, 82, 102, 0.16)"
                      : "rgba(224, 40, 64, 0.10)",
                },
              ]}
            >
              <Text style={[theme.text.caption, { color: theme.colors.danger, textAlign: "center" }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <View style={styles.ctaWrap}>
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
          </View>

          <Pressable
            onPress={() => {
              setError(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear error"
            style={styles.hiddenClear}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    gap: 14,
  },
  emblem: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emblemCore: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    maxWidth: 300,
  },
  errorPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ctaWrap: {
    width: "100%",
    maxWidth: 320,
    marginTop: 10,
  },
  hiddenClear: {
    height: 1,
    opacity: 0,
  },
});
