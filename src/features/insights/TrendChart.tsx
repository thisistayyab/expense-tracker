import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { Money } from "../../components/ui";
import type { TrendPoint } from "../../lib/domain/insights";
import { formatMoneySpoken } from "../../lib/format/money";
import { haptics } from "../../lib/haptics";
import { SPRING_SETTLE } from "../../lib/motion";
import { FONT_FAMILIES, useTheme } from "../../lib/theme";

type Point = { x: number; y: number };

/** Quadratic-midpoint smoothing prevents curve overshoot past single-month spikes. */
function smoothPath(points: readonly Point[]): string {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = ((p0.x + p1.x) / 2).toFixed(1);
    const midY = ((p0.y + p1.y) / 2).toFixed(1);
    d += ` Q ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

/**
 * Smooth spline cashflow trend chart with frosted month inspection and animated entrance.
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
  const reduceMotion = useReducedMotion();
  const [prevPoints, setPrevPoints] = useState(points);
  const [selectedIdx, setSelectedIdx] = useState(() => Math.max(0, points.length - 1));
  if (prevPoints !== points) {
    setPrevPoints(points);
    setSelectedIdx(Math.max(0, points.length - 1));
  }

  const reveal = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    reveal.set(reduceMotion ? 1 : withSpring(1, SPRING_SETTLE));
  }, [points, reduceMotion, reveal]);

  const chartRevealStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 8 }],
  }));

  const width = Math.max(220, windowWidth - 76);
  const height = 148;
  const padX = 18;
  const padTop = 16;
  const padBottom = 26;
  const plotW = width - padX * 2;
  const plotH = height - padTop - padBottom;
  const baseY = padTop + plotH;

  const hasIncome = points.some((point) => point.incomeMinor > 0);
  const maxValue = Math.max(
    1,
    ...points.map((point) => Math.max(point.expenseMinor, point.incomeMinor)),
  );
  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;

  const toCoords = (selector: (point: TrendPoint) => number): Point[] =>
    points.map((point, index) => ({
      x: padX + index * stepX,
      y: padTop + plotH - (selector(point) / maxValue) * plotH,
    }));

  const expenseCoords = toCoords((point) => point.expenseMinor);
  const incomeCoords = toCoords((point) => point.incomeMinor);

  const expenseLine = smoothPath(expenseCoords);
  const expenseArea = expenseCoords.length
    ? `${expenseLine} L ${expenseCoords[expenseCoords.length - 1].x.toFixed(1)} ${baseY} L ${expenseCoords[0].x.toFixed(1)} ${baseY} Z`
    : "";
  const incomeLine = hasIncome ? smoothPath(incomeCoords) : "";

  const clampedIdx = Math.min(selectedIdx, Math.max(0, points.length - 1));
  const activePoint = points[clampedIdx];
  const activeCoord = expenseCoords[clampedIdx];
  const activeIncomeCoord = incomeCoords[clampedIdx];

  const spokenSummary = points
    .map((point) => {
      const spend = formatMoneySpoken(point.expenseMinor, currency);
      if (!hasIncome) return `${point.label}: ${spend}`;
      return `${point.label}: ${spend} spent, ${formatMoneySpoken(point.incomeMinor, currency)} in`;
    })
    .join(". ");

  return (
    <View style={styles.root}>
      {activePoint ? (
        <View
          style={[
            styles.inspectPill,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.cardBorder,
            },
          ]}
        >
          <Text
            style={[
              theme.text.caption,
              { color: theme.colors.textSecondary, fontFamily: FONT_FAMILIES.bold },
            ]}
          >
            {activePoint.label}
          </Text>
          <View style={styles.dotPair}>
            <View style={[styles.miniDot, { backgroundColor: theme.colors.accent }]} />
            <Money
              minor={activePoint.expenseMinor}
              currency={currency}
              tone="default"
              style={[
                theme.text.caption,
                { color: theme.colors.textPrimary, fontFamily: FONT_FAMILIES.bold },
              ]}
            />
          </View>
          {hasIncome ? (
            <View style={styles.dotPair}>
              <View style={[styles.miniDot, { backgroundColor: theme.colors.income }]} />
              <Money
                minor={activePoint.incomeMinor}
                currency={currency}
                tone="income"
                style={[theme.text.caption, { fontFamily: FONT_FAMILIES.bold }]}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      <Animated.View style={chartRevealStyle}>
        <View style={{ position: "relative" }}>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Six-month trend. ${spokenSummary}`}
          >
            <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.colors.accent} stopOpacity="0.26" />
                <Stop offset="0.7" stopColor={theme.colors.accent} stopOpacity="0.06" />
                <Stop offset="1" stopColor={theme.colors.accent} stopOpacity="0" />
              </LinearGradient>
            </Defs>

            <Line
              x1={padX}
              y1={padTop + plotH * 0.5}
              x2={width - padX}
              y2={padTop + plotH * 0.5}
              stroke={theme.colors.border}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <Line
              x1={padX}
              y1={baseY}
              x2={width - padX}
              y2={baseY}
              stroke={theme.colors.border}
              strokeWidth={1}
            />

            {activeCoord ? (
              <Line
                x1={activeCoord.x}
                y1={padTop}
                x2={activeCoord.x}
                y2={baseY}
                stroke={theme.colors.accent}
                strokeOpacity={0.28}
                strokeWidth={1.25}
                strokeDasharray="3 3"
              />
            ) : null}

            {expenseArea ? <Path d={expenseArea} fill="url(#trendAreaGrad)" /> : null}

            {hasIncome ? (
              <Path
                d={incomeLine}
                fill="none"
                stroke={theme.colors.income}
                strokeWidth={2}
                strokeDasharray="5 4"
                strokeLinecap="round"
              />
            ) : null}

            {expenseLine ? (
              <Path
                d={expenseLine}
                fill="none"
                stroke={theme.colors.accent}
                strokeWidth={2.75}
                strokeLinecap="round"
              />
            ) : null}

            {expenseCoords.map((pt, idx) =>
              idx === clampedIdx ? null : (
                <Circle
                  key={`dot-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={3}
                  fill={theme.colors.surface}
                  stroke={theme.colors.accent}
                  strokeWidth={1.75}
                />
              ),
            )}

            {hasIncome && activeIncomeCoord ? (
              <Circle
                cx={activeIncomeCoord.x}
                cy={activeIncomeCoord.y}
                r={4.5}
                fill={theme.colors.income}
                stroke={theme.colors.surface}
                strokeWidth={1.8}
              />
            ) : null}

            {activeCoord ? (
              <>
                <Circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r={10}
                  fill={theme.colors.accent}
                  fillOpacity={0.18}
                />
                <Circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r={5}
                  fill={theme.colors.accent}
                  stroke={theme.colors.surface}
                  strokeWidth={2}
                />
              </>
            ) : null}

            {points.map((point, index) => (
              <SvgText
                key={point.month}
                x={padX + index * stepX}
                y={height - 6}
                fill={
                  index === clampedIdx ? theme.colors.accent : theme.colors.textTertiary
                }
                fontSize={11.5}
                fontFamily={index === clampedIdx ? FONT_FAMILIES.bold : FONT_FAMILIES.medium}
                textAnchor="middle"
              >
                {point.label}
              </SvgText>
            ))}
            </Svg>
          </View>

          <View style={[StyleSheet.absoluteFill, styles.touchOverlay]}>
            {points.map((point, index) => (
              <Pressable
                key={point.month}
                onPress={() => {
                  haptics.selection();
                  setSelectedIdx(index);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: index === clampedIdx }}
                accessibilityLabel={`Select ${point.label}: ${formatMoneySpoken(
                  point.expenseMinor,
                  currency,
                )}`}
                style={styles.touchColumn}
              />
            ))}
          </View>
        </View>
      </Animated.View>

      {hasIncome ? (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.miniDot, { backgroundColor: theme.colors.accent }]} />
            <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>Spent</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.miniDot, { backgroundColor: theme.colors.income }]} />
            <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>Income</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 12,
    gap: 10,
  },
  inspectPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  dotPair: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  miniDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  touchOverlay: {
    flexDirection: "row",
  },
  touchColumn: {
    flex: 1,
    height: "100%",
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
