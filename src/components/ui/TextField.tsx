import { useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

import { useTheme } from "../../lib/theme";

export type TextFieldProps = Omit<TextInputProps, "style"> & {
  label?: string;
  helper?: string;
  error?: string | null;
};

export function TextField({ label, helper, error, ...input }: TextFieldProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const invalid = Boolean(error);

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text style={[theme.text.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      ) : null}
      <TextInput
        {...input}
        onFocus={(event) => {
          setFocused(true);
          input.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          input.onBlur?.(event);
        }}
        placeholderTextColor={theme.colors.textTertiary}
        accessibilityLabel={input.accessibilityLabel ?? label}
        accessibilityState={{ disabled: input.editable === false }}
        style={[
          theme.text.body,
          {
            minHeight: 50,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: theme.radius.input,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: invalid
              ? theme.colors.danger
              : focused
                ? theme.colors.accent
                : theme.colors.cardBorder === "transparent"
                  ? theme.colors.border
                  : theme.colors.cardBorder,
            color: theme.colors.textPrimary,
          },
        ]}
      />
      {invalid || helper ? (
        <Text
          style={[
            theme.text.caption,
            { color: invalid ? theme.colors.danger : theme.colors.textTertiary },
          ]}
        >
          {error ?? helper}
        </Text>
      ) : null}
    </View>
  );
}
