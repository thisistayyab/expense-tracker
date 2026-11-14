import Svg, { Circle, Path, Rect } from "react-native-svg";

export type CategoryIconName =
  | "utensils"
  | "cart"
  | "car"
  | "home"
  | "bag"
  | "receipt"
  | "heart"
  | "sparkles"
  | "book"
  | "plane"
  | "gift"
  | "wallet"
  | "briefcase"
  | "ellipsis"
  | "plus"
  | "transfer";

export type CategoryIconProps = {
  name: string | null | undefined;
  color: string;
  size?: number;
};

const stroke = (color: string) => ({
  stroke: color,
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/** One hand-drawn set replaces the emoji map, so category tiles stay monochrome. */
export function CategoryIcon({ name, color, size = 20 }: CategoryIconProps) {
  const s = stroke(color);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === "utensils" ? (
        <>
          <Path d="M7 3.5v7.2M4.6 3.5v4.2c0 1.4 1 2.4 2.4 2.4s2.4-1 2.4-2.4V3.5M7 13.5v7" {...s} />
          <Path d="M16.4 20.5v-7.2M16.4 13.3c1.9 0 3.1-1.4 3.1-3.4 0-2.2-1.1-3.9-3.1-3.9v7.3Z" {...s} />
        </>
      ) : null}

      {name === "cart" ? (
        <>
          <Path d="M3.2 4.2h2l2.1 9.6h10.4l2-6.7H6.1" {...s} />
          <Circle cx="9.2" cy="18.2" r="1.5" {...s} />
          <Circle cx="17.4" cy="18.2" r="1.5" {...s} />
        </>
      ) : null}

      {name === "car" ? (
        <>
          <Path d="M4.2 15.8v2h2.1v-2M17.7 15.8v2h2.1v-2" {...s} />
          <Path d="M3.6 15.8h16.8v-2.6c0-.6-.3-1.1-.8-1.4l-1.4-.7-1.6-3.2c-.2-.5-.8-.8-1.3-.8H8.7c-.5 0-1.1.3-1.3.8L5.8 11l-1.4.7c-.5.3-.8.8-.8 1.4v2.7Z" {...s} />
          <Path d="M6.6 11.1h10.8" {...s} />
        </>
      ) : null}

      {name === "home" ? (
        <>
          <Path d="M3.6 10.6 12 3.5l8.4 7.1" {...s} />
          <Path d="M6 9.4v10.1h12V9.4M10 19.5v-5.2h4v5.2" {...s} />
        </>
      ) : null}

      {name === "bag" ? (
        <>
          <Path d="M5.4 8.2h13.2l-1 12.1H6.4l-1-12.1Z" {...s} />
          <Path d="M9 8.2V6.6a3 3 0 0 1 6 0v1.6" {...s} />
        </>
      ) : null}

      {name === "receipt" ? (
        <>
          <Path d="M6 3.6h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4v-17Z" {...s} />
          <Path d="M9 8.2h6M9 11.8h6M9 15.4h3.4" {...s} />
        </>
      ) : null}

      {name === "heart" ? (
        <Path d="M12 20s-7.4-4.4-7.4-9.3A4.1 4.1 0 0 1 12 8.1a4.1 4.1 0 0 1 7.4 2.6C19.4 15.6 12 20 12 20Z" {...s} />
      ) : null}

      {name === "sparkles" ? (
        <>
          <Path d="M11 3.4 12.7 8l4.6 1.7-4.6 1.7L11 16l-1.7-4.6L4.7 9.7 9.3 8 11 3.4Z" {...s} />
          <Path d="M17.8 14.4l.9 2.4 2.3.9-2.3.9-.9 2.4-.9-2.4-2.3-.9 2.3-.9.9-2.4Z" {...s} />
        </>
      ) : null}

      {name === "book" ? (
        <>
          <Path d="M12 6.4C10.4 5.2 8.2 4.7 4.4 4.7v13.6c3.8 0 6 .5 7.6 1.7 1.6-1.2 3.8-1.7 7.6-1.7V4.7c-3.8 0-6 .5-7.6 1.7Z" {...s} />
          <Path d="M12 6.4v13.6" {...s} />
        </>
      ) : null}

      {name === "plane" ? (
        <Path d="M20.4 3.6 3.9 10.2l6 2.3 2.3 6 3.4-4.2 4.8-10.7ZM9.9 12.5l10.5-8.9" {...s} />
      ) : null}

      {name === "gift" ? (
        <>
          <Rect x="4" y="9.4" width="16" height="11" rx="1.8" {...s} />
          <Path d="M4 13.6h16M12 9.4v11" {...s} />
          <Path d="M12 9.4C11.2 6.4 9.6 4.6 7.7 4.6a2.2 2.2 0 0 0 0 4.4h4.3M12 9.4c.8-3 2.4-4.8 4.3-4.8a2.2 2.2 0 0 1 0 4.4H12" {...s} />
        </>
      ) : null}

      {name === "wallet" ? (
        <>
          <Rect x="3.4" y="6.4" width="17.2" height="12.2" rx="3" {...s} />
          <Path d="M3.4 10.4h17.2" {...s} />
          <Circle cx="16.8" cy="14.5" r="1.1" fill={color} />
        </>
      ) : null}

      {name === "briefcase" ? (
        <>
          <Rect x="3.4" y="7.4" width="17.2" height="11.8" rx="2.4" {...s} />
          <Path d="M9 7.4V5.9c0-.8.6-1.4 1.4-1.4h3.2c.8 0 1.4.6 1.4 1.4v1.5M3.4 12.6h17.2" {...s} />
        </>
      ) : null}

      {name === "ellipsis" ? (
        <>
          <Circle cx="6" cy="12" r="1.2" fill={color} />
          <Circle cx="12" cy="12" r="1.2" fill={color} />
          <Circle cx="18" cy="12" r="1.2" fill={color} />
        </>
      ) : null}

      {name === "plus" ? <Path d="M12 5v14M5 12h14" {...s} /> : null}

      {name === "transfer" ? (
        <>
          <Path d="M4.5 8.5h12.4M14 5.7l2.9 2.8-2.9 2.8" {...s} />
          <Path d="M19.5 15.5H7.1M10 12.7l-2.9 2.8 2.9 2.8" {...s} />
        </>
      ) : null}

      {name == null || !CATEGORY_NAMES.has(name) ? (
        <Circle cx="12" cy="12" r="3.2" {...s} />
      ) : null}
    </Svg>
  );
}

const CATEGORY_NAMES = new Set<string>([
  "utensils",
  "cart",
  "car",
  "home",
  "bag",
  "receipt",
  "heart",
  "sparkles",
  "book",
  "plane",
  "gift",
  "wallet",
  "briefcase",
  "ellipsis",
  "plus",
  "transfer",
]);
