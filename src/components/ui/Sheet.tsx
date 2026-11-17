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
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
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
  /** Rendered inside the same sheet overlay above `sheetCard` (e.g. embedded pickers). */
  overlayChildren?: ReactNode;
  maxHeightRatio?: number;
  embedded?: boolean;
  dismissible?: boolean;
};

type SheetStage =
  | "closed"
  | "open"
  | "closingExternal"
  | "closingInteractive"
  | "nativeDismissing";

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
  overlayChildren,
  maxHeightRatio = 0.88,
  embedded = false,
  dismissible = true,
}: SheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();
  const initialOffset = Math.min(windowHeight, 640);

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
  const isMountedRef = useRef(true);
  const onClosedRef = useRef(onClosed);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  const progress = useSharedValue(visible && reduceMotion ? 1 : 0);
  const dragY = useSharedValue(0);
  const keyboardLift = useSharedValue(0);
  const handleActive = useSharedValue(0);
  const willDismiss = useSharedValue(false);

  const notifyClosedOnce = useCallback(() => {
    if (!isMountedRef.current || closedNotifiedRef.current) return;
    closedNotifiedRef.current = true;
    onClosedRef.current?.();
  }, []);

  const finishNativeDismiss = useCallback(() => {
    if (!isMountedRef.current) return;
    setStage((current) => (current === "nativeDismissing" ? "closed" : current));
    notifyClosedOnce();
  }, [notifyClosedOnce]);

  const finishSlideOut = useCallback(
    (wasInteractive: boolean) => {
      if (!isMountedRef.current) return;
      if (wasInteractive) {
        onClose();
      }
      if (embedded) {
        setStage("closed");
        notifyClosedOnce();
      } else {
        setStage("nativeDismissing");
      }
    },
    [embedded, notifyClosedOnce, onClose],
  );

  const dismissInteractive = useCallback(() => {
    if (!dismissible || stage !== "open") return;
    Keyboard.dismiss();
    haptics.tick();
    if (embedded) {
      dragY.set(reduceMotion ? 0 : withSpring(0, SPRING_SHEET));
      onClose();
      return;
    }
    setStage("closingInteractive");
  }, [dismissible, dragY, embedded, onClose, reduceMotion, stage]);

  useEffect(() => {
    if (stage === "open") {
      closedNotifiedRef.current = false;
      willDismiss.set(false);
      dragY.set(0);
      if (reduceMotion) {
        progress.set(1);
      } else {
        progress.set(0);
        progress.set(withSpring(1, SPRING_SHEET));
      }
      return undefined;
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
      // If caller declined to flip `visible` to false on `onClose()`, restore open instead of hiding forever.
      if (visible) {
        const recoverTimer = setTimeout(() => {
          if (isMountedRef.current) setStage("open");
        }, 32);
        return () => clearTimeout(recoverTimer);
      }
      const timer = setTimeout(finishNativeDismiss, Platform.OS === "ios" ? 400 : 80);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [dragY, finishNativeDismiss, finishSlideOut, progress, reduceMotion, stage, visible, willDismiss]);

  useEffect(() => {
    // Non-embedded Android Modals resize natively via SOFT_INPUT_ADJUST_RESIZE;
    // adding a JS lift on top double-offsets the sheet above the viewport.
    if (!embedded && Platform.OS === "android") {
      keyboardLift.set(0);
      return undefined;
    }

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const target = Math.max(0, event.endCoordinates.height);
      keyboardLift.set(
        reduceMotion ? target : withTiming(target, { duration: event.duration || 250 }),
      );
    });
    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      keyboardLift.set(
        reduceMotion ? 0 : withTiming(0, { duration: event.duration || 220 }),
      );
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [embedded, keyboardLift, reduceMotion]);

  // RNGH forbids binding the same Gesture instance to multiple GestureDetectors.
  // Keep both builders direct inside useMemo so React Compiler sees the worklets
  // are event handlers rather than a ref-capturing helper called during render.
  const grabberPan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(5)
        .onBegin(() => {
          willDismiss.set(false);
          handleActive.set(withTiming(1, { duration: 100 }));
        })
        .onUpdate((event) => {
          const y = event.translationY;
          dragY.set(y >= 0 ? y : -Math.pow(-y, 0.72) * 0.42);
        })
        .onEnd((event) => {
          handleActive.set(withTiming(0, { duration: 150 }));
          if (dismissible && (event.translationY > 105 || event.velocityY > 720)) {
            willDismiss.set(true);
            runOnJS(dismissInteractive)();
          } else {
            dragY.set(reduceMotion ? 0 : withSpring(0, SPRING_SHEET));
          }
        })
        .onFinalize(() => {
          handleActive.set(withTiming(0, { duration: 150 }));
          if (!willDismiss.get()) {
            dragY.set(reduceMotion ? 0 : withSpring(0, SPRING_SHEET));
          }
        }),
    [dismissInteractive, dismissible, dragY, handleActive, reduceMotion, willDismiss],
  );

  const headerPan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(5)
        .onBegin(() => {
          willDismiss.set(false);
          handleActive.set(withTiming(1, { duration: 100 }));
        })
        .onUpdate((event) => {
          const y = event.translationY;
          dragY.set(y >= 0 ? y : -Math.pow(-y, 0.72) * 0.42);
        })
        .onEnd((event) => {
          handleActive.set(withTiming(0, { duration: 150 }));
          if (dismissible && (event.translationY > 105 || event.velocityY > 720)) {
            willDismiss.set(true);
            runOnJS(dismissInteractive)();
          } else {
            dragY.set(reduceMotion ? 0 : withSpring(0, SPRING_SHEET));
          }
        })
        .onFinalize(() => {
          handleActive.set(withTiming(0, { duration: 150 }));
          if (!willDismiss.get()) {
            dragY.set(reduceMotion ? 0 : withSpring(0, SPRING_SHEET));
          }
        }),
    [dismissInteractive, dismissible, dragY, handleActive, reduceMotion, willDismiss],
  );

  const backdropStyle = useAnimatedStyle(() => {
    const dragFade = interpolate(dragY.value, [0, 320], [1, 0.2], Extrapolation.CLAMP);
    return {
      opacity: progress.value * dragFade,
    };
  });

  const restPaddingBottom = Math.max(insets.bottom + 14, 24);
  const sheetAnimatedStyle = useAnimatedStyle(() => {
    const entranceY = (1 - progress.value) * initialOffset;
    const availableHeight = Math.max(
      220,
      Math.min(
        Math.round(windowHeight * maxHeightRatio),
        windowHeight - insets.top - 16 - keyboardLift.value,
      ),
    );
    const activePaddingBottom =
      keyboardLift.value > 0 ? 12 : restPaddingBottom;
    return {
      maxHeight: availableHeight,
      marginBottom: keyboardLift.value,
      paddingBottom: activePaddingBottom,
      transform: [{ translateY: entranceY + dragY.value }],
    };
  }, [initialOffset, insets.top, maxHeightRatio, restPaddingBottom, windowHeight]);

  const grabberStyle = useAnimatedStyle(() => ({
    width: interpolate(handleActive.value, [0, 1], [38, 48]),
    opacity: interpolate(handleActive.value, [0, 1], [0.32, 0.6]),
  }));

  if (stage === "closed" && !visible) return null;

  const sheetSurfaceColor =
    Platform.OS === "android"
      ? theme.colors.sheet
      : theme.scheme === "dark"
        ? "rgba(21, 23, 31, 0.88)"
        : "rgba(249, 250, 252, 0.90)";

  const sheetCard = (
    <Animated.View
      accessibilityViewIsModal
      style={[
        styles.sheet,
        theme.shadow.sheet,
        {
          borderTopLeftRadius: theme.radius.sheet,
          borderTopRightRadius: theme.radius.sheet,
          backgroundColor: sheetSurfaceColor,
          borderColor:
            theme.scheme === "dark" ? theme.colors.glassBorder : theme.colors.cardBorder,
        },
        sheetAnimatedStyle,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.sheetGlassClip,
          {
            borderTopLeftRadius: theme.radius.sheet,
            borderTopRightRadius: theme.radius.sheet,
          },
        ]}
      >
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
                  <Text
                    accessibilityRole="header"
                    style={[theme.text.title2, { color: theme.colors.textPrimary }]}
                  >
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
      {overlayChildren}
    </View>
  );

  if (embedded) return overlay;

  const modalVisible =
    visible || stage === "open" || stage === "closingExternal" || stage === "closingInteractive";

  return (
    <Modal
      visible={modalVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onDismiss={finishNativeDismiss}
      onRequestClose={dismissible ? dismissInteractive : () => {}}
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
    borderCurve: "continuous",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  sheetGlassClip: {
    ...StyleSheet.absoluteFill,
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
    paddingTop: 14,
    paddingBottom: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
