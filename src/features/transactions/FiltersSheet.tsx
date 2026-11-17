import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button, ChoiceChip, DatePickerSheet, FieldRow, PickerSheet, Sheet } from "../../components/ui";
import type { Account, Category } from "../../lib/db/types";
import { toIsoDate } from "../../lib/domain/dates";
import { useTheme } from "../../lib/theme";
import {
  DATE_PRESET_LABELS,
  EMPTY_FILTERS,
  type DateFilterPreset,
  type TransactionFilters,
} from "./filters";

export type FiltersSheetProps = {
  visible?: boolean;
  value: TransactionFilters;
  accounts: Account[];
  categories: Category[];
  currencies: { currency: string; count: number }[];
  onApply: (next: TransactionFilters) => void;
  onClose: () => void;
  onClosed?: () => void;
};

type PickerKind = "account" | "category" | "currency" | null;
type DateField = "fromDate" | "toDate" | null;

const DATE_CHOICES: DateFilterPreset[] = [
  "all",
  "today",
  "this_month",
  "last_month",
  "last_7",
  "last_30",
  "custom",
];

function GroupLabel({ children }: { children: string }) {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        theme.text.eyebrow,
        { color: theme.colors.textTertiary, marginTop: 18, marginBottom: 8 },
      ]}
    >
      {children}
    </Text>
  );
}

