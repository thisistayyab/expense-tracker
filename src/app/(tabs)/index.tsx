import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_CLEARANCE } from "../../components/navigation/FloatingTabBar";
import { Card, EmptyState } from "../../components/ui";
import { useTheme } from "../../lib/theme";

export default function OverviewScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const monthLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    [],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            gap: 4,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
          }}
        >
          <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
            {monthLabel}
          </Text>
          <Text style={[theme.text.title1, { color: theme.colors.textPrimary }]}>Overview</Text>

          <Card style={{ marginTop: 16 }}>
            <EmptyState
              title="Start with one"
              body="Log your first expense to see where your money goes and what is safe to spend today."
            />
          </Card>

          <Pressable
            onPress={() => router.push("/kitchen-sink")}
            accessibilityRole="button"
            accessibilityLabel="Open the component kit"
            hitSlop={8}
            style={({ pressed }) => ({
              alignSelf: "center",
              marginTop: 20,
              padding: 8,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={[theme.text.caption, { color: theme.colors.textTertiary }]}>
              P0 · component kit
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
