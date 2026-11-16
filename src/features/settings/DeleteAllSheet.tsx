import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppIcon, Button, Sheet, TextField } from "../../components/ui";
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
      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
            padding: 14,
            borderRadius: theme.radius.card,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: `${theme.colors.danger}32`,
            backgroundColor:
              theme.scheme === "dark"
                ? "rgba(255, 82, 102, 0.14)"
                : "rgba(224, 40, 64, 0.08)",
          }}
        >
          <AppIcon name="exclamation" size={20} color={theme.colors.danger} />
          <Text style={[theme.text.body, { flex: 1, color: theme.colors.textSecondary }]}>
            This removes every transaction, budget, account, category and recurring rule on this
            device. Your settings (country, currency, theme) stay. This cannot be undone — export a
            backup first if you might want the data.
          </Text>
        </View>

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

        <View style={{ gap: 8, paddingTop: 4 }}>
          <Button
            label="Delete everything"
            variant="danger"
            onPress={() => void remove()}
            loading={busy}
            disabled={typed !== "DELETE" || busy}
          />
          <Button label="Cancel" variant="ghost" onPress={close} disabled={busy} />
        </View>
      </View>
    </Sheet>
  );
}
