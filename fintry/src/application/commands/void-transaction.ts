import { lockAssetsByIds, setAssetValue } from "@/infrastructure/repositories/assets";
import { insertAudit } from "@/infrastructure/repositories/audit";
import { claimIdempotency, saveIdempotencyResult } from "@/infrastructure/repositories/idempotency";
import {
  lockTransactionById,
  markTransactionVoided,
} from "@/infrastructure/repositories/transactions";
import type { Db } from "@/infrastructure/repositories/types";

// VoidTransaction: voids a transaction and reverses its balance effect (domain_rules.md §17.1).
// Reversals never physically delete records; VOIDED is a final state.
// If reversing would cause any asset balance to become negative, operation is rejected (D1, §15).
// Void touching inactive assets is rejected (domain_rules.md §2.1).

export interface VoidTransactionInput {
  userId: string;
  transactionId: string;
  reason?: string | null;
  idempotencyKey: string;
}

export interface VoidTransactionResult {
  voidedTransactionId: string;
  affectedAssetIds: string[];
}

interface StoredVoidResult {
  voidedTransactionId: string;
  affectedAssetIds: string[];
}

export async function executeVoidTransaction(
  db: Db,
  input: VoidTransactionInput,
): Promise<VoidTransactionResult> {
  const requestHash = `${input.transactionId}:${input.reason ?? ""}`;

  return db.transaction(async (tx) => {
    // 1. Idempotency claim
    const claim = await claimIdempotency(tx, {
      userId: input.userId,
      key: input.idempotencyKey,
      commandType: "VOID_TRANSACTION",
      requestHash,
    });
    if (claim.status === "replay") {
      const stored = claim.row.result as StoredVoidResult;
      return {
        voidedTransactionId: stored.voidedTransactionId,
        affectedAssetIds: stored.affectedAssetIds,
      };
    }
    if (claim.status === "conflict") {
      throw new Error("Idempotency key reused with different payload");
    }

    // 3. Lock transaction row (ADR-002 §2.4 langkah 3)
    const txRow = await lockTransactionById(tx, input.userId, input.transactionId);
    if (!txRow) {
      throw new Error(`Transaction not found: ${input.transactionId}`);
    }
    if (txRow.status === "VOIDED") {
      throw new Error("Transaction is already voided and cannot be voided again");
    }

    // Determine affected assets
    const affectedAssetIds: string[] = [];
    if (txRow.type === "INCOME" && txRow.destinationAssetId) {
      affectedAssetIds.push(txRow.destinationAssetId);
    } else if (txRow.type === "EXPENSE" && txRow.sourceAssetId) {
      affectedAssetIds.push(txRow.sourceAssetId);
    } else if (txRow.type === "TRANSFER" && txRow.sourceAssetId && txRow.destinationAssetId) {
      affectedAssetIds.push(txRow.sourceAssetId, txRow.destinationAssetId);
    }

    // 4. Lock affected assets ordered by id ASC (ADR-002 §2.4 langkah 4)
    const lockedAssets = await lockAssetsByIds(tx, input.userId, affectedAssetIds);
    if (lockedAssets.length !== affectedAssetIds.length) {
      throw new Error("One or more assets associated with the transaction were not found");
    }

    // Verify none of the touched assets are inactive (§2.1)
    for (const asset of lockedAssets) {
      if (!asset.isActive) {
        throw new Error(`Cannot void transaction touching inactive asset: "${asset.name}"`);
      }
    }

    // 5. Reverse balance effect
    if (txRow.type === "INCOME") {
      const dest = lockedAssets.find((a) => a.id === txRow.destinationAssetId)!;
      const reversed = dest.currentValue - txRow.amount;
      if (reversed < 0n) {
        throw new Error(
          `Reversing income on "${dest.name}" would result in negative balance (${reversed})`,
        );
      }
      await setAssetValue(tx, dest.id, reversed);
    } else if (txRow.type === "EXPENSE") {
      const src = lockedAssets.find((a) => a.id === txRow.sourceAssetId)!;
      const reversed = src.currentValue + txRow.amount;
      await setAssetValue(tx, src.id, reversed);
    } else if (txRow.type === "TRANSFER") {
      const src = lockedAssets.find((a) => a.id === txRow.sourceAssetId)!;
      const dest = lockedAssets.find((a) => a.id === txRow.destinationAssetId)!;
      const destReversed = dest.currentValue - txRow.amount;
      if (destReversed < 0n) {
        throw new Error(
          `Reversing transfer destination "${dest.name}" would result in negative balance (${destReversed})`,
        );
      }
      const srcReversed = src.currentValue + txRow.amount;
      await setAssetValue(tx, dest.id, destReversed);
      await setAssetValue(tx, src.id, srcReversed);
    }

    // 6. Mark transaction VOIDED
    const now = new Date();
    await markTransactionVoided(tx, input.userId, txRow.id, now);

    // 7. Audit log
    await insertAudit(tx, {
      userId: input.userId,
      entityType: "TRANSACTION",
      entityId: txRow.id,
      action: "TRANSACTION_VOIDED",
      idempotencyKey: input.idempotencyKey,
      beforeState: { status: "ACTIVE" },
      afterState: { status: "VOIDED", voidedAt: now.toISOString(), reason: input.reason ?? null },
    });

    // 8. Save idempotency result
    const storedResult: StoredVoidResult = {
      voidedTransactionId: txRow.id,
      affectedAssetIds,
    };
    await saveIdempotencyResult(tx, input.userId, input.idempotencyKey, storedResult);

    return {
      voidedTransactionId: txRow.id,
      affectedAssetIds,
    };
  });
}
