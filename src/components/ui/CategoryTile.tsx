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
  style?: StyleProp<ViewStyle>;
};

function translucentColor(color: string, alphaHex: string, fallback: string): string {
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return `${trimmed}${alphaHex}`;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const expanded = `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    return `${expanded}${alphaHex}`;
  }
  return fallback;
}

/**
 * Smooth tonal iOS squircle category icon badge.
 */
export function CategoryTile({ icon, appIcon, color, size = 42, style }: CategoryTileProps) {
  const { theme } = useTheme();
  const foreground = color ?? theme.colors.accent;
  const corner = Math.max(11, Math.round(size * 0.31));
  const glyphSize = Math.round(size * 0.48);
  const bg = translucentColor(
    foreground,
    theme.scheme === "dark" ? "22" : "14",
    theme.colors.accentSoft,
  );

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
          backgroundColor: bg,
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
