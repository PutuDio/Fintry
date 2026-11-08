# Fintry v2.2.0 — AI Personal Finance Platform

> **"Satu Chat. Kendali Penuh."**  
> Kelola keuangan pribadi semudah mengirim pesan. Didukung oleh AI NLP berbatas tegas dan Financial Engine deterministik tanpa halusinasi matematis.

[![Version](https://img.shields.io/badge/version-2.2.0-00E5A2.svg)](#)
[![Theme](https://img.shields.io/badge/theme-Ledger_Navy-123A63.svg)](#)
[![Tests](https://img.shields.io/badge/tests-87%20passed-00E5A2.svg)](#)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-F2F5F8.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-38BDF8.svg)](#)

---

## 💡 Apa Itu Fintry?

Fintry adalah aplikasi pencatatan keuangan pribadi dan *multi-asset tracking* berbasis *natural-language chat*. Fintry menyatukan akun bank, e-wallet, dan instrumen investasi ke dalam satu command-center dashboard untuk memberikan *helicopter view* terhadap kekayaan bersih (*net worth*).

### Alur Interaksi Inti:
```
User Input → Chat AI Parser → Structured Intent → Application Validator → Deterministic Financial Engine → Database → Dashboard + Feedback
```

---

## 🌟 Fitur Utama (v2.2.0)

- **Tema Ledger Navy**: Antarmuka modern berstandar command-center finansial (`#0B1F3B`, `#123A63`, `#2F5D8C`, `#C9D6E5`, `#F2F5F8`).
- **Biaya Admin Akun Otomatis & Transparan (v2.2.0)**: Pengaturan biaya admin per akun bank/e-wallet dengan pemotongan otomatis sebagai baris pengeluaran (`EXPENSE`) terpisah saat transaksi keluar atau transfer untuk audit riwayat dan laporan kategori yang jelas.
- **Klasifikasi Transfer Pihak Ketiga Cerdas (v2.1.0)**: Parser NLP otomatis membedakan transfer internal antar-aset sendiri (`TRANSFER`), transfer keluar ke keluarga/pihak lain (`EXPENSE`), dan transfer masuk dari pihak luar (`INCOME`).
- **Mobile Responsive & Anti Auto-Zoom (v2.0.1 - v2.1.0)**: Tata letak mobile responsif bersih dengan drawer menu hamburger dan input anti auto-zoom browser mobile.
- **Sidebar Sticky Viewport**: Sidebar terpasang rapi (`md:sticky md:top-0 md:h-screen`), menjaga profil dan menu akun di bagian bawah tetap terlihat tanpa perlu scroll.
- **Layout Dashboard 2 Kolom**: Menampilkan widget **Akun & Saldo** (kiri) dan **Transaksi Terakhir** (kanan) berdampingan langsung di bawah asisten chat.
- **Natural Language Transaction Entry**: Input pemasukan, pengeluaran, transfer internal, dan transfer pihak luar via percakapan natural (misal: *"beli kopi 35rb bca"*, *"top up 50rb dari mandiri ke dana"*, *"tf 100rb ke mama pake mandiri"*).
- **Hapus Akun Pengguna & Cascading Reset**: Kemampuan menghapus akun pengguna beserta seluruh riwayat secara atomik melalui Zona Bahaya dengan konfirmasi modal.
- **Google OAuth Social Login**: Masuk instan dengan akun Google terverifikasi melalui Better Auth.
- **Rekonsiliasi Saldo & Mutasi**: Fitur penyesuaian saldo riil dengan riwayat audit log append-only.
- **Landing Page Modern**: Halaman depan interaktif dilengkapi mockup laptop realistis yang menampilkan dashboard Fintry.

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

## 🎯 Batasan Ruang Lingkup Produk (Product Boundaries)

### Cakupan MVP:
- **Autentikasi**: Registrasi username/email, login kredensial & Google OAuth, proteksi sesi, isolasi data per-user, reset password via email.
- **Manajemen Aset**: Akun Bank, E-Wallet, Cash, Investasi (pencatatan saldo awal, koreksi saldo rekonsiliasi, edit nama akun).
- **Transaksi**: Pemasukan (Income), Pengeluaran (Expense), Perpindahan dana (Transfer/Top-up), riwayat transaksi, edit transaksi, dan void pembatalan transaksi.
- **AI Input Parser**: Ekstraksi nominal mata uang Rupiah, deteksi jenis transaksi, resolusi entitas akun, deteksi ambiguitas.
- **Financial Engine**: Kalkulasi saldo dan net worth strictly deterministik, pencegahan saldo negatif, validasi integritas data.

### Di Luar Ruang Lingkup (Out of Scope):
Fintry adalah alat pencatatan dan pemantauan status keuangan, **bukan penyedia transaksi uang riil**. Fitur-fitur berikut secara tegas berada di luar lingkup:
- Sinkronisasi otomatis API perbankan langsung (Open Banking / Screen Scraping)
- Payment gateway atau eksekusi pembayaran uang riil
- Eksekusi otomatis transaksi saham / crypto broker
- Nasihat finansial otomatis (Financial Advisory / Robo-advisory)
- Credit scoring atau manajemen pinjaman (Loan Management)
- Sistem akuntansi ERP perusahaan penuh
- Penghapusan aset finansial individual via UI (hanya diperbolehkan penyesuaian saldo 0 atau hapus akun pengguna penuh)

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

- `docs/domain_rules.md`: Aturan domain finansial deterministik (Hukum Uang & Matematika Akuntansi)
- `docs/PRD.md`: Spesifikasi produk dan functional requirements
- `docs/tech_stack.md`: Dokumen teknis dan konvensi arsitektur
- `docs/fintry-v1.0.0.md`: Dokumentasi sistem rilis awal (v1.0.0)
- `docs/fintry-v2.0.0.md`: Catatan rilis besar v2.0.0 (Ledger Navy, Cascade Account Reset, Google OAuth)
- `docs/update.md`: Dokumen staging & template perencanaan pembaruan fitur baru
- `docs/progress.md`: Status aktif implementasi dan memori kerja teknis
- `docs/architecture_decisions/`: Rekam keputusan arsitektur (ADR-001, ADR-002, ADR-003)
