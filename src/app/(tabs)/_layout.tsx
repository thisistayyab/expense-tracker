import { Redirect, Tabs } from "expo-router";
import { Easing } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { FloatingTabBar } from "../../components/navigation/FloatingTabBar";
import { useOnboarding } from "../../lib/onboarding";

/**
 * Four destinations, no more (01 navigation map). Headers are off: each screen
 * owns its own header so the floating bar can sit over the content.
 */
export default function TabsLayout() {
  const { onboarded } = useOnboarding();
  const reduceMotion = useReducedMotion();

  // The flag can flip while this group is mounted (the dev reset), so the check
  // lives here rather than only at the entry route.
  if (onboarded === false) return <Redirect href="/(onboarding)/welcome" />;
  if (onboarded === null) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
        // Cross-fade the scenes instead of swapping them in one frame. The
        // floating bar stays put, so only the content changes.
        animation: reduceMotion ? "none" : "fade",
        transitionSpec: {
          animation: "timing",
          config: { duration: 180, easing: Easing.out(Easing.cubic) },
        },
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="overview" options={{ title: "Overview" }} />
      <Tabs.Screen name="transactions" options={{ title: "Activity" }} />
      <Tabs.Screen name="budget" options={{ title: "Budgets" }} />
      <Tabs.Screen name="insights" options={{ title: "Insights" }} />
    </Tabs>
  );
}
