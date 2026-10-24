import { randomUUID } from "node:crypto";
import type { FinancialIntent, ParseResult, TransactionParser } from "./types";

export class MockParser implements TransactionParser {
  private cannedResult: ParseResult | null = null;

  setNextResult(result: ParseResult) {
    this.cannedResult = result;
  }

  isSupported(message: string): boolean {
    void message;
    return true;
  }

  async parse(userId: string, rawMessage: string): Promise<ParseResult> {
    void rawMessage;
    if (this.cannedResult) {
      const res = this.cannedResult;
      this.cannedResult = null;
      return res;
    }

    // Default mock response: 50_000 EXPENSE
    const intent: FinancialIntent = {
      idempotencyKey: randomUUID(),
      userId,
      commandType: "CREATE_EXPENSE",
      payload: {
        amount: 50_000n,
        sourceAssetId: "00000000-0000-0000-0000-000000000001",
        description: "Mock parsed expense",
      },
    };

    return {
      success: true,
      intent,
      ambiguities: [],
      missingFields: [],
    };
  }
}
