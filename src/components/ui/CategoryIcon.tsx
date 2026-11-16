import { SymbolView, type SFSymbol } from "expo-symbols";
import { Platform } from "react-native";
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

const SF_CATEGORY_MAP: Record<CategoryIconName, SFSymbol> = {
  utensils: "fork.knife",
  cart: "cart",
  car: "car",
  home: "house",
  bag: "bag",
  receipt: "doc.text",
  heart: "heart",
  sparkles: "sparkles",
  book: "book",
  plane: "airplane",
  gift: "gift",
  wallet: "wallet.bifold",
  briefcase: "briefcase",
  ellipsis: "ellipsis",
  plus: "plus",
  transfer: "arrow.left.arrow.right",
};

const stroke = (color: string) => ({
  stroke: color,
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

function CategoryIconSvg({ name, color, size = 20 }: CategoryIconProps) {
  const s = stroke(color);
  const key = (name && name in SF_CATEGORY_MAP ? name : "ellipsis") as CategoryIconName;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {key === "utensils" ? (
        <>
          <Path d="M7 3.5v7.2M4.6 3.5v4.2c0 1.4 1 2.4 2.4 2.4s2.4-1 2.4-2.4V3.5M7 13.5v7" {...s} />
          <Path d="M16.4 20.5v-7.2M16.4 13.3c1.9 0 3.1-1.4 3.1-3.4 0-2.2-1.1-3.9-3.1-3.9v7.3Z" {...s} />
        </>
      ) : null}
      {key === "cart" ? (
        <>
          <Path d="M3.5 5h2.4l2.1 10h9.8l2-7.2H6.8" {...s} />
          <Circle cx={9.5} cy={19} r={1.3} fill={color} />
          <Circle cx={16.5} cy={19} r={1.3} fill={color} />
        </>
      ) : null}
      {key === "car" ? (
        <>
          <Path d="M4.5 13 6 7.5c.3-.9 1.1-1.5 2-1.5h8c.9 0 1.7.6 2 1.5L19.5 13" {...s} />
          <Rect x={3.5} y={13} width={17} height={4.8} rx={1.6} {...s} />
          <Path d="M6.5 17.8v1.6M17.5 17.8v1.6" {...s} />
          <Circle cx={7.2} cy={15.4} r={1} fill={color} />
          <Circle cx={16.8} cy={15.4} r={1} fill={color} />
        </>
      ) : null}
      {key === "home" ? (
        <>
          <Path d="M3.5 10.6 12 3.6l8.5 7" {...s} />
          <Path d="M6 9.6v9.8a1.1 1.1 0 0 0 1.1 1.1h9.8a1.1 1.1 0 0 0 1.1-1.1V9.6" {...s} />
          <Path d="M10 20.5v-5.2h4v5.2" {...s} />
        </>
      ) : null}
      {key === "bag" ? (
        <>
          <Path d="M5.2 8.5h13.6l1.1 11.4a1.1 1.1 0 0 1-1.1 1.1H5.2a1.1 1.1 0 0 1-1.1-1.1L5.2 8.5Z" {...s} />
          <Path d="M8.8 8.5V7a3.2 3.2 0 0 1 6.4 0v1.5" {...s} />
        </>
      ) : null}
      {key === "receipt" ? (
        <>
          <Path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4v-17Z" {...s} />
          <Path d="M9.2 8.5h5.6M9.2 12.2h5.6M9.2 15.8h3.4" {...s} />
        </>
      ) : null}
      {key === "heart" ? (
        <Path
          d="M12 20.2S4.5 15.2 4.5 9.6a4.1 4.1 0 0 1 7.5-2.3 4.1 4.1 0 0 1 7.5 2.3c0 5.6-7.5 10.6-7.5 10.6Z"
          {...s}
        />
      ) : null}
      {key === "sparkles" ? (
        <>
          <Path d="m12 3.5 1.8 5.2 5.2 1.8-5.2 1.8-1.8 5.2-1.8-5.2L5 10.5l5.2-1.8L12 3.5Z" {...s} />
          <Path d="m18.2 15.5.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" {...s} />
        </>
      ) : null}
      {key === "book" ? (
        <>
          <Path d="M12 6.5c-2.2-1.6-4.8-2-7.8-1.3v13.3c3-.7 5.6-.3 7.8 1.3" {...s} />
          <Path d="M12 6.5c2.2-1.6 4.8-2 7.8-1.3v13.3c-3-.7-5.6-.3-7.8 1.3V6.5Z" {...s} />
        </>
      ) : null}
      {key === "plane" ? (
        <Path d="m12 3.5 2 6 6.5 2.5v2l-6.5-1.2V18l2.5 1.8v1.2L12 20l-4.5 1v-1.2L10 18v-5.2L3.5 14v-2L10 9.5l2-6Z" {...s} />
      ) : null}
      {key === "gift" ? (
        <>
          <Rect x={3.8} y={8.8} width={16.4} height={3.5} rx={0.9} {...s} />
          <Path d="M5.5 12.3v8.2h13v-8.2M12 8.8v11.7" {...s} />
          <Path d="M12 8.8c0-2-1.1-3.8-2.8-3.8S6.6 6.5 7.4 7.7C8 8.6 9.8 8.8 12 8.8Zm0 0c0-2 1.1-3.8 2.8-3.8s2.6 1.5 1.8 2.7c-.6.9-2.4 1.1-4.6 1.1Z" {...s} />
        </>
      ) : null}
      {key === "wallet" ? (
        <>
          <Rect x={3.5} y={6} width={17} height={12.5} rx={2.6} {...s} />
          <Path d="M14.5 12.2h6" {...s} />
          <Circle cx={16.5} cy={12.2} r={0.8} fill={color} />
        </>
      ) : null}
      {key === "briefcase" ? (
        <>
          <Rect x={3.8} y={7.6} width={16.4} height={12} rx={2.2} {...s} />
          <Path d="M8.8 7.6V5.8A1.3 1.3 0 0 1 10.1 4.5h3.8a1.3 1.3 0 0 1 1.3 1.3v1.8M3.8 12.6h16.4" {...s} />
        </>
      ) : null}
      {key === "plus" ? <Path d="M12 5v14M5 12h14" {...s} /> : null}
      {key === "transfer" ? (
        <>
          <Path d="M16.5 7.5H5.5M9 4 5.5 7.5 9 11" {...s} />
          <Path d="M7.5 16.5h11M15 13l3.5 3.5L15 20" {...s} />
        </>
      ) : null}
      {key === "ellipsis" ? (
        <>
          <Circle cx={6.2} cy={12} r={1.4} fill={color} />
          <Circle cx={12} cy={12} r={1.4} fill={color} />
          <Circle cx={17.8} cy={12} r={1.4} fill={color} />
        </>
      ) : null}
    </Svg>
  );
}

/** Category glyph: SF Symbol on iOS, uniform vector stroke elsewhere. */
export function CategoryIcon({ name, color, size = 20 }: CategoryIconProps) {
  const fallback = <CategoryIconSvg name={name} color={color} size={size} />;
  if (Platform.OS === "ios" && name && name in SF_CATEGORY_MAP) {
    return (
      <SymbolView
        name={SF_CATEGORY_MAP[name as CategoryIconName]}
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
