import { and, eq } from "drizzle-orm";
import { assets } from "@/infrastructure/db/schema/assets";
import type { Executor } from "@/infrastructure/repositories/types";

/** Net worth calculation: sum of all active asset balances per user (PRD §6.4, D7). */
export async function calculateNetWorth(userId: string, db: Executor): Promise<{
  netWorth: bigint;
  assetsCount: number;
}> {
  const activeAssets = await db.select({ id: assets.id, currentValue: assets.currentValue }).from(assets).where(
    and(eq(assets.userId, userId), eq(assets.isActive, true)),
  );
  const total = activeAssets.reduce((sum, a) => sum + a.currentValue, 0n);
  return {
    netWorth: total,
    assetsCount: activeAssets.length,
  };
}

// Note: import statement error below will be fixed immediately after read
