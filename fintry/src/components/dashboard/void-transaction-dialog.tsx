"use client";

import { useState } from "react";
import { formatIdr } from "@/domain/money";
import { voidTransactionAction } from "@/app/dashboard/actions";
import type { HistoryItemView } from "./history-types";

interface VoidTransactionDialogProps {
  item: HistoryItemView;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function VoidTransactionDialog({ item, onClose, onSuccess }: VoidTransactionDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await voidTransactionAction(item.id, reason.trim() ? reason.trim() : null);
      if (!res.success) {
        setError(res.message);
        setLoading(false);
        return;
      }
      onSuccess(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membatalkan transaksi.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="void-tx-title"
        className="w-full max-w-md rounded-xl border border-[#2F5D8C] bg-[#123A63] p-6 shadow-2xl text-[#F2F5F8]"
      >
        <h2
          id="void-tx-title"
          className="mb-1 text-xl font-bold text-[#F2F5F8]"
        >
          Batalkan Transaksi
        </h2>
        <p className="mb-4 text-sm text-[#C9D6E5]">
          {item.description ?? "Transaksi"} · {formatIdr(BigInt(item.amount))}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-[#FF4B72]/30 bg-[#FF4B72]/10 p-3 text-sm text-[#FF4B72]"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="void-tx-reason"
              className="block text-xs font-semibold uppercase tracking-wider text-[#C9D6E5] mb-1.5"
            >
              Alasan (opsional)
            </label>
            <input
              id="void-tx-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="mis. salah input nominal"
              className="w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3.5 py-2.5 text-sm text-[#F2F5F8] placeholder-[#C9D6E5]/40 focus:border-[#00E5A2] focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] p-3 text-xs text-[#C9D6E5]">
            Transaksi tidak dihapus. Saldo dibalik dan status menjadi VOIDED (tidak dapat
            di-undo; pemulihan dilakukan dengan transaksi baru).
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-[#2F5D8C] px-4 py-2 text-sm font-semibold text-[#C9D6E5] transition hover:bg-[#163252] hover:text-[#F2F5F8] disabled:opacity-50"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[#FF4B72] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#FF4B72]/90 disabled:opacity-50"
            >
              {loading ? "Membatalkan..." : "Batalkan Transaksi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
