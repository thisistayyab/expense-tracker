import { router, usePathname } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon, Button, Card, ScreenBackground } from "../components/ui";
import { useOnboarding } from "../lib/onboarding";
import { useTheme } from "../lib/theme";

/**
 * Replaces Expo Router's raw "Unmatched Route" page. It shows the path that failed
 * so the failure can be reported precisely, and gives a way back that does not
 * depend on any guarded navigation state.
 */
export default function NotFoundScreen() {
  const { theme } = useTheme();
  const { reset } = useOnboarding();
  const pathname = usePathname();

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
        <Card variant="glass" style={{ width: "100%", alignItems: "center", gap: 12, padding: 24 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              borderCurve: "continuous",
              backgroundColor: theme.colors.accentSoft,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.cardBorder,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppIcon name="exclamation" color={theme.colors.accent} size={24} />
          </View>
          <Text style={[theme.text.title2, { color: theme.colors.textPrimary, textAlign: "center" }]}>
            That screen doesn’t exist
          </Text>
          <Text
            style={[
              theme.text.body,
              { color: theme.colors.textSecondary, textAlign: "center", maxWidth: 300 },
            ]}
          >
            Nothing is wrong with your data. The app tried to open:
          </Text>
          <Text
            selectable
            style={[
              theme.text.caption,
              {
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surfaceMuted,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.colors.cardBorder,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: theme.radius.input,
                borderCurve: "continuous",
              },
            ]}
          >
            {pathname || "(empty path)"}
          </Text>

          <View style={{ alignSelf: "stretch", gap: 10, marginTop: 8 }}>
            <Button label="Back to start" onPress={() => router.replace("/")} />
            {__DEV__ ? (
              <Button
                label="Reset onboarding and start over"
                variant="ghost"
                onPress={() => {
                  reset()
                    .then(() => router.replace("/(onboarding)/welcome"))
                    .catch(() => {});
                }}
              />
            ) : null}
          </View>
        </Card>
        </View>
      </SafeAreaView>
    </View>
  );
}
