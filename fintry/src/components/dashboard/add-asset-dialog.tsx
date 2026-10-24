"use client";

import { useState } from "react";
import { formatInputAmount } from "@/lib/format-input";
import { createAssetAction } from "@/app/dashboard/actions";
import type { AssetType } from "@/domain/types";

export function AddAssetDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AssetType>("BANK");
  const [openingBalance, setOpeningBalance] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const balance = openingBalance.trim() ? BigInt(openingBalance.replace(/\D/g, "")) : 0n;
      await createAssetAction(name, type, balance);
      setOpen(false);
      setName("");
      setType("BANK");
      setOpeningBalance("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan akun");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Tambah Akun
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-asset-title"
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2
          id="add-asset-title"
          className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50"
        >
          Tambah Akun Baru
        </h2>

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
              htmlFor="add-asset-name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Nama Akun
            </label>
            <input
              id="add-asset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="BCA, GoPay, Bibit"
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="add-asset-type"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Tipe Akun
            </label>
            <select
              id="add-asset-type"
              onChange={(e) => setType(e.target.value as AssetType)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            >
              <option value="BANK">Bank</option>
              <option value="E_WALLET">E-Wallet</option>
              <option value="INVESTMENT">Investasi</option>
              <option value="CASH">Kas/Tunai</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="add-asset-opening"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Saldo Awal (opsional)
            </label>
            <input
              id="add-asset-opening"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(formatInputAmount(e.target.value))}
              placeholder="0"
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
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
