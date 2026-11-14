import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";

import { Button, ChoiceChip, FieldRow, PickerSheet, Sheet } from "../../components/ui";
import { currencyLabel, currencyOptions, getCurrency } from "../../constants/currencies";
import {
  createAccount,
  setAccountArchived,
  updateAccount,
} from "../../lib/db/repos/accounts";
import type { Account, AccountType, Db } from "../../lib/db/types";
import {
  formatMoney,
  minorToDecimalString,
  parseSignedMoneyInput,
  sanitizeSignedMoneyInput,
} from "../../lib/format/money";
import { useTheme } from "../../lib/theme";
import { ACCOUNT_TYPES } from "./accountMeta";

export type AccountEditorSheetProps = {
  account?: Account | null;
  balanceMinor?: number;
  hasTransactions?: boolean;
  activeCurrency: string;
  onClose: () => void;
  onSaved: () => void;
};

export function AccountEditorSheet({
  account = null,
  balanceMinor = 0,
  hasTransactions = false,
  activeCurrency,
  onClose,
  onSaved,
}: AccountEditorSheetProps) {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "cash");
  const [currency, setCurrency] = useState(account?.currency ?? activeCurrency);
  const [openingText, setOpeningText] = useState(
    account ? minorToDecimalString(account.openingBalanceMinor, account.currency) : "",
  );
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencyLocked = Boolean(account && hasTransactions);
  const currencyMeta = getCurrency(currency);
  const canSave = Boolean(name.trim()) && !busy;

  const changeCurrency = (next: string) => {
    if (next === currency) return;
    // Reinterpreting "12.50" as JPY would silently turn 12.50 into 1,250. Clear
    // the opening balance instead of converting or re-scaling it.
    setCurrency(next);
    setOpeningText("");
  };

  const save = () => {
    if (!canSave) return;
    const openingBalanceMinor = openingText.trim()
      ? parseSignedMoneyInput(openingText, currency)
      : 0;
    if (openingBalanceMinor === null) {
      setError("Opening balance needs a valid number.");
      return;
    }

    setBusy(true);
    setError(null);
    const task = account
      ? updateAccount(db, account.id, {
          name,
          type,
          currency: currencyLocked ? undefined : currency,
          openingBalanceMinor,
        })
      : createAccount(db, {
          name,
          type,
          currency,
          openingBalanceMinor,
        });

    task
      .then(() => onSaved())
      .catch((cause: unknown) => {
        setError(`Not saved: ${String(cause)}`);
        setBusy(false);
      });
  };

  const toggleArchive = () => {
    if (!account) return;
    const next = !account.isArchived;
    if (!next) {
      setBusy(true);
      setAccountArchived(db, account.id, false)
        .then(onSaved)
        .catch((cause: unknown) => {
          setError(`Could not restore: ${String(cause)}`);
          setBusy(false);
        });
      return;
    }

    const balanceLine =
      balanceMinor !== 0
        ? ` It still has a balance of ${formatMoney(balanceMinor, account.currency)}.`
        : "";
    Alert.alert(
      `Archive ${account.name}?`,
      `History stays viewable and this account disappears from pickers.${balanceLine}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => {
            setBusy(true);
            setAccountArchived(db, account.id, true)
              .then(onSaved)
              .catch((cause: unknown) => {
                setError(`Could not archive: ${String(cause)}`);
                setBusy(false);
              });
          },
        },
      ],
    );
  };

  return (
    <Sheet visible onClose={onClose} title={account ? "Edit account" : "New account"}>
      <ScrollView
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[theme.text.label, { color: theme.colors.textSecondary, marginBottom: 6 }]}>
          Name
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Everyday account"
          placeholderTextColor={theme.colors.textTertiary}
          accessibilityLabel="Account name"
          maxLength={60}
          editable={!busy}
          style={[
            theme.text.body,
            {
              height: 50,
              borderRadius: 18,
              paddingHorizontal: 14,
              backgroundColor: theme.colors.surfaceSunken,
              color: theme.colors.textPrimary,
            },
          ]}
        />

        <Text
          style={[
            theme.text.label,
            { color: theme.colors.textSecondary, marginTop: 16, marginBottom: 8 },
          ]}
        >
          Type
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ACCOUNT_TYPES.map((entry) => (
            <ChoiceChip
              key={entry.value}
              label={entry.label}
              selected={type === entry.value}
              onPress={() => setType(entry.value)}
              disabled={busy}
            />
          ))}
        </View>

        <View
          style={{
            marginTop: 16,
            paddingHorizontal: 14,
            borderRadius: 20,
            backgroundColor: theme.colors.surfaceSunken,
          }}
        >
          <FieldRow
            label="Currency"
            value={currencyLabel(currencyMeta)}
            onPress={currencyLocked ? undefined : () => setCurrencyOpen(true)}
            muted={currencyLocked}
          />
          <View
            style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 10 }}
          >
            <Text style={[theme.text.label, { color: theme.colors.textSecondary }]}>
              Opening balance
            </Text>
            <TextInput
              value={openingText}
              onChangeText={(value) => setOpeningText(sanitizeSignedMoneyInput(value, currency))}
              placeholder="0"
              placeholderTextColor={theme.colors.textTertiary}
              accessibilityLabel={`Opening balance in ${currency}`}
              keyboardType={currencyMeta.exponent === 0 ? "number-pad" : "decimal-pad"}
              editable={!busy}
              style={[
                theme.text.title2,
                {
                  color: theme.colors.textPrimary,
                  paddingVertical: 4,
                  fontVariant: ["tabular-nums"],
                },
              ]}
            />
            <Text style={[theme.text.caption, { color: theme.colors.textTertiary }]}>
              {currencyMeta.code} · use a minus for a card that starts in debt
            </Text>
          </View>
        </View>

        {currencyLocked ? (
          <Text style={[theme.text.caption, { color: theme.colors.textTertiary, marginTop: 8 }]}>
            Currency is fixed because this account already has transactions. Editing history never
            converts money.
          </Text>
        ) : null}

        {account ? (
          <Text style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 14 }]}>
            Current balance:{" "}
            <Text style={{ color: theme.colors.textPrimary, fontWeight: "600" }}>
              {formatMoney(balanceMinor, account.currency)}
            </Text>
          </Text>
        ) : null}

        {error ? (
          <Text style={[theme.text.caption, { color: theme.colors.danger, marginTop: 10 }]}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 10, gap: 6 }}>
        <Button
          label={account ? "Save account" : "Add account"}
          variant="accent"
          onPress={save}
          loading={busy}
          disabled={!canSave}
        />
        {account ? (
          <Button
            label={account.isArchived ? "Restore account" : "Archive account"}
            variant="danger"
            size="sm"
            onPress={toggleArchive}
            disabled={busy}
          />
        ) : null}
      </View>

      <PickerSheet
        visible={currencyOpen}
        title="Currency"
        options={currencyOptions().map((entry) => ({
          value: entry.code,
          label: currencyLabel(entry),
          secondary: entry.name,
        }))}
        selected={currency}
        searchable
        searchPlaceholder="Search currencies"
        onSelect={changeCurrency}
        onClose={() => setCurrencyOpen(false)}
      />
    </Sheet>
  );
}
