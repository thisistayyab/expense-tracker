import { Redirect } from "expo-router";

import { useOnboarding } from "../lib/onboarding";

/**
 * "/" is the only route registered outside the guards, so a redirect — including
 * the one a guard performs when it flips — always has a destination that exists.
 *
 * The root BootGate already waits for the onboarding flag, so this screen never
 * renders with an unknown value; it forwards on the next frame.
 */
export default function EntryScreen() {
  const { onboarded } = useOnboarding();

  if (onboarded === null) return null;

  return (
    <Redirect href={onboarded ? "/(tabs)/overview" : "/(onboarding)/welcome"} />
  );
}
