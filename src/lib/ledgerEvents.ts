type Listener = () => void;

const changeListeners = new Set<Listener>();
const resetListeners = new Set<Listener>();

/**
 * Lightweight in-memory notification bus so mutations from modal routes
 * (`/add`, `/transaction/[id]`), foreground recurring backfill, and full
 * data resets keep mounted screens and Undo toasts synchronized.
 */
export function notifyLedgerChanged(): void {
  for (const listener of changeListeners) {
    listener();
  }
}

export function subscribeLedgerChanged(listener: Listener): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

export function notifyLedgerReset(): void {
  for (const listener of resetListeners) {
    listener();
  }
  notifyLedgerChanged();
}

export function subscribeLedgerReset(listener: Listener): () => void {
  resetListeners.add(listener);
  return () => {
    resetListeners.delete(listener);
  };
}