function Chips({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
}

/**
 * Draft filters only touch the list on Apply. Reset applies the empty filters
 * immediately, which is what makes the no-results "Clear filters" action honest.
 */
export function FiltersSheet({
  visible = true,
  value,
  accounts,
  categories,
  currencies,
  onApply,
  onClose,
  onClosed,
}: FiltersSheetProps) {
  const { theme } = useTheme();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [draft, setDraft] = useState<TransactionFilters>(value);
  const [picker, setPicker] = useState<PickerKind>(null);
  const [dateField, setDateField] = useState<DateField>(null);
  const [today, setToday] = useState(() => toIsoDate(new Date()));

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setDraft(value);
      setPicker(null);
      setDateField(null);
      setToday(toIsoDate(new Date()));
    }
  }

  const accountLabel =
    accounts.find((account) => account.id === draft.accountId)?.name ?? "All accounts";
  const categoryLabel =
    categories.find((category) => category.id === draft.categoryId)?.name ?? "All categories";
  const currencyLabel = draft.currency ?? "All currencies";

  const rangeInvalid = Boolean(
    draft.datePreset === "custom" &&
      draft.fromDate &&
      draft.toDate &&
      draft.fromDate > draft.toDate,
  );

  const setDatePreset = (datePreset: DateFilterPreset) => {
    setDraft((current) => ({
      ...current,
      datePreset,
      ...(datePreset === "custom"
        ? { fromDate: current.fromDate, toDate: current.toDate }
        : { fromDate: null, toDate: null }),
    }));
  };

  const reset = () => {
    setDraft(EMPTY_FILTERS);
    onApply(EMPTY_FILTERS);
  };

  const childPickers = (
    <>
      <PickerSheet
        embedded
        visible={picker === "account"}
        title="Account"
        options={[
          { value: "", label: "All accounts" },
          ...accounts.map((account) => ({
            value: account.id,
            label: account.name,
            secondary: account.currency,
          })),
        ]}
        selected={draft.accountId ?? ""}
        onSelect={(accountId) =>
          setDraft((current) => ({ ...current, accountId: accountId || null }))
        }
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        embedded
        visible={picker === "category"}
        title="Category"
        options={[
          { value: "", label: "All categories" },
          ...categories.map((category) => ({
            value: category.id,
            label: category.name,
            secondary: category.kind,
          })),
        ]}
        selected={draft.categoryId ?? ""}
        searchable
        searchPlaceholder="Search categories"
        onSelect={(categoryId) =>
          setDraft((current) => ({ ...current, categoryId: categoryId || null }))
        }
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        embedded
        visible={picker === "currency"}
        title="Currency"
        options={[
          { value: "", label: "All currencies" },
          ...currencies.map(({ currency, count }) => ({
            value: currency,
            label: currency,
            secondary: `${count} ${count === 1 ? "entry" : "entries"}`,
          })),
        ]}
        selected={draft.currency ?? ""}
        onSelect={(currency) =>
          setDraft((current) => ({ ...current, currency: currency || null }))
        }
        onClose={() => setPicker(null)}
      />
      <DatePickerSheet
        embedded
        visible={dateField !== null}
        value={(dateField ? draft[dateField] : null) ?? today}
        onSelect={(iso) => {
          if (!dateField) return;
          setDraft((current) => ({
            ...current,
            [dateField]: iso,
          }));
        }}
        onClose={() => setDateField(null)}
      />
    </>
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      overlayChildren={childPickers}
      title="Filters"
    >
      <ScrollView
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <GroupLabel>Date</GroupLabel>
        <Chips>
          {DATE_CHOICES.map((preset) => (
            <ChoiceChip
              key={preset}
              label={DATE_PRESET_LABELS[preset]}
              selected={draft.datePreset === preset}
              tone="accent"
              onPress={() => setDatePreset(preset)}
            />
          ))}
        </Chips>

        {draft.datePreset === "custom" ? (
          <View
            style={{
              marginTop: 10,
              borderRadius: theme.radius.card,
              borderCurve: "continuous",
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.cardBorder,
              overflow: "hidden",
              backgroundColor: theme.colors.surfaceMuted,
            }}
          >
            <FieldRow
              label="From"
              value={draft.fromDate ?? "Choose date"}
              showDivider
              onPress={() => setDateField("fromDate")}
            />
            <FieldRow
              label="To"
              value={draft.toDate ?? "Choose date"}
              onPress={() => setDateField("toDate")}
            />
          </View>
        ) : null}
        {rangeInvalid ? (
          <Text style={[theme.text.caption, { color: theme.colors.danger, marginTop: 8 }]}>
            The start date must be before the end date.
          </Text>
        ) : null}

        <GroupLabel>Type</GroupLabel>
        <Chips>
          {(["all", "expense", "income", "transfer"] as const).map((type) => (
            <ChoiceChip
              key={type}
              label={type === "all" ? "Any type" : type.charAt(0).toUpperCase() + type.slice(1)}
              selected={draft.type === type}
              tone="accent"
              onPress={() => setDraft((current) => ({ ...current, type }))}
            />
          ))}
        </Chips>

        <GroupLabel>Account and category</GroupLabel>
        <View
          style={{
            borderRadius: theme.radius.card,
            borderCurve: "continuous",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.cardBorder,
            overflow: "hidden",
            backgroundColor: theme.colors.surfaceMuted,
          }}
        >
          <FieldRow label="Account" value={accountLabel} showDivider onPress={() => setPicker("account")} />
          <FieldRow
            label="Category"
            value={categoryLabel}
            showDivider={currencies.length > 1}
            onPress={() => setPicker("category")}
          />
          {currencies.length > 1 ? (
            <FieldRow
              label="Currency"
              value={currencyLabel}
              onPress={() => setPicker("currency")}
            />
          ) : null}
        </View>

        <GroupLabel>Other</GroupLabel>
        <Chips>
          <ChoiceChip
            label="Any note"
            selected={!draft.notePresent}
            tone="accent"
            onPress={() => setDraft((current) => ({ ...current, notePresent: false }))}
          />
          <ChoiceChip
            label="Has note"
            selected={draft.notePresent}
            tone="accent"
            onPress={() => setDraft((current) => ({ ...current, notePresent: true }))}
          />
        </Chips>
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          paddingHorizontal: 20,
          paddingTop: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Button label="Reset" variant="ghost" size="sm" onPress={reset} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Apply"
            variant="accent"
            size="sm"
            disabled={rangeInvalid}
            onPress={() => onApply(draft)}
          />
        </View>
      </View>
    </Sheet>
  );
}

/** Small helper for the filter bar's date badge. */
export function dateFilterLabel(filters: TransactionFilters): string | null {
  if (filters.datePreset === "all") return null;
  if (filters.datePreset !== "custom") return DATE_PRESET_LABELS[filters.datePreset];
  if (filters.fromDate && filters.toDate) {
    return `${filters.fromDate} → ${filters.toDate}`;
  }
  if (filters.fromDate) return `From ${filters.fromDate}`;
  if (filters.toDate) return `Until ${filters.toDate}`;
  return "Custom range";
}

