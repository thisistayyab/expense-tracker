import type { TextStyle } from "react-native";

/**
 * Design tokens — mirrors blueprints/04-design-system.md.
 * Feature code must never hard-code a hex value; read these through `useTheme()`.
 */

export type ColorTokens = {
  bg: string;
  surface: string;
  surfaceMuted: string;
  surfaceSunken: string;
  ink: string;
  solid: string;
  solidFg: string;
  border: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentAlt: string;
  accentSoft: string;
  accentFg: string;
  income: string;
  expense: string;
  warning: string;
  danger: string;
  transfer: string;
  onInk: string;
  onInkMuted: string;
  inkTrack: string;
  scrim: string;
  tabBar: string;
  homeBar: string;
  insightFrom: string;
  insightTo: string;
};

export type ToneName = "iris" | "mint" | "amber" | "coral" | "sky" | "slate";

export type Tone = { background: string; foreground: string };

const lightColors: ColorTokens = {
  bg: "#F4F4F1",
  surface: "#FFFFFF",
  surfaceMuted: "#F2F2EF",
  surfaceSunken: "#EDEDE9",
  ink: "#121317",
  solid: "#121317",
  solidFg: "#FFFFFF",
  border: "#EDEDE7",
  cardBorder: "transparent",
  textPrimary: "#0F1115",
  textSecondary: "#6C727B",
  textTertiary: "#9AA0A8",
  accent: "#5B5BF7",
  accentAlt: "#8E6BF6",
  accentSoft: "#EEEEFE",
  accentFg: "#FFFFFF",
  income: "#12A150",
  expense: "#F0503F",
  warning: "#DE9A24",
  danger: "#F0503F",
  transfer: "#7C6BF0",
  onInk: "#FFFFFF",
  onInkMuted: "rgba(255,255,255,.6)",
  inkTrack: "rgba(255,255,255,.14)",
  scrim: "rgba(0,0,0,.4)",
  tabBar: "rgba(255,255,255,.9)",
  homeBar: "#0F1115",
  insightFrom: "#F2F1FE",
  insightTo: "#FBF5FF",
};

const darkColors: ColorTokens = {
  bg: "#0B0C10",
  surface: "#15171C",
  surfaceMuted: "#1C1F25",
  surfaceSunken: "#23262D",
  ink: "#1A1C22",
  solid: "#F5F5F3",
  solidFg: "#0B0C10",
  border: "#262A31",
  cardBorder: "rgba(255,255,255,.055)",
  textPrimary: "#F5F5F3",
  textSecondary: "#A2A8B2",
  textTertiary: "#6E747D",
  accent: "#8B8BFF",
  accentAlt: "#B49BFF",
  accentSoft: "#1E1E3A",
  accentFg: "#0B0C10",
  income: "#3ECF7C",
  expense: "#FF7A6B",
  warning: "#F2B94B",
  danger: "#FF7A6B",
  transfer: "#A494FF",
  onInk: "#F5F5F3",
  onInkMuted: "rgba(255,255,255,.55)",
  inkTrack: "rgba(255,255,255,.1)",
  scrim: "rgba(0,0,0,.6)",
  tabBar: "rgba(21,23,28,.92)",
  homeBar: "#F5F5F3",
  insightFrom: "#191A2C",
  insightTo: "#221B2E",
};

const lightTones: Record<ToneName, Tone> = {
  iris: { background: "#EDECFE", foreground: "#5145D8" },
  mint: { background: "#E5F6EC", foreground: "#0E8A46" },
  amber: { background: "#FCF0DC", foreground: "#B57612" },
  coral: { background: "#FDE9E5", foreground: "#D8402E" },
  sky: { background: "#E6F1FD", foreground: "#2A6FC4" },
  slate: { background: "#EDEDE9", foreground: "#5C626B" },
};

const darkTones: Record<ToneName, Tone> = {
  iris: { background: "#242245", foreground: "#C3B8FF" },
  mint: { background: "#122A1D", foreground: "#57D392" },
  amber: { background: "#2E2411", foreground: "#F0BE63" },
  coral: { background: "#301A16", foreground: "#FF9586" },
  sky: { background: "#142234", foreground: "#7FB6F0" },
  slate: { background: "#22252C", foreground: "#A9AFB9" },
};

/** Category accent ramp — assigned on create, editable (04). */
export const categoryRamp = [
  "#5B5BF7",
  "#12A150",
  "#DE9A24",
  "#F0503F",
  "#2A6FC4",
  "#8E6BF6",
  "#0E8A8A",
  "#B5765A",
] as const;

const FONT = "Geist";

/**
 * Type scale. Geist needs less negative tracking than SF did; every size here is
 * tuned for this face. Amounts additionally set `fontVariant: ["tabular-nums"]`.
 */
const textScale = {
  hero: {
    fontFamily: FONT,
    fontSize: 52,
    lineHeight: 54,
    fontWeight: "700",
    letterSpacing: -1.8,
  },
  display: {
    fontFamily: FONT,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: "700",
    letterSpacing: -1.5,
  },
  amountXL: {
    fontFamily: FONT,
    fontSize: 54,
    lineHeight: 58,
    fontWeight: "700",
    letterSpacing: -2.2,
  },
  total: {
    fontFamily: FONT,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    letterSpacing: -1.3,
  },
  title1: {
    fontFamily: FONT,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -0.9,
  },
  title2: {
    fontFamily: FONT,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  title3: {
    fontFamily: FONT,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  body: {
    fontFamily: FONT,
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: "400",
    letterSpacing: -0.2,
  },
  bodyStrong: {
    fontFamily: FONT,
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  label: {
    fontFamily: FONT,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  eyebrow: {
    fontFamily: FONT,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  caption: {
    fontFamily: FONT,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    letterSpacing: 0,
  },
} satisfies Record<string, TextStyle>;

export type TextToken = keyof typeof textScale;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  tile: 14,
  chip: 17,
  input: 18,
  card: 24,
  hero: 28,
  sheet: 32,
  pill: 999,
} as const;

export type Shadow = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
};

const lightShadows = {
  card: {
    shadowColor: "#101217",
    shadowOpacity: 0.07,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  lift: {
    shadowColor: "#101217",
    shadowOpacity: 0.13,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
  fab: {
    shadowColor: "#5B5BF7",
    shadowOpacity: 0.42,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
} satisfies Record<string, Shadow>;

const darkShadows = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  lift: {
    shadowColor: "#000000",
    shadowOpacity: 0.55,
    shadowRadius: 48,
    shadowOffset: { width: 0, height: 22 },
    elevation: 8,
  },
  fab: {
    shadowColor: "#000000",
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
} satisfies Record<string, Shadow>;

export const motion = {
  chip: 140,
  pill: 220,
  sheet: 280,
  progress: 420,
  countUp: 600,
  snackbar: 4000,
} as const;

export type Theme = {
  scheme: "light" | "dark";
  colors: ColorTokens;
  tones: Record<ToneName, Tone>;
  text: Record<TextToken, TextStyle>;
  space: typeof space;
  radius: typeof radius;
  shadow: typeof lightShadows;
  motion: typeof motion;
};

export const lightTheme: Theme = {
  scheme: "light",
  colors: lightColors,
  tones: lightTones,
  text: textScale,
  space,
  radius,
  shadow: lightShadows,
  motion,
};

export const darkTheme: Theme = {
  scheme: "dark",
  colors: darkColors,
  tones: darkTones,
  text: textScale,
  space,
  radius,
  shadow: darkShadows,
  motion,
};
