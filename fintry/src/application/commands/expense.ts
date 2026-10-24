import { applyExpense } from "@/domain/accounting";
import { normalizeCategoryName } from "@/domain/category";
import { assertPositiveAmount } from "@/domain/money";
import { lockAssetsByIds, setAssetValue } from "@/infrastructure/repositories/assets";
import { insertAudit } from "@/infrastructure/repositories/audit";
import { findOrCreateCategory } from "@/infrastructure/repositories/categories";
import { claimIdempotency, saveIdempotencyResult } from "@/infrastructure/repositories/idempotency";
import { insertTransaction } from "@/infrastructure/repositories/transactions";
import type { Db } from "@/infrastructure/repositories/types";
import { todayJakarta } from "./common";

// CreateExpense: expense decreases source asset & net worth (domain_rules.md §4).
// Resulting negative balance is rejected (D1, §15).

export interface CreateExpenseInput {
  userId: string;
  sourceAssetId: string;
  amount: bigint;
  description?: string | null;
  category?: string | null;
  transactionDate?: string;
  idempotencyKey: string;
}

export interface CreateExpenseResult {
  transactionId: string;
  sourceAssetId: string;
  balanceAfter: bigint;
}

interface StoredExpenseResult {
  transactionId: string;
  sourceAssetId: string;
  balanceAfter: string;
}

export async function executeCreateExpense(
  db: Db,
  input: CreateExpenseInput,
): Promise<CreateExpenseResult> {
  assertPositiveAmount(input.amount, "expense amount");
  const requestHash = `${input.sourceAssetId}:${input.amount}:${input.transactionDate ?? ""}`;

  return db.transaction(async (tx) => {
    // 1. Idempotency claim
    const claim = await claimIdempotency(tx, {
      userId: input.userId,
      key: input.idempotencyKey,
      commandType: "CREATE_EXPENSE",
      requestHash,
    });
    if (claim.status === "replay") {
      const stored = claim.row.result as StoredExpenseResult;
      return {
        transactionId: stored.transactionId,
        sourceAssetId: stored.sourceAssetId,
        balanceAfter: BigInt(stored.balanceAfter),
      };
    }
    if (claim.status === "conflict") {
      throw new Error("Idempotency key reused with different payload");
    }

    // 4. Lock source asset
    const locked = await lockAssetsByIds(tx, input.userId, [input.sourceAssetId]);
    if (locked.length !== 1) {
      throw new Error(`Asset not found or not owned by user: ${input.sourceAssetId}`);
    }
    const asset = locked[0];
    if (!asset.isActive) {
      throw new Error(`Cannot record transaction on inactive asset: "${asset.name}"`);
    }

    // 5. Engine calculation (throws InsufficientBalanceError if < 0)
    const balanceAfter = applyExpense(asset.currentValue, input.amount, asset.name);

    // 6. Update asset balance
    await setAssetValue(tx, asset.id, balanceAfter);

    // Category find-or-create if valid
    let categoryId: string | null = null;
    if (input.category) {
      const normalized = normalizeCategoryName(input.category);
      if (normalized) {
        const cat = await findOrCreateCategory(tx, input.userId, normalized);
        categoryId = cat.id;
      }
    }

    const transactionDate = input.transactionDate ?? todayJakarta();

    // 7. Insert transaction
    const txRow = await insertTransaction(tx, {
      userId: input.userId,
      type: "EXPENSE",
      amount: input.amount,
      sourceAssetId: asset.id,
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
        type: "EXPENSE",
        amount: input.amount.toString(),
        sourceAssetId: asset.id,
        balanceAfter: balanceAfter.toString(),
      },
    });

    // 9. Save idempotency result
    const storedResult: StoredExpenseResult = {
      transactionId: txRow.id,
      sourceAssetId: asset.id,
      balanceAfter: balanceAfter.toString(),
    };
    await saveIdempotencyResult(tx, input.userId, input.idempotencyKey, storedResult);

    return {
      transactionId: txRow.id,
      sourceAssetId: asset.id,
      balanceAfter,
    };
  });
}
