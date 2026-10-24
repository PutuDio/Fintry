import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  InsufficientBalanceError,
  NoOpAdjustmentError,
  applyAdjustment,
  applyExpense,
  applyIncome,
  applyTransfer,
  applyValuation,
  netWorth,
} from "../accounting";
import { InvalidAmountError } from "../money";

describe("money invariants (fast-check)", () => {
  const amountArb = fc.bigInt({ min: 1n, max: 10n ** 15n });
  const valueArb = fc.bigInt({ min: 0n, max: 10n ** 15n });

  it("transfer preserves sum of both sides (net worth unchanged, §5)", () => {
    fc.assert(
      fc.property(valueArb, valueArb, amountArb, (src, dst, amt) => {
        fc.pre(src >= amt);
        const r = applyTransfer(src, dst, amt);
        return r.sourceAfter + r.destinationAfter === src + dst;
      }),
    );
  });

  it("expense never produces a negative asset value (§15)", () => {
    fc.assert(
      fc.property(valueArb, amountArb, (before, amt) => {
        try {
          const after = applyExpense(before, amt);
          return after >= 0n && before - after === amt;
        } catch (e) {
          return (
            e instanceof InsufficientBalanceError &&
            before < amt &&
            amt - before > 0n
          );
        }
      }),
    );
  });

  it("income always increases asset by exactly amount (§3)", () => {
    fc.assert(
      fc.property(valueArb, amountArb, (before, amt) => {
        return applyIncome(before, amt) === before + amt;
      }),
    );
  });

  it("valuation delta equals V_new - V_old (§7)", () => {
    fc.assert(
      fc.property(valueArb, valueArb, (before, after) => {
        const r = applyValuation(before, after);
        return r.valueAfter === after && r.delta === after - before;
      }),
    );
  });

  it("adjustment with zero delta is rejected (§8.1)", () => {
    fc.assert(
      fc.property(valueArb, (v) => {
        expect(() => applyAdjustment(v, v)).toThrow(NoOpAdjustmentError);
        return true;
      }),
    );
  });

  it("net worth is the exact sum (§10)", () => {
    fc.assert(
      fc.property(fc.array(valueArb, { maxLength: 20 }), (values) => {
        const expected = values.reduce((a, b) => a + b, 0n);
        return netWorth(values) === expected;
      }),
    );
  });
});

describe("explicit cases", () => {
  it("income 5jt to 12.5jt asset → 17.5jt", () => {
    expect(applyIncome(12_500_000n, 5_000_000n)).toBe(17_500_000n);
  });

  it("expense 25rb from 20rb is rejected", () => {
    expect(() => applyExpense(20_000n, 25_000n, "BCA")).toThrow(
      InsufficientBalanceError,
    );
  });

  it("transfer 500rb BCA→DANA", () => {
    expect(applyTransfer(1_000_000n, 100_000n, 500_000n)).toEqual({
      sourceAfter: 500_000n,
      destinationAfter: 600_000n,
    });
  });

  it("non-positive amount is rejected", () => {
    expect(() => applyIncome(0n, 0n)).toThrow(InvalidAmountError);
    expect(() => applyIncome(0n, -5n)).toThrow(InvalidAmountError);
  });
});
