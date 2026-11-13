import type { BottomTabBarProps } from "expo-router/build/layouts/Tabs";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";

import { haptics } from "../../lib/haptics";
import { useTheme } from "../../lib/theme";
import { TabIcon, type TabIconName } from "./TabIcon";

/**
 * Route name → label and glyph. Kept here rather than in the layout so the bar
 * and the navigator cannot disagree about the four destinations.
 */
const DESTINATIONS: Record<string, { label: string; icon: TabIconName }> = {
  overview: { label: "Overview", icon: "overview" },
  transactions: { label: "Activity", icon: "activity" },
  budget: { label: "Budgets", icon: "budget" },
  insights: { label: "Insights", icon: "insights" },
};

const BAR_HEIGHT = 64;
const BAR_INSET = 16;

/**
 * How much padding a scrolling screen needs so its last row clears the bar:
 * the pill, its bottom inset and the gap above the home indicator.
 */
export const TAB_BAR_CLEARANCE = BAR_HEIGHT + BAR_INSET * 2;

/**
 * 64 px floating pill, inset 16 from the edges, sitting over the scene. The
 * active destination expands into an ink pill with its label; inactive ones stay
 * icon-only, but every tab keeps its label in the accessibility tree.
 *
 * Content clears the bar with `BAR_HEIGHT + BAR_INSET * 2` of padding.
 */
export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const pillLayout = reduceMotion
    ? undefined
    : LinearTransition.duration(theme.motion.pill).easing(Easing.out(Easing.cubic));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: insets.bottom + BAR_INSET }]}
    >
      <View
        style={[
          styles.bar,
          theme.shadow.card,
          {
            backgroundColor: theme.colors.tabBar,
            borderColor: theme.colors.cardBorder,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const destination = DESTINATIONS[route.name];
          const title =
            destination?.label ?? descriptors[route.key]?.options.title ?? route.name;

          const onPress = () => {
            const event = emitter.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              haptics.selection();
              navigateToTab(route.key);
            }
          };

          const onLongPress = () => {
            emitter.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <Animated.View
              key={route.key}
              layout={pillLayout}
              style={[
                styles.item,
                focused ? null : styles.itemIdle,
                focused && { backgroundColor: theme.colors.solid },
              ]}
            >
              <Pressable
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={title}
                hitSlop={4}
                style={({ pressed }) => [
                  styles.itemPress,
                  focused ? styles.itemPressActive : styles.itemPressIdle,
                  pressed && !focused ? { opacity: 0.55 } : null,
                ]}
              >
                <TabIcon
                  name={destination?.icon ?? "overview"}
                  color={focused ? theme.colors.solidFg : theme.colors.textTertiary}
                />
                {focused ? (
                  <Animated.Text
                    entering={reduceMotion ? undefined : FadeIn.duration(theme.motion.chip)}
                    exiting={reduceMotion ? undefined : FadeOut.duration(100)}
                    style={[theme.text.label, { color: theme.colors.solidFg }]}
                  >
                    {title}
                  </Animated.Text>
                ) : null}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: BAR_INSET,
    alignItems: "stretch",
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  item: {
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
  },
  itemPress: {
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  itemPressActive: {
    paddingHorizontal: 20,
  },
  itemPressIdle: {
    width: 52,
  },
  itemIdle: {
    width: 52,
  },
});
