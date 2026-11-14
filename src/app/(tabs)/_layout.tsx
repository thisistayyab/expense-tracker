import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";

import { FloatingTabBar } from "../../components/navigation/FloatingTabBar";
import { useOnboarding } from "../../lib/onboarding";

const DESTINATIONS = [
  { name: "overview", label: "Overview" },
  { name: "transactions", label: "Activity" },
  { name: "budget", label: "Budgets" },
  { name: "insights", label: "Insights" },
] as const;

// Tab switches are deliberately instant, the way iOS tab bars behave. Each screen
// paints its own full-bleed gradient canvas, so any page-level slide or fade moves
// the background along with the content and reads as a panel sliding over the app —
// and re-compositing that gradient every frame is exactly what made it stutter.
// Motion lives in the chrome and the controls instead: the capsule, the selection
// pill, the add button and every press.
export default function TabsLayout() {
  const { onboarded } = useOnboarding();

  // The flag can flip while this group is mounted (the dev reset), so the check
  // lives here rather than only at the entry route.
  if (onboarded === false) return <Redirect href="/(onboarding)/welcome" />;
  if (onboarded === null) return null;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={() => null}
        screenOptions={{
          headerShown: false,
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
      <FloatingTabBar />
    </View>
  );
}
