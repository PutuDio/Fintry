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
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2
          id="void-tx-title"
          className="mb-1 text-xl font-bold text-zinc-900 dark:text-zinc-50"
        >
          Batalkan Transaksi
        </h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          {item.description ?? "Transaksi"} · {formatIdr(BigInt(item.amount))}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="void-tx-reason"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Alasan (opsional)
            </label>
            <input
              id="void-tx-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="mis. salah input nominal"
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
          </div>

          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Transaksi tidak dihapus. Saldo dibalik dan status menjadi VOIDED (tidak dapat
            di-undo; pemulihan dilakukan dengan transaksi baru).
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Membatalkan..." : "Batalkan Transaksi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
