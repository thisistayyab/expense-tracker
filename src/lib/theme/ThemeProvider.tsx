import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Appearance, useColorScheme } from "react-native";

import { darkTheme, lightTheme, type Theme } from "./tokens";

export type ThemePreference = "system" | "light" | "dark";
export type Scheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  scheme: Scheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  /** Persisted preference; the settings table owns the durable value from P1 on. */
  initialPreference?: ThemePreference;
};

export function ThemeProvider({
  children,
  initialPreference = "system",
}: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);

  const scheme: Scheme =
    preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;

  const activeTheme = scheme === "dark" ? darkTheme : lightTheme;

  useEffect(() => {
    Appearance.setColorScheme?.(preference === "system" ? "unspecified" : preference);
    void SystemUI.setBackgroundColorAsync(activeTheme.colors.bg).catch(() => {});
  }, [activeTheme.colors.bg, preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: activeTheme,
      scheme,
      preference,
      setPreference,
    }),
    [activeTheme, scheme, preference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return context;
}
