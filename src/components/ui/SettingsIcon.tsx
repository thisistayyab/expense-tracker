import { SymbolView, type SFSymbol } from "expo-symbols";
import { Platform } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type SettingsIconName =
  | "globe"
  | "currency"
  | "appearance"
  | "categories"
  | "accounts"
  | "recurring"
  | "export"
  | "download"
  | "upload"
  | "lock"
  | "info"
  | "shield";

const SF_SETTINGS_MAP: Record<SettingsIconName, SFSymbol> = {
  globe: "globe",
  currency: "dollarsign.circle",
  appearance: "circle.lefthalf.filled",
  categories: "square.grid.2x2",
  accounts: "creditcard",
  recurring: "repeat",
  export: "square.and.arrow.up",
  download: "arrow.down.doc",
  upload: "arrow.up.doc",
  lock: "lock.fill",
  info: "info.circle",
  shield: "checkmark.shield",
};

function SettingsIconSvg({
  name,
  color,
  size = 17,
}: {
  name: SettingsIconName;
  color: string;
  size: number;
}) {
  const s = {
    stroke: color,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === "globe" ? (
        <>
          <Circle cx={12} cy={12} r={8.5} {...s} />
          <Path d="M3.8 12h16.4M12 3.5c2.6 2.5 3.8 5.4 3.8 8.5s-1.2 6-3.8 8.5M12 3.5c-2.6 2.5-3.8 5.4-3.8 8.5s1.2 6 3.8 8.5" {...s} />
        </>
      ) : null}
      {name === "currency" ? (
        <>
          <Circle cx={12} cy={12} r={8.5} {...s} />
          <Path d="M12 6.8v10.4M14.6 9.3c0-1.1-1.1-1.9-2.6-1.9s-2.6.8-2.6 1.9c0 2.4 5.2 1.8 5.2 4.6 0 1.2-1.1 2-2.6 2s-2.6-.8-2.6-2" {...s} />
        </>
      ) : null}
      {name === "appearance" ? (
        <>
          <Circle cx={12} cy={12} r={4} {...s} />
          <Path d="M12 3v2.2M12 18.8V21M4.2 12H6.4M17.6 12h2.2M6.5 6.5l1.6 1.6M15.9 15.9l1.6 1.6M17.5 6.5l-1.6 1.6M8.1 15.9l-1.6 1.6" {...s} />
        </>
      ) : null}
      {name === "categories" ? (
        <>
          <Rect x={4} y={4} width={6.8} height={6.8} rx={1.6} {...s} />
          <Rect x={13.2} y={4} width={6.8} height={6.8} rx={1.6} {...s} />
          <Rect x={4} y={13.2} width={6.8} height={6.8} rx={1.6} {...s} />
          <Rect x={13.2} y={13.2} width={6.8} height={6.8} rx={1.6} {...s} />
        </>
      ) : null}
      {name === "accounts" ? (
        <>
          <Rect x={3.5} y={6} width={17} height={12} rx={2.2} {...s} />
          <Path d="M3.5 10.2h17M7.2 14.8h3.6" {...s} />
        </>
      ) : null}
      {name === "recurring" ? (
        <>
          <Path d="M17 4.2 20.2 7 17 9.8M4.2 11.2V9.5A2.5 2.5 0 0 1 6.7 7h13.5" {...s} />
          <Path d="M7 19.8 3.8 17 7 14.2M19.8 12.8v1.7a2.5 2.5 0 0 1-2.5 2.5H3.8" {...s} />
        </>
      ) : null}
      {name === "export" ? (
        <>
          <Path d="M12 15.5V4.5M8.2 8.2 12 4.5l3.8 3.7" {...s} />
          <Path d="M5 14v4.2a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8V14" {...s} />
        </>
      ) : null}
      {name === "download" ? (
        <>
          <Path d="M12 4.5v11M8.2 11.8 12 15.5l3.8-3.7" {...s} />
          <Path d="M5 18.8h14" {...s} />
        </>
      ) : null}
      {name === "upload" ? (
        <>
          <Path d="M12 15.5v-11M8.2 8.2 12 4.5l3.8 3.7" {...s} />
          <Path d="M5 18.8h14" {...s} />
        </>
      ) : null}
      {name === "lock" ? (
        <>
          <Rect x={5.2} y={10.5} width={13.6} height={9.5} rx={2.2} {...s} />
          <Path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" {...s} />
        </>
      ) : null}
      {name === "info" ? (
        <>
          <Circle cx={12} cy={12} r={8.5} {...s} />
          <Path d="M12 11v5.2M12 8.2h.01" {...s} />
        </>
      ) : null}
      {name === "shield" ? (
        <>
          <Path d="M12 3.5 5 6.4v5.2c0 4.4 2.9 7.8 7 9.1 4.1-1.3 7-4.7 7-9.1V6.4l-7-2.9Z" {...s} />
          <Path d="m9.2 12 2 2 3.8-4" {...s} />
        </>
      ) : null}
    </Svg>
  );
}

export function SettingsIcon({
  name,
  color,
  size = 18,
}: {
  name: SettingsIconName;
  color: string;
  size?: number;
}) {
  const fallback = <SettingsIconSvg name={name} color={color} size={size} />;
  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={SF_SETTINGS_MAP[name]}
        tintColor={color}
        size={size}
        weight="semibold"
        resizeMode="scaleAspectFit"
        fallback={fallback}
      />
    );
  }
  return fallback;
}
