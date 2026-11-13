import { View } from "react-native";

import { useTheme } from "../../lib/theme";

export type PagerProps = {
  /** Zero-based index of the active dot. */
  active: number;
  total?: number;
  tone?: "default" | "ink";
};

/** Onboarding pager dots: the active dot is an 18 × 5 pill (07 §1). */
export function Pager({ active, total = 3, tone = "default" }: PagerProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{ flexDirection: "row", justifyContent: "center", gap: 6, paddingTop: 4 }}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Step ${active + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={{
            width: index === active ? 18 : 5,
            height: 5,
            borderRadius: 3,
            backgroundColor:
              index === active
                ? tone === "ink"
                  ? theme.colors.onInk
                  : theme.colors.textPrimary
                : tone === "ink"
                  ? "rgba(255,255,255,.25)"
                  : theme.colors.surfaceSunken,
          }}
        />
      ))}
    </View>
  );
}
