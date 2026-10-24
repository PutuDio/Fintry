"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatIdr } from "@/domain/money";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import { VoidTransactionDialog } from "./void-transaction-dialog";
import type { AssetOption, HistoryItemView, HistoryType } from "./history-types";

const TYPE_LABEL: Record<HistoryType, string> = {
  INCOME: "Masuk",
  EXPENSE: "Keluar",
  TRANSFER: "Transfer",
};

const TYPE_BADGE_CLASS: Record<HistoryType, string> = {
  INCOME: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  EXPENSE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  TRANSFER: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

const TYPE_AMOUNT_CLASS: Record<HistoryType, string> = {
  INCOME: "text-green-600 dark:text-green-400",
  EXPENSE: "text-red-600 dark:text-red-400",
  TRANSFER: "text-blue-600 dark:text-blue-400",
};

const TYPE_SIGN: Record<HistoryType, string> = {
  INCOME: "+",
  EXPENSE: "-",
  TRANSFER: "",
};

interface TransactionHistoryProps {
  items: HistoryItemView[];
  assets: AssetOption[];
  categories: string[];
}

export function TransactionHistory({ items, assets, categories }: TransactionHistoryProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<HistoryItemView | null>(null);
  const [voiding, setVoiding] = useState<HistoryItemView | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSuccess = (message: string) => {
    setEditing(null);
    setVoiding(null);
    setNotice({ ok: true, message });
    router.refresh();
  };

  return (
    <div className="space-y-3">
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg p-3 text-sm ${
            notice.ok
              ? "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300"
              : "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
          }`}
        >
          {notice.message}
        </div>
      )}

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          Tidak ada transaksi yang cocok dengan filter ini.
        </div>
      )}
      {items.map((tx) => {
        const isVoided = tx.status === "VOIDED";
        const assetFlow =
          tx.type === "INCOME"
            ? `→ ${tx.destinationAssetName ?? "?"}`
            : tx.type === "EXPENSE"
              ? `Dari ${tx.sourceAssetName ?? "?"}`
              : `${tx.sourceAssetName ?? "?"} → ${tx.destinationAssetName ?? "?"}`;

        return (
          <div
            key={tx.id}
            className={`rounded-xl border bg-white px-4 py-3 dark:bg-zinc-900 ${
              isVoided
                ? "border-zinc-200 opacity-60 dark:border-zinc-800"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_CLASS[tx.type]}`}
                  >
                    {TYPE_LABEL[tx.type]}
                  </span>
                  {isVoided && (
                    <span className="inline-block rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                      VOIDED
                    </span>
                  )}
                  {tx.categoryName && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {tx.categoryName}
                    </span>
                  )}
                </div>

                <p
                  className={`mt-1 text-sm text-zinc-700 dark:text-zinc-300 ${
                    isVoided ? "line-through" : ""
                  }`}
                >
                  {tx.description || "—"}
                </p>

                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(`${tx.transactionDate}T00:00:00Z`).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                  {" · "}
                  {assetFlow}
                </p>

                {(tx.replacesTransactionId || tx.replacedByTransactionId) && (
                  <div className="mt-1.5 space-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {tx.replacesTransactionId && <p>↳ Menggantikan transaksi sebelumnya.</p>}
                    {tx.replacedByTransactionId && <p>↳ Digantikan oleh transaksi baru.</p>}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <p
                  className={`text-base font-semibold ${TYPE_AMOUNT_CLASS[tx.type]} ${
                    isVoided ? "line-through" : ""
                  }`}
                >
                  {TYPE_SIGN[tx.type]}
                  {formatIdr(BigInt(tx.amount))}
                </p>
                {!isVoided && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setNotice(null);
                        setEditing(tx);
                      }}
                      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setNotice(null);
                        setVoiding(tx);
                      }}
                      className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
                    >
                      Batalkan
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {editing && (
        <EditTransactionDialog
          item={editing}
          assets={assets}
          categories={categories}
          onClose={() => setEditing(null)}
          onSuccess={handleSuccess}
        />
      )}
      {voiding && (
        <VoidTransactionDialog
          item={voiding}
          onClose={() => setVoiding(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
