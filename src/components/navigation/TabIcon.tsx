import { SymbolView, type SFSymbol } from "expo-symbols";
import { Platform } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

export type TabIconName = "overview" | "activity" | "budget" | "insights";

export type TabIconProps = {
  name: TabIconName;
  color: string;
  size?: number;
  focused?: boolean;
};

const SF_TAB_OUTLINE: Record<TabIconName, SFSymbol> = {
  overview: "house",
  activity: "list.bullet.rectangle.portrait",
  budget: "target",
  insights: "chart.pie",
};

const SF_TAB_FILLED: Record<TabIconName, SFSymbol> = {
  overview: "house.fill",
  activity: "list.bullet.rectangle.portrait.fill",
  budget: "target",
  insights: "chart.pie.fill",
};

function TabIconSvg({
  name,
  color,
  size = 20,
  focused = false,
}: TabIconProps) {
  const stroke = {
    stroke: color,
    strokeWidth: focused ? 2 : 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === "overview" ? (
        <>
          <Path d="M3.8 10.6 12 3.6l8.2 7" {...stroke} />
          <Path
            d="M6.3 9.4v9.8a1.2 1.2 0 0 0 1.2 1.2h9a1.2 1.2 0 0 0 1.2-1.2V9.4"
            fill={focused ? color : "none"}
            fillOpacity={focused ? 0.16 : 0}
            {...stroke}
          />
          <Path d="M10.1 20.4v-5.1h3.8v5.1" {...stroke} />
        </>
      ) : null}
      {name === "activity" ? (
        <>
          <Rect
            x={4.2}
            y={4.2}
            width={15.6}
            height={15.6}
            rx={3.6}
            fill={focused ? color : "none"}
            fillOpacity={focused ? 0.15 : 0}
            {...stroke}
          />
          <Path d="M8.5 9.2h7M8.5 12.4h7M8.5 15.6h4.2" {...stroke} />
        </>
      ) : null}
      {name === "budget" ? (
        <>
          <Path
            d="M12 3.8a8.2 8.2 0 1 0 8.2 8.2A8.2 8.2 0 0 0 12 3.8Z"
            fill={focused ? color : "none"}
            fillOpacity={focused ? 0.14 : 0}
            {...stroke}
          />
          <Path d="M12 7.5a4.5 4.5 0 1 0 4.5 4.5A4.5 4.5 0 0 0 12 7.5Z" {...stroke} />
          <Path d="M12 11.4a.6.6 0 1 0 .6.6.6.6 0 0 0-.6-.6Z" fill={color} {...stroke} />
        </>
      ) : null}
      {name === "insights" ? (
        <>
          <Path
            d="M12 3.8a8.2 8.2 0 1 0 8.2 8.2H12V3.8Z"
            fill={focused ? color : "none"}
            fillOpacity={focused ? 0.16 : 0}
            {...stroke}
          />
          <Path d="M15.2 4.6a8.2 8.2 0 0 1 4.2 4.2H15.2V4.6Z" {...stroke} />
        </>
      ) : null}
    </Svg>
  );
}

/** Tab bar icon using SF Symbols on iOS (filled when selected) and matched vector SVGs on Android/Web. */
export function TabIcon({ name, color, size = 21, focused = false }: TabIconProps) {
  const fallback = <TabIconSvg name={name} color={color} size={size} focused={focused} />;
  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={focused ? SF_TAB_FILLED[name] : SF_TAB_OUTLINE[name]}
        tintColor={color}
        size={size}
        weight={focused ? "semibold" : "medium"}
        resizeMode="scaleAspectFit"
        animationSpec={focused ? { effect: { type: "bounce", direction: "up" } } : undefined}
        fallback={fallback}
      />
    );
  }
  return fallback;
}
