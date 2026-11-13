import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { Pager } from "../../features/onboarding/Pager";
import { detectRegionDefaults } from "../../lib/region";
import { useOnboarding } from "../../lib/onboarding";

// The only dark-first screen in v1 (07 §1). It deliberately does not follow the
// theme: light mode still gets the ink welcome, which is what makes it feel like a
// cover rather than a form.
const INK = "#0B0C10";
const PAPER = "#F5F5F3";
const MUTED = "rgba(245,245,243,0.55)";
const FAINT = "rgba(245,245,243,0.45)";

function Glow({ size, top, left, opacity }: { size: number; top?: number; left?: number; opacity: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top, left, width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="onboarding-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#8E6BF6" stopOpacity={opacity} />
            <Stop offset="0.68" stopColor="#8E6BF6" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#onboarding-glow)" />
      </Svg>
    </View>
  );
}

function ValueRow({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: "rgba(139,139,255,0.22)",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        <Text style={{ color: "#B7A6FF", fontSize: 13, fontWeight: "700" }}>✓</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: PAPER, fontSize: 14, fontWeight: "600", letterSpacing: -0.2 }}>
          {title}
        </Text>
        <Text style={{ color: FAINT, fontSize: 12.5, marginTop: 2 }}>{body}</Text>
      </View>
    </View>
  );
}

export default function WelcomeScreen() {
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
      <Glow size={420} top={-190} left={-15} opacity={0.55} />
      <Glow size={320} top={560} left={-130} opacity={0.42} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ alignItems: "flex-end", paddingHorizontal: 22 }}>
          <Pressable
            onPress={skip}
            disabled={busy}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding and use detected settings"
            style={({ pressed }) => ({
              height: 44,
              justifyContent: "center",
              opacity: pressed || busy ? 0.5 : 1,
            })}
          >
            <Text style={{ color: FAINT, fontSize: 14, fontWeight: "600" }}>Skip</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28 }}>
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 20,
              backgroundColor: "#5B5BF7",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "700" }}>$</Text>
          </View>

          <Text
            style={{
              color: PAPER,
              fontSize: 34,
              lineHeight: 39,
              fontWeight: "700",
              letterSpacing: -1.5,
              marginTop: 26,
            }}
          >
            Know what&apos;s{"\n"}left, not just{"\n"}what&apos;s gone.
          </Text>

          <Text style={{ color: MUTED, fontSize: 15, lineHeight: 22, marginTop: 13, maxWidth: 280 }}>
            Track spending in seconds and see what you can safely spend today.
          </Text>

          <View style={{ marginTop: 26, gap: 13 }}>
            <ValueRow title="5-second entry" body="Amount first. Everything else is optional." />
            <ValueRow title="Safe to spend, daily" body="One number after bills and budgets." />
            <ValueRow title="Works offline" body="Your data stays on this device." />
          </View>
        </View>

        <View style={{ paddingHorizontal: 22, paddingBottom: 24 }}>
          <View style={{ marginBottom: 16 }}>
            <Pager active={0} total={3} tone="ink" />
          </View>

          <Pressable
            onPress={() => router.push("/(onboarding)/region")}
            accessibilityRole="button"
            accessibilityLabel="Get started"
            style={({ pressed }) => ({
              height: 56,
              borderRadius: 28,
              backgroundColor: PAPER,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ color: INK, fontSize: 16.5, fontWeight: "600" }}>Get started</Text>
          </Pressable>

          {error ? (
            <Text style={{ color: "#FF7A6B", fontSize: 12.5, marginTop: 12, textAlign: "center" }}>
              {error}
            </Text>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
