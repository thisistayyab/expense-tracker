import type { TextStyle } from "react-native";

/**
 * Design tokens — mirrors blueprints/04-design-system.md.
 * Feature code must never hard-code a hex value; read these through `useTheme()`.
 *
 * The system follows the iOS recipe rather than a decorative one: opaque system
 * surfaces for content, translucent material only for bars and sheets, true system
 * colours, and typography sized to its container.
 */

export type ColorTokens = {
  bg: string;
  bgTop: string;
  bgBottom: string;
  surface: string;
  surfaceMuted: string;
  surfaceSunken: string;
  glass: string;
  glassThin: string;
  glassThick: string;
  glassBorder: string;
  ink: string;
  inkDeep: string;
  inkGlow: string;
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
  accentFill: string;
  accentFillAlt: string;
  /** Glass capsule: light edge at the top, deep edge at the bottom, white rim. */
  accentTop: string;
  accentBottom: string;
  accentRim: string;
  specular: string;
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
  sheet: string;
  bloom1: string;
  bloom2: string;
  bloom3: string;
};

export type ToneName = "iris" | "mint" | "amber" | "coral" | "sky" | "slate";

export type Tone = { background: string; foreground: string };

/** iOS system colours, light. */
const lightColors: ColorTokens = {
  // Warm paper, not grey. The canvas carries a faint vertical gradient so the page
  // has a light source; the cards are warmer still, which is what stops a white
  // card on a white screen from looking like a template.
  bg: "#F3EEE2",
  bgTop: "#F7F3E9",
  bgBottom: "#EDE6D6",
  // Cards are pure white against the paper canvas. The earlier warm off-white
  // surface sat so close to the background that the page read as one flat wash;
  // the contrast between paper and white is what makes a card look placed.
  surface: "#FFFFFF",
  surfaceMuted: "#F3EEE2",
  surfaceSunken: "#E9E2D1",
  glass: "rgba(255,253,248,0.86)",
  glassThin: "rgba(255,253,248,0.54)",
  glassThick: "#FFFFFF",
  glassBorder: "rgba(20,23,19,0.10)",
  ink: "#151A16",
  inkDeep: "#0D120F",
  inkGlow: "transparent",
  solid: "#151A16",
  solidFg: "#FFFDF8",
  border: "#E3DCCB",
  cardBorder: "rgba(20,23,19,0.09)",
  textPrimary: "#121613",
  textSecondary: "#5B615A",
  textTertiary: "#8B9088",
  accent: "#17614A",
  accentAlt: "#2E8A66",
  accentSoft: "#E2EFE7",
  accentFg: "#FFFFFF",
  accentFill: "#17614A",
  accentFillAlt: "#2E8A66",
  accentTop: "#2F8C69",
  accentBottom: "#114E39",
  accentRim: "rgba(255,255,255,0.26)",
  specular: "rgba(255,255,255,0.34)",
  income: "#16704F",
  expense: "#BC4B2E",
  warning: "#B0781F",
  danger: "#BC4B2E",
  transfer: "#8C5A8F",
  onInk: "#FFFDF8",
  onInkMuted: "rgba(255,253,248,0.72)",
  inkTrack: "rgba(255,255,255,0.16)",
  scrim: "rgba(13,18,15,0.45)",
  tabBar: "rgba(255,253,248,0.92)",
  homeBar: "#121613",
  insightFrom: "#EAF2EA",
  insightTo: "#F7F2E6",
  sheet: "#FFFFFF",
  bloom1: "transparent",
  bloom2: "transparent",
  bloom3: "transparent",
};

/** iOS system colours, dark. */
const darkColors: ColorTokens = {
  bg: "#0B0E0C",
  bgTop: "#0E1310",
  bgBottom: "#080B09",
  surface: "#141913",
  surfaceMuted: "#1A201A",
  surfaceSunken: "#232A22",
  glass: "rgba(20,25,19,0.92)",
  glassThin: "rgba(255,255,255,0.06)",
  glassThick: "#141913",
  glassBorder: "rgba(255,255,255,0.07)",
  ink: "#1A201A",
  inkDeep: "#101410",
  inkGlow: "transparent",
  solid: "#F2F1EA",
  solidFg: "#0B0E0C",
  border: "#262E26",
  cardBorder: "rgba(255,255,255,0.09)",
  textPrimary: "#F2F1EA",
  textSecondary: "#A3AB9F",
  textTertiary: "#6F776C",
  accent: "#5FD3A3",
  accentAlt: "#7FE3B8",
  accentSoft: "#12291F",
  accentFg: "#08130D",
  accentFill: "#3FBE8C",
  accentFillAlt: "#63D8A6",
  accentTop: "#6ADFAF",
  accentBottom: "#2E8F68",
  accentRim: "rgba(255,255,255,0.22)",
  specular: "rgba(255,255,255,0.30)",
  income: "#4FD39B",
  expense: "#FF8A70",
  warning: "#F0BE63",
  danger: "#FF8A70",
  transfer: "#C08BC3",
  onInk: "#F2F1EA",
  onInkMuted: "rgba(242,241,234,0.72)",
  inkTrack: "rgba(255,255,255,0.16)",
  scrim: "rgba(0,0,0,0.60)",
  tabBar: "rgba(20,25,19,0.92)",
  homeBar: "#F2F1EA",
  insightFrom: "#16241B",
  insightTo: "#202019",
  sheet: "#141913",
  bloom1: "transparent",
  bloom2: "transparent",
  bloom3: "transparent",
};

