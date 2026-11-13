import { isCurrencyCode } from "../../constants/currencies";
import type { BudgetPeriod, RecurringFrequency, TransactionType } from "../db/types";
import { isIsoDate } from "./dates";

/**
 * Backup format v1: every table, raw column names, plus the schema version it was
 * written from. Validation is deliberately strict and happens entirely before the
 * database is touched — a typo in a hand-edited file must not half-restore.
 */

export const BACKUP_FORMAT = "expense-tracker-backup";
export const BACKUP_FORMAT_VERSION = 1;

export const BACKUP_TABLES = [
  "accounts",
  "categories",
  "recurring_rules",
  "transactions",
  "budgets",
  "category_rules",
  "tags",
  "transaction_tags",
  "attachments",
  "settings",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];
export type BackupRow = Record<string, string | number | null>;
export type BackupTables = Record<BackupTable, BackupRow[]>;
export type BackupCounts = Record<BackupTable, number>;

export type BackupPayload = {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  schemaVersion: number;
  appVersion?: string;
  exportedAt: string;
  tables: BackupTables;
};

export type BackupValidation =
  | { ok: true; payload: BackupPayload; counts: BackupCounts }
  | { ok: false; errors: string[] };

export const TABLE_COLUMNS: Record<BackupTable, readonly string[]> = {
  accounts: [
    "id",
    "name",
    "type",
    "currency",
    "opening_balance_minor",
    "color",
    "icon",
    "is_archived",
    "sort_order",
    "created_at",
    "updated_at",
  ],
  categories: [
    "id",
    "parent_id",
    "name",
    "kind",
    "icon",
    "color",
    "is_archived",
    "sort_order",
    "created_at",
    "updated_at",
  ],
  recurring_rules: [
    "id",
    "type",
    "amount_minor",
    "currency",
    "account_id",
    "category_id",
    "item_name",
    "place",
    "note",
    "frequency",
    "interval_count",
    "day_of_month",
    "start_date",
    "end_date",
    "next_due_at",
    "auto_post",
    "remind_days",
    "is_active",
    "created_at",
    "updated_at",
  ],
  transactions: [
    "id",
    "type",
    "amount_minor",
    "currency",
    "account_id",
    "transfer_account_id",
    "category_id",
    "item_name",
    "place",
    "note",
    "occurred_at",
    "local_date",
    "recurring_id",
    "created_at",
    "updated_at",
  ],
  budgets: [
    "id",
    "category_id",
    "period",
    "limit_minor",
    "currency",
    "rollover",
    "start_date",
    "is_active",
    "created_at",
    "updated_at",
  ],
  category_rules: [
    "id",
    "match_type",
    "pattern",
    "category_id",
    "priority",
    "is_active",
    "created_at",
  ],
  tags: ["id", "name", "color", "created_at"],
  transaction_tags: ["transaction_id", "tag_id"],
  attachments: [
    "id",
    "transaction_id",
    "kind",
    "file_uri",
    "width",
    "height",
    "created_at",
  ],
  settings: ["key", "value", "updated_at"],
};

/** Insertion order for a restore; deletion walks the reverse. */
export const BACKUP_INSERT_ORDER: readonly BackupTable[] = [
  "accounts",
  "categories",
  "recurring_rules",
  "transactions",
  "budgets",
  "category_rules",
  "tags",
  "transaction_tags",
  "attachments",
  "settings",
];

type Check = (value: unknown) => boolean;

const isString: Check = (value) => typeof value === "string";
const isNullableString: Check = (value) => value === null || typeof value === "string";
const isBoolInt: Check = (value) => value === 0 || value === 1;
const isIso: Check = (value) => typeof value === "string" && isIsoDate(value);
const isNullableIso: Check = (value) => value === null || isIso(value);
const isInstant: Check = (value) =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));
const isCurrency: Check = (value) => typeof value === "string" && isCurrencyCode(value);
const integerAtLeast = (minimum: number): Check => (value) =>
  Number.isSafeInteger(value) && (value as number) >= minimum;
