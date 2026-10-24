// Persiapan database scratch untuk integration test: db_fintry_test.
// Dipanggil sebagai vitest globalSetup; aman dijalankan ulang (idempoten):
// CREATE DATABASE bila belum ada, lalu terapkan seluruh migration drizzle/.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { config } = require("dotenv");
config({ path: path.join(rootDir, ".env.local") });

function deriveTestUrl() {
  if (process.env.DATABASE_URL_TEST) return process.env.DATABASE_URL_TEST;
  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error("DATABASE_URL tidak ditemukan di .env.local");
  }
  const url = new URL(base);
  url.pathname = "/db_fintry_test";
  return url.toString();
}

export default async function setup() {
  const { Pool } = require("pg");
  const { drizzle } = require("drizzle-orm/node-postgres");
  const { migrate } = require("drizzle-orm/node-postgres/migrator");

  const testUrl = deriveTestUrl();
  process.env.DATABASE_URL_TEST = testUrl;

  // 1. Buat database test bila belum ada (koneksi ke maintenance db `postgres`).
  const admin = new Pool({
    connectionString: new URL(testUrl.replace(/\/[^/?]+(?=\?|$)/, "/postgres"))
      .toString(),
    max: 1,
  });
  try {
    const dbName = new URL(testUrl).pathname.slice(1);
    const { rows } = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName],
    );
    if (rows.length === 0) {
      await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      console.log(`[test-db] database ${dbName} dibuat`);
    }
  } finally {
    await admin.end();
  }

  // 2. Terapkan migration (idempoten; yang sudah ada dilewati).
  const pool = new Pool({ connectionString: testUrl, max: 1 });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: path.join(rootDir, "drizzle"),
    });
  } finally {
    await pool.end();
  }
  console.log("[test-db] migration db_fintry_test siap");
}
