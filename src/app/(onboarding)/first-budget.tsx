import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppIcon,
  Button,
  Card,
  Glass,
  ScreenBackground,
  TactilePressable,
} from "../../components/ui";
import { getCurrency, isCurrencyCode } from "../../constants/currencies";
import { Pager } from "../../features/onboarding/Pager";
import { toIsoDate } from "../../lib/domain/dates";
import {
  decimalPlaces,
  parseMoneyInput,
  sanitizeMoneyInput,
} from "../../lib/format/money";
import { haptics } from "../../lib/haptics";
import { iosEnter } from "../../lib/motion";
import { useOnboarding } from "../../lib/onboarding";
import { detectRegionDefaults } from "../../lib/region";
import { useTheme } from "../../lib/theme";

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
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const minor = parseMoneyInput(text, currency);
  const valid = minor !== null && minor > 0;
  const symbol = getCurrency(currency).symbol;

  const complete = (withBudget: boolean) => {
    if (busy || busyRef.current) return;
    busyRef.current = true;
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
        busyRef.current = false;
        setError(`Could not finish setup: ${String(cause)}`);
        setBusy(false);
      });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground />
      <SafeAreaView edges={["top", "left", "right", "bottom"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 4 }}>
              {/* Back is a real control: nothing is saved yet, so there is nothing
                  to lose by returning to the region step. */}
              <TactilePressable
                onPress={() => router.back()}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Back to region"
                hitSlop={10}
                scaleTo={0.92}
                radius={18}
              >
                <Glass
                  tone="regular"
                  radius={18}
                  style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
                >
                  <AppIcon name="chevronLeft" color={theme.colors.textPrimary} size={18} />
                </Glass>
              </TactilePressable>
              <View style={{ flex: 1 }}>
                <Pager active={2} total={3} />
              </View>
              <View style={{ width: 36 }} />
            </View>

            <Animated.View entering={iosEnter(20)} style={{ marginTop: 18 }}>
              <Text style={[theme.text.eyebrow, { color: theme.colors.accent }]}>
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
            </Animated.View>

            <Animated.View entering={iosEnter(90)}>
              <Card
                variant="glass"
                style={{
                  marginTop: 22,
                  padding: 22,
                  borderRadius: theme.radius.hero,
                  borderColor: focused ? theme.colors.accent : undefined,
                }}
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
                  {/* No lineHeight on the input: on iOS a single-line TextInput spreads
                      a large lineHeight unevenly, clipping the digits and sinking them
                      below the symbol's baseline (Android centres them). The row's
                      alignItems centres the input, so it lines up on both platforms. */}
                  <TextInput
                    value={text}
                    onChangeText={(next) => setText(sanitizeMoneyInput(next, currency))}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    editable={!busy}
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
                      { color: theme.colors.textPrimary, flex: 1, minWidth: 80, paddingVertical: 0 },
                    ]}
                  />
                </View>
                <Text style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                  Bills you log later are counted automatically. Nothing leaves this device.
                </Text>
              </Card>
            </Animated.View>

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
              <TactilePressable
                onPress={() => complete(false)}
                disabled={busy}
                scaleTo={0.97}
                haptic="selection"
                radius={14}
                accessibilityRole="button"
                accessibilityLabel="Skip the budget for now"
                style={{
                  paddingVertical: 11,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <Text
                  style={[
                    theme.text.label,
                    { color: theme.colors.textSecondary, textAlign: "center" },
                  ]}
                >
                  Not now, start without a budget
                </Text>
              </TactilePressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
