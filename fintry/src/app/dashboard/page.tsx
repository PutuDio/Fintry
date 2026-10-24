import { redirect } from "next/navigation";
import { getDashboardSummary } from "@/application/services";
import { formatIdr } from "@/domain/money";
import { getServerSession } from "@/infrastructure/auth/session";
import { db } from "@/infrastructure/db/client";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import { ChatInput } from "@/components/dashboard/chat-input";
import { AssetList } from "@/components/dashboard/asset-list";
import { TransactionLedger } from "@/components/dashboard/transaction-ledger";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const summary = await getDashboardSummary(session.user.id, db);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <DashboardNavbar userEmail={session.user.email} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="space-y-8">
          {/* Net Worth Summary */}
          <div>
            <h1 className="mb-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Dashboard Keuangan
            </h1>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Kekayaan Bersih
                </p>
                <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {formatIdr(summary.netWorth)}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Total Kas & Bank
                </p>
                <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {formatIdr(summary.cashTotal)}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Total Investasi
                </p>
                <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {formatIdr(summary.investmentTotal)}
                </p>
              </div>
            </div>
          </div>

          {/* Chat Input */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Catat Transaksi via Chat
            </h2>
            <ChatInput />
          </div>

          {/* Assets & Transactions */}
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <AssetList />
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <TransactionLedger />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
