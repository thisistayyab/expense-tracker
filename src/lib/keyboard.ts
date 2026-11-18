import { useCallback, useEffect, useRef } from "react";
import { Keyboard, Platform } from "react-native";

const ANDROID_KEYBOARD_HIDE_FALLBACK_MS = 220;

/**
 * Dismisses any active soft keyboard immediately and, when the Android IME is
 * currently open, defers `action` until `keyboardDidHide` (with a 220 ms
 * fallback) so overlays or alerts do not appear behind or misaligned by the IME.
 * Returns a cancel function.
 */
export function scheduleAfterKeyboardDismiss(action: () => void): () => void {
  const shouldWaitForAndroidHide = Platform.OS === "android" && Keyboard.isVisible();
  Keyboard.dismiss();

  if (!shouldWaitForAndroidHide) {
    action();
    return () => {};
  }

  let finished = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let sub: ReturnType<typeof Keyboard.addListener> | null = null;

  const cancel = () => {
    finished = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (sub !== null) {
      sub.remove();
      sub = null;
    }
  };

  const runOnce = () => {
    if (finished) return;
    cancel();
    action();
  };

  sub = Keyboard.addListener("keyboardDidHide", runOnce);
  timer = setTimeout(runOnce, ANDROID_KEYBOARD_HIDE_FALLBACK_MS);
  return cancel;
}

/**
 * React hook wrapper around `scheduleAfterKeyboardDismiss` that cancels any
 * pending callback when superseded or unmounted.
 */
export function useAfterKeyboardDismiss() {
  const cancelRef = useRef<(() => void) | null>(null);

  const cancelPending = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }
  }, []);

  useEffect(() => cancelPending, [cancelPending]);

  return useCallback(
    (action: () => void) => {
      cancelPending();
      cancelRef.current = scheduleAfterKeyboardDismiss(() => {
        cancelRef.current = null;
        action();
      });
    },
    [cancelPending],
  );
}
