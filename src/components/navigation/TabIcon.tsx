import Svg, { Path, Rect } from "react-native-svg";

export type TabIconName = "overview" | "activity" | "budget" | "insights";

export type TabIconProps = {
  name: TabIconName;
  color: string;
  size?: number;
};

/**
 * Hand-drawn 24 px stroke icons. Inline SVG keeps the tab bar free of an icon
 * dependency, and the four glyphs share one stroke weight so they read as a set.
 */
export function TabIcon({ name, color, size = 20 }: TabIconProps) {
  const stroke = {
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === "overview" ? (
        <>
          <Path d="M3.8 10.6 12 3.6l8.2 7" {...stroke} />
          <Path d="M6.3 9.4v9.8a1.2 1.2 0 0 0 1.2 1.2h9a1.2 1.2 0 0 0 1.2-1.2V9.4" {...stroke} />
          <Path d="M10.1 20.4v-5.1h3.8v5.1" {...stroke} />
        </>
      ) : null}

      {name === "activity" ? (
        <>
          <Rect x="4.6" y="3.4" width="14.8" height="17.2" rx="3" {...stroke} />
          <Path d="M9 8.6h6M9 12.4h6M9 16.2h3.4" {...stroke} />
        </>
      ) : null}

      {name === "budget" ? (
        <>
          <Rect x="3.4" y="6.2" width="17.2" height="12.4" rx="3.2" {...stroke} />
          <Path d="M3.4 10.9h17.2" {...stroke} />
          <Path d="M15.6 15.4h1.8" {...stroke} />
        </>
      ) : null}

      {name === "insights" ? (
        <>
          <Path d="M6 20.2v-6.6M12 20.2V4.6M18 20.2v-4.2" {...stroke} />
          <Path d="M3.6 20.2h16.8" {...stroke} />
        </>
      ) : null}
    </Svg>
  );
}
