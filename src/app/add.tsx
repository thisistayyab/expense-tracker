import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";

import { AddTransactionSheet } from "../features/transactions/AddTransactionSheet";
import { deleteTransaction, getTransaction } from "../lib/db/repos/transactions";
import type { Db, Transaction } from "../lib/db/types";
import { haptics } from "../lib/haptics";
import { useUndo } from "../lib/undo/UndoProvider";

const SAVED_MESSAGE: Record<Transaction["type"], string> = {
  expense: "Expense saved",
  income: "Income saved",
  transfer: "Transfer saved",
};

/** Modal route. Never the initial screen (ADR-010); only reached from an add action. */
export default function AddScreen() {
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

  return (
    <AddTransactionSheet
      existing={existing}
      initialAmount={id ? undefined : amount}
      initialType={
        type === "expense" || type === "income" || type === "transfer" ? type : undefined
      }
      initialAccountId={id ? undefined : accountId}
      onClose={() => router.back()}
      onSaved={(transaction, isNew, persisted) => {
        router.back();
        if (isNew) {
          showUndo({
            message: SAVED_MESSAGE[transaction.type],
            onUndo: async () => {
              // The snackbar appears before the insert finishes; wait for it so undo
              // can never delete a row that is still on its way into SQLite.
              if (persisted) await persisted.catch(() => null);
              await deleteTransaction(db, transaction.id);
              haptics.selection();
            },
          });
        }
      }}
    />
  );
}
