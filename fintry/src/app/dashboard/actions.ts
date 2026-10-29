"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { processChatMessage } from "@/application/chat";
import type { ChatResponse } from "@/application/chat/chat-service";
import {
  executeCreateOpeningBalance,
  executeCreateBalanceAdjustment,
  executeEditTransaction,
  executeVoidTransaction,
} from "@/application/commands";
import {
  createAsset,
  updateAssetName,
  deactivateAsset,
  deleteAssetWithCascade,
} from "@/infrastructure/repositories/assets";
import { getTransactionById } from "@/infrastructure/repositories/transactions";
import { getServerSession } from "@/infrastructure/auth/session";
import { db } from "@/infrastructure/db/client";
import { eq } from "drizzle-orm";
import { transactions } from "@/infrastructure/db/schema/transactions";
import { assetAdjustments } from "@/infrastructure/db/schema/asset-adjustments";
import { assets } from "@/infrastructure/db/schema/assets";
import { auditLog } from "@/infrastructure/db/schema/audit-log";
import { categories } from "@/infrastructure/db/schema/categories";
import { idempotencyKeys } from "@/infrastructure/db/schema/idempotency-keys";
import { pendingIntents } from "@/infrastructure/db/schema/pending-intents";
import { users, sessions, accounts } from "@/infrastructure/db/schema/auth";
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

export async function editAssetNameAction(
  assetId: string,
  name: string,
): Promise<ActionResult> {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, message: "Nama akun tidak boleh kosong." };
  }
  try {
    const updated = await updateAssetName(db, session.user.id, assetId, trimmed);
    if (!updated) {
      return { success: false, message: "Akun tidak ditemukan." };
    }
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/accounts");
    return { success: true, message: "Nama akun berhasil diperbarui." };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal memperbarui nama akun.",
    };
  }
}

export async function reconcileAssetBalanceAction(
  assetId: string,
  actualBalance: bigint,
  reason?: string,
): Promise<ActionResult> {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");

  if (actualBalance < 0n) {
    return { success: false, message: "Saldo aktual tidak boleh negatif." };
  }

  try {
    await executeCreateBalanceAdjustment(db, {
      userId: session.user.id,
      assetId,
      amount: actualBalance,
      description: reason?.trim() || null,
      idempotencyKey: randomUUID(),
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/accounts");
    return { success: true, message: "Koreksi saldo berhasil dicatat." };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal mengoreksi saldo.",
    };
  }
}

export async function deactivateAssetAction(assetId: string): Promise<ActionResult> {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  try {
    const deactivated = await deactivateAsset(db, session.user.id, assetId);
    if (!deactivated) {
      return {
        success: false,
        message: "Akun tidak dapat dinonaktifkan (saldo harus Rp 0).",
      };
    }
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/accounts");
    return { success: true, message: "Akun berhasil dinonaktifkan." };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal menonaktifkan akun.",
    };
  }
}

export async function deleteAssetAction(assetId: string): Promise<ActionResult> {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  try {
    const ok = await db.transaction(async (tx) => {
      return await deleteAssetWithCascade(tx, session.user.id, assetId);
    });
    if (!ok) {
      return {
        success: false,
        message: "Akun tidak ditemukan atau gagal dihapus.",
      };
    }
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/accounts");
    revalidatePath("/dashboard/history");
    return { success: true, message: "Akun berhasil dihapus dan nama akun dapat digunakan kembali." };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal menghapus akun.",
    };
  }
}

export async function deleteUserAccountAction(): Promise<ActionResult> {
  const session = await getServerSession();
  if (!session) {
    return { success: false, message: "Sesi tidak ditemukan atau kedaluwarsa." };
  }

  const userId = session.user.id;

  try {
    await db.transaction(async (tx) => {
      await tx.delete(transactions).where(eq(transactions.userId, userId));
      await tx.delete(assetAdjustments).where(eq(assetAdjustments.userId, userId));
      await tx.delete(assets).where(eq(assets.userId, userId));
      await tx.delete(auditLog).where(eq(auditLog.userId, userId));
      await tx.delete(categories).where(eq(categories.userId, userId));
      await tx.delete(idempotencyKeys).where(eq(idempotencyKeys.userId, userId));
      await tx.delete(pendingIntents).where(eq(pendingIntents.userId, userId));
      await tx.delete(sessions).where(eq(sessions.userId, userId));
      await tx.delete(accounts).where(eq(accounts.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });

    return {
      success: true,
      message: "Akun email dan seluruh data finansial Anda telah berhasil dihapus permanen.",
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal menghapus akun pengguna.",
    };
  }
}
