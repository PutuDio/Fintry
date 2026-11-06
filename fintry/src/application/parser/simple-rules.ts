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

    // 0. Detect Incoming Transfer Pattern: "tf masuk ...", "transfer masuk ..."
    const isIncomingTransfer = /\b(?:tf|transfer)\s+masuk\b/i.test(text);
    if (isIncomingTransfer) {
      const amountTokenMatch = text.match(/(\d+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)?|rp\.?\s*\d+(?:[.,]\d+)*)/i);
      if (!amountTokenMatch) {
        return {
          success: false,
          intent: null,
          ambiguities: [{ type: "INVALID_AMOUNT_FORMAT", message: "Nominal transfer masuk tidak ditemukan." }],
          missingFields: [{ fieldName: "amount", expectedFormat: "contoh: 100rb atau Rp100.000" }],
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

      let matchedAssetId: string | null = null;
      for (const a of availableAssets) {
        if (text.toLowerCase().includes(a.name.toLowerCase())) {
          matchedAssetId = a.id;
          break;
        }
      }

      if (!matchedAssetId) {
        if (availableAssets.length === 1) {
          matchedAssetId = availableAssets[0].id;
        } else {
          return {
            success: false,
            intent: null,
            ambiguities: [{ type: "AMBIGUOUS_ASSET", message: "Sebutkan nama akun tujuan transfer masuk (contoh: ke Mandiri)." }],
            missingFields: [{ fieldName: "destinationAssetId", expectedFormat: "nama asset milik Anda" }],
          };
        }
      }

      const senderMatch =
        text.match(/(?:dari|oleh)\s+([a-zA-Z0-9_\s]+?)(?:\s+(?:ke|di|\d)|$)/i) ||
        text.match(/(?:tf|transfer)\s+masuk\s+([a-zA-Z]+)/i);

      let description = text;
      if (senderMatch) {
        const candidate = senderMatch[1].trim();
        if (!availableAssets.some((a) => a.name.toLowerCase() === candidate.toLowerCase())) {
          description = `tf masuk dari ${candidate}`;
        }
      }

      const valid = CreateIncomeSchema.safeParse({
        amount,
        destinationAssetId: matchedAssetId,
        description,
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

    // 1. Detect Transfer Pattern:
    // a. "tf ke [dest] [amount] pake/dari [source]"
    // b. "tf [amount] ke [dest] dari/pake [source]"
    // c. "tf [amount] dari/pake [source] ke [dest]"
    const matchA = text.match(
      /(?:transfer|tf|pindah|kirim|top\s*up)\s+ke\s+(.*?)\s+(\d+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)?|rp\.?\s*\d+(?:[.,]\d+)*)\s+(?:dari|pake|pakai)\s+(.*)/i,
    );
    const matchB = text.match(
      /(?:transfer|tf|pindah|kirim|top\s*up)\s+(.*?)\s+ke\s+(.*?)\s+(?:dari|pake|pakai)\s+(.*)/i,
    );
    const matchC = text.match(
      /(?:transfer|tf|pindah|kirim|top\s*up)\s+(.*?)\s+(?:dari|pake|pakai)\s+(.*?)\s+ke\s+(.*)/i,
    );

    let rawAmount = "";
    let sourceName = "";
    let destName = "";
    let hasTransferMatch = false;

    if (matchA) {
      destName = matchA[1].trim();
      rawAmount = matchA[2].trim();
      sourceName = matchA[3].trim();
      hasTransferMatch = true;
    } else if (matchB && matchB[1].trim()) {
      rawAmount = matchB[1].trim();
      destName = matchB[2].trim();
      sourceName = matchB[3].trim();
      hasTransferMatch = true;
    } else if (matchC) {
      rawAmount = matchC[1].trim();
      sourceName = matchC[2].trim();
      destName = matchC[3].trim();
      hasTransferMatch = true;
    }

    if (hasTransferMatch) {
      const amount = parseIndonesianAmount(rawAmount);
      if (!amount) {
        return {
          success: false,
          intent: null,
          ambiguities: [{ type: "INVALID_AMOUNT_FORMAT", message: `Format nominal "${rawAmount}" tidak dikenali.` }],
          missingFields: [{ fieldName: "amount", expectedFormat: "contoh: 50rb atau 50000" }],
        };
      }

      const sourceMatch = matchAssetByName(sourceName, availableAssets);
      const destMatch = matchAssetByName(destName, availableAssets);

      // Case 1: Both are registered user assets -> Internal TRANSFER
      if (sourceMatch && destMatch) {
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

      // Case 2: Source asset exists, dest is external party -> EXPENSE
      if (sourceMatch && !destMatch) {
        const description = destName ? `tf ke ${destName}` : text;
        const parseValidation = CreateExpenseSchema.safeParse({
          amount,
          sourceAssetId: sourceMatch.assetId,
          description,
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
            commandType: "CREATE_EXPENSE",
            payload: parseValidation.data,
          },
          ambiguities,
          missingFields: [],
        };
      }

      // Case 3: Dest asset exists, source is external party -> INCOME
      if (!sourceMatch && destMatch) {
        const description = sourceName ? `tf dari ${sourceName}` : text;
        const parseValidation = CreateIncomeSchema.safeParse({
          amount,
          destinationAssetId: destMatch.assetId,
          description,
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
            commandType: "CREATE_INCOME",
            payload: parseValidation.data,
          },
          ambiguities,
          missingFields: [],
        };
      }

      // Case 4: Neither asset exists -> Ambiguous
      return {
        success: false,
        intent: null,
        ambiguities: [{ type: "AMBIGUOUS_ASSET", message: `Asset "${sourceName}" atau "${destName}" tidak ditemukan.` }],
        missingFields: [{ fieldName: "sourceAssetId", expectedFormat: "nama asset yang sudah terdaftar" }],
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
