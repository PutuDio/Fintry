"use client";

import { useState } from "react";
import { formatIdr } from "@/domain/money";
import { formatInputAmount } from "@/lib/format-input";
import { reconcileAssetBalanceAction } from "@/app/dashboard/actions";

interface ReconcileAssetBalanceDialogProps {
  asset: {
    id: string;
    name: string;
    currentValue: bigint;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function ReconcileAssetBalanceDialog({
  asset,
  isOpen,
  onClose,
}: ReconcileAssetBalanceDialogProps) {
  const [targetAmount, setTargetAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const rawDigits = targetAmount.replace(/\D/g, "");
  const targetBigInt = rawDigits ? BigInt(rawDigits) : null;
  const delta = targetBigInt !== null ? targetBigInt - asset.currentValue : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (targetBigInt === null) {
      setError("Masukkan saldo sebenarnya yang valid.");
      return;
    }
    if (delta === 0n) {
      setError("Saldo baru sama dengan saldo tercatat (tidak ada selisih koreksi).");
      return;
    }
    if (targetBigInt < 0n) {
      setError("Saldo tidak boleh negatif.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await reconcileAssetBalanceAction(asset.id, targetBigInt, reason);
      if (!res.success) {
        setError(res.message);
      } else {
        onClose();
        setTargetAmount("");
        setReason("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengoreksi saldo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reconcile-asset-title"
        className="w-full max-w-lg rounded-xl border border-[#2F5D8C] bg-[#123A63] p-6 shadow-2xl text-[#F2F5F8]"
      >
        <div className="mb-4">
          <h2 id="reconcile-asset-title" className="text-lg font-bold text-[#F2F5F8]">
            Koreksi Saldo: {asset.name}
          </h2>
          <p className="mt-1 text-xs text-[#C9D6E5]">
            Penyesuaian saldo riil akan dicatat secara transparan pada log audit & riwayat penyesuaian (*append-only*).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-[#FF4B72]/15 p-3 text-sm text-[#FF4B72] border border-[#FF4B72]/30"
            >
              {error}
            </div>
          )}

          <div className="rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] p-3.5 flex justify-between items-center">
            <span className="text-xs text-[#C9D6E5]">Saldo Tercatat Saat Ini</span>
            <span className="font-mono text-sm font-semibold text-[#F2F5F8]">
              {formatIdr(asset.currentValue)}
            </span>
          </div>

          <div>
            <label
              htmlFor="reconcile-amount"
              className="block text-xs font-semibold uppercase tracking-wider text-[#C9D6E5] mb-1.5"
            >
              Saldo Sebenarnya (Hasil Rekonsiliasi)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#C9D6E5] font-mono">
                Rp
              </span>
              <input
                id="reconcile-amount"
                type="text"
                inputMode="numeric"
                value={targetAmount}
                onChange={(e) => setTargetAmount(formatInputAmount(e.target.value))}
                placeholder="0"
                required
                className="w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] py-2.5 pl-10 pr-3.5 font-mono text-sm text-[#F2F5F8] placeholder-zinc-600 focus:border-[#00E5A2] focus:outline-none"
              />
            </div>
          </div>

          {delta !== null && (
            <div className="flex items-center justify-between rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3.5 py-2.5">
              <span className="text-xs text-[#C9D6E5]">Selisih Penyesuaian (Delta):</span>
              <span
                className={`font-mono text-sm font-bold ${
                  delta > 0n
                    ? "text-[#00E5A2]"
                    : delta < 0n
                    ? "text-[#FF4B72]"
                    : "text-zinc-400"
                }`}
              >
                {delta > 0n ? `+${formatIdr(delta)}` : formatIdr(delta)}
              </span>
            </div>
          )}

          <div>
            <label
              htmlFor="reconcile-reason"
              className="block text-xs font-semibold uppercase tracking-wider text-[#C9D6E5] mb-1.5"
            >
              Alasan Penyesuaian (Opsional)
            </label>
            <input
              id="reconcile-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Bunga bank, selisih kas fisik, rekonsiliasi bulanan"
              className="w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3.5 py-2.5 text-sm text-[#F2F5F8] placeholder-zinc-600 focus:border-[#00E5A2] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-[#2F5D8C] px-4 py-2 text-sm font-medium text-[#C9D6E5] hover:bg-[#163252] hover:text-[#F2F5F8]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || delta === null || delta === 0n}
              className="rounded-lg bg-[#00E5A2] px-4 py-2 text-sm font-semibold text-[#0B1F3B] hover:bg-[#00E5A2]/90 disabled:opacity-40"
            >
              {loading ? "Menyimpan..." : "Terapkan Koreksi Saldo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
