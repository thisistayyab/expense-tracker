import { useSQLiteContext } from "expo-sqlite";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, View } from "react-native";

import { getSetting, setSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import type { Db } from "../../lib/db/types";
import { useTheme } from "../../lib/theme";
import {
  authenticateToUnlock,
  getLockCapability,
  type LockCapability,
  type UnlockResult,
} from "./appLock";
import { LockScreen } from "./LockScreen";

type AppLockContextValue = {
  /** null while the persisted preference is loading. */
  enabled: boolean | null;
  locked: boolean;
  capability: LockCapability | null;
  enable: () => Promise<UnlockResult>;
  disable: () => Promise<UnlockResult>;
  unlock: () => Promise<UnlockResult>;
  /** For a device that no longer has any screen lock: do not trap the user. */
  turnOffUnavailable: () => Promise<void>;
  /** Re-read `app_lock` after a restore replaced the settings table. */
  refresh: () => Promise<void>;
};

const AppLockContext = createContext<AppLockContextValue | null>(null);

export function useAppLock(): AppLockContextValue {
  const value = useContext(AppLockContext);
  if (!value) throw new Error("useAppLock must be used inside <AppLockProvider>");
  return value;
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const db: Db = useSQLiteContext();
  const { theme } = useTheme();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(false);
  const [capability, setCapability] = useState<LockCapability | null>(null);
  const enabledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getSetting(db, SETTING_KEYS.appLock),
      getLockCapability(),
    ])
      .then(([stored, nextCapability]) => {
        if (cancelled) return;
        const on = stored === "1";
        enabledRef.current = on;
        setCapability(nextCapability);
        setEnabled(on);
        setLocked(on);
      })
      .catch(() => {
        if (cancelled) return;
        setCapability({ available: false, label: "Not available", reason: "Could not read the setting." });
        setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [db]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background" && enabledRef.current) setLocked(true);
    });
    return () => subscription.remove();
  }, []);

  const writeEnabled = useCallback(
    async (next: boolean) => {
      await setSettings(db, { [SETTING_KEYS.appLock]: next ? "1" : "0" });
      enabledRef.current = next;
      setEnabled(next);
      setLocked(false);
    },
    [db],
  );

  const enable = useCallback(async (): Promise<UnlockResult> => {
    const result = await authenticateToUnlock();
    if (!result.success) return result;
    await writeEnabled(true);
    return { success: true };
  }, [writeEnabled]);

  const disable = useCallback(async (): Promise<UnlockResult> => {
    if (capability?.available !== false) {
      const result = await authenticateToUnlock();
      if (!result.success) return result;
    }
    await writeEnabled(false);
    return { success: true };
  }, [capability, writeEnabled]);

  const unlock = useCallback(async (): Promise<UnlockResult> => {
    const result = await authenticateToUnlock();
    if (result.success) setLocked(false);
    return result;
  }, []);

  const turnOffUnavailable = useCallback(async () => {
    await writeEnabled(false);
  }, [writeEnabled]);

  const refresh = useCallback(async () => {
    const stored = await getSetting(db, SETTING_KEYS.appLock);
    const on = stored === "1";
    if (on === enabledRef.current) return;
    enabledRef.current = on;
    setEnabled(on);
    setLocked(on);
  }, [db]);

  const value = useMemo(
    () => ({ enabled, locked, capability, enable, disable, unlock, turnOffUnavailable, refresh }),
    [enabled, locked, capability, enable, disable, unlock, turnOffUnavailable, refresh],
  );

  if (enabled === null) return null;

  return (
    <AppLockContext.Provider value={value}>
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <View
          style={{ flex: 1 }}
          accessibilityElementsHidden={locked}
          importantForAccessibility={locked ? "no-hide-descendants" : "auto"}
        >
          {children}
        </View>
        {locked ? <LockScreen /> : null}
      </View>
    </AppLockContext.Provider>
  );
}
