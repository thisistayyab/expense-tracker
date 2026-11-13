import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RegionEditor, type RegionValue } from "../../features/settings/RegionEditor";
import { useOnboarding } from "../../lib/onboarding";
import { detectRegionDefaults } from "../../lib/region";
import { useTheme } from "../../lib/theme";

function Pager({ active }: { active: 0 | 1 }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, paddingTop: 4 }}>
      {[0, 1].map((index) => (
        <View
          key={index}
          style={{
            width: index === active ? 18 : 5,
            height: 5,
            borderRadius: 3,
            backgroundColor:
              index === active ? theme.colors.textPrimary : theme.colors.surfaceSunken,
          }}
        />
      ))}
    </View>
  );
}

export default function OnboardingRegionScreen() {
  const { theme } = useTheme();
  const { finish } = useOnboarding();
  const [value, setValue] = useState<RegionValue>(() => detectRegionDefaults());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    // The guard change routes to the tabs; navigating here as well would race it.
    finish(value).catch((cause: unknown) => {
      setError(`Could not save your region: ${String(cause)}`);
      setBusy(false);
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top", "left", "right", "bottom"]} style={{ flex: 1 }}>
        <RegionEditor
          value={value}
          onChange={setValue}
          onContinue={save}
          continueLabel="Finish"
          busy={busy}
          error={error}
          top={<Pager active={1} />}
          intro={{
            eyebrow: "Step 2 of 2",
            title: "Where do you spend?",
            body: "Pick the country and the money you use. Nothing is converted — each entry keeps its own currency.",
          }}
        />
      </SafeAreaView>
    </View>
  );
}
