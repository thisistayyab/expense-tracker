import { Pressable, Text, View } from "react-native";

import { useTheme } from "../../lib/theme";

export type MonthSelectorProps = {
  label: string;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
};

/**
 * Month browser for Overview. Two chevrons rather than a dropdown: with local data
 * the range is small (first entry → this month) and a tap is faster than a sheet.
 * The label is a live region so a screen reader announces the new month.
 */
export function MonthSelector({
  label,
  onPrevious,
  onNext,
  canGoPrevious = false,
  canGoNext = false,
}: MonthSelectorProps) {
  const { theme } = useTheme();

  const arrow = (
    symbol: string,
    onPress: (() => void) | undefined,
    enabled: boolean,
    accessibilityLabel: string,
  ) => (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !enabled }}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.surfaceMuted,
        opacity: !enabled ? 0.3 : pressed ? 0.6 : 1,
      })}
    >
      <Text style={[theme.text.title3, { color: theme.colors.textSecondary }]}>{symbol}</Text>
    </Pressable>
  );

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {arrow("‹", onPrevious, canGoPrevious, "Previous month")}
      <View style={{ minWidth: 128, alignItems: "center" }}>
        <Text
          style={[theme.text.title3, { color: theme.colors.textPrimary }]}
          numberOfLines={1}
          accessibilityLiveRegion="polite"
        >
          {label}
        </Text>
      </View>
      {arrow("›", onNext, canGoNext, "Next month")}
    </View>
  );
}
