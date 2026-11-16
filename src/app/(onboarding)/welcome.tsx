import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon, type AppIconName } from "../../components/ui/AppIcon";
import { BrandMark } from "../../components/ui/BrandMark";
import { TactilePressable } from "../../components/ui/TactilePressable";
import { Pager } from "../../features/onboarding/Pager";
import { haptics } from "../../lib/haptics";
import { iosEnter } from "../../lib/motion";
import { useOnboarding } from "../../lib/onboarding";
import { detectRegionDefaults } from "../../lib/region";
import { useTheme } from "../../lib/theme";

const COVER_BG = "#0B0C10";
const PAPER = "#F4F5F8";
const MUTED = "#98A0B3";
const SURFACE_CARD = "#15171F";
const HAIRLINE = "rgba(255, 255, 255, 0.08)";

function ValueRow({
  icon,
  tint,
  title,
  body,
  divider = false,
}: {
  icon: AppIconName;
  tint: string;
  title: string;
  body: string;
  divider?: boolean;
}) {
  return (
    <View
      style={[
        styles.valueRow,
        divider ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: HAIRLINE } : null,
      ]}
    >
      <View
        style={[
          styles.valueIcon,
          { backgroundColor: `${tint}20` },
        ]}
      >
        <AppIcon name={icon} color={tint} size={17} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.valueTitle}>{title}</Text>
        <Text style={styles.valueBody}>{body}</Text>
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
    <View style={{ flex: 1, backgroundColor: COVER_BG }}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={["#101218", "#0B0C10", "#090A0D"]}
          locations={[0, 0.45, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ alignItems: "flex-end", paddingHorizontal: 20, paddingTop: 6 }}>
          <TactilePressable
            onPress={skip}
            disabled={busy}
            hitSlop={10}
            haptic="selection"
            scaleTo={0.94}
            radius={999}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding and use detected settings"
            style={styles.skipPill}
          >
            <Text style={[theme.text.caption, { fontWeight: "600", color: PAPER }]}>
              Skip
            </Text>
          </TactilePressable>
        </View>

        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
          <Animated.View entering={iosEnter(0)} style={styles.emblemOuter}>
            <BrandMark size={64} framed />
          </Animated.View>

          <Animated.View entering={iosEnter(70)}>
            <Text
              style={{
                color: PAPER,
                fontSize: 34,
                lineHeight: 41,
                fontWeight: "700",
                letterSpacing: -0.9,
                marginTop: 22,
              }}
            >
              Know what&apos;s{"\n"}left, not just{"\n"}what&apos;s gone.
            </Text>

            <Text style={{ color: MUTED, fontSize: 16, lineHeight: 23, marginTop: 12, maxWidth: 310 }}>
              Track spending in seconds and see what you can safely spend today.
            </Text>
          </Animated.View>

          <Animated.View entering={iosEnter(140)} style={styles.featureCardOuter}>
            <View style={styles.featureCardClip}>
              <ValueRow
                icon="sparkles"
                tint="#0A84FF"
                title="5-second entry"
                body="Amount first. Everything else is optional."
              />
              <ValueRow
                icon="shield"
                tint="#30D158"
                title="Safe to spend, daily"
                body="One number after bills and budgets."
                divider
              />
              <ValueRow
                icon="lock"
                tint="#7D7AFF"
                title="Works offline"
                body="Your data stays on this device."
                divider
              />
            </View>
          </Animated.View>
        </View>

        <Animated.View entering={iosEnter(200)} style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
          <View style={{ marginBottom: 16 }}>
            <Pager active={0} total={3} tone="ink" />
          </View>

          <TactilePressable
            onPress={() => {
              haptics.selection();
              router.push("/(onboarding)/region");
            }}
            disabled={busy}
            scaleTo={0.975}
            radius={999}
            accessibilityRole="button"
            accessibilityLabel="Get started"
            style={styles.ctaShadow}
          >
            <View style={styles.cta}>
              <Text style={styles.ctaText}>Get started</Text>
              <AppIcon name="chevronRight" color="#FFFFFF" size={16} weight="bold" />
            </View>
          </TactilePressable>

          {error ? (
            <Text style={{ color: theme.colors.danger, fontSize: 13, marginTop: 12, textAlign: "center" }}>
              {error}
            </Text>
          ) : null}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  skipPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    backgroundColor: SURFACE_CARD,
  },
  emblemOuter: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderCurve: "continuous",
    backgroundColor: "#0B0C10",
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000000",
          shadowOpacity: 0.32,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        }
      : null),
  },
  featureCardOuter: {
    marginTop: 26,
    borderRadius: 22,
    borderCurve: "continuous",
    backgroundColor: SURFACE_CARD,
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000000",
          shadowOpacity: 0.28,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        }
      : null),
  },
  featureCardClip: {
    borderRadius: 22,
    borderCurve: "continuous",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    backgroundColor: SURFACE_CARD,
  },
  valueRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  valueIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  valueTitle: {
    color: PAPER,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.25,
  },
  valueBody: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 2,
  },
  ctaShadow: {
    borderRadius: 999,
    backgroundColor: "#0A84FF",
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#0A84FF",
          shadowOpacity: 0.26,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
        }
      : { elevation: 4 }),
  },
  cta: {
    height: 54,
    borderRadius: 999,
    backgroundColor: "#0A84FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
});

