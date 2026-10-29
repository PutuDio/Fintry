import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { assets } from "@/infrastructure/db/schema/assets";
import { categories } from "@/infrastructure/db/schema/categories";
import { transactions } from "@/infrastructure/db/schema/transactions";
import type { Executor } from "@/infrastructure/repositories/types";

export interface FinancialMetrics {
  netWorth: bigint;
  netWorthDeltaPct: number;
  monthlyIncome: bigint;
  incomeDeltaPct: number;
  monthlyExpenses: bigint;
  expenseDeltaPct: number;
  savingsRate: number;
  savingsTargetPct: number;
}

export interface MonthlyCashFlowItem {
  monthKey: string; // "YYYY-MM"
  label: string; // e.g. "Jan", "Feb"
  income: bigint;
  expense: bigint;
  net: bigint;
}

export interface SpendingCategoryItem {
  categoryName: string;
  amount: bigint;
  percentage: number;
  color: string;
}

export interface SpendingBreakdown {
  total: bigint;
  items: SpendingCategoryItem[];
}

const MONTH_NAMES_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const PALETTE = [
  "#00E5A2",
  "#38BDF8",
  "#FF4B72",
  "#A855F7",
  "#F59E0B",
  "#10B981",
  "#EC4899",
  "#6366F1",
];

function formatDateKey(year: number, monthZeroIndexed: number): string {
  const m = String(monthZeroIndexed + 1).padStart(2, "0");
  return `${year}-${m}`;
}

function calculateDeltaPct(current: bigint, previous: bigint): number {
  if (previous === 0n) return current > 0n ? 100 : 0;
  const diff = current - previous;
  // Two decimal points precision: diff * 10000 / previous / 100
  const pctTimes100 = (diff * 10000n) / previous;
  return Number(pctTimes100) / 100;
}

export async function getFinancialMetrics(
  userId: string,
  db: Executor,
  now: Date = new Date(),
): Promise<FinancialMetrics> {
  // Current & previous month boundaries (YYYY-MM-01)
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-11

  const startCurrent = `${formatDateKey(currentYear, currentMonth)}-01`;

  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextMonthIdx = (currentMonth + 1) % 12;
  const startNext = `${formatDateKey(nextMonthYear, nextMonthIdx)}-01`;

  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
  const startPrev = `${formatDateKey(prevMonthYear, prevMonthIdx)}-01`;

  // 1. Assets / Net Worth
  const userAssets = await db
    .select({ currentValue: assets.currentValue })
    .from(assets)
    .where(and(eq(assets.userId, userId), eq(assets.isActive, true)));

  let netWorth = 0n;
  for (const a of userAssets) {
    netWorth += a.currentValue;
  }

  // 2. Transactions for current & previous month
  const activeTxs = await db
    .select({
      type: transactions.type,
      amount: transactions.amount,
      transactionDate: transactions.transactionDate,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.status, "ACTIVE"),
        gte(transactions.transactionDate, startPrev),
        lt(transactions.transactionDate, startNext),
      ),
    );

  let currentIncome = 0n;
  let currentExpense = 0n;
  let prevIncome = 0n;
  let prevExpense = 0n;

  for (const tx of activeTxs) {
    const isCurrent =
      tx.transactionDate >= startCurrent && tx.transactionDate < startNext;
    const isPrev =
      tx.transactionDate >= startPrev && tx.transactionDate < startCurrent;

    if (tx.type === "INCOME") {
      if (isCurrent) currentIncome += tx.amount;
      if (isPrev) prevIncome += tx.amount;
    } else if (tx.type === "EXPENSE") {
      if (isCurrent) currentExpense += tx.amount;
      if (isPrev) prevExpense += tx.amount;
    }
  }

  // 3. Deltas & Savings rate
  const incomeDeltaPct = calculateDeltaPct(currentIncome, prevIncome);
  const expenseDeltaPct = calculateDeltaPct(currentExpense, prevExpense);

  const prevEstimatedNetWorth =
    netWorth - (currentIncome - currentExpense);
  const netWorthDeltaPct = calculateDeltaPct(netWorth, prevEstimatedNetWorth);

  let savingsRate = 0;
  if (currentIncome > 0n) {
    const netSaved = currentIncome - currentExpense;
    const rateTimes100 = (netSaved * 10000n) / currentIncome;
    savingsRate = Number(rateTimes100) / 100;
  }

  return {
    netWorth,
    netWorthDeltaPct,
    monthlyIncome: currentIncome,
    incomeDeltaPct,
    monthlyExpenses: currentExpense,
    expenseDeltaPct,
    savingsRate,
    savingsTargetPct: 50,
  };
}

