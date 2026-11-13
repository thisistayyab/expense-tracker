import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button, Money, Sheet } from "../../components/ui";
import type { BudgetPlan } from "../../lib/domain/budget-plan";
import { useTheme } from "../../lib/theme";

export type SafeToSpendSheetProps = {
  visible: boolean;
  plan: BudgetPlan;
  label: string;
  isCurrentPeriod: boolean;
  onClose: () => void;
  onOpenBudgets: () => void;
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
      }}
    >
      <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

/**
 * "Where did this number come from" — the same inputs as `buildBudgetPlan`, printed.
 * The hero and this sheet share one plan object, which is what makes them agree to
 * the cent (P4 gate).
 */
export function SafeToSpendSheet({
  visible,
  plan,
  label,
  isCurrentPeriod,
  onClose,
  onOpenBudgets,
}: SafeToSpendSheetProps) {
  const { theme } = useTheme();
  const currency = plan.currency;
  const amount = isCurrentPeriod ? plan.safePerDayMinor : plan.remainingMinor;

  return (
    <Sheet visible={visible} onClose={onClose} title="Safe to spend">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary, marginTop: 2 }]}>
          {isCurrentPeriod ? "Per day" : "Left over"}
        </Text>
        <Money
          minor={amount ?? 0}
          currency={currency}
          size="hero"
          tone="default"
          style={{ marginTop: 4 }}
        />
        <Text style={[theme.text.body, { color: theme.colors.textSecondary, marginTop: 6 }]}>
          {label}
        </Text>

        <View style={{ marginTop: 14 }}>
          <Row label="Overall limit">
            <Money minor={plan.overallLimitMinor ?? 0} currency={currency} />
          </Row>
          <Row label="Spent so far">
            <Money minor={plan.spentMinor} currency={currency} />
          </Row>
          {plan.committedCount > 0 ? (
            <Row label={`Bills not logged yet (${plan.committedCount})`}>
              <Money minor={plan.committedMinor} currency={currency} />
            </Row>
          ) : null}
          <Row label="Left to spend">
            <Money
              minor={plan.remainingMinor ?? 0}
              currency={currency}
              tone={(plan.remainingMinor ?? 0) < 0 ? "danger" : "default"}
            />
          </Row>
          <Row label={isCurrentPeriod ? "Days left" : "Period"}>
            <Text style={[theme.text.bodyStrong, { color: theme.colors.textPrimary }]}>
              {isCurrentPeriod ? String(plan.daysRemaining) : label}
            </Text>
          </Row>
        </View>

        <Text
          style={[
            theme.text.caption,
            { color: theme.colors.textTertiary, marginTop: 14, lineHeight: 18 },
          ]}
        >
          {isCurrentPeriod
            ? "Limit minus spending and bills you haven't logged yet, divided by the days left. Only expenses count; transfers never do."
            : "This period has finished, so there is no daily figure — what is left stays what is left."}
        </Text>

        <Button
          label="Review budgets"
          variant="ghost"
          size="sm"
          onPress={onOpenBudgets}
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </Sheet>
  );
}
