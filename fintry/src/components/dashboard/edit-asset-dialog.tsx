"use client";

import { useState } from "react";
import { editAssetAction } from "@/app/dashboard/actions";
import { formatInputAmount, parseFormattedAmount } from "@/lib/format-input";

interface EditAssetDialogProps {
  asset: {
    id: string;
    name: string;
    adminFee?: bigint;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function EditAssetDialog({ asset, isOpen, onClose }: EditAssetDialogProps) {
  const [name, setName] = useState(asset.name);
  const [adminFee, setAdminFee] = useState(
    asset.adminFee && asset.adminFee > 0n ? formatInputAmount(asset.adminFee.toString()) : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const feeBigInt = parseFormattedAmount(adminFee);
      const res = await editAssetAction(asset.id, name, feeBigInt);
      if (!res.success) {
        setError(res.message);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui nama akun");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-asset-title"
        className="w-full max-w-md rounded-xl border border-[#2F5D8C] bg-[#123A63] p-6 shadow-2xl text-[#F2F5F8]"
      >
        <h2 id="edit-asset-title" className="mb-4 text-lg font-bold text-[#F2F5F8]">
          Edit Pengaturan Akun
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-[#FF4B72]/15 p-3 text-sm text-[#FF4B72] border border-[#FF4B72]/30"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="edit-asset-name"
              className="block text-xs font-semibold uppercase tracking-wider text-[#C9D6E5] mb-1.5"
            >
              Nama Akun
            </label>
            <input
              id="edit-asset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3.5 py-2.5 text-sm text-[#F2F5F8] placeholder-zinc-500 focus:border-[#00E5A2] focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="edit-asset-admin-fee"
              className="block text-xs font-semibold uppercase tracking-wider text-[#C9D6E5] mb-1.5"
            >
              Biaya Admin Transaksi (Opsional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#C9D6E5]">
                Rp
              </span>
              <input
                id="edit-asset-admin-fee"
                type="text"
                inputMode="numeric"
                value={adminFee}
                onChange={(e) => setAdminFee(formatInputAmount(e.target.value))}
                placeholder="0"
                className="w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] py-2.5 pl-10 pr-3.5 font-mono text-sm text-[#F2F5F8] placeholder-zinc-500 focus:border-[#00E5A2] focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#C9D6E5]">
              Otomatis dipotong sebagai baris pengeluaran terpisah setiap kali transaksi keluar.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              disabled={loading}
              className="rounded-lg bg-[#00E5A2] px-4 py-2 text-sm font-semibold text-[#0B1F3B] hover:bg-[#00E5A2]/90 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
