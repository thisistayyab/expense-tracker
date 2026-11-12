import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Card, SectionHeader } from "../components/ui";
import { clearTransactions, insertFixtureTransactions } from "../lib/db/fixtures";
import { migrate } from "../lib/db/migrate";
import { listAccounts } from "../lib/db/repos/accounts";
import { listCategories } from "../lib/db/repos/categories";
import { getAllSettings, SETTING_KEYS } from "../lib/db/repos/settings";
import {
  countTransactions,
  listCurrenciesInUse,
  listTransactions,
} from "../lib/db/repos/transactions";
import type { Db } from "../lib/db/types";
import { formatMoney } from "../lib/format/money";
import { useTheme } from "../lib/theme";

type Snapshot = {
  transactions: number;
  categories: number;
  accounts: number;
  schemaVersion: number;
  currency: string;
  currencies: { currency: string; count: number }[];
  recent: { id: string; title: string; amountMinor: number; currency: string; localDate: string }[];
};

const EMPTY: Snapshot = {
  transactions: 0,
  categories: 0,
  accounts: 0,
  schemaVersion: 0,
  currency: "USD",
  currencies: [],
  recent: [],
};

/**
 * Dev-only data tools: prove that rows persist across a restart, that migrations
 * re-run as a no-op, and that 12 months of fixtures can be generated for perf work.
 */
export default function DevDataScreen() {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSnapshot = useCallback(async (): Promise<Snapshot> => {
    const [settings, accounts, categories, currencies, recent, versionRow] = await Promise.all([
      getAllSettings(db),
      listAccounts(db),
      listCategories(db),
      listCurrenciesInUse(db),
      listTransactions(db, { limit: 5 }),
      db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"),
    ]);

    return {
      transactions: await countTransactions(db),
      categories: categories.length,
      accounts: accounts.length,
      schemaVersion: versionRow?.user_version ?? 0,
      currency: settings[SETTING_KEYS.currency] ?? "USD",
      currencies,
      recent: recent.map((row) => ({
        id: row.id,
        title: row.itemName ?? row.place ?? "Untitled",
        amountMinor: row.amountMinor,
        currency: row.currency,
        localDate: row.localDate,
      })),
    };
  }, [db]);

  const refresh = useCallback(async () => {
    setSnapshot(await loadSnapshot());
  }, [loadSnapshot]);

  // Load after mount from a promise callback: setting state synchronously in an
  // effect body would cause a cascading render.
  useEffect(() => {
    let cancelled = false;
    loadSnapshot()
      .then((next) => {
        if (!cancelled) setSnapshot(next);
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessage(String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [loadSnapshot]);

  const run = async (label: string, task: () => Promise<string>) => {
    setBusy(true);
    setMessage(null);
    try {
      setMessage(await task());
      await refresh();
    } catch (error) {
      setMessage(`${label} failed: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const insertFixtures = () =>
    run("Insert fixtures", async () => {
      const [account] = await listAccounts(db);
      if (!account) throw new Error("no account — restart the app to seed one");
      const result = await insertFixtureTransactions(db, {
        accountId: account.id,
        currency: snapshot.currency,
        months: 12,
        count: 2000,
      });
      return `Inserted ${result.inserted} rows across ${result.categoriesUsed} categories in ${snapshot.currency}.`;
    });

  const wipeTransactions = () =>
    run("Clear transactions", async () => {
      const removed = await clearTransactions(db);
      return `Deleted ${removed} rows. Categories, accounts and settings are untouched.`;
    });

  const rerunMigrations = () =>
    run("Re-run migrations", async () => {
      const result = await migrate(db);
      return result.applied.length
        ? `Applied ${result.applied.join(", ")} (now v${result.to}).`
        : `No-op: already at v${result.to}.`;
    });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["left", "right"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
            Phase 1 · data layer
          </Text>
          <Text
            style={[theme.text.title2, { color: theme.colors.textPrimary, marginBottom: 4 }]}
          >
            {snapshot.transactions.toLocaleString()} transactions · schema v{snapshot.schemaVersion}
          </Text>
          <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
            {snapshot.categories} categories · {snapshot.accounts} accounts · active currency{" "}
            {snapshot.currency}
          </Text>

          {snapshot.currencies.length > 1 ? (
            <Text style={[theme.text.caption, { color: theme.colors.textTertiary, marginTop: 8 }]}>
              Currencies in data:{" "}
              {snapshot.currencies
                .map((row) => `${row.currency} (${row.count})`)
                .join(" · ")}
            </Text>
          ) : null}

          <SectionHeader title="Recent rows" />
          <Card>
            {snapshot.recent.length ? (
              snapshot.recent.map((row, index) => (
                <View
                  key={row.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 8,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: theme.colors.border,
                  }}
                >
                  <View style={{ flexShrink: 1 }}>
                    <Text style={[theme.text.bodyStrong, { color: theme.colors.textPrimary }]}>
                      {row.title}
                    </Text>
                    <Text style={[theme.text.caption, { color: theme.colors.textTertiary }]}>
                      {row.localDate}
                    </Text>
                  </View>
                  <Text style={[theme.text.body, { color: theme.colors.textPrimary }]}>
                    {formatMoney(row.amountMinor, row.currency)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[theme.text.body, { color: theme.colors.textTertiary }]}>
                No rows yet. Insert fixtures below, then kill and relaunch the app — the count
                should survive.
              </Text>
            )}
          </Card>

          <SectionHeader title="Actions" />
          <View style={{ gap: 10 }}>
            <Button
              label="Insert 12 months · 2,000 rows"
              onPress={insertFixtures}
              disabled={busy}
            />
            <Button
              label="Re-run migrations (must be a no-op)"
              variant="ghost"
              onPress={rerunMigrations}
              disabled={busy}
            />
            <Button
              label="Delete all transactions"
              variant="ghost"
              onPress={wipeTransactions}
              disabled={busy}
            />
          </View>

          {message ? (
            <Text
              style={[
                theme.text.caption,
                { color: theme.colors.textSecondary, marginTop: 16, lineHeight: 18 },
              ]}
            >
              {message}
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
