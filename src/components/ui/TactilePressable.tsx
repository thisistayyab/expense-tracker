import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";
import { haptics } from "../../lib/haptics";
import { fadeTo, springTo } from "../../lib/motion";
import { useTheme } from "../../lib/theme";

export type TactilePressableProps = Omit<
  PressableProps,
  "style" | "children" | "onPressIn" | "onPressOut"
> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale reached while the finger is down. 1 turns the compression off. */
  scaleTo?: number;
  haptic?: "tick" | "selection" | "none";
  /** Radius of the press flash, so it follows the shape being pressed. */
  radius?: number;
  flashColor?: string;
  onPressIn?: PressableProps["onPressIn"];
  onPressOut?: PressableProps["onPressOut"];
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * UIKit-tuned tactile surface: smooth critically damped micro-scale and
 * adaptive theme highlight on press without rubber bounce.
 */
export function TactilePressable({
  children,
  style,
  scaleTo = 0.97,
  haptic = "tick",
  radius = 999,
  flashColor,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: TactilePressableProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const flash = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const resolvedFlash =
    flashColor ??
    (theme.scheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(10,18,36,0.055)");

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value,
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled) {
          if (haptic === "tick") haptics.tick();
          else if (haptic === "selection") haptics.selection();
          if (!reduceMotion && scaleTo !== 1) springTo(scale, scaleTo, true);
          fadeTo(flash, 1, reduceMotion ? 0 : 75);
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (!disabled) {
          if (!reduceMotion && scaleTo !== 1) springTo(scale, 1, false);
          fadeTo(flash, 0, reduceMotion ? 0 : 190);
        }
        onPressOut?.(event);
      }}
      style={[
        style,
        animatedStyle,
        disabled ? styles.disabled : null,
      ]}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: resolvedFlash,
            borderRadius: radius,
            borderCurve: "continuous",
          },
          flashStyle,
        ]}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
});
