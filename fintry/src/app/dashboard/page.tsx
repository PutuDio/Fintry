import { redirect } from "next/navigation";
import {
  getFinancialMetrics,
  getCashFlowHistory,
  getSpendingBreakdown,
  listLedgerTransactions,
} from "@/application/services";
import { getServerSession } from "@/infrastructure/auth/session";
import { db } from "@/infrastructure/db/client";
import { MetricsRow } from "@/components/dashboard/metrics-row";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { SpendingDonut } from "@/components/dashboard/spending-donut";
import { ChatInput } from "@/components/dashboard/chat-input";
import { RecentTransactionsWidget } from "@/components/dashboard/recent-transactions-widget";
import { AssetList } from "@/components/dashboard/asset-list";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Parallel server fetches for dashboard data
  const [metrics, cashFlow, breakdown, recentTxs] = await Promise.all([
    getFinancialMetrics(userId, db),
    getCashFlowHistory(userId, db, 6),
    getSpendingBreakdown(userId, db),
    listLedgerTransactions(userId, { limit: 5, status: "ACTIVE" }, db),
  ]);

  const userName =
    session.user.displayUsername ||
    session.user.username ||
    session.user.name ||
    session.user.email.split("@")[0];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 w-full space-y-8">
      {/* 1. Header Greeting & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F2F5F8]">
            Selamat Datang, {userName}
          </h1>
          <p className="text-xs text-[#C9D6E5]">
            Command Center Keuangan & Pemantauan Arus Kas
          </p>
        </div>
      </div>

      {/* 2. Four Metrics Cards */}
      <MetricsRow metrics={metrics} />

      {/* 3. Visual Charts Grid (Cash Flow Multi-bar + Spending Donut) */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <CashFlowChart data={cashFlow} />
        </div>
        <div className="lg:col-span-5">
          <SpendingDonut breakdown={breakdown} />
        </div>
      </div>

      {/* 4. Natural Language Chat Terminal */}
      <div className="rounded-xl border border-[#2F5D8C] bg-[#123A63] p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#F2F5F8]">
              Terminal Catat Transaksi
            </h2>
            <p className="text-xs text-[#C9D6E5]">
              Input mutasi keuangan instan menggunakan kecerdasan buatan (Natural Language)
            </p>
          </div>
          <span className="rounded-full bg-[#00E5A2]/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#00E5A2]">
            AI ENGINE READY
          </span>
        </div>
        <ChatInput />
      </div>

      {/* 5. Operasional: Akun & Saldo (Kiri) dan Transaksi Terakhir (Kanan) Berdampingan */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <AssetList />
        </div>
        <div className="lg:col-span-6">
          <RecentTransactionsWidget transactions={recentTxs} />
        </div>
      </div>
    </main>
  );
}
