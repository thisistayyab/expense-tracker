import { Pressable, Text, View } from "react-native";

import { useTheme } from "../../lib/theme";

export type FieldRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  muted?: boolean;
  showDivider?: boolean;
};

export function FieldRow({ label, value, onPress, muted = false, showDivider = false }: FieldRowProps) {
  const { theme } = useTheme();
  const interactive = Boolean(onPress);

  return (
    <Pressable
      onPress={onPress}
      disabled={!interactive}
      accessibilityRole={interactive ? "button" : undefined}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={({ pressed }) => [
        {
          minHeight: 52,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          borderTopWidth: showDivider ? 1 : 0,
          borderTopColor: theme.colors.border,
        },
        pressed && interactive ? { opacity: 0.62 } : null,
      ]}
    >
      <Text style={[theme.text.body, { color: theme.colors.textPrimary }]}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
        {value ? (
          <Text
            style={[
              theme.text.body,
              { color: muted ? theme.colors.textTertiary : theme.colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {value}
          </Text>
        ) : null}
        {interactive ? (
          <Text style={[theme.text.title3, { color: theme.colors.textTertiary }]}>›</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
