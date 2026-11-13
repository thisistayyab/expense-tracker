import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_CLEARANCE } from "../../components/navigation/FloatingTabBar";
import { ChoiceChip, EmptyState, PickerSheet } from "../../components/ui";
import { listAccounts } from "../../lib/db/repos/accounts";
import { listCategories } from "../../lib/db/repos/categories";
import { getAllSettings, SETTING_KEYS } from "../../lib/db/repos/settings";
import {
  countTransactions,
  createTransaction,
  deleteTransaction,
  listCurrenciesInUse,
  listTransactions,
  restoreTransaction,
  updateTransaction,
} from "../../lib/db/repos/transactions";
import type { Account, Category, Db, Transaction } from "../../lib/db/types";
import { isCurrencyCode } from "../../constants/currencies";
import { addDays, isIsoDate, toIsoDate } from "../../lib/domain/dates";
import { groupTransactionsByDay, type TransactionDaySection } from "../../lib/domain/transaction-groups";
import { formatMoney } from "../../lib/format/money";
import { haptics } from "../../lib/haptics";
import { useTheme } from "../../lib/theme";
import { useUndo } from "../../lib/undo/UndoProvider";
import {
  activeFilterCount,
  dateRangeFor,
  EMPTY_FILTERS,
  typeLabel,
  type TransactionFilters,
} from "../../features/transactions/filters";
import { FiltersSheet, dateFilterLabel } from "../../features/transactions/FiltersSheet";
import { TransactionRow } from "../../features/transactions/TransactionRow";

const PAGE_LIMIT = 5_000;

