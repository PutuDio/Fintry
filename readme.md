# Fintry v1.2 — AI Personal Finance Platform

> **"Satu Chat. Kendali Penuh."**  
> Kelola keuangan pribadi semudah mengirim pesan. Didukung oleh AI NLP berbatas tegas dan Financial Engine deterministik tanpa halusinasi matematis.

[![Version](https://img.shields.io/badge/version-1.2.0-00E5A2.svg)](#)
[![Theme](https://img.shields.io/badge/theme-Ledger_Navy-123A63.svg)](#)
[![Tests](https://img.shields.io/badge/tests-79%20passed-00E5A2.svg)](#)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-F2F5F8.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-38BDF8.svg)](#)

---

## 🌟 Fitur Utama v1.2

- **Tema Ledger Navy**: Antarmuka modern berstandar command-center finansial (`#0B1F3B`, `#123A63`, `#2F5D8C`, `#C9D6E5`, `#F2F5F8`).
- **Sidebar Sticky Viewport**: Sidebar terpasang rapi (`md:sticky md:top-0 md:h-screen`), menjaga profil dan menu akun di bagian bawah tetap terlihat tanpa perlu scroll.
- **Layout Dashboard 2 Kolom**: Menampilkan widget **Akun & Saldo** (kiri) dan **Transaksi Terakhir** (kanan) berdampingan langsung di bawah asisten chat.
- **Natural Language Transaction Entry**: Input pemasukan, pengeluaran, dan transfer rekening via percakapan natural (misal: *"beli kopi 35rb bca"*).
- **Hapus Akun & Cascading Reset**: Kemampuan menghapus akun aset beserta mutasinya secara aman dan atomik, membebaskan nama akun untuk digunakan kembali tanpa tabrakan unique constraint.
- **Rekonsiliasi Saldo & Mutasi**: Fitur penyesuaian saldo riil dengan riwayat audit log append-only.
- **Landing Page Modern**: Halaman depan dilengkapi mockup laptop realistis yang menampilkan dashboard Fintry v1.2.

---

## 🎨 Palet Warna Ledger Navy

| Token | Hex | Penggunaan |
| :--- | :--- | :--- |
| **Deep Navy** | `#0B1F3B` | Latar belakang canvas, input field, background utama |
| **Slate Navy** | `#123A63` | Permukaan kartu, panel, table header |
| **Accent Navy** | `#2F5D8C` | Border kartu, garis pembatas (divider) |
| **Muted Slate** | `#C9D6E5` | Label sekunder, deskripsi bantuan, ikon pasif |
| **Ice Mist** | `#F2F5F8` | Teks utama, judul, nominal saldo |
| **Emerald Accent** | `#00E5A2` | Pemasukan, tombol aksi primer, status aktif |
| **Crimson Coral** | `#FF4B72` | Pengeluaran, tombol hapus/batal |
| **Sky Blue** | `#38BDF8` | Transfer antar rekening, badge bank, arus kas |

---

## 🏛️ Arsitektur Finansial & Keamanan

Fintry menerapkan batasan ketat (**Financial Safety Boundary**):
```
User Input → Chat Parser → Structured Intent → Application Validator → Deterministic Financial Engine → Database
```

- **Tanpa Halusinasi Matematis**: AI LLM hanya mengekstrak entitas (nominal, kategori, tanggal, akun asal/tujuan). Seluruh kalkulasi saldo dan penambahan/pengurangan dilakukan oleh domain logic murni.
- **Presisi Uang Integer**: Seluruh nilai moneter disimpan dalam satuan terkecil Rupiah menggunakan tipe data `BIGINT` untuk mencegah kesalahan pembulatan desimal.
- **Transaksi Atomik**: Mutasi mutlak berjalan dalam transaksi database PostgreSQL dengan row locking (`FOR UPDATE`) untuk mencegah race condition / double-spending.
- **Isolasi Pengguna**: Setiap entitas dan riwayat terikat ketat dengan composite foreign key terhadap `userId`.

---

## 🚀 Memulai Proyek

### Prasyarat
- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

### Instalasi & Setup

```bash
# 1. Masuk ke direktori aplikasi
cd fintry

# 2. Pasang dependensi
pnpm install

# 3. Konfigurasi environment (.env.local)
cp .env.example .env.local

# 4. Jalankan migrasi basis data
pnpm db:migrate

# 5. Jalankan unit & integration tests
pnpm vitest run

# 6. Jalankan development server
pnpm dev
```

Buka `http://localhost:3000` di peramban Anda.

---

## 🧪 Status Pengujian

- **Unit & Integration Tests**: 79 test cases lolos (Vitest + scratch integration DB).
- **TypeScript**: 0 error (strict type checking aktif).
- **Production Build**: Lolos bersih (`pnpm build`).

---

## 📄 Dokumentasi Terkait

- `docs/update-v1.2.md`: Catatan rilis v1.2
- `docs/domain_rules.md`: Aturan domain finansial deterministik
- `docs/PRD.md`: Spesifikasi produk dan functional requirements
- `docs/tech_stack.md`: Dokumen teknis dan konvensi arsitektur
- `docs/progress.md`: Catatan kemajuan status pengembangan
