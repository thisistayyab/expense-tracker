import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../lib/theme";
import { AppIcon } from "../ui/AppIcon";
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

function TabButton({ tab, active }: { tab: Tab; active: boolean }) {
  const { theme } = useTheme();
  const color = active ? theme.colors.accent : theme.colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}
      onPress={() => {
        void Haptics.selectionAsync();
        if (!active) router.navigate(tab.href);
      }}
      style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.55 : 1 }]}
    >
      <TabIcon name={tab.icon} color={color} size={22} />
      <Text numberOfLines={1} style={[theme.text.eyebrow, styles.label, { color }]}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

/**
 * A floating capsule above the content: the shape iOS 26's system tab bar took
 * (Liquid Glass, detached from the edge), with YouTube's arrangement of tabs.
 * The add action stays a separate circular button above the trailing end, like
 * Apple News, so it never competes with the four destinations.
 */
export function FloatingTabBar() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const liquid = isGlassEffectAPIAvailable();

  const [rowWidth, setRowWidth] = useState(0);
  const activeIndex = TABS.findIndex((tab) => tab.href === pathname);

  const mount = useSharedValue(0);
  const pill = useSharedValue(Math.max(activeIndex, 0));
  const fabIn = useSharedValue(0.4);
  const fabPress = useSharedValue(1);

  useEffect(() => {
    mount.value = withSpring(1, { damping: 21, stiffness: 200, mass: 0.9 });
    fabIn.value = withSpring(1, { damping: 15, stiffness: 220 });
  }, [mount, fabIn]);

  useEffect(() => {
    if (activeIndex < 0) return;
    pill.value = withSpring(activeIndex, { damping: 17, stiffness: 190, mass: 0.8 });
  }, [activeIndex, pill]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: mount.value,
    transform: [{ translateY: (1 - mount.value) * 10 }],
  }));

  const pillStyle = useAnimatedStyle(() => {
    const width = rowWidth / TABS.length;
    return { width, transform: [{ translateX: pill.value * width }] };
  });

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabIn.value * fabPress.value }],
  }));

  const items = (
    <View
      style={styles.row}
      onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
    >
      {rowWidth > 0 && activeIndex >= 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { backgroundColor: theme.colors.accentSoft }, pillStyle]}
        />
      ) : null}
      {TABS.map((tab) => (
        <TabButton key={tab.href} tab={tab} active={pathname === tab.href} />
      ))}
    </View>
  );

  return (
    <View
      pointerEvents="box-none"
      style={[styles.root, { marginBottom: insets.bottom + TAB_BAR_BOTTOM_GAP }]}
    >
      <Animated.View pointerEvents="box-none" style={[styles.shell, shellStyle]}>
        {liquid ? (
          <GlassView
            colorScheme={theme.scheme}
            glassEffectStyle="regular"
            style={styles.capsule}
          >
            {items}
          </GlassView>
        ) : (
          <View
            style={[
              styles.capsule,
              theme.shadow.glass,
              {
                backgroundColor: theme.colors.tabBar,
                borderColor: theme.colors.glassBorder,
              },
            ]}
          >
            {/* Without native glass this capsule was an opaque white pill with a
                hairline edge — a plain div. The sheen gives it the same material
                language as the buttons on every platform. */}
            <LinearGradient
              pointerEvents="none"
              colors={[theme.colors.specular, "rgba(255,255,255,0)"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {items}
          </View>
        )}
      </Animated.View>

      <Animated.View pointerEvents="box-none" style={[styles.fabWrap, fabStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
          onPress={() => {
            void Haptics.selectionAsync();
            router.push("/add");
          }}
          onPressIn={() => {
            fabPress.value = withSpring(0.92, { damping: 20, stiffness: 320 });
          }}
          onPressOut={() => {
            fabPress.value = withSpring(1, { damping: 18, stiffness: 260 });
          }}
          style={[
            styles.fab,
            theme.shadow.fab,
            {
              backgroundColor: theme.colors.accentFill,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.accentRim,
            },
          ]}
        >
          <LinearGradient
            colors={[theme.colors.accentTop, theme.colors.accentBottom]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(255,255,255,0.26)", "rgba(255,255,255,0)"]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="plus" color={theme.colors.accentFg} size={24} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: TAB_BAR_SIDE,
    right: TAB_BAR_SIDE,
    bottom: 0,
  },
  shell: {
    height: TAB_BAR_HEIGHT,
  },
  capsule: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
    paddingHorizontal: 6,
    overflow: "hidden",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  pill: {
    position: "absolute",
    left: 0,
    top: 8,
    height: TAB_BAR_HEIGHT - 16,
    borderRadius: (TAB_BAR_HEIGHT - 16) / 2,
  },
  tab: {
    flex: 1,
    height: TAB_BAR_HEIGHT - 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "500",
  },
  fabWrap: {
    position: "absolute",
    right: 8,
    bottom: TAB_BAR_HEIGHT + 12,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
