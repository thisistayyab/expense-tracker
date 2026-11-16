import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppIcon,
  Button,
  Card,
  CategoryTile,
  ChoiceChip,
  ScreenBackground,
  SectionHeader,
  TactilePressable,
} from "../../components/ui";
import { CategoryEditorSheet } from "../../features/categories/CategoryEditorSheet";
import { listCategories, reorderCategories } from "../../lib/db/repos/categories";
import type { Category, CategoryKind, Db } from "../../lib/db/types";
import { categoryNodes, type CategoryNode } from "../../lib/domain/category-tree";
import { useTheme } from "../../lib/theme";

export default function CategoriesScreen() {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState<{ parentId: string | null } | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setCategories(await listCategories(db, { includeArchived: true }));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      load()
        .catch((cause: unknown) => {
          if (!cancelled) setError(`Could not load categories: ${String(cause)}`);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const nodes = useMemo(() => categoryNodes(categories, kind), [categories, kind]);
  const activeNodes = useMemo(
    () =>
      nodes
        .map((node) => ({
          ...node,
          category: node.category,
          children: node.children.filter((child) => !child.isArchived),
        }))
        .filter((node) => !node.category.isArchived),
    [nodes],
  );
  const archived = useMemo(() => {
    const archivedParents = new Set(
      categories
        .filter((entry) => entry.kind === kind && entry.isArchived && !entry.parentId)
        .map((entry) => entry.id),
    );
    return categories.filter(
      (entry) =>
        entry.kind === kind &&
        (entry.isArchived || Boolean(entry.parentId && archivedParents.has(entry.parentId))),
    );
  }, [categories, kind]);

  const refresh = () => {
    load().catch((cause: unknown) => setError(String(cause)));
  };

  const move = async (node: CategoryNode, childIndex?: number) => {
    const list = childIndex === undefined ? activeNodes.map((entry) => entry.category) : node.children;
    const index = childIndex ?? list.findIndex((entry) => entry.id === node.category.id);
    if (index < 0) return;
    const target = childIndex === undefined ? index - 1 : index - 1;
    if (target < 0) return;
    const ordered = [...list];
    [ordered[target], ordered[index]] = [ordered[index], ordered[target]];
    try {
      await reorderCategories(
        db,
        ordered.map((entry) => entry.id),
      );
      refresh();
    } catch (cause) {
      setError(`Could not reorder: ${String(cause)}`);
    }
  };

  const moveDown = async (node: CategoryNode, childIndex?: number) => {
    const list = childIndex === undefined ? activeNodes.map((entry) => entry.category) : node.children;
    const index = childIndex ?? list.findIndex((entry) => entry.id === node.category.id);
    if (index < 0 || index >= list.length - 1) return;
    const ordered = [...list];
    [ordered[index], ordered[index + 1]] = [ordered[index + 1], ordered[index]];
    try {
      await reorderCategories(
        db,
        ordered.map((entry) => entry.id),
      );
      refresh();
    } catch (cause) {
      setError(`Could not reorder: ${String(cause)}`);
    }
  };

  const renderCategoryRow = (
    category: Category,
    options: { indented?: boolean; childIndex?: number; parent?: CategoryNode; isFirst?: boolean } = {},
  ) => {
    const child = options.childIndex !== undefined;
    return (
      <View
        key={category.id}
        style={{
          marginLeft: options.indented ? 30 : 0,
          minHeight: 60,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          borderTopWidth: options.isFirst ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
        }}
      >
        <TactilePressable
          onPress={() => setEditing(category)}
          haptic="selection"
          scaleTo={0.985}
          radius={12}
          accessibilityRole="button"
          accessibilityLabel={`${category.name}${category.isArchived ? ", archived" : ""}`}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 10,
          }}
        >
          <CategoryTile icon={category.icon} color={category.color} size={38} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[theme.text.bodyStrong, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {category.name}
            </Text>
            <Text style={[theme.text.caption, { color: theme.colors.textTertiary }]}>
              {options.indented ? "Subcategory" : "Category"} · {category.sortOrder + 1}
            </Text>
          </View>
        </TactilePressable>

        {reorderMode ? (
          <View style={{ flexDirection: "row", gap: 6 }}>
            <ReorderButton
              direction="up"
              disabled={child ? options.childIndex === 0 : activeNodes.findIndex((node) => node.category.id === category.id) === 0}
              onPress={() =>
                child && options.parent
                  ? move(options.parent, options.childIndex)
                  : move({ category, children: [] })
              }
            />
            <ReorderButton
              direction="down"
              disabled={
                child
                  ? options.childIndex === (options.parent?.children.length ?? 1) - 1
                  : activeNodes.findIndex((node) => node.category.id === category.id) ===
                    activeNodes.length - 1
              }
              onPress={() =>
                child && options.parent
                  ? moveDown(options.parent, options.childIndex)
                  : moveDown({ category, children: [] })
              }
            />
          </View>
        ) : !options.indented ? (
          <TactilePressable
            onPress={() => setNewCategory({ parentId: category.id })}
            haptic="selection"
            scaleTo={0.93}
            radius={999}
            accessibilityRole="button"
            accessibilityLabel={`Add subcategory to ${category.name}`}
            hitSlop={6}
            style={{
              paddingHorizontal: 10,
              height: 32,
              borderRadius: 999,
              backgroundColor: theme.colors.accentSoft,
              justifyContent: "center",
            }}
          >
            <Text style={[theme.text.caption, { color: theme.colors.accent, fontWeight: "700" }]}>
              + Sub
            </Text>
          </TactilePressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
      >
        <Text style={[theme.text.body, { color: theme.colors.textSecondary }]}>
          Rename, recolor, nest one level, reorder and archive. Archived categories disappear from
          pickers but stay on history.
        </Text>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          <ChoiceChip
            label="Expense"
            selected={kind === "expense"}
            onPress={() => setKind("expense")}
          />
          <ChoiceChip
            label="Income"
            selected={kind === "income"}
            onPress={() => setKind("income")}
          />
          <View style={{ flex: 1 }} />
          <ChoiceChip
            label={reorderMode ? "Done" : "Reorder"}
            selected={reorderMode}
            tone="accent"
            onPress={() => setReorderMode((current) => !current)}
          />
        </View>

        <View style={{ marginTop: 12 }}>
          <Button
            label={`New ${kind} category`}
            variant="accent"
            size="sm"
            leftIcon="plus"
            onPress={() => setNewCategory({ parentId: null })}
          />
        </View>

        {loading && !categories.length ? (
          <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 28 }} />
        ) : null}

        <SectionHeader title={`${kind === "expense" ? "Expense" : "Income"} categories`} />
        <Card variant="glass" padded={false}>
          {activeNodes.length ? (
            activeNodes.map((node, nodeIndex) => (
              <View key={node.category.id}>
                {renderCategoryRow(node.category, { isFirst: nodeIndex === 0 })}
                {node.children.map((child, index) =>
                  renderCategoryRow(child, {
                    indented: true,
                    childIndex: index,
                    parent: node,
                  }),
                )}
              </View>
            ))
          ) : (
            <Text
              style={[
                theme.text.body,
                { color: theme.colors.textTertiary, padding: 18, textAlign: "center" },
              ]}
            >
              No active categories. Add one above.
            </Text>
          )}
        </Card>

        {archived.length ? (
          <>
            <SectionHeader title="Archived" />
            <Card variant="muted" padded={false}>
              {archived.map((category, index) => (
                <TactilePressable
                  key={category.id}
                  onPress={() => setEditing(category)}
                  haptic="selection"
                  scaleTo={0.985}
                  radius={14}
                  accessibilityRole="button"
                  accessibilityLabel={`${category.name}, archived`}
                  style={{
                    minHeight: 56,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 16,
                    borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: theme.colors.border,
                  }}
                >
                  <CategoryTile icon={category.icon} color={category.color} size={34} />
                  <Text
                    style={[theme.text.body, { color: theme.colors.textSecondary, flex: 1 }]}
                    numberOfLines={1}
                  >
                    {category.name}
                  </Text>
                  <Text style={[theme.text.caption, { color: theme.colors.textTertiary }]}>
                    {category.isArchived ? "Archived" : "Hidden with parent"}
                  </Text>
                </TactilePressable>
              ))}
            </Card>
          </>
        ) : null}

        {error ? (
          <Text style={[theme.text.caption, { color: theme.colors.danger, marginTop: 14 }]}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      {editing ? (
        <CategoryEditorSheet
          category={editing}
          kind={editing.kind}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      ) : null}

      {newCategory ? (
        <CategoryEditorSheet
          kind={kind}
          categories={categories}
          defaultParentId={newCategory.parentId}
          onClose={() => setNewCategory(null)}
          onSaved={() => {
            setNewCategory(null);
            refresh();
          }}
        />
      ) : null}
    </View>
  );
}

function ReorderButton({
  direction,
  disabled,
  onPress,
}: {
  direction: "up" | "down";
  disabled: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <TactilePressable
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      scaleTo={0.9}
      radius={16}
      accessibilityRole="button"
      accessibilityLabel={direction === "up" ? "Move up" : "Move down"}
      accessibilityState={{ disabled }}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.cardBorder,
        backgroundColor: theme.colors.surfaceMuted,
        opacity: disabled ? 0.28 : 1,
      }}
    >
      <AppIcon
        name={direction === "up" ? "arrowUp" : "arrowDown"}
        color={theme.colors.textSecondary}
        size={14}
      />
    </TactilePressable>
  );
}
