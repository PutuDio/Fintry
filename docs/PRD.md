# PRD: Fintry

> Revisi 2026-10-08: keputusan final untuk edit/void transaksi, saldo
> negatif, deaktivasi asset, kategori, pending intent, autentikasi, dan
> penghapusan akun dicerminkan di dokumen ini. Aturan domain rinci ada
> di `domain_rules.md`; keputusan arsitektur ada di `ADR-002` dan
> `ADR-003`.

## 1. Product Overview

Fintry adalah pusat kendali kekayaan pribadi berbasis natural-language
chat. Pengguna mencatat pemasukan, pengeluaran, perpindahan dana
antar-aset, dan penyesuaian nilai investasi melalui satu antarmuka chat
tanpa form bertahap.

Konsep utama Fintry adalah **"Satu Chat. Kendali Penuh."** Chat menjadi
pintu masuk data, sedangkan dashboard menjadi helicopter view untuk
melihat total net worth dan distribusi aset.

README project menetapkan tiga nilai utama: zero-friction entry,
kategori yang fleksibel, dan helicopter view atas seluruh aset.

## 2. Problem Statement

Mahasiswa, freelancer, dan masyarakat yang melek teknologi sering
memiliki uang yang tersebar di beberapa rekening bank, e-wallet, dan
platform investasi. Aplikasi pencatatan keuangan tradisional dapat
menimbulkan friction karena pengguna harus mengisi banyak field sebelum
transaksi tersimpan.

Fintry mengurangi friction tersebut dengan menerima input dalam bahasa
natural, mengekstrak informasi transaksi, memvalidasinya, lalu
memperbarui financial state secara otomatis.

## 3. Product Goals

### Primary Goals

1.  Memungkinkan pencatatan transaksi melalui natural-language chat.
2.  Mengelola beberapa aset dalam satu financial state.
3.  Menghitung net worth berdasarkan nilai aset yang terakhir tercatat.
4.  Membedakan cashflow dengan perpindahan nilai antar-aset.
5.  Menyediakan dashboard yang memperlihatkan kondisi finansial secara
    ringkas.
6.  Memberikan feedback transaksi yang cepat, singkat, dan presisi.

### MVP Success Metrics

1.  Waktu input transaksi di bawah 5 detik dari input sampai data
    tercatat untuk transaksi yang dapat dieksekusi langsung.
2.  Target proses parser sampai pembaruan dashboard kurang dari 2 detik
    pada kondisi normal.
3.  Tingkat kegagalan parsing yang rendah dan dapat dimonitor.
4.  Pengguna dapat memahami perubahan saldo setelah transaksi dicatat.

Target pertumbuhan seperti 10.000 pengguna dan 2.000 DAU tetap merupakan
business target, bukan acceptance criteria teknis untuk setiap feature.

## 4. Core Product Principles

### 4.1 Zero-Friction Entry

Pengguna seharusnya dapat mengetik transaksi secara natural tanpa
memilih banyak dropdown.

Contoh:

`beli kopi 25rb pake BCA`

### 4.2 Chat-First

Chat adalah primary input interface untuk transaksi.

### 4.3 Deterministic Financial State

AI boleh memahami bahasa natural, tetapi perhitungan saldo, net worth,
dan perubahan financial state harus dilakukan oleh application code yang
deterministic.

### 4.4 Safe Automation

Transaksi hanya dieksekusi apabila informasi yang dibutuhkan cukup jelas
dan lolos validasi.

### 4.5 Explainable Confirmation

Setelah transaksi berhasil, sistem memberikan konfirmasi ringkas yang
menyebutkan jenis transaksi, nominal, aset terkait, dan state penting
yang berubah.

## 5. Core Domain Concepts

### 5.1 User

Pemilik seluruh data financial.

### 5.2 Asset

Tempat nilai finansial disimpan atau direpresentasikan.

MVP mendukung:

-   Bank account
-   E-wallet
-   Investment

Setiap asset minimal memiliki:

-   id
-   user_id
-   name
-   type
-   current_value
-   currency
-   is_active
-   created_at
-   updated_at

Aturan aktivasi/deaktivasi asset (hanya saat saldo 0, asset INACTIVE
tidak dapat dipakai transaksi baru, tanpa reactivation pada MVP) ada di
`domain_rules.md` §2.1. Nilai asset tidak boleh negatif
(`domain_rules.md` §15).