function dayLabel(iso: string, today: string): string {
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function dayTotalLabel(section: TransactionDaySection, activeCurrency: string): string {
  const preferred =
    section.totals.find((total) => total.currency === activeCurrency) ?? section.totals[0];
  if (!preferred) return "";
  const amount = formatMoney(preferred.totalMinor, preferred.currency, {
    withCode: preferred.currency !== activeCurrency,
  });
  if (section.totals.length <= 1) return amount;
  return `${amount} · +${section.totals.length - 1} other`;
}

function DayHeader({
  section,
  activeCurrency,
  today,
}: {
  section: TransactionDaySection;
  activeCurrency: string;
  today: string;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.bg,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 6,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
        {dayLabel(section.date, today)}
      </Text>
      <Text
        style={[
          theme.text.caption,
          { color: theme.colors.textSecondary, fontWeight: "600", fontVariant: ["tabular-nums"] },
        ]}
        numberOfLines={1}
      >
        {dayTotalLabel(section, activeCurrency)}
      </Text>
    </View>
  );
}

function SearchBar({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          height: 46,
          borderRadius: 23,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.cardBorder === "transparent" ? theme.colors.border : theme.colors.cardBorder,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 15,
          gap: 9,
        },
        theme.shadow.card,
      ]}
    >
      <Text style={[theme.text.body, { color: theme.colors.textTertiary, fontSize: 19 }]}>⌕</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search item, place, note"
        placeholderTextColor={theme.colors.textTertiary}
        accessibilityLabel="Search transactions"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={[theme.text.body, { flex: 1, color: theme.colors.textPrimary, paddingVertical: 0 }]}
      />
      {value ? (
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          style={({ pressed }) => ({
            width: 30,
            height: 30,
            borderRadius: 15,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surfaceSunken,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={[theme.text.caption, { color: theme.colors.textSecondary }]}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function ActivityScreen() {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const showUndo = useUndo();
  const today = useMemo(() => toIsoDate(new Date()), []);
  const monthLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    [],
  );

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  // Deep links from Overview (currency) and Insights (category + period) land here
  // already filtered. The URL wins while it is present, so no filter is copied into
  // state and no effect is needed; clearing a filter clears its param.
  const params = useLocalSearchParams<{
    currency?: string;
    categoryId?: string;
    from?: string;
    to?: string;
  }>();
  const paramCurrency =
    typeof params.currency === "string" && isCurrencyCode(params.currency)
      ? params.currency.toUpperCase()
      : null;
  const paramCategoryId =
    typeof params.categoryId === "string" && params.categoryId ? params.categoryId : null;
  const paramFrom = typeof params.from === "string" && isIsoDate(params.from) ? params.from : null;
  const paramTo = typeof params.to === "string" && isIsoDate(params.to) ? params.to : null;

  const [baseFilters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const filters = useMemo(() => {
    let next = baseFilters;
    if (paramCurrency) next = { ...next, currency: paramCurrency };
    if (paramCategoryId) next = { ...next, categoryId: paramCategoryId };
    if (paramFrom || paramTo) {
      next = { ...next, datePreset: "custom", fromDate: paramFrom, toDate: paramTo };
    }
    return next;
  }, [baseFilters, paramCategoryId, paramCurrency, paramFrom, paramTo]);

  const clearRouteFilters = useCallback(() => {
    if (paramCurrency || paramCategoryId || paramFrom || paramTo) {
      router.setParams({ currency: "", categoryId: "", from: "", to: "" });
    }
  }, [paramCategoryId, paramCurrency, paramFrom, paramTo]);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencies, setCurrencies] = useState<{ currency: string; count: number }[]>([]);
  const [activeCurrency, setActiveCurrency] = useState("USD");
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryTarget, setCategoryTarget] = useState<Transaction | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  // Re-read after a save, edit, delete, undo or returning from another tab.
  useFocusEffect(
    useCallback(() => {
      setFocusTick((current) => current + 1);
      return undefined;
    }, []),
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);


  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAllSettings(db),
      listAccounts(db, { includeArchived: true }),
      listCategories(db, { includeArchived: true }),
      listCurrenciesInUse(db),
      countTransactions(db),
    ])
      .then(([settings, nextAccounts, nextCategories, nextCurrencies, total]) => {
        if (cancelled) return;
        setActiveCurrency(settings[SETTING_KEYS.currency] ?? "USD");
        setAccounts(nextAccounts);
        setCategories(nextCategories);
        setCurrencies(nextCurrencies);
        setTotalCount(total);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(`Could not load activity: ${String(cause)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [db, focusTick]);

  useEffect(() => {
    let cancelled = false;
    const range = dateRangeFor(filters, today);
    listTransactions(db, {
      text: debouncedQuery.trim() || undefined,
      type: filters.type === "all" ? undefined : filters.type,
      accountId: filters.accountId ?? undefined,
      categoryId: filters.categoryId ?? undefined,
      currency: filters.currency ?? undefined,
      notePresent: filters.notePresent || undefined,
      fromDate: range.fromDate,
      toDate: range.toDate,
      limit: PAGE_LIMIT,
    })
      .then((next) => {
        if (!cancelled) {
          setRows(next);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(`Could not load transactions: ${String(cause)}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [db, debouncedQuery, filters, focusTick, today]);

  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const sections = useMemo(() => groupTransactionsByDay(rows), [rows]);
  const filterCount = activeFilterCount(filters);

  const refresh = useCallback(() => {
    setFocusTick((current) => current + 1);
  }, []);

  const clearAll = useCallback(() => {
    setQuery("");
    setFilters(EMPTY_FILTERS);
    clearRouteFilters();
    Keyboard.dismiss();
  }, [clearRouteFilters]);

  const openDetail = useCallback((row: Transaction) => {
    router.push(`/transaction/${row.id}`);
  }, []);

  const editRow = useCallback((row: Transaction) => {
    router.push({ pathname: "/add", params: { id: row.id } });
  }, []);

  const deleteRow = useCallback(
    (row: Transaction) => {
      const snapshot = row;
      setRows((current) => current.filter((candidate) => candidate.id !== row.id));
      setTotalCount((current) => (current === null ? current : Math.max(0, current - 1)));
      haptics.success();
      deleteTransaction(db, row.id)
        .then(() => {
          showUndo({
            message: "Transaction deleted",
            onUndo: async () => {
              await restoreTransaction(db, snapshot);
              refresh();
            },
          });
        })
        .catch((cause: unknown) => {
          refresh();
          Alert.alert("Not deleted", `Nothing was removed. ${String(cause)}`);
        });
    },
    [db, refresh, showUndo],
  );

  const duplicateRow = useCallback(
    (row: Transaction) => {
      createTransaction(db, {
        type: row.type,
        amountMinor: row.amountMinor,
        currency: row.currency,
        accountId: row.accountId,
        transferAccountId: row.transferAccountId,
        categoryId: row.categoryId,
        itemName: row.itemName,
        place: row.place,
        note: row.note,
        occurredAt: new Date().toISOString(),
        localDate: today,
      })
        .then((created) => {
          haptics.success();
          refresh();
          showUndo({
            message: "Transaction duplicated",
            onUndo: async () => {
              await deleteTransaction(db, created.id);
              refresh();
            },
          });
        })
        .catch((cause: unknown) => {
          Alert.alert("Not duplicated", `Nothing was created. ${String(cause)}`);
        });
    },
    [db, refresh, showUndo, today],
  );

  const changeCategory = useCallback(
    (row: Transaction) => {
      if (row.type === "transfer") return;
      setCategoryTarget(row);
    },
    [],
  );

  const longPressRow = useCallback(
    (row: Transaction) => {
      const actions = [
        { text: "Duplicate", onPress: () => duplicateRow(row) },
        ...(row.type !== "transfer"
          ? [{ text: "Change category", onPress: () => changeCategory(row) }]
          : []),
        { text: "Cancel", style: "cancel" as const },
      ];
      Alert.alert(row.itemName ?? row.place ?? "Transaction", undefined, actions);
    },
    [changeCategory, duplicateRow],
  );

  const openFilters = useCallback(() => {
    Keyboard.dismiss();
    setFilterOpen(true);
  }, []);

  const removeDateFilter = useCallback(() => {
    if (paramFrom || paramTo) router.setParams({ from: "", to: "" });
    setFilters((current) => ({
      ...current,
      datePreset: "all",
      fromDate: null,
      toDate: null,
    }));
  }, [paramFrom, paramTo]);

  const badges = useMemo(() => {
    const result: { key: string; label: string; clear: () => void }[] = [];
    const dateLabel = dateFilterLabel(filters);
    if (dateLabel) {
      result.push({ key: "date", label: dateLabel, clear: removeDateFilter });
    }
    if (filters.type !== "all") {
      result.push({
        key: "type",
        label: typeLabel(filters.type),
        clear: () => setFilters((current) => ({ ...current, type: "all" })),
      });
    }
    if (filters.accountId) {
      result.push({
        key: "account",
        label: accountById.get(filters.accountId)?.name ?? "Account",
        clear: () => setFilters((current) => ({ ...current, accountId: null })),
      });
    }
    if (filters.categoryId) {
      result.push({
        key: "category",
        label: categoryById.get(filters.categoryId)?.name ?? "Category",
        clear: () => {
          if (paramCategoryId) router.setParams({ categoryId: "" });
          setFilters((current) => ({ ...current, categoryId: null }));
        },
      });
    }
    if (filters.currency) {
      result.push({
        key: "currency",
        label: filters.currency,
        clear: () => {
          if (paramCurrency) router.setParams({ currency: "" });
          setFilters((current) => ({ ...current, currency: null }));
        },
      });
    }
    if (filters.notePresent) {
      result.push({
        key: "note",
        label: "Has note",
        clear: () => setFilters((current) => ({ ...current, notePresent: false })),
      });
    }
    return result;
  }, [accountById, categoryById, filters, paramCategoryId, paramCurrency, removeDateFilter]);

  const categoryOptions = useMemo(() => {
    if (!categoryTarget || categoryTarget.type === "transfer") return [];
    const kind = categoryTarget.type === "income" ? "income" : "expense";
    return categories.filter(
      (category) =>
        category.kind === kind &&
        (!category.isArchived || category.id === categoryTarget.categoryId),
    );
  }, [categories, categoryTarget]);

  const applyCategory = (categoryId: string) => {
    const target = categoryTarget;
    setCategoryTarget(null);
    if (!target) return;
    const previous = target.categoryId;
    updateTransaction(db, target.id, { categoryId: categoryId || null })
      .then(() => {
        haptics.success();
        refresh();
        showUndo({
          message: "Category changed",
          onUndo: async () => {
            await updateTransaction(db, target.id, { categoryId: previous });
            refresh();
          },
        });
      })
      .catch((cause: unknown) => {
        Alert.alert("Not changed", `The category stayed the same. ${String(cause)}`);
      });
  };

  const showEmpty = rows.length === 0 && !loading;
  const hasAny = totalCount !== null && totalCount > 0;
  const noResults = showEmpty && hasAny;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
            {monthLabel}
          </Text>
          <Text style={[theme.text.title1, { color: theme.colors.textPrimary, marginTop: 4 }]}>
            Activity
          </Text>

          <View style={{ marginTop: 14 }}>
            <SearchBar value={query} onChange={setQuery} onClear={() => setQuery("")} />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8, paddingVertical: 12, paddingRight: 4 }}
          >
            <ChoiceChip
              label="All"
              selected={filterCount === 0 && !query}
              onPress={clearAll}
              accessibilityLabel="Show all transactions"
            />
            {badges.map((badge) => (
              <ChoiceChip
                key={badge.key}
                label={`${badge.label} ×`}
                selected
                tone="accent"
                onPress={badge.clear}
                accessibilityLabel={`Remove ${badge.label} filter`}
              />
            ))}
            <ChoiceChip
              label={filterCount ? `Filters · ${filterCount}` : "Filters"}
              selected={filterCount > 0}
              tone="accent"
              onPress={openFilters}
              leading={
                <Text style={{ color: filterCount ? theme.colors.accent : theme.colors.textSecondary }}>
                  ⚙
                </Text>
              }
            />
          </ScrollView>
        </View>

        {error ? (
          <View style={{ paddingHorizontal: 20, paddingVertical: 6 }}>
            <Text style={[theme.text.caption, { color: theme.colors.danger }]}>{error}</Text>
          </View>
        ) : null}

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={20}
          maxToRenderPerBatch={24}
          updateCellsBatchingPeriod={40}
          windowSize={9}
          removeClippedSubviews={Platform.OS === "android"}
          contentContainerStyle={{
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
            flexGrow: 1,
          }}
          renderSectionHeader={({ section }) => (
            <DayHeader section={section} activeCurrency={activeCurrency} today={today} />
          )}
          renderItem={({ item, index, section }) => (
            <TransactionRow
              transaction={item}
              category={item.categoryId ? categoryById.get(item.categoryId) : null}
              account={accountById.get(item.accountId) ?? null}
              transferAccount={
                item.transferAccountId ? (accountById.get(item.transferAccountId) ?? null) : null
              }
              isFirst={index === 0}
              isLast={index === section.data.length - 1}
              onPress={openDetail}
              onEdit={editRow}
              onDelete={deleteRow}
              onLongPress={longPressRow}
            />
          )}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
              {loading ? (
                <ActivityIndicator color={theme.colors.accent} />
              ) : noResults ? (
                <EmptyState
                  title="No matches"
                  body="Try a different search, widen the date range, or clear the filters."
                  actionLabel="Clear filters"
                  onAction={clearAll}
                />
              ) : (
                <EmptyState
                  title="No transactions yet"
                  body="Your entries land here, grouped by day and searchable by name, place, note or amount."
                  actionLabel="Add transaction"
                  onAction={() => router.push("/add")}
                />
              )}
            </View>
          }
        />
      </SafeAreaView>

      {hasAny ? (
        <Pressable
          onPress={() => router.push("/add")}
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
          style={({ pressed }) => [
            {
              position: "absolute",
              right: 20,
              bottom: insets.bottom + TAB_BAR_CLEARANCE,
              width: 60,
              height: 60,
              borderRadius: 30,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.accent,
              opacity: pressed ? 0.85 : 1,
            },
            theme.shadow.fab,
          ]}
        >
          <Text style={{ color: theme.colors.accentFg, fontSize: 32, lineHeight: 34, fontWeight: "300" }}>
            +
          </Text>
        </Pressable>
      ) : null}

      {filterOpen ? (
        <FiltersSheet
          value={filters}
          accounts={accounts}
          categories={categories}
          currencies={currencies}
          onApply={(next) => {
            clearRouteFilters();
            setFilters(next);
            setFilterOpen(false);
          }}
          onClose={() => setFilterOpen(false)}
        />
      ) : null}

      <PickerSheet
        visible={Boolean(categoryTarget)}
        title="Change category"
        options={categoryOptions.map((category) => ({
          value: category.id,
          label: category.name,
          secondary: category.isArchived ? "Archived" : undefined,
        }))}
        selected={categoryTarget?.categoryId ?? undefined}
        searchable
        searchPlaceholder="Search categories"
        onSelect={applyCategory}
        onClose={() => setCategoryTarget(null)}
      />
    </View>
  );
}
