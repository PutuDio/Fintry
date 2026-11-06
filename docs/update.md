# Fintry Update Staging Document

Dokumen ini adalah template sekaligus lembar kerja perencanaan aktif untuk setiap pembaruan, penambahan fitur, atau perombakan sistem Fintry **sebelum dieksekusi**.

---

## Metadata Rencana Pembaruan

- **Target Versi**: `vX.X.X` (misal: `v2.2.0` untuk fitur baru, `v2.1.1` untuk patch/bugfix, `v3.0.0` untuk perombakan besar)
- **Status**: `[DRAFT / APPROVED / IN EXECUTION / COMPLETED]`
- **Tanggal Dibuat**: YYYY-MM-DD
- **Target Penyelesaian**: YYYY-MM-DD

---

## 1. Latar Belakang & Tujuan
*Jelaskan masalah apa yang ingin diselesaikan atau kebutuhan apa yang ingin dipenuhi.*

- **Problem Statement**:
- **Expected Outcome**:
- **User Impact**:

---

## 2. Batasan & Aturan Keuangan
*Pastikan tidak melanggar `docs/domain_rules.md` atau memperluas scope tanpa persetujuan.*

- [ ] Apakah mempengaruhi mutasi finansial (Income / Expense / Transfer / Adjustment)?
- [ ] Apakah membutuhkan migrasi basis data (Drizzle schema)?
- [ ] Apakah perhitungan tetap deterministik tanpa halusinasi matematis AI?

---

## 3. Rencana Perubahan Teknis

### A. Modul & File yang Terdampak
- `src/...`
- `drizzle/...` (jika ada migrasi)
- `docs/...`

### B. Antarmuka / UI / UX (Jika ada)
- Deskripsi visual & komponen terdampak.

### C. Alur Kerja / Business Logic
1. Langkah 1
2. Langkah 2
3. Langkah 3

---

## 4. Checklist Eksekusi & Kriteria Keberhasilan (Acceptance Criteria)

- [ ] Implementasi kode sesuai spesifikasi
- [ ] Unit & integration tests dibuat / diperbarui (`pnpm vitest run`)
- [ ] Build produksi bersih tanpa error (`pnpm build`)
- [ ] Verifikasi manual tampilan / fungsionalitas

---

## 5. Prosedur Pembekuan (Lifecycle Release)

Setelah rencana dalam dokumen ini selesai diimplementasikan dan diverifikasi:
1. Pindahkan catatan rilis ke file permanen `docs/fintry-vX.X.X.md` (untuk rilis milestone/perombakan besar).
2. Perbarui versi di `fintry/package.json`, `README.md`, dan `docs/progress.md`.
3. Reset kembali file `docs/update.md` ini ke format template kosong untuk siklus pembaruan berikutnya.
