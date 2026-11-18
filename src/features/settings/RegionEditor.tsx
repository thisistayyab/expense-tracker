import { useMemo, useState, type ReactNode } from "react";
import { FlatList, Keyboard, StyleSheet, Text, TextInput, View } from "react-native";

import { AppIcon, Button, FieldRow, PickerSheet, TactilePressable } from "../../components/ui";
import {
  countryOptions,
  currencyForCountry,
  getCountry,
  type Country,
} from "../../constants/countries";
import { currencyLabel, currencyOptions, getCurrency } from "../../constants/currencies";
import { useAfterKeyboardDismiss } from "../../lib/keyboard";
import { detectRegionDefaults } from "../../lib/region";
import { FONT_FAMILIES, useTheme } from "../../lib/theme";

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
  const runAfterKeyboard = useAfterKeyboardDismiss();

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
    if (busy) return;
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
            borderRadius: theme.radius.card,
            borderCurve: "continuous",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.cardBorder,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text style={{ fontSize: 22 }}>{selected.flag}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[theme.text.title3, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {selected.name}
            </Text>
            <Text
              style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}
            >
              {currencyLabel(selectedCurrency)} · {selectedCurrency.name}
            </Text>
          </View>
          <AppIcon name="checkmarkCircle" color={theme.colors.accent} size={20} />
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
          editable={!busy}
          style={[
            theme.text.body,
            {
              marginTop: 12,
              minHeight: 46,
              borderRadius: 23,
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: theme.colors.surfaceMuted,
              color: theme.colors.textPrimary,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.cardBorder,
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

      <View
        style={{
          flex: 1,
          marginHorizontal: 20,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.card,
          borderCurve: "continuous",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.cardBorder,
          overflow: "hidden",
        }}
      >
        <FlatList
          data={filtered}
          keyExtractor={(country) => country.code}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          style={{ flex: 1 }}
          contentContainerStyle={{
            // Rows are edge-to-edge tappable, but their content needs the inset the
            // design's pickgroup had: otherwise the flag tile, currency code and
            // check icon sit flush against the card's border and rounded corners.
            paddingHorizontal: 16,
          }}
          renderItem={({ item, index }) => {
            const isSelected = item.code === value.country;
            return (
              <TactilePressable
                onPress={() => selectCountry(item)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: busy }}
                accessibilityLabel={`${item.name}, ${item.currency}`}
                scaleTo={0.99}
                style={{
                  minHeight: 56,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: theme.colors.border,
                  opacity: busy ? 0.55 : 1,
                }}
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
                    maxFontSizeMultiplier={1.2}
                    style={[
                      theme.text.caption,
                      {
                        color: theme.colors.textSecondary,
                        fontFamily: FONT_FAMILIES.bold,
                        letterSpacing: 0.4,
                      },
                    ]}
                  >
                    {item.code}
                  </Text>
                </View>
                <Text
                  style={[theme.text.body, { color: theme.colors.textPrimary, flex: 1, minWidth: 0 }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>
                  {currencyLabel(getCurrency(item.currency))}
                </Text>
                {isSelected ? (
                  <AppIcon name="check" color={theme.colors.accent} size={16} />
                ) : null}
              </TactilePressable>
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
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 10 }}>
        {error ? (
          <Text style={[theme.text.caption, { color: theme.colors.danger }]}>{error}</Text>
        ) : null}

        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.cardBorder,
            borderRadius: theme.radius.card,
            borderCurve: "continuous",
            overflow: "hidden",
          }}
        >
          <FieldRow
            label="Currency"
            value={currencyLabel(selectedCurrency)}
            onPress={busy ? undefined : () => runAfterKeyboard(() => setCurrencyPickerOpen(true))}
            muted={busy}
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
          label: currencyLabel(currency),
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
