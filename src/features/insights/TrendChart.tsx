import { Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

import type { TrendPoint } from "../../lib/domain/insights";
import { formatMoney } from "../../lib/format/money";
import { useTheme } from "../../lib/theme";

type Point = { x: number; y: number };

/**
 * Quadratic-midpoint smoothing: the curve passes through every month's value and
 * never overshoots past a peak, which matters when one month is rent and the next
 * is coffee.
 */
function smoothPath(points: readonly Point[]): string {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const middle = (previous.x + current.x) / 2;
    path += ` C ${middle} ${previous.y}, ${middle} ${current.y}, ${current.x} ${current.y}`;
  }
  return path;
}

/**
 * Six months of spending as an iris area, with income as a dashed second series
 * (03 requires both; 07 supplies the area treatment). No axes or grid: the rows
 * below the chart and the accessibility label carry the numbers.
 */
export function TrendChart({
  points,
  currency,
}: {
  points: readonly TrendPoint[];
  currency: string;
}) {
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.max(220, windowWidth - 76);
  const height = 136;
  const padding = { top: 12, right: 6, bottom: 22, left: 6 };
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, ...points.map((point) => Math.max(point.expenseMinor, point.incomeMinor)));
  const step = points.length > 1 ? (width - padding.left - padding.right) / (points.length - 1) : 0;
  const xAt = (index: number) => padding.left + index * step;
  const yAt = (value: number) => padding.top + (1 - value / maxValue) * plotHeight;

  if (!points.length) return null;

  const expensePoints = points.map((point, index) => ({ x: xAt(index), y: yAt(point.expenseMinor) }));
  const incomePoints = points.map((point, index) => ({ x: xAt(index), y: yAt(point.incomeMinor) }));
  const expenseLine = smoothPath(expensePoints);
  const first = expensePoints[0];
  const last = expensePoints[expensePoints.length - 1];
  const baseline = height - padding.bottom;
  const expenseArea =
    expenseLine && first && last
      ? `${expenseLine} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`
      : "";

  const summary = points
    .map(
      (point) =>
        `${point.label}: ${formatMoney(point.expenseMinor, currency)} spent, ${formatMoney(
          point.incomeMinor,
          currency,
        )} income`,
    )
    .join(". ");

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Six month trend. ${summary}`}
      style={{ marginTop: 10 }}
    >
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.accentAlt} stopOpacity={0.28} />
            <Stop offset="1" stopColor={theme.colors.accentAlt} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={expenseArea} fill="url(#trend-fill)" />
        <Path
          d={expenseLine}
          fill="none"
          stroke={theme.colors.accentAlt}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
        <Path
          d={smoothPath(incomePoints)}
          fill="none"
          stroke={theme.colors.income}
          strokeWidth={1.8}
          strokeDasharray="4 4"
          strokeLinecap="round"
        />
        {last ? (
          <Circle
            cx={last.x}
            cy={last.y}
            r={4.5}
            fill={theme.colors.accentAlt}
            stroke={theme.colors.surface}
            strokeWidth={2}
          />
        ) : null}
        {points.map((point, index) => (
          <SvgText
            key={point.month}
            x={xAt(index)}
            y={height - 6}
            fontSize={10.5}
            fill={theme.colors.textTertiary}
            textAnchor="middle"
          >
            {point.label}
          </SvgText>
        ))}
      </Svg>

      <View style={{ flexDirection: "row", gap: 14, marginTop: 4 }}>
        <Legend color={theme.colors.accentAlt} label="Spending" />
        <Legend color={theme.colors.income} label="Income" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}
