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
  INCOME: "bg-[#00E5A2]/15 text-[#00E5A2] border border-[#00E5A2]/30",
  EXPENSE: "bg-[#FF4B72]/15 text-[#FF4B72] border border-[#FF4B72]/30",
  TRANSFER: "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30",
};

const TYPE_AMOUNT_CLASS: Record<HistoryType, string> = {
  INCOME: "text-[#00E5A2]",
  EXPENSE: "text-[#FF4B72]",
  TRANSFER: "text-[#38BDF8]",
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
          className={`rounded-lg border p-3 text-sm ${
            notice.ok
              ? "border-[#00E5A2]/30 bg-[#00E5A2]/10 text-[#00E5A2]"
              : "border-[#FF4B72]/30 bg-[#FF4B72]/10 text-[#FF4B72]"
          }`}
        >
          {notice.message}
        </div>
      )}

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#2F5D8C] bg-[#123A63] p-8 text-center text-sm text-[#C9D6E5]">
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
            className={`rounded-xl border px-4 py-3 ${
              isVoided
                ? "border-[#2F5D8C]/50 bg-[#123A63]/60 opacity-60"
                : "border-[#2F5D8C] bg-[#123A63]"
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
                    <span className="inline-block rounded bg-[#0B1F3B] px-2 py-0.5 text-xs font-medium text-[#C9D6E5]">
                      VOIDED
                    </span>
                  )}
                  {tx.categoryName && (
                    <span className="text-xs text-[#C9D6E5]">
                      {tx.categoryName}
                    </span>
                  )}
                </div>

                <p
                  className={`mt-1 text-sm font-medium text-[#F2F5F8] ${
                    isVoided ? "line-through text-[#C9D6E5]" : ""
                  }`}
                >
                  {tx.description || "—"}
                </p>

                <p className="mt-0.5 text-xs text-[#C9D6E5]">
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
                  <div className="mt-1.5 space-y-0.5 text-xs text-[#C9D6E5]">
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
                      className="rounded-md border border-[#2F5D8C] bg-[#0B1F3B] px-2.5 py-1 text-xs font-medium text-[#C9D6E5] transition hover:bg-[#163252] hover:text-[#F2F5F8]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setNotice(null);
                        setVoiding(tx);
                      }}
                      className="rounded-md border border-[#FF4B72]/30 bg-[#0B1F3B] px-2.5 py-1 text-xs font-medium text-[#FF4B72] transition hover:bg-[#FF4B72]/15"
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
