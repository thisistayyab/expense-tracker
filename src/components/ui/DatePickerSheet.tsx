import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  addDays,
  addMonthsClamped,
  daysInMonth,
  fromIsoDate,
  startOfMonth,
  toIsoDate,
} from "../../lib/domain/dates";
import { useTheme } from "../../lib/theme";
import { Sheet } from "./Sheet";

export type DatePickerSheetProps = {
  visible: boolean;
  value: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
  title?: string;
};

function monthLabel(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * A month grid rather than a fixed list of recent days, so backdating and editing
 * old rows are not artificially limited (03 §3: "presets + picker"). Mount this only
 * while it is open; its month state then always starts from the row's date.
 */
export function DatePickerSheet({
  visible,
  value,
  onSelect,
  onClose,
  title = "Date",
}: DatePickerSheetProps) {
  const { theme } = useTheme();
  const [month, setMonth] = useState(() => startOfMonth(value));
  const today = useMemo(() => toIsoDate(new Date()), []);
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Date(Date.UTC(2024, 0, 7 + index)).toLocaleDateString(undefined, {
          weekday: "narrow",
          timeZone: "UTC",
        }),
      ),
    [],
  );

  const cells = useMemo(() => {
    const first = fromIsoDate(month);
    const leading = first.getUTCDay();
    const count = daysInMonth(first.getUTCFullYear(), first.getUTCMonth() + 1);
    const prefix = month.slice(0, 7);
    const days: (string | null)[] = Array.from({ length: leading }, () => null);

    for (let day = 1; day <= count; day += 1) {
      days.push(`${prefix}-${String(day).padStart(2, "0")}`);
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [month]);

  const choose = (iso: string) => {
    onSelect(iso);
    onClose();
  };

  const quickChip = (label: string, iso: string) => {
    const active = value === iso;
    return (
      <Pressable
        onPress={() => choose(iso)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
        hitSlop={5}
        style={({ pressed }) => ({
          minHeight: 34,
          paddingVertical: 5,
          paddingHorizontal: 16,
          borderRadius: 17,
          justifyContent: "center",
          backgroundColor: active ? theme.colors.solid : theme.colors.surfaceSunken,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={[
            theme.text.caption,
            {
              fontWeight: "600",
              color: active ? theme.colors.solidFg : theme.colors.textSecondary,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", gap: 8, paddingBottom: 10 }}>
          {quickChip("Today", today)}
          {quickChip("Yesterday", addDays(today, -1))}
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 8,
          }}
        >
          <Pressable
            onPress={() => setMonth((current) => addMonthsClamped(current, -1, 1))}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            hitSlop={8}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.surfaceSunken,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={[theme.text.title3, { color: theme.colors.textPrimary }]}>‹</Text>
          </Pressable>

          <Text
            accessibilityLiveRegion="polite"
            style={[theme.text.title3, { color: theme.colors.textPrimary }]}
          >
            {monthLabel(month)}
          </Text>

          <Pressable
            onPress={() => setMonth((current) => addMonthsClamped(current, 1, 1))}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            hitSlop={8}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.surfaceSunken,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={[theme.text.title3, { color: theme.colors.textPrimary }]}>›</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row" }}>
          {weekdays.map((weekday, index) => (
            <View
              key={`${weekday}-${index}`}
              style={{ width: "14.2857%", alignItems: "center", paddingVertical: 4 }}
            >
              <Text style={[theme.text.caption, { color: theme.colors.textTertiary }]}>
                {weekday}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {cells.map((iso, index) => {
            if (!iso) {
              return <View key={`blank-${index}`} style={{ width: "14.2857%", height: 42 }} />;
            }

            const selected = iso === value;
            const isToday = iso === today;
            return (
              <View
                key={iso}
                style={{
                  width: "14.2857%",
                  height: 42,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Pressable
                  onPress={() => choose(iso)}
                  accessibilityRole="button"
                  accessibilityLabel={dayLabel(iso)}
                  accessibilityState={{ selected }}
                  hitSlop={5}
                  style={({ pressed }) => ({
                    width: 34,
                    minHeight: 34,
                    borderRadius: 17,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selected ? theme.colors.solid : "transparent",
                    borderWidth: isToday && !selected ? 1 : 0,
                    borderColor: theme.colors.accent,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text
                    style={[
                      theme.text.caption,
                      {
                        fontWeight: selected ? "700" : "500",
                        fontVariant: ["tabular-nums"],
                        color: selected
                          ? theme.colors.solidFg
                          : isToday
                            ? theme.colors.accent
                            : theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {Number(iso.slice(8, 10))}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    </Sheet>
  );
}
