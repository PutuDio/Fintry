import { applyTransfer } from "@/domain/accounting";
import { assertPositiveAmount } from "@/domain/money";
import { lockAssetsByIds, setAssetValue } from "@/infrastructure/repositories/assets";
import { insertAudit } from "@/infrastructure/repositories/audit";
import { claimIdempotency, saveIdempotencyResult } from "@/infrastructure/repositories/idempotency";
import { insertTransaction } from "@/infrastructure/repositories/transactions";
import type { Db } from "@/infrastructure/repositories/types";
import { todayJakarta } from "./common";

// CreateTransfer: moves value between assets. Net worth unchanged (domain_rules.md §5).
// When destination is an INVESTMENT asset, this represents an Investment Purchase (PRD §6.4).
// Categories are NOT allowed for transfers (domain_rules.md §11.1).

export interface CreateTransferInput {
  userId: string;
  sourceAssetId: string;
  destinationAssetId: string;
  amount: bigint;
  description?: string | null;
  transactionDate?: string;
  idempotencyKey: string;
}

export interface CreateTransferResult {
  transactionId: string;
  sourceAssetId: string;
  destinationAssetId: string;
  sourceBalanceAfter: bigint;
  destinationBalanceAfter: bigint;
  isInvestmentPurchase: boolean;
}

interface StoredTransferResult {
  transactionId: string;
  sourceAssetId: string;
  destinationAssetId: string;
  sourceBalanceAfter: string;
  destinationBalanceAfter: string;
  isInvestmentPurchase: boolean;
}

export async function executeCreateTransfer(
  db: Db,
  input: CreateTransferInput,
): Promise<CreateTransferResult> {
  if (input.sourceAssetId === input.destinationAssetId) {
    throw new Error("Source and destination assets must be different");
  }
  assertPositiveAmount(input.amount, "transfer amount");

  const requestHash = `${input.sourceAssetId}:${input.destinationAssetId}:${input.amount}:${input.transactionDate ?? ""}`;

  return db.transaction(async (tx) => {
    // 1. Idempotency claim
    const claim = await claimIdempotency(tx, {
      userId: input.userId,
      key: input.idempotencyKey,
      commandType: "CREATE_TRANSFER",
      requestHash,
    });
    if (claim.status === "replay") {
      const stored = claim.row.result as StoredTransferResult;
      return {
        transactionId: stored.transactionId,
        sourceAssetId: stored.sourceAssetId,
        destinationAssetId: stored.destinationAssetId,
        sourceBalanceAfter: BigInt(stored.sourceBalanceAfter),
        destinationBalanceAfter: BigInt(stored.destinationBalanceAfter),
        isInvestmentPurchase: stored.isInvestmentPurchase,
      };
    }
    if (claim.status === "conflict") {
      throw new Error("Idempotency key reused with different payload");
    }

    // 4. Lock both assets (sorted by id ASC for deadlock prevention)
    const locked = await lockAssetsByIds(tx, input.userId, [
      input.sourceAssetId,
      input.destinationAssetId,
    ]);
    if (locked.length !== 2) {
      throw new Error("One or both transfer assets not found or not owned by user");
    }

    const source = locked.find((a) => a.id === input.sourceAssetId)!;
    const destination = locked.find((a) => a.id === input.destinationAssetId)!;

    if (!source.isActive || !destination.isActive) {
      throw new Error("Cannot record transfer touching inactive assets");
    }

    // 5. Engine calculation (throws InsufficientBalanceError if source < amount)
    const { sourceAfter, destinationAfter } = applyTransfer(
      source.currentValue,
      destination.currentValue,
      input.amount,
      source.name,
    );

    // 6. Update both assets
    await setAssetValue(tx, source.id, sourceAfter);
    await setAssetValue(tx, destination.id, destinationAfter);

    const transactionDate = input.transactionDate ?? todayJakarta();
    const isInvestmentPurchase = destination.type === "INVESTMENT";

    // 7. Insert transaction (categoryId is strictly null for TRANSFER)
    const txRow = await insertTransaction(tx, {
      userId: input.userId,
      type: "TRANSFER",
      amount: input.amount,
      sourceAssetId: source.id,
      destinationAssetId: destination.id,
      description: input.description ?? null,
      categoryId: null,
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
        type: "TRANSFER",
        amount: input.amount.toString(),
        sourceAssetId: source.id,
        destinationAssetId: destination.id,
        sourceBalanceAfter: sourceAfter.toString(),
        destinationBalanceAfter: destinationAfter.toString(),
        isInvestmentPurchase,
      },
    });

    // 9. Save idempotency result
    const storedResult: StoredTransferResult = {
      transactionId: txRow.id,
      sourceAssetId: source.id,
      destinationAssetId: destination.id,
      sourceBalanceAfter: sourceAfter.toString(),
      destinationBalanceAfter: destinationAfter.toString(),
      isInvestmentPurchase,
    };
    await saveIdempotencyResult(tx, input.userId, input.idempotencyKey, storedResult);

    return {
      transactionId: txRow.id,
      sourceAssetId: source.id,
      destinationAssetId: destination.id,
      sourceBalanceAfter: sourceAfter,
      destinationBalanceAfter: destinationAfter,
      isInvestmentPurchase,
    };
  });
}
