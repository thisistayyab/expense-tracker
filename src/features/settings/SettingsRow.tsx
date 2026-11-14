import { Pressable, Text, View } from "react-native";

import { AppIcon } from "../../components/ui/AppIcon";
import { SettingsIcon, type SettingsIconName } from "../../components/ui/SettingsIcon";
import { useTheme, type ToneName } from "../../lib/theme";

export type SettingsRowProps = {
  label: string;
  value?: string;
  glyph?: string;
  icon?: SettingsIconName;
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
  icon,
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
        minHeight: 54,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        borderTopWidth: showDivider ? 1 : 0,
        borderTopColor: theme.colors.border,
        backgroundColor: pressed && onPress ? theme.colors.surfaceMuted : "transparent",
      })}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.tones[tone].foreground,
        }}
      >
        {icon ? (
          <SettingsIcon name={icon} color="#FFFFFF" size={17} />
        ) : (
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>{glyph}</Text>
        )}
      </View>
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
          style={[theme.text.label, { color: theme.colors.textSecondary, fontWeight: "400" }]}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      {onPress ? (
        <AppIcon name="chevronRight" color={theme.colors.textTertiary} size={15} />
      ) : (
        <View style={{ width: 6 }} />
      )}
    </Pressable>
  );
}
