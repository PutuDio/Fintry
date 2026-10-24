/**
 * Format input angka dengan separator ribuan (.) untuk IDR.
 * Input: "1000000" atau "1.000.000" → Output: "1.000.000"
 * 
 * Usage: onChange={(e) => setAmount(formatInputAmount(e.target.value))}
 */
export function formatInputAmount(value: string): string {
  // Hapus semua non-digit
  const digits = value.replace(/\D/g, "");
  
  // Kosong → return empty
  if (!digits) return "";
  
  // Format dengan separator ribuan
  return Number(digits).toLocaleString("id-ID");
}

/**
 * Parse formatted input kembali ke bigint untuk backend.
 * Input: "1.000.000" → Output: 1000000n
 */
export function parseFormattedAmount(value: string): bigint {
  const digits = value.replace(/\D/g, "");
  return digits ? BigInt(digits) : 0n;
}
