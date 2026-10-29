import Link from "next/link";
import { Building2, Wallet, TrendingUp, Banknote, ArrowRight } from "lucide-react";
import { formatIdr } from "@/domain/money";
import { listAssets } from "@/infrastructure/repositories/assets";
import { getServerSession } from "@/infrastructure/auth/session";
import { db } from "@/infrastructure/db/client";

export async function AssetList() {
  const session = await getServerSession();
  if (!session) return null;

  const assets = await listAssets(db, session.user.id, { activeOnly: true });

  function getIcon(type: string) {
    switch (type) {
      case "BANK":
        return <Building2 className="h-4 w-4 text-[#38BDF8]" />;
      case "E_WALLET":
        return <Wallet className="h-4 w-4 text-[#00E5A2]" />;
      case "CASH":
        return <Banknote className="h-4 w-4 text-[#F59E0B]" />;
      case "INVESTMENT":
        return <TrendingUp className="h-4 w-4 text-[#A855F7]" />;
      default:
        return <Wallet className="h-4 w-4 text-[#00E5A2]" />;
    }
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#2F5D8C] bg-[#123A63] p-5 shadow-sm">
      <div>
        <div className="flex items-center justify-between border-b border-[#2F5D8C] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#F2F5F8]">Akun & Saldo</h3>
            <p className="text-xs text-[#C9D6E5]">Pantauan saldo akun aktif</p>
          </div>
          <Link
            href="/dashboard/accounts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00E5A2] hover:underline"
          >
            Kelola Akun
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {assets.length === 0 ? (
          <div className="my-3 rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] p-6 text-center">
            <p className="text-xs text-[#C9D6E5]">Belum ada akun aktif.</p>
            <Link
              href="/dashboard/accounts"
              className="mt-2 inline-block text-xs font-medium text-[#00E5A2] hover:underline"
            >
              + Tambah akun baru
            </Link>
          </div>
        ) : (
          <div className="my-3 space-y-2.5">
            {assets.slice(0, 5).map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between rounded-lg border border-[#2F5D8C]/80 bg-[#0B1F3B] px-3.5 py-2.5 transition hover:border-[#2F5D8C]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2F5D8C] bg-[#123A63]">
                    {getIcon(asset.type)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#F2F5F8]">{asset.name}</p>
                    <p className="text-[11px] text-[#C9D6E5]">
                      {asset.type === "BANK"
                        ? "Bank"
                        : asset.type === "E_WALLET"
                        ? "E-Wallet"
                        : asset.type === "CASH"
                        ? "Tunai"
                        : "Investasi"}
                    </p>
                  </div>
                </div>
                <p className="font-mono text-sm font-bold text-[#F2F5F8]">
                  {formatIdr(asset.currentValue)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[#2F5D8C] pt-3 text-right">
        <Link
          href="/dashboard/accounts"
          className="text-[11px] text-[#C9D6E5] hover:text-[#F2F5F8]"
        >
          Buka manajemen akun & penyesuaian saldo →
        </Link>
      </div>
    </div>
  );
}
