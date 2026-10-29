"use client";

import { useState } from "react";
import { editAssetNameAction } from "@/app/dashboard/actions";

interface EditAssetDialogProps {
  asset: {
    id: string;
    name: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function EditAssetDialog({ asset, isOpen, onClose }: EditAssetDialogProps) {
  const [name, setName] = useState(asset.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await editAssetNameAction(asset.id, name);
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
          Edit Nama Akun
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
