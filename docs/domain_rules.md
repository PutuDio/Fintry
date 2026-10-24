# Fintry Domain Rules

Dokumen ini adalah sumber aturan domain finansial Fintry. Aturan di sini
bersifat deterministik dan tidak boleh ditentukan ulang oleh LLM.

## 1. Core Principle

LLM memahami bahasa pengguna.

Application code menentukan financial state.

Database menyimpan financial state.

Alur wajib:

`Natural Language → Structured Intent → Validation → Financial Engine → Database`

## 2. Asset Rules

Asset adalah representasi tempat/nilai finansial berada.

MVP:

-   BANK
-   E_WALLET
-   INVESTMENT

Asset memiliki current value.

Investment current value adalah nilai terakhir yang diketahui/ditetapkan
Fintry, bukan transaksi cash.

### 2.1 Asset Lifecycle (Aktivasi dan Deaktivasi)

-   Asset hanya dapat dinonaktifkan jika `current_value = 0`. Asset
    dengan saldo/value ≠ 0 tidak dapat dinonaktifkan.
-   Asset INACTIVE tidak dapat digunakan untuk transaksi baru (income,
    expense, transfer sebagai source maupun destination), adjustment
    baru, maupun valuation baru.
-   Asset INACTIVE dikecualikan dari Asset Resolution (§14).
-   Void transaksi yang menyentuh asset INACTIVE ditolak (§17.1).
-   Tidak ada reactivation pada MVP.
-   Karena asset INACTIVE selalu bernilai 0, net worth (§10) tidak
    berubah ketika asset dinonaktifkan.

## 3. Income

Formula:

`asset_after = asset_before + amount`

`net_worth_after = net_worth_before + amount`

Income wajib memiliki destination asset.

Income tidak boleh menggunakan dua asset sebagai source dan destination.

## 4. Expense

Formula:

`asset_after = asset_before - amount`

`net_worth_after = net_worth_before - amount`

Expense wajib memiliki source asset.

Amount harus positif pada domain model. Direction ditentukan oleh
transaction type.

## 5. Transfer

Formula:

`source_after = source_before - amount`

`destination_after = destination_before + amount`

`net_worth_after = net_worth_before`

Transfer tidak boleh masuk ke expense report.

Transfer antar-asset adalah perpindahan value, bukan pengeluaran.

## 6. Investment Purchase

Pembelian investment menggunakan asset cash:

`cash_source -= amount`

`investment_asset += amount`

`net_worth unchanged`

Pembelian investment diperlakukan sebagai transfer, bukan expense.

## 7. Investment Valuation

Jika investment berubah dari V_old menjadi V_new:

`valuation_delta = V_new - V_old`

`investment_value = V_new`

`net_worth_delta = valuation_delta`

Tidak boleh dibuat income atau expense transaction untuk valuation
adjustment.

## 8. Balance Adjustment

Balance adjustment digunakan untuk reconciliation.

Contoh:

`recorded = 5,500,000`

`actual = 5,450,000`

Adjustment:

`delta = -50,000`

Adjustment tidak boleh otomatis diberi category Expense.

Adjustment harus memiliki reason/source jika UI menyediakan field
tersebut.

### 8.1 Immutability dan Koreksi

-   `asset_adjustments` (OPENING_BALANCE, BALANCE_ADJUSTMENT,
    VALUATION) bersifat append-only pada MVP: tidak ada update, void,
    atau delete.
-   Kesalahan input dikoreksi dengan adjustment baru.
-   Perintah undo/void hanya berlaku untuk transaksi (INCOME, EXPENSE,
    TRANSFER), tidak untuk adjustment.
-   Hasil adjustment tidak boleh membuat nilai asset negatif (§15) dan
    tidak boleh no-op (`delta ≠ 0`).
-   VALUATION hanya berlaku untuk asset bertipe INVESTMENT.

## 9. Opening Balance

Opening balance menetapkan initial financial state.

Opening balance bukan income.

Contoh:

`Create BCA with opening balance 5,000,000`

Hasil:

`BCA = 5,000,000`

Tidak membuat cashflow income.

Setiap asset memiliki paling banyak satu opening balance. Opening
balance tidak dapat diubah atau di-void; koreksi dilakukan melalui
balance adjustment (§8.1).

## 10. Net Worth

Formula MVP:

`Net Worth = Σ current_value of active assets`

Net worth harus dihitung dari authoritative backend state.

Client tidak boleh menjadi sumber kebenaran.

## 11. Description vs Category

Description adalah deskripsi bebas pengguna.

