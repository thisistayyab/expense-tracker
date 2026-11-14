import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "../../components/ui/AppIcon";
import { Pager } from "../../features/onboarding/Pager";
import { detectRegionDefaults } from "../../lib/region";
import { useOnboarding } from "../../lib/onboarding";
import { useTheme } from "../../lib/theme";

// The cover is dark in both themes, like Apple's own setup screens. It uses the
// system palette rather than a custom gradient so it still reads as iOS.
const INK = "#000000";
const PAPER = "#FFFFFF";
const MUTED = "rgba(235,235,245,0.60)";

function ValueRow({ title, body }: { title: string; body: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View style={{ width: 22, alignItems: "center", paddingTop: 1 }}>
        <AppIcon name="check" color={theme.colors.accent} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: PAPER, fontSize: 17, fontWeight: "600", letterSpacing: -0.3 }}>
          {title}
        </Text>
        <Text style={{ color: MUTED, fontSize: 15, lineHeight: 20, marginTop: 1 }}>{body}</Text>
      </View>
    </View>
  );
}

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const { finish } = useOnboarding();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skip = () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    // Flipping the onboarding flag disables the onboarding guard, and the root
    // Stack falls back to the tabs — no second navigation to race.
    finish(detectRegionDefaults()).catch((cause: unknown) => {
      setError(`Could not finish setup: ${String(cause)}`);
      setBusy(false);
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: INK }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ alignItems: "flex-end", paddingHorizontal: 20, paddingTop: 6 }}>
          <Pressable
            onPress={skip}
            disabled={busy}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding and use detected settings"
            style={({ pressed }) => ({ opacity: pressed || busy ? 0.5 : 1 })}
          >
            <Text style={{ color: theme.colors.accent, fontSize: 17 }}>Skip</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 14,
              backgroundColor: theme.colors.accentFill,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 30, fontWeight: "700", letterSpacing: -1 }}>
              S
            </Text>
          </View>

          <Text
            style={{
              color: PAPER,
              fontSize: 34,
              lineHeight: 41,
              fontWeight: "700",
              letterSpacing: -0.8,
              marginTop: 24,
            }}
          >
            Know what&apos;s{"\n"}left, not just{"\n"}what&apos;s gone.
          </Text>

          <Text style={{ color: MUTED, fontSize: 17, lineHeight: 23, marginTop: 12, maxWidth: 300 }}>
            Track spending in seconds and see what you can safely spend today.
          </Text>

          <View
            style={{
              marginTop: 28,
              gap: 16,
              paddingTop: 20,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: "rgba(84,84,88,0.60)",
            }}
          >
            <ValueRow title="5-second entry" body="Amount first. Everything else is optional." />
            <ValueRow title="Safe to spend, daily" body="One number after bills and budgets." />
            <ValueRow title="Works offline" body="Your data stays on this device." />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{ marginBottom: 18 }}>
            <Pager active={0} total={3} tone="ink" />
          </View>

          <Pressable
            onPress={() => router.push("/(onboarding)/region")}
            accessibilityRole="button"
            accessibilityLabel="Get started"
            style={({ pressed }) => ({
              height: 50,
              borderRadius: 25,
              backgroundColor: theme.colors.accentFill,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "600" }}>Get started</Text>
          </Pressable>

          {error ? (
            <Text style={{ color: theme.colors.danger, fontSize: 13, marginTop: 12, textAlign: "center" }}>
              {error}
            </Text>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

