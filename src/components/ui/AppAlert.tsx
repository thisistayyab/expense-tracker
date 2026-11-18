import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type AlertButton,
  type AlertOptions,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "../../lib/haptics";
import { scheduleAfterKeyboardDismiss } from "../../lib/keyboard";
import { SPRING_SNAPPY } from "../../lib/motion";
import { FONT_FAMILIES, useTheme } from "../../lib/theme";
import { Button, type ButtonVariant } from "./Button";
import { TactilePressable } from "./TactilePressable";

export type AppAlertButton = AlertButton;
export type AppAlertOptions = AlertOptions;

type AlertEntry = {
  id: number;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  options?: AppAlertOptions;
};

let nextAlertId = 1;
let hostCount = 0;
let queue: AlertEntry[] = [];
let currentHead: AlertEntry | null = null;
const pendingCancelers = new Set<() => void>();
const listeners = new Set<() => void>();

function notify() {
  currentHead = queue[0] ?? null;
  for (const listener of listeners) {
    listener();
  }
}

function subscribeAlerts(listener: () => void) {
  hostCount += 1;
  listeners.add(listener);
  return () => {
    hostCount = Math.max(0, hostCount - 1);
    listeners.delete(listener);
  };
}

function getAlertSnapshot(): AlertEntry | null {
  return currentHead;
}

function enqueue(entry: AlertEntry) {
  queue = [...queue, entry];
  notify();
}

function shiftCurrent(): AlertEntry | null {
  if (!queue.length) return null;
  const [head, ...rest] = queue;
  queue = rest;
  notify();
  return head;
}

/**
 * Clears any open or scheduled themed alerts (for instance when App Lock engages).
 */
export function dismissAllAlerts() {
  for (const cancel of pendingCancelers) cancel();
  pendingCancelers.clear();
  if (queue.length) {
    queue = [];
    notify();
  }
}

/**
 * Cross-platform alert & confirmation dialog: uses native `UIAlertController` on
 * iOS and Suffice's themed modal card everywhere else so light/dark tokens,
 * Urbanist type, and danger/accent buttons match the rest of the app on Android.
 */
export function appAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
  options?: AppAlertOptions,
) {
  if (Platform.OS === "ios" || hostCount === 0) {
    Alert.alert(title, message, buttons, options);
    return;
  }

  const normalizedButtons: AppAlertButton[] = buttons?.length ? buttons : [{ text: "OK" }];
  const id = nextAlertId++;

  let settled = false;
  let cancelWait: () => void = () => {};
  cancelWait = scheduleAfterKeyboardDismiss(() => {
    settled = true;
    pendingCancelers.delete(cancelWait);
    enqueue({ id, title, message, buttons: normalizedButtons, options });
  });
  if (!settled) {
    pendingCancelers.add(cancelWait);
  }
}

function orderButtons(buttons: AppAlertButton[], sideBySide: boolean): AppAlertButton[] {
  const cancels = buttons.filter((button) => button.style === "cancel");
  const actions = buttons.filter((button) => button.style !== "cancel");
  if (sideBySide) {
    return [...cancels, ...actions];
  }
  return [...actions, ...cancels];
}

/**
 * Root modal host for `appAlert` on non-iOS platforms. Mount once inside
 * `<ThemeProvider>`.
 */
