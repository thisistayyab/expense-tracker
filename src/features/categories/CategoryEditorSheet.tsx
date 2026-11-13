import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import {
  Button,
  CATEGORY_ICON_KEYS,
  CategoryTile,
  FieldRow,
  PickerSheet,
  Sheet,
} from "../../components/ui";
import {
  createCategory,
  setCategoryArchived,
  updateCategory,
} from "../../lib/db/repos/categories";
import type { Category, CategoryKind, Db } from "../../lib/db/types";
import { categoryRamp, useTheme } from "../../lib/theme";

export type CategoryEditorSheetProps = {
  category?: Category | null;
  kind: CategoryKind;
  /** All categories, including archived, so parent labels stay resolvable. */
  categories: Category[];
  defaultParentId?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export function CategoryEditorSheet({
  category = null,
  kind,
  categories,
  defaultParentId = null,
  onClose,
  onSaved,
}: CategoryEditorSheetProps) {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const [name, setName] = useState(category?.name ?? "");
  const [parentId, setParentId] = useState<string | null>(
    category?.parentId ?? defaultParentId,
  );
  const [color, setColor] = useState(category?.color ?? theme.colors.accent);
  const [icon, setIcon] = useState(category?.icon ?? "ellipsis");
  const [parentOpen, setParentOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChildren = categories.some((entry) => entry.parentId === category?.id);
  const parent = parentId ? categories.find((entry) => entry.id === parentId) : null;
  const parentOptions = categories.filter(
    (entry) =>
      entry.kind === kind &&
      !entry.parentId &&
      entry.id !== category?.id &&
      (!entry.isArchived || entry.id === parentId),
  );

  const siblings = categories.filter(
    (entry) => entry.kind === kind && entry.parentId === (parentId ?? null),
  );
  const nextSortOrder = siblings.reduce((max, entry) => Math.max(max, entry.sortOrder), -1) + 1;

  const save = () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const task = category
      ? updateCategory(db, category.id, {
          name,
          parentId,
          color,
          icon,
        })
      : createCategory(db, {
          name,
          kind,
          parentId,
          color,
          icon,
          sortOrder: nextSortOrder,
        });

    task
      .then(onSaved)
      .catch((cause: unknown) => {
        setError(`Not saved: ${String(cause)}`);
        setBusy(false);
      });
  };

  const toggleArchive = () => {
    if (!category) return;
    const next = !category.isArchived;
    const archive = () => {
      setBusy(true);
      setCategoryArchived(db, category.id, next)
        .then(onSaved)
        .catch((cause: unknown) => {
          setError(`Could not ${next ? "archive" : "restore"}: ${String(cause)}`);
          setBusy(false);
        });
    };

    if (!next) {
      archive();
      return;
    }
    Alert.alert(
      `Archive ${category.name}?`,
      "History keeps rendering it, but it disappears from the add picker. Its subcategories are hidden with it.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Archive", style: "destructive", onPress: archive },
      ],
    );
  };

  return (
    <Sheet visible onClose={onClose} title={category ? "Edit category" : "New category"}>
      <ScrollView
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <CategoryTile icon={icon} color={color} size={52} />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Category name"
            placeholderTextColor={theme.colors.textTertiary}
            accessibilityLabel="Category name"
            maxLength={40}
            editable={!busy}
            style={[
              theme.text.title3,
              {
                flex: 1,
                height: 50,
                borderRadius: 18,
                paddingHorizontal: 14,
                backgroundColor: theme.colors.surfaceSunken,
                color: theme.colors.textPrimary,
              },
            ]}
          />
        </View>

        <Text style={[theme.text.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>
          Color
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
          {categoryRamp.map((swatch) => (
            <ColorSwatch
              key={swatch}
              color={swatch}
              selected={color === swatch}
              onPress={() => setColor(swatch)}
            />
          ))}
        </View>

        <Text style={[theme.text.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>
          Icon
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {CATEGORY_ICON_KEYS.map((key) => {
            const selected = icon === key;
            return (
              <Pressable
                key={key}
                onPress={() => setIcon(key)}
                accessibilityRole="button"
                accessibilityLabel={`Use ${key} icon`}
                accessibilityState={{ selected }}
                style={({ pressed }) => ({
                  borderRadius: 16,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? theme.colors.accent : theme.colors.border,
                  padding: 2,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <CategoryTile icon={key} color={color} size={38} />
              </Pressable>
            );
          })}
        </View>

        <View
          style={{
            marginTop: 16,
            paddingHorizontal: 14,
            borderRadius: 20,
            backgroundColor: theme.colors.surfaceSunken,
          }}
        >
          <FieldRow
            label="Parent"
            value={parent?.name ?? "Top level"}
            muted={!parent}
            onPress={hasChildren ? undefined : () => setParentOpen(true)}
          />
        </View>
        {hasChildren ? (
          <Text style={[theme.text.caption, { color: theme.colors.textTertiary, marginTop: 8 }]}>
            This category has subcategories, so it stays at the top level. Move its children first
            if you want to nest it.
          </Text>
        ) : null}

        {category?.isArchived ? (
          <Text style={[theme.text.caption, { color: theme.colors.textTertiary, marginTop: 12 }]}>
            Archived. History still shows it, but pickers do not.
          </Text>
        ) : null}

        {error ? (
          <Text style={[theme.text.caption, { color: theme.colors.danger, marginTop: 10 }]}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 10, gap: 6 }}>
        <Button
          label={category ? "Save category" : "Add category"}
          variant="accent"
          onPress={save}
          loading={busy}
          disabled={!name.trim() || busy}
        />
        {category ? (
          <Button
            label={category.isArchived ? "Restore category" : "Archive category"}
            variant="danger"
            size="sm"
            onPress={toggleArchive}
            disabled={busy}
          />
        ) : null}
      </View>

      <PickerSheet
        visible={parentOpen}
        title="Parent category"
        options={[
          { value: "", label: "Top level" },
          ...parentOptions.map((entry) => ({ value: entry.id, label: entry.name })),
        ]}
        selected={parentId ?? ""}
        onSelect={(next) => setParentId(next || null)}
        onClose={() => setParentOpen(false)}
      />
    </Sheet>
  );
}

function ColorSwatch({
  color,
  selected,
  onPress,
}: {
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Use color ${color}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: color,
        borderWidth: selected ? 3 : 0,
        borderColor: theme.colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    />
  );
}
