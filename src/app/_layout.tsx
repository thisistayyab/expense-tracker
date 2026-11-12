import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider } from "expo-sqlite";
import { Suspense, useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { DATABASE_NAME, initDatabase } from "../lib/db/client";
import { ThemeProvider, useAppFonts, useTheme } from "../lib/theme";

// Keep the native splash up until the font and the database are both ready: a
// frame in a fallback face (FOUT) or an unhydrated screen is worse than 100 ms
// more splash.
void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 250, fade: true });

/** Never hold the splash forever if a font asset or the DB wedge is broken. */
const SPLASH_TIMEOUT_MS = 5000;

function BootGate({ ready, children }: { ready: boolean; children: ReactNode }) {
  const { theme } = useTheme();

  useEffect(() => {
    const timeout = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
    }, SPLASH_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) return null;

  return <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>{children}</View>;
}

/** Needs to sit inside the providers so the stack chrome can read the theme. */
function Navigation() {
  const { theme } = useTheme();

  const detailOptions = {
    headerShown: true,
    headerStyle: { backgroundColor: theme.colors.bg },
    headerTintColor: theme.colors.textPrimary,
    headerTitleStyle: { ...theme.text.title3, color: theme.colors.textPrimary },
    headerShadowVisible: false,
  };

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="dev-data" options={{ ...detailOptions, title: "Data tools" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  useEffect(() => {
    if (fontError) {
      console.warn("[fonts] Geist failed to load, continuing with the system face", fontError);
    }
  }, [fontError]);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ErrorBoundary>
          <Suspense fallback={null}>
            <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
              <BootGate ready={fontsLoaded || Boolean(fontError)}>
                <Navigation />
              </BootGate>
            </SQLiteProvider>
          </Suspense>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
