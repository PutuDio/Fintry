import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseIndonesianAmount } from "../extractors";
import { MockParser } from "../mock-parser";
import { SimpleRulesParser } from "../simple-rules";
import type {
  CreateExpensePayload,
  CreateIncomePayload,
  CreateTransferPayload,
} from "../types";

const mockAssets = [
  { id: randomUUID(), name: "BCA" },
  { id: randomUUID(), name: "GoPay" },
  { id: randomUUID(), name: "Bibit" },
];

describe("Stage 12-13: Indonesian Amount Extractor", () => {
  it("parse format ribuan (rb, k, ribu)", () => {
    expect(parseIndonesianAmount("50rb")).toBe(50_000n);
    expect(parseIndonesianAmount("25k")).toBe(25_000n);
    expect(parseIndonesianAmount("100ribu")).toBe(100_000n);
    expect(parseIndonesianAmount("2.5rb")).toBe(2_500n);
  });

  it("parse format jutaan (jt, juta)", () => {
    expect(parseIndonesianAmount("1jt")).toBe(1_000_000n);
    expect(parseIndonesianAmount("2.5jt")).toBe(2_500_000n);
    expect(parseIndonesianAmount("1,5juta")).toBe(1_500_000n);
  });

  it("parse format standard rupiah & digits", () => {
    expect(parseIndonesianAmount("Rp 50.000")).toBe(50_000n);
    expect(parseIndonesianAmount("rp. 25000")).toBe(25_000n);
    expect(parseIndonesianAmount("125000")).toBe(125_000n);
  });

  it("kembalikan null jika format tidak valid", () => {
    expect(parseIndonesianAmount("gratis")).toBeNull();
    expect(parseIndonesianAmount("-50000")).toBeNull();
    expect(parseIndonesianAmount("0")).toBeNull();
  });
});

describe("Stage 12-13: SimpleRulesParser Natural Language", () => {
  const parser = new SimpleRulesParser(async () => mockAssets);
  const userId = "user-123";

  it("parse expense pattern: 'beli kopi 25rb pake BCA'", async () => {
    const res = await parser.parse(userId, "beli kopi 25rb pake BCA");
    expect(res.success).toBe(true);
    expect(res.intent?.commandType).toBe("CREATE_EXPENSE");
    if (res.intent?.commandType === "CREATE_EXPENSE") {
      const payload = res.intent.payload as CreateExpensePayload;
      expect(payload.amount).toBe(25_000n);
      expect(payload.sourceAssetId).toBe(mockAssets[0].id);
    }
  });

  it("parse income pattern: 'gaji bulanan 5jt masuk ke BCA'", async () => {
    const res = await parser.parse(userId, "gaji bulanan 5jt masuk ke BCA");
    expect(res.success).toBe(true);
    expect(res.intent?.commandType).toBe("CREATE_INCOME");
    if (res.intent?.commandType === "CREATE_INCOME") {
      const payload = res.intent.payload as CreateIncomePayload;
      expect(payload.amount).toBe(5_000_000n);
      expect(payload.destinationAssetId).toBe(mockAssets[0].id);
    }
  });

  it("parse transfer pattern: 'transfer 50rb dari BCA ke GoPay'", async () => {
    const res = await parser.parse(userId, "transfer 50rb dari BCA ke GoPay");
    expect(res.success).toBe(true);
    expect(res.intent?.commandType).toBe("CREATE_TRANSFER");
    if (res.intent?.commandType === "CREATE_TRANSFER") {
      const payload = res.intent.payload as CreateTransferPayload;
      expect(payload.amount).toBe(50_000n);
      expect(payload.sourceAssetId).toBe(mockAssets[0].id);
      expect(payload.destinationAssetId).toBe(mockAssets[1].id);
    }
  });

  it("mendeteksi ambiguitas jika asset tidak dikenal", async () => {
    const res = await parser.parse(userId, "beli makan 30rb pake OVO");
    expect(res.success).toBe(false);
    expect(res.ambiguities).toHaveLength(1);
    expect(res.ambiguities[0].type).toBe("AMBIGUOUS_ASSET");
  });

  it("mendeteksi missing field jika nominal tidak ada", async () => {
    const res = await parser.parse(userId, "beli nasi goreng pake BCA");
    expect(res.success).toBe(false);
    expect(res.missingFields.some((f) => f.fieldName === "amount")).toBe(true);
  });
});

describe("Stage 12-13: MockParser Deterministic", () => {
  it("mengembalikan intent default jika tidak ada canned result", async () => {
    const mock = new MockParser();
    const res = await mock.parse("u1", "dummy message");
    expect(res.success).toBe(true);
    expect(res.intent?.commandType).toBe("CREATE_EXPENSE");
  });
});
