import type { AppIconName } from "../../components/ui";
import type { AccountType } from "../../lib/db/types";

export const ACCOUNT_TYPES: {
  value: AccountType;
  label: string;
  icon: AppIconName;
}[] = [
  { value: "cash", label: "Cash", icon: "banknote" },
  { value: "bank", label: "Bank", icon: "building" },
  { value: "card", label: "Card", icon: "creditcard" },
  { value: "wallet", label: "Wallet", icon: "wallet" },
  { value: "savings", label: "Savings", icon: "diamond" },
];

export function accountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPES.find((entry) => entry.value === type)?.label ?? type;
}

export function accountIcon(type: AccountType): AppIconName {
  return ACCOUNT_TYPES.find((entry) => entry.value === type)?.icon ?? "wallet";
}

export const COIN_TONES: Record<AccountType, "slate" | "sky" | "coral" | "amber" | "mint"> = {
  cash: "slate",
  bank: "sky",
  card: "coral",
  wallet: "amber",
  savings: "mint",
};
