// Money helpers: MVP IDR BigInt (ADR-001 §7, tech_stack.md §6).
// ponytail: fixed IDR MVP; upgrade to minor-unit multi-currency record when PRD introduces foreign assets.

export class InvalidAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAmountError";
  }
}

export function assertPositiveAmount(amount: bigint, fieldName = "amount"): void {
  if (amount <= 0n) {
    throw new InvalidAmountError(`${fieldName} must be positive, got ${amount}`);
  }
}

export function assertNonNegativeAmount(amount: bigint, fieldName = "amount"): void {
  if (amount < 0n) {
    throw new InvalidAmountError(`${fieldName} cannot be negative, got ${amount}`);
  }
}

export function formatIdr(amount: bigint): string {
  const isNegative = amount < 0n;
  const absVal = isNegative ? -amount : amount;
  const formatted = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${isNegative ? "-" : ""}Rp${formatted}`;
}
