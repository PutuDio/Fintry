"use client";

import { useState } from "react";
import {
  CreditCard,
  Building2,
  Wallet,
  TrendingUp,
  Banknote,
  Edit2,
  SlidersHorizontal,
  Archive,
  Plus,
} from "lucide-react";
import { formatIdr } from "@/domain/money";
import { AddAssetDialog } from "./add-asset-dialog";
import { EditAssetDialog } from "./edit-asset-dialog";
import { ReconcileAssetBalanceDialog } from "./reconcile-asset-balance-dialog";
import { deactivateAssetAction } from "@/app/dashboard/actions";
import type { AssetType } from "@/domain/types";

interface AssetData {
  id: string;
  userId: string;
  name: string;
  type: AssetType;
  currentValue: bigint;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AdjustmentData {
  id: string;
  userId: string;
  assetId: string;
  type: "OPENING_BALANCE" | "BALANCE_ADJUSTMENT" | "VALUATION";
  valueBefore: bigint;
  valueAfter: bigint;
  delta: bigint;
  reason: string | null;
  createdAt: Date;
}

interface AccountsViewProps {
  assets: AssetData[];
  adjustments: AdjustmentData[];
}

export function AccountsView({ assets, adjustments }: AccountsViewProps) {
  const [editingAsset, setEditingAsset] = useState<AssetData | null>(null);
  const [reconcilingAsset, setReconcilingAsset] = useState<AssetData | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Asset Map for lookup
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  // Totals
  const totalCash = assets
    .filter((a) => a.isActive && (a.type === "BANK" || a.type === "E_WALLET" || a.type === "CASH"))
    .reduce((sum, a) => sum + a.currentValue, 0n);

  const totalInvestment = assets
    .filter((a) => a.isActive && a.type === "INVESTMENT")
    .reduce((sum, a) => sum + a.currentValue, 0n);

  const totalAll = totalCash + totalInvestment;

  async function handleDeactivate(asset: AssetData) {
    if (asset.currentValue !== 0n) {
      setFeedbackMessage({
        type: "error",
        text: "Akun dengan saldo tidak nol tidak dapat dinonaktifkan.",
      });
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menonaktifkan akun "${asset.name}"?`)) {
      return;
    }

    setDeactivatingId(asset.id);
    try {
      const res = await deactivateAssetAction(asset.id);
      if (res.success) {
        setFeedbackMessage({ type: "success", text: res.message });
      } else {
        setFeedbackMessage({ type: "error", text: res.message });
      }
    } catch (err) {
      setFeedbackMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Gagal menonaktifkan akun.",
      });
    } finally {
      setDeactivatingId(null);
    }
  }
  function getAssetIcon(type: AssetType) {
    switch (type) {
      case "BANK":
        return <Building2 className="h-5 w-5 text-[#38BDF8]" />;
      case "E_WALLET":
        return <Wallet className="h-5 w-5 text-[#00E5A2]" />;
      case "CASH":
        return <Banknote className="h-5 w-5 text-[#F59E0B]" />;
      case "INVESTMENT":
        return <TrendingUp className="h-5 w-5 text-[#A855F7]" />;
    }
  }

  function getTypeName(type: AssetType) {
    switch (type) {
      case "BANK":
        return "Bank";
      case "E_WALLET":
        return "E-Wallet";
      case "CASH":
        return "Tunai / Cash";
      case "INVESTMENT":
        return "Investasi";
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F2F5F8]">
            Kelola Akun & Saldo
          </h1>
          <p className="mt-1 text-sm text-[#C9D6E5]">
            Atur rekening bank, e-wallet, dompet tunai, portofolio investasi, serta riwayat rekonsiliasi saldo.
          </p>
        </div>
        <div>
          <AddAssetDialog />
        </div>
      </div>

      {feedbackMessage && (
        <div
          role="alert"
          className={`rounded-lg border p-3.5 text-sm ${
            feedbackMessage.type === "success"
              ? "border-[#00E5A2]/30 bg-[#00E5A2]/10 text-[#00E5A2]"
              : "border-[#FF4B72]/30 bg-[#FF4B72]/10 text-[#FF4B72]"
          }`}
        >
          {feedbackMessage.text}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#2F5D8C] bg-[#123A63] p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C9D6E5]">
            Total Likuid (Kas & Bank)
          </span>
          <p className="mt-2 font-mono text-2xl font-bold text-[#F2F5F8]">
            {formatIdr(totalCash)}
          </p>
        </div>

        <div className="rounded-xl border border-[#2F5D8C] bg-[#123A63] p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C9D6E5]">
            Total Investasi
          </span>
          <p className="mt-2 font-mono text-2xl font-bold text-[#A855F7]">
            {formatIdr(totalInvestment)}
          </p>
        </div>

        <div className="rounded-xl border border-[#2F5D8C] bg-[#123A63] p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C9D6E5]">
            Total Kekayaan Bersih (Net Worth)
          </span>
          <p className="mt-2 font-mono text-2xl font-bold text-[#00E5A2]">
            {formatIdr(totalAll)}
          </p>
        </div>
      </div>

      {/* Accounts List Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#F2F5F8]">Daftar Akun Keuangan</h2>

        {assets.length === 0 ? (
          <div className="rounded-xl border border-[#2F5D8C] bg-[#123A63] p-8 text-center text-[#C9D6E5]">
            Belum ada akun yang terdaftar. Klik tombol Tambah Akun di atas untuk memulai.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className={`relative flex flex-col justify-between rounded-xl border p-5 transition ${
                  asset.isActive
                    ? "border-[#2F5D8C] bg-[#123A63] hover:border-[#00E5A2]/50"
                    : "border-[#2F5D8C]/40 bg-[#0B1F3B]/60 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2F5D8C] bg-[#0B1F3B]">
                        {getAssetIcon(asset.type)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#F2F5F8]">{asset.name}</h3>
                        <span className="text-xs text-[#C9D6E5]">
                          {getTypeName(asset.type)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                        asset.isActive
                          ? "bg-[#00E5A2]/15 text-[#00E5A2]"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {asset.isActive ? "AKTIF" : "NONAKTIF"}
                    </span>
                  </div>

                  <div className="mt-5">
                    <span className="text-[11px] uppercase tracking-wider text-[#C9D6E5]">
                      Saldo Saat Ini
                    </span>
                    <p className="font-mono text-xl font-bold text-[#F2F5F8]">
                      {formatIdr(asset.currentValue)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                {asset.isActive && (
                  <div className="mt-5 flex items-center justify-between border-t border-[#2F5D8C] pt-3.5 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingAsset(asset)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3 py-1.5 text-xs font-medium text-[#C9D6E5] hover:bg-[#163252] hover:text-[#F2F5F8]"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit Nama
                    </button>

                    <button
                      type="button"
                      onClick={() => setReconcilingAsset(asset)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#00E5A2]/30 bg-[#00E5A2]/10 px-3 py-1.5 text-xs font-medium text-[#00E5A2] hover:bg-[#00E5A2]/20"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Koreksi Saldo
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Adjustments & Reconciliation Log */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-[#F2F5F8]">
          Riwayat Rekonsiliasi & Penyesuaian Saldo
        </h2>

        {adjustments.length === 0 ? (
          <div className="rounded-xl border border-[#2F5D8C] bg-[#123A63] p-6 text-center text-sm text-[#C9D6E5]">
            Belum ada riwayat penyesuaian saldo yang tercatat.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#2F5D8C] bg-[#123A63]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#2F5D8C] bg-[#0B1F3B] text-xs font-semibold uppercase tracking-wider text-[#C9D6E5]">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Akun</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3 text-right">Sebelum</th>
                  <th className="px-4 py-3 text-right">Sesudah</th>
                  <th className="px-4 py-3 text-right">Selisih (Delta)</th>
                  <th className="px-4 py-3">Alasan / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2F5D8C] text-[#F2F5F8]">
                {adjustments.map((adj) => {
                  const asset = assetMap.get(adj.assetId);
                  const isPositive = adj.delta > 0n;
                  return (
                    <tr key={adj.id} className="hover:bg-[#163252]/50 transition">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[#C9D6E5]">
                        {new Date(adj.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {asset ? asset.name : "Akun Terhapus"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#0B1F3B] px-2 py-0.5 text-[11px] font-medium text-[#C9D6E5]">
                          {adj.type === "OPENING_BALANCE"
                            ? "Saldo Awal"
                            : adj.type === "BALANCE_ADJUSTMENT"
                            ? "Koreksi Saldo"
                            : "Valuasi"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-[#C9D6E5]">
                        {formatIdr(adj.valueBefore)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-[#F2F5F8]">
                        {formatIdr(adj.valueAfter)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-mono text-xs font-semibold ${
                          isPositive ? "text-[#00E5A2]" : "text-[#FF4B72]"
                        }`}
                      >
                        {isPositive
                          ? `+${formatIdr(adj.delta)}`
                          : formatIdr(adj.delta)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#C9D6E5]">
                        {adj.reason || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editingAsset && (
        <EditAssetDialog
          asset={editingAsset}
          isOpen={true}
          onClose={() => setEditingAsset(null)}
        />
      )}

      {/* Reconcile Dialog */}
      {reconcilingAsset && (
        <ReconcileAssetBalanceDialog
          asset={reconcilingAsset}
          isOpen={true}
          onClose={() => setReconcilingAsset(null)}
        />
      )}

    </div>
  );
}
