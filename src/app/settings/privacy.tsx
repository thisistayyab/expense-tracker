import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { Card, SectionHeader } from "../../components/ui";
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
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
    >
      <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
        A plain-language summary of what the app does with your data.
      </Text>

      {SECTIONS.map((section) => (
        <View key={section.title}>
          <SectionHeader title={section.title} />
          <Card>
            <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
              {section.body}
            </Text>
          </Card>
        </View>
      ))}

      <View style={{ marginTop: 20 }}>
        <Text
          onPress={() => router.push("/settings/data")}
          accessibilityRole="link"
          accessibilityLabel="Open data export and deletion"
          style={[theme.text.label, { color: theme.colors.accent, textAlign: "center" }]}
        >
          Export or delete your data →
        </Text>
      </View>
    </ScrollView>
  );
}
