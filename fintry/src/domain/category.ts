// Aturan validasi dan normalisasi kategori Fintry (domain_rules.md §11.1).
// Satu-satunya implementasi untuk input pengguna maupun AI parser.

// Karakter diizinkan: Unicode letters (\p{L}), marks (\p{M}), numbers (\p{N}), spasi, &, -, /
const ALLOWED_CHARS_REGEX = /^[\p{L}\p{M}\p{N} &\-/]+$/u;
const CONTAINS_LETTER_REGEX = /\p{L}/u;

/**
 * Normalisasi dan validasi nama kategori.
 * Mengembalikan string hasil normalisasi jika valid, atau null jika tidak memenuhi syarat.
 */
export function normalizeCategoryName(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // 1. Unicode NFKC
  // 2. Trim whitespace awal dan akhir
  // 3. Spasi ganda/berurutan dirapikan jadi satu spasi
  const normalized = raw
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");

  // Validasi panjang 1-40 karakter
  if (normalized.length < 1 || normalized.length > 40) {
    return null;
  }

  // Validasi karakter yang diizinkan
  if (!ALLOWED_CHARS_REGEX.test(normalized)) {
    return null;
  }

  // Wajib mengandung minimal satu huruf (bukan hanya angka/simbol)
  if (!CONTAINS_LETTER_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}
