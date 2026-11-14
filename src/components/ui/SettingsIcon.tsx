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

export function SettingsIcon({
  name,
  color,
  size = 17,
}: {
  name: SettingsIconName;
  color: string;
  size?: number;
}) {
  const s = {
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === "globe" ? (
        <>
          <Circle cx="12" cy="12" r="8.2" {...s} />
          <Path d="M3.8 12h16.4M12 3.8c2.2 2.3 3.3 5.1 3.3 8.2S14.2 17.9 12 20.2c-2.2-2.3-3.3-5.1-3.3-8.2S9.8 6.1 12 3.8Z" {...s} />
        </>
      ) : null}

      {name === "currency" ? (
        <>
          <Circle cx="12" cy="12" r="8.2" {...s} />
          <Path d="M12 6.6v10.8M14.9 9c0-1.2-1.2-2-2.9-2s-2.9.8-2.9 2 1.1 1.7 2.9 2 2.9.9 2.9 2.2-1.2 2.2-2.9 2.2-2.9-.8-2.9-2" {...s} />
        </>
      ) : null}

      {name === "appearance" ? (
        <>
          <Circle cx="12" cy="12" r="8.2" {...s} />
          <Path d="M12 3.8a8.2 8.2 0 0 1 0 16.4V3.8Z" fill={color} stroke="none" opacity={0.55} />
        </>
      ) : null}

      {name === "categories" ? (
        <>
          <Rect x="4" y="4" width="6.4" height="6.4" rx="1.8" {...s} />
          <Rect x="13.6" y="4" width="6.4" height="6.4" rx="1.8" {...s} />
          <Rect x="4" y="13.6" width="6.4" height="6.4" rx="1.8" {...s} />
          <Rect x="13.6" y="13.6" width="6.4" height="6.4" rx="1.8" {...s} />
        </>
      ) : null}

      {name === "accounts" ? (
        <>
          <Rect x="3.4" y="6" width="17.2" height="11.4" rx="2.6" {...s} />
          <Path d="M3.4 10.2h17.2M15.8 14.4h1.6" {...s} />
        </>
      ) : null}

      {name === "recurring" ? (
        <>
          <Path d="M20 12a8 8 0 1 1-2.5-5.8" {...s} />
          <Path d="M20.2 3.4v4.4h-4.4" {...s} />
        </>
      ) : null}

      {name === "export" ? (
        <>
          <Path d="M14 4h6v6M20 4l-8.2 8.2" {...s} />
          <Path d="M18 14.6v4a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 18.6V8.2A1.8 1.8 0 0 1 5.8 6.4h4" {...s} />
        </>
      ) : null}

      {name === "download" ? (
        <>
          <Path d="M12 4v10.4M8 10.7l4 3.7 4-3.7" {...s} />
          <Path d="M4.4 17.8v1.6c0 .9.7 1.6 1.6 1.6h12c.9 0 1.6-.7 1.6-1.6v-1.6" {...s} />
        </>
      ) : null}

      {name === "upload" ? (
        <>
          <Path d="M12 15V4.6M8 8.3l4-3.7 4 3.7" {...s} />
          <Path d="M4.4 17.8v1.6c0 .9.7 1.6 1.6 1.6h12c.9 0 1.6-.7 1.6-1.6v-1.6" {...s} />
        </>
      ) : null}

      {name === "lock" ? (
        <>
          <Rect x="4.6" y="10.4" width="14.8" height="9.6" rx="2.6" {...s} />
          <Path d="M8.2 10.4V8a3.8 3.8 0 0 1 7.6 0v2.4" {...s} />
          <Circle cx="12" cy="15.2" r="1.1" fill={color} />
        </>
      ) : null}

      {name === "info" ? (
        <>
          <Circle cx="12" cy="12" r="8.2" {...s} />
          <Path d="M12 10.8v5.4" {...s} />
          <Circle cx="12" cy="7.9" r="0.9" fill={color} />
        </>
      ) : null}

      {name === "shield" ? (
        <>
          <Path d="M12 3.4 19 6v5.4c0 4-2.8 7.4-7 9.2-4.2-1.8-7-5.2-7-9.2V6l7-2.6Z" {...s} />
          <Path d="m8.8 12 2.2 2.2 4.2-4.2" {...s} />
        </>
      ) : null}
    </Svg>
  );
}
