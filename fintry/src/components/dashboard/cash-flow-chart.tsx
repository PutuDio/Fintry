"use client";

import { useState } from "react";
import { formatIdr } from "@/domain/money";
import type { MonthlyCashFlowItem } from "@/application/services";

interface CashFlowChartProps {
  data: MonthlyCashFlowItem[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // SVG dimensions
  const svgWidth = 560;
  const svgHeight = 220;
  const paddingTop = 25;
  const paddingBottom = 35;
  const paddingLeft = 55;
  const paddingRight = 15;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Find max value across all months (minimum scale 1.000.000)
  let maxAmount = 1_000_000n;
  for (const item of data) {
    if (item.income > maxAmount) maxAmount = item.income;
    if (item.expense > maxAmount) maxAmount = item.expense;
  }

  // 3 grid lines (0%, 50%, 100%)
  const gridSteps = [0, 0.5, 1];

  const barWidth = 14;
  const barGap = 4;
  const groupWidth = chartWidth / (data.length || 1);

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#2F5D8C] bg-[#123A63] p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-[#F2F5F8]">Arus Kas (Cash Flow)</h3>
          <p className="text-xs text-[#C9D6E5]">
            Pemasukan vs Pengeluaran — 6 bulan terakhir
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#00E5A2]" />
            <span className="text-[#C9D6E5]">Pemasukan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#FF4B72]" />
            <span className="text-[#C9D6E5]">Pengeluaran</span>
          </div>
        </div>
      </div>

      {/* Interactive Tooltip Card */}
      <div className="h-7 pt-1">
        {hoveredIdx !== null && data[hoveredIdx] ? (
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="font-bold text-[#F2F5F8]">
              {data[hoveredIdx].monthKey} ({data[hoveredIdx].label}):
            </span>
            <span className="text-[#00E5A2]">
              Masuk: {formatIdr(data[hoveredIdx].income)}
            </span>
            <span className="text-[#FF4B72]">
              Keluar: {formatIdr(data[hoveredIdx].expense)}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-[#C9D6E5]/60">
            Arahkan kursor ke batang untuk melihat rincian bulan
          </span>
        )}
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Horizontal Grid lines */}
          {gridSteps.map((step, idx) => {
            const y = paddingTop + chartHeight * (1 - step);
            const gridVal = (maxAmount * BigInt(Math.round(step * 100))) / 100n;
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#2F5D8C"
                  strokeDasharray={step > 0 ? "3 3" : undefined}
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#C9D6E5"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {step === 0 ? "0" : formatShortIdr(gridVal)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((item, idx) => {
            const groupCenterX =
              paddingLeft + idx * groupWidth + groupWidth / 2;

            const incomeH =
              maxAmount > 0n
                ? Math.round(
                    (Number(item.income) / Number(maxAmount)) * chartHeight,
                  )
                : 0;
            const expenseH =
              maxAmount > 0n
                ? Math.round(
                    (Number(item.expense) / Number(maxAmount)) * chartHeight,
                  )
                : 0;

            const incomeX = groupCenterX - barWidth - barGap / 2;
            const expenseX = groupCenterX + barGap / 2;

            const incomeY = paddingTop + chartHeight - incomeH;
            const expenseY = paddingTop + chartHeight - expenseH;

            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={item.monthKey}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer transition-opacity"
              >
                {/* Background hover highlight */}
                {isHovered && (
                  <rect
                    x={paddingLeft + idx * groupWidth + 2}
                    y={paddingTop}
                    width={groupWidth - 4}
                    height={chartHeight}
                    fill="#181935"
                    opacity="0.4"
                    rx="4"
                  />
                )}

                {/* Income bar */}
                <rect
                  x={incomeX}
                  y={incomeY}
                  width={barWidth}
                  height={Math.max(incomeH, 2)}
                  rx="3"
                  fill="#00E5A2"
                  opacity={hoveredIdx === null || isHovered ? 1 : 0.4}
                />

                {/* Expense bar */}
                <rect
                  x={expenseX}
                  y={expenseY}
                  width={barWidth}
                  height={Math.max(expenseH, 2)}
                  rx="3"
                  fill="#FF4B72"
                  opacity={hoveredIdx === null || isHovered ? 1 : 0.4}
                />

                {/* X-axis Month Label */}
                <text
                  x={groupCenterX}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  fill={isHovered ? "#F2F5F8" : "#C9D6E5"}
                  fontSize="11"
                  fontWeight={isHovered ? "bold" : "normal"}
                  fontFamily="monospace"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function formatShortIdr(amount: bigint): string {
  if (amount >= 1_000_000_000n) {
    return `${(Number(amount) / 1_000_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000_000n) {
    return `${(Number(amount) / 1_000_000).toFixed(0)}jt`;
  }
  if (amount >= 1_000n) {
    return `${(Number(amount) / 1_000).toFixed(0)}rb`;
  }
  return amount.toString();
}
