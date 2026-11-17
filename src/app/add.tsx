import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Button, ScreenBackground } from "../components/ui";
import { AddTransactionSheet } from "../features/transactions/AddTransactionSheet";
import { deleteTransaction, getTransaction } from "../lib/db/repos/transactions";
import type { Db, Transaction } from "../lib/db/types";
import { haptics } from "../lib/haptics";
import { notifyLedgerChanged } from "../lib/ledgerEvents";
import { useTheme } from "../lib/theme";
import { useUndo } from "../lib/undo/UndoProvider";

const SAVED_MESSAGE: Record<Transaction["type"], string> = {
  expense: "Expense saved",
  income: "Income saved",
  transfer: "Transfer saved",
};

/** Modal route. Never the initial screen (ADR-010); only reached from an add action. */
export default function AddScreen() {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const showUndo = useUndo();
  const { id, amount, type, accountId } = useLocalSearchParams<{
    id?: string;
    amount?: string;
    type?: string;
    accountId?: string;
  }>();
  const [existing, setExisting] = useState<Transaction | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    // Always settle from a promise callback so the no-id branch does not set state
    // synchronously inside the effect body.
    const load = id ? getTransaction(db, id) : Promise.resolve(null);
    load
      .then((row) => {
        if (!cancelled) setExisting(row);
      })
      .catch(() => {
        if (!cancelled) setExisting(null);
      });
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  if (existing === undefined) return null;

  if (id && existing === null) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenBackground />
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}
        >
          <Text style={[theme.text.title2, { color: theme.colors.textPrimary }]}>
            Transaction not found
          </Text>
          <Text
            style={[theme.text.body, { color: theme.colors.textSecondary, textAlign: "center" }]}
          >
            It may have been deleted before you opened it.
          </Text>
          <Button label="Back" variant="ghost" size="sm" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <AddTransactionSheet
      existing={existing}
      initialAmount={id ? undefined : amount}
      initialType={
        type === "expense" || type === "income" || type === "transfer" ? type : undefined
      }
      initialAccountId={id ? undefined : accountId}
      onClose={() => router.back()}
      onSaved={async (transaction, isNew, persisted) => {
        if (isNew && persisted) {
          try {
            await persisted;
          } catch {
            return;
          }
          haptics.success();
        }
        notifyLedgerChanged();
        router.back();
        if (isNew) {
          showUndo({
            message: SAVED_MESSAGE[transaction.type],
            onUndo: async () => {
              await deleteTransaction(db, transaction.id);
              notifyLedgerChanged();
              haptics.selection();
            },
          });
        }
      }}
    />
  );
}
