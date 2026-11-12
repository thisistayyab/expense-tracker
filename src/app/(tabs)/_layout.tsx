import { Tabs } from "expo-router";

import { FloatingTabBar } from "../../components/navigation/FloatingTabBar";

/**
 * Four destinations, no more (01 navigation map). Headers are off: each screen
 * owns its own header so the floating bar can sit over the content.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Overview" }} />
      <Tabs.Screen name="transactions" options={{ title: "Activity" }} />
      <Tabs.Screen name="budget" options={{ title: "Budgets" }} />
      <Tabs.Screen name="insights" options={{ title: "Insights" }} />
    </Tabs>
  );
}
