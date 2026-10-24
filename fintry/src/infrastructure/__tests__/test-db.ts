import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema";

// Koneksi khusus integration test ke DATABASE_URL_TEST (db_fintry_test).
// Tidak memakai client.ts global agar test tidak pernah menyentuh db_fintry.

if (!process.env.DATABASE_URL_TEST) {
  throw new Error("DATABASE_URL_TEST belum diset (globalSetup gagal?)");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_TEST,
  max: 8, // test konkurensi membutuhkan minimal 2 koneksi paralel
});

export const testDb = drizzle(pool, { schema });

export async function closeTestDb() {
  await pool.end();
}

/** Seed user auth langsung ke tabel users (tanpa Better Auth);
 *  id dan email unik per pemanggilan, aman untuk run berulang. */
export async function seedUser(label: string): Promise<string> {
  const id = randomUUID();
  await testDb.insert(schema.users).values({
    id,
    name: `Test ${label}`,
    email: `${label}.${id.slice(0, 8)}@test.local`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}
