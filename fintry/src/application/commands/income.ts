import { applyIncome } from "@/domain/accounting";
import { normalizeCategoryName } from "@/domain/category";
import { assertPositiveAmount } from "@/domain/money";
import { lockAssetsByIds, setAssetValue } from "@/infrastructure/repositories/assets";
import { insertAudit } from "@/infrastructure/repositories/audit";
import { findOrCreateCategory } from "@/infrastructure/repositories/categories";
import { claimIdempotency, saveIdempotencyResult } from "@/infrastructure/repositories/idempotency";
import { insertTransaction } from "@/infrastructure/repositories/transactions";
import type { Db } from "@/infrastructure/repositories/types";
import { todayJakarta } from "./common";

// CreateIncome: income increases destination asset & net worth (domain_rules.md §3).
// Urutan lock ADR-002 §2.4: idempotency → lock asset FOR UPDATE → engine → update asset → insert tx → audit.

export interface CreateIncomeInput {
  userId: string;
  destinationAssetId: string;
  amount: bigint;
  description?: string | null;
  category?: string | null;
  transactionDate?: string;
  idempotencyKey: string;
}

export interface CreateIncomeResult {
  transactionId: string;
  destinationAssetId: string;
  balanceAfter: bigint;
}

interface StoredIncomeResult {
  transactionId: string;
  destinationAssetId: string;
  balanceAfter: string;
}

export async function executeCreateIncome(
  db: Db,
  input: CreateIncomeInput,
): Promise<CreateIncomeResult> {
  assertPositiveAmount(input.amount, "income amount");
  const requestHash = `${input.destinationAssetId}:${input.amount}:${input.transactionDate ?? ""}`;

  return db.transaction(async (tx) => {
    // 1. Idempotency claim
    const claim = await claimIdempotency(tx, {
      userId: input.userId,
      key: input.idempotencyKey,
      commandType: "CREATE_INCOME",
      requestHash,
    });
    if (claim.status === "replay") {
      const stored = claim.row.result as StoredIncomeResult;
      return {
        transactionId: stored.transactionId,
        destinationAssetId: stored.destinationAssetId,
        balanceAfter: BigInt(stored.balanceAfter),
      };
    }
    if (claim.status === "conflict") {
      throw new Error("Idempotency key reused with different payload");
    }

    // 4. Lock destination asset
    const locked = await lockAssetsByIds(tx, input.userId, [input.destinationAssetId]);
    if (locked.length !== 1) {
      throw new Error(`Asset not found or not owned by user: ${input.destinationAssetId}`);
    }
    const asset = locked[0];
    if (!asset.isActive) {
      throw new Error(`Cannot record transaction on inactive asset: "${asset.name}"`);
    }

    // 5. Engine calculation
    const balanceAfter = applyIncome(asset.currentValue, input.amount);

    // 6. Update asset balance
    await setAssetValue(tx, asset.id, balanceAfter);

    // Category find-or-create (if provided & valid; invalid category stays null per D5)
    let categoryId: string | null = null;
    if (input.category) {
      const normalized = normalizeCategoryName(input.category);
      if (normalized) {
        const cat = await findOrCreateCategory(tx, input.userId, normalized);
        categoryId = cat.id;
      }
    }

    const transactionDate = input.transactionDate ?? todayJakarta();

    // 7. Insert transaction record
    const txRow = await insertTransaction(tx, {
      userId: input.userId,
      type: "INCOME",
      amount: input.amount,
      destinationAssetId: asset.id,
      description: input.description ?? null,
      categoryId,
      transactionDate,
      status: "ACTIVE",
    });

    // 8. Audit log
    await insertAudit(tx, {
      userId: input.userId,
      entityType: "TRANSACTION",
      entityId: txRow.id,
      action: "TRANSACTION_CREATED",
      idempotencyKey: input.idempotencyKey,
      afterState: {
        type: "INCOME",
        amount: input.amount.toString(),
        destinationAssetId: asset.id,
        balanceAfter: balanceAfter.toString(),
      },
    });

    // 9. Save idempotency result
    const storedResult: StoredIncomeResult = {
      transactionId: txRow.id,
      destinationAssetId: asset.id,
      balanceAfter: balanceAfter.toString(),
    };
    await saveIdempotencyResult(tx, input.userId, input.idempotencyKey, storedResult);

    return {
      transactionId: txRow.id,
      destinationAssetId: asset.id,
      balanceAfter,
    };
  });
}
