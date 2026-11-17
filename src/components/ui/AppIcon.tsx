import { SymbolView, type SFSymbol } from "expo-symbols";
import { Platform } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type AppIconName =
  | "settings"
  | "plus"
  | "search"
  | "close"
  | "chevronDown"
  | "chevronLeft"
  | "chevronRight"
  | "check"
  | "checkmarkCircle"
  | "transfer"
  | "arrowUp"
  | "arrowDown"
  | "sparkles"
  | "repeat"
  | "trash"
  | "calendar"
  | "sliders"
  | "lock"
  | "faceid"
  | "shield"
  | "chart"
  | "banknote"
  | "creditcard"
  | "wallet"
  | "building"
  | "diamond"
  | "exclamation"
  | "share";

export type AppIconProps = {
  name: AppIconName;
  color: string;
  size?: number;
  weight?: "regular" | "medium" | "semibold" | "bold";
};

const WALLET_SYMBOL: SFSymbol =
  Platform.OS === "ios" && parseFloat(String(Platform.Version)) >= 18
    ? "wallet.bifold"
    : "wallet.pass";

const SF_MAP: Record<AppIconName, SFSymbol> = {
  settings: "gearshape",
  plus: "plus",
  search: "magnifyingglass",
  close: "xmark",
  chevronDown: "chevron.down",
  chevronLeft: "chevron.left",
  chevronRight: "chevron.right",
  check: "checkmark",
  checkmarkCircle: "checkmark.circle.fill",
  transfer: "arrow.left.arrow.right",
  arrowUp: "arrow.up",
  arrowDown: "arrow.down",
  sparkles: "sparkles",
  repeat: "repeat",
  trash: "trash",
  calendar: "calendar",
  sliders: "slider.horizontal.3",
  lock: "lock.fill",
  faceid: "faceid",
  shield: "checkmark.shield",
  chart: "chart.xyaxis.line",
  banknote: "banknote",
  creditcard: "creditcard",
  wallet: WALLET_SYMBOL,
  building: "building.columns",
  diamond: "diamond",
  exclamation: "exclamationmark.triangle",
  share: "square.and.arrow.up",
};

