import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../lib/theme";
import { AppIcon } from "./AppIcon";
import { TactilePressable } from "./TactilePressable";

export type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Clean iOS grouped-list section header paired with a translucent frosted action pill.
 */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.row}>
      <Text
        accessibilityRole="header"
        style={[
          theme.text.caption,
          {
            color: theme.colors.textSecondary,
            fontWeight: "600",
            fontSize: 13.5,
          },
        ]}
      >
        {title}
      </Text>
      {actionLabel && onAction ? (
        <TactilePressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          scaleTo={0.94}
          radius={999}
          hitSlop={8}
          style={[styles.actionPill, { backgroundColor: theme.colors.accentSoft }]}
        >
          <Text
            style={[
              theme.text.caption,
              { color: theme.colors.accent, fontWeight: "600", fontSize: 12.5 },
            ]}
          >
            {actionLabel}
          </Text>
          <AppIcon name="chevronRight" size={11} color={theme.colors.accent} weight="bold" />
        </TactilePressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 22,
    paddingBottom: 9,
    paddingHorizontal: 16,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderCurve: "continuous",
  },
});
