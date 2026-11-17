import type { TextStyle } from "react-native";

/**
 * Suffice design system — Modern iOS Liquid Glass & Optical Depth.
 *
 * Semantic color rule — strict:
 *  - Expenses always render in primary ink.
 *  - Income renders in semantic emerald.
 *  - Coral red renders ONLY for overspend and destructive/error states.
 */

export type ColorTokens = {
  /** Primary atmospheric canvas fill */
  bg: string;
  bgTop: string;
  bgBottom: string;
  /** Translucent & elevated card surfaces */
  surface: string;
  surfaceMuted: string;
  surfaceSunken: string;
  /** Optical glass layers */
  glass: string;
  glassThin: string;
  glassThick: string;
  glassBorder: string;
  /** Crisp inner top-edge specular rim & light catch on glass */
  glassHighlight: string;
  /** Native UIBlurEffect / expo-blur tint material */
  blurTint: "systemChromeMaterialLight" | "systemChromeMaterialDark";
  /** Hero smoked obsidian-sapphire glass card */
  ink: string;
  inkDeep: string;
  inkGlow: string;
  heroFrom: string;
  heroTo: string;
  inkBorder: string;
  /** Solid high-contrast pill / CTA contrast pair */
  solid: string;
  solidFg: string;
  /** Structural hairline & card rim */
  border: string;
  cardBorder: string;
  /** Typography inks */
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  /** Primary iOS system interactive tint & liquid button gradient */
  accent: string;
  accentAlt: string;
  accentSoft: string;
  accentFg: string;
  accentFill: string;
  accentFillAlt: string;
  accentTop: string;
  accentBottom: string;
  /** Semantic financial feedback */
  income: string;
  expense: string;
  warning: string;
  danger: string;
  transfer: string;
  /** Content rendered over dark smoked glass hero cards */
  onInk: string;
  onInkMuted: string;
  inkTrack: string;
  /** Overlay chrome */
  scrim: string;
  tabBar: string;
  homeBar: string;
  insightFrom: string;
  insightTo: string;
  sheet: string;
};

export type ToneName = "iris" | "mint" | "amber" | "coral" | "sky" | "slate";

export type Tone = { background: string; foreground: string };

const lightColors: ColorTokens = {
  bg: "#F2F3F7",
  bgTop: "#F6F7FA",
  bgBottom: "#EEEDF2",

  surface: "#FFFFFF",
  surfaceMuted: "#ECEDF2",
  surfaceSunken: "#E4E6ED",

  glass: "rgba(255, 255, 255, 0.80)",
  glassThin: "rgba(255, 255, 255, 0.62)",
  glassThick: "rgba(255, 255, 255, 0.94)",
  glassBorder: "rgba(15, 23, 42, 0.075)",
  glassHighlight: "rgba(255, 255, 255, 0.65)",
  blurTint: "systemChromeMaterialLight",

  ink: "#161922",
  inkDeep: "#101219",
  inkGlow: "rgba(255, 255, 255, 0.04)",
  heroFrom: "#1D212C",
  heroTo: "#141720",
  inkBorder: "rgba(255, 255, 255, 0.08)",

  solid: "#141720",
  solidFg: "#FFFFFF",

  border: "rgba(15, 23, 42, 0.07)",
  cardBorder: "rgba(15, 23, 42, 0.055)",

  textPrimary: "#0C0F18",
  textSecondary: "#525B70",
  textTertiary: "#667085",

  accent: "#007AFF",
  accentAlt: "#2B90FF",
  accentSoft: "rgba(0, 122, 255, 0.10)",
  accentFg: "#FFFFFF",
  accentFill: "#007AFF",
  accentFillAlt: "#2B90FF",
  accentTop: "#007AFF",
  accentBottom: "#007AFF",

  income: "#169B5C",
  expense: "#DC2F43",
  warning: "#D97706",
  danger: "#D92D3F",
  transfer: "#5E5CE6",

  onInk: "#F8FAFF",
  onInkMuted: "rgba(235, 242, 255, 0.72)",
  inkTrack: "rgba(255, 255, 255, 0.14)",

  scrim: "rgba(10, 12, 18, 0.44)",
  tabBar: "rgba(255, 255, 255, 0.88)",
  homeBar: "#0C0F18",
  insightFrom: "#F5F8FD",
  insightTo: "#F5F8FD",
  sheet: "#F9FAFC",
};

