import { router, usePathname } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "../components/ui";
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
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.bg,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 12,
      }}
    >
      <Text style={[theme.text.title2, { color: theme.colors.textPrimary }]}>
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
          theme.text.bodyStrong,
          {
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surfaceSunken,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
          },
        ]}
      >
        {pathname || "(empty path)"}
      </Text>

      <View style={{ alignSelf: "stretch", gap: 10, marginTop: 12 }}>
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
    </View>
  );
}
