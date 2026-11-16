import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme";
import { AppIcon, type AppIconName } from "./AppIcon";
import { CategoryIcon, type CategoryIconName } from "./CategoryIcon";

export const CATEGORY_ICON_KEYS: readonly CategoryIconName[] = [
  "utensils",
  "cart",
  "car",
  "home",
  "bag",
  "receipt",
  "heart",
  "sparkles",
  "book",
  "plane",
  "gift",
  "wallet",
  "briefcase",
  "ellipsis",
] as const;

export function categoryGlyph(name: string | null | undefined): string {
  return name && CATEGORY_ICON_KEYS.includes(name as CategoryIconName) ? name : "ellipsis";
}

export type CategoryTileProps = {
  icon?: string | null;
  appIcon?: AppIconName;
  color: string | null | undefined;
  size?: number;
  glyph?: string | null;
  style?: StyleProp<ViewStyle>;
};

/**
 * Smooth tonal iOS squircle category icon badge.
 */
export function CategoryTile({ icon, appIcon, color, size = 42, style }: CategoryTileProps) {
  const { theme } = useTheme();
  const foreground = color ?? theme.colors.accent;
  const corner = Math.max(11, Math.round(size * 0.31));
  const glyphSize = Math.round(size * 0.48);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: corner,
          borderCurve: "continuous",
          backgroundColor: theme.scheme === "dark" ? `${foreground}22` : `${foreground}14`,
        },
        style,
      ]}
    >
      {appIcon ? (
        <AppIcon name={appIcon} color={foreground} size={glyphSize} weight="semibold" />
      ) : (
        <CategoryIcon name={icon} color={foreground} size={glyphSize} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
