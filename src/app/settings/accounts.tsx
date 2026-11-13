import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { CategoryTile, EmptyState, Money, SectionHeader } from "../../components/ui";
import { AccountEditorSheet } from "../../features/accounts/AccountEditorSheet";
import {
  accountGlyph,
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
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>        <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
          Balances include each account&apos;s opening balance and every transaction in its own
          currency. Nothing is converted.
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <Pressable
              onPress={() => setAdding(true)}
              accessibilityRole="button"
              accessibilityLabel="Add account"
              style={({ pressed }) => ({
                height: 44,
                borderRadius: 22,
                backgroundColor: theme.colors.solid,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={[theme.text.label, { color: theme.colors.solidFg }]}>+ Add account</Text>
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <Pressable
              onPress={() =>
                router.push({ pathname: "/add", params: { type: "transfer" } })
              }
              disabled={!canTransfer}
              accessibilityRole="button"
              accessibilityLabel="Transfer between accounts"
              style={({ pressed }) => ({
                height: 44,
                borderRadius: 22,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                alignItems: "center",
                justifyContent: "center",
                opacity: !canTransfer ? 0.4 : pressed ? 0.7 : 1,
              })}
            >
              <Text style={[theme.text.label, { color: theme.colors.accent }]}>⇄ Transfer</Text>
            </Pressable>
          </View>
        </View>

        {loading && !accounts.length ? (
          <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 32 }} />
        ) : null}

        {!loading && !accounts.length ? (
          <View style={{ marginTop: 24 }}>
            <EmptyState
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
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.card,
                borderWidth: 1,
                borderColor: theme.colors.cardBorder,
                overflow: "hidden",
              }}
            >
              {currencyAccounts.map((account, index) => (
                <Pressable
                  key={account.id}
                  onPress={() => setEditing(account)}
                  accessibilityRole="button"
                  accessibilityLabel={`${account.name}, ${accountTypeLabel(account.type)}, ${account.currency}`}
                  style={({ pressed }) => ({
                    minHeight: 64,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 16,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: theme.colors.border,
                    opacity: pressed ? 0.65 : 1,
                  })}
                >
                  <CategoryTile
                    glyph={accountGlyph(account.type)}
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
                  <Text style={{ color: theme.colors.textTertiary }}>›</Text>
                </Pressable>
              ))}
            </View>
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
            <View
              style={{
                backgroundColor: theme.colors.surfaceMuted,
                borderRadius: theme.radius.card,
                overflow: "hidden",
              }}
            >
              {archived.map((account, index) => (
                <Pressable
                  key={account.id}
                  onPress={() => setEditing(account)}
                  accessibilityRole="button"
                  accessibilityLabel={`${account.name}, archived`}
                  style={({ pressed }) => ({
                    minHeight: 58,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 16,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: theme.colors.border,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text style={[theme.text.body, { color: theme.colors.textSecondary, flex: 1 }]}>
                    {account.name}
                  </Text>
                  <Text style={[theme.text.caption, { color: theme.colors.textTertiary }]}>
                    Archived · {account.currency}
                  </Text>
                </Pressable>
              ))}
            </View>
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
