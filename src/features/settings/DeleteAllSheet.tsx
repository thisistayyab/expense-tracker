import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

import { Sheet, TextField } from "../../components/ui";
import { resetAllData } from "../../lib/db/repos/backup";
import type { Db } from "../../lib/db/types";
import { haptics } from "../../lib/haptics";
import { useOnboarding } from "../../lib/onboarding";
import { useTheme } from "../../lib/theme";
import { cancelReminders } from "../recurring/reminders";

/**
 * Typed confirmation for the one irreversible action (09 flow 8). Nothing happens
 * on a swipe or a single tap: the word DELETE is the gate. Settings survive so the
 * app reopens in the same currency with a fresh starter library.
 */
export function DeleteAllSheet({
  visible,
  onClose,
  onDeleted,
}: {
  visible: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const { reload } = useOnboarding();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setTyped("");
    setError(null);
    onClose();
  };

  const remove = async () => {
    if (typed !== "DELETE" || busy) return;
    setBusy(true);
    setError(null);
    try {
      await resetAllData(db);
      await cancelReminders();
      await reload();
      haptics.error();
      setTyped("");
      onClose();
      onDeleted?.();
    } catch (cause) {
      setError(`Nothing was deleted: ${String(cause)}`);
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={close} title="Delete all data?">
      <Text
        style={[
          theme.text.body,
          { color: theme.colors.textSecondary, paddingHorizontal: 20, paddingBottom: 12 },
        ]}
      >
        This removes every transaction, budget, account, category and recurring rule on this
        device. Your settings (country, currency, theme) stay. This cannot be undone — export a
        backup first if you might want the data.
      </Text>

      <TextField
        label="Type DELETE to confirm"
        value={typed}
        onChangeText={(value) => setTyped(value.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="DELETE"
        editable={!busy}
        error={error ?? undefined}
      />

      <Pressable
        onPress={() => void remove()}
        disabled={typed !== "DELETE" || busy}
        accessibilityRole="button"
        accessibilityLabel="Delete all data permanently"
        accessibilityState={{ disabled: typed !== "DELETE" || busy, busy }}
        style={({ pressed }) => ({
          marginHorizontal: 20,
          marginTop: 8,
          marginBottom: 10,
          height: 52,
          borderRadius: 26,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.danger,
          opacity: typed !== "DELETE" || busy ? 0.4 : pressed ? 0.85 : 1,
        })}
      >
        {busy ? (
          <ActivityIndicator color={theme.colors.accentFg} />
        ) : (
          <Text style={[theme.text.title3, { color: theme.colors.accentFg }]}>
            Delete everything
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={close}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
        style={{ height: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>Cancel</Text>
      </Pressable>
    </Sheet>
  );
}
