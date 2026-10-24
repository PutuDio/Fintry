import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { InsufficientBalanceError } from "@/domain/accounting";
import {
  executeCreateBalanceAdjustment,
  executeCreateExpense,
  executeCreateIncome,
  executeCreateOpeningBalance,
  executeCreateTransfer,
  executeEditTransaction,
  executeVoidTransaction,
} from "../index";
import { createAsset, getAssetById } from "@/infrastructure/repositories/assets";
import {
  getTransactionById,
  listReplacementsOf,
} from "@/infrastructure/repositories/transactions";
import { listAdjustmentsByAsset } from "@/infrastructure/repositories/adjustments";
import { closeTestDb, seedUser, testDb } from "@/infrastructure/__tests__/test-db";

let userId: string;
let bcaId: string;
let gopayId: string;
let bibitId: string;

beforeAll(async () => {
  userId = await seedUser("commands");
  const bca = await createAsset(testDb, { userId, name: "BCA", type: "BANK" });
  const gopay = await createAsset(testDb, { userId, name: "GoPay", type: "E_WALLET" });
  const bibit = await createAsset(testDb, { userId, name: "Bibit Reksadana", type: "INVESTMENT" });
  bcaId = bca.id;
  gopayId = gopay.id;
  bibitId = bibit.id;
});

afterAll(closeTestDb);

