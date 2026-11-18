import { useCallback, useEffect, useRef } from "react";
import { Keyboard, Platform } from "react-native";

const ANDROID_KEYBOARD_HIDE_FALLBACK_MS = 220;

/**
 * Dismisses any active soft keyboard immediately and defers opening a modal or
 * picker on Android until the OS keyboard finishes hiding so the overlay never
 * mounts behind an open or animating IME.
 */
export function useAfterKeyboardDismiss() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subRef = useRef<ReturnType<typeof Keyboard.addListener> | null>(null);

  const cancelPending = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (subRef.current !== null) {
      subRef.current.remove();
      subRef.current = null;
    }
  }, []);

  useEffect(() => cancelPending, [cancelPending]);

  return useCallback(
    (action: () => void) => {
      cancelPending();
      const shouldWaitForAndroidHide = Platform.OS === "android" && Keyboard.isVisible();
      Keyboard.dismiss();

      if (!shouldWaitForAndroidHide) {
        action();
        return;
      }

      let finished = false;
      const runOnce = () => {
        if (finished) return;
        finished = true;
        cancelPending();
        action();
      };

      subRef.current = Keyboard.addListener("keyboardDidHide", runOnce);
      timerRef.current = setTimeout(runOnce, ANDROID_KEYBOARD_HIDE_FALLBACK_MS);
    },
    [cancelPending],
  );
}
