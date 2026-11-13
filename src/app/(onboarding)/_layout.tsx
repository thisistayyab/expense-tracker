import { Redirect, Stack } from "expo-router";

import { useOnboarding } from "../../lib/onboarding";

/**
 * Three steps: welcome, country & currency, then an optional first budget. The last
 * step is skippable, so onboarding never forces a number the user does not have.
 *
 * Finishing flips the flag, so this layout redirects to the tabs on the same
 * render — no explicit navigation in the screen to race the state change.
 */
export default function OnboardingLayout() {
  const { onboarded } = useOnboarding();

  if (onboarded === true) return <Redirect href="/(tabs)/overview" />;
  if (onboarded === null) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "transparent" },
      }}
    />
  );
}
