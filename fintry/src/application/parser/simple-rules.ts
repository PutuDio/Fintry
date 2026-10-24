import { randomUUID } from "node:crypto";
import { matchAssetByName, parseIndonesianAmount } from "./extractors";
import {
  CreateExpenseSchema,
  CreateIncomeSchema,
  CreateTransferSchema,
} from "./schemas";
import type {
  ParseResult,
  ParserAmbiguity,
  TransactionParser,
} from "./types";

/**
 * Offline, rule-based transaction parser using regex and pattern heuristics.
 * Covers everyday natural language formats in Indonesian without calling LLMs.
 * Safe fallback that avoids hitting free-tier AI rate limits.
 */
export class SimpleRulesParser implements TransactionParser {
  constructor(
    private getAvailableAssets: (userId: string) => Promise<Array<{ id: string; name: string }>>,
  ) {}

  isSupported(message: string): boolean {
    const msg = message.toLowerCase();
    // Keywords indicating financial actions
    const hasExpenseAction = /\b(beli|bayar|makan|keluar|ongkos|jajan|belanja|parkir)\b/.test(msg);
    const hasIncomeAction = /\b(gaji|masuk|dapat|terima|bonus|hasil)\b/.test(msg);
    const hasTransferAction = /\b(transfer|tf|pindah|kirim|topup|top up)\b/.test(msg);
    const hasAmount = /\d+\s*(?:rb|ribu|k|jt|juta)?\b/.test(msg);

    return (hasExpenseAction || hasIncomeAction || hasTransferAction) && hasAmount;
  }

  async parse(userId: string, rawMessage: string): Promise<ParseResult> {
    const ambiguities: ParserAmbiguity[] = [];
    const availableAssets = await this.getAvailableAssets(userId);
    const text = rawMessage.trim();

    // 1. Detect Transfer Pattern: "transfer X dari A ke B" or "tf X ke B dari A" or "topup B X dari A"
    const transferMatch = text.match(
      /(?:transfer|tf|pindah|kirim|top\s*up)\s+(.*?)\s+(?:dari|pake|pakai)\s+(.*?)\s+ke\s+(.*)/i,
    ) || text.match(
      /(?:transfer|tf|pindah|kirim|top\s*up)\s+(.*?)\s+ke\s+(.*?)\s+(?:dari|pake|pakai)\s+(.*)/i,
    );

    if (transferMatch) {
      const rawAmount = transferMatch[1];
      let sourceName = transferMatch[2];
      let destName = transferMatch[3];

      // Handle inverted order in second regex pattern
      if (text.match(/ke\s+.*?\s+dari/i)) {
        destName = transferMatch[2];
        sourceName = transferMatch[3];
      }

      const amount = parseIndonesianAmount(rawAmount);
      const sourceMatch = matchAssetByName(sourceName, availableAssets);
      const destMatch = matchAssetByName(destName, availableAssets);

      if (!amount) {
        return {
          success: false,
          intent: null,
          ambiguities: [{ type: "INVALID_AMOUNT_FORMAT", message: `Format nominal "${rawAmount}" tidak dikenali.` }],
          missingFields: [{ fieldName: "amount", expectedFormat: "contoh: 50rb atau 50000" }],
        };
      }

      if (!sourceMatch) {
        return {
          success: false,
          intent: null,
          ambiguities: [{ type: "AMBIGUOUS_ASSET", message: `Asset asal "${sourceName}" tidak ditemukan.` }],
          missingFields: [{ fieldName: "sourceAssetId", expectedFormat: "nama asset yang sudah terdaftar" }],
        };
      }

      if (!destMatch) {
        return {
          success: false,
          intent: null,
          ambiguities: [{ type: "AMBIGUOUS_ASSET", message: `Asset tujuan "${destName}" tidak ditemukan.` }],
          missingFields: [{ fieldName: "destinationAssetId", expectedFormat: "nama asset yang sudah terdaftar" }],
        };
      }

      const parseValidation = CreateTransferSchema.safeParse({
        amount,
        sourceAssetId: sourceMatch.assetId,
        destinationAssetId: destMatch.assetId,
      });

      if (!parseValidation.success) {
        return {
          success: false,
          intent: null,
          ambiguities: [{ type: "INVALID_AMOUNT_FORMAT", message: parseValidation.error.issues[0].message }],
          missingFields: [],
        };
      }

      return {
        success: true,
        intent: {
          idempotencyKey: randomUUID(),
          userId,
          commandType: "CREATE_TRANSFER",
          payload: parseValidation.data,
        },
        ambiguities,
        missingFields: [],
      };
    }

    // 2. Detect Income Pattern: "gaji X masuk ke A", "terima X di A", "dapat X pake A"
    const isIncome = /\b(gaji|masuk|terima|dapat|bonus)\b/i.test(text);
    if (isIncome) {
      // Find amount token
      const amountTokenMatch = text.match(/(\d+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)?|rp\.?\s*\d+(?:[.,]\d+)*)/i);
      if (!amountTokenMatch) {
        return {
          success: false,
          intent: null,
          ambiguities: [{ type: "INVALID_AMOUNT_FORMAT", message: "Nominal pemasukan tidak ditemukan." }],
          missingFields: [{ fieldName: "amount", expectedFormat: "contoh: 1jt atau Rp1.000.000" }],
        };
      }

      const amount = parseIndonesianAmount(amountTokenMatch[1]);
      if (!amount) {
        return {
          success: false,
          intent: null,
          ambiguities: [{ type: "INVALID_AMOUNT_FORMAT", message: `Nominal "${amountTokenMatch[1]}" tidak valid.` }],
          missingFields: [],
        };
      }

      // Find destination asset: check each available asset name in the text
      let matchedAssetId: string | null = null;
      for (const a of availableAssets) {
        if (text.toLowerCase().includes(a.name.toLowerCase())) {
          matchedAssetId = a.id;
          break;
        }
      }

      // Default to first asset if only 1 exists, otherwise request clarification
      if (!matchedAssetId) {
        if (availableAssets.length === 1) {
          matchedAssetId = availableAssets[0].id;
        } else {
          return {
            success: false,
            intent: null,
            ambiguities: [{ type: "AMBIGUOUS_ASSET", message: "Sebutkan nama akun/rekening tujuan (contoh: ke BCA)." }],
            missingFields: [{ fieldName: "destinationAssetId", expectedFormat: "nama asset milik Anda" }],
          };
        }
      }

      const valid = CreateIncomeSchema.safeParse({
        amount,
        destinationAssetId: matchedAssetId,
        description: text,
      });

      if (!valid.success) {
        return {
          success: false,
          intent: null,
          ambiguities: [{ type: "INVALID_AMOUNT_FORMAT", message: valid.error.issues[0].message }],
          missingFields: [],
        };
      }

      return {
        success: true,
        intent: {
          idempotencyKey: randomUUID(),
          userId,
          commandType: "CREATE_INCOME",
          payload: valid.data,
        },
        ambiguities,
        missingFields: [],
      };
    }

