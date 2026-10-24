import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAsset,
  getAssetById,
  listAssets,
} from "../repositories/assets";
import {
  findOrCreateCategory,
  listCategories,
} from "../repositories/categories";
import { insertTransaction } from "../repositories/transactions";
import { closeTestDb, seedUser, testDb } from "./test-db";

// Stage 9a: user scoping, unique lower(name), dan isolasi cross-user
// melalui repository layer (bukan SQL mentah seperti stage 7).

let userA: string;
let userB: string;
let assetAId: string;

beforeAll(async () => {
  userA = await seedUser("scoping-a");
  userB = await seedUser("scoping-b");
  const asset = await createAsset(testDb, {
    userId: userA,
    name: "BCA",
    type: "BANK",
  });
  assetAId = asset.id;
});

afterAll(closeTestDb);

describe("repository user scoping", () => {
  it("getById milik user lain mengembalikan null", async () => {
    expect(await getAssetById(testDb, userB, assetAId)).toBeNull();
    expect(await getAssetById(testDb, userA, assetAId)).not.toBeNull();
  });

  it("listAssets hanya mengembalikan asset milik user", async () => {
    const listB = await listAssets(testDb, userB);
    expect(listB.some((a) => a.id === assetAId)).toBe(false);
    const listA = await listAssets(testDb, userA, { activeOnly: true });
    expect(listA.map((a) => a.id)).toContain(assetAId);
  });

  it("nama unik case-insensitive per user (23505 saat duplikat)", async () => {
    await expect(
      createAsset(testDb, { userId: userA, name: "bca", type: "E_WALLET" }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    const other = await createAsset(testDb, {
      userId: userB,
      name: "BCA",
      type: "E_WALLET",
    });
    expect(other.userId).toBe(userB);
  });

  it("transaksicross-user ditolak FK komposit", async () => {
    await expect(
      insertTransaction(testDb, {
        userId: userB,
        type: "INCOME",
        amount: 1000n,
        destinationAssetId: assetAId, // asset milik user A
        transactionDate: "2026-10-21",
      }),
    ).rejects.toMatchObject({ cause: { code: "23503" } });
  });
});

describe("categories find-or-create (domain_rules §11.1)", () => {
  const norm = (name: string) =>
    testDb.transaction(async (tx) =>
      findOrCreateCategory(tx, userA, name),
    );

  it("find-or-create idempoten dan case-insensitive", async () => {
    const first = await norm("Food & Beverage");
    const again = await norm("food & beverage");
    expect(again.id).toBe(first.id);
  });

  it("kategori nama sama milik user berbeda adalah baris berbeda", async () => {
    const mine = await norm("Kopi");
    const theirs = await testDb.transaction((tx) =>
      findOrCreateCategory(tx, userB, "Kopi"),
    );
    expect(theirs.id).not.toBe(mine.id);
    expect(theirs.userId).toBe(userB);
  });

  it("listCategories ter-scope per user", async () => {
    const listA = await listCategories(testDb, userA);
    expect(listA.every((c) => c.userId === userA)).toBe(true);
  });
});