export async function getCashFlowHistory(
  userId: string,
  db: Executor,
  monthsCount: number = 6,
  now: Date = new Date(),
): Promise<MonthlyCashFlowItem[]> {
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  const months: Array<{ key: string; label: string }> = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(currentYear, currentMonth - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    months.push({
      key: formatDateKey(y, m),
      label: MONTH_NAMES_ID[m],
    });
  }

  const oldestMonthStart = `${months[0].key}-01`;
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextMonthIdx = (currentMonth + 1) % 12;
  const newestMonthEnd = `${formatDateKey(nextMonthYear, nextMonthIdx)}-01`;

  const txs = await db
    .select({
      type: transactions.type,
      amount: transactions.amount,
      transactionDate: transactions.transactionDate,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.status, "ACTIVE"),
        gte(transactions.transactionDate, oldestMonthStart),
        lt(transactions.transactionDate, newestMonthEnd),
      ),
    );

  const map = new Map<string, { income: bigint; expense: bigint }>();
  for (const m of months) {
    map.set(m.key, { income: 0n, expense: 0n });
  }

  for (const tx of txs) {
    const monthKey = tx.transactionDate.substring(0, 7);
    const entry = map.get(monthKey);
    if (!entry) continue;

    if (tx.type === "INCOME") {
      entry.income += tx.amount;
    } else if (tx.type === "EXPENSE") {
      entry.expense += tx.amount;
    }
  }

  return months.map((m) => {
    const entry = map.get(m.key) ?? { income: 0n, expense: 0n };
    return {
      monthKey: m.key,
      label: m.label,
      income: entry.income,
      expense: entry.expense,
      net: entry.income - entry.expense,
    };
  });
}

export async function getSpendingBreakdown(
  userId: string,
  db: Executor,
  now: Date = new Date(),
): Promise<SpendingBreakdown> {
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const startCurrent = `${formatDateKey(currentYear, currentMonth)}-01`;
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextMonthIdx = (currentMonth + 1) % 12;
  const startNext = `${formatDateKey(nextMonthYear, nextMonthIdx)}-01`;

  // First try active expenses in current month
  let rows = await db
    .select({
      amount: transactions.amount,
      categoryId: transactions.categoryId,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.status, "ACTIVE"),
        eq(transactions.type, "EXPENSE"),
        gte(transactions.transactionDate, startCurrent),
        lt(transactions.transactionDate, startNext),
      ),
    );

  // If no expenses in current month, fallback to recent active expenses
  if (rows.length === 0) {
    rows = await db
      .select({
        amount: transactions.amount,
        categoryId: transactions.categoryId,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.status, "ACTIVE"),
          eq(transactions.type, "EXPENSE"),
        ),
      )
      .limit(100);
  }

  if (rows.length === 0) {
    return { total: 0n, items: [] };
  }

  let total = 0n;
  const catSums = new Map<string, bigint>();
  for (const r of rows) {
    total += r.amount;
    const catId = r.categoryId ?? "uncategorized";
    catSums.set(catId, (catSums.get(catId) ?? 0n) + r.amount);
  }

  // Fetch category names
  const validIds = [...catSums.keys()].filter((id) => id !== "uncategorized");
  const catNames = new Map<string, string>();
  if (validIds.length > 0) {
    const fetched = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(eq(categories.userId, userId), inArray(categories.id, validIds)));
    for (const c of fetched) {
      catNames.set(c.id, c.name);
    }
  }

  // Sort descending by amount
  const sorted = [...catSums.entries()].sort((a, b) => (b[1] > a[1] ? 1 : -1));

  const items: SpendingCategoryItem[] = sorted.map(([id, sum], idx) => {
    const categoryName =
      id === "uncategorized"
        ? "Lainnya / Umum"
        : catNames.get(id) || "Kategori";
    const pctTimes100 = total > 0n ? (sum * 10000n) / total : 0n;
    const percentage = Number(pctTimes100) / 100;
    const color = PALETTE[idx % PALETTE.length];
    return {
      categoryName,
      amount: sum,
      percentage,
      color,
    };
  });

  return { total, items };
}
