import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { Button, Card, FieldRow, Money, SectionHeader } from "../../components/ui";
import { getAccount } from "../../lib/db/repos/accounts";
import { getCategory } from "../../lib/db/repos/categories";
import { deleteTransaction, getTransaction, restoreTransaction } from "../../lib/db/repos/transactions";
import type { Account, Category, Db, Transaction } from "../../lib/db/types";
import { haptics } from "../../lib/haptics";
import { useTheme } from "../../lib/theme";
import { useUndo } from "../../lib/undo/UndoProvider";

export default function TransactionDetailScreen() {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const showUndo = useUndo();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Transaction | null | undefined>(undefined);
  const [category, setCategory] = useState<Category | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const row = await getTransaction(db, id);
    setTransaction(row);
    if (!row) return;
    const [nextCategory, nextAccount] = await Promise.all([
      row.categoryId ? getCategory(db, row.categoryId) : Promise.resolve(null),
      getAccount(db, row.accountId),
    ]);
    setCategory(nextCategory);
    setAccount(nextAccount);
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => setTransaction(null));
    }, [load]),
  );

  const remove = () => {
    if (!transaction || busy) return;
    const snapshot = transaction;
    Alert.alert("Delete this transaction?", "You will have a few seconds to undo.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setBusy(true);
          deleteTransaction(db, snapshot.id)
            .then(() => {
              haptics.success();
              router.back();
              showUndo({
                message: "Transaction deleted",
                onUndo: () => restoreTransaction(db, snapshot),
              });
            })
            .catch(() => {
              setBusy(false);
              Alert.alert("Not deleted", "Nothing was removed. Try again.");
            });
        },
      },
    ]);
  };

  if (transaction === undefined) return null;

  if (transaction === null) {
    return (
      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}
      >
        <Text style={[theme.text.title2, { color: theme.colors.textPrimary }]}>
          Transaction not found
        </Text>
        <Text style={[theme.text.body, { color: theme.colors.textSecondary, textAlign: "center" }]}>
          It may have been deleted. Your other entries are untouched.
        </Text>
        <Button label="Back" variant="ghost" size="sm" onPress={() => router.back()} />
      </View>
    );
  }

  const title = transaction.itemName ?? transaction.place ?? category?.name ?? "Uncategorized";
  const subtitle = [category?.name, account?.name, transaction.localDate]
    .filter(Boolean)
    .join(" · ");

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 4 }}
      style={{ backgroundColor: theme.colors.bg }}
    >
      <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
        {transaction.type}
      </Text>
      <Text style={[theme.text.title1, { color: theme.colors.textPrimary }]}>{title}</Text>
      <Text style={[theme.text.body, { color: theme.colors.textSecondary, marginTop: 2 }]}>
        {subtitle}
      </Text>
      <View style={{ marginTop: 12 }}>
        <Money
          minor={transaction.amountMinor}
          currency={transaction.currency}
          size="amountXL"
          tone={transaction.type === "income" ? "income" : "default"}
        />
      </View>

      <SectionHeader title="Details" />
      <Card>
        {category ? <FieldRow label="Category" value={category.name} /> : null}
        {transaction.place ? (
          <FieldRow label="Place" value={transaction.place} showDivider={Boolean(category)} />
        ) : null}
        {transaction.note ? (
          <FieldRow label="Note" value={transaction.note} showDivider />
        ) : null}
        {account ? <FieldRow label="Account" value={account.name} showDivider /> : null}
        <FieldRow label="Date" value={transaction.localDate} showDivider />
        <FieldRow label="Currency" value={transaction.currency} showDivider />
      </Card>

      <View style={{ gap: 10, marginTop: 20 }}>
        <Button
          label="Edit transaction"
          onPress={() =>
            router.push({ pathname: "/add", params: { id: transaction.id } })
          }
        />
        <Button
          label={busy ? "Deleting…" : "Delete transaction"}
          variant="danger"
          disabled={busy}
          onPress={remove}
        />
      </View>
    </ScrollView>
  );
}
