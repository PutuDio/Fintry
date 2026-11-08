# Fintry Development Progress

Dokumen ini adalah memori kerja status aktif proyek Fintry untuk AI coding agent dan pengembang.

---

## Current Status: v2.2.0 (Production Ready)

- **Versi Aktif**: `v2.2.0` (Biaya Admin Akun Otomatis & Transparan)
- **Tema Visual**: Ledger Navy (`#0B1F3B`, `#123A63`, `#2F5D8C`, `#C9D6E5`, `#F2F5F8`, `#00E5A2`, `#FF4B72`, `#38BDF8`)
- **Fokus Utama**: Pemeliharaan stabilitas sistem, biaya admin transparan, NLP parser intelligence, dan integritas pencatatan transaksi.
- **Tanggal Diperbarui**: 2026-11-08

---

## Status Verifikasi & Kualitas

- **Unit & Integration Tests**: 87/87 passing (`pnpm vitest run`)
  - Domain invariants: 19
  - Repositories: 13
  - Commands & mutations: 13
  - Services: 8
  - Parser NLP: 14 (+4 tes transfer pihak luar & transfer masuk)
  - Chat orchestrator: 11 (+4 tes otomatisasi biaya admin transparan)
  - Better Auth adapter: 3
  - Account deletion cascade: 3
  - Analytics & summary: 3
- **TypeScript**: 0 error (strict mode aktif)
- **Production Build**: Lolos bersih (`pnpm build` via Next.js 16 Turbopack)
- **Database Migrations**: 8 migrasi aktif (`0000_init_auth.sql` s/d `0007_skinny_namor.sql`) tersinkronisasi di PostgreSQL/Neon.

---

## Kondisi Komponen Inti

| Komponen | Status | Catatan Teknis |
| :--- | :--- | :--- |
| **Autentikasi** | ✅ Aktif & Stabil | Email/password + Google OAuth (Better Auth). Reset password via Resend. |
| **Hapus Akun Pengguna** | ✅ Aktif | Zona Bahaya di `/dashboard/profile` memicu cascade deletion atomik seluruh baris data pengguna. |
| **Manajemen Aset** | ✅ Aktif (v2.2.0) | Tambah & edit akun mendukung konfigurasi `adminFee` (biaya admin per transaksi). Koreksi saldo dan deactive tetap terjaga. |
| **Pencatatan Transaksi** | ✅ Aktif (v2.2.0) | Opsi B: pemotongan biaya admin otomatis sebagai baris terpisah (`EXPENSE` dengan kategori "Biaya Admin") saat pengeluaran atau transfer keluar dari akun ber-adminFee. Proteksi anti-rekursi jika deskripsi eksplisit biaya admin. |
| **Layout Dashboard** | ✅ Aktif & Responsif | 2 kolom desktop (Akun & Saldo + Transaksi Terakhir). Mobile view menggunakan drawer hamburger tanpa overflow horizontal dan font input 16px pencegah auto-zoom. |
| **Sidebar Navigation** | ✅ Aktif | Sticky viewport-height (`md:sticky md:top-0 md:h-screen`). |

---

## Variabel Lingkungan Produksi (Vercel)

- `DATABASE_URL`: Terhubung ke Neon PostgreSQL (connection pooler with SSL).
- `BETTER_AUTH_SECRET`: Kunci rahasia 32-byte hex.
- `BETTER_AUTH_URL`: Domain produksi Fintry di Vercel.
- `RESEND_API_KEY`: API key Resend untuk verifikasi & reset password.
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Kredensial OAuth dari Google Cloud Console dengan callback URL terdaftar.

---

## Prosedur Pembaruan Fitur Baru

Untuk setiap penambahan fitur atau perombakan sistem:
1. Tulis spesifikasi dan rencana kerja di `docs/update.md`.
2. Dapatkan konfirmasi sebelum eksekusi.
3. Setelah implementasi dan verifikasi selesai, arsipkan ke `docs/fintry-vX.X.X.md` jika merupakan rilis milestone/perombakan besar.
