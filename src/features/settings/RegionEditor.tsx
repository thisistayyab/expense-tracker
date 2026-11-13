import { useMemo, useState, type ReactNode } from "react";
import { FlatList, Keyboard, Pressable, Text, TextInput, View } from "react-native";

import { Button, FieldRow, PickerSheet } from "../../components/ui";
import {
  countryOptions,
  currencyForCountry,
  getCountry,
  type Country,
} from "../../constants/countries";
import { currencyOptions, getCurrency } from "../../constants/currencies";
import { detectRegionDefaults } from "../../lib/region";
import { useTheme } from "../../lib/theme";

export type RegionValue = {
  country: string;
  currency: string;
  locale: string;
};

export type RegionEditorProps = {
  value: RegionValue;
  onChange: (next: RegionValue) => void;
  onContinue: () => void;
  continueLabel?: string;
  busy?: boolean;
  error?: string | null;
  intro?: { eyebrow: string; title: string; body: string };
  top?: ReactNode;
};

function matches(country: Country, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    country.name.toLowerCase().includes(needle) ||
    country.code.toLowerCase().includes(needle) ||
    country.currency.toLowerCase().includes(needle)
  );
}

/**
 * Shared by onboarding and Settings (03 §9). The country is context, the currency
 * is money: picking a country only *suggests* its currency, and an explicit
 * currency choice survives later country changes.
 */
export function RegionEditor({
  value,
  onChange,
  onContinue,
  continueLabel = "Continue",
  busy = false,
  error = null,
  intro,
  top,
}: RegionEditorProps) {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);

  const detected = useMemo(() => detectRegionDefaults().country, []);
  const ordered = useMemo(() => {
    const all = countryOptions();
    const pinned = all.filter((country) => country.code === detected);
    return [...pinned, ...all.filter((country) => country.code !== detected)];
  }, [detected]);

  const filtered = useMemo(
    () => ordered.filter((country) => matches(country, query)),
    [ordered, query],
  );

  const selected = getCountry(value.country);
  const selectedCurrency = getCurrency(value.currency);

  const selectCountry = (country: Country) => {
    // The search field keeps focus through the row press, so without this the
    // keyboard stays up over the rest of the step after the country is chosen.
    Keyboard.dismiss();
    onChange({
      ...value,
      country: country.code,
      // A suggestion only: an explicit currency choice is never overwritten.
      currency: currencyTouched ? value.currency : currencyForCountry(country.code),
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20 }}>
        {top}

        {intro ? (
          <View style={{ marginTop: 14 }}>
            <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
              {intro.eyebrow}
            </Text>
            <Text
              style={[
                theme.text.title1,
                { color: theme.colors.textPrimary, marginTop: 6 },
              ]}
            >
              {intro.title}
            </Text>
            <Text
              style={[
                theme.text.body,
                { color: theme.colors.textSecondary, marginTop: 8, maxWidth: 320 },
              ]}
            >
              {intro.body}
            </Text>
          </View>
        ) : null}

        <View
          style={{
            marginTop: 16,
            borderRadius: 24,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: theme.colors.solid,
          }}
        >
          <Text style={{ fontSize: 22 }}>{selected.flag}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[theme.text.title3, { color: theme.colors.solidFg }]}
              numberOfLines={1}
            >
              {selected.name}
            </Text>
            <Text
              style={[theme.text.caption, { color: theme.colors.solidFg, opacity: 0.6, marginTop: 2 }]}
            >
              {selectedCurrency.code} {selectedCurrency.symbol} · {selectedCurrency.name}
            </Text>
          </View>
          <Text style={[theme.text.title3, { color: theme.colors.accent }]}>✓</Text>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search country or currency"
          placeholderTextColor={theme.colors.textTertiary}
          accessibilityLabel="Search country or currency"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={[
            theme.text.body,
            {
              marginTop: 12,
              height: 46,
              borderRadius: 23,
              paddingHorizontal: 16,
              backgroundColor: theme.colors.surface,
              color: theme.colors.textPrimary,
              borderWidth: 1,
              borderColor: theme.colors.border,
            },
          ]}
        />

        <Text
          style={[
            theme.text.eyebrow,
            { color: theme.colors.textTertiary, marginTop: 18, marginBottom: 8 },
          ]}
        >
          All countries
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(country) => country.code}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, marginHorizontal: 20 }}
        contentContainerStyle={{
          backgroundColor: theme.colors.surface,
          borderRadius: 24,
          paddingHorizontal: 16,
          overflow: "hidden",
        }}
        renderItem={({ item, index }) => {
          const isSelected = item.code === value.country;
          return (
            <Pressable
              onPress={() => selectCountry(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${item.name}, ${item.currency}`}
              style={({ pressed }) => ({
                minHeight: 56,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: theme.colors.border,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View
                style={{
                  minWidth: 28,
                  paddingVertical: 5,
                  paddingHorizontal: 6,
                  borderRadius: 7,
                  backgroundColor: theme.colors.surfaceSunken,
                  alignItems: "center",
                }}
              >
                <Text
                  style={[
                    theme.text.caption,
                    { color: theme.colors.textSecondary, fontWeight: "700", letterSpacing: 0.4 },
                  ]}
                >
                  {item.code}
                </Text>
              </View>
              <Text
                style={[theme.text.body, { color: theme.colors.textPrimary, flex: 1 }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>
                {item.currency} {getCurrency(item.currency).symbol}
              </Text>
              {isSelected ? (
                <Text style={[theme.text.body, { color: theme.colors.accent }]}>✓</Text>
              ) : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingVertical: 24, alignItems: "center", gap: 8 }}>
            <Text style={[theme.text.body, { color: theme.colors.textSecondary, textAlign: "center" }]}>
              No countries match “{query.trim()}”.
            </Text>
            <Button label="Clear" variant="ghost" size="sm" onPress={() => setQuery("")} />
          </View>
        }
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 10 }}>
        {error ? (
          <Text style={[theme.text.caption, { color: theme.colors.danger }]}>{error}</Text>
        ) : null}

        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 22,
            paddingHorizontal: 16,
          }}
        >
          <FieldRow
            label="Currency"
            value={`${selectedCurrency.code} ${selectedCurrency.symbol}`}
            onPress={() => setCurrencyPickerOpen(true)}
          />
        </View>

        <Button
          label={continueLabel}
          variant="accent"
          onPress={onContinue}
          loading={busy}
          disabled={busy || !value.country || !value.currency}
        />

        <Text
          style={[
            theme.text.caption,
            { color: theme.colors.textTertiary, textAlign: "center", paddingBottom: 4 },
          ]}
        >
          Detected automatically · change anytime in Settings
        </Text>
      </View>

      <PickerSheet
        visible={currencyPickerOpen}
        title="Currency"
        options={currencyOptions().map((currency) => ({
          value: currency.code,
          label: `${currency.code} ${currency.symbol}`,
          secondary: currency.name,
        }))}
        selected={value.currency}
        searchable
        searchPlaceholder="Search currencies"
        onSelect={(code) => {
          setCurrencyTouched(true);
          onChange({ ...value, currency: code });
        }}
        onClose={() => setCurrencyPickerOpen(false)}
      />
    </View>
  );
}
