import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { executeCreateOpeningBalance } from "@/application/commands";
import { createAsset, getAssetById } from "@/infrastructure/repositories/assets";
import { getTransactionById } from "@/infrastructure/repositories/transactions";
import { closeTestDb, seedUser, testDb } from "@/infrastructure/__tests__/test-db";
import { processChatMessage } from "../chat-service";

let userId: string;
let bcaId: string;
let gopayId: string;
let bibitId: string;

beforeAll(async () => {
  userId = await seedUser("chat-flow");
  const bca = await createAsset(testDb, { userId, name: "BCA", type: "BANK" });
  const gopay = await createAsset(testDb, { userId, name: "GoPay", type: "E_WALLET" });
  const bibit = await createAsset(testDb, {
    userId,
    name: "Bibit",
    type: "INVESTMENT",
  });
  bcaId = bca.id;
  gopayId = gopay.id;
  bibitId = bibit.id;

  // Saldo awal BCA: 100_000n
  await executeCreateOpeningBalance(testDb, {
    userId,
    assetId: bcaId,
    amount: 100_000n,
    idempotencyKey: randomUUID(),
  });
});

afterAll(closeTestDb);

describe("Stage 14: Chat-to-Intent Flow Integration", () => {
  it("expense chat: 'beli makan 25rb pake BCA' memotong saldo dan mengembalikan konfirmasi", async () => {
    const res = await processChatMessage(testDb, userId, "beli makan 25rb pake BCA");
    expect(res.success).toBe(true);
    expect(res.commandType).toBe("CREATE_EXPENSE");
    expect(res.transactionId).toBeDefined();
    expect(res.message).toContain("Rp25.000");
    expect(res.message).toContain("BCA");
    expect(res.message).toContain("Rp75.000");

    const bca = await getAssetById(testDb, userId, bcaId);
    expect(bca?.currentValue).toBe(75_000n);

    const tx = await getTransactionById(testDb, userId, res.transactionId!);
    expect(tx?.status).toBe("ACTIVE");
    expect(tx?.amount).toBe(25_000n);
  });

  it("income chat: 'gaji 500rb masuk ke BCA' menambah saldo dan tercatat", async () => {
    const res = await processChatMessage(testDb, userId, "gaji 500rb masuk ke BCA");
    expect(res.success).toBe(true);
    expect(res.commandType).toBe("CREATE_INCOME");
    expect(res.message).toContain("Rp500.000");
    expect(res.message).toContain("Rp575.000");

    const bca = await getAssetById(testDb, userId, bcaId);
    expect(bca?.currentValue).toBe(575_000n);
  });

  it("transfer chat: 'transfer 50rb dari BCA ke GoPay' memindahkan dana", async () => {
    const res = await processChatMessage(testDb, userId, "transfer 50rb dari BCA ke GoPay");
    expect(res.success).toBe(true);
    expect(res.commandType).toBe("CREATE_TRANSFER");
    expect(res.message).toContain("transfer");
    expect(res.message).toContain("Rp50.000");

    const bca = await getAssetById(testDb, userId, bcaId);
    const gopay = await getAssetById(testDb, userId, gopayId);
    expect(bca?.currentValue).toBe(525_000n);
    expect(gopay?.currentValue).toBe(50_000n);
  });

  it("investment purchase chat: 'transfer 100rb dari BCA ke Bibit' dikenali sebagai pembelian investasi", async () => {
    const res = await processChatMessage(testDb, userId, "transfer 100rb dari BCA ke Bibit");
    expect(res.success).toBe(true);
    expect(res.message).toContain("pembelian investasi");

    const bca = await getAssetById(testDb, userId, bcaId);
    const bibit = await getAssetById(testDb, userId, bibitId);
    expect(bca?.currentValue).toBe(425_000n);
    expect(bibit?.currentValue).toBe(100_000n);
  });

  it("pesan tidak jelas mengembalikan panduan format tanpa mutasi database", async () => {
    const res = await processChatMessage(testDb, userId, "halo selamat pagi apa kabar");
    expect(res.success).toBe(false);
    expect(res.message).toContain("Pesan tidak dikenali sebagai transaksi");
  });

  it("asset tidak terdaftar mengembalikan pesan klarifikasi tanpa mutasi", async () => {
    const res = await processChatMessage(testDb, userId, "beli makan 10rb pake OVO");
    expect(res.success).toBe(false);
    expect(res.message).toContain("Sebutkan akun sumber pembayaran");
  });

  it("saldo tidak mencukupi gagal secara atomik dan mengembalikan pesan kesalahan", async () => {
    const res = await processChatMessage(testDb, userId, "beli mobil 100jt pake BCA");
    expect(res.success).toBe(false);
    expect(res.message).toContain("Gagal memproses transaksi");
  });
});
