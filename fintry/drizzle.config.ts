import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Drizzle Kit tidak membaca .env.local sendiri, jadi dimuat di sini.
config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL belum diatur di .env.local");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/db/schema/*.ts",
  out: "./drizzle",
  dbCredentials: { url },
});