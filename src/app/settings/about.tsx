import Constants from "expo-constants";
import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { Button, Card, SectionHeader } from "../../components/ui";
import { useTheme } from "../../lib/theme";

export default function AboutScreen() {
  const { theme } = useTheme();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
    >
      <Card variant="ink" style={{ padding: 20 }}>
        <Text style={[theme.text.eyebrow, { color: theme.colors.onInkMuted }]}>Expense Tracker</Text>
        <Text style={[theme.text.title2, { color: theme.colors.onInk, marginTop: 6 }]}>
          Calm, precise money tracking.
        </Text>
        <Text style={[theme.text.body, { color: theme.colors.onInkMuted, marginTop: 8 }]}>
          Version {version} · offline-first, no account, no bank connection.
        </Text>
      </Card>

      <SectionHeader title="How it works" />
      <Card style={{ gap: 10 }}>
        <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
          Every transaction, budget and recurring rule is stored in a local SQLite database on this
          device. Amounts are integers in each currency’s minor unit, and currencies are never
          converted or merged.
        </Text>
        <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
          The app makes no network calls. Backups and CSV exports are written locally and shared
          only through the system share sheet, when you ask for them.
        </Text>
      </Card>

      <SectionHeader title="Credits" />
      <Card style={{ gap: 6 }}>
        <Text style={[theme.text.bodyStrong, { color: theme.colors.textPrimary }]}>Geist</Text>
        <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>
          Typeface by Vercel, licensed under the SIL Open Font License 1.1. The licence ships in
          assets/fonts/OFL.txt.
        </Text>
      </Card>

      <View style={{ marginTop: 20, gap: 10 }}>
        <Button label="Privacy" variant="ghost" onPress={() => router.push("/settings/privacy")} />
        <Button
          label="Export or delete data"
          variant="ghost"
          onPress={() => router.push("/settings/data")}
        />
      </View>

      <Text
        style={[
          theme.text.caption,
          { color: theme.colors.textTertiary, textAlign: "center", marginTop: 20 },
        ]}
      >
        Expense Tracker {version} · works offline
      </Text>
    </ScrollView>
  );
}