Category adalah klasifikasi.

Keduanya tidak boleh disimpan sebagai field yang sama.

Contoh:

Input:

`angpau untuk adik 100rb BCA`

Possible:

`description = "angpau untuk adik"`

`category = "Angpau"`

Category dapat dibuat/customized oleh user.

### 11.1 Aturan Kategori

Kategori bersifat per-user dan dibuat dengan find-or-create.

Normalisasi nama (satu validator di application layer, dipakai untuk
input pengguna maupun output AI):

1.  Unicode NFKC.
2.  Trim whitespace di awal dan akhir.
3.  Whitespace berurutan dirapikan menjadi satu spasi.
4.  Huruf besar/kecil asli dipertahankan; nama tampilan memakai ejaan
    saat kategori pertama kali dibuat.

Validasi:

-   panjang 1–40 karakter setelah normalisasi;
-   hanya Unicode letters, marks, numbers, spasi, `&`, `-`, dan `/`;
-   minimal satu huruf (nama yang hanya berisi angka/simbol ditolak).

Pencocokan:

-   case-insensitive terhadap nama yang sudah dinormalisasi;
-   tidak ada fuzzy matching dan tidak ada synonym handling di
    application code;
-   tidak ada batas jumlah kategori per user.

Perilaku:

-   Kategori hanya berlaku untuk INCOME dan EXPENSE, tidak untuk
    TRANSFER.
-   Kategori kosong tidak dibuat.
-   Kategori dari AI (output parser) tidak memiliki jalur khusus dan
    melewati validator yang sama.
-   Kategori invalid tidak menggagalkan pencatatan transaksi: transaksi
    disimpan dengan `category_id = NULL` dan respons chat
    menyebutkannya.
-   Pembuatan kategori otomatis melalui chat termasuk P0. Manajemen
    kategori (UI, rename, merge, delete) termasuk P1 dan belum ada di
    MVP.

## 12. Date

Jika tanggal tidak disebutkan, gunakan tanggal transaksi saat ini.

Jika tanggal relatif disebutkan, resolve berdasarkan timezone
user/application.

Simpan resolved date, bukan hanya string natural-language.

## 13. Amount

Normalisasi:

-   `20k` → 20,000
-   `20rb` → 20,000
-   `20 ribu` → 20,000
-   `1jt` → 1,000,000
-   `1 juta` → 1,000,000

Parser harus mengubah nominal menjadi numeric value sebelum financial
engine.

## 14. Asset Resolution

Asset harus cocok dengan asset milik user.

Jika satu nama cocok dengan satu asset:

→ resolve.

Jika tidak ada:

→ offer asset creation atau clarification.

Jika lebih dari satu kandidat:

→ clarification.

Jangan memilih asset secara acak.

## 15. Insufficient Balance

Nilai asset tidak boleh negatif. Aturan ini berlaku untuk semua tipe
asset (BANK, E_WALLET, INVESTMENT) dan semua operasi yang dapat
menurunkan nilai asset:

-   expense (source);
-   transfer (source);
-   void/reversal INCOME dan void/reversal TRANSFER (destination);
-   balance adjustment;
-   investment valuation;
-   opening balance.

Jika hasil operasi membuat nilai asset < 0:

→ seluruh operasi ditolak (tanpa partial mutation) dan pengguna
menerima pesan yang menyebutkan asset, saldo saat ini, dan nominal yang
dibutuhkan.

Jangan membuat saldo negatif secara diam-diam.

Validasi dilakukan oleh financial engine terhadap nilai asset yang
sudah dikunci dalam database transaction. Database memiliki CHECK
`current_value >= 0` sebagai lapisan kedua, bukan pengganti validasi
engine.

## 16. Transaction Atomicity

Satu financial mutation harus atomic.

Transfer:

-   source update
-   destination update
-   transaction record

harus berhasil bersama atau gagal bersama.

Tidak boleh terjadi:

`BCA -1,000,000`

tetapi:

`Reksadana +1,000,000` gagal.

## 17. Reversal

Delete/reversal tidak boleh sekadar menghilangkan history tanpa jejak.

Reversal menggunakan void semantics. Financial state harus dapat
ditelusuri.

### 17.1 Void Transaksi

-   Transaksi memiliki status `ACTIVE` atau `VOIDED`.
-   Void membalik efek transaksi dalam satu database transaction:
    INCOME mengurangi destination; EXPENSE menambah source; TRANSFER
    menambah source dan mengurangi destination.
