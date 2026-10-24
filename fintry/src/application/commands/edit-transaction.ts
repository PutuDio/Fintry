import { applyExpense, applyIncome, applyTransfer } from "@/domain/accounting";
import { normalizeCategoryName } from "@/domain/category";
import { assertPositiveAmount } from "@/domain/money";
import { lockAssetsByIds, setAssetValue } from "@/infrastructure/repositories/assets";
import { insertAudit } from "@/infrastructure/repositories/audit";
import { findOrCreateCategory } from "@/infrastructure/repositories/categories";
import { claimIdempotency, saveIdempotencyResult } from "@/infrastructure/repositories/idempotency";
import {
  editTransactionDetails,
  insertTransaction,
  lockTransactionById,
  markTransactionVoided,
} from "@/infrastructure/repositories/transactions";
import type { Db } from "@/infrastructure/repositories/types";

// EditTransaction: corrects an existing transaction (domain_rules.md §17.2, D2).
// Direct edit: description, category, transaction_date. Audit: TRANSACTION_UPDATED.
// Financial changes (amount, assets, type): VOID + replacement in ONE DB transaction.
// Replacement transaction links back via `replaces_transaction_id`.
// VOIDED transactions cannot be edited.

export interface EditTransactionPatch {
  description?: string | null;
  category?: string | null;
  transactionDate?: string;
  amount?: bigint;
  sourceAssetId?: string;
  destinationAssetId?: string;
}

export interface EditTransactionInput {
  userId: string;
  transactionId: string;
  patch: EditTransactionPatch;
  idempotencyKey: string;
}

export interface EditTransactionResult {
  transactionId: string;
  mode: "direct" | "replacement";
  replacementTransactionId?: string;
}

interface StoredEditResult {
  transactionId: string;
  mode: "direct" | "replacement";
  replacementTransactionId?: string;
}

