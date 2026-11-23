import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Keyboard,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  appAlert,
  Button,
  ChoiceChip,
  DatePickerSheet,
  FieldRow,
  PickerSheet,
  Sheet,
  TactilePressable,
  TextField,
} from "../../components/ui";
import { currencyLabel, currencyOptions } from "../../constants/currencies";
import { listAccounts } from "../../lib/db/repos/accounts";
import { listCategories } from "../../lib/db/repos/categories";
import {
  createRecurringRule,
  deleteRecurringRule,
  updateRecurringRule,
  type RecurringRuleDraft,
} from "../../lib/db/repos/recurring";
import { getAllSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import type { Account, Category, Db, RecurringRule } from "../../lib/db/types";
import { addDays, isIsoDate, toIsoDate } from "../../lib/domain/dates";
import { firstDueOnOrAfter, frequencyLabel } from "../../lib/domain/recurrence";
import {
  decimalPlaces,
  minorToDecimalString,
  parseMoneyInput,
  sanitizeMoneyInput,
} from "../../lib/format/money";
import { haptics } from "../../lib/haptics";
import { useAfterKeyboardDismiss } from "../../lib/keyboard";
import { notifyLedgerChanged } from "../../lib/ledgerEvents";
import { FONT_FAMILIES, useTheme } from "../../lib/theme";
import { processDueRecurring } from "./processDue";
import { refreshReminders, requestReminderPermission } from "./reminders";

type PickTarget = "account" | "category" | "currency" | "frequency" | "start" | "end" | null;

/**
 * One sheet for add and edit. The schedule is stored as an anchor (start date +
 * calendar cadence), never as "last due + interval", so the 31st survives February.
 * Editing preserves `next_due_at` unless the cadence itself changed; already posted
 * entries are never rewritten.
 */
export function RecurringEditorSheet({
  visible = true,
  rule,
  onClose,
  onClosed,
  onSaved,
}: {
  visible?: boolean;
  rule?: RecurringRule | null;
  onClose: () => void;
  onClosed?: () => void;
  onSaved: () => void;
}) {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const [today, setToday] = useState(() => toIsoDate(new Date()));
  const editing = Boolean(rule);

  const [type, setType] = useState<"expense" | "income">(
    rule?.type === "income" ? "income" : "expense",
  );
  const [currency, setCurrency] = useState(rule?.currency ?? "USD");
  const [amountText, setAmountText] = useState(
    rule ? minorToDecimalString(rule.amountMinor, rule.currency) : "",
  );
  const [feeText, setFeeText] = useState(
    rule && rule.feeMinor > 0 ? minorToDecimalString(rule.feeMinor, rule.currency) : "",
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState<string | null>(rule?.accountId ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(rule?.categoryId ?? null);
  const [itemName, setItemName] = useState(rule?.itemName ?? "");
  const [place, setPlace] = useState(rule?.place ?? "");
  const [note, setNote] = useState(rule?.note ?? "");
  const [frequency, setFrequency] = useState<RecurringRule["frequency"]>(
    rule?.frequency ?? "monthly",
  );
  const [intervalText, setIntervalText] = useState(String(rule?.intervalCount ?? 1));
  const [dayText, setDayText] = useState(
    String(rule?.dayOfMonth ?? Number((rule?.startDate ?? today).slice(8, 10))),
  );
  const [startDate, setStartDate] = useState(rule?.startDate ?? today);
  const [endDate, setEndDate] = useState<string | null>(rule?.endDate ?? null);
  const [autoPost, setAutoPost] = useState(rule?.autoPost ?? false);
  const [remindOn, setRemindOn] = useState((rule?.remindDays ?? 0) > 0);
  const [remindDaysText, setRemindDaysText] = useState(
    String(rule?.remindDays && rule.remindDays > 0 ? rule.remindDays : 3),
  );
  const [picker, setPicker] = useState<PickTarget>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const runAfterKeyboard = useAfterKeyboardDismiss();
  const openPicker = (next: Exclude<PickTarget, null>) => {
    runAfterKeyboard(() => setPicker(next));
  };

  const openKey = visible ? (rule?.id ?? "new") : null;
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(openKey);
  if (openKey !== null && openKey !== lastOpenKey) {
    const freshToday = toIsoDate(new Date());
    setLastOpenKey(openKey);
    setToday(freshToday);
    setType(rule?.type === "income" ? "income" : "expense");
    setCurrency(rule?.currency ?? "USD");
    setAmountText(rule ? minorToDecimalString(rule.amountMinor, rule.currency) : "");
    setFeeText(
      rule && rule.feeMinor > 0 ? minorToDecimalString(rule.feeMinor, rule.currency) : "",
    );
    setAccountId(rule?.accountId ?? null);
    setCategoryId(rule?.categoryId ?? null);
    setItemName(rule?.itemName ?? "");
    setPlace(rule?.place ?? "");
    setNote(rule?.note ?? "");
    setFrequency(rule?.frequency ?? "monthly");
    setIntervalText(String(rule?.intervalCount ?? 1));
    setDayText(String(rule?.dayOfMonth ?? Number((rule?.startDate ?? freshToday).slice(8, 10))));
    setStartDate(rule?.startDate ?? freshToday);
    setEndDate(rule?.endDate ?? null);
    setAutoPost(rule?.autoPost ?? false);
    setRemindOn((rule?.remindDays ?? 0) > 0);
    setRemindDaysText(String(rule?.remindDays && rule.remindDays > 0 ? rule.remindDays : 3));
    setPicker(null);
    setLoading(true);
    setSaving(false);
    setError(null);
  } else if (openKey === null && lastOpenKey !== null) {
    setLastOpenKey(null);
    setPicker(null);
  }

  useEffect(() => {
    if (!visible) {
      savingRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setToday(toIsoDate(new Date()));
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    Promise.all([
      getAllSettings(db),
      listAccounts(db, { includeArchived: Boolean(rule) }),
      listCategories(db, { includeArchived: true }),
    ])
      .then(([settings, nextAccounts, nextCategories]) => {
        if (cancelled) return;
        const active = rule?.currency ?? settings[SETTING_KEYS.currency] ?? "USD";
        const visibleAccounts = nextAccounts.filter(
          (account) => !account.isArchived || account.id === rule?.accountId,
        );
        const inCurrency = visibleAccounts.filter((account) => account.currency === active);

        setCurrency(active);
        setAccounts(visibleAccounts);
        setCategories(nextCategories);
        setAccountId((current) => {
          if (current && inCurrency.some((account) => account.id === current)) return current;
          return inCurrency[0]?.id ?? null;
        });
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(`Could not load the rule: ${String(cause)}`);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [db, rule, visible]);

  const currencyAccounts = useMemo(
    () => accounts.filter((account) => account.currency === currency),
    [accounts, currency],
  );
  const kindCategories = useMemo(() => {
    const archivedIds = new Set(categories.filter((c) => c.isArchived).map((c) => c.id));
    return categories.filter((category) => {
      if (category.kind !== type) return false;
      if (category.id === categoryId || category.id === rule?.categoryId) return true;
      if (category.isArchived) return false;
      if (category.parentId && archivedIds.has(category.parentId)) return false;
      return true;
    });
  }, [categories, categoryId, rule?.categoryId, type]);
  const selectedAccount = currencyAccounts.find((account) => account.id === accountId) ?? null;
  const selectedCategory = kindCategories.find((category) => category.id === categoryId) ?? null;

  const changeCurrency = (next: string) => {
    if (next === currency) return;
    const prevExp = decimalPlaces(currency);
    const nextExp = decimalPlaces(next);
    setCurrency(next);
    if (prevExp !== nextExp) {
      setAmountText("");
      setFeeText("");
    } else {
      setAmountText((current) => sanitizeMoneyInput(current, next));
      setFeeText((current) => sanitizeMoneyInput(current, next));
    }
    setAccountId(accounts.find((account) => account.currency === next)?.id ?? null);
    setError(null);
  };

  const changeType = (next: "expense" | "income") => {
    if (next === type || saving) return;
    haptics.selection();
    setType(next);
    setCategoryId(null);
    // Income has no fee to deduct; clearing avoids a fee silently applying later.
    if (next === "income") setFeeText("");
  };

  const save = async () => {
    if (savingRef.current || saving) return;
    const amountMinor = amountText ? parseMoneyInput(amountText, currency) : null;

    if (!amountMinor || amountMinor <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!accountId) {
      setError("Choose an account in this currency.");
      return;
    }
    const feeMinor = feeText.trim() ? parseMoneyInput(feeText, currency) : 0;
    if (feeMinor === null) {
      setError("Enter a valid fee, or leave it blank.");
      return;
    }
    if (feeMinor > 0 && type === "income") {
      setError("Income cannot carry a fee.");
      return;
    }
    if (!isIsoDate(startDate)) {
      setError("Choose a valid start date.");
      return;
    }
    if (endDate && (!isIsoDate(endDate) || endDate < startDate)) {
      setError("End date must be on or after the start date.");
      return;
    }

    const parsedInterval = intervalText.trim() ? Math.trunc(Number(intervalText)) : 1;
    if (!Number.isFinite(parsedInterval) || parsedInterval < 1 || parsedInterval > 999) {
      setError("Repeat interval must be between 1 and 999.");
      return;
    }

    let dayOfMonth: number | null = null;
    if (frequency === "monthly" || frequency === "yearly") {
      const parsedDay = dayText.trim()
        ? Math.trunc(Number(dayText))
        : Number(startDate.slice(8, 10));
      if (!Number.isFinite(parsedDay) || parsedDay < 1 || parsedDay > 31) {
        setError("Day of month must be between 1 and 31.");
        return;
      }
      dayOfMonth = parsedDay;
    }

    let remindDays = 0;
    if (remindOn) {
      const parsedRemind = remindDaysText.trim() ? Math.trunc(Number(remindDaysText)) : 3;
      if (!Number.isFinite(parsedRemind) || parsedRemind < 1 || parsedRemind > 60) {
        setError("Reminder lead time must be between 1 and 60 days.");
        return;
      }
      remindDays = parsedRemind;
    }

    const schedule = {
      frequency,
      intervalCount: parsedInterval,
      dayOfMonth,
      startDate,
      endDate,
    };

    const scheduleChanged =
      Boolean(rule) &&
      (rule!.frequency !== frequency ||
        rule!.intervalCount !== parsedInterval ||
        rule!.dayOfMonth !== dayOfMonth ||
        rule!.startDate !== startDate ||
        rule!.endDate !== endDate);

    const finishedSentinel = endDate ? addDays(endDate, 1) : startDate;
    const nextDueAt = rule
      ? scheduleChanged
        ? (firstDueOnOrAfter(schedule, today) ?? finishedSentinel)
        : rule.nextDueAt
      : (firstDueOnOrAfter(schedule, startDate) ?? finishedSentinel);

    const draft: RecurringRuleDraft = {
      type,
      amountMinor,
      feeMinor,
      currency,
      accountId,
      categoryId,
      itemName: itemName.trim().slice(0, 80) || null,
      place: place.trim() || null,
      note: note.trim() || null,
      frequency: schedule.frequency,
      intervalCount: schedule.intervalCount,
      dayOfMonth: schedule.dayOfMonth,
      startDate,
      endDate,
      nextDueAt,
      autoPost,
      remindDays,
    };

    savingRef.current = true;
    setSaving(true);
    setError(null);
    Keyboard.dismiss();

    try {
      if (rule) {
        await updateRecurringRule(db, rule.id, draft);
      } else {
        await createRecurringRule(db, draft);
      }
      if (autoPost) {
        await processDueRecurring(db);
      }

      if (remindOn) {
        const permission = await requestReminderPermission();
        if (permission === "granted") await refreshReminders(db);
      } else {
        await refreshReminders(db);
      }

      notifyLedgerChanged();
      haptics.success();
      savingRef.current = false;
      onSaved();
    } catch (cause) {
      haptics.error();
      setError(`Not saved: ${String(cause)}`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const remove = () => {
    if (!rule || savingRef.current || saving) return;
    appAlert(
      "Delete this recurring rule?",
      "Entries it already posted stay in Activity. Future occurrences will stop.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (savingRef.current) return;
            savingRef.current = true;
            setSaving(true);
            setError(null);
            deleteRecurringRule(db, rule.id)
              .then(() => refreshReminders(db))
              .then(() => {
                notifyLedgerChanged();
                haptics.error();
                savingRef.current = false;
                onSaved();
              })
              .catch((cause: unknown) => {
                setError(`Not deleted: ${String(cause)}`);
              })
              .finally(() => {
                savingRef.current = false;
                setSaving(false);
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
      dismissible={!saving}
      title={editing ? "Edit recurring rule" : "New recurring rule"}
      footer={
        <Button
          label={editing ? "Save changes" : "Add recurring rule"}
          variant="accent"
          onPress={() => void save()}
          loading={saving}
          disabled={saving || loading}
        />
      }
      overlayChildren={
        <>
          <PickerSheet
            embedded
            visible={picker === "currency"}
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
            onClose={() => setPicker(null)}
          />
          <PickerSheet
            embedded
            visible={picker === "account"}
            title="Account"
            options={currencyAccounts.map((account) => ({
              value: account.id,
              label: account.isArchived ? `${account.name} (archived)` : account.name,
              secondary: account.type,
            }))}
            selected={accountId ?? undefined}
            onSelect={(value) => setAccountId(value)}
            onClose={() => setPicker(null)}
          />
          <PickerSheet
            embedded
            visible={picker === "category"}
            title="Category"
            options={kindCategories.map((category) => ({
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
            embedded
            visible={picker === "frequency"}
            title="Repeats"
            options={[
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
              { value: "yearly", label: "Yearly" },
            ]}
            selected={frequency}
            onSelect={(value) => setFrequency(value as RecurringRule["frequency"])}
            onClose={() => setPicker(null)}
          />
          <DatePickerSheet
            embedded
            visible={picker === "start"}
            value={startDate}
            onSelect={(nextStart) => {
              setStartDate(nextStart);
              setError(null);
            }}
            onClose={() => setPicker(null)}
            title="Start date"
          />
          <DatePickerSheet
            embedded
            visible={picker === "end"}
            value={endDate ?? addDays(startDate, 30)}
            onSelect={(nextEnd) => {
              setEndDate(nextEnd);
              setError(null);
            }}
            onClose={() => setPicker(null)}
            title="End date"
          />
        </>
      }
    >
      <ScrollView
        style={{ flexGrow: 0, flexShrink: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
      >
        <View style={{ paddingHorizontal: 20, flexDirection: "row", gap: 8 }}>
          <ChoiceChip
            label="Expense"
            selected={type === "expense"}
            onPress={() => changeType("expense")}
            disabled={saving}
          />
          <ChoiceChip
            label="Income"
            selected={type === "income"}
            onPress={() => changeType("income")}
            disabled={saving}
          />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 10 }}>
          <TextField
            label="Amount"
            value={amountText}
            onChangeText={(value) => setAmountText(sanitizeMoneyInput(value, currency))}
            placeholder="0"
            keyboardType={decimalPlaces(currency) === 0 ? "number-pad" : "decimal-pad"}
            inputMode={decimalPlaces(currency) === 0 ? "numeric" : "decimal"}
            editable={!saving}
            helper={`${currency} · ${type === "income" ? "Income" : "Expense"}`}
          />
          {type === "expense" ? (
            <TextField
              label="Fee (optional)"
              value={feeText}
              onChangeText={(value) => setFeeText(sanitizeMoneyInput(value, currency))}
              placeholder="0"
              keyboardType={decimalPlaces(currency) === 0 ? "number-pad" : "decimal-pad"}
              inputMode={decimalPlaces(currency) === 0 ? "numeric" : "decimal"}
              editable={!saving}
              helper={`${currency} · charged on every occurrence`}
            />
          ) : null}
          <TextField
            label="What is it?"
            value={itemName}
            onChangeText={(value) => setItemName(value.slice(0, 80))}
            placeholder="Rent, salary, phone bill…"
            maxLength={80}
            editable={!saving}
          />
        </View>

        <View
          style={{
            marginHorizontal: 20,
            marginTop: 12,
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radius.card,
            borderCurve: "continuous",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.cardBorder,
            overflow: "hidden",
          }}
        >
          <FieldRow
            label="Currency"
            value={currency}
            showDivider
            onPress={loading || saving ? undefined : () => openPicker("currency")}
            muted={loading || saving}
          />
          <FieldRow
            label="Account"
            value={selectedAccount?.name ?? "Choose account"}
            showDivider
            onPress={saving ? undefined : () => openPicker("account")}
            muted={saving}
          />
          <FieldRow
            label="Category"
            value={selectedCategory?.name ?? "Uncategorized"}
            onPress={saving ? undefined : () => openPicker("category")}
            muted={saving}
          />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>Schedule</Text>
        </View>

        <View
          style={{
            marginHorizontal: 20,
            marginTop: 8,
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radius.card,
            borderCurve: "continuous",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.cardBorder,
            overflow: "hidden",
          }}
        >
          <FieldRow
            label="Repeats"
            value={frequencyLabel(frequency, Math.max(1, Number(intervalText) || 1))}
            onPress={saving ? undefined : () => openPicker("frequency")}
            muted={saving}
          />
          {frequency !== "daily" && frequency !== "weekly" ? (
            <View
              style={{
                minHeight: 52,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.colors.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Text style={[theme.text.body, { color: theme.colors.textPrimary, flex: 1 }]}>
                Day of month
              </Text>
              <TextInput
                value={dayText}
                onChangeText={(value) => setDayText(value.replace(/\D/g, "").slice(0, 2))}
                keyboardType="number-pad"
                editable={!saving}
                accessibilityLabel="Day of month"
                style={[
                  theme.text.body,
                  {
                    color: theme.colors.textSecondary,
                    width: 52,
                    textAlign: "right",
                    fontVariant: ["tabular-nums"],
                  },
                ]}
              />
            </View>
          ) : null}
          <View
            style={{
              minHeight: 52,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.colors.border,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Text style={[theme.text.body, { color: theme.colors.textPrimary, flex: 1 }]}>
              Every
            </Text>
            <TextInput
              value={intervalText}
              onChangeText={(value) => setIntervalText(value.replace(/\D/g, "").slice(0, 3))}
              keyboardType="number-pad"
              editable={!saving}
              accessibilityLabel="Interval"
              style={[
                theme.text.body,
                {
                  color: theme.colors.textSecondary,
                  width: 52,
                  textAlign: "right",
                  fontVariant: ["tabular-nums"],
                },
              ]}
            />
            <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>
              {frequency === "daily"
                ? "days"
                : frequency === "weekly"
                  ? "weeks"
                  : frequency === "monthly"
                    ? "months"
                    : "years"}
            </Text>
          </View>
          <FieldRow
            label="Starts"
            value={startDate}
            showDivider
            onPress={saving ? undefined : () => openPicker("start")}
            muted={saving}
          />
          <FieldRow
            label="Ends"
            value={endDate ?? "No end date"}
            onPress={saving ? undefined : () => openPicker("end")}
            muted={saving}
          />
        </View>

        {endDate ? (
          <TactilePressable
            onPress={() => setEndDate(null)}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Clear end date"
            hitSlop={8}
            scaleTo={0.95}
            style={{ alignSelf: "flex-end", paddingHorizontal: 22, paddingTop: 6 }}
          >
            <Text style={[theme.text.caption, { color: theme.colors.accent, fontFamily: FONT_FAMILIES.medium }]}>
              Clear end date
            </Text>
          </TactilePressable>
        ) : null}

        <View
          style={{
            marginHorizontal: 20,
            marginTop: 12,
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radius.card,
            borderCurve: "continuous",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.cardBorder,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              minHeight: 56,
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[theme.text.body, { color: theme.colors.textPrimary }]}>
                Post automatically
              </Text>
              <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>
                Posts missed occurrences once, on the next open.
              </Text>
            </View>
            <Switch
              value={autoPost}
              onValueChange={setAutoPost}
              disabled={saving}
              trackColor={{ false: theme.colors.surfaceSunken, true: theme.colors.accent }}
              thumbColor={theme.colors.surface}
              accessibilityLabel="Post automatically"
            />
          </View>
          <View
            style={{
              minHeight: 56,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.colors.border,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[theme.text.body, { color: theme.colors.textPrimary }]}>
                Remind me
              </Text>
              <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>
                A notification at 9:00, before the bill.
              </Text>
            </View>
            <Switch
              value={remindOn}
              onValueChange={setRemindOn}
              disabled={saving}
              trackColor={{ false: theme.colors.surfaceSunken, true: theme.colors.accent }}
              thumbColor={theme.colors.surface}
              accessibilityLabel="Remind me"
            />
          </View>
          {remindOn ? (
            <View
              style={{
                minHeight: 52,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.colors.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Text style={[theme.text.body, { color: theme.colors.textPrimary, flex: 1 }]}>
                Days before
              </Text>
              <TextInput
                value={remindDaysText}
                onChangeText={(value) => setRemindDaysText(value.replace(/\D/g, "").slice(0, 2))}
                keyboardType="number-pad"
                editable={!saving}
                accessibilityLabel="Days before the bill"
                style={[
                  theme.text.body,
                  {
                    color: theme.colors.textSecondary,
                    width: 52,
                    textAlign: "right",
                    fontVariant: ["tabular-nums"],
                  },
                ]}
              />
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 8 }}>
          <TextField
            label="Place (optional)"
            value={place}
            onChangeText={setPlace}
            placeholder="Where it comes from"
            editable={!saving}
          />
          <TextField
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="Anything to remember"
            editable={!saving}
          />
        </View>

        {error ? (
          <Text
            style={[
              theme.text.caption,
              { color: theme.colors.danger, paddingHorizontal: 20, paddingTop: 10 },
            ]}
          >
            {error}
          </Text>
        ) : null}

        {editing ? (
          <TactilePressable
            onPress={remove}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Delete recurring rule"
            hitSlop={8}
            scaleTo={0.96}
            style={{
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
              opacity: saving ? 0.5 : 1,
            }}
          >
            <Text style={[theme.text.caption, { color: theme.colors.danger, fontFamily: FONT_FAMILIES.semibold }]}>
              Delete this rule
            </Text>
          </TactilePressable>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}
