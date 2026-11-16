import { BlurView } from "expo-blur";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  ReduceMotion,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_CLEARANCE } from "../../components/navigation/tabBar";
import { AppIcon } from "../../components/ui/AppIcon";
import { TactilePressable } from "../../components/ui/TactilePressable";
import { haptics } from "../haptics";
import { useTheme } from "../theme";

type UndoAction = {
  message: string;
  onUndo: () => void | Promise<void>;
};

type UndoContextValue = (action: UndoAction) => void;

const UndoContext = createContext<UndoContextValue>(() => { });

const UNDO_MS = 4000;

export function useUndo(): UndoContextValue {
  return useContext(UndoContext);
}

/**
 * Floating iOS frosted-glass undo capsule with smooth countdown indicator.
 */
export function UndoProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [action, setAction] = useState<(UndoAction & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);
  const progress = useSharedValue(1);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setAction(null);
  }, [clearTimer]);

  const showUndo = useCallback<UndoContextValue>(
    (next) => {
      clearTimer();
      counter.current += 1;
      setAction({ ...next, id: counter.current });
      progress.set(1);
      progress.set(withTiming(0, { duration: UNDO_MS }));
      timer.current = setTimeout(() => {
        setAction(null);
        timer.current = null;
      }, UNDO_MS);
    },
    [clearTimer, progress],
  );

  useEffect(() => clearTimer, [clearTimer]);

  const handleUndo = async () => {
    if (!action) return;
    const fn = action.onUndo;
    dismiss();
    haptics.success();
    await fn();
  };

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <UndoContext.Provider value={showUndo}>
      {children}
      {action ? (
        <Animated.View
          key={action.id}
          entering={
            reduceMotion
              ? undefined
              : SlideInDown.springify(300)
                .dampingRatio(0.92)
                .reduceMotion(ReduceMotion.System)
          }
          exiting={
            reduceMotion
              ? undefined
              : SlideOutDown.duration(180).reduceMotion(ReduceMotion.System)
          }
          pointerEvents="box-none"
          style={[
            styles.wrapper,
            { bottom: Math.max(insets.bottom, 8) + TAB_BAR_CLEARANCE },
          ]}
        >
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.bar,
              Platform.OS === "ios" ? theme.shadow.lift : null,
              {
                backgroundColor:
                  Platform.OS === "android"
                    ? theme.scheme === "dark"
                      ? "#1E222D"
                      : "#161922"
                    : theme.scheme === "dark"
                      ? "rgba(22, 25, 34, 0.88)"
                      : "rgba(18, 22, 32, 0.90)",
                borderColor: "rgba(255, 255, 255, 0.12)",
              },
            ]}
          >
            {Platform.OS === "ios" || Platform.OS === "web" ? (
              <BlurView
                pointerEvents="none"
                tint="dark"
                intensity={55}
                style={StyleSheet.absoluteFill}
              />
            ) : null}

            <View style={styles.contentRow}>
              <View style={[styles.iconBadge, { backgroundColor: "rgba(50, 215, 148, 0.18)" }]}>
                <AppIcon name="checkmarkCircle" size={16} color="#32D794" />
              </View>
              <Text
                style={[theme.text.bodyStrong, styles.message, { color: "#F8FAFF" }]}
                numberOfLines={1}
              >
                {action.message}
              </Text>
              <TactilePressable
                accessibilityRole="button"
                accessibilityLabel="Undo"
                onPress={handleUndo}
                scaleTo={0.94}
                style={[styles.undoPill, { backgroundColor: theme.colors.accentSoft }]}
              >
                <Text style={[theme.text.label, { color: theme.colors.accentAlt }]}>Undo</Text>
              </TactilePressable>
            </View>

            <View pointerEvents="none" style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { backgroundColor: theme.colors.accentAlt },
                  progressStyle,
                ]}
              />
            </View>
          </View>
        </Animated.View>
      ) : null}
    </UndoContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 100,
    alignItems: "center",
  },
  bar: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 999,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 9,
    gap: 10,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    flex: 1,
    fontSize: 15,
  },
  undoPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderCurve: "continuous",
  },
  progressTrack: {
    height: 2,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  progressFill: {
    height: "100%",
    width: "100%",
    transformOrigin: "left",
  },
});
