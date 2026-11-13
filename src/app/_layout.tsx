import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider } from "expo-sqlite";
import { Suspense, useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { DATABASE_NAME, initDatabase } from "../lib/db/client";
import { OnboardingProvider, useOnboarding } from "../lib/onboarding";
import { ThemeProvider, useAppFonts, useTheme } from "../lib/theme";
import { UndoProvider } from "../lib/undo/UndoProvider";

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

/**
 * Every route is registered; access is decided by the group layouts, which read
 * the onboarding flag and render a `Redirect`. This is deliberately simpler than
 * `Stack.Protected`: guards that remove a screen mid-transition left the router
 * on a path with no owner ("Unmatched Route") on device.
 */
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
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen
        name="add"
        options={{
          presentation: "transparentModal",
          animation: "slide_from_bottom",
          headerShown: false,
          gestureEnabled: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen name="transaction/[id]" options={{ ...detailOptions, title: "Transaction" }} />
      <Stack.Screen name="settings/index" options={{ ...detailOptions, title: "Settings" }} />
      <Stack.Screen
        name="settings/region"
        options={{ ...detailOptions, title: "Currency & region" }}
      />
      <Stack.Screen
        name="settings/categories"
        options={{ ...detailOptions, title: "Categories" }}
      />
      <Stack.Screen
        name="settings/accounts"
        options={{ ...detailOptions, title: "Accounts" }}
      />
      <Stack.Screen name="dev-data" options={{ ...detailOptions, title: "Data tools" }} />
    </Stack>
  );
}

/** Waits for the onboarding flag so a returning user never sees the welcome screen. */
function AppShell({ fontsReady }: { fontsReady: boolean }) {
  const { onboarded } = useOnboarding();

  return (
    <BootGate ready={fontsReady && onboarded !== null}>
      <UndoProvider>
        <Navigation />
      </UndoProvider>
    </BootGate>
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <ErrorBoundary>
            <Suspense fallback={null}>
              <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
                <OnboardingProvider>
                  <AppShell fontsReady={fontsLoaded || Boolean(fontError)} />
                </OnboardingProvider>
              </SQLiteProvider>
            </Suspense>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
