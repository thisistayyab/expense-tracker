import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppIcon, Card, ScreenBackground, SectionHeader, TactilePressable } from "../../components/ui";
import { useTheme } from "../../lib/theme";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "Stays on this device",
    body: "Transactions, accounts, budgets, recurring rules and settings are stored in the app's local SQLite database. There is no account, no server and no analytics SDK.",
  },
  {
    title: "No network calls",
    body: "The app works fully offline. It does not upload your data, fetch exchange rates or connect to a bank. Currencies are never converted.",
  },
  {
    title: "You control exports",
    body: "CSV and JSON files are written to the app's cache and handed to the system share sheet only when you choose Export or Backup. Where they go next is your choice.",
  },
  {
    title: "Deleting data",
    body: "Delete all data removes every row on this device after you type DELETE. Uninstalling the app also removes its database. Export a backup first if you may want it later.",
  },
  {
    title: "App lock",
    body: "If you enable app lock, verification is performed by your device's biometric or passcode system. The app never receives or stores your fingerprint, face data or passcode.",
  },
];

export default function PrivacyScreen() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
      >
        <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
          A plain-language summary of what the app does with your data.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title}>
            <SectionHeader title={section.title} />
            <Card variant="glass">
              <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
                {section.body}
              </Text>
            </Card>
          </View>
        ))}

        <TactilePressable
          onPress={() => router.push("/settings/data")}
          haptic="selection"
          scaleTo={0.97}
          radius={999}
          accessibilityRole="link"
          accessibilityLabel="Open data export and deletion"
          style={{
            marginTop: 20,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 18,
            paddingVertical: 11,
            borderRadius: 999,
            backgroundColor: theme.colors.accentSoft,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: `${theme.colors.accent}28`,
          }}
        >
          <Text style={[theme.text.label, { color: theme.colors.accent }]}>
            Export or delete your data
          </Text>
          <AppIcon name="chevronRight" color={theme.colors.accent} size={13} />
        </TactilePressable>
      </ScrollView>
    </View>
  );
}
