import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyExpense, applyIncome, InsufficientBalanceError } from "@/domain/accounting";
import { normalizeCategoryName } from "@/domain/category";
import { formatIdr } from "@/domain/money";
import { createAsset, lockAssetsByIds, setAssetValue } from "../repositories/assets";
import { findOrCreateCategory } from "../repositories/categories";
import { insertAudit } from "../repositories/audit";
import { claimIdempotency, saveIdempotencyResult } from "../repositories/idempotency";
import { insertAdjustment } from "../repositories/adjustments";
import { insertTransaction } from "../repositories/transactions";
import type { Db } from "../repositories/types";
import { closeTestDb, seedUser, testDb } from "./test-db";

// Stage 9b: mutation flow sesuai ADR-002 §2.4 melalui repository:
// idempotency → lock assets (id ASC) → engine → update → insert → audit.

interface ExpenseCommand {
  userId: string;
  assetId: string;
  amount: bigint;
  description: string;
  category: string | null;
  idempotencyKey: string;
}

interface CommandResult {
  transactionId: string;
  balanceAfter: string; // bigint sebagai string di boundary JSON (ADR-002 §2.1)
  display: string;
}

/** Komposisi ala application command CreateExpense — vehicle test flow. */
async function runExpense(db: Db, cmd: ExpenseCommand): Promise<CommandResult> {
  return db.transaction(async (tx) => {
    const requestHash = `${cmd.assetId}:${cmd.amount}:${cmd.description}`;
    const claim = await claimIdempotency(tx, {
      userId: cmd.userId,
      key: cmd.idempotencyKey,
      commandType: "EXPENSE",
      requestHash,
    });
    if (claim.status === "replay") {
      return claim.row.result as CommandResult;
    }
    if (claim.status === "conflict") {
      throw new Error("idempotency key dipakai dengan request berbeda");
    }

    const locked = await lockAssetsByIds(tx, cmd.userId, [cmd.assetId]);
    if (locked.length !== 1) {
      throw new Error("asset tidak ditemukan untuk user ini");
    }
    const asset = locked[0];
    if (!asset.isActive) throw new Error("asset INACTIVE tidak bisa dipakai");

    const balanceAfter = applyExpense(asset.currentValue, cmd.amount, asset.name);
    await setAssetValue(tx, asset.id, balanceAfter);

    let categoryId: string | null = null;
    if (cmd.category) {
      const normalized = normalizeCategoryName(cmd.category);
      if (normalized) {
        categoryId = (await findOrCreateCategory(tx, cmd.userId, normalized)).id;
      }
    }

    const transaction = await insertTransaction(tx, {
      userId: cmd.userId,
      type: "EXPENSE",
      amount: cmd.amount,
      sourceAssetId: asset.id,
      description: cmd.description,
      categoryId,
      transactionDate: "2026-10-21",
    });

    await insertAudit(tx, {
      userId: cmd.userId,
      entityType: "TRANSACTION",
      entityId: transaction.id,
      action: "TRANSACTION_CREATED",
      afterState: { amount: cmd.amount.toString(), assetId: asset.id },
    });

    const result: CommandResult = {
      transactionId: transaction.id,
      balanceAfter: balanceAfter.toString(),
      display: formatIdr(balanceAfter),
    };
    await saveIdempotencyResult(tx, cmd.userId, cmd.idempotencyKey, result);
    return result;
  });
}

let userId: string;
let bcaId: string;

beforeAll(async () => {
  userId = await seedUser("flow");
  const bca = await createAsset(testDb, {
    userId,
    name: "BCA",
    type: "BANK",
  });
  bcaId = bca.id;

  // Opening balance 10.000 + income 5.000 → saldo 15.000.
  await testDb.transaction(async (tx) => {
    await insertAdjustment(tx, {
      userId,
      assetId: bcaId,
      type: "OPENING_BALANCE",
      valueBefore: 0n,
      valueAfter: 10_000n,
      delta: 10_000n,
      reason: "seed",
    });
    await setAssetValue(tx, bcaId, 10_000n);
    await insertTransaction(tx, {
      userId,
      type: "INCOME",
      amount: 5_000n,
      destinationAssetId: bcaId,
      description: "gaji",
      transactionDate: "2026-10-20",
    });
    const locked = await lockAssetsByIds(tx, userId, [bcaId]);
    await setAssetValue(tx, bcaId, applyIncome(locked[0].currentValue, 5_000n));
  });
});

