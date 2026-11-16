import { BlurTargetView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import { type ComponentRef, useRef } from "react";
import { View } from "react-native";

import { FloatingTabBar } from "../../components/navigation/FloatingTabBar";
import { ScreenBackground } from "../../components/ui";
import { useOnboarding } from "../../lib/onboarding";

const DESTINATIONS = [
  { name: "overview", label: "Overview" },
  { name: "transactions", label: "Activity" },
  { name: "budget", label: "Budgets" },
  { name: "insights", label: "Insights" },
] as const;

// Mount one shared atmospheric Liquid Glass canvas behind all tabs so switching
// tabs cross-fades only foreground glass cards without re-rasterizing gradients.
export default function TabsLayout() {
  const { onboarded } = useOnboarding();
  const blurTargetRef = useRef<ComponentRef<typeof View> | null>(null);

  // The flag can flip while this group is mounted (the dev reset), so the check
  // lives here rather than only at the entry route.
  if (onboarded === false) return <Redirect href="/(onboarding)/welcome" />;
  if (onboarded === null) return null;

  return (
    <View style={{ flex: 1 }}>
      <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
        <ScreenBackground />
        <Tabs
          tabBar={() => null}
          screenOptions={{
            headerShown: false,
            animation: "fade",
            sceneStyle: { backgroundColor: "transparent" },
          }}
        >
          {DESTINATIONS.map((destination) => (
            <Tabs.Screen
              key={destination.name}
              name={destination.name}
              options={{ title: destination.label }}
            />
          ))}
        </Tabs>
      </BlurTargetView>
      <FloatingTabBar blurTarget={blurTargetRef} />
    </View>
  );
}
