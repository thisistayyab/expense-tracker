import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../../lib/theme";
import { AppIcon } from "./AppIcon";
import { Sheet } from "./Sheet";
import { TactilePressable } from "./TactilePressable";

export type PickerOption = {
  value: string;
  label: string;
  secondary?: string;
};

export type PickerSheetProps = {
  visible: boolean;
  title: string;
  options: readonly PickerOption[];
  selected?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
};

/**
 * Frosted modal option selector with SF Symbol search field and active highlight pills.
 */
export function PickerSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  searchable = false,
  searchPlaceholder = "Search",
}: PickerSheetProps) {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");

  const close = () => {
    setQuery("");
    onClose();
  };

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(trimmed) ||
        option.value.toLowerCase().includes(trimmed) ||
        (option.secondary?.toLowerCase().includes(trimmed) ?? false),
    );
  }, [options, query]);

  return (
    <Sheet visible={visible} onClose={close} title={title}>
      {searchable ? (
        <View style={styles.searchWrap}>
          <View
            style={[
              styles.searchField,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.cardBorder,
                borderRadius: theme.radius.input,
              },
            ]}
          >
            <AppIcon name="search" size={16} color={theme.colors.textTertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.colors.textTertiary}
              selectionColor={theme.colors.accent}
              autoCapitalize="none"
              autoCorrect={false}
              style={[theme.text.body, styles.searchInput, { color: theme.colors.textPrimary }]}
            />
            {query.length > 0 ? (
              <TactilePressable
                onPress={() => setQuery("")}
                hitSlop={8}
                scaleTo={0.86}
                accessibilityLabel="Clear search"
              >
                <AppIcon name="close" size={14} color={theme.colors.textTertiary} />
              </TactilePressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
              No matches found.
            </Text>
          </View>
        ) : (
          filtered.map((option) => {
            const active = option.value === selected;
            return (
              <TactilePressable
                key={option.value}
                onPress={() => {
                  onSelect(option.value);
                  close();
                }}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: active }}
                haptic="selection"
                scaleTo={0.98}
                radius={16}
                style={[
                  styles.optionRow,
                  {
                    backgroundColor: active ? theme.colors.accentSoft : theme.colors.surface,
                    borderColor: active ? `${theme.colors.accent}42` : theme.colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.optionText}>
                  <Text
                    style={[
                      theme.text.bodyStrong,
                      { color: active ? theme.colors.accent : theme.colors.textPrimary },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {option.secondary ? (
                    <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>
                      {option.secondary}
                    </Text>
                  ) : null}
                </View>
                {active ? (
                  <View style={[styles.checkCircle, { backgroundColor: theme.colors.accent }]}>
                    <AppIcon name="check" size={13} color={theme.colors.accentFg} weight="bold" />
                  </View>
                ) : null}
              </TactilePressable>
            );
          })
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: "continuous",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
  },
  emptyWrap: {
    paddingVertical: 28,
    alignItems: "center",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
