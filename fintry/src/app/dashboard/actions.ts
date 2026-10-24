"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { processChatMessage } from "@/application/chat";
import type { ChatResponse } from "@/application/chat/chat-service";
import {
  executeCreateOpeningBalance,
  executeEditTransaction,
  executeVoidTransaction,
} from "@/application/commands";
import { createAsset } from "@/infrastructure/repositories/assets";
import { getTransactionById } from "@/infrastructure/repositories/transactions";
import { getServerSession } from "@/infrastructure/auth/session";
import { db } from "@/infrastructure/db/client";
import type { AssetType } from "@/domain/types";

export interface ActionResult {
  success: boolean;
  message: string;
}

export async function createAssetAction(name: string, type: AssetType, openingBalance: bigint) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");

  const asset = await createAsset(db, {
    userId: session.user.id,
    name: name.trim(),
    type,
  });

  if (openingBalance > 0n) {
    await executeCreateOpeningBalance(db, {
      userId: session.user.id,
      assetId: asset.id,
      amount: openingBalance,
      idempotencyKey: randomUUID(),
    });
  }

  revalidatePath("/dashboard");
  return { success: true, assetId: asset.id };
}

export async function sendChatMessageAction(message: string): Promise<ChatResponse> {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");

  const res = await processChatMessage(db, session.user.id, message);
  revalidatePath("/dashboard");
  return res;
}

export async function voidTransactionAction(
  transactionId: string,
  reason: string | null,
): Promise<ActionResult> {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");

  try {
    await executeVoidTransaction(db, {
      userId: session.user.id,
      transactionId,
      reason: reason && reason.trim() ? reason.trim() : null,
      idempotencyKey: randomUUID(),
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/history");
    return { success: true, message: "Transaksi dibatalkan. Status menjadi VOIDED." };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal membatalkan transaksi.",
    };
  }
}

export interface EditTransactionActionInput {
  transactionId: string;
  description: string | null;
  category: string | null;
  transactionDate: string;
  amount: string;
  sourceAssetId: string | null;
  destinationAssetId: string | null;
}

export async function editTransactionAction(
  input: EditTransactionActionInput,
): Promise<ActionResult> {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");

  const existing = await getTransactionById(db, session.user.id, input.transactionId);
  if (!existing) {
    return { success: false, message: "Transaksi tidak ditemukan." };
  }
  if (existing.status === "VOIDED") {
    return { success: false, message: "Transaksi VOIDED tidak dapat diedit." };
  }

  const amountDigits = input.amount.replace(/\D/g, "");
  if (!amountDigits) {
    return { success: false, message: "Nominal tidak valid." };
  }

  try {
    const result = await executeEditTransaction(db, {
      userId: session.user.id,
      transactionId: input.transactionId,
      patch: {
        description: input.description,
        // Kategori tidak berlaku untuk TRANSFER (domain_rules §17.2).
        category: existing.type === "TRANSFER" ? undefined : input.category,
        transactionDate: input.transactionDate,
        amount: BigInt(amountDigits),
        sourceAssetId:
          existing.type === "INCOME" ? undefined : (input.sourceAssetId ?? undefined),
        destinationAssetId:
          existing.type === "EXPENSE" ? undefined : (input.destinationAssetId ?? undefined),
      },
      idempotencyKey: randomUUID(),
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/history");
    return {
      success: true,
      message:
        result.mode === "replacement"
          ? "Perubahan finansial diterapkan: transaksi lama di-VOID dan diganti transaksi baru."
          : "Detail transaksi diperbarui.",
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal mengubah transaksi.",
    };
  }
}
