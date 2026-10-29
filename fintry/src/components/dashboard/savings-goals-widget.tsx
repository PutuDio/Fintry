"use client";

import { useState } from "react";
import { formatIdr } from "@/domain/money";
import { Target, Plus, CheckCircle2 } from "lucide-react";

interface SavingsGoalsWidgetProps {
  cashTotal: bigint;
  investmentTotal: bigint;
  monthlyExpense: bigint;
}

export function SavingsGoalsWidget({
  cashTotal,
  investmentTotal,
  monthlyExpense,
}: SavingsGoalsWidgetProps) {
  const [showModal, setShowModal] = useState(false);

  // Dynamic emergency fund target: at least 3x monthly expenses, minimum 10jt
  const emergencyTarget =
    monthlyExpense > 0n && monthlyExpense * 3n > 10_000_000n
      ? monthlyExpense * 3n
      : 15_000_000n;
  const emergencyPct = Math.min(
    Math.round((Number(cashTotal) / Number(emergencyTarget)) * 100),
    100,
  );

  const investTarget = 50_000_000n;
  const investPct = Math.min(
    Math.round((Number(investmentTotal) / Number(investTarget)) * 100),
    100,
  );

  const goals = [
    {
      title: "Dana Darurat (3x Beban)",
      current: cashTotal,
      target: emergencyTarget,
      pct: emergencyPct,
      color: "#00E5A2",
    },
    {
      title: "Portofolio Investasi",
      current: investmentTotal,
      target: investTarget,
      pct: investPct,
      color: "#38BDF8",
    },
  ];

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#2C2A37] bg-[#101123] p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#2C2A37] pb-3">
        <div>
          <h3 className="text-base font-bold text-white">Target Tabungan</h3>
          <p className="text-xs text-[#8E8CA1]">
            Kemajuan alokasi dana dan target finansial
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1 rounded-md border border-[#2C2A37] bg-[#070711] px-2.5 py-1 text-xs font-medium text-[#8E8CA1] transition hover:border-[#00E5A2]/40 hover:text-white"
        >
          <Plus className="h-3 w-3 text-[#00E5A2]" />
          Target Baru
        </button>
      </div>

      <div className="my-4 space-y-4">
        {goals.map((g, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <Target className="h-3.5 w-3.5 text-[#00E5A2]" />
                <span>{g.title}</span>
              </div>
              <span className="font-mono text-[11px] font-bold text-[#00E5A2]">
                {g.pct}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#181935]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${g.pct}%`,
                  backgroundColor: g.color,
                }}
              />
            </div>

            <div className="flex justify-between font-mono text-[11px] text-[#8E8CA1]">
              <span>Terkumpul: {formatIdr(g.current)}</span>
              <span>Target: {formatIdr(g.target)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 text-right">
        <span className="text-[11px] text-[#8E8CA1]">
          Dihitung otomatis dari akumulasi saldo akun likuid & investasi.
        </span>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-[#2C2A37] bg-[#101123] p-5 shadow-2xl">
            <h4 className="text-base font-bold text-white">Target Tabungan Mandiri</h4>
            <p className="mt-2 text-xs text-[#8E8CA1]">
              Fitur kustomisasi target mandiri sedang dalam antrean rilis v1.3. Saat ini
              sistem mengukur otomatis Dana Darurat (3x beban bulanan) dan Portofolio
              Investasi dari saldo riil akun Anda.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg bg-[#00E5A2] px-4 py-1.5 text-xs font-bold text-[#070711] transition hover:bg-[#00E5A2]/90"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
