import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../lib/theme";
import { FONT_FAMILIES } from "../../lib/theme/fonts";

export type TextFieldProps = Omit<TextInputProps, "style"> & {
  label?: string;
  helper?: string;
  error?: string | null;
};

/**
 * Frosted iOS input field with smooth focus ring transition and continuous squircle frame.
 */
export function TextField({ label, helper, error, ...input }: TextFieldProps) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const focusProgress = useSharedValue(0);
  const invalid = Boolean(error);

  useEffect(() => {
    focusProgress.value = withTiming(focused ? 1 : 0, { duration: reduceMotion ? 0 : 160 });
  }, [focusProgress, focused, reduceMotion]);

  const idleBorder = theme.colors.cardBorder;
  const activeBorder = invalid ? theme.colors.danger : theme.colors.accent;

  const boxAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: invalid
      ? theme.colors.danger
      : interpolateColor(focusProgress.value, [0, 1], [idleBorder, activeBorder]),
  }));

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text
          style={[
            theme.text.caption,
            { color: theme.colors.textSecondary, fontFamily: FONT_FAMILIES.semibold },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <Animated.View
        style={[
          styles.inputBox,
          {
            borderRadius: theme.radius.input,
            backgroundColor: focused ? theme.colors.surface : theme.colors.surfaceMuted,
          },
          boxAnimatedStyle,
        ]}
      >
        <TextInput
          {...input}
          accessibilityLabel={input.accessibilityLabel ?? label}
          onFocus={(event) => {
            setFocused(true);
            input.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            input.onBlur?.(event);
          }}
          placeholderTextColor={theme.colors.textTertiary}
          selectionColor={theme.colors.accent}
          style={[theme.text.body, styles.input, { color: theme.colors.textPrimary }]}
        />
      </Animated.View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[theme.text.caption, { color: theme.colors.danger }]}>
          {error}
        </Text>
      ) : helper ? (
        <Text style={[theme.text.caption, { color: theme.colors.textTertiary }]}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  inputBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
});
