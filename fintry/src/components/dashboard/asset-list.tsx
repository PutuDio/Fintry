import { formatIdr } from "@/domain/money";
import { listAssets } from "@/infrastructure/repositories/assets";
import { getServerSession } from "@/infrastructure/auth/session";
import { db } from "@/infrastructure/db/client";
import { AddAssetDialog } from "@/components/dashboard/add-asset-dialog";

export async function AssetList() {
  const session = await getServerSession();
  if (!session) return null;

  const assets = await listAssets(db, session.user.id, { activeOnly: true });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Daftar Akun Aktif
        </h3>
        <AddAssetDialog />
      </div>

      {assets.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Belum ada akun. Klik tombol &quot;Tambah Akun&quot; untuk memulai.
        </p>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{asset.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {asset.type === "BANK"
                    ? "Bank"
                    : asset.type === "E_WALLET"
                      ? "E-Wallet"
                      : "Investasi"}
                </p>
              </div>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {formatIdr(asset.currentValue)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
