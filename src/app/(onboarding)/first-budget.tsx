import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui";
import { getCurrency, isCurrencyCode } from "../../constants/currencies";
import { toIsoDate } from "../../lib/domain/dates";
import {
  decimalPlaces,
  parseMoneyInput,
  sanitizeMoneyInput,
} from "../../lib/format/money";
import { haptics } from "../../lib/haptics";
import { useOnboarding } from "../../lib/onboarding";
import { detectRegionDefaults } from "../../lib/region";
import { useTheme } from "../../lib/theme";
import { Pager } from "../../features/onboarding/Pager";

function validCountry(value: string | string[] | undefined): string | null {
  const code = typeof value === "string" ? value.toUpperCase() : "";
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/**
 * Step 3 is optional on purpose: a budget is what makes the daily number possible,
 * but demanding one before the first expense is how onboarding loses people. The
 * region arrives as params so this screen never re-detects a different device
 * setting than the one the user just confirmed.
 */
export default function FirstBudgetScreen() {
  const { theme } = useTheme();
  const { finish } = useOnboarding();
  const params = useLocalSearchParams<{
    country?: string;
    currency?: string;
    locale?: string;
  }>();

  const defaults = useMemo(() => detectRegionDefaults(), []);
  const currencyParam = typeof params.currency === "string" ? params.currency.toUpperCase() : "";
  const currency = isCurrencyCode(currencyParam) ? currencyParam : defaults.currency;
  const country = validCountry(params.country) ?? defaults.country;
  const locale =
    (typeof params.locale === "string" && params.locale.trim()) || defaults.locale;

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minor = parseMoneyInput(text, currency);
  const valid = minor !== null && minor > 0;
  const symbol = getCurrency(currency).symbol;

  const complete = (withBudget: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const region = { country, currency, locale };
    const budget =
      withBudget && minor !== null && minor > 0
        ? { limitMinor: minor, period: "monthly" as const, startDate: toIsoDate(new Date()) }
        : null;

    finish(region, budget)
      .then(() => {
        haptics.success();
      })
      .catch((cause: unknown) => {
        setError(`Could not finish setup: ${String(cause)}`);
        setBusy(false);
      });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top", "left", "right", "bottom"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {/* Back is a real control: nothing is saved yet, so there is nothing
                  to lose by returning to the region step. */}
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Back to region"
                hitSlop={12}
                style={{ width: 34, height: 34, justifyContent: "center" }}
              >
                <Text style={[theme.text.title2, { color: theme.colors.textTertiary }]}>‹</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Pager active={2} total={3} />
              </View>
              <View style={{ width: 34 }} />
            </View>

            <View style={{ marginTop: 18 }}>
              <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
                Step 3 of 3
              </Text>
              <Text
                style={[theme.text.title1, { color: theme.colors.textPrimary, marginTop: 6 }]}
              >
                What can you spend?
              </Text>
              <Text
                style={[
                  theme.text.body,
                  { color: theme.colors.textSecondary, marginTop: 8, maxWidth: 320 },
                ]}
              >
                One monthly limit is all Overview needs to turn spending into a daily
                number. Category limits can wait.
              </Text>
            </View>

            <View
              style={[
                {
                  marginTop: 22,
                  padding: 20,
                  borderRadius: 26,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.cardBorder,
                },
                theme.shadow.card,
              ]}
            >
              <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
                Monthly limit · {currency}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[
                    theme.text.display,
                    { color: theme.colors.textSecondary, lineHeight: 60 },
                  ]}
                >
                  {symbol}
                </Text>
                <TextInput
                  value={text}
                  onChangeText={(next) => setText(sanitizeMoneyInput(next, currency))}
                  keyboardType={decimalPlaces(currency) === 0 ? "number-pad" : "decimal-pad"}
                  inputMode={decimalPlaces(currency) === 0 ? "numeric" : "decimal"}
                  accessibilityLabel={`Monthly budget in ${currency}`}
                  placeholder={
                    decimalPlaces(currency) === 0
                      ? "0"
                      : decimalPlaces(currency) === 3
                        ? "0.000"
                        : "0.00"
                  }
                  placeholderTextColor={theme.colors.textTertiary}
                  maxLength={12}
                  maxFontSizeMultiplier={1.3}
                  style={[
                    theme.text.display,
                    { color: theme.colors.textPrimary, flex: 1, minWidth: 80, lineHeight: 60 },
                  ]}
                />
              </View>
              <Text style={[theme.text.caption, { color: theme.colors.textTertiary, marginTop: 10 }]}>
                Bills you log later are counted automatically. Nothing leaves this device.
              </Text>
            </View>

            <View style={{ flex: 1 }} />

            {error ? (
              <Text
                style={[
                  theme.text.caption,
                  { color: theme.colors.danger, paddingBottom: 10 },
                ]}
              >
                {error}
              </Text>
            ) : null}

            <View style={{ gap: 10, paddingBottom: 8 }}>
              <Button
                label="Set my limit"
                variant="accent"
                onPress={() => complete(true)}
                disabled={!valid || busy}
                loading={busy && valid}
              />
              <Pressable
                onPress={() => complete(false)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Skip the budget for now"
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  opacity: pressed || busy ? 0.5 : 1,
                })}
              >
                <Text
                  style={[
                    theme.text.label,
                    { color: theme.colors.textSecondary, textAlign: "center" },
                  ]}
                >
                  Not now, start without a budget
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
