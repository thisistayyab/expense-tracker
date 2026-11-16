import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppIcon,
  Button,
  Card,
  CategoryTile,
  EmptyState,
  Money,
  ScreenBackground,
  SectionHeader,
  TactilePressable,
} from "../../components/ui";
import { AccountEditorSheet } from "../../features/accounts/AccountEditorSheet";
import {
  accountIcon,
  accountTypeLabel,
  COIN_TONES,
} from "../../features/accounts/accountMeta";
import { listAccountBalances, type AccountWithBalance } from "../../lib/db/repos/accounts";
import { getAllSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import type { Db } from "../../lib/db/types";
import { useTheme } from "../../lib/theme";

export default function AccountsScreen() {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [activeCurrency, setActiveCurrency] = useState("USD");
  const [editing, setEditing] = useState<AccountWithBalance | null>(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [nextAccounts, settings] = await Promise.all([
      listAccountBalances(db, { includeArchived: true }),
      getAllSettings(db),
    ]);
    setAccounts(nextAccounts);
    setActiveCurrency(settings[SETTING_KEYS.currency] ?? "USD");
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      load()
        .catch((cause: unknown) => {
          if (!cancelled) setError(`Could not load accounts: ${String(cause)}`);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const active = useMemo(() => accounts.filter((account) => !account.isArchived), [accounts]);
  const archived = useMemo(() => accounts.filter((account) => account.isArchived), [accounts]);
  const groups = useMemo(() => {
    const map = new Map<string, AccountWithBalance[]>();
    for (const account of active) {
      const list = map.get(account.currency) ?? [];
      list.push(account);
      map.set(account.currency, list);
    }
    return [...map.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [active]);

  const refresh = () => {
    load().catch((cause: unknown) => setError(String(cause)));
  };

  const canTransfer = groups.some(([, currencyAccounts]) => currencyAccounts.length >= 2);

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
      >
        <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
          Balances include each account&apos;s opening balance and every transaction in its own
          currency. Nothing is converted.
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Add account"
              variant="accent"
              size="sm"
              leftIcon="plus"
              onPress={() => setAdding(true)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Transfer"
              variant="ghost"
              size="sm"
              leftIcon="transfer"
              disabled={!canTransfer}
              onPress={() =>
                router.push({ pathname: "/add", params: { type: "transfer" } })
              }
            />
          </View>
        </View>

        {loading && !accounts.length ? (
          <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 32 }} />
        ) : null}

        {!loading && !accounts.length ? (
          <View style={{ marginTop: 24 }}>
            <EmptyState
              icon="wallet"
              title="Add your first account"
              body="A cash wallet is enough. You can add bank, card and savings accounts later."
              actionLabel="Add account"
              onAction={() => setAdding(true)}
            />
          </View>
        ) : null}

        {groups.map(([currency, currencyAccounts]) => (
          <View key={currency}>
            <SectionHeader title={`${currency} accounts`} />
            <Card variant="glass" padded={false}>
              {currencyAccounts.map((account, index) => (
                <TactilePressable
                  key={account.id}
                  onPress={() => setEditing(account)}
                  haptic="selection"
                  scaleTo={0.985}
                  radius={14}
                  accessibilityRole="button"
                  accessibilityLabel={`${account.name}, ${accountTypeLabel(account.type)}, ${account.currency}`}
                  style={{
                    minHeight: 64,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 16,
                    borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: theme.colors.border,
                  }}
                >
                  <CategoryTile
                    appIcon={accountIcon(account.type)}
                    color={theme.tones[COIN_TONES[account.type]].foreground}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[theme.text.bodyStrong, { color: theme.colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {account.name}
                    </Text>
                    <Text
                      style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}
                    >
                      {accountTypeLabel(account.type)} · {account.transactionCount}{" "}
                      {account.transactionCount === 1 ? "entry" : "entries"}
                    </Text>
                  </View>
                  <Money
                    minor={account.balanceMinor}
                    currency={account.currency}
                    tone={account.balanceMinor < 0 ? "danger" : "default"}
                  />
                  <AppIcon name="chevronRight" color={theme.colors.textTertiary} size={15} />
                </TactilePressable>
              ))}
            </Card>
          </View>
        ))}

        {active.length ? (
          <Text
            style={[
              theme.text.caption,
              { color: theme.colors.textTertiary, textAlign: "center", marginTop: 16 },
            ]}
          >
            A transfer moves money between two accounts in the same currency. It is not an expense.
          </Text>
        ) : null}

        {archived.length ? (
          <View>
            <SectionHeader title="Archived accounts" />
            <Card variant="muted" padded={false}>
              {archived.map((account, index) => (
                <TactilePressable
                  key={account.id}
                  onPress={() => setEditing(account)}
                  haptic="selection"
                  scaleTo={0.985}
                  radius={14}
                  accessibilityRole="button"
                  accessibilityLabel={`${account.name}, archived`}
                  style={{
                    minHeight: 58,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 16,
                    borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: theme.colors.border,
                  }}
                >
                  <Text style={[theme.text.body, { color: theme.colors.textSecondary, flex: 1 }]}>
                    {account.name}
                  </Text>
                  <Text style={[theme.text.caption, { color: theme.colors.textTertiary }]}>
                    Archived · {account.currency}
                  </Text>
                </TactilePressable>
              ))}
            </Card>
          </View>
        ) : null}

        {error ? (
          <Text style={[theme.text.caption, { color: theme.colors.danger, marginTop: 14 }]}>
            {error}
          </Text>
        ) : null}

        <Text
          style={[
            theme.text.caption,
            { color: theme.colors.textTertiary, textAlign: "center", marginTop: 18 },
          ]}
        >
          Active currency: {activeCurrency}
        </Text>
      </ScrollView>

      {adding ? (
        <AccountEditorSheet
          activeCurrency={activeCurrency}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            refresh();
          }}
        />
      ) : null}

      {editing ? (
        <AccountEditorSheet
          account={editing}
          balanceMinor={editing.balanceMinor}
          hasTransactions={editing.transactionCount > 0}
          activeCurrency={activeCurrency}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      ) : null}
    </View>
  );
}
