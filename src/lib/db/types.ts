import type { SQLiteBindParams } from "expo-sqlite";

/**
 * The slice of `expo-sqlite` the repositories need. Narrowing it here means the
 * exact same SQL can run against a Node in-memory database in Jest, which is how
 * the migration and the currency-filtering tests stay honest without a device.
 */
export type Db = {
  execAsync(source: string): Promise<void>;
  runAsync(
    source: string,
    params?: SQLiteBindParams,
  ): Promise<{ changes: number; lastInsertRowId: number }>;
  getAllAsync<T>(source: string, params?: SQLiteBindParams): Promise<T[]>;
  getFirstAsync<T>(source: string, params?: SQLiteBindParams): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
};

export type AccountType = "cash" | "bank" | "card" | "wallet" | "savings";
export type TransactionType = "expense" | "income" | "transfer";
export type CategoryKind = "expense" | "income";
export type BudgetPeriod = "weekly" | "monthly" | "yearly";
export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalanceMinor: number;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  parentId: string | null;
  name: string;
  kind: CategoryKind;
  icon: string | null;
  color: string | null;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  amountMinor: number;
  currency: string;
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  itemName: string | null;
  place: string | null;
  note: string | null;
  occurredAt: string;
  localDate: string;
  recurringId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Budget = {
  id: string;
  categoryId: string | null;
  period: BudgetPeriod;
  limitMinor: number;
  currency: string;
  rollover: boolean;
  startDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecurringRule = {
  id: string;
  type: TransactionType;
  amountMinor: number;
  currency: string;
  accountId: string;
  categoryId: string | null;
  itemName: string | null;
  place: string | null;
  note: string | null;
  frequency: RecurringFrequency;
  intervalCount: number;
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;
  nextDueAt: string;
  autoPost: boolean;
  remindDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const boolToInt = (value: boolean): number => (value ? 1 : 0);
export const intToBool = (value: number): boolean => value === 1;
export const nullable = (value: string | null): string | null =>
  value && value.trim() ? value.trim() : null;