export async function executeEditTransaction(
  db: Db,
  input: EditTransactionInput,
): Promise<EditTransactionResult> {
  const requestHash = `${input.transactionId}:${JSON.stringify(input.patch, (_, v) =>
    typeof v === "bigint" ? v.toString() : v,
  )}`;

  return db.transaction(async (tx) => {
    // 1. Idempotency claim
    const claim = await claimIdempotency(tx, {
      userId: input.userId,
      key: input.idempotencyKey,
      commandType: "EDIT_TRANSACTION",
      requestHash,
    });
    if (claim.status === "replay") {
      const stored = claim.row.result as StoredEditResult;
      return stored;
    }
    if (claim.status === "conflict") {
      throw new Error("Idempotency key reused with different payload");
    }

    // 3. Lock current transaction row
    const current = await lockTransactionById(tx, input.userId, input.transactionId);
    if (!current) {
      throw new Error(`Transaction not found: ${input.transactionId}`);
    }
    if (current.status === "VOIDED") {
      throw new Error("Cannot edit a VOIDED transaction (D2)");
    }

    // Check if financial fields are modified
    const isAmountChanged =
      input.patch.amount !== undefined && input.patch.amount !== current.amount;
    const isSourceChanged =
      input.patch.sourceAssetId !== undefined &&
      input.patch.sourceAssetId !== current.sourceAssetId;
    const isDestChanged =
      input.patch.destinationAssetId !== undefined &&
      input.patch.destinationAssetId !== current.destinationAssetId;
    const hasFinancialChange = isAmountChanged || isSourceChanged || isDestChanged;

    // --- CASE 1: DIRECT EDIT (Non-financial fields only) ---
    if (!hasFinancialChange) {
      let categoryId: string | null = current.categoryId;
      if (input.patch.category !== undefined) {
        if (input.patch.category === null) {
          categoryId = null;
        } else {
          const normalized = normalizeCategoryName(input.patch.category);
          if (normalized) {
            const cat = await findOrCreateCategory(tx, input.userId, normalized);
            categoryId = cat.id;
          } else {
            categoryId = null;
          }
        }
      }

      const updated = await editTransactionDetails(tx, input.userId, current.id, {
        description:
          input.patch.description !== undefined ? input.patch.description : current.description,
        categoryId,
        transactionDate: input.patch.transactionDate ?? current.transactionDate,
      });

      await insertAudit(tx, {
        userId: input.userId,
        entityType: "TRANSACTION",
        entityId: current.id,
        action: "TRANSACTION_UPDATED",
        idempotencyKey: input.idempotencyKey,
        beforeState: {
          description: current.description,
          categoryId: current.categoryId,
          transactionDate: current.transactionDate,
        },
        afterState: {
          description: updated?.description,
          categoryId: updated?.categoryId,
          transactionDate: updated?.transactionDate,
        },
      });

      const result: EditTransactionResult = {
        transactionId: current.id,
        mode: "direct",
      };
      await saveIdempotencyResult(tx, input.userId, input.idempotencyKey, result);
      return result;
    }

    // --- CASE 2: FINANCIAL EDIT (VOID + REPLACEMENT in one DB transaction, D2) ---
    const newAmount = input.patch.amount ?? current.amount;
    assertPositiveAmount(newAmount, "replacement amount");

    const newSourceId =
      input.patch.sourceAssetId !== undefined
        ? input.patch.sourceAssetId
        : current.sourceAssetId;
    const newDestId =
      input.patch.destinationAssetId !== undefined
        ? input.patch.destinationAssetId
        : current.destinationAssetId;

    // Collect all unique asset IDs (old + new) and lock them in ASC order
    const assetIdSet = new Set<string>();
    if (current.sourceAssetId) assetIdSet.add(current.sourceAssetId);
    if (current.destinationAssetId) assetIdSet.add(current.destinationAssetId);
    if (newSourceId) assetIdSet.add(newSourceId);
    if (newDestId) assetIdSet.add(newDestId);

    const lockedAssets = await lockAssetsByIds(tx, input.userId, [...assetIdSet]);
    const assetMap = new Map(lockedAssets.map((a) => [a.id, a]));

    for (const a of lockedAssets) {
      if (!a.isActive) {
        throw new Error(`Cannot edit transaction touching inactive asset: "${a.name}"`);
      }
    }

    // Step A: Reverse old transaction balances
    if (current.type === "INCOME" && current.destinationAssetId) {
      const dest = assetMap.get(current.destinationAssetId)!;
      const reversed = dest.currentValue - current.amount;
      if (reversed < 0n) {
        throw new Error(`Reversing old income causes negative balance on "${dest.name}"`);
      }
      dest.currentValue = reversed;
    } else if (current.type === "EXPENSE" && current.sourceAssetId) {
      const src = assetMap.get(current.sourceAssetId)!;
      src.currentValue += current.amount;
    } else if (current.type === "TRANSFER" && current.sourceAssetId && current.destinationAssetId) {
      const src = assetMap.get(current.sourceAssetId)!;
      const dest = assetMap.get(current.destinationAssetId)!;
      const destReversed = dest.currentValue - current.amount;
      if (destReversed < 0n) {
        throw new Error(`Reversing old transfer causes negative balance on "${dest.name}"`);
      }
      dest.currentValue = destReversed;
      src.currentValue += current.amount;
    }

    // Step B: Mark old transaction VOIDED
    const now = new Date();
    await markTransactionVoided(tx, input.userId, current.id, now);
    await insertAudit(tx, {
      userId: input.userId,
      entityType: "TRANSACTION",
      entityId: current.id,
      action: "TRANSACTION_VOIDED",
      idempotencyKey: input.idempotencyKey,
      afterState: { voidedAt: now.toISOString(), reason: "Replaced by transaction correction" },
    });

    // Step C: Apply new replacement transaction balances
    if (current.type === "INCOME") {
      const dest = assetMap.get(newDestId!)!;
      dest.currentValue = applyIncome(dest.currentValue, newAmount);
    } else if (current.type === "EXPENSE") {
      const src = assetMap.get(newSourceId!)!;
      src.currentValue = applyExpense(src.currentValue, newAmount, src.name);
    } else if (current.type === "TRANSFER") {
      const src = assetMap.get(newSourceId!)!;
      const dest = assetMap.get(newDestId!)!;
      const res = applyTransfer(src.currentValue, dest.currentValue, newAmount, src.name);
      src.currentValue = res.sourceAfter;
      dest.currentValue = res.destinationAfter;
    }

    // Persist updated asset values to database
    for (const a of lockedAssets) {
      await setAssetValue(tx, a.id, a.currentValue);
    }
    // Category for replacement
    let categoryId: string | null = current.categoryId;
    if (input.patch.category !== undefined) {
      if (input.patch.category === null) {
        categoryId = null;
      } else {
        const normalized = normalizeCategoryName(input.patch.category);
        categoryId = normalized
          ? (await findOrCreateCategory(tx, input.userId, normalized)).id
          : null;
      }
    }

    // Step D: Insert replacement transaction
    const replacement = await insertTransaction(tx, {
      userId: input.userId,
      type: current.type,
      amount: newAmount,
      sourceAssetId: newSourceId ?? null,
      destinationAssetId: newDestId ?? null,
      description:
        input.patch.description !== undefined ? input.patch.description : current.description,
      categoryId,
      transactionDate: input.patch.transactionDate ?? current.transactionDate,
      status: "ACTIVE",
      replacesTransactionId: current.id,
    });

    await insertAudit(tx, {
      userId: input.userId,
      entityType: "TRANSACTION",
      entityId: replacement.id,
      action: "TRANSACTION_CREATED",
      idempotencyKey: input.idempotencyKey,
      afterState: {
        replacesTransactionId: current.id,
        amount: newAmount.toString(),
      },
    });

    const result: EditTransactionResult = {
      transactionId: current.id,
      replacementTransactionId: replacement.id,
      mode: "replacement",
    };
    await saveIdempotencyResult(tx, input.userId, input.idempotencyKey, result);
    return result;
  });
}
