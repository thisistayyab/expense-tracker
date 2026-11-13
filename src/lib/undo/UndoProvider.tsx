import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { haptics } from "../haptics";
import { useTheme } from "../theme";

type UndoAction = {
  message: string;
  onUndo: () => void | Promise<void>;
};

type UndoContextValue = (action: UndoAction) => void;

const UndoContext = createContext<UndoContextValue>(() => {});

/** The undo window from 03: long enough to notice, short enough not to linger. */
const UNDO_MS = 4000;

export function useUndo(): UndoContextValue {
  return useContext(UndoContext);
}

/**
 * One snackbar for the whole app. Writers call `showUndo` after a destructive or
 * additive action; the callback is the inverse. Only the latest action is kept, so
 * two quick deletes cannot stack two contradictory undo bars.
 */
export function UndoProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [action, setAction] = useState<UndoAction | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const showUndo = useCallback<UndoContextValue>(
    (next) => {
      clearTimer();
      setAction(next);
      timer.current = setTimeout(() => setAction(null), UNDO_MS);
    },
    [clearTimer],
  );

  useEffect(() => clearTimer, [clearTimer]);

  const value = useMemo(() => showUndo, [showUndo]);

  return (
    <UndoContext.Provider value={value}>
      <View style={styles.host}>
        {children}
        {action ? (
          <View
            pointerEvents="box-none"
            style={[styles.bar, { bottom: insets.bottom + 84 }]}
            accessibilityLiveRegion="polite"
          >
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.solid,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Text style={[theme.text.bodyStrong, { color: theme.colors.solidFg, flex: 1 }]}>
                {action.message}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Undo"
                hitSlop={8}
                onPress={() => {
                  clearTimer();
                  setAction(null);
                  haptics.selection();
                  void Promise.resolve(action.onUndo()).catch(() => {});
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 6 })}
              >
                <Text style={[theme.text.bodyStrong, { color: theme.colors.accent }]}>Undo</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </UndoContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  bar: {
    position: "absolute",
    left: 20,
    right: 20,
  },
  card: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
