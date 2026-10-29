import { redirect } from "next/navigation";
import Link from "next/link";
import {
  countLedgerTransactions,
  listLedgerTransactions,
  type LedgerStatusFilter,
  type LedgerType,
} from "@/application/services";
import { listAssets } from "@/infrastructure/repositories/assets";
import { listCategories } from "@/infrastructure/repositories/categories";
import { getServerSession } from "@/infrastructure/auth/session";
import { db } from "@/infrastructure/db/client";
import { HistoryNavbar } from "@/components/dashboard/history-navbar";
import { TransactionHistory } from "@/components/dashboard/transaction-history";
import type { HistoryItemView } from "@/components/dashboard/history-types";

const PAGE_SIZE = 20;

const TYPE_FILTERS: { value: LedgerType | "ALL"; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "INCOME", label: "Masuk" },
  { value: "EXPENSE", label: "Keluar" },
  { value: "TRANSFER", label: "Transfer" },
];

const STATUS_FILTERS: { value: LedgerStatusFilter; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "VOIDED", label: "Voided" },
];

interface HistoryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const typeRaw = Array.isArray(params.type) ? params.type[0] : params.type;
  const statusRaw = Array.isArray(params.status) ? params.status[0] : params.status;
  const pageRaw = Array.isArray(params.page) ? params.page[0] : params.page;

  const type: LedgerType | undefined =
    typeRaw === "INCOME" || typeRaw === "EXPENSE" || typeRaw === "TRANSFER" ? typeRaw : undefined;
  const status: LedgerStatusFilter =
    statusRaw === "ACTIVE" || statusRaw === "VOIDED" ? statusRaw : "ALL";
  const parsedPage = Number.parseInt(pageRaw ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [rows, total, assetRows, categoryRows] = await Promise.all([
    listLedgerTransactions(
      session.user.id,
      { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, status, type },
      db,
    ),
    countLedgerTransactions(session.user.id, { status, type }, db),
    listAssets(db, session.user.id, { activeOnly: true }),
    listCategories(db, session.user.id),
  ]);

  const viewItems: HistoryItemView[] = rows.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: tx.amount.toString(),
    description: tx.description,
    categoryName: tx.categoryName,
    transactionDate: tx.transactionDate,
    status: tx.status,
    sourceAssetId: tx.sourceAssetId,
    sourceAssetName: tx.sourceAssetName,
    destinationAssetId: tx.destinationAssetId,
    destinationAssetName: tx.destinationAssetName,
    replacesTransactionId: tx.replacesTransactionId,
    replacedByTransactionId: tx.replacedByTransactionId,
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  const buildHref = (next: {
    type?: LedgerType | "ALL";
    status?: LedgerStatusFilter;
    page?: number;
  }) => {
    const nextType = next.type ?? type ?? "ALL";
    const nextStatus = next.status ?? status;
    const nextPage = next.page ?? 1;
    const query = new URLSearchParams();
    if (nextType !== "ALL") query.set("type", nextType);
    if (nextStatus !== "ALL") query.set("status", nextStatus);
    if (nextPage > 1) query.set("page", String(nextPage));
    const qs = query.toString();
    return qs ? `/dashboard/history?${qs}` : "/dashboard/history";
  };

  const pillBase =
    "rounded-full px-3 py-1 text-xs font-medium transition border";
  const pillActive =
    "border-[#00E5A2] bg-[#00E5A2] text-[#0B1F3B] font-semibold";
  const pillInactive =
    "border-[#2F5D8C] bg-[#0B1F3B] text-[#C9D6E5] hover:bg-[#163252] hover:text-[#F2F5F8]";

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F2F5F8]">
            Riwayat Transaksi
          </h1>
          <p className="text-xs text-[#C9D6E5]">
            Daftar dan filter seluruh aktivitas transaksi keuangan Anda
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-[#2F5D8C] bg-[#123A63] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-14 text-xs font-semibold uppercase tracking-wide text-[#C9D6E5]">
              Tipe
            </span>
            {TYPE_FILTERS.map((f) => {
              const active = (type ?? "ALL") === f.value;
              return (
                <Link
                  key={f.value}
                  href={buildHref({ type: f.value })}
                  className={`${pillBase} ${active ? pillActive : pillInactive}`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-14 text-xs font-semibold uppercase tracking-wide text-[#C9D6E5]">
              Status
            </span>
            {STATUS_FILTERS.map((f) => {
              const active = status === f.value;
              return (
                <Link
                  key={f.value}
                  href={buildHref({ status: f.value })}
                  className={`${pillBase} ${active ? pillActive : pillInactive}`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#C9D6E5]">
          <span>
            {total === 0
              ? "Tidak ada transaksi"
              : `Menampilkan ${from}–${to} dari ${total} transaksi`}
          </span>
          <span>
            Halaman {page} dari {totalPages}
          </span>
        </div>

        <TransactionHistory
          items={viewItems}
          assets={assetRows.map((a) => ({ id: a.id, name: a.name }))}
          categories={categoryRows.map((c) => c.name)}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            {page > 1 ? (
              <Link
                href={buildHref({ page: page - 1 })}
                className="rounded-lg border border-[#2F5D8C] px-4 py-2 text-sm font-medium text-[#C9D6E5] transition hover:bg-[#163252] hover:text-[#F2F5F8]"
              >
                ← Sebelumnya
              </Link>
            ) : (
              <span className="rounded-lg border border-[#2F5D8C]/40 px-4 py-2 text-sm text-[#C9D6E5]/40">
                ← Sebelumnya
              </span>
            )}
            <span className="text-sm text-[#C9D6E5]">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={buildHref({ page: page + 1 })}
                className="rounded-lg border border-[#2F5D8C] px-4 py-2 text-sm font-medium text-[#C9D6E5] transition hover:bg-[#163252] hover:text-[#F2F5F8]"
              >
                Berikutnya →
              </Link>
            ) : (
              <span className="rounded-lg border border-[#2F5D8C]/40 px-4 py-2 text-sm text-[#C9D6E5]/40">
                Berikutnya →
              </span>
            )}
          </div>
        )}
    </main>
  );
}
