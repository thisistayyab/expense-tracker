import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../lib/theme";

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /**
   * Render in the current screen instead of a second RN Modal. Use this when the
   * route is already a native transparent modal: nesting a Modal inside a modal
   * window is what breaks keyboard focus and avoidance on Android.
   */
  embedded?: boolean;
};

/**
 * Bottom sheet with keyboard handling we own.
 *
 * `KeyboardAvoidingView` does not move this sheet in the add route, so the sheet is
 * translated directly by the reported keyboard height. Translating (instead of
 * resizing) keeps the focused TextInput mounted, which is what stops the keyboard
 * from blurring the field. The height is clamped at the same time so the header and
 * Save stay on screen while the body scrolls.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  embedded = false,
}: SheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvent, (event) => {
      const height = event.endCoordinates?.height ?? 0;
      if (height <= 0) return;
      setKeyboardHeight(height);
      translateY.value = withTiming(-height, {
        duration: reduceMotion ? 0 : event.duration || 240,
        easing: Easing.out(Easing.cubic),
      });
    });

    const hide = Keyboard.addListener(hideEvent, (event) => {
      setKeyboardHeight(0);
      translateY.value = withTiming(0, {
        duration: reduceMotion ? 0 : event.duration || 220,
        easing: Easing.out(Easing.cubic),
      });
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [reduceMotion, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const keyboardVisible = keyboardHeight > 0;
  const availableHeight = Math.max(
    320,
    keyboardVisible
      ? windowHeight - keyboardHeight - insets.top - 8
      : windowHeight * 0.86,
  );

  const sheet = (
    <Animated.View
      style={[
        styles.sheet,
        {
          maxHeight: availableHeight,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.cardBorder,
          paddingBottom: keyboardVisible ? 16 : insets.bottom + 16,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.grabberRow}>
        <View style={[styles.grabber, { backgroundColor: theme.colors.surfaceSunken }]} />
      </View>
      {title ? (
        <Text
          style={[
            theme.text.title2,
            { color: theme.colors.textPrimary, paddingHorizontal: 20, paddingBottom: 12 },
          ]}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </Animated.View>
  );

  const overlay = (
    <View style={[styles.root, { backgroundColor: theme.colors.scrim }]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      {sheet}
    </View>
  );

  if (embedded) return overlay;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {overlay}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    paddingTop: 8,
  },
  grabberRow: {
    alignItems: "center",
    paddingBottom: 10,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
});
