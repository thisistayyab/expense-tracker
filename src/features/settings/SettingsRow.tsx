import { Pressable, Text, View } from "react-native";

import { CategoryTile } from "../../components/ui";
import { useTheme, type ToneName } from "../../lib/theme";

export type SettingsRowProps = {
  label: string;
  value?: string;
  glyph: string;
  tone?: ToneName;
  onPress?: () => void;
  showDivider?: boolean;
  danger?: boolean;
};

/** A settings row with the 30 pt tinted leading tile from 07 §8. */
export function SettingsRow({
  label,
  value,
  glyph,
  tone = "slate",
  onPress,
  showDivider = false,
  danger = false,
}: SettingsRowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={({ pressed }) => ({
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        borderTopWidth: showDivider ? 1 : 0,
        borderTopColor: theme.colors.border,
        opacity: pressed && onPress ? 0.62 : 1,
      })}
    >
      <CategoryTile glyph={glyph} color={theme.tones[tone].foreground} size={30} />
      <Text
        style={[
          theme.text.body,
          { color: danger ? theme.colors.danger : theme.colors.textPrimary, flex: 1 },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {value ? (
        <Text
          style={[theme.text.caption, { color: theme.colors.textSecondary }]}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      {onPress ? (
        <Text style={[theme.text.body, { color: theme.colors.textTertiary }]}>›</Text>
      ) : (
        <View style={{ width: 6 }} />
      )}
    </Pressable>
  );
}