### 5.3 Transaction

Catatan perubahan financial state yang berasal dari aktivitas pengguna.

MVP memiliki tiga primary transaction types:

-   INCOME
-   EXPENSE
-   TRANSFER

Transaction menyimpan minimal:

-   id
-   user_id
-   type
-   amount
-   source_asset_id bila relevan
-   destination_asset_id bila relevan
-   description
-   category_id bila ada
-   transaction_date
-   created_at
-   updated_at

Tambahan (revisi 2026-10-08):

-   status (`ACTIVE` | `VOIDED`)
-   voided_at (terisi bila `VOIDED`)
-   replaces_transaction_id bila transaksi adalah pengganti hasil edit
    field finansial

### 5.4 Balance Adjustment

Perubahan recorded balance untuk menyamakan financial state Fintry
dengan saldo/nilai aktual tanpa membuat transaksi income atau expense
palsu.

Balance adjustment (termasuk opening balance dan valuation) bersifat
append-only pada MVP: tidak ada update, void, atau delete. Koreksi
dilakukan melalui adjustment baru (`domain_rules.md` §8.1).

### 5.5 Investment Valuation

Perubahan nilai aset investasi karena perubahan market value atau
penyesuaian manual.

Investment valuation bukan transaksi cashflow.

### 5.6 Category

Label pengelompokan transaksi.

Description dan category harus disimpan sebagai dua field berbeda.

Contoh:

`beli kopi susu starbucks 35rb pake BCA`

Dapat menghasilkan:

-   description: `kopi susu starbucks`
-   category: `Food & Beverage`
-   amount: `35000`
-   asset: `BCA`

Category dapat berasal dari klasifikasi otomatis dan dapat di-override
pengguna.

Kategori bersifat per-user dan dibuat otomatis (find-or-create) dari
nama yang diketik pengguna atau disarankan AI, dengan aturan
normalisasi dan validasi di `domain_rules.md` §11.1 (1–40 karakter;
huruf, angka, spasi, `&`, `-`, `/`; minimal satu huruf; tanpa fuzzy
matching). Kategori hanya untuk INCOME dan EXPENSE. Kategori yang tidak
valid tidak menggagalkan transaksi: transaksi tersimpan tanpa kategori.

Pembuatan kategori otomatis lewat chat adalah P0. Manajemen kategori
(UI, rename, merge, delete) adalah P1.

### 5.7 Net Worth

Net worth dihitung dari nilai seluruh aset aktif pada financial state
terakhir:

`Net Worth = Sum(all active asset values)`

Transfer antar-aset tidak mengubah net worth.

## 6. Transaction Types and Financial Rules

### 6.1 Income

Input:

`gaji 5jt masuk BCA`

Effect:

-   BCA bertambah Rp5.000.000
-   Net worth bertambah Rp5.000.000
-   Satu INCOME transaction dibuat

### 6.2 Expense

Input:

`beli kopi 25rb pake BCA`

Effect:

-   BCA berkurang Rp25.000
-   Net worth berkurang Rp25.000
-   Satu EXPENSE transaction dibuat

### 6.3 Transfer

Input:

`transfer 500rb dari BCA ke DANA`

Effect:

-   BCA berkurang Rp500.000
-   DANA bertambah Rp500.000
-   Net worth tidak berubah
-   Satu logical TRANSFER transaction dibuat

Transfer tidak boleh diklasifikasikan sebagai expense.

### 6.4 Investment Purchase

Input:

`beli reksadana 1jt pake BCA`

Effect:

-   BCA berkurang Rp1.000.000
-   Investment asset bertambah Rp1.000.000
-   Net worth tidak berubah
-   Dicatat sebagai TRANSFER antar-aset, bukan EXPENSE

### 6.5 Investment Valuation

Jika nilai investment asset berubah:

`Rp1.000.000 -> Rp1.150.000`

Effect:

-   Nilai investment bertambah Rp150.000
-   Net worth bertambah Rp150.000
-   Tidak membuat cash transaction
-   Disimpan sebagai valuation adjustment

### 6.6 Balance Adjustment

Jika recorded balance berbeda dengan saldo aktual:

`BCA sekarang 5,45jt`

Effect:

-   current value BCA disesuaikan
-   tidak membuat income/expense palsu
-   adjustment harus dapat dilacak

## 7. Natural Language Parser

