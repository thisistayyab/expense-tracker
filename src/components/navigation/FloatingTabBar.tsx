import { GlassView } from "expo-glass-effect";
import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "../../lib/haptics";
import { SPRING_PRESS, SPRING_RELEASE, SPRING_SNAPPY } from "../../lib/motion";
import { useTheme } from "../../lib/theme";
import { AppIcon } from "../ui/AppIcon";
import { Glass, GlassGroup, liquidGlass, type GlassProps } from "../ui/Glass";
import { TabIcon, type TabIconName } from "./TabIcon";
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT, TAB_BAR_SIDE } from "./tabBar";

type Tab = {
  href: "/overview" | "/transactions" | "/budget" | "/insights";
  label: string;
  icon: TabIconName;
};

const TABS: Tab[] = [
  { href: "/overview", label: "Overview", icon: "overview" },
  { href: "/transactions", label: "Activity", icon: "activity" },
  { href: "/budget", label: "Budgets", icon: "budget" },
  { href: "/insights", label: "Insights", icon: "insights" },
];

function TabButton({
  tab,
  active,
  accentColor,
  inactiveColor,
}: {
  tab: Tab;
  active: boolean;
  accentColor: string;
  inactiveColor: string;
}) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        if (!reduceMotion) {
          scale.set(withSpring(0.92, SPRING_PRESS));
        }
      }}
      onPressOut={() => {
        if (!reduceMotion) {
          scale.set(withSpring(1, SPRING_RELEASE));
        }
      }}
      onPress={() => {
        haptics.selection();
        if (!active) router.navigate(tab.href);
      }}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}
      style={styles.tabPress}
    >
      <Animated.View style={[styles.tabInner, animatedStyle]}>
        <TabIcon
          name={tab.icon}
          color={active ? accentColor : inactiveColor}
          size={21}
          focused={active}
        />
        <Text
          numberOfLines={1}
          style={[
            theme.text.caption,
            styles.tabLabel,
            {
              color: active ? accentColor : inactiveColor,
              fontWeight: active ? "700" : "500",
            },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * iOS 26 Liquid Glass tab bar: floating glass navigation capsule on the left
 * paired with a detached circular Quick Add glass orb inside a shared GlassGroup.
 * Mounts via translateY only so native iOS GlassView never loses optical depth.
 */
export function FloatingTabBar({ blurTarget }: { blurTarget?: GlassProps["blurTarget"] } = {}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const [capsuleWidth, setCapsuleWidth] = useState(0);
  const pillX = useSharedValue(0);
  const fabScale = useSharedValue(1);
  const barTranslateY = useSharedValue(reduceMotion ? 0 : 28);

  const activeIndex = Math.max(
    0,
    TABS.findIndex((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`)),
  );

  useEffect(() => {
    barTranslateY.set(reduceMotion ? 0 : withSpring(0, SPRING_SNAPPY));
  }, [barTranslateY, reduceMotion]);

  useEffect(() => {
    if (capsuleWidth <= 0) return;
    const innerWidth = capsuleWidth - 8;
    const slotWidth = innerWidth / TABS.length;
    const target = activeIndex * slotWidth;
    pillX.set(
      reduceMotion ? withTiming(target, { duration: 0 }) : withSpring(target, SPRING_SNAPPY),
    );
  }, [activeIndex, capsuleWidth, pillX, reduceMotion]);

  const dockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: barTranslateY.value }],
  }));

  const pillWidth = capsuleWidth > 0 ? (capsuleWidth - 8) / TABS.length : 0;

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const bottomOffset = Math.max(insets.bottom, TAB_BAR_BOTTOM_GAP);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.dock,
        {
          bottom: bottomOffset,
          paddingHorizontal: TAB_BAR_SIDE,
        },
        dockStyle,
      ]}
    >
      <GlassGroup spacing={10} style={styles.row}>
        <Glass
          tone="regular"
          effect="regular"
          interactive
          radius={30}
          blurTarget={blurTarget}
          // iOS-only: the native glass starts clear enough that scrolling content
          // bleeds into the inactive labels. On Android, Glass layers real BlurView
          // (via blurTarget) with a sheer frosted tint.
          tintColor={Platform.OS === "ios" ? theme.colors.glass : undefined}
          style={[
            styles.capsule,
            Platform.OS === "ios" ? theme.shadow.glass : null,
          ]}
        >
          <View
            onLayout={(e) => setCapsuleWidth(e.nativeEvent.layout.width)}
            style={styles.capsuleRow}
          >
            {pillWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.activePill,
                  {
                    width: pillWidth,
                    // Solid accent, not a translucent wash: a see-through pill let
                    // the content behind it mix with the label and icon.
                    backgroundColor: theme.colors.accentFill,
                  },
                  pillStyle,
                ]}
              />
            ) : null}

            {TABS.map((tab, index) => (
              <TabButton
                key={tab.href}
                tab={tab}
                active={index === activeIndex}
                accentColor={theme.colors.accentFg}
                inactiveColor={theme.colors.textSecondary}
              />
            ))}
          </View>
        </Glass>

        <Animated.View
          style={[
            styles.fabOuter,
            !liquidGlass ? { backgroundColor: theme.colors.accentFill } : null,
            theme.shadow.fab,
            fabStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add transaction"
            hitSlop={6}
            onPressIn={() => {
              haptics.tick();
              if (!reduceMotion) fabScale.set(withSpring(0.9, SPRING_PRESS));
            }}
            onPressOut={() => {
              if (!reduceMotion) fabScale.set(withSpring(1, SPRING_RELEASE));
            }}
            onPress={() => router.push("/add")}
            style={styles.fabPress}
          >
            {liquidGlass && Platform.OS === "ios" ? (
              <GlassView
                colorScheme={theme.scheme}
                glassEffectStyle="regular"
                isInteractive
                tintColor={theme.colors.accentFill}
                style={styles.fabSurface}
              >
                <AppIcon name="plus" size={24} color={theme.colors.accentFg} weight="bold" />
              </GlassView>
            ) : (
              <View style={[styles.fabSurface, { backgroundColor: theme.colors.accentFill }]}>
                <AppIcon name="plus" size={24} color={theme.colors.accentFg} weight="bold" />
              </View>
            )}
          </Pressable>
        </Animated.View>
      </GlassGroup>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  capsule: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
  },
  capsuleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  activePill: {
    position: "absolute",
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 26,
    borderCurve: "continuous",
  },
  tabPress: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabLabel: {
    fontSize: 10.5,
    lineHeight: 13,
    letterSpacing: -0.05,
  },
  fabOuter: {
    width: TAB_BAR_HEIGHT,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
  },
  fabPress: {
    width: TAB_BAR_HEIGHT,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
  },
  fabSurface: {
    flex: 1,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderCurve: "continuous",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
