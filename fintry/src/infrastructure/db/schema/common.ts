import { timestamp } from "drizzle-orm/pg-core";

// Kolom waktu standar proyek: timestamptz dengan default now().
// Definisi kolom `updated_at` memakai $onUpdate di masing-masing tabel.
export const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true });