Parser bertugas mengubah input natural language menjadi structured
intent.

Parser minimal harus dapat mengekstraksi:

-   intent/type
-   amount
-   source asset
-   destination asset
-   description
-   category suggestion
-   transaction date
-   relevant context

Contoh:

Input:

`kemarin beli kopi 20rb pake BCA`

Structured intent:

``` json
{
  "type": "EXPENSE",
  "amount": 20000,
  "sourceAsset": "BCA",
  "description": "kopi",
  "transactionDate": "<resolved-date>"
}
```

Parser harus memahami variasi nominal umum seperti:

-   20k
-   20rb
-   20 ribu
-   20.000
-   Rp20.000
-   1jt
-   1 juta

Parser juga harus menangani ekspresi tanggal natural seperti:

-   hari ini
-   kemarin
-   tadi
-   tanggal 5
-   1 Oktober

Resolusi tanggal final dilakukan oleh application layer berdasarkan
timezone aplikasi/user.

## 8. Parser Confidence and Ambiguity

Parser tidak boleh langsung mengeksekusi semua output.

Minimal terdapat tiga kondisi:

### EXECUTABLE

Informasi wajib tersedia, asset dapat diidentifikasi, dan tidak ada
ambiguity material.

→ Jalankan transaction.

### NEED_CONFIRMATION

Intent cukup jelas tetapi transaksi memiliki ambiguity atau risiko yang
memerlukan konfirmasi.

→ Tampilkan ringkasan dan minta konfirmasi.

### NEED_CLARIFICATION

Field wajib tidak tersedia atau tidak dapat ditentukan secara aman.

→ Tanyakan informasi yang hilang.

Contoh:

Input:

`beli kopi 25rb`

Jika user memiliki BCA, DANA, dan OVO:

`Pembayaran menggunakan aset apa? BCA, DANA, atau OVO?`

### Pending Intent

Hasil NEED_CONFIRMATION dan NEED_CLARIFICATION disimpan sebagai pending
intent:

-   maksimal satu pending aktif per user;
-   masa berlaku 10 menit;
-   routing jawaban, konfirmasi, pembatalan, dan intent baru ditentukan
    oleh application code secara deterministik, bukan oleh LLM;
-   intent finansial baru men-supersede pending lama (pending lama
    dibatalkan dan pengguna diberi tahu);
-   pesan yang tidak mengandung intent finansial tidak membatalkan
    pending;
-   status akhir tidak dibuka kembali.

Aturan lengkap: `tech_stack.md` §15.

## 9. Required Fields

### Income

Wajib:

-   amount
-   destination asset

Opsional:

-   description
-   category
-   date

### Expense

Wajib:

-   amount
-   source asset

Opsional:

-   description
-   category
-   date

### Transfer

Wajib:

-   amount
-   source asset
-   destination asset

Opsional:

-   description
-   date

### Investment Valuation

Wajib:

-   investment asset
-   new value

## 10. Asset Creation and Opening Balance

Fintry harus menyediakan cara membuat asset pertama kali.

Contoh:

`buat BCA dengan saldo awal 5jt`

Hasil:

-   asset BCA dibuat
-   opening balance = Rp5.000.000
-   tidak dibuat sebagai income

Opening balance berbeda dari income.

## 11. Transaction Lifecycle

Alur normal:

`User Input` → `Parser` → `Structured Intent` → `Validation` →
`Confirmation/Clarification bila perlu` → `Financial Engine` →
`Database Transaction` → `Financial State` → `Dashboard Update` →
`Chat Confirmation`

LLM tidak memiliki authority langsung untuk mengubah database financial.

## 12. Transaction Correction

MVP harus mendukung minimal:

-   melihat transaksi
-   mengedit transaksi
-   membatalkan/menghapus transaksi
-   undo transaksi terakhir

Contoh:

`batalkan transaksi terakhir`

Jika sebuah transaksi telah dibatalkan, sistem harus menjaga audit trail
dan tidak menghapus jejak perubahan secara diam-diam.

### 12.1 Edit Transaksi

-   Field non-finansial (`description`, `category`, `transaction_date`)
    dapat diedit langsung dan dicatat di audit.
-   Perubahan `type`, `amount`, sumber, atau tujuan dilakukan sebagai
    void + transaksi pengganti dalam satu database transaction.
-   Transaksi yang sudah `VOIDED` tidak dapat diedit.

