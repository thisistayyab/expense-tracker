import { useSQLiteContext } from "expo-sqlite";
import { useRef, useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";

import { Button, ChoiceChip, Sheet, TactilePressable } from "../../components/ui";
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
  /** `YYYY-MM` of the month the editor was opened for. */
  month: string;
  /** "November 2026", shown on the month-scope chip. */
  monthLabel: string;
  /** True when `month` is the month containing today. */
  isCurrentMonth: boolean;
  /** Kept from the existing row so an edit never moves a weekly anchor. */
  startDate: string;
  /** null = the overall budget. */
  categoryId: string | null;
  title: string;
  /** The every-month limit, if one exists. */
  standing: Budget | null;
  /** The limit for `month` only, if one exists. */
  monthly: Budget | null;
  /** Prefill for a budget being recreated in a new currency. */
  initialLimitMinor?: number;
  /** Keeps a recreated month limit scoped to that month instead of every month. */
  initialScope?: Scope;
  onClose: () => void;
  onClosed?: () => void;
  onSaved: (budget: Budget) => void;
  onRemoved?: (budget: Budget) => void;
};

type Scope = "standing" | "month";

function bump(text: string, factor: number, currency: string): string {
  const current = parseMoneyInput(text, currency);
  const next = Math.max(1, Math.round((current ?? 0) * factor));
  return minorToDecimalString(next, currency);
}

/**
 * Create or edit one limit. There is no transaction here: a budget is a standing
 * instruction, so editing it never rewrites the spending it is measured against.
 *
 * Monthly budgets are edited at one of two scopes: the every-month limit, or a
 * limit for the month shown. A month limit wins for that month only; removing it
 * falls back to the every-month limit instead of leaving the month unbudgeted.
 */
