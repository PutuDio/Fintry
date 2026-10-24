// Financial state calculations — deterministik, murni, tanpa DB/LLM.
// Formula sesuai domain_rules.md §3 (income), §4 (expense), §5 (transfer),
// §7 (valuation), §8 (adjustment), §10 (net worth), §15 (no negative).
// Engine memanggil ini terhadap nilai asset yang SUDAH dikunci (locked).

import { assertPositiveAmount, assertNonNegativeAmount } from "./money";

export class InsufficientBalanceError extends Error {
  constructor(
    readonly assetLabel: string,
    readonly current: bigint,
    readonly required: bigint,
  ) {
    super(
      `Asset "${assetLabel}" has ${current} but operation requires ${required}`,
    );
    this.name = "InsufficientBalanceError";
  }
}

export class NoOpAdjustmentError extends Error {
  constructor() {
    super("Adjustment delta must not be zero (domain_rules.md §8.1)");
    this.name = "NoOpAdjustmentError";
  }
}

/** §3: income increases one asset. Net worth delta = +amount. */
export function applyIncome(assetBefore: bigint, amount: bigint): bigint {
  assertPositiveAmount(amount, "income amount");
  return assetBefore + amount;
}

/** §4: expense decreases source asset; negative result rejected. */
export function applyExpense(
  assetBefore: bigint,
  amount: bigint,
  assetLabel = "source",
): bigint {
  assertPositiveAmount(amount, "expense amount");
  const after = assetBefore - amount;
  if (after < 0n) {
    throw new InsufficientBalanceError(assetLabel, assetBefore, amount);
  }
  return after;
}

/** §5: transfer moves value; net worth unchanged; either side cannot go negative. */
export function applyTransfer(
  sourceBefore: bigint,
  destinationBefore: bigint,
  amount: bigint,
  sourceLabel = "source",
): { sourceAfter: bigint; destinationAfter: bigint } {
  assertPositiveAmount(amount, "transfer amount");
  if (sourceBefore - amount < 0n) {
    throw new InsufficientBalanceError(sourceLabel, sourceBefore, amount);
  }
  return {
    sourceAfter: sourceBefore - amount,
    destinationAfter: destinationBefore + amount,
  };
}

/** §7: valuation sets investment to V_new; delta may be negative but V_new >= 0. */
export function applyValuation(
  valueBefore: bigint,
  valueAfter: bigint,
  assetLabel = "investment",
): { valueAfter: bigint; delta: bigint } {
  assertNonNegativeAmount(valueAfter, `${assetLabel} valueAfter`);
  return { valueAfter, delta: valueAfter - valueBefore };
}

/** §8: balance adjustment = reconciliation to actual value; no-op rejected. */
export function applyAdjustment(
  valueBefore: bigint,
  valueAfter: bigint,
  assetLabel = "asset",
): { valueAfter: bigint; delta: bigint } {
  const result = applyValuation(valueBefore, valueAfter, assetLabel);
  if (result.delta === 0n) {
    throw new NoOpAdjustmentError();
  }
  return result;
}

/** §10: net worth = sum of active asset values. */
export function netWorth(activeAssetValues: readonly bigint[]): bigint {
  let total = 0n;
  for (const value of activeAssetValues) {
    assertNonNegativeAmount(value, "asset value");
    total += value;
  }
  return total;
}
