import Svg, { Circle, Path } from "react-native-svg";

export type AppIconName =
  | "settings"
  | "plus"
  | "search"
  | "close"
  | "chevronDown"
  | "chevronLeft"
  | "chevronRight"
  | "check";

export type AppIconProps = {
  name: AppIconName;
  color: string;
  size?: number;
};

/**
 * The app's small chrome glyphs. One stroke weight and one 24 px grid, so the
 * header buttons and rows share a hand instead of mixing emoji with type.
 */
export function AppIcon({ name, color, size = 20 }: AppIconProps) {
  const stroke = {
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === "settings" ? (
        <>
          <Path d="M4 7h9M17 7h3M4 17h3M11 17h9" {...stroke} />
          <Circle cx="15" cy="7" r="2.4" {...stroke} />
          <Circle cx="9" cy="17" r="2.4" {...stroke} />
        </>
      ) : null}

      {name === "plus" ? <Path d="M12 5v14M5 12h14" {...stroke} /> : null}

      {name === "search" ? (
        <>
          <Circle cx="10.8" cy="10.8" r="6.3" {...stroke} />
          <Path d="m15.5 15.5 4 4" {...stroke} />
        </>
      ) : null}

      {name === "close" ? <Path d="m6.5 6.5 11 11M17.5 6.5l-11 11" {...stroke} /> : null}

      {name === "chevronDown" ? <Path d="m6 9.5 6 6 6-6" {...stroke} /> : null}

      {name === "chevronLeft" ? <Path d="m14.5 6-6 6 6 6" {...stroke} /> : null}

      {name === "chevronRight" ? <Path d="m9.5 6 6 6-6 6" {...stroke} /> : null}

      {name === "check" ? <Path d="m5 12.5 4.5 4.5L19 7" {...stroke} /> : null}
    </Svg>
  );
}
