// Indonesian amount parser: converts natural language amount to bigint
// e.g.: "50rb" -> 50000n, "1.5jt" -> 1500000n, "Rp 25.000" -> 25000n

export function parseIndonesianAmount(raw: string): bigint | null {
  const clean = raw.trim().toLowerCase();

  // Pattern 1: X.Xjt or Xjt (juta = 1,000,000)
  const jtMatch = clean.match(/^(\d+(?:[.,]\d+)?)\s*(?:jt|juta)$/);
  if (jtMatch) {
    const num = parseFloat(jtMatch[1].replace(",", "."));
    if (isNaN(num) || num <= 0) return null;
    return BigInt(Math.round(num * 1_000_000));
  }

  // Pattern 2: X.Xrb or Xrb or Xk (ribu/k = 1,000)
  const rbMatch = clean.match(/^(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k)$/);
  if (rbMatch) {
    const num = parseFloat(rbMatch[1].replace(",", "."));
    if (isNaN(num) || num <= 0) return null;
    return BigInt(Math.round(num * 1_000));
  }

  // Pattern 3: Standard numeric with optional "rp" prefix: "Rp 50.000", "50000", "Rp. 50,000"
  const digitsOnly = clean
    .replace(/^rp\.?\s*/i, "")
    .replace(/[.,]/g, "")
    .trim();

  if (/^\d+$/.test(digitsOnly)) {
    const val = BigInt(digitsOnly);
    return val > 0n ? val : null;
  }

  return null;
}

/** Match known asset names case-insensitively from available assets. */
export function matchAssetByName(
  inputName: string,
  availableAssets: Array<{ id: string; name: string }>,
): { assetId: string; exactMatch: boolean } | null {
  const target = inputName.trim().toLowerCase();

  // 1. Exact case-insensitive match
  const exact = availableAssets.find((a) => a.name.toLowerCase() === target);
  if (exact) return { assetId: exact.id, exactMatch: true };

  // 2. Partial prefix/suffix match (e.g. "bca" matches "Bank BCA")
  const partial = availableAssets.find(
    (a) => a.name.toLowerCase().includes(target) || target.includes(a.name.toLowerCase()),
  );
  if (partial) return { assetId: partial.id, exactMatch: false };

  return null;
}
