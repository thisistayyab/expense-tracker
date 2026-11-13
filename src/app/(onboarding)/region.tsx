import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Pager } from "../../features/onboarding/Pager";
import { RegionEditor, type RegionValue } from "../../features/settings/RegionEditor";
import { detectRegionDefaults } from "../../lib/region";
import { useTheme } from "../../lib/theme";

export default function OnboardingRegionScreen() {
  const { theme } = useTheme();
  const [value, setValue] = useState<RegionValue>(() => detectRegionDefaults());

  /**
   * Step 2 no longer writes anything. The region and the optional first budget are
   * saved together at the end of step 3, so backing out of the budget step leaves no
   * half-finished onboarding behind.
   */
  const next = () => {
    if (!value.country || !value.currency) return;
    router.push({
      pathname: "/(onboarding)/first-budget",
      params: { country: value.country, currency: value.currency, locale: value.locale },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top", "left", "right", "bottom"]} style={{ flex: 1 }}>
        <RegionEditor
          value={value}
          onChange={setValue}
          onContinue={next}
          continueLabel="Continue"
          top={<Pager active={1} total={3} />}
          intro={{
            eyebrow: "Step 2 of 3",
            title: "Where do you spend?",
            body: "Pick the country and the money you use. Nothing is converted — each entry keeps its own currency.",
          }}
        />
      </SafeAreaView>
    </View>
  );
}