const nullableInteger = (minimum: number): Check => (value) =>
  value === null || (Number.isSafeInteger(value) && (value as number) >= minimum);
const oneOf = (values: readonly string[]): Check => (value) =>
  typeof value === "string" && values.includes(value);

const TRANSACTION_TYPES = ["expense", "income", "transfer"] as const;
const CATEGORY_KINDS = ["expense", "income"] as const;
const ACCOUNT_TYPES = ["cash", "bank", "card", "wallet", "savings"] as const;
const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const satisfies readonly RecurringFrequency[];
const BUDGET_PERIODS = ["weekly", "monthly", "yearly"] as const satisfies readonly BudgetPeriod[];
const MATCH_TYPES = [
  "item_contains",
  "item_equals",
  "place_contains",
  "place_equals",
  "note_contains",
] as const;

const COLUMN_CHECKS: Record<BackupTable, Record<string, Check>> = {
  accounts: {
    id: isString,
    name: isString,
    type: oneOf(ACCOUNT_TYPES),
    currency: isCurrency,
    opening_balance_minor: integerAtLeast(Number.MIN_SAFE_INTEGER),
    color: isNullableString,
    icon: isNullableString,
    is_archived: isBoolInt,
    sort_order: integerAtLeast(0),
    created_at: isInstant,
    updated_at: isInstant,
  },
  categories: {
    id: isString,
    parent_id: isNullableString,
    name: isString,
    kind: oneOf(CATEGORY_KINDS),
    icon: isNullableString,
    color: isNullableString,
    is_archived: isBoolInt,
    sort_order: integerAtLeast(0),
    created_at: isInstant,
    updated_at: isInstant,
  },
  recurring_rules: {
    id: isString,
    type: oneOf(TRANSACTION_TYPES),
    amount_minor: integerAtLeast(1),
    currency: isCurrency,
    account_id: isString,
    category_id: isNullableString,
    item_name: isNullableString,
    place: isNullableString,
    note: isNullableString,
    frequency: oneOf(FREQUENCIES),
    interval_count: integerAtLeast(1),
    day_of_month: nullableInteger(1),
    start_date: isIso,
    end_date: isNullableIso,
    next_due_at: isIso,
    auto_post: isBoolInt,
    remind_days: integerAtLeast(0),
    is_active: isBoolInt,
    created_at: isInstant,
    updated_at: isInstant,
  },
  transactions: {
    id: isString,
    type: oneOf(TRANSACTION_TYPES),
    amount_minor: integerAtLeast(1),
    currency: isCurrency,
    account_id: isString,
    transfer_account_id: isNullableString,
    category_id: isNullableString,
    item_name: isNullableString,
    place: isNullableString,
    note: isNullableString,
    occurred_at: isInstant,
    local_date: isIso,
    recurring_id: isNullableString,
    created_at: isInstant,
    updated_at: isInstant,
  },
  budgets: {
    id: isString,
    category_id: isNullableString,
    period: oneOf(BUDGET_PERIODS),
    limit_minor: integerAtLeast(1),
    currency: isCurrency,
    rollover: isBoolInt,
    start_date: isIso,
    is_active: isBoolInt,
    created_at: isInstant,
    updated_at: isInstant,
  },
  category_rules: {
    id: isString,
    match_type: oneOf(MATCH_TYPES),
    pattern: isString,
    category_id: isString,
    priority: integerAtLeast(0),
    is_active: isBoolInt,
    created_at: isInstant,
  },
  tags: {
    id: isString,
    name: isString,
    color: isNullableString,
    created_at: isInstant,
  },
  transaction_tags: {
    transaction_id: isString,
    tag_id: isString,
  },
  attachments: {
    id: isString,
    transaction_id: isString,
    kind: oneOf(["receipt", "other"]),
    file_uri: isString,
    width: nullableInteger(0),
    height: nullableInteger(0),
    created_at: isInstant,
  },
  settings: {
    key: isString,
    value: isString,
    updated_at: isInstant,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function push(errors: string[], message: string): void {
  if (errors.length < 50) errors.push(message);
}

function validateRows(table: BackupTable, rows: unknown, errors: string[]): BackupRow[] {
  if (!Array.isArray(rows)) {
    push(errors, `${table} must be an array`);
    return [];
  }

  const columns = TABLE_COLUMNS[table];
  const checks = COLUMN_CHECKS[table];
  const known = new Set(columns);
  const out: BackupRow[] = [];

  rows.forEach((row, index) => {
    if (!isRecord(row)) {
      push(errors, `${table}[${index}] is not an object`);
      return;
    }

    for (const key of Object.keys(row)) {
      if (!known.has(key)) push(errors, `${table}[${index}] has unknown column ${key}`);
    }

    for (const column of columns) {
      if (!(column in row)) {
        push(errors, `${table}[${index}] is missing ${column}`);
        continue;
      }
      const value = row[column];
      if (!checks[column](value)) {
        push(errors, `${table}[${index}].${column} has an invalid value`);
      }
    }

    out.push(row as BackupRow);
  });

  return out;
}

export function countBackup(tables: BackupTables): BackupCounts {
  return Object.fromEntries(
    BACKUP_TABLES.map((table) => [table, tables[table].length]),
  ) as BackupCounts;
}

export function emptyBackupTables(): BackupTables {
  const tables = {} as BackupTables;
  for (const table of BACKUP_TABLES) tables[table] = [];
  return tables;
}

/**
 * Validate a parsed JSON value against the current schema. Returns either errors or
 * a typed payload plus per-table counts for the restore preview.
 */
export function validateBackup(value: unknown, currentSchemaVersion: number): BackupValidation {
  const errors: string[] = [];

  if (!isRecord(value)) return { ok: false, errors: ["The file is not a JSON object"] };
  if (value.format !== BACKUP_FORMAT) {
    return { ok: false, errors: ["This is not an Expense Tracker backup"] };
  }
  if (value.formatVersion !== BACKUP_FORMAT_VERSION) {
    return { ok: false, errors: [`Unsupported backup format ${String(value.formatVersion)}`] };
  }

  const schemaVersion = value.schemaVersion;
  if (!Number.isSafeInteger(schemaVersion) || (schemaVersion as number) < 1) {
    return { ok: false, errors: ["The backup has no valid schema version"] };
  }
  if ((schemaVersion as number) > currentSchemaVersion) {
    return {
      ok: false,
      errors: [
        `This backup is from a newer app (schema v${schemaVersion}); update the app first`,
      ],
    };
  }
  if (typeof value.exportedAt !== "string" || Number.isNaN(Date.parse(value.exportedAt))) {
    push(errors, "exportedAt is not a valid timestamp");
  }

  const rawTables = value.tables;
  if (!isRecord(rawTables)) {
    return { ok: false, errors: ["The backup has no tables object"] };
  }

  const tables = emptyBackupTables();
  for (const table of BACKUP_TABLES) {
    tables[table] = validateRows(table, rawTables[table], errors);
  }

  // Do not stop after row-level errors: identity, referential and duplicate checks
  // still add useful context to the same preview instead of one error at a time.

  // --- identity -----------------------------------------------------------
  const ids: Partial<Record<BackupTable, Set<string>>> = {};
  for (const table of BACKUP_TABLES) {
    if (table === "settings" || table === "transaction_tags") continue;
    const seen = new Set<string>();
    for (const row of tables[table]) {
      const id = String(row.id);
      if (seen.has(id)) push(errors, `${table} has a duplicate id ${id}`);
      seen.add(id);
    }
    ids[table] = seen;
  }

  const settingKeys = new Set<string>();
  for (const row of tables.settings) {
    const key = String(row.key);
    if (settingKeys.has(key)) push(errors, `settings has a duplicate key ${key}`);
    settingKeys.add(key);
  }

  const categoryIds = new Set(tables.categories.map((row) => String(row.id)));
  const accountIds = new Set(tables.accounts.map((row) => String(row.id)));
  const ruleIds = new Set(tables.recurring_rules.map((row) => String(row.id)));
  const transactionIds = new Set(tables.transactions.map((row) => String(row.id)));
  const tagIds = new Set(tables.tags.map((row) => String(row.id)));

  // --- referential integrity ---------------------------------------------
  for (const row of tables.categories) {
    if (row.parent_id !== null && !categoryIds.has(String(row.parent_id))) {
      push(errors, `Category ${String(row.id)} points at a missing parent`);
    }
  }
  for (const row of tables.recurring_rules) {
    if (!accountIds.has(String(row.account_id))) {
      push(errors, `Recurring rule ${String(row.id)} points at a missing account`);
    }
    if (row.category_id !== null && !categoryIds.has(String(row.category_id))) {
      push(errors, `Recurring rule ${String(row.id)} points at a missing category`);
    }
    if (row.type === "transfer") {
      push(errors, "Recurring transfers are not supported by this schema");
    }
  }
  for (const row of tables.transactions) {
    if (!accountIds.has(String(row.account_id))) {
      push(errors, `Transaction ${String(row.id)} points at a missing account`);
    }
    if (
      row.transfer_account_id !== null &&
      !accountIds.has(String(row.transfer_account_id))
    ) {
      push(errors, `Transaction ${String(row.id)} points at a missing transfer account`);
    }
    if (row.category_id !== null && !categoryIds.has(String(row.category_id))) {
      push(errors, `Transaction ${String(row.id)} points at a missing category`);
    }
    if (row.recurring_id !== null && !ruleIds.has(String(row.recurring_id))) {
      push(errors, `Transaction ${String(row.id)} points at a missing rule`);
    }
    if (row.type === "transfer" && row.transfer_account_id === null) {
      push(errors, `Transaction ${String(row.id)} is a transfer without a destination`);
    }
    if (row.type !== "transfer" && row.transfer_account_id !== null) {
      push(errors, `Transaction ${String(row.id)} has a destination but is not a transfer`);
    }
  }
  for (const row of tables.budgets) {
    if (row.category_id !== null && !categoryIds.has(String(row.category_id))) {
      push(errors, `Budget ${String(row.id)} points at a missing category`);
    }
  }
  for (const row of tables.category_rules) {
    if (!categoryIds.has(String(row.category_id))) {
      push(errors, `Category rule ${String(row.id)} points at a missing category`);
    }
  }
  for (const row of tables.attachments) {
    if (!transactionIds.has(String(row.transaction_id))) {
      push(errors, `Attachment ${String(row.id)} points at a missing transaction`);
    }
  }
  for (const row of tables.transaction_tags) {
    if (!transactionIds.has(String(row.transaction_id))) {
      push(errors, "A tag link points at a missing transaction");
    }
    if (!tagIds.has(String(row.tag_id))) {
      push(errors, "A tag link points at a missing tag");
    }
  }

  // --- unique constraints the database would otherwise reject -------------
  const budgetKeys = new Set<string>();
  for (const row of tables.budgets) {
    const key = `${String(row.category_id ?? "overall")}|${String(row.period)}|${String(
      row.currency,
    )}`;
    if (budgetKeys.has(key)) push(errors, `Duplicate budget for ${key}`);
    budgetKeys.add(key);
  }

  const occurrenceKeys = new Set<string>();
  for (const row of tables.transactions) {
    if (row.recurring_id === null) continue;
    const key = `${String(row.recurring_id)}|${String(row.local_date)}`;
    if (occurrenceKeys.has(key)) {
      push(errors, `Two transactions post the same recurring occurrence (${key})`);
    }
    occurrenceKeys.add(key);
  }

  // --- money never mixes currencies inside one row -----------------------
  const accountCurrency = new Map(
    tables.accounts.map((row) => [String(row.id), String(row.currency)]),
  );
  const accountArchived = new Map(
    tables.accounts.map((row) => [String(row.id), Number(row.is_archived)]),
  );
  for (const row of tables.transactions) {
    const source = accountCurrency.get(String(row.account_id));
    if (source && source !== row.currency) {
      push(errors, `Transaction ${String(row.id)} is in ${String(row.currency)} but its account is ${source}`);
    }
    if (row.transfer_account_id !== null) {
      const destination = accountCurrency.get(String(row.transfer_account_id));
      if (destination && destination !== row.currency) {
        push(errors, `Transaction ${String(row.id)} moves money across different currencies`);
      }
      if (row.transfer_account_id === row.account_id) {
        push(errors, `Transaction ${String(row.id)} transfers to its own account`);
      }
    }
  }
  for (const row of tables.recurring_rules) {
    const source = accountCurrency.get(String(row.account_id));
    if (source && source !== row.currency) {
      push(errors, `Recurring rule ${String(row.id)} is in ${String(row.currency)} but its account is ${source}`);
    }
    if (row.is_active === 1 && accountArchived.get(String(row.account_id)) === 1) {
      push(errors, `Recurring rule ${String(row.id)} posts into an archived account`);
    }
  }

  const categoryKind = new Map(
    tables.categories.map((row) => [String(row.id), String(row.kind)]),
  );
  for (const row of tables.recurring_rules) {
    if (row.category_id !== null && row.type !== "transfer") {
      const kind = categoryKind.get(String(row.category_id));
      if (kind && kind !== row.type) {
        push(errors, `Recurring rule ${String(row.id)} uses a ${kind} category`);
      }
    }
  }
  for (const row of tables.transactions) {
    if (row.category_id !== null && row.type !== "transfer") {
      const kind = categoryKind.get(String(row.category_id));
      if (kind && kind !== row.type) {
        push(errors, `Transaction ${String(row.id)} uses a ${kind} category`);
      }
    }
  }

  const setting = (key: string): string | null => {
    const row = tables.settings.find((entry) => entry.key === key);
    return row ? String(row.value) : null;
  };
  const currency = setting("currency");
  if (!currency || !isCurrencyCode(currency)) {
    push(errors, "The backup is missing a valid active currency");
  }
  if (!tables.settings.some((row) => row.key === "onboarded")) {
    push(errors, "The backup is missing the onboarding setting");
  } else if (!["0", "1"].includes(setting("onboarded") ?? "")) {
    push(errors, "The onboarding setting must be 0 or 1");
  }
  if (!["system", "light", "dark"].includes(setting("theme") ?? "system")) {
    push(errors, "The theme setting is invalid");
  }
  const appLock = setting("app_lock");
  if (appLock !== null && appLock !== "0" && appLock !== "1") {
    push(errors, "The app lock setting must be 0 or 1");
  }
  const lastAccountId = setting("last_account_id");
  if (lastAccountId !== null && !accountIds.has(lastAccountId)) {
    push(errors, "The remembered account does not exist in this backup");
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    payload: {
      format: BACKUP_FORMAT,
      formatVersion: BACKUP_FORMAT_VERSION,
      schemaVersion: schemaVersion as number,
      appVersion: typeof value.appVersion === "string" ? value.appVersion : undefined,
      exportedAt: String(value.exportedAt),
      tables,
    },
    counts: countBackup(tables),
  };
}

/** Used by tests and the restore preview. */
export function totalRows(tables: BackupTables): number {
  return BACKUP_TABLES.reduce((sum, table) => sum + tables[table].length, 0);
}

export type { TransactionType };
