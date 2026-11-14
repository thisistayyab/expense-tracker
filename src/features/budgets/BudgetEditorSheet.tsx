import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Button, ChoiceChip, Sheet } from "../../components/ui";
import { getCurrency } from "../../constants/currencies";
import { deactivateBudget, upsertBudget } from "../../lib/db/repos/budgets";
import type { Budget, BudgetPeriod, Db } from "../../lib/db/types";
import { PERIOD_LABELS } from "../../lib/domain/budget-period";
import {
  decimalPlaces,
  minorToDecimalString,
  parseMoneyInput,
  sanitizeMoneyInput,
} from "../../lib/format/money";
import { haptics } from "../../lib/haptics";
import { useTheme } from "../../lib/theme";

export type BudgetEditorSheetProps = {
  visible: boolean;
  currency: string;
  period: BudgetPeriod;
  /** Kept from the existing row so an edit never moves a weekly anchor. */
  startDate: string;
  /** null = the overall budget. */
  categoryId: string | null;
  title: string;
  existing: Budget | null;
  /** Prefill for a budget being recreated in a new currency. */
  initialLimitMinor?: number;
  onClose: () => void;
  onSaved: (budget: Budget) => void;
};

function bump(text: string, factor: number, currency: string): string {
  const current = parseMoneyInput(text, currency);
  const next = Math.max(1, Math.round((current ?? 0) * factor));
  return minorToDecimalString(next, currency);
}

/**
 * Create or edit one limit. There is no transaction here: a budget is a standing
 * instruction, so editing it never rewrites the spending it is measured against.
 */
export function BudgetEditorSheet({
  visible,
  currency,
  period,
  startDate,
  categoryId,
  title,
  existing,
  initialLimitMinor,
  onClose,
  onSaved,
}: BudgetEditorSheetProps) {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const [text, setText] = useState(() => {
    if (existing) return minorToDecimalString(existing.limitMinor, currency);
    if (initialLimitMinor) return minorToDecimalString(initialLimitMinor, currency);
    return "";
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minor = parseMoneyInput(text, currency);
  const valid = minor !== null && minor > 0;
  const exponent = decimalPlaces(currency);
  const symbol = getCurrency(currency).symbol;
  const placeholder = exponent === 0 ? "0" : exponent === 3 ? "0.000" : "0.00";

  const save = () => {
    if (saving || minor === null || minor <= 0) return;
    setSaving(true);
    setError(null);
    upsertBudget(db, {
      categoryId,
      period,
      limitMinor: minor,
      currency,
      // A monthly limit keeps counting; the start date only matters for weekly
      // anchoring, so an edit preserves the original one.
      startDate,
      rollover: existing?.rollover ?? false,
    })
      .then((saved) => {
        haptics.success();
        onSaved(saved);
      })
      .catch((cause: unknown) => {
        haptics.error();
        setError(`Could not save this limit: ${String(cause)}`);
      })
      .finally(() => setSaving(false));
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert(
      "Remove this limit?",
      "Spending is untouched. Overview simply stops using this number.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            deactivateBudget(db, existing.id)
              .then(() => {
                haptics.success();
                onSaved(existing);
              })
              .catch((cause: unknown) => {
                setError(`Could not remove this limit: ${String(cause)}`);
              });
          },
        },
      ],
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 14 }}
      >
        <Text style={[theme.text.caption, { color: theme.colors.textTertiary }]}>
          {`${PERIOD_LABELS[period]} limit · ${currency}`}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 6,
          }}
        >
          <Text
            maxFontSizeMultiplier={1.3}
            style={[theme.text.title2, { color: theme.colors.textSecondary, lineHeight: 60 }]}
          >
            {symbol}
          </Text>
          <TextInput
            value={text}
            onChangeText={(next) => setText(sanitizeMoneyInput(next, currency))}
            keyboardType={exponent === 0 ? "number-pad" : "decimal-pad"}
            inputMode={exponent === 0 ? "numeric" : "decimal"}
            accessibilityLabel={`${title} amount in ${currency}`}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textTertiary}
            maxLength={12}
            maxFontSizeMultiplier={1.3}
            style={[
              theme.text.display,
              { color: theme.colors.textPrimary, minWidth: 120, lineHeight: 60 },
            ]}
          />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          <ChoiceChip
            label="+10%"
            selected={false}
            onPress={() => setText(bump(text, 1.1, currency))}
            accessibilityLabel="Increase by ten percent"
          />
          <ChoiceChip
            label="−10%"
            selected={false}
            onPress={() => setText(bump(text, 0.9, currency))}
            accessibilityLabel="Decrease by ten percent"
          />
          <ChoiceChip
            label="Clear"
            selected={false}
            onPress={() => setText("")}
            accessibilityLabel="Clear the amount"
          />
        </View>

        <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>
          {existing
            ? "Changing this only changes the number Overview measures against."
            : "You can change or remove this at any time. Nothing is converted."}
        </Text>

        {error ? (
          <Text style={[theme.text.caption, { color: theme.colors.danger }]}>{error}</Text>
        ) : null}

        <Button
          label={existing ? "Save limit" : "Set limit"}
          variant="accent"
          onPress={save}
          disabled={!valid}
          loading={saving}
        />
        {existing ? (
          <Pressable
            onPress={remove}
            accessibilityRole="button"
            accessibilityLabel="Remove this limit"
            style={({ pressed }) => ({ paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={[theme.text.label, { color: theme.colors.danger, textAlign: "center" }]}>
              Remove limit
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}
