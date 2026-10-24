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
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2
          id="edit-tx-title"
          className="mb-1 text-xl font-bold text-zinc-900 dark:text-zinc-50"
        >
          Edit Transaksi
        </h2>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          {item.type === "INCOME" ? "Pemasukan" : item.type === "EXPENSE" ? "Pengeluaran" : "Transfer"}
          {item.sourceAssetName || item.destinationAssetName
            ? ` · ${item.sourceAssetName ?? "?"} → ${item.destinationAssetName ?? "?"}`
            : ""}
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
              htmlFor="edit-tx-description"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Deskripsi
            </label>
            <input
              id="edit-tx-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opsional"
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
          </div>

          {item.type !== "TRANSFER" && (
            <div>
              <label
                htmlFor="edit-tx-category"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
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
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
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
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Tanggal
              </label>
              <input
                id="edit-tx-date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
              />
            </div>
            <div>
              <label
                htmlFor="edit-tx-amount"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
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
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
              />
            </div>
          </div>

          {item.type !== "INCOME" && (
            <div>
              <label
                htmlFor="edit-tx-source"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Akun Sumber
              </label>
              <select
                id="edit-tx-source"
                value={sourceAssetId}
                onChange={(e) => setSourceAssetId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
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
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Akun Tujuan
              </label>
              <select
                id="edit-tx-destination"
                value={destinationAssetId}
                onChange={(e) => setDestinationAssetId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
              >
                {assetOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            {financialChanged
              ? "Perubahan nominal/akun diterapkan sebagai VOID + transaksi pengganti. Transaksi lama tetap tersimpan di riwayat."
              : "Deskripsi, kategori, dan tanggal diedit langsung tanpa mengubah saldo."}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
