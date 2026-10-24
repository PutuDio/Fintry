// Persiapan database E2E terpisah dari database utama: db_fintry_e2e.
// Dipanggil oleh scripts/e2e-server.mjs sebelum `next dev` dijalankan,
// sehingga tes E2E tidak pernah menyentuh db_fintry. Idempoten:
// CREATE DATABASE bila belum ada, lalu terapkan seluruh migration drizzle/.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { config } = require("dotenv");
config({ path: path.join(rootDir, ".env.local") });

export function deriveE2eUrl() {
  if (process.env.DATABASE_URL_E2E) return process.env.DATABASE_URL_E2E;
  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error("DATABASE_URL tidak ditemukan di .env.local");
  }
  const url = new URL(base);
  url.pathname = "/db_fintry_e2e";
  return url.toString();
}

export async function prepareE2eDatabase() {
  const { Pool } = require("pg");
  const { drizzle } = require("drizzle-orm/node-postgres");
  const { migrate } = require("drizzle-orm/node-postgres/migrator");

  const e2eUrl = deriveE2eUrl();

  // 1. Buat database E2E bila belum ada (koneksi ke maintenance db `postgres`).
  const admin = new Pool({
    connectionString: new URL(e2eUrl.replace(/\/[^/?]+(?=\?|$)/, "/postgres")).toString(),
    max: 1,
  });
  try {
    const dbName = new URL(e2eUrl).pathname.slice(1);
    const { rows } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      dbName,
    ]);
    if (rows.length === 0) {
      await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      console.log(`[e2e-db] database ${dbName} dibuat`);
    }
  } finally {
    await admin.end();
  }

  // 2. Terapkan migration (idempoten; yang sudah ada dilewati).
  const pool = new Pool({ connectionString: e2eUrl, max: 1 });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: path.join(rootDir, "drizzle"),
    });
  } finally {
    await pool.end();
  }
  console.log("[e2e-db] migration db_fintry_e2e siap");
}
