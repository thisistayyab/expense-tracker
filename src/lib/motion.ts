import {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  type SharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { motion } from "./theme/tokens";

/** Near-critical iOS spring helpers — responsive under the finger, zero rubber bounce. */
export const SPRING_PRESS = motion.press;
export const SPRING_RELEASE = motion.release;
export const SPRING_SETTLE = motion.settle;
export const SPRING_SHEET = motion.sheetSpring;
export const SPRING_SNAPPY = motion.snappy;

export function springTo(value: SharedValue<number>, to: number, pressed = false) {
  "worklet";
  value.value = withSpring(to, pressed ? SPRING_PRESS : SPRING_RELEASE);
}

export function settleTo(value: SharedValue<number>, to: number) {
  "worklet";
  value.value = withSpring(to, SPRING_SETTLE);
}

export function snappyTo(value: SharedValue<number>, to: number) {
  "worklet";
  value.value = withSpring(to, SPRING_SNAPPY);
}

export function fadeTo(value: SharedValue<number>, to: number, duration: number) {
  "worklet";
  value.value = withTiming(to, { duration });
}

/** Staggered UIKit-style entrance for screen blocks and list cards. */
export function iosEnter(delayMs = 0) {
  return FadeInDown.springify(360)
    .dampingRatio(0.92)
    .delay(delayMs)
    .reduceMotion(ReduceMotion.System);
}

export function iosFadeEnter(delayMs = 0) {
  return FadeIn.duration(240).delay(delayMs).reduceMotion(ReduceMotion.System);
}

export function iosFadeExit() {
  return FadeOut.duration(180).reduceMotion(ReduceMotion.System);
}

export const iosLayout = LinearTransition.springify(280)
  .dampingRatio(0.92)
  .reduceMotion(ReduceMotion.System);
