import type { SharedValue } from "react-native-reanimated";
import { withSpring, withTiming } from "react-native-reanimated";

/**
 * The app's physical vocabulary. Every interaction that moves something uses these
 * two curves rather than ad-hoc durations, so a chip, a primary button and a tab
 * all settle at the same rate — that consistency is what reads as "designed"
 * instead of a pile of separate transitions.
 *
 * The writes live here, outside component scope, so the React Compiler treats the
 * handlers as pure calls and the animation stays reproducible.
 */

const PRESS = { damping: 22, stiffness: 340, mass: 0.5 };
const RELEASE = { damping: 15, stiffness: 240, mass: 0.7 };

export function springTo(value: SharedValue<number>, to: number, pressed = false) {
  value.value = withSpring(to, pressed ? PRESS : RELEASE);
}

/** A short cross-fade for highlights that should not carry momentum. */
export function fadeTo(value: SharedValue<number>, to: number, duration: number) {
  value.value = withTiming(to, { duration });
}