const lightTones: Record<ToneName, Tone> = {
  iris: { background: "#DFEDE5", foreground: "#17614A" },
  mint: { background: "#E3F2E8", foreground: "#157A52" },
  amber: { background: "#F7EBD6", foreground: "#94651A" },
  coral: { background: "#F9E4DC", foreground: "#A84328" },
  sky: { background: "#DFEAF0", foreground: "#2C6478" },
  slate: { background: "#E9E4D9", foreground: "#5B615A" },
};

const darkTones: Record<ToneName, Tone> = {
  iris: { background: "#172A21", foreground: "#8FDCC0" },
  mint: { background: "#122A1E", foreground: "#6FE0AD" },
  amber: { background: "#2B2313", foreground: "#EFC177" },
  coral: { background: "#2E1C15", foreground: "#FFA98F" },
  sky: { background: "#16262B", foreground: "#8FCBDD" },
  slate: { background: "#22271F", foreground: "#A9AF9F" },
};

/** iOS system colours for category accents. */
export const categoryRamp = [
  "#17614A",
  "#BC4B2E",
  "#B0781F",
  "#8C5A8F",
  "#2C6478",
  "#4A5A7A",
  "#A2845E",
  "#5B615A",
] as const;

const FONT_REGULAR = "Urbanist_400Regular";
const FONT_MEDIUM = "Urbanist_500Medium";
const FONT_SEMIBOLD = "Urbanist_600SemiBold";
const FONT_BOLD = "Urbanist_700Bold";

/**
 * Type scale, tuned for Urbanist. Each token names the face it needs because
 * React Native cannot pick a weight inside one custom family on Android. Amounts set `fontVariant: ["tabular-nums"]`
 * and shrink to fit their row instead of overflowing.
 */
const textScale = {
  hero: {
    fontFamily: FONT_BOLD,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "700",
    letterSpacing: -1.2,
  },
  display: {
    fontFamily: FONT_BOLD,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    letterSpacing: -1,
  },
  amountXL: {
    fontFamily: FONT_BOLD,
    fontSize: 48,
    lineHeight: 52,
    fontWeight: "700",
    letterSpacing: -1.6,
  },
  total: {
    fontFamily: FONT_BOLD,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -1,
  },
  title1: {
    fontFamily: FONT_BOLD,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  title2: {
    fontFamily: FONT_BOLD,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  title3: {
    fontFamily: FONT_SEMIBOLD,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  body: {
    fontFamily: FONT_REGULAR,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
    letterSpacing: -0.2,
  },
  bodyStrong: {
    fontFamily: FONT_SEMIBOLD,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  label: {
    fontFamily: FONT_SEMIBOLD,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  eyebrow: {
    fontFamily: FONT_MEDIUM,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: 0,
  },
  caption: {
    fontFamily: FONT_REGULAR,
    fontSize: 13,
    lineHeight: 18,
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
  tile: 10,
  chip: 999,
  input: 12,
  // 12 is deliberately tight: at 16+ every white block reads as an app-store
  // screenshot. The hero and sheets are the only tall, soft shapes.
  card: 12,
  hero: 18,
  sheet: 28,
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
  // Cards and chips are flat by design; these stay zeroed so any straggler
  // reference renders flat instead of reintroducing the template look.
  card: {
    shadowColor: "#101217",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  chip: {
    shadowColor: "#101217",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  glass: {
    shadowColor: "#101217",
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  // The one coloured shadow in the app: a filled glass capsule sits slightly above
  // the canvas, so its own tint appears underneath it.
  button: {
    shadowColor: "#0F4A35",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  lift: {
    shadowColor: "#101217",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  sheet: {
    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  fab: {
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} satisfies Record<string, Shadow>;

const darkShadows = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  chip: {
    shadowColor: "#000000",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  glass: {
    shadowColor: "#000000",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  button: {
    shadowColor: "#000000",
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  lift: {
    shadowColor: "#000000",
    shadowOpacity: 0.40,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  },
  sheet: {
    shadowColor: "#000000",
    shadowOpacity: 0.50,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  fab: {
    shadowColor: "#000000",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} satisfies Record<string, Shadow>;

export const motion = {
  chip: 140,
  pill: 220,
  sheet: 280,
  progress: 420,
  countUp: 600,
  snackbar: 4000,
  /** Physical responses: a short contraction, an eased settle, a soft slide. */
  press: { damping: 22, stiffness: 340, mass: 0.5 },
  release: { damping: 15, stiffness: 240, mass: 0.7 },
  settle: { damping: 20, stiffness: 190, mass: 0.9 },
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
