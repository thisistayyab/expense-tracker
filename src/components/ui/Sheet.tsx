import { BlurView } from "expo-blur";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "../../lib/haptics";
import { SPRING_SHEET } from "../../lib/motion";
import { useTheme } from "../../lib/theme";
import { AppIcon } from "./AppIcon";
import { TactilePressable } from "./TactilePressable";

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Called once exit animation and native Modal dismissal have fully finished. */
  onClosed?: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxHeightRatio?: number;
  embedded?: boolean;
};

type SheetStage =
  | "closed"
  | "open"
  | "closingExternal"
  | "closingInteractive"
  | "nativeDismissing";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const INITIAL_OFFSET = Math.min(SCREEN_HEIGHT, 640);

/**
 * Interactive iOS frosted-glass bottom sheet with blur scrim, rubber-banding
 * swipe-to-dismiss handle, and synchronized keyboard lift.
 */
export function Sheet({
  visible,
  onClose,
  onClosed,
  title,
  subtitle,
  children,
  footer,
  maxHeightRatio = 0.88,
  embedded = false,
}: SheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const [prevVisible, setPrevVisible] = useState(visible);
  const [stage, setStage] = useState<SheetStage>(visible ? "open" : "closed");

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible && stage !== "open") {
      setStage("open");
    } else if (!visible && stage === "open") {
      setStage("closingExternal");
    }
  }

  const closedNotifiedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const onClosedRef = useRef(onClosed);

  useEffect(() => {
    onCloseRef.current = onClose;
    onClosedRef.current = onClosed;
  }, [onClose, onClosed]);

  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const keyboardShift = useSharedValue(0);
  const handleActive = useSharedValue(0);

  const notifyClosedOnce = useCallback(() => {
    if (closedNotifiedRef.current) return;
    closedNotifiedRef.current = true;
    onClosedRef.current?.();
  }, []);

  const finishNativeDismiss = useCallback(() => {
    setStage((current) => (current === "nativeDismissing" ? "closed" : current));
    notifyClosedOnce();
  }, [notifyClosedOnce]);

  const finishSlideOut = useCallback(
    (wasInteractive: boolean) => {
      if (wasInteractive) {
        onCloseRef.current();
      }
      if (embedded) {
        setStage("closed");
        notifyClosedOnce();
      } else {
        setStage("nativeDismissing");
      }
    },
    [embedded, notifyClosedOnce],
  );

  const dismissInteractive = useCallback(() => {
    if (stage !== "open") return;
    Keyboard.dismiss();
    haptics.tick();
    setStage("closingInteractive");
  }, [stage]);

  useEffect(() => {
    if (stage === "open") {
      closedNotifiedRef.current = false;
      dragY.set(0);
      if (reduceMotion) {
        progress.set(1);
      } else {
        progress.set(0);
        progress.set(withSpring(1, SPRING_SHEET));
      }
      return undefined;
    }

    if (stage === "closingInteractive" && embedded) {
      dragY.set(0);
      const frame = requestAnimationFrame(() => {
        setStage("open");
        onCloseRef.current();
      });
      return () => cancelAnimationFrame(frame);
    }

    if (stage === "closingExternal" || stage === "closingInteractive") {
      const wasInteractive = stage === "closingInteractive";
      if (reduceMotion) {
        progress.set(0);
        const timer = setTimeout(() => finishSlideOut(wasInteractive), 16);
        return () => clearTimeout(timer);
      }
      progress.set(
        withTiming(0, { duration: 200 }, (finished) => {
          if (finished) runOnJS(finishSlideOut)(wasInteractive);
        }),
      );
      return undefined;
    }

    if (stage === "nativeDismissing") {
      const timer = setTimeout(finishNativeDismiss, Platform.OS === "ios" ? 250 : 32);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [dragY, embedded, finishNativeDismiss, finishSlideOut, progress, reduceMotion, stage]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const target = -Math.max(0, event.endCoordinates.height - insets.bottom);
      keyboardShift.set(
        reduceMotion ? target : withTiming(target, { duration: event.duration || 250 }),
      );
    });
    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      keyboardShift.set(
        reduceMotion ? 0 : withTiming(0, { duration: event.duration || 220 }),
      );
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom, keyboardShift, reduceMotion]);

  const createPanGesture = useCallback(
    () =>
      Gesture.Pan()
        .activeOffsetY(5)
        .onBegin(() => {
          handleActive.set(withTiming(1, { duration: 100 }));
        })
        .onUpdate((event) => {
          const y = event.translationY;
          dragY.set(y >= 0 ? y : -Math.pow(-y, 0.72) * 0.42);
        })
        .onEnd((event) => {
          handleActive.set(withTiming(0, { duration: 150 }));
          if (event.translationY > 105 || event.velocityY > 720) {
            runOnJS(dismissInteractive)();
          } else {
            dragY.set(reduceMotion ? 0 : withSpring(0, SPRING_SHEET));
          }
        })
        .onFinalize(() => {
          handleActive.set(withTiming(0, { duration: 150 }));
        }),
    [dismissInteractive, dragY, handleActive, reduceMotion],
  );

  // RNGH forbids binding the same Gesture instance to multiple GestureDetectors.
  const grabberPan = useMemo(() => createPanGesture(), [createPanGesture]);
  const headerPan = useMemo(() => createPanGesture(), [createPanGesture]);

  const backdropStyle = useAnimatedStyle(() => {
    const dragFade = interpolate(dragY.value, [0, 320], [1, 0.2], Extrapolation.CLAMP);
    return {
      opacity: progress.value * dragFade,
    };
  });

  const sheetAnimatedStyle = useAnimatedStyle(() => {
    const entranceY = (1 - progress.value) * INITIAL_OFFSET;
    return {
      transform: [{ translateY: entranceY + dragY.value + keyboardShift.value }],
    };
  });

  const grabberStyle = useAnimatedStyle(() => ({
    width: interpolate(handleActive.value, [0, 1], [38, 48]),
    opacity: interpolate(handleActive.value, [0, 1], [0.32, 0.6]),
  }));

  if (stage === "closed" && !visible) return null;

  const maxHeight = Math.round(SCREEN_HEIGHT * maxHeightRatio);
  const sheetSurfaceColor =
    Platform.OS === "android"
      ? theme.colors.sheet
      : theme.scheme === "dark"
        ? "rgba(21, 23, 31, 0.88)"
        : "rgba(249, 250, 252, 0.90)";

  const sheetCard = (
    <Animated.View
      style={[
        styles.sheet,
        theme.shadow.sheet,
        {
          maxHeight,
          paddingBottom: Math.max(insets.bottom, theme.space.lg),
          backgroundColor: sheetSurfaceColor,
          borderColor:
            theme.scheme === "dark" ? theme.colors.glassBorder : theme.colors.cardBorder,
        },
        sheetAnimatedStyle,
      ]}
    >
      <View pointerEvents="none" style={styles.sheetGlassClip}>
        {Platform.OS === "ios" || Platform.OS === "web" ? (
          <BlurView tint={theme.colors.blurTint} intensity={82} style={StyleSheet.absoluteFill} />
        ) : null}
      </View>

      <View>
        <GestureDetector gesture={grabberPan}>
          <View style={styles.grabberRow}>
            <Animated.View
              style={[
                styles.grabber,
                { backgroundColor: theme.colors.textTertiary },
                grabberStyle,
              ]}
            />
          </View>
        </GestureDetector>

        {title || subtitle ? (
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <GestureDetector gesture={headerPan}>
              <View style={styles.headerText}>
                {title ? (
                  <Text style={[theme.text.title2, { color: theme.colors.textPrimary }]}>
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text
                    style={[
                      theme.text.caption,
                      { color: theme.colors.textSecondary, marginTop: 2 },
                    ]}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </GestureDetector>
            <TactilePressable
              onPress={dismissInteractive}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              radius={999}
              scaleTo={0.9}
              style={[
                styles.closeButton,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <AppIcon name="close" size={16} color={theme.colors.textSecondary} weight="bold" />
            </TactilePressable>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>{children}</View>

      {footer ? (
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>{footer}</View>
      ) : null}
    </Animated.View>
  );

  const overlay = (
    <View style={styles.overlay}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        {Platform.OS === "ios" || Platform.OS === "web" ? (
          <BlurView
            pointerEvents="none"
            tint={theme.scheme === "dark" ? "dark" : "light"}
            intensity={18}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <Pressable
          accessibilityLabel="Close sheet"
          accessibilityRole="button"
          onPress={dismissInteractive}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }]}
        />
      </Animated.View>
      {sheetCard}
    </View>
  );

  if (embedded) return overlay;

  return (
    <Modal
      visible={stage === "open" || stage === "closingExternal" || stage === "closingInteractive"}
      transparent
      statusBarTranslucent
      animationType="none"
      onDismiss={finishNativeDismiss}
      onRequestClose={dismissInteractive}
    >
      <GestureHandlerRootView style={styles.flexOne}>{overlay}</GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderCurve: "continuous",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  sheetGlassClip: {
    ...StyleSheet.absoluteFill,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  grabberRow: {
    alignItems: "center",
    paddingVertical: 9,
  },
  grabber: {
    height: 5,
    borderRadius: 999,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flexShrink: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
