import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Button,
  Card,
  EmptyState,
  FieldRow,
  ListRow,
  Money,
  PickerSheet,
  ProgressBar,
  SectionHeader,
  TextField,
} from "../components/ui";
import { currencyOptions, getCurrency } from "../constants/currencies";
import { useTheme, type ThemePreference } from "../lib/theme";

const MONEY_SAMPLES = [
  { code: "USD", label: "US Dollar", minor: 1250 },
  { code: "EUR", label: "Euro", minor: 125000 },
  { code: "JPY", label: "Japanese Yen", minor: 12400 },
  { code: "KWD", label: "Kuwaiti Dinar", minor: 1250 },
] as const;

const PREFERENCES: readonly { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const BARS = [
  { label: "Groceries", value: 0.42 },
  { label: "Transport", value: 0.86 },
  { label: "Eating out", value: 1.12 },
] as const;

export default function FoundationsScreen() {
  const { theme, preference, setPreference, scheme } = useTheme();
  const [note, setNote] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);

  const currency = getCurrency(currencyCode);
  const currencyChoices = useMemo(
    () =>
      currencyOptions().map((item) => ({
        value: item.code,
        label: item.name,
        secondary: `${item.code} · ${item.displaySymbol}`,
      })),
    [],
  );

  const tile = (background: string) => (
    <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: background }} />
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      edges={["left", "right"]}
    >
      <ScrollView contentContainerStyle={{ padding: 20, gap: 4, paddingBottom: 48 }}>
        <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
          Expense Tracker · P0
        </Text>
        <Text
          style={[
            theme.text.title1,
            { color: theme.colors.textPrimary, marginTop: 2, marginBottom: 4 },
          ]}
        >
          Foundations
        </Text>
        <Text style={[theme.text.body, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
          Geist, tokens and the component kit on a token-driven canvas. Feature screens arrive in P2.
        </Text>

        <View
          style={{
            flexDirection: "row",
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: 19,
            padding: 3,
          }}
        >
          {PREFERENCES.map((option) => {
            const active = preference === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setPreference(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  height: 34,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 16,
                  backgroundColor: active ? theme.colors.solid : "transparent",
                }}
              >
                <Text
                  style={[
                    theme.text.label,
                    { color: active ? theme.colors.solidFg : theme.colors.textSecondary },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[theme.text.caption, { color: theme.colors.textTertiary, marginBottom: 12 }]}>
          Resolved scheme: {scheme} · font: Geist · DB: open with WAL
        </Text>

        <SectionHeader title="Money" actionLabel="All currencies" />
        <Card>
          {MONEY_SAMPLES.map((sample, index) => (
            <ListRow
              key={sample.code}
              title={sample.label}
              subtitle={`${sample.code} · ${sample.minor} minor units`}
              showDivider={index > 0}
              leading={tile(
                theme.tones[index % 2 === 0 ? "iris" : "mint"].background,
              )}
              trailing={<Money minor={sample.minor} currency={sample.code} />}
            />
          ))}
        </Card>

        <SectionHeader title="Progress" />
        <Card>
          <View style={{ gap: 16, paddingVertical: 4 }}>
            {BARS.map((bar) => (
              <View key={bar.label} style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={[theme.text.body, { color: theme.colors.textPrimary }]}>
                    {bar.label}
                  </Text>
                  <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>
                    {Math.round(bar.value * 100)}%
                  </Text>
                </View>
                <ProgressBar value={bar.value} />
              </View>
            ))}
          </View>
        </Card>

        <SectionHeader title="Entry" />
        <Card>
          <View style={{ gap: 14, paddingVertical: 2 }}>
            <TextField
              label="Note"
              value={note}
              onChangeText={setNote}
              placeholder="Anything to remember?"
              helper={`${note.length}/80`}
              maxLength={80}
            />
            <View>
              <FieldRow
                label="Currency"
                value={`${currency.code} · ${currency.name}`}
                onPress={() => setCurrencyPickerOpen(true)}
              />
              <FieldRow label="Country" value="United States" onPress={() => {}} showDivider />
            </View>
            <Money minor={1250} currency={currency.code} size="total" withCode={false} />
          </View>
        </Card>

        <View style={{ gap: 10, marginTop: 16 }}>
          <Button label="Primary action" onPress={() => {}} />
          <Button label="Accent action" variant="accent" onPress={() => {}} />
          <Button label="Ghost action" variant="ghost" onPress={() => {}} />
        </View>

        <SectionHeader title="Empty state" />
        <Card>
          <EmptyState
            title="Start with one"
            body="Log your first expense to see where your money goes and what is safe to spend today."
            actionLabel="Log your first expense"
            onAction={() => setCurrencyPickerOpen(true)}
          />
        </Card>

        <Text
          style={[
            theme.text.caption,
            { color: theme.colors.textTertiary, marginTop: 20, textAlign: "center" },
          ]}
        >
          Next: P1 — schema, migrations and repositories.
        </Text>
      </ScrollView>

      <PickerSheet
        visible={currencyPickerOpen}
        title="Currency"
        options={currencyChoices}
        selected={currencyCode}
        onSelect={setCurrencyCode}
        onClose={() => setCurrencyPickerOpen(false)}
        searchable
        searchPlaceholder="Search currency"
      />
    </SafeAreaView>
  );
}
