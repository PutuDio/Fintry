import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  executeCreateExpense,
  executeCreateIncome,
  executeCreateOpeningBalance,
  executeCreateTransfer,
} from "@/application/commands";
import { createAsset } from "@/infrastructure/repositories/assets";
import { closeTestDb, seedUser, testDb } from "@/infrastructure/__tests__/test-db";
import {
  calculateNetWorth,
  getDashboardSummary,
  listLedgerTransactions,
} from "../index";

let userId: string;
let bcaId: string;
let gopayId: string;
let bibitId: string;

beforeAll(async () => {
  userId = await seedUser("services-test");
  const bca = await createAsset(testDb, { userId, name: "BCA Service", type: "BANK" });
  const gopay = await createAsset(testDb, { userId, name: "GoPay Service", type: "E_WALLET" });
  const bibit = await createAsset(testDb, {
    userId,
    name: "Bibit Service",
    type: "INVESTMENT",
  });
  bcaId = bca.id;
  gopayId = gopay.id;
  bibitId = bibit.id;

  // Setup initial state:
  // 1. Opening balance on BCA = 100_000
  await executeCreateOpeningBalance(testDb, {
    userId,
    assetId: bcaId,
    amount: 100_000n,
    idempotencyKey: randomUUID(),
  });

  // 2. Income to BCA = 50_000 (Category: "Salary") -> BCA = 150_000
  await executeCreateIncome(testDb, {
    userId,
    destinationAssetId: bcaId,
    amount: 50_000n,
    category: "Salary",
    description: "Bonus",
    idempotencyKey: randomUUID(),
  });

  // 3. Transfer from BCA to GoPay = 20_000 -> BCA = 130_000, GoPay = 20_000
  await executeCreateTransfer(testDb, {
    userId,
    sourceAssetId: bcaId,
    destinationAssetId: gopayId,
    amount: 20_000n,
    idempotencyKey: randomUUID(),
  });

  // 4. Transfer (investment purchase) from BCA to Bibit = 30_000 -> BCA = 100_000, Bibit = 30_000
  await executeCreateTransfer(testDb, {
    userId,
    sourceAssetId: bcaId,
    destinationAssetId: bibitId,
    amount: 30_000n,
    description: "Beli Reksadana",
    idempotencyKey: randomUUID(),
  });

  // 5. Expense from GoPay = 5_000 -> GoPay = 15_000 (Category: "Food")
  await executeCreateExpense(testDb, {
    userId,
    sourceAssetId: gopayId,
    amount: 5_000n,
    category: "Food",
    description: "Lunch",
    idempotencyKey: randomUUID(),
  });
});

afterAll(closeTestDb);

describe("Stage 11: Query Services Integration", () => {
  it("calculateNetWorth menghitung total seluruh saldo asset aktif", async () => {
    // Expected: BCA (100_000) + GoPay (15_000) + Bibit (30_000) = 145_000
    const nw = await calculateNetWorth(userId, testDb);
    expect(nw.netWorth).toBe(145_000n);
    expect(nw.assetsCount).toBe(3);
  });

  it("getDashboardSummary memisahkan total kas dan total investasi", async () => {
    const summary = await getDashboardSummary(userId, testDb);
    expect(summary.netWorth).toBe(145_000n);
    expect(summary.cashTotal).toBe(115_000n); // BCA (100_000) + GoPay (15_000)
    expect(summary.investmentTotal).toBe(30_000n); // Bibit (30_000)
    expect(summary.assets).toHaveLength(3);
    expect(summary.recentTransactionsCount).toBe(4); // Income, Transfer, Transfer, Expense
  });

  it("listLedgerTransactions mengembalikan riwayat transaksi aktif beserta nama kategori", async () => {
    const ledger = await listLedgerTransactions(userId, {}, testDb);
    expect(ledger).toHaveLength(4);

    // Filter by type EXPENSE
    const expenses = await listLedgerTransactions(userId, { type: "EXPENSE" }, testDb);
    expect(expenses).toHaveLength(1);
    expect(expenses[0].categoryName?.toLowerCase()).toBe("food");
    expect(expenses[0].amount).toBe(5_000n);

    // Filter by type INCOME
    const incomes = await listLedgerTransactions(userId, { type: "INCOME" }, testDb);
    expect(incomes).toHaveLength(1);
    expect(incomes[0].categoryName?.toLowerCase()).toBe("salary");
    expect(incomes[0].amount).toBe(50_000n);
  });
});
