import { formatIdr } from "@/domain/money";
import type { SpendingBreakdown } from "@/application/services";

interface SpendingDonutProps {
  breakdown: SpendingBreakdown;
}

export function SpendingDonut({ breakdown }: SpendingDonutProps) {
  const { total, items } = breakdown;

  // Donut geometry
  const size = 180;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedLength = 0;

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#2F5D8C] bg-[#123A63] p-5 shadow-sm">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-[#F2F5F8]">Alokasi Pengeluaran</h3>
        <p className="text-xs text-[#C9D6E5]">Berdasarkan kategori pengeluaran</p>
      </div>

      {/* Donut Chart & Center Text */}
      <div className="my-4 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="rotate-[-90deg]"
          >
            {/* Background Circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#0B1F3B"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Slices */}
            {total > 0n &&
              items.map((item, idx) => {
                const strokeDash = (item.percentage / 100) * circumference;
                const offset = -accumulatedLength;
                accumulatedLength += strokeDash;

                return (
                  <circle
                    key={idx}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={item.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
                    strokeDashoffset={offset}
                    fill="transparent"
                    className="transition-all duration-300"
                  />
                );
              })}
          </svg>

          {/* Center Label */}
          <div className="absolute flex flex-col items-center justify-center px-4 text-center">
            <span className="text-[10px] uppercase tracking-wider text-[#C9D6E5]">
              Total Beban
            </span>
            <span className="font-mono text-sm font-bold text-[#F2F5F8]">
              {formatIdr(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Legend & Categories */}
      {items.length === 0 ? (
        <p className="py-2 text-center text-xs text-[#C9D6E5]">
          Belum ada transaksi pengeluaran tercatat
        </p>
      ) : (
        <div className="space-y-2 border-t border-[#2F5D8C] pt-3">
          {items.slice(0, 4).map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-[#C9D6E5]">
                  {item.categoryName}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-semibold text-[#F2F5F8]">
                  {formatIdr(item.amount)}
                </span>
                <span className="w-10 text-right text-[11px] text-[#C9D6E5]">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
