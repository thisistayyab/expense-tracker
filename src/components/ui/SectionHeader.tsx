import { Pressable, Text, View } from "react-native";

import { useTheme } from "../../lib/theme";

export type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * iOS grouped-list section header: sentence case, 13 pt, secondary grey, aligned
 * with the text inside the sections below it. Uppercase tracked headers are a
 * web/Android habit and read as a template rather than a system list.
 */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 24,
        paddingBottom: 8,
        // Matches the padded cards below (16 pt inset), so the label sits on the
        // same vertical line as the text inside them instead of floating 20 pt in.
        paddingHorizontal: 16,
      }}
    >
      <Text
        style={[
          theme.text.caption,
          { color: theme.colors.textSecondary, fontWeight: "600", letterSpacing: 0 },
        ]}
      >
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
          style={({ pressed }) => (pressed ? { opacity: 0.55 } : null)}
        >
          <Text style={[theme.text.caption, { color: theme.colors.accent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
