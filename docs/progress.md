# Fintry Development Progress

Dokumen ini adalah memori kerja status aktif proyek Fintry untuk AI coding agent dan pengembang.

---

## Current Status: v2.1.0 (Production Ready)

- **Versi Aktif**: `v2.1.0` (Klasifikasi Cerdas Transfer Pihak Ketiga NLP & Anti Auto-Zoom Mobile)
- **Tema Visual**: Ledger Navy (`#0B1F3B`, `#123A63`, `#2F5D8C`, `#C9D6E5`, `#F2F5F8`, `#00E5A2`, `#FF4B72`, `#38BDF8`)
- **Fokus Utama**: Pemeliharaan stabilitas sistem, NLP parser intelligence, dan integritas pencatatan transaksi.
- **Tanggal Diperbarui**: 2026-11-06

---

## Status Verifikasi & Kualitas

- **Unit & Integration Tests**: 83/83 passing (`pnpm vitest run`)
  - Domain invariants: 19
  - Repositories: 13
  - Commands & mutations: 13
  - Services: 8
  - Parser NLP: 14 (+4 tes transfer pihak luar & transfer masuk)
  - Chat orchestrator: 7
  - Better Auth adapter: 3
  - Account deletion cascade: 3
  - Analytics & summary: 3
- **TypeScript**: 0 error (strict mode aktif)
- **Production Build**: Lolos bersih (`pnpm build` via Next.js 16 Turbopack)
- **Database Migrations**: 7 migrasi aktif (`0000_init_auth.sql` s/d `0006_yielding_lady_bullseye.sql`) tersinkronisasi di PostgreSQL/Neon.

---

## Kondisi Komponen Inti

| Komponen | Status | Catatan Teknis |
| :--- | :--- | :--- |
| **Autentikasi** | ✅ Aktif & Stabil | Email/password + Google OAuth (Better Auth). Reset password via Resend. |
| **Hapus Akun Pengguna** | ✅ Aktif | Zona Bahaya di `/dashboard/profile` memicu cascade deletion atomik seluruh baris data pengguna. |
| **Manajemen Aset** | ✅ Aktif | Edit nama & koreksi saldo tersedia di `/dashboard/accounts`. Penghapusan akun individual via UI dilarang demi integritas audit trail. |
| **Pencatatan Transaksi** | ✅ Aktif (v2.1.0) | NLP chat input mendukung transfer internal antar-aset (`CREATE_TRANSFER`), transfer keluar pihak luar/keluarga (`CREATE_EXPENSE`), dan transfer masuk pihak luar (`CREATE_INCOME`). |
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