### 12.2 Void dan Undo

-   Void menjaga baris transaksi dan audit trail; status berubah
    menjadi `VOIDED`.
-   Void ditolak jika membuat nilai asset negatif atau jika transaksi
    menyentuh asset INACTIVE; sistem memberi pesan penolakan yang
    jelas.
-   "Undo transaksi terakhir" membatalkan transaksi `ACTIVE` terbaru.
    Undo tidak berlaku untuk opening balance, balance adjustment, atau
    valuation (koreksi dengan adjustment baru).
-   Tidak ada un-void; pemulihan dilakukan dengan transaksi baru.

Aturan lengkap: `domain_rules.md` §17.

## 13. Dashboard

Master Dashboard minimal menampilkan:

1.  Total Net Worth
2.  Asset allocation
3.  Daftar asset dan current value
4.  Ringkasan income
5.  Ringkasan expense
6.  Riwayat transaksi terbaru

Visual utama dapat berupa card, pie/bar chart, dan transaction list.

Dashboard harus menggunakan financial state dari backend, bukan
menghitung financial state sendiri di client.

## 14. Transaction History

Riwayat dapat difilter berdasarkan:

-   tanggal
-   asset
-   transaction type
-   category

User dapat membuka detail transaksi dan melakukan koreksi sesuai
permission.

## 15. Chat Response

Response mengikuti persona:

-   cepat
-   ringkas
-   presisi
-   tanpa basa-basi

Contoh:

`✓ Pengeluaran: Kopi — Rp25.000. Saldo BCA: Rp1.475.000.`

Transfer:

`↔ Transfer: Rp1.000.000 BCA → Reksadana. Net worth tidak berubah.`

Clarification:

`Nominal belum terdeteksi. Contoh: beli kopi 25rb BCA.`

## 16. Error Handling

Parser error:

`Saya belum dapat menentukan nominal. Contoh: beli kopi 25rb BCA.`

Unknown asset:

`BCA belum terdaftar. Buat asset BCA sekarang?`

Insufficient balance:

`Saldo BCA Rp50.000 tidak cukup untuk transaksi Rp100.000.`

Ambiguous asset:

`Pembayaran menggunakan aset apa: BCA, DANA, atau OVO?`

System error:

Jangan mengklaim transaksi berhasil jika database mutation belum
berhasil.

Asset nonaktif:

`Aset BCA nonaktif dan tidak dapat digunakan untuk transaksi baru.`

Void ditolak karena saldo akan negatif:

`Pembatalan ditolak: saldo BCA akan menjadi negatif.`

Kategori tidak valid:

`Kategori tidak valid; transaksi dicatat tanpa kategori.`

## 17. Financial Invariants

Invariants berikut wajib dijaga oleh backend:

1.  Expense mengurangi nilai asset.
2.  Income menambah nilai asset.
3.  Transfer mengurangi source dan menambah destination dengan nominal
    sama.
4.  Transfer tidak mengubah net worth.
5.  Investment valuation tidak membuat cash transaction.
6.  Balance adjustment tidak otomatis menjadi income/expense.
7.  Financial mutation harus atomic.
8.  Financial calculation dilakukan oleh application code.
9.  Data milik user tidak boleh dapat diakses user lain.
10. Failed transaction tidak boleh meninggalkan partial balance update.

Tambahan (revisi 2026-10-08):

11. Nilai asset tidak pernah negatif.
12. Asset adjustment bersifat append-only.
13. Transaksi `VOIDED` tidak berubah dan tidak dihapus secara fisik.
14. Asset INACTIVE bernilai 0 dan tidak dapat dipakai transaksi baru.

## 18. Security

Minimal:

-   password hashing
-   TLS
-   encryption at rest sesuai kemampuan infrastructure
-   secure session/token handling
-   authorization per user
-   rate limiting
-   audit log untuk financial mutation
-   backup
-   account/data deletion sesuai kebijakan produk

LLM tidak boleh menerima data financial yang tidak diperlukan untuk
menyelesaikan intent.

Catatan keputusan (revisi 2026-10-08):

-   Autentikasi memakai Better Auth (email + password, database
    session); lihat `ADR-003`.
-   Rate limiting untuk endpoint autentikasi memakai fitur bawaan
    Better Auth.
