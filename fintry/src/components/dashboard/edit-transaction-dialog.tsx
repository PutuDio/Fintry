"use client";

import { useState } from "react";
import { formatInputAmount } from "@/lib/format-input";
import { editTransactionAction } from "@/app/dashboard/actions";
import type { AssetOption, HistoryItemView } from "./history-types";

interface EditTransactionDialogProps {
  item: HistoryItemView;
  assets: AssetOption[];
  categories: string[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function EditTransactionDialog({
  item,
  assets,
  categories,
  onClose,
  onSuccess,
}: EditTransactionDialogProps) {
  const [description, setDescription] = useState(item.description ?? "");
  const [category, setCategory] = useState(item.categoryName ?? "");
  const [transactionDate, setTransactionDate] = useState(item.transactionDate.slice(0, 10));
  const [amountInput, setAmountInput] = useState(
    item.amount.replace(/\B(?=(\d{3})+(?!\d))/g, "."),
  );
  const [sourceAssetId, setSourceAssetId] = useState(
    item.sourceAssetId ?? (item.type === "INCOME" ? "" : (assets[0]?.id ?? "")),
  );
  const [destinationAssetId, setDestinationAssetId] = useState(
    item.destinationAssetId ?? (item.type === "EXPENSE" ? "" : (assets[0]?.id ?? "")),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sertakan asset lama walau sudah nonaktif agar nilai form tetap terwakili.
  const assetOptions: AssetOption[] = [...assets];
  for (const [id, name] of [
    [item.sourceAssetId, item.sourceAssetName],
    [item.destinationAssetId, item.destinationAssetName],
  ] as const) {
    if (id && name && !assetOptions.some((a) => a.id === id)) {
      assetOptions.push({ id, name: `${name} (nonaktif)` });
    }
  }

  const amountDigits = amountInput.replace(/\D/g, "");
  const amountChanged = amountDigits !== item.amount;
  const sourceChanged = item.type !== "INCOME" && sourceAssetId !== item.sourceAssetId;
  const destinationChanged =
    item.type !== "EXPENSE" && destinationAssetId !== item.destinationAssetId;
  const financialChanged = amountChanged || sourceChanged || destinationChanged;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!amountDigits || BigInt(amountDigits) <= 0n) {
      setError("Nominal harus lebih besar dari nol.");
      return;
    }
    if (item.type === "TRANSFER" && sourceAssetId === destinationAssetId) {
      setError("Akun sumber dan tujuan tidak boleh sama.");
      return;
    }
    if (item.type !== "INCOME" && !sourceAssetId) {
      setError("Pilih akun sumber.");
      return;
    }
    if (item.type !== "EXPENSE" && !destinationAssetId) {
      setError("Pilih akun tujuan.");
      return;
    }

    setLoading(true);
    try {
      const res = await editTransactionAction({
        transactionId: item.id,
        description: description.trim() ? description.trim() : null,
        category: item.type === "TRANSFER" ? null : category.trim() ? category.trim() : null,
        transactionDate,
        amount: amountDigits,
        sourceAssetId: item.type === "INCOME" ? null : sourceAssetId,
        destinationAssetId: item.type === "EXPENSE" ? null : destinationAssetId,
      });
      if (!res.success) {
        setError(res.message);
        setLoading(false);
        return;
      }
      onSuccess(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah transaksi.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-tx-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#2F5D8C] bg-[#123A63] p-6 shadow-2xl text-[#F2F5F8]"
      >
        <h2
          id="edit-tx-title"
          className="mb-1 text-xl font-bold text-[#F2F5F8]"
        >
          Edit Transaksi
        </h2>
        <p className="mb-4 text-xs text-[#C9D6E5]">
          {item.type === "INCOME" ? "Pemasukan" : item.type === "EXPENSE" ? "Pengeluaran" : "Transfer"}
          {item.sourceAssetName || item.destinationAssetName
            ? ` · ${item.sourceAssetName ?? "?"} → ${item.destinationAssetName ?? "?"}`
            : ""}
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
              htmlFor="edit-tx-description"
              className="block text-xs font-semibold uppercase tracking-wider text-[#C9D6E5] mb-1.5"
            >
              Deskripsi
            </label>
            <input
              id="edit-tx-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opsional"
              className="w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3.5 py-2.5 text-sm text-[#F2F5F8] placeholder-[#C9D6E5]/40 focus:border-[#00E5A2] focus:outline-none"
            />
          </div>

          {item.type !== "TRANSFER" && (
            <div>
              <label
                htmlFor="edit-tx-category"
                className="block text-xs font-semibold uppercase tracking-wider text-[#C9D6E5] mb-1.5"
              >
                Kategori
              </label>
              <input
                id="edit-tx-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="history-category-options"
                placeholder="Opsional"
                className="w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3.5 py-2.5 text-sm text-[#F2F5F8] placeholder-[#C9D6E5]/40 focus:border-[#00E5A2] focus:outline-none"
              />
              <datalist id="history-category-options">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-tx-date"
                className="block text-xs font-semibold uppercase tracking-wider text-[#C9D6E5] mb-1.5"
              >
                Tanggal
              </label>
              <input
                id="edit-tx-date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
                className="w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3.5 py-2.5 text-sm text-[#F2F5F8] focus:border-[#00E5A2] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="edit-tx-amount"
                className="block text-xs font-semibold uppercase tracking-wider text-[#C9D6E5] mb-1.5"
              >
                Nominal (Rp)
              </label>
              <input
                id="edit-tx-amount"
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => setAmountInput(formatInputAmount(e.target.value))}
                required
                className="w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3.5 py-2.5 font-mono text-sm text-[#F2F5F8] focus:border-[#00E5A2] focus:outline-none"
              />
            </div>
          </div>

          {item.type !== "INCOME" && (
            <div>
              <label
                htmlFor="edit-tx-source"
                className="block text-xs font-semibold uppercase tracking-wider text-[#C9D6E5] mb-1.5"
              >
                Akun Sumber
              </label>
              <select
                id="edit-tx-source"
                value={sourceAssetId}
                onChange={(e) => setSourceAssetId(e.target.value)}
                className="w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3.5 py-2.5 text-sm text-[#F2F5F8] focus:border-[#00E5A2] focus:outline-none"
              >
                {assetOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {item.type !== "EXPENSE" && (
            <div>
              <label
                htmlFor="edit-tx-destination"
                className="block text-xs font-semibold uppercase tracking-wider text-[#C9D6E5] mb-1.5"
              >
                Akun Tujuan
              </label>
              <select
                id="edit-tx-destination"
                value={destinationAssetId}
                onChange={(e) => setDestinationAssetId(e.target.value)}
                className="w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3.5 py-2.5 text-sm text-[#F2F5F8] focus:border-[#00E5A2] focus:outline-none"
              >
                {assetOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] p-3 text-xs text-[#C9D6E5]">
            {financialChanged
              ? "Perubahan nominal/akun diterapkan sebagai VOID + transaksi pengganti. Transaksi lama tetap tersimpan di riwayat."
              : "Deskripsi, kategori, dan tanggal diedit langsung tanpa mengubah saldo."}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-[#2F5D8C] px-4 py-2 text-sm font-semibold text-[#C9D6E5] transition hover:bg-[#163252] hover:text-[#F2F5F8] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[#00E5A2] px-4 py-2 text-sm font-semibold text-[#0B1F3B] transition hover:bg-[#00E5A2]/90 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
