import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

// Vitest tidak membaca .env.local sendiri.
loadEnv({ path: ".env.local" });

// DATABASE_URL_TEST diturunkan dari DATABASE_URL bila tidak diset eksplisit.
if (!process.env.DATABASE_URL_TEST && process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = "/db_fintry_test";
  process.env.DATABASE_URL_TEST = url.toString();
}

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src");

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    globalSetup: ["./scripts/prepare-test-db.mjs"],
  },
  resolve: {
    alias: { "@": srcDir },
  },
});
