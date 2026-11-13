import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "../../lib/theme";

export type ProgressRingProps = {
  /** 0–1 is on budget; anything above 1 renders as a full ring. */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: ReactNode;
};

/**
 * The budget total ring (04 signature components). A ring is decoration for
 * sighted users only — the percentage in `children` and the progressbar
 * accessibility value carry the same information as text.
 */
export function ProgressRing({
  value,
  size = 78,
  stroke = 7,
  color,
  trackColor,
  children,
}: ProgressRingProps) {
  const { theme } = useTheme();
  const clamped = Math.max(0, Math.min(value, 1));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor ?? theme.colors.inkTrack}
          strokeWidth={stroke}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color ?? theme.colors.accentAlt}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
