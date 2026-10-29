import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  executeCreateExpense,
  executeCreateIncome,
  executeCreateOpeningBalance,
} from "@/application/commands";
import { createAsset } from "@/infrastructure/repositories/assets";
import { closeTestDb, seedUser, testDb } from "@/infrastructure/__tests__/test-db";
import {
  getCashFlowHistory,
  getFinancialMetrics,
  getSpendingBreakdown,
} from "../analytics";

let userId: string;
let bankId: string;
const fixedNow = new Date("2026-10-15T12:00:00Z");

beforeAll(async () => {
  userId = await seedUser("analytics-test");
  const bank = await createAsset(testDb, {
    userId,
    name: "BCA Analytics",
    type: "BANK",
  });
  bankId = bank.id;

  // 1. Initial Opening Balance = Rp 1.000.000
  await executeCreateOpeningBalance(testDb, {
    userId,
    assetId: bankId,
    amount: 1_000_000n,
    idempotencyKey: randomUUID(),
  });

  // 2. Current Month Income: Rp 500.000 (Gaji)
  await executeCreateIncome(testDb, {
    userId,
    destinationAssetId: bankId,
    amount: 500_000n,
    category: "Gaji",
    description: "Gaji Bulanan",
    transactionDate: "2026-10-05",
    idempotencyKey: randomUUID(),
  });

  // 3. Current Month Expense: Rp 200.000 (Makan)
  await executeCreateExpense(testDb, {
    userId,
    sourceAssetId: bankId,
    amount: 200_000n,
    category: "Makan",
    description: "Makan Siang",
    transactionDate: "2026-10-10",
    idempotencyKey: randomUUID(),
  });

  // 4. Current Month Expense: Rp 100.000 (Transport)
  await executeCreateExpense(testDb, {
    userId,
    sourceAssetId: bankId,
    amount: 100_000n,
    category: "Transport",
    description: "Bensin",
    transactionDate: "2026-10-12",
    idempotencyKey: randomUUID(),
  });
});

afterAll(closeTestDb);

describe("Analytics Service (v1.2 Tahap 4)", () => {
  it("getFinancialMetrics computes correct Net Worth, Income, Expenses and Savings Rate", async () => {
    const metrics = await getFinancialMetrics(userId, testDb, fixedNow);

    // Balance after ops: 1_000_000 + 500_000 - 200_000 - 100_000 = 1_200_000
    expect(metrics.netWorth).toBe(1_200_000n);
    expect(metrics.monthlyIncome).toBe(500_000n);
    expect(metrics.monthlyExpenses).toBe(300_000n);

    // Savings rate: ((500_000 - 300_000) / 500_000) * 100 = 40%
    expect(metrics.savingsRate).toBe(40);
    expect(metrics.savingsTargetPct).toBe(50);
  });

  it("getCashFlowHistory returns 6 months history including current month", async () => {
    const history = await getCashFlowHistory(userId, testDb, 6, fixedNow);

    expect(history.length).toBe(6);
    // Last element is October 2026
    const oct = history[history.length - 1];
    expect(oct.monthKey).toBe("2026-10");
    expect(oct.income).toBe(500_000n);
    expect(oct.expense).toBe(300_000n);
    expect(oct.net).toBe(200_000n);
  });

  it("getSpendingBreakdown groups expenses by category with percentages", async () => {
    const breakdown = await getSpendingBreakdown(userId, testDb, fixedNow);

    expect(breakdown.total).toBe(300_000n);
    expect(breakdown.items.length).toBe(2);

    const makan = breakdown.items.find((i) => i.categoryName === "Makan");
    expect(makan).toBeDefined();
    expect(makan?.amount).toBe(200_000n);
    // 200.000 / 300.000 = ~66.66%
    expect(makan?.percentage).toBeCloseTo(66.66, 1);

    const transport = breakdown.items.find((i) => i.categoryName === "Transport");
    expect(transport).toBeDefined();
    expect(transport?.amount).toBe(100_000n);
    // 100.000 / 300.000 = ~33.33%
    expect(transport?.percentage).toBeCloseTo(33.33, 1);
  });
});
