import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  executeCreateExpense,
  executeCreateIncome,
  executeCreateOpeningBalance,
  executeEditTransaction,
  executeVoidTransaction,
} from "@/application/commands";
import { createAsset } from "@/infrastructure/repositories/assets";
import { closeTestDb, seedUser, testDb } from "@/infrastructure/__tests__/test-db";
import { countLedgerTransactions, listLedgerTransactions } from "../index";

// Stage 20: history/correction/reversal query coverage.
// Memastikan ledger menampilkan transaksi VOIDED, nama asset, replacement
// chain, dan count untuk pagination (domain_rules.md §17).

let userId: string;
let bcaId: string;
let incomeId: string;
let expenseId: string;
let replacementId: string;

beforeAll(async () => {
  userId = await seedUser("ledger-history-test");
  const bca = await createAsset(testDb, { userId, name: "BCA Hist", type: "BANK" });
  bcaId = bca.id;

  await executeCreateOpeningBalance(testDb, {
    userId,
    assetId: bcaId,
    amount: 100_000n,
    idempotencyKey: randomUUID(),
  });

  const income = await executeCreateIncome(testDb, {
    userId,
    destinationAssetId: bcaId,
    amount: 20_000n,
    category: "Salary",
    description: "Gaji bulan ini",
    idempotencyKey: randomUUID(),
  });
  incomeId = income.transactionId;

  const expense = await executeCreateExpense(testDb, {
    userId,
    sourceAssetId: bcaId,
    amount: 10_000n,
    category: "Food",
    description: "Kopi",
    idempotencyKey: randomUUID(),
  });
  expenseId = expense.transactionId;

  // Void the expense — history must retain it with VOIDED status.
  await executeVoidTransaction(testDb, {
    userId,
    transactionId: expenseId,
    reason: "salah input",
    idempotencyKey: randomUUID(),
  });

  // Financial edit on income — void + replacement (D2).
  const edited = await executeEditTransaction(testDb, {
    userId,
    transactionId: incomeId,
    patch: { amount: 25_000n },
    idempotencyKey: randomUUID(),
  });
  expect(edited.mode).toBe("replacement");
  replacementId = edited.replacementTransactionId ?? "";
});

afterAll(closeTestDb);

describe("Stage 20: Ledger history queries", () => {
  it("default filter hanya menampilkan transaksi ACTIVE", async () => {
    const active = await listLedgerTransactions(userId, {}, testDb);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(replacementId);
    expect(active[0].amount).toBe(25_000n);
    expect(active[0].status).toBe("ACTIVE");
    expect(active[0].destinationAssetName).toBe("BCA Hist");
    expect(active[0].replacesTransactionId).toBe(incomeId);
  });

  it("status ALL menampilkan transaksi VOIDED beserta nama asset dan kategori", async () => {
    const all = await listLedgerTransactions(userId, { status: "ALL" }, testDb);
    expect(all).toHaveLength(3);

    const oldIncome = all.find((tx) => tx.id === incomeId);
    expect(oldIncome?.status).toBe("VOIDED");
    expect(oldIncome?.replacedByTransactionId).toBe(replacementId);

    const voidedExpense = all.find((tx) => tx.id === expenseId);
    expect(voidedExpense?.status).toBe("VOIDED");
    expect(voidedExpense?.sourceAssetName).toBe("BCA Hist");
    expect(voidedExpense?.categoryName?.toLowerCase()).toBe("food");
    expect(voidedExpense?.replacedByTransactionId).toBeNull();
  });

  it("filter type dan status dapat dikombinasikan", async () => {
    const voidedExpenses = await listLedgerTransactions(
      userId,
      { status: "VOIDED", type: "EXPENSE" },
      testDb,
    );
    expect(voidedExpenses).toHaveLength(1);
    expect(voidedExpenses[0].id).toBe(expenseId);

    const voidedIncomes = await listLedgerTransactions(
      userId,
      { status: "VOIDED", type: "INCOME" },
      testDb,
    );
    expect(voidedIncomes).toHaveLength(1);
    expect(voidedIncomes[0].id).toBe(incomeId);
  });

  it("countLedgerTransactions mengikuti filter untuk pagination", async () => {
    expect(await countLedgerTransactions(userId, {}, testDb)).toBe(1);
    expect(await countLedgerTransactions(userId, { status: "VOIDED" }, testDb)).toBe(2);
    expect(await countLedgerTransactions(userId, { status: "ALL" }, testDb)).toBe(3);
    expect(
      await countLedgerTransactions(userId, { status: "ALL", type: "EXPENSE" }, testDb),
    ).toBe(1);
  });

  it("pagination memakai limit/offset", async () => {
    const firstPage = await listLedgerTransactions(
      userId,
      { status: "ALL", limit: 2, offset: 0 },
      testDb,
    );
    const secondPage = await listLedgerTransactions(
      userId,
      { status: "ALL", limit: 2, offset: 2 },
      testDb,
    );
    expect(firstPage).toHaveLength(2);
    expect(secondPage).toHaveLength(1);
    const ids = new Set([...firstPage, ...secondPage].map((tx) => tx.id));
    expect(ids.size).toBe(3);
  });
});
