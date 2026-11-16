import { memo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { AppIcon, type AppIconName, CategoryTile, Money } from "../../components/ui";
import type { Account, Category, Transaction } from "../../lib/db/types";
import { formatMoneySpoken } from "../../lib/format/money";
import { useTheme } from "../../lib/theme";

const ACTION_WIDTH = 76;
export const TRANSACTION_ROW_HEIGHT = 66;

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
      minor={transaction.amountMinor}
      currency={transaction.currency}
      tone={transaction.type === "income" ? "income" : "default"}
      showPlus={transaction.type === "income"}
      size="bodyStrong"
    />
  );
}

function SwipeAction({
  label,
  icon,
  backgroundColor,
  foregroundColor,
  onPress,
}: {
  label: string;
  icon: AppIconName;
  backgroundColor: string;
  foregroundColor: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: ACTION_WIDTH,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        backgroundColor,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <AppIcon name={icon} size={17} color={foregroundColor} weight="semibold" />
      <Text style={[theme.text.caption, { color: foregroundColor, fontWeight: "700", fontSize: 11.5 }]}>
        {label}
      </Text>
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
        icon="sliders"
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
      icon="trash"
      backgroundColor={theme.colors.danger}
      foregroundColor={theme.colors.accentFg}
      onPress={() => {
        close();
        onDelete();
      }}
    />
  );
}

/**
 * Interactive frosted-group activity row with swipe actions and continuous corner rounding.
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

  const spokenAmount = formatMoneySpoken(transaction.amountMinor, transaction.currency);

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
      friction={1.8}
      leftThreshold={ACTION_WIDTH * 0.55}
      rightThreshold={ACTION_WIDTH * 0.55}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={(_progress, _drag, methods) => left(methods)}
      renderRightActions={(_progress, _drag, methods) => right(methods)}
      containerStyle={{
        overflow: "hidden",
        borderTopLeftRadius: isFirst ? theme.radius.card : 0,
        borderTopRightRadius: isFirst ? theme.radius.card : 0,
        borderBottomLeftRadius: isLast ? theme.radius.card : 0,
        borderBottomRightRadius: isLast ? theme.radius.card : 0,
        borderCurve: "continuous",
      }}
    >
      <Pressable
        onPress={() => onPress(transaction)}
        onLongPress={() => onLongPress(transaction)}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${spokenAmount}, ${subtitle}`}
        accessibilityHint="Opens transaction details. Swipe right to edit or left to delete."
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: pressed ? theme.colors.surfaceMuted : "transparent",
          },
        ]}
      >
        <CategoryTile
          icon={transaction.type === "transfer" ? "transfer" : category?.icon}
          color={transaction.type === "transfer" ? theme.colors.transfer : category?.color}
        />
        <View style={styles.textCol}>
          <Text
            style={[theme.text.bodyStrong, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[theme.text.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
        <RowAmount transaction={transaction} />
        {!isLast ? (
          <View
            pointerEvents="none"
            style={[
              styles.divider,
              {
                backgroundColor: theme.colors.border,
              },
            ]}
          />
        ) : null}
      </Pressable>
    </ReanimatedSwipeable>
  );
});

const styles = StyleSheet.create({
  row: {
    minHeight: TRANSACTION_ROW_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  divider: {
    position: "absolute",
    bottom: 0,
    left: 70,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
});
