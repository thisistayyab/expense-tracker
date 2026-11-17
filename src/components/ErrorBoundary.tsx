import { StatusBar } from "expo-status-bar";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Appearance, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { darkTheme, lightTheme } from "../lib/theme/tokens";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Last line of defence around the router. Reads the OS scheme directly instead of
 * requiring ThemeProvider context, so this still renders if theming fails.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isDark = Appearance.getColorScheme() === "dark";
    const { colors, text, radius } = isDark ? darkTheme : lightTheme;

    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text
            accessibilityRole="header"
            style={[text.title2, { color: colors.textPrimary, textAlign: "center" }]}
          >
            Something went wrong
          </Text>
          <Text
            style={[
              text.body,
              { color: colors.textSecondary, textAlign: "center", maxWidth: 300, marginTop: 8 },
            ]}
          >
            Your data is still on this device. Try again, and if it keeps happening, restart the app.
          </Text>
          <Pressable
            onPress={this.reset}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: colors.solid,
                borderRadius: radius.pill,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Text style={[text.label, { color: colors.solidFg }]}>Try again</Text>
          </Pressable>
          {__DEV__ ? (
            <Text style={[text.caption, { color: colors.textTertiary, marginTop: 20, textAlign: "center" }]}>
              {error.message}
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  button: {
    minHeight: 52,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
});