-   Baris transaksi tidak dihapus dan field finansialnya tidak diubah;
    `status` menjadi `VOIDED` dan `voided_at` diisi.
-   Void ditolak jika: transaksi sudah `VOIDED`; hasil void membuat
    nilai asset negatif (§15); atau transaksi menyentuh asset INACTIVE
    (§2.1).
-   Tidak ada un-void. Pemulihan dilakukan dengan transaksi baru.
-   "Undo transaksi terakhir" adalah void atas transaksi `ACTIVE`
    terbaru berdasarkan waktu pembuatan (`created_at`), bukan
    `transaction_date`.
-   Summary, net worth, dan laporan hanya menghitung transaksi
    `ACTIVE`; riwayat tetap menampilkan transaksi `VOIDED`.
-   Setiap void menghasilkan audit record.

### 17.2 Edit Transaksi

Field non-finansial boleh diedit langsung: `description`,
`category_id`, dan `transaction_date`. (`transaction_date` tidak
memengaruhi saldo maupun net worth; ia hanya menentukan periode
ringkasan, yang dihitung saat dibaca.)

Field finansial `type`, `amount`, `source_asset_id`, dan
`destination_asset_id` tidak diedit langsung. Perubahannya dilakukan
sebagai void + transaksi pengganti (replacement):

1.  Void dan replacement dijalankan dalam satu database transaction;
    jika salah satu gagal, tidak ada yang berubah.
2.  Transaksi pengganti divalidasi terhadap nilai asset setelah void
    (§15, §2.1).
3.  Transaksi pengganti menyimpan `replaces_transaction_id` yang
    menunjuk transaksi lama. Satu transaksi hanya dapat diganti satu
    kali.
4.  Field yang tidak diubah dibawa dari transaksi lama, termasuk
    `transaction_date`.

Aturan lain:

-   Tidak ada field lain yang dapat diedit.
-   Transaksi `VOIDED` tidak dapat diedit, baik langsung maupun lewat
    replacement.
-   Kategori tidak berlaku untuk TRANSFER.
-   Edit langsung tanpa perubahan nilai tidak menulis apa pun.

Audit:

-   Edit langsung → audit `TRANSACTION_UPDATED` yang memuat hanya field
    yang berubah.
-   Replacement → audit `TRANSACTION_VOIDED` dan
    `TRANSACTION_CREATED` yang saling merujuk.

## 18. AI Boundary

LLM boleh:

-   classify intent
-   extract entities
-   normalize natural language
-   suggest category
-   explain validation errors

LLM tidak boleh:

-   menghitung final balance sebagai source of truth
-   langsung mengubah database
-   memutuskan aturan domain
-   mengabaikan validation
-   mengeksekusi transaksi ambiguous

### 18.1 Routing Pending Intent

LLM tidak boleh memutuskan apakah suatu pesan merupakan jawaban atas
pending intent, konfirmasi, pembatalan, atau intent baru. Routing
dilakukan oleh application code secara deterministik (lihat §20 dan
`tech_stack.md` §15).

## 19. Financial Safety

Jika informasi wajib tidak tersedia:

→ ask clarification.

Jika informasi berisiko atau ambigu:

→ require confirmation.

Jika mutation gagal:

→ jangan mengirim success response.

Jika database state tidak dapat diverifikasi:

→ jangan mengklaim saldo telah berubah.

## 20. Pending Intent Safety

-   Maksimal satu pending intent berstatus `PENDING` per user; masa
    berlaku 10 menit.
-   Pending menyimpan structured intent; eksekusi tidak mengulang
    parsing LLM.
-   Konfirmasi hanya diterima dari kata afirmatif utuh dalam daftar
    tertutup.
-   Saat eksekusi, seluruh validasi dan Asset Resolution dijalankan
    ulang terhadap state saat itu (saldo/asset dapat berubah selama
    pending).
-   Jika eksekusi ditolak validasi domain (misalnya saldo tidak cukup),
    pending menjadi `CANCELLED` dan penolakan dilaporkan.
-   Error sistem saat eksekusi membiarkan pending tetap `PENDING`;
    idempotency mencegah mutasi ganda.
-   Status akhir (`RESOLVED`, `CANCELLED`, `EXPIRED`) tidak dibuka
    kembali.

## Revision History

-   2026-10-08: aturan final untuk saldo negatif (§15), edit dan void
    (§17), adjustment append-only (§8.1), deaktivasi asset (§2.1),
    kategori (§11.1), dan pending intent (§18.1, §20). Lihat
    `docs/architecture_decisions/ADR-002.md`.