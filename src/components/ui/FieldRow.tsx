import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../lib/theme";
import { AppIcon } from "./AppIcon";
import { TactilePressable } from "./TactilePressable";

export type FieldRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  muted?: boolean;
  showDivider?: boolean;
};

/**
 * Interactive grouped setting/form selector row with smooth spring feedback.
 */
export function FieldRow({
  label,
  value,
  onPress,
  muted = false,
  showDivider = false,
}: FieldRowProps) {
  const { theme } = useTheme();
  const interactive = Boolean(onPress);

  const row = (
    <View style={styles.row}>
      <Text style={[theme.text.body, { color: theme.colors.textSecondary, flexShrink: 1 }]}>
        {label}
      </Text>
      <View style={styles.right}>
        {value ? (
          <Text
            style={[
              theme.text.bodyStrong,
              {
                color: muted ? theme.colors.textTertiary : theme.colors.textPrimary,
                textAlign: "right",
                flexShrink: 1,
              },
            ]}
            numberOfLines={1}
          >
            {value}
          </Text>
        ) : null}
        {interactive ? (
          <AppIcon name="chevronRight" size={14} color={theme.colors.textTertiary} weight="bold" />
        ) : null}
      </View>
    </View>
  );

  return (
    <View>
      {interactive ? (
        <TactilePressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={value ? `${label}, ${value}` : label}
          scaleTo={0.985}
          radius={12}
        >
          {row}
        </TactilePressable>
      ) : (
        row
      )}
      {showDivider ? (
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  right: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
});