const darkColors: ColorTokens = {
  bg: "#0B0C10",
  bgTop: "#0F1117",
  bgBottom: "#090A0D",

  surface: "#15171F",
  surfaceMuted: "#1C1F2A",
  surfaceSunken: "#101218",

  glass: "rgba(24, 27, 36, 0.86)",
  glassThin: "rgba(24, 27, 36, 0.68)",
  glassThick: "rgba(22, 24, 32, 0.96)",
  glassBorder: "rgba(255, 255, 255, 0.095)",
  glassHighlight: "rgba(255, 255, 255, 0.10)",
  blurTint: "systemChromeMaterialDark",

  ink: "#151821",
  inkDeep: "#0F1118",
  inkGlow: "rgba(255, 255, 255, 0.03)",
  heroFrom: "#1B1F2B",
  heroTo: "#141720",
  inkBorder: "rgba(255, 255, 255, 0.085)",

  solid: "#F5F6FA",
  solidFg: "#0B0C10",

  border: "rgba(255, 255, 255, 0.075)",
  cardBorder: "rgba(255, 255, 255, 0.065)",

  textPrimary: "#F4F5F8",
  textSecondary: "#98A0B3",
  textTertiary: "#838C9F",

  accent: "#0A84FF",
  accentAlt: "#409CFF",
  accentSoft: "rgba(10, 132, 255, 0.14)",
  accentFg: "#FFFFFF",
  accentFill: "#0A84FF",
  accentFillAlt: "#3399FF",
  accentTop: "#0A84FF",
  accentBottom: "#0A84FF",

  income: "#30D158",
  expense: "#FF453A",
  warning: "#FF9F0A",
  danger: "#FF453A",
  transfer: "#7D7AFF",

  onInk: "#F5F6FA",
  onInkMuted: "rgba(244, 245, 248, 0.66)",
  inkTrack: "rgba(255, 255, 255, 0.12)",

  scrim: "rgba(0, 0, 0, 0.56)",
  tabBar: "rgba(22, 24, 32, 0.90)",
  homeBar: "#F4F5F8",
  insightFrom: "#161A24",
  insightTo: "#161A24",
  sheet: "#15171F",
};

const lightTones: Record<ToneName, Tone> = {
  iris: { background: "rgba(94, 92, 230, 0.13)", foreground: "#4F4CD9" },
  mint: { background: "rgba(16, 155, 96, 0.13)", foreground: "#0E8A55" },
  amber: { background: "rgba(217, 119, 6, 0.14)", foreground: "#B45D04" },
  coral: { background: "rgba(224, 40, 64, 0.12)", foreground: "#CC2138" },
  sky: { background: "rgba(0, 122, 255, 0.12)", foreground: "#0068DB" },
  slate: { background: "rgba(100, 116, 139, 0.14)", foreground: "#475569" },
};

const darkTones: Record<ToneName, Tone> = {
  iris: { background: "rgba(129, 140, 248, 0.20)", foreground: "#A5B4FC" },
  mint: { background: "rgba(50, 215, 148, 0.18)", foreground: "#5EEAD4" },
  amber: { background: "rgba(255, 179, 64, 0.19)", foreground: "#FFC76B" },
  coral: { background: "rgba(255, 82, 102, 0.20)", foreground: "#FF8594" },
  sky: { background: "rgba(41, 151, 255, 0.20)", foreground: "#70BFFF" },
  slate: { background: "rgba(148, 163, 184, 0.18)", foreground: "#CBD5E1" },
};

export const categoryRamp = [
  "#0A84FF",
  "#30D19A",
  "#FF9F0A",
  "#FF4D6D",
  "#5E5CE6",
  "#00C7BE",
  "#BF5AF2",
  "#64748B",
] as const;

