import { applyAdjustment } from "@/domain/accounting";
import { NoOpAdjustmentError } from "@/domain/accounting";
import { lockAssetsByIds, setAssetValue } from "@/infrastructure/repositories/assets";
import { insertAudit } from "@/infrastructure/repositories/audit";
import { claimIdempotency, saveIdempotencyResult } from "@/infrastructure/repositories/idempotency";
import { insertAdjustment } from "@/infrastructure/repositories/adjustments";
import type { Db } from "@/infrastructure/repositories/types";

// CreateBalanceAdjustment: reconciliation adjustment to actual asset value.
// Must not produce zero delta (no-op rejected); must not make asset negative (ADR-002 §8).

export interface CreateBalanceAdjustmentInput {
  userId: string;
  assetId: string;
  amount: bigint; // actual value; engine calculates delta = actual - recorded
  description?: string | null; // reason/source field for reconciliation traceability
  idempotencyKey: string;
}

export interface CreateBalanceAdjustmentResult {
  adjustmentId: string;
  assetId: string;
  valueBefore: bigint;
  valueAfter: bigint;
  delta: bigint;
}

interface StoredAdjustmentResult {
  adjustmentId: string;
  assetId: string;
  valueBefore: string;
  valueAfter: string;
  delta: string;
}

export async function executeCreateBalanceAdjustment(
  db: Db,
  input: CreateBalanceAdjustmentInput,
): Promise<CreateBalanceAdjustmentResult> {
  return db.transaction(async (tx) => {
    const requestHash = `${input.assetId}:${input.amount}`;

    // 1. Idempotency claim
    const claim = await claimIdempotency(tx, {
      userId: input.userId,
      key: input.idempotencyKey,
      commandType: "BALANCE_ADJUSTMENT",
      requestHash,
    });
    if (claim.status === "replay") {
      const stored = claim.row.result as StoredAdjustmentResult;
      return {
        adjustmentId: stored.adjustmentId,
        assetId: stored.assetId,
        valueBefore: BigInt(stored.valueBefore),
        valueAfter: BigInt(stored.valueAfter),
        delta: BigInt(stored.delta),
      };
    }
    if (claim.status === "conflict") {
      throw new Error("Idempotency key reused with different payload");
    }

    // 4. Lock asset FOR UPDATE
    const locked = await lockAssetsByIds(tx, input.userId, [input.assetId]);
    if (locked.length !== 1) {
      throw new Error(`Asset not found or not owned by user: ${input.assetId}`);
    }
    const asset = locked[0];
    if (!asset.isActive) {
      throw new Error(`Cannot record adjustment on inactive asset: "${asset.name}"`);
    }

    // 5. Engine: delta = amount - current_value; must be non-zero & target >= 0
    let result: { valueAfter: bigint; delta: bigint };
    try {
      result = applyAdjustment(asset.currentValue, input.amount, asset.name);
    } catch (err) {
      if (err instanceof NoOpAdjustmentError) {
        throw new Error("Balance adjustment delta must be non-zero");
      }
      throw err;
    }
    const { valueAfter, delta } = result;

    if (valueAfter < 0n) {
      throw new Error("Balance adjustment would cause negative asset value");
    }

    // 6. Update asset balance
    await setAssetValue(tx, asset.id, valueAfter);

    // 7. Insert adjustment record (type: BALANCE_ADJUSTMENT)
    const adjRow = await insertAdjustment(tx, {
      userId: input.userId,
      assetId: asset.id,
      type: "BALANCE_ADJUSTMENT",
      valueBefore: asset.currentValue,
      valueAfter,
      delta,
      reason: input.description ?? null,
    });

    // 8. Audit log
    await insertAudit(tx, {
      userId: input.userId,
      entityType: "ASSET_ADJUSTMENT",
      entityId: adjRow.id,
      action: "ADJUSTMENT_CREATED",
      idempotencyKey: input.idempotencyKey,
      afterState: {
        type: "BALANCE_ADJUSTMENT",
        amount: input.amount.toString(),
        delta: delta.toString(),
        balanceAfter: valueAfter.toString(),
      },
    });

    // 9. Save idempotency result
    const storedResult: StoredAdjustmentResult = {
      adjustmentId: adjRow.id,
      assetId: asset.id,
      valueBefore: asset.currentValue.toString(),
      valueAfter: valueAfter.toString(),
      delta: delta.toString(),
    };
    await saveIdempotencyResult(tx, input.userId, input.idempotencyKey, storedResult);

    return {
      adjustmentId: adjRow.id,
      assetId: asset.id,
      valueBefore: asset.currentValue,
      valueAfter,
      delta,
    };
  });
}
