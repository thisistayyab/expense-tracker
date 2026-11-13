import { useSQLiteContext } from "expo-sqlite";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { applyRegionSelection, type RegionSelection } from "./db/onboarding";
import { getSetting, setSettings, SETTING_KEYS } from "./db/repos/settings";
import type { Db } from "./db/types";

/**
 * Dev-only escape hatch: `EXPO_PUBLIC_FORCE_ONBOARDING=1` starts every launch on
 * the welcome screen without touching the saved flag, so the flow can be replayed
 * even when the reset button is unreachable. Never active in a release build.
 */
const FORCE_ONBOARDING = __DEV__ && process.env.EXPO_PUBLIC_FORCE_ONBOARDING === "1";

type OnboardingContextValue = {
  /** null while the flag is still being read, so routing never guesses. */
  onboarded: boolean | null;
  finish: (region: RegionSelection) => Promise<void>;
  /** Dev-only: clear the flag so the welcome screen can be replayed in-session. */
  reset: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue>({
  onboarded: null,
  finish: async () => {},
  reset: async () => {},
});

export function useOnboarding(): OnboardingContextValue {
  return useContext(OnboardingContext);
}

/**
 * Owns the onboarding gate. The root layout holds the splash until `onboarded`
 * resolves, so a returning user never sees the welcome screen for a frame.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const db: Db = useSQLiteContext();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSetting(db, SETTING_KEYS.onboarded)
      .then((value) => {
        if (!cancelled) setOnboarded(FORCE_ONBOARDING ? false : value === "1");
      })
      .catch(() => {
        // A missing setting is a first run, not an error worth blocking on.
        if (!cancelled) setOnboarded(false);
      });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const finish = useCallback(
    async (region: RegionSelection) => {
      await applyRegionSelection(db, region);
      setOnboarded(true);
    },
    [db],
  );

  const reset = useCallback(async () => {
    await setSettings(db, { [SETTING_KEYS.onboarded]: "0" });
    setOnboarded(false);
  }, [db]);

  const value = useMemo(
    () => ({ onboarded, finish, reset }),
    [onboarded, finish, reset],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