describe("Stage 10: Application Commands Integration", () => {
  describe("Opening Balance", () => {
    it("menetapkan saldo awal asset", async () => {
      const res = await executeCreateOpeningBalance(testDb, {
        userId,
        assetId: bcaId,
        amount: 100_000n,
        idempotencyKey: randomUUID(),
      });
      expect(res.balanceAfter).toBe(100_000n);

      const asset = await getAssetById(testDb, userId, bcaId);
      expect(asset?.currentValue).toBe(100_000n);

      const adjs = await listAdjustmentsByAsset(testDb, bcaId);
      expect(adjs).toHaveLength(1);
      expect(adjs[0].type).toBe("OPENING_BALANCE");
      expect(adjs[0].delta).toBe(100_000n);
    });

    it("menolak opening balance kedua pada asset yang sama (partial unique index)", async () => {
      await expect(
        executeCreateOpeningBalance(testDb, {
          userId,
          assetId: bcaId,
          amount: 50_000n,
          idempotencyKey: randomUUID(),
        }),
      ).rejects.toMatchObject({ cause: { code: "23505" } });
    });
  });

  describe("Income & Expense", () => {
    it("executeCreateIncome menambah saldo dan mencatat transaksi", async () => {
      const res = await executeCreateIncome(testDb, {
        userId,
        destinationAssetId: bcaId,
        amount: 50_000n,
        description: "Gaji bulanan",
        category: "Salary",
        idempotencyKey: randomUUID(),
      });
      expect(res.balanceAfter).toBe(150_000n);

      const txRow = await getTransactionById(testDb, userId, res.transactionId);
      expect(txRow?.type).toBe("INCOME");
      expect(txRow?.amount).toBe(50_000n);
      expect(txRow?.status).toBe("ACTIVE");
    });

    it("executeCreateExpense mengurangi saldo", async () => {
      const res = await executeCreateExpense(testDb, {
        userId,
        sourceAssetId: bcaId,
        amount: 30_000n,
        description: "Makan malam",
        category: "Food & Beverage",
        idempotencyKey: randomUUID(),
      });
      expect(res.balanceAfter).toBe(120_000n);

      const asset = await getAssetById(testDb, userId, bcaId);
      expect(asset?.currentValue).toBe(120_000n);
    });

    it("executeCreateExpense ditolak jika saldo tidak cukup (atomic rollback)", async () => {
      await expect(
        executeCreateExpense(testDb, {
          userId,
          sourceAssetId: bcaId,
          amount: 1_000_000n,
          description: "Belanja mobil",
          idempotencyKey: randomUUID(),
        }),
      ).rejects.toThrow(InsufficientBalanceError);

      const asset = await getAssetById(testDb, userId, bcaId);
      expect(asset?.currentValue).toBe(120_000n);
    });
  });

  describe("Transfer & Investment Purchase", () => {
    it("executeCreateTransfer memindahkan saldo antar asset kas", async () => {
      const res = await executeCreateTransfer(testDb, {
        userId,
        sourceAssetId: bcaId,
        destinationAssetId: gopayId,
        amount: 20_000n,
        description: "Top up GoPay",
        idempotencyKey: randomUUID(),
      });
      expect(res.sourceBalanceAfter).toBe(100_000n);
      expect(res.destinationBalanceAfter).toBe(20_000n);
      expect(res.isInvestmentPurchase).toBe(false);

      const bca = await getAssetById(testDb, userId, bcaId);
      const gopay = await getAssetById(testDb, userId, gopayId);
      expect(bca?.currentValue).toBe(100_000n);
      expect(gopay?.currentValue).toBe(20_000n);
    });

    it("transfer ke asset tipe INVESTMENT dikenali sebagai investment purchase (PRD §6.4)", async () => {
      const res = await executeCreateTransfer(testDb, {
        userId,
        sourceAssetId: bcaId,
        destinationAssetId: bibitId,
        amount: 50_000n,
        description: "Beli Reksadana Bibit",
        idempotencyKey: randomUUID(),
      });
      expect(res.sourceBalanceAfter).toBe(50_000n);
      expect(res.destinationBalanceAfter).toBe(50_000n);
      expect(res.isInvestmentPurchase).toBe(true);
    });
  });

  describe("Balance Adjustment", () => {
    it("executeCreateBalanceAdjustment mencatat rekonsiliasi dan delta", async () => {
      // Saldo BCA saat ini 50_000n. Aktual di bank 48_500n (selisih biaya admin 1_500).
      const res = await executeCreateBalanceAdjustment(testDb, {
        userId,
        assetId: bcaId,
        amount: 48_500n,
        description: "Rekonsiliasi mutasi bulanan",
        idempotencyKey: randomUUID(),
      });
      expect(res.valueBefore).toBe(50_000n);
      expect(res.valueAfter).toBe(48_500n);
      expect(res.delta).toBe(-1_500n);

      const asset = await getAssetById(testDb, userId, bcaId);
      expect(asset?.currentValue).toBe(48_500n);
    });

    it("menolak penyesuaian tanpa perubahan saldo (no-op)", async () => {
      await expect(
        executeCreateBalanceAdjustment(testDb, {
          userId,
          assetId: bcaId,
          amount: 48_500n,
          idempotencyKey: randomUUID(),
        }),
      ).rejects.toThrow(/delta must be non-zero/);
    });
  });

  describe("Void Transaction", () => {
    it("executeVoidTransaction membalik saldo dan mengubah status menjadi VOIDED", async () => {
      // Buat expense 8_500n dari BCA (saldo 48_500n -> 40_000n)
      const exp = await executeCreateExpense(testDb, {
        userId,
        sourceAssetId: bcaId,
        amount: 8_500n,
        description: "Beli bensin salah catat",
        idempotencyKey: randomUUID(),
      });
      expect(exp.balanceAfter).toBe(40_000n);

      // Void transaksi tersebut
      const voidRes = await executeVoidTransaction(testDb, {
        userId,
        transactionId: exp.transactionId,
        reason: "salah catat",
        idempotencyKey: randomUUID(),
      });
      expect(voidRes.voidedTransactionId).toBe(exp.transactionId);

      // Saldo BCA kembali menjadi 48_500n
      const bca = await getAssetById(testDb, userId, bcaId);
      expect(bca?.currentValue).toBe(48_500n);

      const txRow = await getTransactionById(testDb, userId, exp.transactionId);
      expect(txRow?.status).toBe("VOIDED");
      expect(txRow?.voidedAt).toBeInstanceOf(Date);
    });

    it("menolak void kedua pada transaksi yang sudah VOIDED", async () => {
      // Ambil transaksi yang baru di-void di atas
      const list = await testDb.query.transactions.findMany({
        where: (cols, { eq, and }) =>
          and(eq(cols.userId, userId), eq(cols.status, "VOIDED")),
      });
      const voidedId = list[0].id;

      await expect(
        executeVoidTransaction(testDb, {
          userId,
          transactionId: voidedId,
          idempotencyKey: randomUUID(),
        }),
      ).rejects.toThrow(/already voided/);
    });
  });

  describe("Edit Transaction", () => {
    it("direct edit memperbarui deskripsi dan kategori tanpa mengubah status atau saldo", async () => {
      const exp = await executeCreateExpense(testDb, {
        userId,
        sourceAssetId: bcaId,
        amount: 5_000n,
        description: "Kopi lama",
        category: "Snack",
        idempotencyKey: randomUUID(),
      });

      const editRes = await executeEditTransaction(testDb, {
        userId,
        transactionId: exp.transactionId,
        patch: { description: "Kopi Baru", category: "Coffee" },
        idempotencyKey: randomUUID(),
      });
      expect(editRes.mode).toBe("direct");

      const txRow = await getTransactionById(testDb, userId, exp.transactionId);
      expect(txRow?.description).toBe("Kopi Baru");
      expect(txRow?.status).toBe("ACTIVE");
    });

    it("financial edit (nominal) melakukan VOID + replacement dalam satu tx (D2)", async () => {
      // Saldo BCA sebelum: 43_500n
      // Buat expense 10_000n -> saldo jadi 33_500n
      const original = await executeCreateExpense(testDb, {
        userId,
        sourceAssetId: bcaId,
        amount: 10_000n,
        description: "Makan di resto",
        idempotencyKey: randomUUID(),
      });
      expect(original.balanceAfter).toBe(33_500n);

      // Edit nominal menjadi 15_000n (tambah 5_000n dari saldo)
      const editRes = await executeEditTransaction(testDb, {
        userId,
        transactionId: original.transactionId,
        patch: { amount: 15_000n },
        idempotencyKey: randomUUID(),
      });
      expect(editRes.mode).toBe("replacement");
      expect(editRes.replacementTransactionId).toBeDefined();

      // Transaksi lama harus VOIDED
      const oldTx = await getTransactionById(testDb, userId, original.transactionId);
      expect(oldTx?.status).toBe("VOIDED");

      // Transaksi baru harus ACTIVE dan memiliki replacesTransactionId
      const newTx = await getTransactionById(
        testDb,
        userId,
        editRes.replacementTransactionId!,
      );
      expect(newTx?.status).toBe("ACTIVE");
      expect(newTx?.amount).toBe(15_000n);
      expect(newTx?.replacesTransactionId).toBe(original.transactionId);

      // Saldo BCA harus 28_500n (33_500 + 10_000 - 15_000)
      const bca = await getAssetById(testDb, userId, bcaId);
      expect(bca?.currentValue).toBe(28_500n);

      // Riwayat replacement tercatat
      const replacements = await listReplacementsOf(testDb, userId, original.transactionId);
      expect(replacements).toHaveLength(1);
      expect(replacements[0].id).toBe(editRes.replacementTransactionId);
    });
  });
});
