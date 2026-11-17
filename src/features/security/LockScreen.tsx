import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, BackHandler, Platform, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon, Button, Glass, ScreenBackground } from "../../components/ui";
import { iosEnter } from "../../lib/motion";
import { useTheme } from "../../lib/theme";
import { useAppLock } from "./appLockContext";

/**
 * Full-screen frosted biometric lock overlay presented inside a top-level Modal
 * so open sheets cannot sit above the lock gate.
 */
export function LockScreen({ veilOnly = false }: { veilOnly?: boolean }) {
  const { theme } = useTheme();
  const { capability, unlock, turnOffUnavailable } = useAppLock();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const attempted = useRef(false);

  const attempt = useCallback(async () => {
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
  }, [unlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Only auto-prompt while actively in the foreground; triggering Face ID / biometric
    // UI during a background transition causes the OS to cancel it immediately.
    if (veilOnly || appState !== "active") return;
    if (attempted.current || capability === null || !capability.available) return;
    attempted.current = true;
    void attempt();
  }, [appState, attempt, capability, veilOnly]);

  useEffect(() => {
    const back = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => back.remove();
  }, []);

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

          <Text
            accessibilityRole="header"
            style={[theme.text.title1, styles.title, { color: theme.colors.textPrimary }]}
          >
            Suffice is locked
          </Text>
          {veilOnly ? null : (
            <>
              <Text style={[theme.text.body, styles.subtitle, { color: theme.colors.textSecondary }]}>
                {unavailable
                  ? capability?.reason ?? "This device cannot verify you right now."
                  : "Your financial ledger stays private and on this device."}
              </Text>

              {error ? (
                <View
                  accessibilityLiveRegion="polite"
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
                  <Button label="Unlock" variant="accent" onPress={() => void attempt()} loading={busy} />
                )}
              </View>
            </>
          )}
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
});
