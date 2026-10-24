import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../db/schema";

// Tipe database Fintry.
export type Db = NodePgDatabase<typeof schema>;

// Tipe executor di dalam satu database transaction interaktif.
// Perintah finansial selalu beroperasi dengan executor bertipe ini
// (ADR-002 §2.4). Db biasa juga assignable karena hanya punya satu
// member tambahan (`transaction`).
export type Executor = Omit<Db, "transaction">;
