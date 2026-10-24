import Link from "next/link";
import { formatIdr } from "@/domain/money";
import { listLedgerTransactions } from "@/application/services";
import { getServerSession } from "@/infrastructure/auth/session";
import { db } from "@/infrastructure/db/client";

export async function TransactionLedger() {
  const session = await getServerSession();
  if (!session) return null;

  const transactions = await listLedgerTransactions(
    session.user.id,
    { limit: 20, status: "ACTIVE" },
    db,
  );

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Riwayat Transaksi
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Belum ada transaksi. Mulai catat lewat chat di atas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Riwayat Transaksi (20 Terbaru)
        </h3>
        <Link
          href="/dashboard/history"
          className="text-sm font-medium text-zinc-600 underline transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Lihat semua →
        </Link>
      </div>

      <div className="space-y-2">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-start justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                    tx.type === "INCOME"
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : tx.type === "EXPENSE"
                        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  }`}
                >
                  {tx.type === "INCOME" ? "Masuk" : tx.type === "EXPENSE" ? "Keluar" : "Transfer"}
                </span>
                {tx.categoryName && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {tx.categoryName}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                {tx.description || "—"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(tx.transactionDate).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <p
              className={`text-lg font-semibold ${
                tx.type === "INCOME"
                  ? "text-green-600 dark:text-green-400"
                  : tx.type === "EXPENSE"
                    ? "text-red-600 dark:text-red-400"
                    : "text-blue-600 dark:text-blue-400"
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