const FONT_REGULAR = "Urbanist_400Regular";
const FONT_MEDIUM = "Urbanist_500Medium";
const FONT_SEMIBOLD = "Urbanist_600SemiBold";
const FONT_BOLD = "Urbanist_700Bold";

/**
 * Type scale aligned with iOS Dynamic Type hierarchy + Urbanist display geometry.
 * Amounts set `fontVariant: ["tabular-nums"]` via <Money>.
 */
const textScale = {
  hero: {
    fontFamily: FONT_BOLD,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "700",
    letterSpacing: -1.4,
  } satisfies TextStyle,
  display: {
    fontFamily: FONT_BOLD,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    letterSpacing: -1.0,
  } satisfies TextStyle,
  amountXL: {
    fontFamily: FONT_BOLD,
    fontSize: 48,
    lineHeight: 54,
    fontWeight: "700",
    letterSpacing: -1.6,
  } satisfies TextStyle,
  total: {
    fontFamily: FONT_BOLD,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -1.0,
  } satisfies TextStyle,
  title1: {
    fontFamily: FONT_BOLD,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -0.9,
  } satisfies TextStyle,
  title2: {
    fontFamily: FONT_BOLD,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  } satisfies TextStyle,
  title3: {
    fontFamily: FONT_SEMIBOLD,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "600",
    letterSpacing: -0.35,
  } satisfies TextStyle,
  body: {
    fontFamily: FONT_REGULAR,
    fontSize: 16.5,
    lineHeight: 23,
    fontWeight: "400",
    letterSpacing: -0.15,
  } satisfies TextStyle,
  bodyStrong: {
    fontFamily: FONT_SEMIBOLD,
    fontSize: 16.5,
    lineHeight: 23,
    fontWeight: "600",
    letterSpacing: -0.25,
  } satisfies TextStyle,
  label: {
    fontFamily: FONT_SEMIBOLD,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: -0.15,
  } satisfies TextStyle,
  eyebrow: {
    fontFamily: FONT_SEMIBOLD,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.35,
  } satisfies TextStyle,
  caption: {
    fontFamily: FONT_MEDIUM,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: -0.05,
  } satisfies TextStyle,
} as const;

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

/** Unified concentric iOS squircle corner scale. */
export const radius = {
  tile: 12,
  chip: 999,
  input: 14,
  card: 20,
  hero: 26,
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
    shadowColor: "#0B162C",
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  chip: {
    shadowColor: "#0B162C",
    shadowOpacity: 0.035,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 0,
  },
  glass: {
    shadowColor: "#0B162C",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  button: {
    shadowColor: "#0066E6",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  lift: {
    shadowColor: "#091224",
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  sheet: {
    shadowColor: "#070D1A",
    shadowOpacity: 0.14,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -8 },
    elevation: 14,
  },
  fab: {
    shadowColor: "#0062E0",
    shadowOpacity: 0.26,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
} satisfies Record<string, Shadow>;

const darkShadows = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 0,
  },
  chip: {
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 0,
  },
  glass: {
    shadowColor: "#000000",
    shadowOpacity: 0.36,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  button: {
    shadowColor: "#0A84FF",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  lift: {
    shadowColor: "#000000",
    shadowOpacity: 0.42,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 0,
  },
  sheet: {
    shadowColor: "#000000",
    shadowOpacity: 0.50,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: -10 },
    elevation: 14,
  },
  fab: {
    shadowColor: "#0A84FF",
    shadowOpacity: 0.30,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} satisfies Record<string, Shadow>;

/** Authentic UIKit / SwiftUI near-critical spring timings. */
export const motion = {
  chip: 150,
  pill: 240,
  sheet: 300,
  progress: 480,
  countUp: 620,
  snackbar: 4000,
  press: { damping: 26, stiffness: 460, mass: 0.6 },
  release: { damping: 24, stiffness: 320, mass: 0.65 },
  settle: { damping: 28, stiffness: 260, mass: 0.85 },
  sheetSpring: { damping: 32, stiffness: 340, mass: 0.9 },
  snappy: { damping: 22, stiffness: 380, mass: 0.65 },
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
