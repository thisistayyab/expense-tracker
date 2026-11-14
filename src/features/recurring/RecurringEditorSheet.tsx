import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  Button,
  ChoiceChip,
  DatePickerSheet,
  FieldRow,
  PickerSheet,
  Sheet,
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
import { useTheme } from "../../lib/theme";
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
  rule,
  onClose,
  onSaved,
}: {
  rule?: RecurringRule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const today = useMemo(() => toIsoDate(new Date()), []);
  const editing = Boolean(rule);

  const [type, setType] = useState<"expense" | "income">(
    rule?.type === "income" ? "income" : "expense",
  );
  const [currency, setCurrency] = useState(rule?.currency ?? "USD");
  const [amountText, setAmountText] = useState(
    rule ? minorToDecimalString(rule.amountMinor, rule.currency) : "",
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

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAllSettings(db),
      listAccounts(db, { includeArchived: false }),
      listCategories(db, { includeArchived: Boolean(rule) }),
    ])
      .then(([settings, nextAccounts, nextCategories]) => {
        if (cancelled) return;
        const active = rule?.currency ?? settings[SETTING_KEYS.currency] ?? "USD";
        const inCurrency = nextAccounts.filter((account) => account.currency === active);

        setCurrency(active);
        setAccounts(nextAccounts);
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
  }, [db, rule]);

  const currencyAccounts = useMemo(
    () => accounts.filter((account) => account.currency === currency),
    [accounts, currency],
  );
  const kindCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.kind === type && (!category.isArchived || category.id === categoryId),
      ),
    [categories, categoryId, type],
  );
  const selectedAccount = currencyAccounts.find((account) => account.id === accountId) ?? null;
  const selectedCategory = kindCategories.find((category) => category.id === categoryId) ?? null;

  const changeCurrency = (next: string) => {
    setCurrency(next);
    setAccountId(accounts.find((account) => account.currency === next)?.id ?? null);
    setError(null);
  };

  const changeType = (next: "expense" | "income") => {
    if (next === type) return;
    haptics.selection();
    setType(next);
    setCategoryId(null);
  };

  const save = async () => {
    if (savingRef.current) return;
    const amountMinor = amountText ? parseMoneyInput(amountText, currency) : null;

    if (!amountMinor || amountMinor <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!accountId) {
      setError("Choose an account in this currency.");
      return;
    }
    if (!isIsoDate(startDate)) {
      setError("Choose a valid start date.");
      return;
    }

    const interval = Math.max(1, Math.min(999, Math.trunc(Number(intervalText) || 1)));
    const dayOfMonth =
      frequency === "monthly" || frequency === "yearly"
        ? Math.min(31, Math.max(1, Math.trunc(Number(dayText) || Number(startDate.slice(8, 10)))))
        : null;
    const schedule = {
      frequency,
      intervalCount: interval,
      dayOfMonth,
      startDate,
      endDate,
    };

    const scheduleChanged =
      Boolean(rule) &&
      (rule!.frequency !== frequency ||
        rule!.intervalCount !== interval ||
        rule!.dayOfMonth !== dayOfMonth ||
        rule!.startDate !== startDate ||
        rule!.endDate !== endDate);

    const nextDueAt = rule
      ? scheduleChanged
        ? (firstDueOnOrAfter(schedule, today) ?? startDate)
        : rule.nextDueAt
      : startDate;

    const remindDays = remindOn
      ? Math.min(60, Math.max(1, Math.trunc(Number(remindDaysText) || 3)))
      : 0;

    const draft: RecurringRuleDraft = {
      type,
      amountMinor,
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
        // A backdated rule should backfill immediately, not wait for the next launch.
        if (autoPost) await processDueRecurring(db);
      }

      if (remindOn) {
        const permission = await requestReminderPermission();
        if (permission === "granted") await refreshReminders(db);
      } else {
        await refreshReminders(db);
      }

      haptics.success();
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
    if (!rule) return;
    Alert.alert(
      "Delete this recurring rule?",
      "Entries it already posted stay in Activity. Future occurrences will stop.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteRecurringRule(db, rule.id)
              .then(() => refreshReminders(db))
              .then(() => {
                haptics.error();
                onSaved();
              })
              .catch((cause: unknown) => setError(`Not deleted: ${String(cause)}`));
          },
        },
      ],
    );
  };

  return (
    <Sheet visible onClose={onClose} title={editing ? "Edit recurring rule" : "New recurring rule"}>
      <ScrollView
        style={{ flexGrow: 0, flexShrink: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        <View style={{ paddingHorizontal: 20, flexDirection: "row", gap: 8 }}>
          <ChoiceChip label="Expense" selected={type === "expense"} onPress={() => changeType("expense")} />
          <ChoiceChip label="Income" selected={type === "income"} onPress={() => changeType("income")} />
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
            backgroundColor: theme.colors.surfaceSunken,
            borderRadius: 22,
            paddingHorizontal: 16,
          }}
        >
          <FieldRow
            label="Currency"
            value={currency}
            onPress={loading || saving ? undefined : () => setPicker("currency")}
          />
          <FieldRow
            label="Account"
            value={selectedAccount?.name ?? "Choose account"}
            showDivider
            onPress={saving ? undefined : () => setPicker("account")}
          />
          <FieldRow
            label="Category"
            value={selectedCategory?.name ?? "Uncategorized"}
            showDivider
            onPress={saving ? undefined : () => setPicker("category")}
          />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>Schedule</Text>
        </View>

        <View
          style={{
            marginHorizontal: 20,
            marginTop: 8,
            backgroundColor: theme.colors.surfaceSunken,
            borderRadius: 22,
            paddingHorizontal: 16,
          }}
        >
          <FieldRow
            label="Repeats"
            value={frequencyLabel(frequency, Number(intervalText) || 1)}
            onPress={saving ? undefined : () => setPicker("frequency")}
          />
          {frequency !== "daily" && frequency !== "weekly" ? (
            <View
              style={{
                minHeight: 52,
                borderTopWidth: 1,
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
                  { color: theme.colors.textSecondary, width: 52, textAlign: "right" },
                ]}
              />
            </View>
          ) : null}
          <View
            style={{
              minHeight: 52,
              borderTopWidth: 1,
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
                { color: theme.colors.textSecondary, width: 52, textAlign: "right" },
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
            onPress={saving ? undefined : () => setPicker("start")}
          />
          <FieldRow
            label="Ends"
            value={endDate ?? "No end date"}
            showDivider
            onPress={saving ? undefined : () => setPicker("end")}
          />
        </View>

        {endDate ? (
          <Pressable
            onPress={() => setEndDate(null)}
            accessibilityRole="button"
            accessibilityLabel="Clear end date"
            style={{ alignSelf: "flex-end", paddingHorizontal: 22, paddingTop: 6 }}
          >
            <Text style={[theme.text.caption, { color: theme.colors.accent }]}>Clear end date</Text>
          </Pressable>
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
          <View style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
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
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
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
                borderTopWidth: 1,
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
                  { color: theme.colors.textSecondary, width: 52, textAlign: "right" },
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
          <Pressable
            onPress={remove}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Delete recurring rule"
            style={{ alignItems: "center", paddingVertical: 12 }}
          >
            <Text style={[theme.text.caption, { color: theme.colors.danger }]}>
              Delete this rule
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        <Button
          label={editing ? "Save changes" : "Add recurring rule"}
          variant="accent"
          onPress={() => void save()}
          loading={saving}
          disabled={saving || loading}
        />
      </View>

      <PickerSheet
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
        visible={picker === "account"}
        title="Account"
        options={currencyAccounts.map((account) => ({
          value: account.id,
          label: account.name,
          secondary: account.type,
        }))}
        selected={accountId ?? undefined}
        onSelect={(value) => setAccountId(value)}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
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
      {picker === "start" ? (
        <DatePickerSheet
          visible
          value={startDate}
          onSelect={setStartDate}
          onClose={() => setPicker(null)}
          title="Start date"
        />
      ) : null}
      {picker === "end" ? (
        <DatePickerSheet
          visible
          value={endDate ?? addDays(today, 30)}
          onSelect={setEndDate}
          onClose={() => setPicker(null)}
          title="End date"
        />
      ) : null}
    </Sheet>
  );
}
