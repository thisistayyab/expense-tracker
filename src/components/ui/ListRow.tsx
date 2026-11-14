import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../lib/theme";
import { AppIcon } from "./AppIcon";

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

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
      style={({ pressed }) => [
        styles.row,
        showDivider
          ? { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: theme.colors.border }
          : null,
        pressed && onPress ? { backgroundColor: theme.colors.surfaceMuted } : null,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.content}>
        <Text
          style={[theme.text.body, { color: theme.colors.textPrimary, fontWeight: "500" }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 1 }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {chevron ? (
        <View style={{ marginLeft: trailing ? 2 : 4 }}>
          <AppIcon name="chevronRight" color={theme.colors.textTertiary} size={15} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  leading: {
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  trailing: {
    flexShrink: 0,
    alignItems: "flex-end",
  },
});
