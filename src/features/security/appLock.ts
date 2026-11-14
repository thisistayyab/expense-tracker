import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

export type LockCapability = {
  available: boolean;
  /** "Face ID", "Touch ID", "Fingerprint", "Device passcode" or a reason. */
  label: string;
  reason: string | null;
};

export type UnlockResult = { success: boolean; error?: string };

/**
 * The lock is only offered when the device can actually verify someone. A phone
 * with no screen lock (common right after a restore) reports unavailable, and the
 * lock screen offers to turn the setting off instead of trapping the user.
 */
export async function getLockCapability(): Promise<LockCapability> {
  if (Platform.OS === "web") {
    return { available: false, label: "Not available", reason: "App lock is for the mobile app." };
  }

  try {
    const [hardware, enrolled, level, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    if (level === LocalAuthentication.SecurityLevel.NONE && !enrolled) {
      return {
        available: false,
        label: "Not available",
        reason: "Set a screen lock (passcode, fingerprint or face) on this device first.",
      };
    }

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return { available: true, label: "Face ID", reason: null };
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return { available: true, label: "Fingerprint", reason: null };
    }
    if (hardware) return { available: true, label: "Biometrics", reason: null };
    return { available: true, label: "Device passcode", reason: null };
  } catch {
    return { available: false, label: "Not available", reason: "The device could not be checked." };
  }
}

/**
 * `disableDeviceFallback: false` is intentional: after a failed face/finger scan
 * the OS offers the device passcode. That is the gate's guaranteed way back in.
 */
export async function authenticateToUnlock(): Promise<UnlockResult> {
  if (Platform.OS === "web") {
    return { success: false, error: "App lock is only available on a phone." };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock Suffice",
      promptDescription: "Your data stays on this device.",
      cancelLabel: "Cancel",
      fallbackLabel: "Use device passcode",
      disableDeviceFallback: false,
    });

    if (result.success) return { success: true };
    return { success: false, error: result.error ?? "Authentication did not complete" };
  } catch (cause) {
    return { success: false, error: String(cause) };
  }
}
