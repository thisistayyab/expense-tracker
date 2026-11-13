import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button, DatePickerSheet, FieldRow, PickerSheet, Sheet } from "../../components/ui";
import { listAccounts } from "../../lib/db/repos/accounts";
import { listCategories } from "../../lib/db/repos/categories";
import { getAllSettings, SETTING_KEYS, setSettings } from "../../lib/db/repos/settings";
import {
  createTransaction,
  getTransaction,
  listRecentCategoryIds,
  listRecentItemNames,
  updateTransaction,
} from "../../lib/db/repos/transactions";
import type { Account, Category, Db, Transaction, TransactionType } from "../../lib/db/types";
import { addDays, toIsoDate } from "../../lib/domain/dates";
import {
  decimalPlaces,
  formatMoney,
  minorToDecimalString,
  parseMoneyInput,
  sanitizeMoneyInput,
} from "../../lib/format/money";
import { haptics } from "../../lib/haptics";
import { newId } from "../../lib/ids";
import { useTheme } from "../../lib/theme";
import { suggestCategoryId } from "./suggestions";

const MAX_NAME = 80;
const TYPE_LABELS: Record<TransactionType, string> = {
  expense: "Expense",
  income: "Income",
  transfer: "Transfer",
};

function dateLabel(iso: string, today: string): string {
  if (iso === today) {
    return `Today, ${new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}`;
  }
  if (iso === addDays(today, -1)) {
    return `Yesterday, ${new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}`;
  }
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export type AddTransactionSheetProps = {
  existing?: Transaction | null;
  /** Decimal amount from a widget/shortcut deep link; ignored when editing. */
  initialAmount?: string;
  /** Route params used by the Accounts screen for a transfer or a prefilled source. */
  initialType?: TransactionType;
  initialAccountId?: string;
  onClose: () => void;
  /**
   * Called as soon as a new row can be shown (optimistic), with the in-flight write
   * so undo can wait for the insert before deleting it. Edits are only reported
   * after the update lands, because the detail screen reloads immediately.
   */
  onSaved: (transaction: Transaction, isNew: boolean, persisted?: Promise<Transaction>) => void;
};

/**
 * The wedge (03 §3): the amount uses the native numeric keyboard, category comes
 * second, and everything else is optional. Keeping one input surface and a stable
 * layout means focusing any field only lifts the sheet, never collapses it.
 */
export function AddTransactionSheet({
  existing = null,
  initialAmount,
  initialType,
  initialAccountId,
  onClose,
  onSaved,
}: AddTransactionSheetProps) {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const today = useMemo(() => toIsoDate(new Date()), []);

  const [type, setType] = useState<TransactionType>(
    existing?.type ?? initialType ?? "expense",
  );
  const [currency, setCurrency] = useState(existing?.currency ?? "USD");
  const [amountText, setAmountText] = useState(
    existing
      ? minorToDecimalString(existing.amountMinor, existing.currency)
      : (initialAmount ?? ""),
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentNames, setRecentNames] = useState<string[]>([]);
  const [recentCategoryIds, setRecentCategoryIds] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [accountId, setAccountId] = useState<string | null>(
    existing?.accountId ?? initialAccountId ?? null,
  );
  const [transferAccountId, setTransferAccountId] = useState<string | null>(
    existing?.transferAccountId ?? null,
  );
  const [itemName, setItemName] = useState(existing?.itemName ?? "");
  const [place, setPlace] = useState(existing?.place ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [dateIso, setDateIso] = useState(existing?.localDate ?? today);
  const [detailsOpen, setDetailsOpen] = useState(Boolean(existing?.place || existing?.note));
  const [picker, setPicker] = useState<"category" | "account" | "transfer" | "date" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const amountMinor = amountText ? parseMoneyInput(amountText, currency) : null;

  useEffect(() => {
    let cancelled = false;
    const categoryKind = type === "income" ? "income" : "expense";

    getAllSettings(db)
      .then(async (settings) => {
        const active = existing?.currency ?? settings[SETTING_KEYS.currency] ?? "USD";
        const [allAccounts, kindCategories, recent, recentCategories] = await Promise.all([
          listAccounts(db, { includeArchived: Boolean(existing) }),
          listCategories(db, { kind: categoryKind, includeArchived: Boolean(existing) }),
          listRecentItemNames(db, {
            currency: active,
            sinceIso: addDays(today, -30),
          }),
          listRecentCategoryIds(db, { kind: categoryKind, currency: active }),
        ]);
        if (cancelled) return;

        const inCurrency = allAccounts.filter((account) => account.currency === active);
        const remembered = settings[SETTING_KEYS.lastAccountId];
        const nextAccountId =
          [accountId, remembered].find(
            (candidate): candidate is string =>
              Boolean(candidate) && inCurrency.some((account) => account.id === candidate),
          ) ??
          inCurrency[0]?.id ??
          null;

        setCurrency(active);
        setAmountText((current) => sanitizeMoneyInput(current, active));
        setAccounts(inCurrency);
        setCategories(kindCategories);
        setRecentNames(recent);
        setRecentCategoryIds(recentCategories);
        setAccountId(nextAccountId);
        setTransferAccountId((previous) => {
          if (
            previous &&
            previous !== nextAccountId &&
            inCurrency.some((account) => account.id === previous)
          ) {
            return previous;
          }
          return inCurrency.find((account) => account.id !== nextAccountId)?.id ?? null;
        });
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(`Could not open the capture form: ${String(loadError)}`);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, db, existing, today, type]);

  const selectedCategory = categories.find((category) => category.id === categoryId) ?? null;

  // Recently used categories move to the front; unused ones keep their sort order
  // underneath. Array.prototype.sort is stable, so equal ranks do not reshuffle.
  const selectableCategories = useMemo(
    () => categories.filter((category) => !category.isArchived || category.id === categoryId),
    [categories, categoryId],
  );

  const orderedCategories = useMemo(() => {
    if (!recentCategoryIds.length) return selectableCategories;
    const rank = new Map(recentCategoryIds.map((id, index) => [id, index]));
    return [...selectableCategories].sort((left, right) => {
      const leftRank = rank.get(left.id);
      const rightRank = rank.get(right.id);
      if (leftRank !== undefined && rightRank !== undefined) return leftRank - rightRank;
      if (leftRank !== undefined) return -1;
      if (rightRank !== undefined) return 1;
      return 0;
    });
  }, [recentCategoryIds, selectableCategories]);

  const visibleCategories = useMemo(() => {
    const base = orderedCategories.slice(0, 4);
    if (categoryId && !base.some((category) => category.id === categoryId)) {
      const selected = orderedCategories.find((category) => category.id === categoryId);
      if (selected) return [selected, ...base].slice(0, 4);
    }
    return base;
  }, [orderedCategories, categoryId]);

  const accountLabel =
    accounts.find((account) => account.id === accountId)?.name ?? "Choose account";
  const transferLabel =
    accounts.find((account) => account.id === transferAccountId)?.name ?? "Choose account";

  const canSave =
    !saving &&
    amountMinor !== null &&
    amountMinor > 0 &&
    Boolean(accountId) &&
    (type !== "transfer" || (Boolean(transferAccountId) && transferAccountId !== accountId));

  const changeType = (next: TransactionType) => {
    if (next === type || existing) return;
    haptics.selection();
    setType(next);
    setCategoryId(null);
    setError(null);
  };

  const applySuggestion = () => {
    if (categoryId || type === "transfer" || !itemName.trim()) return;
    suggestCategoryId(db, { itemName, place, currency })
      .then((suggested) => {
        if (suggested) setCategoryId((current) => current ?? suggested);
      })
      .catch(() => {});
  };

  const requestClose = useCallback(() => {
    if (saving) return;
    // Close the OS keyboard first so the discard dialog is never hidden behind it.
    Keyboard.dismiss();
    const dirty = Boolean(amountText || itemName.trim() || place.trim() || note.trim());
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert("Discard this entry?", "Nothing has been saved.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: onClose },
    ]);
  }, [amountText, itemName, note, onClose, place, saving]);

  // The add route is no longer an RN Modal, so it has no onRequestClose. Keep the
  // Android hardware back path going through the same discard confirmation.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      requestClose();
      return true;
    });
    return () => subscription.remove();
  }, [requestClose]);

  const save = () => {
    if (!canSave || savingRef.current || amountMinor === null || !accountId) return;
    savingRef.current = true;
    setSaving(true);
    Keyboard.dismiss();
    setError(null);

    const saveAccountId = accountId;
    const trimmedName = itemName.trim().slice(0, MAX_NAME) || null;
    const trimmedPlace = place.trim() || null;
    const trimmedNote = note.trim() || null;

    if (existing) {
      // An edit is only reported after it lands: the detail screen reloads on focus,
      // so handing it a row that is still being written would race the write.
      updateTransaction(db, existing.id, {
        amountMinor,
        accountId: saveAccountId,
        transferAccountId: type === "transfer" ? transferAccountId : null,
        categoryId: type === "transfer" ? existing.categoryId : categoryId,
        itemName: type === "transfer" ? existing.itemName : trimmedName,
        place: trimmedPlace,
        note: trimmedNote,
        occurredAt: existing.occurredAt,
        localDate: dateIso,
      })
        .then(() => getTransaction(db, existing.id))
        .then((saved) => {
          if (!saved) throw new Error("The row could not be read back after saving");
          haptics.success();
          onSaved(saved, false);
        })
        .catch((saveError: unknown) => {
          haptics.error();
          setError(`Not saved: ${String(saveError)}`);
        })
        .finally(() => {
          savingRef.current = false;
          setSaving(false);
        });
      return;
    }

    // Optimistic create: the sheet closes and undo appears now, while the insert
    // runs. Undo receives the promise and waits for the row to exist before deleting.
    const now = new Date().toISOString();
    const optimistic: Transaction = {
      id: newId(),
      type,
      amountMinor,
      currency,
      accountId: saveAccountId,
      transferAccountId: type === "transfer" ? transferAccountId : null,
      categoryId: type === "transfer" ? null : categoryId,
      itemName: type === "transfer" ? null : trimmedName,
      place: trimmedPlace,
      note: trimmedNote,
      occurredAt: now,
      localDate: dateIso,
      recurringId: null,
      createdAt: now,
      updatedAt: now,
    };

    const persisted = createTransaction(db, {
      id: optimistic.id,
      type,
      amountMinor,
      currency,
      accountId: saveAccountId,
      transferAccountId: optimistic.transferAccountId,
      categoryId: optimistic.categoryId,
      itemName: optimistic.itemName,
      place: trimmedPlace,
      note: trimmedNote,
      occurredAt: now,
      localDate: dateIso,
    }).then(async (created) => {
      // Remembering the account is a convenience, never a reason to report a failed
      // save after the row itself was written.
      await setSettings(db, { [SETTING_KEYS.lastAccountId]: saveAccountId }).catch(() => {});
      return created;
    });

    void persisted
      .catch((saveError: unknown) => {
        haptics.error();
        Alert.alert(
          "Not saved",
          `Your entry could not be stored. ${String(saveError)}`,
        );
      })
      .finally(() => {
        savingRef.current = false;
      });

    haptics.success();
    onSaved(optimistic, true, persisted);
  };

  const nameField = (
    <View
      style={{
        height: 50,
        borderRadius: 18,
        backgroundColor: theme.colors.surfaceSunken,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        paddingHorizontal: 14,
      }}
    >
      <Text style={[theme.text.body, { color: theme.colors.textTertiary }]}>✎</Text>
      <TextInput
        value={itemName}
        onChangeText={(value) => setItemName(value.slice(0, MAX_NAME))}
        onBlur={applySuggestion}
        placeholder="What was it?"
        placeholderTextColor={theme.colors.textTertiary}
        accessibilityLabel="Item name"
        maxLength={MAX_NAME}
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
        style={[
          theme.text.bodyStrong,
          { flex: 1, color: theme.colors.textPrimary, paddingVertical: 0 },
        ]}
      />
      {itemName ? (
        <Pressable
          onPress={() => setItemName("")}
          accessibilityRole="button"
          accessibilityLabel="Clear item name"
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={[theme.text.body, { color: theme.colors.textTertiary }]}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Sheet visible embedded onClose={requestClose}>
      {/* Header stays outside the scroll so Close is always reachable. The body
       * scrolls while the sheet is lifted above the keyboard; Save stays pinned. */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable
              onPress={requestClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.surfaceSunken,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={[theme.text.body, { color: theme.colors.textPrimary }]}>✕</Text>
            </Pressable>

            <View
              style={{
                flex: 1,
                flexDirection: "row",
                backgroundColor: theme.colors.surfaceSunken,
                borderRadius: 19,
                padding: 3,
                opacity: existing ? 0.55 : 1,
              }}
            >
              {(["expense", "income", "transfer"] as TransactionType[]).map((option) => {
                const active = option === type;
                return (
                  <Pressable
                    key={option}
                    disabled={Boolean(existing) || saving}
                    onPress={() => changeType(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: Boolean(existing) }}
                    accessibilityLabel={TYPE_LABELS[option]}
                    style={{
                      flex: 1,
                      height: 32,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? theme.colors.solid : "transparent",
                    }}
                  >
                    <Text
                      style={[
                        theme.text.caption,
                        {
                          color: active ? theme.colors.solidFg : theme.colors.textSecondary,
                          fontWeight: "600",
                        },
                      ]}
                    >
                      {TYPE_LABELS[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ width: 38 }} />
          </View>
      </View>

      <ScrollView
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={{ paddingBottom: 4 }}
        keyboardShouldPersistTaps="handled"
        pointerEvents={saving ? "none" : "auto"}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            paddingHorizontal: 20,
            alignItems: "center",
            paddingTop: 12,
            paddingBottom: 4,
          }}
        >
          <TextInput
            value={amountText}
            onChangeText={(value) => setAmountText(sanitizeMoneyInput(value, currency))}
            placeholder="0"
            placeholderTextColor={theme.colors.textTertiary}
            keyboardType={decimalPlaces(currency) === 0 ? "number-pad" : "decimal-pad"}
            inputMode={decimalPlaces(currency) === 0 ? "numeric" : "decimal"}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            editable={!saving}
            selectTextOnFocus
            accessibilityLabel={`Amount in ${currency}`}
            accessibilityValue={{
              text: formatMoney(amountMinor ?? 0, currency, { withCode: true }),
            }}
            maxLength={14}
            style={{
              width: "100%",
              textAlign: "center",
              fontSize: 54,
              lineHeight: 58,
              fontWeight: "700",
              letterSpacing: -2.2,
              fontVariant: ["tabular-nums"],
              paddingVertical: 0,
              color:
                amountMinor && amountMinor > 0
                  ? theme.colors.textPrimary
                  : theme.colors.textTertiary,
            }}
          />
          <Text style={[theme.text.caption, { color: theme.colors.accent, marginTop: 4 }]}>
            {currency} ·{" "}
            {type === "transfer" ? "Transfer" : (selectedCategory?.name ?? "Uncategorized")}
          </Text>
        </View>

        {type !== "transfer" ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingTop: 10 }}
            >
              {visibleCategories.map((category) => {
                const active = category.id === categoryId;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => {
                      haptics.selection();
                      setCategoryId((current) => (current === category.id ? null : category.id));
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={category.name}
                    style={{
                      height: 34,
                      paddingHorizontal: 14,
                      borderRadius: 17,
                      justifyContent: "center",
                      backgroundColor: active ? theme.colors.solid : theme.colors.surfaceSunken,
                    }}
                  >
                    <Text
                      style={[
                        theme.text.caption,
                        {
                          fontWeight: "600",
                          color: active ? theme.colors.solidFg : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setPicker("category")}
                accessibilityRole="button"
                accessibilityLabel="More categories"
                style={{
                  height: 34,
                  paddingHorizontal: 14,
                  borderRadius: 17,
                  justifyContent: "center",
                  backgroundColor: theme.colors.surfaceSunken,
                }}
              >
                <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>
                  More…
                </Text>
              </Pressable>
            </ScrollView>

            <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>{nameField}</View>

            {!itemName && recentNames.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  gap: 7,
                  paddingTop: 8,
                  alignItems: "center",
                }}
              >
                <Text style={[theme.text.caption, { color: theme.colors.textTertiary }]}>
                  Recent
                </Text>
                {recentNames.map((name) => (
                  <Pressable
                    key={name}
                    onPress={() => {
                      haptics.selection();
                      Keyboard.dismiss();
                      setItemName(name.slice(0, MAX_NAME));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${name}`}
                    style={{
                      height: 30,
                      paddingHorizontal: 12,
                      borderRadius: 15,
                      justifyContent: "center",
                      backgroundColor: theme.colors.surfaceSunken,
                    }}
                  >
                    <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>
                      {name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </>
        ) : null}

        <View
          style={{
            marginHorizontal: 20,
            marginTop: 12,
            backgroundColor: theme.colors.surfaceSunken,
            borderRadius: 22,
            paddingHorizontal: 16,
          }}
        >
            <FieldRow label={type === "transfer" ? "From account" : "Account"} value={accountLabel} onPress={() => setPicker("account")} />
            {type === "transfer" ? (
              <FieldRow
                label="To account"
                value={transferLabel}
                showDivider
                onPress={() => setPicker("transfer")}
              />
            ) : null}
            <FieldRow
              label="Date"
              value={dateLabel(dateIso, today)}
              showDivider
              onPress={() => setPicker("date")}
            />
            <FieldRow
              label="Note, place, tags…"
              value={detailsOpen ? "Hide" : undefined}
              muted={!detailsOpen}
              showDivider
              onPress={() => setDetailsOpen((open) => !open)}
            />
        </View>

        {detailsOpen ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 10, gap: 8 }}>
            <TextInput
              value={place}
              onChangeText={setPlace}
              onBlur={applySuggestion}
              placeholder="Place (optional)"
              placeholderTextColor={theme.colors.textTertiary}
              accessibilityLabel="Place"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              style={[
                theme.text.body,
                {
                  height: 46,
                  paddingHorizontal: 14,
                  borderRadius: 16,
                  backgroundColor: theme.colors.surfaceSunken,
                  color: theme.colors.textPrimary,
                },
              ]}
            />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Anything to remember? (optional)"
              placeholderTextColor={theme.colors.textTertiary}
              accessibilityLabel="Note"
              multiline
              style={[
                theme.text.body,
                {
                  minHeight: 46,
                  maxHeight: 88,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor: theme.colors.surfaceSunken,
                  color: theme.colors.textPrimary,
                },
              ]}
            />
          </View>
        ) : null}

        {error ? (
          <Text
            style={[
              theme.text.caption,
              { color: theme.colors.danger, paddingHorizontal: 20, paddingTop: 8 },
            ]}
          >
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        <Button
          label={existing ? "Update" : "Save"}
          variant="accent"
          onPress={save}
          disabled={!canSave}
          loading={saving}
        />
      </View>

      <PickerSheet
        visible={picker === "category"}
        title="Category"
        options={selectableCategories.map((category) => ({
          value: category.id,
          label: category.isArchived ? `${category.name} (archived)` : category.name,
        }))}
        selected={categoryId ?? undefined}
        searchable
        searchPlaceholder="Search categories"
        onSelect={(value) => setCategoryId(value)}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === "account"}
        title={type === "transfer" ? "From account" : "Account"}
        options={accounts.map((account) => ({
          value: account.id,
          label: account.name,
          secondary: account.type,
        }))}
        selected={accountId ?? undefined}
        onSelect={(value) => {
          setAccountId(value);
          setTransferAccountId((current) =>
            current === value
              ? accounts.find((account) => account.id !== value)?.id ?? null
              : current,
          );
        }}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === "transfer"}
        title="To account"
        options={accounts
          .filter((account) => account.id !== accountId)
          .map((account) => ({ value: account.id, label: account.name, secondary: account.type }))}
        selected={transferAccountId ?? undefined}
        onSelect={(value) => setTransferAccountId(value)}
        onClose={() => setPicker(null)}
      />
      {picker === "date" ? (
        <DatePickerSheet
          visible
          value={dateIso}
          onSelect={setDateIso}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </Sheet>
  );
}
