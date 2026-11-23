import { BlurView } from "expo-blur";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Keyboard,
  Platform,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_CLEARANCE } from "../../components/navigation/tabBar";
import {
  appAlert,
  AppIcon,
  ChoiceChip,
  EmptyState,
  Glass,
  PickerSheet,
  TactilePressable,
} from "../../components/ui";
import { isCurrencyCode } from "../../constants/currencies";
import {
  activeFilterCount,
  dateRangeFor,
  EMPTY_FILTERS,
  typeLabel,
  type TransactionFilters,
} from "../../features/transactions/filters";
import { dateFilterLabel, FiltersSheet } from "../../features/transactions/FiltersSheet";
import { TransactionRow } from "../../features/transactions/TransactionRow";
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
import { selectableCategories } from "../../lib/domain/category-tree";
import { addDays, isIsoDate, toIsoDate } from "../../lib/domain/dates";
import { groupTransactionsByDay, type TransactionDaySection } from "../../lib/domain/transaction-groups";
import { formatMoney } from "../../lib/format/money";
import { haptics } from "../../lib/haptics";
import { useAfterKeyboardDismiss } from "../../lib/keyboard";
import { notifyLedgerChanged, subscribeLedgerChanged } from "../../lib/ledgerEvents";
import { FONT_FAMILIES, useTheme } from "../../lib/theme";
import { useUndo } from "../../lib/undo/UndoProvider";

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
        overflow: "hidden",
        paddingHorizontal: 36,
        paddingTop: 14,
        paddingBottom: 6,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        backgroundColor:
          Platform.OS === "android"
            ? theme.scheme === "dark"
              ? "rgba(11, 12, 16, 0.94)"
              : "rgba(242, 243, 247, 0.95)"
            : theme.scheme === "dark"
              ? "rgba(11, 12, 16, 0.78)"
              : "rgba(242, 243, 247, 0.80)",
      }}
    >
      {Platform.OS === "ios" || Platform.OS === "web" ? (
        <BlurView tint={theme.colors.blurTint} intensity={40} style={StyleSheet.absoluteFill} />
      ) : null}
      <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
        {dayLabel(section.date, today)}
      </Text>
      <Text
        style={[
          theme.text.caption,
          {
            color: theme.colors.textSecondary,
            fontFamily: FONT_FAMILIES.semibold,
            fontVariant: ["tabular-nums"],
          },
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
  const [focused, setFocused] = useState(false);

  return (
    <Glass
      tone="regular"
      radius={theme.radius.input}
      style={{
        height: 46,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        gap: 9,
        borderWidth: focused ? 1 : StyleSheet.hairlineWidth,
        borderColor: focused ? theme.colors.accent : theme.colors.cardBorder,
      }}
    >
      <AppIcon
        name="search"
        color={focused ? theme.colors.accent : theme.colors.textTertiary}
        size={17}
      />
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search item, place, note"
        placeholderTextColor={theme.colors.textTertiary}
        accessibilityLabel="Search transactions"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={[theme.text.body, { flex: 1, color: theme.colors.textPrimary, paddingVertical: 0 }]}
      />
      {value ? (
        <TactilePressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          scaleTo={0.86}
          radius={12}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surfaceMuted,
          }}
        >
          <AppIcon name="close" color={theme.colors.textSecondary} size={13} />
        </TactilePressable>
      ) : null}
    </Glass>
  );
}

