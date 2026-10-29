import { formatIdr } from "@/domain/money";
import type { FinancialMetrics } from "@/application/services";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Layers,
} from "lucide-react";

interface MetricsRowProps {
  metrics: FinancialMetrics;
}

export function MetricsRow({ metrics }: MetricsRowProps) {
  const isNetWorthUp = metrics.netWorthDeltaPct >= 0;
  const isIncomeUp = metrics.incomeDeltaPct >= 0;
  const isExpenseUp = metrics.expenseDeltaPct > 0; // up in expense is usually red warning

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* 1. Kekayaan Bersih */}
      <div className="relative overflow-hidden rounded-xl border border-[#2F5D8C] bg-[#123A63] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C9D6E5]">
            Kekayaan Bersih
          </span>
          <div className="rounded-lg bg-[#00E5A2]/10 p-2 text-[#00E5A2]">
            <Layers className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-[#F2F5F8]">
          {formatIdr(metrics.netWorth)}
        </p>
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
              isNetWorthUp
                ? "bg-[#00E5A2]/15 text-[#00E5A2]"
                : "bg-[#FF4B72]/15 text-[#FF4B72]"
            }`}
          >
            {isNetWorthUp ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isNetWorthUp ? "+" : ""}
            {metrics.netWorthDeltaPct.toFixed(1)}%
          </span>
          <span className="text-[#C9D6E5]">vs bulan lalu</span>
        </div>
      </div>

      {/* 2. Pemasukan Bulanan */}
      <div className="relative overflow-hidden rounded-xl border border-[#2F5D8C] bg-[#123A63] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C9D6E5]">
            Pemasukan Bulan Ini
          </span>
          <div className="rounded-lg bg-[#00E5A2]/10 p-2 text-[#00E5A2]">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-[#00E5A2]">
          {formatIdr(metrics.monthlyIncome)}
        </p>
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
              isIncomeUp
                ? "bg-[#00E5A2]/15 text-[#00E5A2]"
                : "bg-[#FF4B72]/15 text-[#FF4B72]"
            }`}
          >
            {isIncomeUp ? "+" : ""}
            {metrics.incomeDeltaPct.toFixed(1)}%
          </span>
          <span className="text-[#C9D6E5]">vs bulan lalu</span>
        </div>
      </div>

      {/* 3. Total Pengeluaran */}
      <div className="relative overflow-hidden rounded-xl border border-[#2F5D8C] bg-[#123A63] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C9D6E5]">
            Total Pengeluaran
          </span>
          <div className="rounded-lg bg-[#FF4B72]/10 p-2 text-[#FF4B72]">
            <ArrowDownRight className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-[#FF4B72]">
          {formatIdr(metrics.monthlyExpenses)}
        </p>
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
              isExpenseUp
                ? "bg-[#FF4B72]/15 text-[#FF4B72]"
                : "bg-[#00E5A2]/15 text-[#00E5A2]"
            }`}
          >
            {isExpenseUp ? "+" : ""}
            {metrics.expenseDeltaPct.toFixed(1)}%
          </span>
          <span className="text-[#C9D6E5]">vs bulan lalu</span>
        </div>
      </div>
    </div>
  );
}
