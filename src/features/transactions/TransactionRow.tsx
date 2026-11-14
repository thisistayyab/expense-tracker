import { memo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";

import { CategoryTile, Money } from "../../components/ui";
import type { Account, Category, Transaction } from "../../lib/db/types";
import { formatMoneySpoken } from "../../lib/format/money";
import { useTheme } from "../../lib/theme";

const ACTION_WIDTH = 76;
export const TRANSACTION_ROW_HEIGHT = 64;

export type TransactionRowProps = {
  transaction: Transaction;
  category?: Category | null;
  account?: Account | null;
  transferAccount?: Account | null;
  isFirst: boolean;
  isLast: boolean;
  onPress: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onLongPress: (transaction: Transaction) => void;
};

function RowAmount({ transaction }: { transaction: Transaction }) {
  if (transaction.type === "transfer") {
    return (
      <Money
        minor={transaction.amountMinor}
        currency={transaction.currency}
        tone="muted"
        size="bodyStrong"
      />
    );
  }
  return (
    <Money
      minor={transaction.type === "expense" ? -transaction.amountMinor : transaction.amountMinor}
      currency={transaction.currency}
      tone={transaction.type === "income" ? "income" : "default"}
      showPlus={transaction.type === "income"}
      size="bodyStrong"
    />
  );
}

function SwipeAction({
  label,
  backgroundColor,
  foregroundColor,
  onPress,
}: {
  label: string;
  backgroundColor: string;
  foregroundColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: ACTION_WIDTH,
        height: "100%",
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text style={{ color: foregroundColor, fontSize: 12.5, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function SwipeActions({
  side,
  onEdit,
  onDelete,
  close,
}: {
  side: "left" | "right";
  onEdit: () => void;
  onDelete: () => void;
  close: () => void;
}): ReactNode {
  const { theme } = useTheme();
  if (side === "left") {
    return (
      <SwipeAction
        label="Edit"
        backgroundColor={theme.colors.accent}
        foregroundColor={theme.colors.accentFg}
        onPress={() => {
          close();
          onEdit();
        }}
      />
    );
  }
  return (
    <SwipeAction
      label="Delete"
      backgroundColor={theme.colors.danger}
      foregroundColor={theme.colors.onInk}
      onPress={() => {
        close();
        onDelete();
      }}
    />
  );
}

/**
 * One fixed-height Activity row. The Swipeable lives outside the content
 * Pressable, so a horizontal drag never triggers the row and a tap never opens an
 * action. `memo` matters at five thousand rows: the screen passes stable maps and
 * callbacks, so only rows whose data changed re-render.
 */
export const TransactionRow = memo(function TransactionRow({
  transaction,
  category,
  account,
  transferAccount,
  isFirst,
  isLast,
  onPress,
  onEdit,
  onDelete,
  onLongPress,
}: TransactionRowProps) {
  const { theme } = useTheme();
  const title =
    transaction.itemName?.trim() ||
    transaction.place?.trim() ||
    category?.name ||
    (transaction.type === "transfer" ? "Transfer" : "Uncategorized");
  const subtitle =
    transaction.type === "transfer"
      ? `${account?.name ?? "Account"} → ${transferAccount?.name ?? "Account"}`
      : `${category?.name ?? "Uncategorized"} · ${account?.name ?? "Account"}`;
  const hasNote = Boolean(transaction.note?.trim());
  const spokenAmount = formatMoneySpoken(
    transaction.type === "expense"
      ? -Math.abs(transaction.amountMinor)
      : Math.abs(transaction.amountMinor),
    transaction.currency,
    { showPlus: transaction.type === "income" },
  );

  const left = (methods: SwipeableMethods) => (
    <SwipeActions
      side="left"
      onEdit={() => onEdit(transaction)}
      onDelete={() => onDelete(transaction)}
      close={methods.close}
    />
  );
  const right = (methods: SwipeableMethods) => (
    <SwipeActions
      side="right"
      onEdit={() => onEdit(transaction)}
      onDelete={() => onDelete(transaction)}
      close={methods.close}
    />
  );

  return (
    <ReanimatedSwipeable
      friction={2}
      leftThreshold={ACTION_WIDTH * 0.6}
      rightThreshold={ACTION_WIDTH * 0.6}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={(_, __, methods) => left(methods)}
      renderRightActions={(_, __, methods) => right(methods)}
      containerStyle={{
        marginHorizontal: 20,
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopWidth: isFirst ? 1 : 0,
        borderBottomWidth: isLast ? 1 : 0,
        borderTopLeftRadius: isFirst ? theme.radius.card : 0,
        borderTopRightRadius: isFirst ? theme.radius.card : 0,
        borderBottomLeftRadius: isLast ? theme.radius.card : 0,
        borderBottomRightRadius: isLast ? theme.radius.card : 0,
      }}
    >
      <Pressable
        onPress={() => onPress(transaction)}
        onLongPress={() => onLongPress(transaction)}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${spokenAmount}, ${subtitle}`}
        accessibilityHint="Opens transaction details. Swipe right to edit or left to delete."
        style={({ pressed }) => ({
          minHeight: TRANSACTION_ROW_HEIGHT,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderTopWidth: isFirst ? 0 : 1,
          borderTopColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
        })}
      >
        <CategoryTile
          icon={transaction.type === "transfer" ? "ellipsis" : category?.icon}
          color={transaction.type === "transfer" ? theme.colors.transfer : category?.color}
          glyph={transaction.type === "transfer" ? "⇄" : undefined}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={[theme.text.bodyStrong, { color: theme.colors.textPrimary }]}
          >
            {title}
          </Text>
          <Text
            numberOfLines={1}
            style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}
          >
            {hasNote ? "✎ " : null}
            {subtitle}
          </Text>
        </View>
        <RowAmount transaction={transaction} />
      </Pressable>
    </ReanimatedSwipeable>
  );
});
