import type { AccountType } from "../../lib/db/types";

export const ACCOUNT_TYPES: { value: AccountType; label: string; glyph: string }[] = [
  { value: "cash", label: "Cash", glyph: "▤" },
  { value: "bank", label: "Bank", glyph: "▥" },
  { value: "card", label: "Card", glyph: "▭" },
  { value: "wallet", label: "Wallet", glyph: "◫" },
  { value: "savings", label: "Savings", glyph: "◈" },
];

export function accountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPES.find((entry) => entry.value === type)?.label ?? type;
}

export function accountGlyph(type: AccountType): string {
  return ACCOUNT_TYPES.find((entry) => entry.value === type)?.glyph ?? "▤";
}

export const COIN_TONES: Record<AccountType, "slate" | "sky" | "coral" | "amber" | "mint"> = {
  cash: "slate",
  bank: "sky",
  card: "coral",
  wallet: "amber",
  savings: "mint",
};
