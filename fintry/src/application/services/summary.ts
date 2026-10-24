import { and, desc, eq } from "drizzle-orm";
import { assets } from "@/infrastructure/db/schema/assets";
import { transactions } from "@/infrastructure/db/schema/transactions";
import type { Executor } from "@/infrastructure/repositories/types";

export interface AssetSummaryItem {
  id: string;
  name: string;
  type: "BANK" | "E_WALLET" | "INVESTMENT" | "CASH";
  currentValue: bigint;
  isActive: boolean;
}

export interface DashboardSummary {
  netWorth: bigint;
  cashTotal: bigint;
  investmentTotal: bigint;
  assets: AssetSummaryItem[];
  recentTransactionsCount: number;
}

/** Dashboard Summary Service: Single call to populate all dashboard financial aggregates (ADR-002 §3). */
export async function getDashboardSummary(userId: string, db: Executor): Promise<DashboardSummary> {
  const userAssets = await db
    .select({
      id: assets.id,
      name: assets.name,
      type: assets.type,
      currentValue: assets.currentValue,
      isActive: assets.isActive,
    })
    .from(assets)
    .where(and(eq(assets.userId, userId), eq(assets.isActive, true)))
    .orderBy(desc(assets.currentValue));

  let cashTotal = 0n;
  let investmentTotal = 0n;
  let netWorth = 0n;

  for (const asset of userAssets) {
    netWorth += asset.currentValue;
    if (asset.type === "INVESTMENT") {
      investmentTotal += asset.currentValue;
    } else {
      cashTotal += asset.currentValue;
    }
  }

  // Count active recent transactions
  const txs = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.status, "ACTIVE")))
    .limit(10);

  return {
    netWorth,
    cashTotal,
    investmentTotal,
    assets: userAssets,
    recentTransactionsCount: txs.length,
  };
}
