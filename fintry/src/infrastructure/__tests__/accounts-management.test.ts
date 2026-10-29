import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  createAsset,
  getAssetById,
  updateAssetName,
  deleteAssetWithCascade,
} from "../repositories/assets";
import { listAdjustmentsByUser } from "../repositories/adjustments";
import { executeCreateBalanceAdjustment } from "@/application/commands/adjustment";
import { closeTestDb, seedUser, testDb } from "./test-db";

let userA: string;
let userB: string;

beforeAll(async () => {
  userA = await seedUser("accounts-mgmt-a");
  userB = await seedUser("accounts-mgmt-b");
});

afterAll(closeTestDb);

describe("Accounts Management & Balance Reconciliation (v1.2 Phase 3)", () => {
  it("updateAssetName changes asset name with trimming and respects user scoping", async () => {
    const asset = await createAsset(testDb, {
      userId: userA,
      name: "Mandiri Tabungan",
      type: "BANK",
    });

    const updated = await updateAssetName(
      testDb,
      userA,
      asset.id,
      "  Mandiri Utama  ",
    );
    expect(updated).not.toBeNull();
    expect(updated?.name).toBe("Mandiri Utama");

    // Scoping: userB cannot update userA's asset
    const unauthorizedUpdate = await updateAssetName(
      testDb,
      userB,
      asset.id,
      "Hacked Name",
    );
    expect(unauthorizedUpdate).toBeNull();

    const verified = await getAssetById(testDb, userA, asset.id);
    expect(verified?.name).toBe("Mandiri Utama");
  });

  it("executeCreateBalanceAdjustment updates balance and writes append-only adjustment record", async () => {
    const asset = await createAsset(testDb, {
      userId: userA,
      name: "Dompet Cash",
      type: "CASH",
    });
    expect(asset.currentValue).toBe(0n);

    // Reconcile to Rp 150.000
    const res = await executeCreateBalanceAdjustment(testDb, {
      userId: userA,
      assetId: asset.id,
      amount: 150_000n,
      description: "Kas fisik dompet",
      idempotencyKey: randomUUID(),
    });

    expect(res.valueBefore).toBe(0n);
    expect(res.valueAfter).toBe(150_000n);
    expect(res.delta).toBe(150_000n);

    // Check updated balance
    const updatedAsset = await getAssetById(testDb, userA, asset.id);
    expect(updatedAsset?.currentValue).toBe(150_000n);

    // List adjustments by user
    const adjustments = await listAdjustmentsByUser(testDb, userA, 10);
    const targetAdj = adjustments.find((adj) => adj.id === res.adjustmentId);
    expect(targetAdj).toBeDefined();
    expect(targetAdj?.type).toBe("BALANCE_ADJUSTMENT");
    expect(targetAdj?.delta).toBe(150_000n);
    expect(targetAdj?.reason).toBe("Kas fisik dompet");
  });

  it("deleteAssetWithCascade removes asset, associated records, and allows reusing name", async () => {
    const asset = await createAsset(testDb, {
      userId: userA,
      name: "Tabungan BCA Lama",
      type: "BANK",
    });

    // Adjust balance
    await executeCreateBalanceAdjustment(testDb, {
      userId: userA,
      assetId: asset.id,
      amount: 500_000n,
      idempotencyKey: randomUUID(),
    });

    // UserB cannot delete UserA's asset
    const unauthorizedDelete = await deleteAssetWithCascade(testDb, userB, asset.id);
    expect(unauthorizedDelete).toBe(false);

    // UserA deletes own asset
    const deleted = await deleteAssetWithCascade(testDb, userA, asset.id);
    expect(deleted).toBe(true);

    // Verify asset is gone
    const verified = await getAssetById(testDb, userA, asset.id);
    expect(verified).toBeNull();

    // Re-creating an asset with the exact same name should now succeed (no unique collision)
    const reCreated = await createAsset(testDb, {
      userId: userA,
      name: "Tabungan BCA Lama",
      type: "BANK",
    });
    expect(reCreated).toBeDefined();
    expect(reCreated.id).not.toBe(asset.id);
    expect(reCreated.name).toBe("Tabungan BCA Lama");
  });
});
