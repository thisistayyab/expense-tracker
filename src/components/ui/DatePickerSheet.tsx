import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  addDays,
  addMonthsClamped,
  daysInMonth,
  startOfMonth,
  toIsoDate,
} from "../../lib/domain/dates";
import { useTheme } from "../../lib/theme";
import { AppIcon } from "./AppIcon";
import { ChoiceChip } from "./ChoiceChip";
import { Sheet } from "./Sheet";
import { TactilePressable } from "./TactilePressable";

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
 * Interactive iOS calendar sheet with frosted stepper pills and quick date chips.
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
    const first = new Date(`${month}T00:00:00.000Z`);
    const offset = first.getUTCDay();
    const count = daysInMonth(first.getUTCFullYear(), first.getUTCMonth() + 1);
    const items: (string | null)[] = Array.from({ length: offset }, () => null);
    for (let day = 1; day <= count; day++) {
      items.push(
        `${month.slice(0, 7)}-${String(day).padStart(2, "0")}`,
      );
    }
    while (items.length % 7 !== 0) items.push(null);
    return items;
  }, [month]);

  const choose = (iso: string) => {
    onSelect(iso);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.content}>
        <View style={styles.quickRow}>
          <ChoiceChip
            label="Today"
            selected={value === today}
            tone="accent"
            onPress={() => choose(today)}
          />
          <ChoiceChip
            label="Yesterday"
            selected={value === addDays(today, -1)}
            tone="accent"
            onPress={() => choose(addDays(today, -1))}
          />
        </View>

        <View
          style={[
            styles.calendarCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.cardBorder,
            },
          ]}
        >
          <View style={styles.monthBar}>
            <TactilePressable
              onPress={() => setMonth((current) => addMonthsClamped(current, -1, 1))}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              hitSlop={8}
              scaleTo={0.88}
              style={[
                styles.navBtn,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <AppIcon name="chevronLeft" size={15} color={theme.colors.textPrimary} weight="bold" />
            </TactilePressable>

            <Text style={[theme.text.bodyStrong, { color: theme.colors.textPrimary }]}>
              {monthLabel(month)}
            </Text>

            <TactilePressable
              onPress={() => setMonth((current) => addMonthsClamped(current, 1, 1))}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              hitSlop={8}
              scaleTo={0.88}
              style={[
                styles.navBtn,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <AppIcon
                name="chevronRight"
                size={15}
                color={theme.colors.textPrimary}
                weight="bold"
              />
            </TactilePressable>
          </View>

          <View style={styles.weekdayRow}>
            {weekdays.map((wd, idx) => (
              <Text
                key={idx}
                style={[
                  theme.text.caption,
                  styles.weekdayCell,
                  { color: theme.colors.textTertiary, fontWeight: "600" },
                ]}
              >
                {wd}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((iso, idx) => {
              if (!iso) return <View key={`empty-${idx}`} style={styles.cellSlot} />;
              const selected = iso === value;
              const isToday = iso === today;
              const dayNum = Number(iso.slice(8, 10));

              return (
                <View key={iso} style={styles.cellSlot}>
                  <TactilePressable
                    onPress={() => choose(iso)}
                    accessibilityRole="button"
                    accessibilityLabel={dayLabel(iso)}
                    accessibilityState={{ selected }}
                    haptic="selection"
                    scaleTo={0.88}
                    radius={999}
                    style={[
                      styles.dayButton,
                      selected
                        ? { backgroundColor: theme.colors.accent }
                        : isToday
                          ? {
                              backgroundColor: theme.colors.accentSoft,
                              borderWidth: 1,
                              borderColor: `${theme.colors.accent}44`,
                            }
                          : undefined,
                    ]}
                  >
                    <Text
                      style={[
                        theme.text.label,
                        styles.dayNum,
                        {
                          color: selected
                            ? theme.colors.accentFg
                            : isToday
                              ? theme.colors.accent
                              : theme.colors.textPrimary,
                          fontWeight: selected || isToday ? "700" : "500",
                        },
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </TactilePressable>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 14,
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
  },
  calendarCard: {
    borderRadius: 22,
    borderCurve: "continuous",
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdayRow: {
    flexDirection: "row",
  },
  weekdayCell: {
    flex: 1,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cellSlot: {
    width: "14.2857%",
    alignItems: "center",
    paddingVertical: 3,
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNum: {
    fontSize: 14.5,
    fontVariant: ["tabular-nums"],
  },
});
