import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../lib/theme";
import { AppIcon, type AppIconName } from "./AppIcon";
import { Button } from "./Button";

export type EmptyStateProps = {
  title: string;
  body: string;
  icon?: AppIconName;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Calm, spacious iOS empty state with optional frosted icon badge and pill CTA.
 */
export function EmptyState({ title, body, icon, actionLabel, onAction }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrap}>
      {icon ? (
        <View style={[styles.iconHalo, { backgroundColor: theme.colors.accentSoft }]}>
          <AppIcon name={icon} size={22} color={theme.colors.accent} />
        </View>
      ) : null}
      <Text style={[theme.text.title3, { color: theme.colors.textPrimary }]}>{title}</Text>
      <Text style={[theme.text.body, styles.body, { color: theme.colors.textSecondary }]}>
        {body}
      </Text>
      {actionLabel && onAction ? (
        <View style={styles.actionWrap}>
          <Button
            label={actionLabel}
            onPress={onAction}
            variant="accent"
            size="sm"
            fullWidth={false}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    paddingVertical: 10,
  },
  iconHalo: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  body: {
    maxWidth: 310,
  },
  actionWrap: {
    alignSelf: "flex-start",
    marginTop: 8,
  },
});
