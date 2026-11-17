import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Button,
  Card,
  CategoryTile,
  FieldRow,
  Money,
  ScreenBackground,
  SectionHeader,
} from "../../components/ui";
import { getAccount } from "../../lib/db/repos/accounts";
import { getCategory } from "../../lib/db/repos/categories";
import { deleteTransaction, getTransaction, restoreTransaction } from "../../lib/db/repos/transactions";
import type { Account, Category, Db, Transaction } from "../../lib/db/types";
import { haptics } from "../../lib/haptics";
import { notifyLedgerChanged } from "../../lib/ledgerEvents";
import { useTheme } from "../../lib/theme";
import { useUndo } from "../../lib/undo/UndoProvider";

export default function TransactionDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const db: Db = useSQLiteContext();
  const showUndo = useUndo();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Transaction | null | undefined>(undefined);
  const [category, setCategory] = useState<Category | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [transferAccount, setTransferAccount] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!id) {
        Promise.resolve().then(() => {
          if (!cancelled) setTransaction(null);
        });
        return () => {
          cancelled = true;
        };
      }
      getTransaction(db, id)
        .then(async (row) => {
          if (cancelled) return;
          setTransaction(row);
          if (!row) {
            setCategory(null);
            setAccount(null);
            setTransferAccount(null);
            return;
          }
          const [nextCategory, nextAccount, nextTransferAccount] = await Promise.all([
            row.categoryId ? getCategory(db, row.categoryId) : Promise.resolve(null),
            getAccount(db, row.accountId),
            row.transferAccountId ? getAccount(db, row.transferAccountId) : Promise.resolve(null),
          ]);
          if (cancelled) return;
          setCategory(nextCategory);
          setAccount(nextAccount);
          setTransferAccount(nextTransferAccount);
        })
        .catch(() => {
          if (!cancelled) setTransaction(null);
        });

      return () => {
        cancelled = true;
      };
    }, [db, id]),
  );

  const remove = () => {
    if (!transaction || busy || busyRef.current) return;
    const snapshot = transaction;
    Alert.alert("Delete this transaction?", "You will have a few seconds to undo.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (busyRef.current) return;
          busyRef.current = true;
          setBusy(true);
          deleteTransaction(db, snapshot.id)
            .then(() => {
              notifyLedgerChanged();
              haptics.success();
              router.back();
              showUndo({
                message: "Transaction deleted",
                onUndo: async () => {
                  await restoreTransaction(db, snapshot);
                  notifyLedgerChanged();
                },
              });
            })
            .catch(() => {
              busyRef.current = false;
              setBusy(false);
              Alert.alert("Not deleted", "Nothing was removed. Try again.");
            });
        },
      },
    ]);
  };

  if (transaction === undefined) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenBackground />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      </View>
    );
  }

  if (transaction === null) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenBackground />
        <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1 }}>
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
        </SafeAreaView>
      </View>
    );
  }

  const isTransfer = transaction.type === "transfer";
  const title =
    transaction.itemName ??
    transaction.place ??
    (isTransfer ? "Transfer" : (category?.name ?? "Uncategorized"));
  const accountSummary = isTransfer
    ? `${account?.name ?? "Account"} → ${transferAccount?.name ?? "Account"}`
    : account?.name;
  const subtitle = [
    isTransfer ? "Transfer" : category?.name,
    accountSummary,
    transaction.localDate,
  ]
    .filter(Boolean)
    .join(" · ");

  const detailRows: { label: string; value: string }[] = [
    ...(category && !isTransfer ? [{ label: "Category", value: category.name }] : []),
    ...(transaction.place ? [{ label: "Place", value: transaction.place }] : []),
    ...(transaction.note ? [{ label: "Note", value: transaction.note }] : []),
    ...(account
      ? [{ label: isTransfer ? "From account" : "Account", value: account.name }]
      : []),
    ...(isTransfer && transferAccount
      ? [{ label: "To account", value: transferAccount.name }]
      : []),
    { label: "Date", value: transaction.localDate },
    { label: "Currency", value: transaction.currency },
  ];

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground />
      <SafeAreaView edges={["left", "right"]} style={{ flex: 1 }}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 32,
            gap: 6,
          }}
        >
          <Card variant="glass" style={{ padding: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <CategoryTile
                icon={isTransfer ? null : (category?.icon ?? null)}
                appIcon={isTransfer ? "transfer" : undefined}
                color={category?.color ?? null}
                size={46}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
                  {transaction.type}
                </Text>
                <Text
                  style={[theme.text.title2, { color: theme.colors.textPrimary, marginTop: 2 }]}
                  numberOfLines={2}
                >
                  {title}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 18 }}>
              <Money
                minor={transaction.amountMinor}
                currency={transaction.currency}
                size="amountXL"
                tone={transaction.type === "income" ? "income" : "default"}
              />
            </View>
            <Text style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 6 }]}>
              {subtitle}
            </Text>
          </Card>

          <SectionHeader title="Details" />
          <Card variant="glass" padded={false}>
            {detailRows.map((entry, index) => (
              <FieldRow
                key={entry.label}
                label={entry.label}
                value={entry.value}
                showDivider={index < detailRows.length - 1}
              />
            ))}
          </Card>

          <View style={{ gap: 10, marginTop: 20 }}>
            <Button
              label="Edit transaction"
              disabled={busy}
              onPress={() =>
                router.push({ pathname: "/add", params: { id: transaction.id } })
              }
            />
            <Button
              label={busy ? "Deleting…" : "Delete transaction"}
              variant="danger"
              leftIcon="trash"
              disabled={busy}
              onPress={remove}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
