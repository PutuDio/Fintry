// Serialisable view models untuk halaman history (Server → Client props).
// BigInt tidak dapat melewati RSC boundary, sehingga amount dikirim sebagai string.

export type HistoryType = "INCOME" | "EXPENSE" | "TRANSFER";

export interface HistoryItemView {
  id: string;
  type: HistoryType;
  /** Nominal dalam digit mentah (tanpa pemisah), mis. "25000". */
  amount: string;
  description: string | null;
  categoryName: string | null;
  transactionDate: string;
  status: "ACTIVE" | "VOIDED";
  sourceAssetId: string | null;
  sourceAssetName: string | null;
  destinationAssetId: string | null;
  destinationAssetName: string | null;
  replacesTransactionId: string | null;
  replacedByTransactionId: string | null;
}

export interface AssetOption {
  id: string;
  name: string;
}
