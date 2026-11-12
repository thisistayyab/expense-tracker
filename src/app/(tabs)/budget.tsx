import { ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_CLEARANCE } from "../../components/navigation/FloatingTabBar";
import { Card, EmptyState } from "../../components/ui";
import { useTheme } from "../../lib/theme";

export default function BudgetsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

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
          <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>Budgets</Text>
          <Text style={[theme.text.title1, { color: theme.colors.textPrimary }]}>
            Set the limits
          </Text>

          <Card style={{ marginTop: 16 }}>
            <EmptyState
              title="No budgets yet"
              body="A monthly limit per category is what turns spending into one safe-to-spend number on Overview."
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
