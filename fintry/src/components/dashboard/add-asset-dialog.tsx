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
        className="rounded-lg bg-[#00E5A2] px-4 py-2 text-sm font-semibold text-[#0B1F3B] transition hover:bg-[#00E5A2]/90"
      >
        Tambah Akun
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-asset-title"
        className="w-full max-w-md rounded-xl border border-[#2F5D8C] bg-[#123A63] p-6 shadow-2xl text-[#F2F5F8]"
      >
        <h2
          id="add-asset-title"
          className="mb-4 text-xl font-bold text-[#F2F5F8]"
        >
          Tambah Akun Baru
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-[#FF4B72]/30 bg-[#FF4B72]/15 p-3 text-sm text-[#FF4B72]"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="add-asset-name"
              className="block text-xs font-semibold uppercase tracking-wider text-[#C9D6E5] mb-1.5"
            >
              Nama Akun
            </label>
            <input
              id="add-asset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="BCA, GoPay, Bibit"
              className="w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3.5 py-2.5 text-sm text-[#F2F5F8] placeholder-zinc-500 focus:border-[#00E5A2] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="add-asset-type"
              className="block text-xs font-semibold uppercase tracking-wider text-[#C9D6E5] mb-1.5"
            >
              Tipe Akun
            </label>
            <select
              id="add-asset-type"
              onChange={(e) => setType(e.target.value as AssetType)}
              className="w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3.5 py-2.5 text-sm text-[#F2F5F8] focus:border-[#00E5A2] focus:outline-none"
            >
              <option value="BANK" className="bg-[#123A63] text-[#F2F5F8]">Bank</option>
              <option value="E_WALLET" className="bg-[#123A63] text-[#F2F5F8]">E-Wallet</option>
              <option value="INVESTMENT" className="bg-[#123A63] text-[#F2F5F8]">Investasi</option>
              <option value="CASH" className="bg-[#123A63] text-[#F2F5F8]">Kas/Tunai</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="add-asset-opening"
              className="block text-xs font-semibold uppercase tracking-wider text-[#C9D6E5] mb-1.5"
            >
              Saldo Awal (opsional)
            </label>
            <input
              id="add-asset-opening"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(formatInputAmount(e.target.value))}
              placeholder="0"
              className="w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3.5 py-2.5 font-mono text-sm text-[#F2F5F8] placeholder-zinc-500 focus:border-[#00E5A2] focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1 rounded-lg border border-[#2F5D8C] px-4 py-2 text-sm font-medium text-[#C9D6E5] transition hover:bg-[#163252] hover:text-[#F2F5F8] disabled:opacity-50"
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
