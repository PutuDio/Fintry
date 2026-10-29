# Fintry v1.2 Release Notes: Ledger Navy & Dashboard Refinement

Tanggal Rilis: **2026-10-29**  
Status: **Production Ready (Verified)**  
Tests: **79 vitest unit/integration tests passing (100%)**

---

## 1. Ringkasan Pembaruan (Executive Summary)

Pembaruan **Fintry v1.2** memperkenalkan perombakan visual dan fungsional menyeluruh pada antarmuka pengguna:
1. **Sistem Warna Ledger Navy**: Migrasi total ke palet bernuansa command-center finansial profesional dengan kontras tinggi.
2. **Navigasi Sidebar Sticky Viewport**: Sidebar terpasang tetap (`md:sticky md:top-0 md:h-screen`), memastikan menu profil dan akun di bagian bawah selalu terlihat tanpa perlu scrolling layar.
3. **Penyederhanaan Menu Navigasi**: Menu "Analytics" dieliminasi dari sidebar agar fokus navigasi tertuju pada Dashboard, Manajemen Akun, Riwayat Transaksi, dan Profil.
4. **Layout Dashboard 2 Kolom Berdampingan**: Menghapus widget "Target Tabungan", memposisikan "Akun & Saldo" (kiri 6-kolom) dan "Transaksi Terakhir" (kanan 6-kolom) berdampingan langsung di bawah kolom chat asisten.
5. **Fitur Hapus Akun & Reset Mutasi (Cascade Deletion)**: Pengguna dapat menghapus akun aset beserta seluruh riwayat mutasi terkait secara atomik, membebaskan unique index `(user_id, lower(name))` sehingga nama akun dapat langsung didaftarkan kembali.
6. **Redesain Landing Page Fintry v1.2**: Menampilkan mockup laptop presisi tinggi yang memvisualisasikan dashboard Ledger Navy secara realistis.

---

## 2. Rincian Palet Warna Ledger Navy

Palet warna Ledger Navy diintegrasikan ke dalam CSS Variables (`globals.css`) dan utilitas Tailwind:

| Token / Warna | Kode Hex | Peruntukan / Penggunaan |
| :--- | :--- | :--- |
| **Deep Navy** | `#0B1F3B` | Latar belakang canvas, viewport, input chat |
| **Slate Navy** | `#123A63` | Permukaan kartu, panel, tabel, navbar internal |
| **Accent Navy / Slate Blue** | `#2F5D8C` | Border kartu, garis pembatas, divider |
| **Muted Slate Blue** | `#C9D6E5` | Teks sekunder, label formulir, keterangan status |
| **Off-White / Ice Mist** | `#F2F5F8` | Teks judul utama, nominal saldo, angka metrik |
| **Mint Emerald Accent** | `#00E5A2` | Tombol primer, pemasukan, surplus kas, indikator aktif |
| **Crimson Coral Accent** | `#FF4B72` | Pengeluaran, tombol hapus/batal, defisit kas |
| **Sky Blue Accent** | `#38BDF8` | Transfer antar rekening, ikon bank, indikator arus kas |

---

## 3. Perubahan Antarmuka & Tata Letak

### 3.1 Sidebar Sticky Viewport
- **Sebelum**: Sidebar mengikuti alur scroll dokumen, menyebabkan menu akun dan tombol logout tersembunyi di layar dengan resolusi vertikal tertentu.
- **Sesudah**: Menggunakan `<aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#2F5D8C] bg-[#0B1F3B] md:sticky md:top-0 md:h-screen ...">`. Seluruh menu navigasi, kartu profil pengguna, dan tombol aksi terpasang rapi dan selalu berada dalam viewport.

### 3.2 Layout Dashboard Berdampingan
- Widget "Target Tabungan" dihilangkan untuk mengeliminasi distraksi visual.
- Grid responsif `grid gap-6 lg:grid-cols-12`:
  - **Kolom Kiri (6 cols)**: Widget Akun & Saldo (`AssetList`) dengan saldo real-time, status likuiditas, dan navigasi cepat ke detail rekening.
  - **Kolom Kanan (6 cols)**: Widget Transaksi Terakhir (`RecentTransactionsWidget`) menampilkan 5 mutasi paling mutakhir beserta badge tipe dan nominal.

---

## 4. Fitur Hapus Akun & Cascading Reset

Sebelum v1.2, penghapusan akun dibatasi karena foreign key `ON DELETE RESTRICT` pada tabel transaksi dan penyesuaian aset, serta adanya constraint `assets_user_id_lower_name_uidx`. Jika pengguna salah memasukkan akun saat awal penggunaan, nama akun tersebut tidak dapat digunakan ulang.

Pada v1.2, ditambahkan kapabilitas **Hapus Akun Terpilih**:
- **Repository**: `deleteAssetWithCascade(tx, userId, assetId)`
  1. Mengunci baris aset target dengan validasi kepemilikan `userId`.
  2. Menghapus transaksi yang terhubung sebagai `source_asset_id` atau `destination_asset_id`.
  3. Menghapus rekonsiliasi saldo pada `asset_adjustments`.
  4. Menghapus baris akun dari tabel `assets`.
  5. Menuliskan catatan audit log `ASSET_DEACTIVATED` dengan metadata `deletedCascade: true`.
- **Server Action**: `deleteAssetAction(assetId)` di `src/app/dashboard/actions.ts` dengan revalidasi path `/dashboard` dan `/dashboard/accounts`.
- **UI Dialog**: Tombol icon tong sampah (`Trash2`) dengan modal konfirmasi peringatan konsekuensi penghapusan sebelum eksekusi.

---

## 5. Landing Page & Mockup Laptop

- Path: `fintry/src/app/page.tsx`
- Versi badge: `Fintry v1.2 • Ledger Navy Edition`
- Mockup laptop realistis:
  - Bezel hitam alumunium dengan lensa webcam dan sensor LED.
  - Tampilan layar dashboard Fintry v1.2 interaktif mencakup ringkasan metrik, input chat AI, serta susunan 2 kolom Akun & Saldo dan Transaksi Terakhir.
  - Deck keyboard laptop dengan notch bukaan jari dan bayangan meja ambient.
- Highlight keamanan: Isolasi data per-user, deterministic calculation engine, dan audit trail append-only.

---

## 6. Verifikasi Kualitas & Tes

Semua pengujian lolos 100%:
- **Vitest Unit & Integration**: 79 test cases lolos (termasuk verifikasi isolasi multi-user dan cascade deletion pada `accounts-management.test.ts`).
- **Production Build (Next.js Turbopack)**: Sukses tanpa error kompilasi dan tanpa peringatan tipe TypeScript.
