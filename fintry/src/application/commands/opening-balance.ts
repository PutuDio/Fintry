import { assertNonNegativeAmount } from "@/domain/money";
import { lockAssetsByIds, setAssetValue } from "@/infrastructure/repositories/assets";
import { insertAudit } from "@/infrastructure/repositories/audit";
import { claimIdempotency, saveIdempotencyResult } from "@/infrastructure/repositories/idempotency";
import { insertAdjustment } from "@/infrastructure/repositories/adjustments";
import type { Db } from "@/infrastructure/repositories/types";

// CreateOpeningBalance: establishes initial recorded state of an asset (domain_rules.md §9).
// Opening balance is NOT income; does not create a cashflow transaction.
// Each asset can have at most one opening balance (enforced by DB partial unique index).
// Value_before is strictly 0; delta equals initial amount.

export interface CreateOpeningBalanceInput {
  userId: string;
  assetId: string;
  amount: bigint;
  idempotencyKey: string;
}

export interface CreateOpeningBalanceResult {
  adjustmentId: string;
  assetId: string;
  balanceAfter: bigint;
}

interface StoredOpeningBalanceResult {
  adjustmentId: string;
  assetId: string;
  balanceAfter: string;
}

export async function executeCreateOpeningBalance(
  db: Db,
  input: CreateOpeningBalanceInput,
): Promise<CreateOpeningBalanceResult> {
  assertNonNegativeAmount(input.amount, "opening balance amount");
  const requestHash = `${input.assetId}:${input.amount}`;

  return db.transaction(async (tx) => {
    // 1. Idempotency claim
    const claim = await claimIdempotency(tx, {
      userId: input.userId,
      key: input.idempotencyKey,
      commandType: "OPENING_BALANCE",
      requestHash,
    });
    if (claim.status === "replay") {
      const stored = claim.row.result as StoredOpeningBalanceResult;
      return {
        adjustmentId: stored.adjustmentId,
        assetId: stored.assetId,
        balanceAfter: BigInt(stored.balanceAfter),
      };
    }
    if (claim.status === "conflict") {
      throw new Error("Idempotency key reused with different payload");
    }

    // 4. Lock asset
    const locked = await lockAssetsByIds(tx, input.userId, [input.assetId]);
    if (locked.length !== 1) {
      throw new Error(`Asset not found or not owned by user: ${input.assetId}`);
    }
    const asset = locked[0];
    if (!asset.isActive) {
      throw new Error(`Cannot set opening balance on inactive asset: "${asset.name}"`);
    }

    // 5. Update asset current value
    await setAssetValue(tx, asset.id, input.amount);

    // 6. Insert OPENING_BALANCE adjustment record (value_before strictly 0n)
    const adjRow = await insertAdjustment(tx, {
      userId: input.userId,
      assetId: asset.id,
      type: "OPENING_BALANCE",
      valueBefore: 0n,
      valueAfter: input.amount,
      delta: input.amount,
      reason: "Initial opening balance",
    });

    // 7. Audit log
    await insertAudit(tx, {
      userId: input.userId,
      entityType: "ASSET_ADJUSTMENT",
      entityId: adjRow.id,
      action: "ADJUSTMENT_CREATED",
      idempotencyKey: input.idempotencyKey,
      afterState: {
        type: "OPENING_BALANCE",
        amount: input.amount.toString(),
        balanceAfter: input.amount.toString(),
      },
    });

    // 8. Save idempotency result
    const storedResult: StoredOpeningBalanceResult = {
      adjustmentId: adjRow.id,
      assetId: asset.id,
      balanceAfter: input.amount.toString(),
    };
    await saveIdempotencyResult(tx, input.userId, input.idempotencyKey, storedResult);

    return {
      adjustmentId: adjRow.id,
      assetId: asset.id,
      balanceAfter: input.amount,
    };
  });
}