-   Account/data deletion dan prosedur purge ditunda dari MVP (bukan
    P0). Tabel finansial memakai `ON DELETE RESTRICT`; prosedur purge
    akan didefinisikan terpisah.

## 19. Performance

Target UX:

-   parsing + validation + financial update + dashboard update: \< 2
    detik pada kondisi normal
-   input-to-recorded transaction: \< 5 detik

Performance harus dimonitor secara terpisah untuk:

-   parser latency
-   validation latency
-   database latency
-   dashboard refresh latency

## 20. Scalability

Backend harus memungkinkan horizontal scaling.

Financial mutation harus menggunakan transactional database operation
agar dua request bersamaan tidak menyebabkan balance corruption.

## 21. Reliability

Target:

-   uptime minimal 99.9%
-   automated backup
-   atomic financial mutation
-   error logging
-   audit trail

## 22. UI/UX

Pendekatan:

-   split-view pada desktop
-   chat terminal di kiri
-   dashboard di kanan
-   responsive layout untuk mobile
-   dark mode / tech-brutalist / command-center aesthetic

Chat tetap menjadi primary entry point.

## 23. MVP Scope

### P0

-   Authentication
-   Asset creation
-   Opening balance
-   Income
-   Expense
-   Transfer
-   Transaction history
-   Net worth
-   Dashboard dasar
-   Natural-language parser
-   Validation
-   Clarification
-   Transaction correction
-   Undo/reversal
-   Balance adjustment
-   Asset edit dan deactivation
-   Pembuatan kategori otomatis melalui chat

### P1

-   Investment valuation
-   Manajemen kategori (UI, rename, merge, delete)
-   Advanced filtering
-   Monthly summaries

### P2

-   MFA
-   Advanced analytics
-   PDF/Excel export
-   External bank/broker integrations

### Catatan Scope (revisi 2026-10-08)

-   Asset edit dan deactivation adalah P0 (mengikuti
    `project_overview.md`; aturan di `domain_rules.md` §2.1).
-   Investment valuation tetap P1. Aturan domainnya
    (`domain_rules.md` §7) tetap berlaku saat fitur diimplementasikan.
-   "Custom categories" pada versi sebelumnya diartikan sebagai
    manajemen kategori (P1); pembuatan kategori otomatis lewat chat
    adalah P0.

## 24. Out of Scope for MVP

-   Automatic bank synchronization
-   Payment processing
-   Automatic stock trading
-   Financial advisory
-   Credit scoring
-   Loan management
-   Automatic market execution
-   Full accounting/ERP features

Ditunda dari MVP (revisi 2026-10-08):

-   Account deletion dan prosedur purge data
-   Reactivation asset yang sudah dinonaktifkan
-   UI, rename, merge, dan delete kategori (P1)
-   Update, void, atau delete asset adjustment

## 25. Monetization Direction

Model awal:

Freemium.

Free:

-   maksimal 3 asset
-   riwayat terbatas

Pro:

-   unlimited assets
-   advanced analytics
-   export data

Monetization tidak boleh mengubah financial correctness atau core
transaction engine.

## 26. Acceptance Criteria Utama

Sebuah MVP dianggap memenuhi requirement apabila:

1.  User dapat membuat asset.
2.  User dapat menetapkan opening balance.
3.  User dapat mencatat income melalui chat.
4.  User dapat mencatat expense melalui chat.
5.  User dapat melakukan transfer antar-asset.
6.  Transfer tidak mengubah net worth.
7.  Expense mengurangi net worth.
8.  Income meningkatkan net worth.
9.  Dashboard mencerminkan financial state terbaru.
10. Parser meminta klarifikasi jika data wajib ambigu.
11. Transaction gagal tidak menghasilkan partial mutation.
12. User dapat membatalkan/koreksi transaksi.
13. Investment valuation tidak tercatat sebagai expense/income.
14. Data user terisolasi.
15. AI tidak melakukan direct financial mutation.

16. Operasi yang membuat nilai asset negatif ditolak tanpa partial
    mutation.
17. Edit field non-finansial tercatat di audit; edit field finansial
    dilakukan sebagai void + transaksi pengganti secara atomik.
18. Transaksi `VOIDED` tidak dapat diedit dan tidak dihapus secara
    fisik.
19. Asset bersaldo ≠ 0 tidak dapat dinonaktifkan; asset INACTIVE tidak
    dapat dipakai transaksi baru.