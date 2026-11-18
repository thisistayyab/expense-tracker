import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  appAlert,
  AppIcon,
  Button,
  ChoiceChip,
  FieldRow,
  PickerSheet,
  Sheet,
} from "../../components/ui";
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
  parseMoneyInput,
  sanitizeMoneyInput,
} from "../../lib/format/money";
import { useAfterKeyboardDismiss } from "../../lib/keyboard";
import { notifyLedgerChanged } from "../../lib/ledgerEvents";
import { FONT_FAMILIES, useTheme } from "../../lib/theme";
import { ACCOUNT_TYPES } from "./accountMeta";

export type AccountEditorSheetProps = {
  visible?: boolean;
  account?: Account | null;
  balanceMinor?: number;
  hasTransactions?: boolean;
  hasRecurringRules?: boolean;
  activeCurrency: string;
  onClose: () => void;
  onClosed?: () => void;
  onSaved: () => void;
};

export function AccountEditorSheet({
  visible = true,
  account = null,
  balanceMinor = 0,
  hasTransactions = false,
  hasRecurringRules = false,
  activeCurrency,
  onClose,
  onClosed,
  onSaved,
}: AccountEditorSheetProps) {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "cash");
  const [currency, setCurrency] = useState(account?.currency ?? activeCurrency);
  const [negative, setNegative] = useState((account?.openingBalanceMinor ?? 0) < 0);
  const [openingText, setOpeningText] = useState(
    account ? minorToDecimalString(Math.abs(account.openingBalanceMinor), account.currency) : "",
  );
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const runAfterKeyboard = useAfterKeyboardDismiss();

  const openKey = visible ? `${account?.id ?? "new"}:${activeCurrency}` : null;
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(openKey);
  if (openKey !== null && openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    setName(account?.name ?? "");
    setType(account?.type ?? "cash");
    setCurrency(account?.currency ?? activeCurrency);
    setNegative((account?.openingBalanceMinor ?? 0) < 0);
    setOpeningText(
      account ? minorToDecimalString(Math.abs(account.openingBalanceMinor), account.currency) : "",
    );
    setCurrencyOpen(false);
    setBusy(false);
    setError(null);
  } else if (openKey === null && lastOpenKey !== null) {
    setLastOpenKey(null);
    setCurrencyOpen(false);
  }

  useEffect(() => {
    if (!visible) {
      busyRef.current = false;
    }
  }, [visible]);

  const currencyLocked = Boolean(account && (hasTransactions || hasRecurringRules));
  const currencyMeta = getCurrency(currency);
  const canSave = Boolean(name.trim()) && !busy;

  const changeCurrency = (next: string) => {
    if (next === currency) return;
    // Reinterpreting "12.50" as JPY would silently turn 12.50 into 1,250. Clear
    // the opening balance instead of converting or re-scaling it.
    setCurrency(next);
    setOpeningText("");
    setError(null);
  };

  const handleOpeningChange = (value: string) => {
    const trimmed = value.trimStart();
    if (trimmed.startsWith("-")) {
      setNegative(true);
      setOpeningText(sanitizeMoneyInput(trimmed.replace(/^-+/, ""), currency));
      return;
    }
    if (trimmed.startsWith("+")) {
      setNegative(false);
      setOpeningText(sanitizeMoneyInput(trimmed.replace(/^\++/, ""), currency));
      return;
    }
    setOpeningText(sanitizeMoneyInput(value, currency));
  };

  const save = () => {
    if (!canSave || busyRef.current) return;
    const absMinor = openingText.trim() ? parseMoneyInput(openingText, currency) : 0;
    if (absMinor === null) {
      setError("Opening balance needs a valid number.");
      return;
    }
    const openingBalanceMinor = negative && absMinor !== 0 ? -absMinor : absMinor;

    busyRef.current = true;
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
      .then(() => {
        busyRef.current = false;
        notifyLedgerChanged();
        onSaved();
      })
      .catch((cause: unknown) => {
        busyRef.current = false;
        setError(`Not saved: ${String(cause)}`);
        setBusy(false);
      });
  };

  const toggleArchive = () => {
    if (!account || busyRef.current || busy) return;
    const next = !account.isArchived;
    if (!next) {
      busyRef.current = true;
      setBusy(true);
      setAccountArchived(db, account.id, false)
        .then(() => {
          busyRef.current = false;
          notifyLedgerChanged();
          onSaved();
        })
        .catch((cause: unknown) => {
          busyRef.current = false;
          setError(`Could not restore: ${String(cause)}`);
          setBusy(false);
        });
      return;
    }

    const balanceLine =
      balanceMinor !== 0
        ? ` It still has a balance of ${formatMoney(balanceMinor, account.currency)}.`
        : "";
    appAlert(
      `Archive ${account.name}?`,
      `History stays viewable and this account disappears from pickers.${balanceLine}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => {
            if (busyRef.current) return;
            busyRef.current = true;
            setBusy(true);
            setAccountArchived(db, account.id, true)
              .then(() => {
                busyRef.current = false;
                notifyLedgerChanged();
                onSaved();
              })
              .catch((cause: unknown) => {
                busyRef.current = false;
                setError(`Could not archive: ${String(cause)}`);
                setBusy(false);
              });
          },
        },
      ],
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      dismissible={!busy}
      title={account ? "Edit account" : "New account"}
      footer={
        <View style={{ gap: 8 }}>
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
      }
      overlayChildren={
        <PickerSheet
          embedded
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
      }
    >
      <ScrollView
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
              minHeight: 50,
              borderRadius: theme.radius.input,
              borderCurve: "continuous",
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.cardBorder,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: theme.colors.surfaceMuted,
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
          {ACCOUNT_TYPES.map((entry) => {
            const selected = type === entry.value;
            return (
              <ChoiceChip
                key={entry.value}
                label={entry.label}
                selected={selected}
                leading={
                  <AppIcon
                    name={entry.icon}
                    size={14}
                    color={selected ? theme.colors.solidFg : theme.colors.textSecondary}
                  />
                }
                onPress={() => setType(entry.value)}
                disabled={busy}
              />
            );
          })}
        </View>

        <View
          style={{
            marginTop: 16,
            borderRadius: theme.radius.card,
            borderCurve: "continuous",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.cardBorder,
            overflow: "hidden",
            backgroundColor: theme.colors.surfaceMuted,
          }}
        >
          <FieldRow
            label="Currency"
            value={currencyLabel(currencyMeta)}
            onPress={
              currencyLocked || busy ? undefined : () => runAfterKeyboard(() => setCurrencyOpen(true))
            }
            muted={currencyLocked}
          />
          <View
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.colors.border,
              paddingHorizontal: 16,
              paddingVertical: 14,
              gap: 8,
            }}
          >
            <Text style={[theme.text.label, { color: theme.colors.textSecondary }]}>
              Opening balance
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <ChoiceChip
                label="Positive (+)"
                selected={!negative}
                onPress={() => setNegative(false)}
                disabled={busy}
              />
              <ChoiceChip
                label="Debt (−)"
                selected={negative}
                onPress={() => setNegative(true)}
                disabled={busy}
              />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {negative ? (
                <Text
                  style={[
                    theme.text.title2,
                    { color: theme.colors.danger, fontVariant: ["tabular-nums"] },
                  ]}
                >
                  −
                </Text>
              ) : null}
              <TextInput
                value={openingText}
                onChangeText={handleOpeningChange}
                placeholder="0"
                placeholderTextColor={theme.colors.textTertiary}
                accessibilityLabel={`Opening balance in ${currency}${negative ? " (debt)" : ""}`}
                keyboardType={currencyMeta.exponent === 0 ? "number-pad" : "decimal-pad"}
                editable={!busy}
                style={[
                  theme.text.title2,
                  {
                    flex: 1,
                    color: negative ? theme.colors.danger : theme.colors.textPrimary,
                    paddingVertical: 4,
                    fontVariant: ["tabular-nums"],
                  },
                ]}
              />
            </View>
            <Text style={[theme.text.caption, { color: theme.colors.textTertiary }]}>
              {currencyMeta.code} · choose Debt (−) if a card starts with a balance owed
            </Text>
          </View>
        </View>

        {currencyLocked ? (
          <Text style={[theme.text.caption, { color: theme.colors.textTertiary, marginTop: 8 }]}>
            Currency is fixed because this account already has history or recurring rules. Editing
            history never converts money.
          </Text>
        ) : null}

        {account ? (
          <Text style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 14 }]}>
            Current balance:{" "}
            <Text style={{ color: theme.colors.textPrimary, fontFamily: FONT_FAMILIES.semibold }}>
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
    </Sheet>
  );
}
