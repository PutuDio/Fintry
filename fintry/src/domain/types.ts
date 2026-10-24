// Tipe domain murni Fintry (ADR-001, ADR-002, domain_rules.md).
// Bebas dependensi database, ORM, atau library eksternal.

export type AssetType = "BANK" | "E_WALLET" | "INVESTMENT" | "CASH";
export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";
export type TransactionStatus = "ACTIVE" | "VOIDED";
export type AdjustmentType = "OPENING_BALANCE" | "BALANCE_ADJUSTMENT" | "VALUATION";
export type PendingIntentKind = "NEED_CONFIRMATION" | "NEED_CLARIFICATION";
export type PendingIntentStatus = "PENDING" | "RESOLVED" | "CANCELLED" | "EXPIRED";

export interface Asset {
  id: string;
  userId: string;
  name: string;
  type: AssetType;
  currentValue: bigint;
  currency: "IDR";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: bigint;
  sourceAssetId: string | null;
  destinationAssetId: string | null;
  description: string | null;
  categoryId: string | null;
  transactionDate: string; // YYYY-MM-DD
  status: TransactionStatus;
  voidedAt: Date | null;
  replacesTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetAdjustment {
  id: string;
  userId: string;
  assetId: string;
  type: AdjustmentType;
  valueBefore: bigint;
  valueAfter: bigint;
  delta: bigint;
  reason: string | null;
  createdAt: Date;
}
