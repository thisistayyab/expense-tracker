import { useId } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

export type BrandMarkProps = {
  size?: number;
  /** Wrap the sculpted emblem inside the obsidian squircle app icon frame. */
  framed?: boolean;
  style?: StyleProp<ViewStyle>;
};

const RESERVE_PATH =
  "M 262 344 L 262 328 A 68 68 0 0 1 330 260 L 694 260 A 68 68 0 0 1 762 328 L 762 344 L 680.8 344 C 603.1 344 586.3 398 512 398 C 437.7 398 420.9 344 343.2 344 Z";

const POCKET_PATH =
  "M 216 456 A 88 88 0 0 1 304 368 L 354 368 C 426.7 368 442.5 422 512 422 C 581.5 422 597.3 368 670 368 L 720 368 A 88 88 0 0 1 808 456 L 808 530 L 716 530 A 46 46 0 0 0 716 622 L 808 622 L 808 676 A 88 88 0 0 1 720 764 L 304 764 A 88 88 0 0 1 216 676 Z";

/**
 * Suffice brand mark: a clean porcelain ledger pocket paired with a rising
 * Apple-blue reserve layer ("know what's left") and magnetic clasp orb.
 */
export function BrandMark({ size = 64, framed = true, style }: BrandMarkProps) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const bgId = `bg-${uid}`;
  const resId = `res-${uid}`;
  const pocId = `poc-${uid}`;
  const orbId = `orb-${uid}`;

  const frameRadius = Math.round(size * 0.24);
  const symbolTransform = framed ? "translate(512 512) scale(1.18) translate(-512 -512)" : undefined;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: framed ? frameRadius : 0,
          borderCurve: "continuous",
          overflow: framed ? "hidden" : "visible",
          backgroundColor: framed ? "#090A0E" : "transparent",
          borderWidth: framed ? StyleSheet.hairlineWidth : 0,
          borderColor: framed ? "rgba(128, 138, 160, 0.24)" : "transparent",
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 1024 1024">
        <Defs>
          <LinearGradient id={bgId} x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0%" stopColor="#161922" />
            <Stop offset="100%" stopColor="#090A0E" />
          </LinearGradient>
          <LinearGradient id={resId} x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0%" stopColor="#38A2FF" />
            <Stop offset="100%" stopColor="#0A7AFF" />
          </LinearGradient>
          <LinearGradient id={pocId} x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0%" stopColor="#F8F9FC" />
            <Stop offset="100%" stopColor="#E7EBF3" />
          </LinearGradient>
          <LinearGradient id={orbId} x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0%" stopColor="#42A8FF" />
            <Stop offset="100%" stopColor="#0A80FF" />
          </LinearGradient>
        </Defs>

        {framed ? <Rect x="0" y="0" width="1024" height="1024" fill={`url(#${bgId})`} /> : null}

        <G transform={symbolTransform}>
          <Path d={RESERVE_PATH} fill={`url(#${resId})`} />
          <Path d={POCKET_PATH} fill={`url(#${pocId})`} />
          <Circle cx={716} cy={576} r={25} fill={`url(#${orbId})`} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
