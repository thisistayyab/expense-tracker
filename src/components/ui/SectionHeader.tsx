import { Pressable, Text, View } from "react-native";

import { useTheme } from "../../lib/theme";

export type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 16,
        paddingBottom: 8,
        paddingHorizontal: 4,
      }}
    >
      <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
          style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
        >
          <Text style={[theme.text.label, { color: theme.colors.accent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