export function AlertHost() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const current = useSyncExternalStore(subscribeAlerts, getAlertSnapshot, getAlertSnapshot);
  const progress = useSharedValue(0);
  const handledIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!current) {
      progress.set(0);
      return;
    }
    handledIdRef.current = null;
    if (reduceMotion) {
      progress.set(1);
    } else {
      progress.set(0);
      progress.set(withSpring(1, SPRING_SNAPPY));
    }
  }, [current, progress, reduceMotion]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.94, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [8, 0]) },
    ],
  }));

  const sideBySide = useMemo(() => {
    if (!current || current.buttons.length !== 2 || fontScale > 1.25) return false;
    return current.buttons.every((button) => (button.text ?? "").length <= 15);
  }, [current, fontScale]);

  const orderedButtons = useMemo(
    () => (current ? orderButtons(current.buttons, sideBySide) : []),
    [current, sideBySide],
  );

  const cancelButton = useMemo(() => {
    if (!current) return undefined;
    return (
      current.buttons.find((button) => button.style === "cancel") ??
      (current.buttons.length === 1 ? current.buttons[0] : undefined)
    );
  }, [current]);

  const canDismissOnBackdrop = Boolean(
    current &&
      current.options?.cancelable !== false &&
      (cancelButton !== undefined || current.buttons.length <= 1),
  );

  const triggerButton = (button?: AppAlertButton) => {
    if (!current || handledIdRef.current === current.id) return;
    handledIdRef.current = current.id;
    if (button?.style === "destructive") haptics.tick();
    else haptics.selection();
    shiftCurrent();
    button?.onPress?.();
  };

  const handleDismiss = () => {
    if (!canDismissOnBackdrop) return;
    triggerButton(cancelButton);
  };

  const buttonVariantFor = (button: AppAlertButton, total: number): ButtonVariant => {
    if (button.style === "destructive") return "danger";
    if (button.style === "cancel") return "ghost";
    return total <= 2 ? "accent" : "ghost";
  };

  if (Platform.OS === "ios") return null;

  return (
    <Modal
      visible={current !== null}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
            onPress={handleDismiss}
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }]}
          />
        </Animated.View>

        {current ? (
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.card,
              theme.shadow.sheet,
              {
                backgroundColor: theme.colors.sheet,
                borderColor:
                  theme.scheme === "dark" ? theme.colors.glassBorder : theme.colors.cardBorder,
              },
              cardStyle,
            ]}
          >
            <Text
              accessibilityRole="header"
              style={[
                theme.text.title3,
                styles.title,
                { color: theme.colors.textPrimary },
              ]}
            >
              {current.title}
            </Text>

            {current.message ? (
              <ScrollView
                style={styles.messageScroll}
                bounces={false}
                showsVerticalScrollIndicator={false}
              >
                <Text
                  style={[
                    theme.text.body,
                    styles.message,
                    {
                      color: theme.colors.textSecondary,
                      textAlign: current.message.includes("\n") ? "left" : "center",
                    },
                  ]}
                >
                  {current.message}
                </Text>
              </ScrollView>
            ) : null}

            <View style={sideBySide ? styles.rowActions : styles.stackActions}>
              {orderedButtons.map((button, index) => {
                const label = button.text ?? "OK";
                const isMultiCancel = orderedButtons.length >= 3 && button.style === "cancel";
                if (isMultiCancel) {
                  return (
                    <TactilePressable
                      key={`${label}-${index}`}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      onPress={() => triggerButton(button)}
                      scaleTo={0.97}
                      radius={theme.radius.pill}
                      style={styles.quietCancel}
                    >
                      <Text
                        style={[
                          theme.text.label,
                          {
                            color: theme.colors.textSecondary,
                            fontFamily: FONT_FAMILIES.semibold,
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </TactilePressable>
                  );
                }

                return (
                  <View key={`${label}-${index}`} style={sideBySide ? styles.flexButton : undefined}>
                    <Button
                      label={label}
                      variant={buttonVariantFor(button, orderedButtons.length)}
                      size="sm"
                      onPress={() => triggerButton(button)}
                      style={styles.dialogButton}
                    />
                  </View>
                );
              })}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 28,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
  },
  title: {
    textAlign: "center",
  },
  messageScroll: {
    marginTop: 8,
    maxHeight: 240,
  },
  message: {
    fontSize: 15.5,
    lineHeight: 22,
  },
  rowActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  stackActions: {
    gap: 8,
    marginTop: 20,
  },
  flexButton: {
    flex: 1,
  },
  dialogButton: {
    height: 46,
    paddingHorizontal: 14,
  },
  quietCancel: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
});
