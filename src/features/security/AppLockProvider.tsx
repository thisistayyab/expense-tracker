import { useSQLiteContext } from "expo-sqlite";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Modal, View } from "react-native";

import { getSetting, setSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import type { Db } from "../../lib/db/types";
import { useTheme } from "../../lib/theme";
import {
  authenticateToUnlock,
  getLockCapability,
  type LockCapability,
  type UnlockResult,
} from "./appLock";
import { AppLockContext } from "./appLockContext";
import { LockScreen } from "./LockScreen";

export { useAppLock } from "./appLockContext";

export function AppLockProvider({ children }: { children: ReactNode }) {
  const db: Db = useSQLiteContext();
  const { theme } = useTheme();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(false);
  const [obscured, setObscured] = useState(false);
  const [capability, setCapability] = useState<LockCapability | null>(null);
  const enabledRef = useRef(false);
  const authenticatingRef = useRef(false);

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
      if (state === "active") {
        setObscured(false);
        void getLockCapability().then(setCapability);
        return;
      }
      if (!enabledRef.current || authenticatingRef.current) return;
      if (state === "inactive") {
        setObscured(true);
      } else if (state === "background") {
        setObscured(false);
        setLocked(true);
      }
    });
    return () => subscription.remove();
  }, []);

  const writeEnabled = useCallback(
    async (next: boolean) => {
      await setSettings(db, { [SETTING_KEYS.appLock]: next ? "1" : "0" });
      enabledRef.current = next;
      setEnabled(next);
      setLocked(false);
      setObscured(false);
    },
    [db],
  );

  const runAuth = useCallback(async () => {
    authenticatingRef.current = true;
    try {
      return await authenticateToUnlock();
    } finally {
      authenticatingRef.current = false;
    }
  }, []);

  const enable = useCallback(async (): Promise<UnlockResult> => {
    const result = await runAuth();
    if (!result.success) return result;
    await writeEnabled(true);
    return { success: true };
  }, [runAuth, writeEnabled]);

  const disable = useCallback(async (): Promise<UnlockResult> => {
    if (capability?.available !== false) {
      const result = await runAuth();
      if (!result.success) return result;
    }
    await writeEnabled(false);
    return { success: true };
  }, [capability, runAuth, writeEnabled]);

  const unlock = useCallback(async (): Promise<UnlockResult> => {
    const result = await runAuth();
    if (result.success) {
      setLocked(false);
      setObscured(false);
    }
    return result;
  }, [runAuth]);

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
    setObscured(false);
  }, [db]);

  const value = useMemo(
    () => ({ enabled, locked, capability, enable, disable, unlock, turnOffUnavailable, refresh }),
    [enabled, locked, capability, enable, disable, unlock, turnOffUnavailable, refresh],
  );

  if (enabled === null) return null;

  const modalVisible = locked || obscured;

  return (
    <AppLockContext.Provider value={value}>
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <View
          style={{ flex: 1 }}
          accessibilityElementsHidden={modalVisible}
          importantForAccessibility={modalVisible ? "no-hide-descendants" : "auto"}
        >
          {children}
        </View>
        <Modal
          visible={modalVisible}
          transparent={false}
          presentationStyle="overFullScreen"
          statusBarTranslucent
          animationType="none"
          onRequestClose={() => {}}
        >
          <LockScreen veilOnly={!locked && obscured} />
        </Modal>
      </View>
    </AppLockContext.Provider>
  );
}
