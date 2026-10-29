import Link from "next/link";
import { formatIdr } from "@/domain/money";
import { listLedgerTransactions } from "@/application/services";
import { getServerSession } from "@/infrastructure/auth/session";
import { db } from "@/infrastructure/db/client";
import { ArrowRight } from "lucide-react";

export async function TransactionLedger() {
  const session = await getServerSession();
  if (!session) return null;

  const transactions = await listLedgerTransactions(
    session.user.id,
    { limit: 15, status: "ACTIVE" },
    db,
  );

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-[#2C2A37] bg-[#101123] p-6 text-center">
        <h3 className="mb-2 text-base font-bold text-white">Riwayat Transaksi</h3>
        <p className="text-xs text-[#8E8CA1]">
          Belum ada transaksi tercatat. Mulai catat transaksi lewat input terminal di atas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">Riwayat Transaksi</h3>
          <p className="text-xs text-[#8E8CA1]">15 aktivitas keuangan terakhir</p>
        </div>
        <Link
          href="/dashboard/history"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00E5A2] hover:underline"
        >
          Lihat semua
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-2">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-start justify-between rounded-lg border border-[#2C2A37] bg-[#070711] px-4 py-3 transition hover:border-[#2C2A37]/80"
          >
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
                    tx.type === "INCOME"
                      ? "bg-[#00E5A2]/15 text-[#00E5A2]"
                      : tx.type === "EXPENSE"
                      ? "bg-[#FF4B72]/15 text-[#FF4B72]"
                      : "bg-[#38BDF8]/15 text-[#38BDF8]"
                  }`}
                >
                  {tx.type === "INCOME" ? "Masuk" : tx.type === "EXPENSE" ? "Keluar" : "Transfer"}
                </span>
                {tx.categoryName && (
                  <span className="truncate text-xs text-[#8E8CA1]">
                    {tx.categoryName}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm font-medium text-white">
                {tx.description || "—"}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[#8E8CA1]">
                {new Date(tx.transactionDate).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <p
              className={`shrink-0 font-mono text-sm font-bold ${
                tx.type === "INCOME"
                  ? "text-[#00E5A2]"
                  : tx.type === "EXPENSE"
                  ? "text-[#FF4B72]"
                  : "text-[#38BDF8]"
              }`}
            >
              {tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : ""}
              {formatIdr(tx.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