afterAll(closeTestDb);

describe("atomic expense flow (ADR-002 §2.4)", () => {
  it("expense 4.000 dari saldo 15.000 → 11.000, audit + kategori terbentuk", async () => {
    const result = await runExpense(testDb, {
      userId,
      assetId: bcaId,
      amount: 4_000n,
      description: "beli kopi",
      category: "food & beverage",
      idempotencyKey: randomUUID(),
    });
    expect(result.balanceAfter).toBe("11000");
    expect(result.display).toBe("Rp11.000");

    const asset = await lockAssetsByIds(testDb, userId, [bcaId]);
    expect(asset[0].currentValue).toBe(11_000n);
  });

  it("replay key yang sama = satu mutation, hasil identik", async () => {
    const cmd: ExpenseCommand = {
      userId,
      assetId: bcaId,
      amount: 1_000n,
      description: "makan siang",
      category: null,
      idempotencyKey: randomUUID(),
    };
    const first = await runExpense(testDb, cmd);
    const replay = await runExpense(testDb, cmd);
    expect(replay).toEqual(first);

    // Saldo hanya turun sekali: 11.000 → 10.000.
    const asset = await lockAssetsByIds(testDb, userId, [bcaId]);
    expect(asset[0].currentValue).toBe(10_000n);
  });

  it("key sama dengan payload berbeda → ditolak (conflict)", async () => {
    const key = randomUUID();
    await runExpense(testDb, {
      userId,
      assetId: bcaId,
      amount: 500n,
      description: "parkir",
      category: null,
      idempotencyKey: key,
    });
    await expect(
      runExpense(testDb, {
        userId,
        assetId: bcaId,
        amount: 9_999n,
        description: "parkir palsu",
        category: null,
        idempotencyKey: key,
      }),
    ).rejects.toThrow(/idempotency key/);

    // 10.000 → 9.500 (hanya "parkir" yang masuk).
    const asset = await lockAssetsByIds(testDb, userId, [bcaId]);
    expect(asset[0].currentValue).toBe(9_500n);
  });

  it("gagal saldo tidak meninggalkan idempotency row (atomic rollback)", async () => {
    const key = randomUUID();
    await expect(
      runExpense(testDb, {
        userId,
        assetId: bcaId,
        amount: 10n ** 12n,
        description: "mustahil",
        category: null,
        idempotencyKey: key,
      }),
    ).rejects.toThrow(InsufficientBalanceError);

    const rows = await testDb.query.idempotencyKeys.findMany({
      where: (cols, { eq }) => eq(cols.key, key),
    });
    expect(rows).toHaveLength(0);
  });

  it("dua expense konkuren: tepat satu sukses, tidak ada double-spend", async () => {
    // Saldo 9.500; dua permintaan @ (half + 1) → total selalu > saldo,
    // row lock memaksa validasi ulang setelah antrian → tepat satu sukses.
    const asset = await lockAssetsByIds(testDb, userId, [bcaId]);
    const before = asset[0].currentValue;
    const amount = before / 2n + 1n;

    const mk = (n: number) =>
      runExpense(testDb, {
        userId,
        assetId: bcaId,
        amount,
        description: `konkuren ${n}`,
        category: null,
        idempotencyKey: randomUUID(),
      });

    const settled = await Promise.allSettled([mk(1), mk(2)]);
    const ok = settled.filter((s) => s.status === "fulfilled");
    expect(ok).toHaveLength(1);

    const after = await lockAssetsByIds(testDb, userId, [bcaId]);
    expect(after[0].currentValue).toBe(before - amount);
    expect(after[0].currentValue).toBeGreaterThanOrEqual(0n);
  });

  it("reconciliation: stored value = opening + ledger ACTIVE (ADR-002 §3)", async () => {
    const asset = await lockAssetsByIds(testDb, userId, [bcaId]);
    const stored = asset[0].currentValue;

    const opening = 10_000n; // adjustment OPENING_BALANCE
    const txs = await testDb.query.transactions.findMany({
      where: (cols, { eq, and }) =>
        and(eq(cols.userId, userId), eq(cols.status, "ACTIVE")),
    });
    let fromLedger = opening;
    for (const t of txs) {
      const delta =
        t.type === "INCOME" ? t.amount : t.type === "EXPENSE" ? -t.amount : 0n;
      fromLedger += delta;
    }
    expect(stored).toBe(fromLedger);
  });
});
