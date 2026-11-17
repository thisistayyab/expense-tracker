import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../lib/theme";
import { AppIcon } from "./AppIcon";
import { TactilePressable } from "./TactilePressable";

export type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
  showChevron?: boolean;
  accessibilityLabel?: string;
};

/**
 * Grouped iOS row with tactile highlight, crisp inset divider, and SF Symbol chevron.
 */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  showDivider = false,
  showChevron,
  accessibilityLabel,
}: ListRowProps) {
  const { theme } = useTheme();
  const chevron = showChevron ?? Boolean(onPress);

  const inner = (
    <View style={styles.row}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.textCol}>
        <Text style={[theme.text.bodyStrong, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {chevron ? (
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
          accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
          scaleTo={0.985}
          radius={14}
        >
          {inner}
        </TactilePressable>
      ) : (
        inner
      )}
      {showDivider ? (
        <View
          style={[
            styles.divider,
            {
              backgroundColor: theme.colors.border,
              marginLeft: leading ? 68 : 16,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  leading: {
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  trailing: {
    alignItems: "flex-end",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
