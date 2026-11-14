import { Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../../lib/theme";
import { CategoryIcon } from "./CategoryIcon";

/**
 * Semantic icon keys live in the category table. The tile draws the stroke set
 * in `CategoryIcon`; `glyph` remains for the few callers that pass a symbol.
 */
export const CATEGORY_ICON_KEYS = [
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
  "plus",
] as const;

export function categoryGlyph(icon: string | null | undefined): string {
  return icon ?? "•";
}

function tint(color: string | null | undefined, fallback: string): string {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return fallback;
  return `${color}22`;
}

export type CategoryTileProps = {
  icon?: string | null;
  color?: string | null;
  size?: number;
  glyph?: string;
  style?: StyleProp<ViewStyle>;
};

export function CategoryTile({ icon, color, size = 42, glyph, style }: CategoryTileProps) {
  const { theme } = useTheme();
  const foreground = color ?? theme.colors.accent;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size,
          height: size,
          borderRadius: Math.max(10, Math.round(size / 3)),
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tint(color, theme.colors.surfaceSunken),
        },
        style,
      ]}
    >
      {glyph ? (
        <Text
          style={{
            color: foreground,
            fontSize: Math.round(size * 0.43),
            lineHeight: Math.round(size * 0.55),
          }}
        >
          {glyph}
        </Text>
      ) : (
        <CategoryIcon name={icon} color={foreground} size={Math.round(size * 0.5)} />
      )}
    </View>
  );
}
