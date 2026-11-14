import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../lib/theme";
import { AppIcon } from "./AppIcon";
import { TactilePressable } from "./TactilePressable";

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
 * The chevrons and the label share one hairline pill so the control reads as a
 * single object; the label is a live region so a screen reader announces the month.
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
    direction: "chevronLeft" | "chevronRight",
    onPress: (() => void) | undefined,
    enabled: boolean,
    accessibilityLabel: string,
  ) => (
    <TactilePressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !enabled }}
      hitSlop={8}
      haptic="selection"
      scaleTo={0.9}
      radius={16}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        opacity: enabled ? 1 : 0.3,
      }}
    >
      <AppIcon name={direction} color={theme.colors.textPrimary} size={16} />
    </TactilePressable>
  );

  return (
    <View
      accessibilityRole="header"
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 3,
        borderRadius: 999,
        backgroundColor: theme.colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.cardBorder,
      }}
    >
      {arrow("chevronLeft", onPrevious, canGoPrevious, "Previous month")}
      <Text
        style={[
          theme.text.label,
          {
            minWidth: 120,
            textAlign: "center",
            paddingHorizontal: 4,
            color: theme.colors.textPrimary,
            fontVariant: ["tabular-nums"],
          },
        ]}
        numberOfLines={1}
        accessibilityLiveRegion="polite"
      >
        {label}
      </Text>
      {arrow("chevronRight", onNext, canGoNext, "Next month")}
    </View>
  );
}
