import { createContext, useContext } from "react";

import type { LockCapability, UnlockResult } from "./appLock";

export type AppLockContextValue = {
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

export const AppLockContext = createContext<AppLockContextValue | null>(null);

export function useAppLock(): AppLockContextValue {
  const value = useContext(AppLockContext);
  if (!value) throw new Error("useAppLock must be used inside <AppLockProvider>");
  return value;
}
