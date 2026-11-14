import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

import { haptics } from "../../lib/haptics";
import { fadeTo, springTo } from "../../lib/motion";

export type TactilePressableProps = Omit<
  PressableProps,
  "style" | "children" | "onPressIn" | "onPressOut"
> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale reached while the finger is down. 1 turns the squish off. */
  scaleTo?: number;
  haptic?: "tick" | "selection" | "none";
  /** Radius of the press flash, so it follows the shape being pressed. */
  radius?: number;
  /** Tint of the press flash: white on filled shapes, ink on light ones. */
  flashColor?: string;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
};

/**
 * Every tappable surface in the app. The press is a spring, not a fade: the shape
 * contracts under the finger and settles back with a little overshoot while a soft
 * flash crosses it, which is what gives a glass button the feel of weight. A
 * selection haptic fires on touch-down so the hand and the eye agree.
 *
 * A transparent Pressable covers the shape so the tap target never shrinks with
 * the animation — the drawing scales, the hit area stays honest.
 */
export function TactilePressable({
  children,
  style,
  scaleTo = 0.96,
  haptic = "tick",
  radius = 999,
  flashColor = "rgba(16,18,23,0.07)",
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: TactilePressableProps) {
  const scale = useSharedValue(1);
  const flash = useSharedValue(0);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <Animated.View style={[style, pressStyle]}>
      {children}

      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={(event) => {
          springTo(scale, disabled ? 1 : scaleTo, true);
          fadeTo(flash, disabled ? 0 : 1, 90);
          if (!disabled && haptic === "tick") haptics.tick();
          else if (!disabled && haptic === "selection") haptics.selection();
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          springTo(scale, 1);
          fadeTo(flash, 0, 220);
          onPressOut?.(event);
        }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: flashColor, borderRadius: radius },
          flashStyle,
        ]}
      />
    </Animated.View>
  );
}
