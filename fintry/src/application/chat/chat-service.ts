import {
  executeCreateExpense,
  executeCreateIncome,
  executeCreateTransfer,
} from "@/application/commands";
import { formatIdr } from "@/domain/money";
import { listAssets } from "@/infrastructure/repositories/assets";
import type { Db } from "@/infrastructure/repositories/types";
import { SimpleRulesParser } from "../parser/simple-rules";
import type {
  CreateExpensePayload,
  CreateIncomePayload,
  CreateTransferPayload,
  TransactionParser,
} from "../parser/types";

export interface ChatResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  commandType?: string;
  affectedAssets?: Array<{ id: string; name: string; balanceAfter: bigint }>;
}

/**
 * Chat-to-intent processor:
 * 1. Resolves active assets for user
 * 2. Parses message to structured intent
 * 3. Returns clarification if ambiguous or missing fields
 * 4. Executes financial command atomically
 * 5. Returns formatted confirmation response
 */
export async function processChatMessage(
  db: Db,
  userId: string,
  rawMessage: string,
  customParser?: TransactionParser,
): Promise<ChatResponse> {
  // 1. Resolve active assets
  const activeAssets = await listAssets(db, userId, { activeOnly: true });
  const assetMap = new Map(activeAssets.map((a) => [a.id, a]));

  // 2. Parse using provided parser or default SimpleRulesParser
  const parser =
    customParser ??
    new SimpleRulesParser(async () =>
      activeAssets.map((a) => ({ id: a.id, name: a.name })),
    );

  if (!parser.isSupported(rawMessage)) {
    return {
      success: false,
      message:
        'Pesan tidak dikenali sebagai transaksi. Sebutkan nominal dan akunnya (contoh: "beli kopi 25rb pake BCA" atau "gaji 5jt masuk ke BCA").',
    };
  }

  const parseResult = await parser.parse(userId, rawMessage);

  // 3. Handle parsing ambiguities or missing fields
  if (!parseResult.success || !parseResult.intent) {
    if (parseResult.ambiguities.length > 0) {
      return {
        success: false,
        message: parseResult.ambiguities.map((a) => a.message).join(" "),
      };
    }
    if (parseResult.missingFields.length > 0) {
      const missing = parseResult.missingFields
        .map((f) => `${f.fieldName} (${f.expectedFormat})`)
        .join(", ");
      return {
        success: false,
        message: `Informasi belum lengkap: mohon sebutkan ${missing}.`,
      };
    }
    return {
      success: false,
      message: "Gagal memproses transaksi. Pastikan format pesan jelas.",
    };
  }

  const { intent } = parseResult;

  // 4. Execute command atomically per commandType
  try {
    switch (intent.commandType) {
      case "CREATE_EXPENSE": {
        const payload = intent.payload as CreateExpensePayload;
        const res = await executeCreateExpense(db, {
          userId,
          sourceAssetId: payload.sourceAssetId,
          amount: payload.amount,
          description: payload.description,
          category: payload.category,
          transactionDate: payload.transactionDate,
          idempotencyKey: intent.idempotencyKey,
        });

        const asset = assetMap.get(res.sourceAssetId);
        const assetName = asset?.name ?? "Akun";
        return {
          success: true,
          commandType: "CREATE_EXPENSE",
          transactionId: res.transactionId,
          message: `Berhasil catat pengeluaran ${formatIdr(payload.amount)} dari ${assetName}. Sisa saldo: ${formatIdr(res.balanceAfter)}.`,
          affectedAssets: [
            { id: res.sourceAssetId, name: assetName, balanceAfter: res.balanceAfter },
          ],
        };
      }

      case "CREATE_INCOME": {
        const payload = intent.payload as CreateIncomePayload;
        const res = await executeCreateIncome(db, {
          userId,
          destinationAssetId: payload.destinationAssetId,
          amount: payload.amount,
          description: payload.description,
          category: payload.category,
          transactionDate: payload.transactionDate,
          idempotencyKey: intent.idempotencyKey,
        });

        const asset = assetMap.get(res.destinationAssetId);
        const assetName = asset?.name ?? "Akun";
        return {
          success: true,
          commandType: "CREATE_INCOME",
          transactionId: res.transactionId,
          message: `Berhasil catat pemasukan ${formatIdr(payload.amount)} ke ${assetName}. Saldo sekarang: ${formatIdr(res.balanceAfter)}.`,
          affectedAssets: [
            {
              id: res.destinationAssetId,
              name: assetName,
              balanceAfter: res.balanceAfter,
            },
          ],
        };
      }

      case "CREATE_TRANSFER": {
        const payload = intent.payload as CreateTransferPayload;
        const res = await executeCreateTransfer(db, {
          userId,
          sourceAssetId: payload.sourceAssetId,
          destinationAssetId: payload.destinationAssetId,
          amount: payload.amount,
          description: payload.description,
          transactionDate: payload.transactionDate,
          idempotencyKey: intent.idempotencyKey,
        });

        const srcAsset = assetMap.get(res.sourceAssetId);
        const destAsset = assetMap.get(res.destinationAssetId);
        const srcName = srcAsset?.name ?? "Sumber";
        const destName = destAsset?.name ?? "Tujuan";

        const actionText = res.isInvestmentPurchase
          ? "pembelian investasi"
          : "transfer";

        return {
          success: true,
          commandType: "CREATE_TRANSFER",
          transactionId: res.transactionId,
          message: `Berhasil catat ${actionText} ${formatIdr(payload.amount)} dari ${srcName} ke ${destName}. Sisa saldo ${srcName}: ${formatIdr(res.sourceBalanceAfter)}, saldo ${destName}: ${formatIdr(res.destinationBalanceAfter)}.`,
          affectedAssets: [
            { id: res.sourceAssetId, name: srcName, balanceAfter: res.sourceBalanceAfter },
            {
              id: res.destinationAssetId,
              name: destName,
              balanceAfter: res.destinationBalanceAfter,
            },
          ],
        };
      }

      default:
        return {
          success: false,
          message: `Command "${intent.commandType}" belum didukung lewat chat langsung.`,
        };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Terjadi kesalahan";
    return {
      success: false,
      message: `Gagal memproses transaksi: ${errorMsg}`,
    };
  }
}
