import { and, eq } from "drizzle-orm";
import { idempotencyKeys } from "../db/schema/idempotency-keys";
import type { Executor } from "./types";

// Repository `idempotency_keys` (ADR-002 §2.5).
// Klaim terjadi dalam transaksi yang sama dengan mutasi: baris idempotency
// hanya ada jika mutasi commit. Duplikat konkuren menunggu unique index,
// lalu menerima result tersimpan. Key sama + hash beda → ditolak.

type IdempotencyRow = typeof idempotencyKeys.$inferSelect;

export type IdempotencyClaim =
  | { readonly status: "claimed" }
  | { readonly status: "replay"; readonly row: IdempotencyRow }
  | { readonly status: "conflict"; readonly row: IdempotencyRow };

export async function claimIdempotency(
  tx: Executor,
  input: {
    userId: string;
    key: string;
    commandType: string;
    requestHash: string;
  },
): Promise<IdempotencyClaim> {
  const inserted = await tx
    .insert(idempotencyKeys)
    .values(input)
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return { status: "claimed" };

  // Baris sudah ada — kunci agar serial dengan writer aslinya.
  const [existing] = await tx
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.userId, input.userId),
        eq(idempotencyKeys.key, input.key),
      ),
    )
    .for("update");
  if (!existing) {
    throw new Error("Idempotency row vanished between insert and select");
  }
  return existing.requestHash === input.requestHash
    ? { status: "replay", row: existing }
    : { status: "conflict", row: existing };
}

export async function saveIdempotencyResult(
  tx: Executor,
  userId: string,
  key: string,
  result: unknown,
): Promise<void> {
  await tx
    .update(idempotencyKeys)
    .set({ result: result as never })
    .where(
      and(eq(idempotencyKeys.userId, userId), eq(idempotencyKeys.key, key)),
    );
}
