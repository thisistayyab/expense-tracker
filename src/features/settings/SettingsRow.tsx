import { StyleSheet, Text, View } from "react-native";
import {
  AppIcon,
  SettingsIcon,
  TactilePressable,
  type SettingsIconName,
} from "../../components/ui";
import { type ToneName, useTheme } from "../../lib/theme";

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

/**
 * Grouped iOS settings row with frosted squircle SF Symbol badge and crisp press physics.
 */
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
  const palette = theme.tones[tone];

  const leading = icon || glyph ? (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.iconTile,
        { backgroundColor: palette.background },
      ]}
    >
      {icon ? (
        <SettingsIcon name={icon} color={palette.foreground} size={17} />
      ) : (
        <Text style={[styles.glyph, { color: palette.foreground }]}>{glyph}</Text>
      )}
    </View>
  ) : null;

  const content = (
    <View style={styles.row}>
      {leading}
      <Text
        style={[
          theme.text.bodyStrong,
          styles.label,
          { color: danger ? theme.colors.danger : theme.colors.textPrimary },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {value ? (
        <Text
          style={[theme.text.body, { color: theme.colors.textSecondary }]}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      {onPress ? (
        <AppIcon name="chevronRight" size={14} color={theme.colors.textTertiary} weight="bold" />
      ) : null}
    </View>
  );

  return (
    <View>
      {onPress ? (
        <TactilePressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={value ? `${label}, ${value}` : label}
          scaleTo={0.985}
          radius={14}
        >
          {content}
        </TactilePressable>
      ) : (
        content
      )}
      {showDivider ? (
        <View
          style={[
            styles.divider,
            {
              backgroundColor: theme.colors.border,
              marginLeft: leading ? 60 : 16,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glyph: {
    fontSize: 15,
    fontWeight: "600",
  },
  label: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
