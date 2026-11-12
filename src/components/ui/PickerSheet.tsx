import { useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";

import { useTheme } from "../../lib/theme";
import { ListRow } from "./ListRow";
import { Sheet } from "./Sheet";
import { TextField } from "./TextField";

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

  // Reset the filter as the sheet closes, not in an effect: every close path goes
  // through `close`, so the next open always starts from the full list.
  const close = () => {
    setQuery("");
    onClose();
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.secondary?.toLowerCase().includes(needle),
    );
  }, [options, query]);

  return (
    <Sheet visible={visible} onClose={close} title={title}>
      <View style={{ flexShrink: 1, paddingHorizontal: 20 }}>
        {searchable ? (
          <View style={{ paddingBottom: 8 }}>
            <TextField
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              accessibilityLabel={searchPlaceholder}
            />
          </View>
        ) : null}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          renderItem={({ item, index }) => (
            <ListRow
              title={item.label}
              subtitle={item.secondary}
              showDivider={index > 0}
              onPress={() => {
                onSelect(item.value);
                close();
              }}
              accessibilityLabel={
                item.value === selected ? `${item.label}, selected` : item.label
              }
              trailing={
                item.value === selected ? (
                  <Text style={[theme.text.title3, { color: theme.colors.accent }]}>✓</Text>
                ) : undefined
              }
            />
          )}
          ListEmptyComponent={
            <Text
              style={[
                theme.text.body,
                { color: theme.colors.textTertiary, paddingVertical: 24, textAlign: "center" },
              ]}
            >
              Nothing matches “{query.trim()}”.
            </Text>
          }
        />
      </View>
    </Sheet>
  );
}