    // 3. Default to Expense Pattern: "beli kopi 25rb pake BCA", "makan siang 50k", "ongkos 15000"
    const amountTokenMatch = text.match(/(\d+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)?|rp\.?\s*\d+(?:[.,]\d+)*)/i);
    if (!amountTokenMatch) {
      return {
        success: false,
        intent: null,
        ambiguities: [{ type: "INVALID_AMOUNT_FORMAT", message: "Nominal pengeluaran tidak ditemukan." }],
        missingFields: [{ fieldName: "amount", expectedFormat: "contoh: 25rb atau 25000" }],
      };
    }

    const amount = parseIndonesianAmount(amountTokenMatch[1]);
    if (!amount) {
      return {
        success: false,
        intent: null,
        ambiguities: [{ type: "INVALID_AMOUNT_FORMAT", message: `Nominal "${amountTokenMatch[1]}" tidak valid.` }],
        missingFields: [],
      };
    }

    // Check which asset is mentioned
    let sourceAssetId: string | null = null;
    for (const a of availableAssets) {
      if (text.toLowerCase().includes(a.name.toLowerCase())) {
        sourceAssetId = a.id;
        break;
      }
    }

    if (!sourceAssetId) {
      if (availableAssets.length === 1) {
        sourceAssetId = availableAssets[0].id;
      } else {
        return {
          success: false,
          intent: null,
          ambiguities: [{ type: "AMBIGUOUS_ASSET", message: "Sebutkan akun sumber pembayaran (contoh: pake GoPay)." }],
          missingFields: [{ fieldName: "sourceAssetId", expectedFormat: "nama asset milik Anda" }],
        };
      }
    }

    // Extract description: remove amount and asset name from original text
    const cleanDesc = text
      .replace(amountTokenMatch[1], "")
      .replace(/(?:pake|pakai|dari|lewat)\s+\w+/i, "")
      .trim();

    const valid = CreateExpenseSchema.safeParse({
      amount,
      sourceAssetId,
      description: cleanDesc || text,
    });

    if (!valid.success) {
      return {
        success: false,
        intent: null,
        ambiguities: [{ type: "INVALID_AMOUNT_FORMAT", message: valid.error.issues[0].message }],
        missingFields: [],
      };
    }

    return {
      success: true,
      intent: {
        idempotencyKey: randomUUID(),
        userId,
        commandType: "CREATE_EXPENSE",
        payload: valid.data,
      },
      ambiguities,
      missingFields: [],
    };
  }
}
