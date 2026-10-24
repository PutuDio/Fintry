import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Satu Pool untuk seluruh aplikasi (tech_stack.md bagian 7).
// Alamat database dibaca dari environment, tidak ditulis di kode.
function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum diatur. Tambahkan ke .env.local.");
  }
  const pool = new Pool({ connectionString });
  // Tanpa handler ini, error pada koneksi yang sedang idle bisa menghentikan proses.
  pool.on("error", (error) => {
    console.error("Kesalahan tak terduga pada pool PostgreSQL:", error.message);
  });
  return pool;
}

// Saat development, Next.js memuat ulang modul berkali-kali.
// Pool disimpan di globalThis agar tidak dibuat berulang.
const globalForDb = globalThis as unknown as { fintryPool?: Pool };

export const pool = globalForDb.fintryPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  globalForDb.fintryPool = pool;
}

export const db = drizzle(pool, { schema });