export default function ActivityScreen() {
  const { theme } = useTheme();
  const db: Db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const showUndo = useUndo();
  const [today, setToday] = useState(() => toIsoDate(new Date()));
  const monthLabel = useMemo(
    () =>
      new Date(`${today}T00:00:00`).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [today],
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
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryTarget, setCategoryTarget] = useState<Transaction | null>(null);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const categoryOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  useEffect(() => {
    const unsubLedger = subscribeLedgerChanged(() => setFocusTick((current) => current + 1));
    const subApp = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setToday(toIsoDate(new Date()));
        setFocusTick((current) => current + 1);
      }
    });
    return () => {
      unsubLedger();
      subApp.remove();
      if (categoryOpenTimer.current) clearTimeout(categoryOpenTimer.current);
    };
  }, []);

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
        setMetadataError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setMetadataError(`Could not load activity: ${String(cause)}`);
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
          setListError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setListError(`Could not load transactions: ${String(cause)}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [db, debouncedQuery, filters, focusTick, today]);

  const error = listError ?? metadataError;

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
          notifyLedgerChanged();
          showUndo({
            message: "Transaction deleted",
            onUndo: async () => {
              await restoreTransaction(db, snapshot);
              notifyLedgerChanged();
              refresh();
            },
          });
        })
        .catch((cause: unknown) => {
          refresh();
          appAlert("Not deleted", `Nothing was removed. ${String(cause)}`);
        });
    },
    [db, refresh, showUndo],
  );

  const duplicateRow = useCallback(
    (row: Transaction) => {
      createTransaction(db, {
        type: row.type,
        amountMinor: row.amountMinor,
        feeMinor: row.feeMinor,
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
          notifyLedgerChanged();
          haptics.success();
          refresh();
          showUndo({
            message: "Transaction duplicated",
            onUndo: async () => {
              await deleteTransaction(db, created.id);
              notifyLedgerChanged();
              refresh();
            },
          });
        })
        .catch((cause: unknown) => {
          appAlert("Not duplicated", `Nothing was created. ${String(cause)}`);
        });
    },
    [db, refresh, showUndo, today],
  );

  const runAfterKeyboard = useAfterKeyboardDismiss();

  const changeCategory = useCallback(
    (row: Transaction) => {
      if (row.type === "transfer") return;
      Keyboard.dismiss();
      if (categoryOpenTimer.current) clearTimeout(categoryOpenTimer.current);
      // Wait for iOS Alert dismissal animation before presenting the PickerSheet Modal.
      categoryOpenTimer.current = setTimeout(() => {
        categoryOpenTimer.current = null;
        runAfterKeyboard(() => {
          setCategoryTarget(row);
          setCategoryPickerVisible(true);
        });
      }, 150);
    },
    [runAfterKeyboard],
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
      appAlert(row.itemName ?? row.place ?? "Transaction", undefined, actions);
    },
    [changeCategory, duplicateRow],
  );

  const openFilters = useCallback(() => {
    runAfterKeyboard(() => setFilterOpen(true));
  }, [runAfterKeyboard]);

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
    return selectableCategories(categories, {
      kind,
      includeIds: [categoryTarget.categoryId],
    });
  }, [categories, categoryTarget]);

  const applyCategory = (categoryId: string) => {
    const target = categoryTarget;
    setCategoryPickerVisible(false);
    if (!target) return;
    const previous = target.categoryId;
    updateTransaction(db, target.id, { categoryId: categoryId || null })
      .then(() => {
        notifyLedgerChanged();
        haptics.success();
        refresh();
        showUndo({
          message: "Category changed",
          onUndo: async () => {
            await updateTransaction(db, target.id, { categoryId: previous });
            notifyLedgerChanged();
            refresh();
          },
        });
      })
      .catch((cause: unknown) => {
        appAlert("Not changed", `The category stayed the same. ${String(cause)}`);
      });
  };

  const showEmpty = rows.length === 0 && !loading;
  const hasAny = totalCount !== null && totalCount > 0;
  const noResults = showEmpty && hasAny;

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <Text style={[theme.text.eyebrow, { color: theme.colors.textTertiary }]}>
            {monthLabel}
          </Text>
          <Text
            accessibilityRole="header"
            style={[theme.text.title1, { color: theme.colors.textPrimary, marginTop: 4 }]}
          >
            Activity
          </Text>

          <View style={{ marginTop: 14 }}>
            <SearchBar value={query} onChange={setQuery} onClear={() => setQuery("")} />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            // A ScrollView grows in the cross axis by default; without this the
            // chip strip eats the height the transaction list needs.
            style={{ flexGrow: 0 }}
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
                <AppIcon
                  name="sliders"
                  color={filterCount ? theme.colors.accent : theme.colors.textSecondary}
                  size={15}
                />
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
          // Keep every cell mounted on Android: clipped swipeable cells can paint
          // as empty rows after an edit or a scroll.
          removeClippedSubviews={false}
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

      <FiltersSheet
        visible={filterOpen}
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

      <PickerSheet
        visible={categoryPickerVisible}
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
        onClose={() => setCategoryPickerVisible(false)}
        onClosed={() => setCategoryTarget(null)}
      />
    </View>
  );
}
