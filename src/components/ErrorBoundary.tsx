import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { lightTheme } from "../lib/theme/tokens";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Last line of defence around the router. Colours come from the light token set
 * on purpose: if theming itself is what failed, this still has to render.
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

    const { colors, text, radius } = lightTheme;

    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <Text style={[text.title2, { color: colors.textPrimary, textAlign: "center" }]}>
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
          <Text style={[text.title3, { color: colors.solidFg }]}>Try again</Text>
        </Pressable>
        {__DEV__ ? (
          <Text style={[text.caption, { color: colors.textTertiary, marginTop: 20 }]}>
            {error.message}
          </Text>
        ) : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  button: {
    height: 52,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
});