export function BudgetEditorSheet({
  visible,
  currency,
  period,
  month,
  monthLabel,
  isCurrentMonth,
  startDate,
  categoryId,
  title,
  standing,
  monthly,
  initialLimitMinor,
  initialScope,
  onClose,
  onClosed,
  onSaved,
  onRemoved,
}: BudgetEditorSheetProps) {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const monthlyPeriod = period === "monthly";
  const [scope, setScope] = useState<Scope>(() => {
    if (!monthlyPeriod) return "standing";
    if (initialScope) return initialScope;
    if (monthly) return "month";
    // Setting a limit while browsing another month should not silently change every
    // month; the current month keeps today's "every month" default.
    return isCurrentMonth ? "standing" : "month";
  });
  const [text, setText] = useState(() => {
    // A recreate starts from the old currency's number even if this currency already
    // has a limit, which is the number the user asked to copy.
    if (initialLimitMinor) return minorToDecimalString(initialLimitMinor, currency);
    const existing = monthly ?? standing;
    if (existing) return minorToDecimalString(existing.limitMinor, currency);
    return "";
  });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const target = scope === "month" ? monthly : standing;
  const minor = parseMoneyInput(text, currency);
  const valid = minor !== null && minor > 0;
  const exponent = decimalPlaces(currency);
  const symbol = getCurrency(currency).symbol;
  const placeholder = exponent === 0 ? "0" : exponent === 3 ? "0.000" : "0.00";

  const pickScope = (next: Scope) => {
    if (saving || next === scope) return;
    const nextTarget = next === "month" ? monthly : standing;
    if (nextTarget) setText(minorToDecimalString(nextTarget.limitMinor, currency));
    setScope(next);
    setError(null);
  };

  const save = () => {
    if (savingRef.current || saving || minor === null || minor <= 0) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    upsertBudget(db, {
      categoryId,
      period,
      month: scope === "month" ? month : null,
      limitMinor: minor,
      currency,
      // A monthly limit keeps counting; the start date only matters for weekly
      // anchoring, so an edit preserves the original one.
      startDate: target?.startDate ?? startDate,
      rollover: target?.rollover ?? false,
    })
      .then((saved) => {
        haptics.success();
        onSaved(saved);
      })
      .catch((cause: unknown) => {
        haptics.error();
        setError(`Could not save this limit: ${String(cause)}`);
      })
      .finally(() => {
        savingRef.current = false;
        setSaving(false);
      });
  };

  const remove = () => {
    if (!target || savingRef.current || saving) return;
    const monthScope = scope === "month";
    Alert.alert(
      monthScope ? `Remove the ${monthLabel} limit?` : "Remove this limit?",
      monthScope
        ? "This month falls back to the every-month limit. Spending is untouched."
        : "Spending is untouched. Overview simply stops using this number.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            if (savingRef.current) return;
            savingRef.current = true;
            setSaving(true);
            deactivateBudget(db, target.id)
              .then(() => {
                haptics.success();
                if (onRemoved) onRemoved(target);
                else onSaved(target);
              })
              .catch((cause: unknown) => {
                setError(`Could not remove this limit: ${String(cause)}`);
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
      title={title}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, gap: 14 }}
      >
        <Text style={[theme.text.caption, { color: theme.colors.textTertiary }]}>
          {`${PERIOD_LABELS[period]} limit · ${currency}`}
        </Text>

        {monthlyPeriod ? (
          <View style={{ gap: 8 }}>
            <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>
              Applies to
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <ChoiceChip
                label="Every month"
                selected={scope === "standing"}
                disabled={saving}
                onPress={() => pickScope("standing")}
                accessibilityLabel="Apply this limit to every month"
              />
              <ChoiceChip
                label={monthLabel}
                selected={scope === "month"}
                disabled={saving}
                onPress={() => pickScope("month")}
                accessibilityLabel={`Apply this limit to ${monthLabel} only`}
              />
            </View>
            <Text style={[theme.text.caption, { color: theme.colors.textTertiary }]}>
              {scope === "month"
                ? `Only ${monthLabel} uses this number; every other month keeps its own.`
                : "Every month uses this number unless that month has its own limit."}
            </Text>
          </View>
        ) : null}

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
          {/* lineHeight would be clipped by iOS on a single-line input, so the
              row's centre alignment positions the amount instead. */}
          <TextInput
            value={text}
            onChangeText={(next) => setText(sanitizeMoneyInput(next, currency))}
            editable={!saving}
            keyboardType={exponent === 0 ? "number-pad" : "decimal-pad"}
            inputMode={exponent === 0 ? "numeric" : "decimal"}
            accessibilityLabel={`${title} amount in ${currency}`}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textTertiary}
            maxLength={12}
            maxFontSizeMultiplier={1.3}
            style={[
              theme.text.display,
              { color: theme.colors.textPrimary, minWidth: 120, paddingVertical: 0 },
            ]}
          />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          <ChoiceChip
            label="+10%"
            selected={false}
            disabled={saving}
            onPress={() => setText(bump(text, 1.1, currency))}
            accessibilityLabel="Increase by ten percent"
          />
          <ChoiceChip
            label="−10%"
            selected={false}
            disabled={saving}
            onPress={() => setText(bump(text, 0.9, currency))}
            accessibilityLabel="Decrease by ten percent"
          />
          <ChoiceChip
            label="Clear"
            selected={false}
            disabled={saving}
            onPress={() => setText("")}
            accessibilityLabel="Clear the amount"
          />
        </View>

        <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>
          {target
            ? scope === "month"
              ? "Changing this changes the number Overview measures against for this month."
              : "Changing this only changes the number Overview measures against."
            : "You can change or remove this at any time. Nothing is converted."}
        </Text>

        {error ? (
          <Text style={[theme.text.caption, { color: theme.colors.danger }]}>{error}</Text>
        ) : null}

        <Button
          label={target ? "Save limit" : "Set limit"}
          variant="accent"
          onPress={save}
          disabled={!valid || saving}
          loading={saving}
        />
        {target ? (
          <TactilePressable
            onPress={remove}
            disabled={saving}
            radius={12}
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel={scope === "month" ? "Remove this month's limit" : "Remove this limit"}
            style={{ paddingVertical: 8 }}
          >
            <Text style={[theme.text.label, { color: theme.colors.danger, textAlign: "center" }]}>
              {scope === "month" ? "Remove this month's limit" : "Remove limit"}
            </Text>
          </TactilePressable>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}
