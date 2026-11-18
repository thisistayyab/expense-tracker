import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  Button,
  CATEGORY_ICON_KEYS,
  CategoryTile,
  FieldRow,
  PickerSheet,
  Sheet,
  TactilePressable,
} from "../../components/ui";
import {
  createCategory,
  setCategoryArchived,
  updateCategory,
} from "../../lib/db/repos/categories";
import type { Category, CategoryKind, Db } from "../../lib/db/types";
import { useAfterKeyboardDismiss } from "../../lib/keyboard";
import { notifyLedgerChanged } from "../../lib/ledgerEvents";
import { categoryRamp, useTheme } from "../../lib/theme";

export type CategoryEditorSheetProps = {
  visible?: boolean;
  category?: Category | null;
  kind: CategoryKind;
  /** All categories, including archived, so parent labels stay resolvable. */
  categories: Category[];
  defaultParentId?: string | null;
  onClose: () => void;
  onClosed?: () => void;
  onSaved: () => void;
};

export function CategoryEditorSheet({
  visible = true,
  category = null,
  kind,
  categories,
  defaultParentId = null,
  onClose,
  onClosed,
  onSaved,
}: CategoryEditorSheetProps) {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const [name, setName] = useState(category?.name ?? "");
  const [parentId, setParentId] = useState<string | null>(
    category?.parentId ?? defaultParentId,
  );
  const [color, setColor] = useState(category?.color ?? categoryRamp[0]);
  const [icon, setIcon] = useState(category?.icon ?? "ellipsis");
  const [parentOpen, setParentOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const runAfterKeyboard = useAfterKeyboardDismiss();

  const openKey = visible ? `${category?.id ?? "new"}:${kind}:${defaultParentId ?? ""}` : null;
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(openKey);
  if (openKey !== null && openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    setName(category?.name ?? "");
    setParentId(category?.parentId ?? defaultParentId);
    setColor(category?.color ?? categoryRamp[0]);
    setIcon(category?.icon ?? "ellipsis");
    setParentOpen(false);
    setBusy(false);
    setError(null);
  } else if (openKey === null && lastOpenKey !== null) {
    setLastOpenKey(null);
    setParentOpen(false);
  }

  useEffect(() => {
    if (!visible) {
      busyRef.current = false;
    }
  }, [visible]);

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
    if (!name.trim() || busy || busyRef.current) return;
    busyRef.current = true;
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
      .then(() => {
        busyRef.current = false;
        notifyLedgerChanged();
        onSaved();
      })
      .catch((cause: unknown) => {
        busyRef.current = false;
        setError(`Not saved: ${String(cause)}`);
        setBusy(false);
      });
  };

  const toggleArchive = () => {
    if (!category || busy || busyRef.current) return;
    const next = !category.isArchived;
    const archive = () => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setCategoryArchived(db, category.id, next)
        .then(() => {
          busyRef.current = false;
          notifyLedgerChanged();
          onSaved();
        })
        .catch((cause: unknown) => {
          busyRef.current = false;
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
    <Sheet
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      dismissible={!busy}
      title={category ? "Edit category" : "New category"}
      footer={
        <View style={{ gap: 8 }}>
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
      }
      overlayChildren={
        <PickerSheet
          embedded
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
      }
    >
      <ScrollView
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
                minHeight: 50,
                borderRadius: theme.radius.input,
                borderCurve: "continuous",
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.colors.cardBorder,
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor: theme.colors.surfaceMuted,
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
              disabled={busy}
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
              <TactilePressable
                key={key}
                onPress={() => setIcon(key)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Use ${key} icon`}
                accessibilityState={{ selected, disabled: busy }}
                style={{
                  borderRadius: 15,
                  borderCurve: "continuous",
                  borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                  borderColor: selected ? theme.colors.accent : theme.colors.cardBorder,
                  padding: 2,
                }}
              >
                <CategoryTile icon={key} color={color} size={38} />
              </TactilePressable>
            );
          })}
        </View>

        <View
          style={{
            marginTop: 16,
            borderRadius: theme.radius.card,
            borderCurve: "continuous",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.cardBorder,
            overflow: "hidden",
            backgroundColor: theme.colors.surfaceMuted,
          }}
        >
          <FieldRow
            label="Parent"
            value={parent?.name ?? "Top level"}
            muted={!parent || hasChildren}
            onPress={
              hasChildren || busy ? undefined : () => runAfterKeyboard(() => setParentOpen(true))
            }
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
    </Sheet>
  );
}

function ColorSwatch({
  color,
  selected,
  onPress,
  disabled,
}: {
  color: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <TactilePressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Use color ${color}`}
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: color,
        borderWidth: selected ? 3 : 0,
        borderColor: theme.colors.surface,
      }}
    />
  );
}