function AppIconSvg({ name, color, size = 20 }: { name: AppIconName; color: string; size: number }) {
  const stroke = {
    stroke: color,
    strokeWidth: 1.85,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === "settings" ? (
        <>
          <Circle cx={12} cy={12} r={3.2} {...stroke} />
          <Path
            d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 0 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a1.9 1.9 0 0 1-3.8 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a1.9 1.9 0 0 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a1.9 1.9 0 0 1 0-3.8h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a1.9 1.9 0 0 1 3.8 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a1.9 1.9 0 0 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a1.9 1.9 0 0 1 0 3.8h-.1a1.6 1.6 0 0 0-1.5 1Z"
            {...stroke}
          />
        </>
      ) : null}
      {name === "plus" ? <Path d="M12 5v14M5 12h14" {...stroke} /> : null}
      {name === "search" ? (
        <>
          <Circle cx={10.8} cy={10.8} r={6.3} {...stroke} />
          <Path d="m15.6 15.6 4.4 4.4" {...stroke} />
        </>
      ) : null}
      {name === "close" ? <Path d="m6.5 6.5 11 11M17.5 6.5l-11 11" {...stroke} /> : null}
      {name === "chevronDown" ? <Path d="m6.5 9.5 5.5 5.5 5.5-5.5" {...stroke} /> : null}
      {name === "chevronLeft" ? <Path d="m14.8 6.5-5.5 5.5 5.5 5.5" {...stroke} /> : null}
      {name === "chevronRight" ? <Path d="m9.2 6.5 5.5 5.5-5.5 5.5" {...stroke} /> : null}
      {name === "check" ? <Path d="m5.5 12.4 4.2 4.3 8.8-9.2" {...stroke} /> : null}
      {name === "checkmarkCircle" ? (
        <>
          <Circle cx={12} cy={12} r={8.8} fill={color} opacity={0.18} stroke={color} strokeWidth={1.6} />
          <Path d="m8.2 12.2 2.7 2.7 5-5.4" {...stroke} />
        </>
      ) : null}
      {name === "transfer" ? (
        <>
          <Path d="M16.5 7.5H5.5M9.2 4l-3.7 3.5L9.2 11" {...stroke} />
          <Path d="M7.5 16.5h11M14.8 13l3.7 3.5-3.7 3.5" {...stroke} />
        </>
      ) : null}
      {name === "arrowUp" ? <Path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" {...stroke} /> : null}
      {name === "arrowDown" ? <Path d="M12 5v14M6.5 13.5 12 19l5.5-5.5" {...stroke} /> : null}
      {name === "sparkles" ? (
        <>
          <Path d="m12 3.2 1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8 1.8-5Z" {...stroke} />
          <Path d="m18.5 15.2.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" {...stroke} />
        </>
      ) : null}
      {name === "repeat" ? (
        <>
          <Path d="M17 3.5 20.5 7 17 10.5M4 11V9a2 2 0 0 1 2-2h14.5" {...stroke} />
          <Path d="M7 20.5 3.5 17 7 13.5M20 13v2a2 2 0 0 1-2 2H3.5" {...stroke} />
        </>
      ) : null}
      {name === "trash" ? (
        <>
          <Path d="M4.5 7h15M9.5 7V4.5h5V7M7.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h4.4a1.5 1.5 0 0 0 1.5-1.3L16.5 7" {...stroke} />
        </>
      ) : null}
      {name === "calendar" ? (
        <>
          <Rect x={3.8} y={5.2} width={16.4} height={15} rx={3} {...stroke} />
          <Path d="M3.8 10h16.4M8.5 3.2v3.5M15.5 3.2v3.5" {...stroke} />
        </>
      ) : null}
      {name === "sliders" ? (
        <>
          <Path d="M4 7h16M4 12h16M4 17h16" {...stroke} />
          <Circle cx={9} cy={7} r={2} fill={color} />
          <Circle cx={15} cy={12} r={2} fill={color} />
          <Circle cx={10} cy={17} r={2} fill={color} />
        </>
      ) : null}
      {name === "lock" ? (
        <>
          <Rect x={5} y={10.5} width={14} height={10} rx={2.5} {...stroke} />
          <Path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" {...stroke} />
        </>
      ) : null}
      {name === "faceid" ? (
        <>
          <Path d="M4 8V5.8A1.8 1.8 0 0 1 5.8 4H8M16 4h2.2A1.8 1.8 0 0 1 20 5.8V8M20 16v2.2a1.8 1.8 0 0 1-1.8 1.8H16M8 20H5.8A1.8 1.8 0 0 1 4 18.2V16" {...stroke} />
          <Path d="M9 9.5v1.5M15 9.5v1.5M12 9.5v3.2h-1M9 15.2c1 1 2 1.3 3 1.3s2-.3 3-1.3" {...stroke} />
        </>
      ) : null}
      {name === "shield" ? (
        <>
          <Path d="M12 3.2 5 6.2v5.4c0 4.5 3 8.1 7 9.4 4-1.3 7-4.9 7-9.4V6.2l-7-3Z" {...stroke} />
          <Path d="m9.2 12 2 2 3.8-4" {...stroke} />
        </>
      ) : null}
      {name === "chart" ? (
        <>
          <Path d="M4 19h16M5.5 15.5l4.2-4.2 3.5 2.5 5.3-6.8" {...stroke} />
          <Path d="M15.5 7h3v3" {...stroke} />
        </>
      ) : null}
      {name === "banknote" ? (
        <>
          <Rect x={3.2} y={6.2} width={17.6} height={11.6} rx={2.5} {...stroke} />
          <Circle cx={12} cy={12} r={2.6} {...stroke} />
          <Path d="M6.2 9.5v5M17.8 9.5v5" {...stroke} />
        </>
      ) : null}
      {name === "creditcard" ? (
        <>
          <Rect x={3.2} y={5.5} width={17.6} height={13} rx={2.5} {...stroke} />
          <Path d="M3.2 10h17.6M7 14.8h4" {...stroke} />
        </>
      ) : null}
      {name === "wallet" ? (
        <>
          <Rect x={3.5} y={5.5} width={17} height={13} rx={2.8} {...stroke} />
          <Path d="M14.5 12h6M16.5 12a1 1 0 1 0 0 .1" {...stroke} />
        </>
      ) : null}
      {name === "building" ? (
        <>
          <Path d="M3.5 9.5 12 4l8.5 5.5H3.5ZM5.5 19.5h13M7 10v9M12 10v9M17 10v9" {...stroke} />
        </>
      ) : null}
      {name === "diamond" ? (
        <>
          <Path d="M6.5 4.8h11l3 4.7-8.5 10.2L3.5 9.5l3-4.7ZM3.5 9.5h17M12 19.7 9 9.5l3-4.7 3 4.7-3 10.2Z" {...stroke} />
        </>
      ) : null}
      {name === "exclamation" ? (
        <>
          <Path d="M12 4.2 3.4 18.8a1.2 1.2 0 0 0 1 1.8h15.2a1.2 1.2 0 0 0 1-1.8L12 4.2Z" {...stroke} />
          <Path d="M12 10v4.2M12 17.2h.01" {...stroke} />
        </>
      ) : null}
      {name === "share" ? (
        <>
          <Path d="M12 3.5v11M8.2 7.2 12 3.5l3.8 3.7" {...stroke} />
          <Path d="M5.5 11.8v6.2a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-6.2" {...stroke} />
        </>
      ) : null}
    </Svg>
  );
}

/** Crisp native SF Symbols on iOS paired with unified 24px vector glyphs elsewhere. */
export function AppIcon({ name, color, size = 20, weight = "semibold" }: AppIconProps) {
  const fallback = <AppIconSvg name={name} color={color} size={size} />;
  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={SF_MAP[name]}
        tintColor={color}
        size={size}
        weight={weight}
        resizeMode="scaleAspectFit"
        fallback={fallback}
      />
    );
  }
  return fallback;
}
