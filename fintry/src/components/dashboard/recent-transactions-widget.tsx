import Link from "next/link";
import { formatIdr } from "@/domain/money";
import type { TransactionLedgerItem } from "@/application/services";
import { ArrowRight, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";

interface RecentTransactionsWidgetProps {
  transactions: TransactionLedgerItem[];
}

export function RecentTransactionsWidget({
  transactions,
}: RecentTransactionsWidgetProps) {
  const items = transactions.slice(0, 5);

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#2F5D8C] bg-[#123A63] p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#2F5D8C] pb-3">
        <div>
          <h3 className="text-base font-bold text-[#F2F5F8]">Transaksi Terakhir</h3>
          <p className="text-xs text-[#C9D6E5]">5 aktivitas keuangan teranyar</p>
        </div>
        <Link
          href="/dashboard/history"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#00E5A2] transition hover:text-[#00E5A2]/80"
        >
          Lihat Semua
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="my-3 divide-y divide-[#2F5D8C]/80">
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-[#C9D6E5]">
              Belum ada transaksi. Gunakan terminal chat di atas untuk mencatat.
            </p>
          </div>
        ) : (
          items.map((tx) => {
            const isIncome = tx.type === "INCOME";
            const isExpense = tx.type === "EXPENSE";

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 first:pt-1 last:pb-1"
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isIncome
                        ? "bg-[#00E5A2]/15 text-[#00E5A2]"
                        : isExpense
                        ? "bg-[#FF4B72]/15 text-[#FF4B72]"
                        : "bg-[#38BDF8]/15 text-[#38BDF8]"
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : isExpense ? (
                      <ArrowDownRight className="h-4 w-4" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </div>
                  <div className="truncate">
                    <p className="truncate text-xs font-semibold text-[#F2F5F8]">
                      {tx.description || tx.categoryName || "Transaksi"}
                    </p>
                    <p className="text-[11px] font-mono text-[#C9D6E5]">
                      {tx.categoryName ? `${tx.categoryName} • ` : ""}
                      {new Date(tx.transactionDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right font-mono text-xs font-bold">
                  <p
                    className={
                      isIncome
                        ? "text-[#00E5A2]"
                        : isExpense
                        ? "text-[#FF4B72]"
                        : "text-[#38BDF8]"
                    }
                  >
                    {isIncome ? "+" : isExpense ? "-" : ""}
                    {formatIdr(tx.amount)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-2 text-right">
        <Link
          href="/dashboard/history"
          className="text-[11px] text-[#C9D6E5] hover:text-[#F2F5F8]"
        >
          Lihat semua mutasi & status transaksi →
        </Link>
      </div>
    </div>
  );
}
