import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenBackground } from "../../components/ui";
import { Pager } from "../../features/onboarding/Pager";
import { RegionEditor, type RegionValue } from "../../features/settings/RegionEditor";
import { detectRegionDefaults } from "../../lib/region";

export default function OnboardingRegionScreen() {
  const [value, setValue] = useState<RegionValue>(() => detectRegionDefaults());
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setBusy(false);
    }, []),
  );

  /**
   * Step 2 no longer writes anything. The region and the optional first budget are
   * saved together at the end of step 3, so backing out of the budget step leaves no
   * half-finished onboarding behind.
   */
  const next = () => {
    if (busy || !value.country || !value.currency) return;
    setBusy(true);
    router.push({
      pathname: "/(onboarding)/first-budget",
      params: { country: value.country, currency: value.currency, locale: value.locale },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground />
      <SafeAreaView edges={["top", "left", "right", "bottom"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <RegionEditor
            value={value}
            onChange={setValue}
            onContinue={next}
            continueLabel="Continue"
            busy={busy}
            top={<Pager active={1} total={3} />}
            intro={{
              eyebrow: "Step 2 of 3",
              title: "Where do you spend?",
              body: "Pick the country and the money you use. Nothing is converted — each entry keeps its own currency.",
            }}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
