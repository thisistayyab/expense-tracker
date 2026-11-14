import { Text, type StyleProp, type TextStyle } from "react-native";

import {
  formatMoney,
  formatMoneySpoken,
  type MoneyFormatOptions,
} from "../../lib/format/money";
import { useTheme, type TextToken } from "../../lib/theme";

export type MoneyTone = "default" | "income" | "muted" | "onInk" | "danger";

export type MoneyProps = MoneyFormatOptions & {
  minor: number;
  currency: string;
  tone?: MoneyTone;
  size?: TextToken;
  style?: StyleProp<TextStyle>;
};

/**
 * Amounts are ink on purpose (04): direction is carried by the sign and by green
 * for income, so red always means "something is wrong". Tabular figures keep
 * columns aligned for any currency string.
 */
export function Money({
  minor,
  currency,
  tone = "default",
  size = "bodyStrong",
  style,
  ...options
}: MoneyProps) {
  const { theme } = useTheme();

  const color =
    tone === "income"
      ? theme.colors.income
      : tone === "muted"
        ? theme.colors.textSecondary
        : tone === "onInk"
          ? theme.colors.onInk
          : tone === "danger"
            ? theme.colors.danger
            : theme.colors.textPrimary;

  const spoken = formatMoneySpoken(minor, currency, options);

  return (
    <Text
      style={[theme.text[size], { color, fontVariant: ["tabular-nums"] }, style]}
      maxFontSizeMultiplier={size === "hero" || size === "amountXL" ? 1.3 : undefined}
      numberOfLines={1}
      accessibilityLabel={spoken}
    >
      {formatMoney(minor, currency, options)}
    </Text>
  );
}
