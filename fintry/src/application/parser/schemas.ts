import { z } from "zod";

// Bigint custom schema: transforms string or number to bigint
const BigIntSchema = z.union([
  z.bigint(),
  z.number().int().transform((n) => BigInt(n)),
  z.string().regex(/^\d+$/).transform((s) => BigInt(s)),
]);

// Date format: YYYY-MM-DD
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD");

export const CreateIncomeSchema = z.object({
  amount: BigIntSchema.refine((n) => n > 0n, "Amount must be strictly positive"),
  destinationAssetId: z.string().uuid("Invalid destination asset ID"),
  description: z.string().max(255).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  transactionDate: DateSchema.optional(),
});

export const CreateExpenseSchema = z.object({
  amount: BigIntSchema.refine((n) => n > 0n, "Amount must be strictly positive"),
  sourceAssetId: z.string().uuid("Invalid source asset ID"),
  description: z.string().max(255).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  transactionDate: DateSchema.optional(),
});

export const CreateTransferSchema = z.object({
  amount: BigIntSchema.refine((n) => n > 0n, "Amount must be strictly positive"),
  sourceAssetId: z.string().uuid("Invalid source asset ID"),
  destinationAssetId: z.string().uuid("Invalid destination asset ID"),
  description: z.string().max(255).optional().nullable(),
  transactionDate: DateSchema.optional(),
}).refine(
  (data) => data.sourceAssetId !== data.destinationAssetId,
  "Source and destination assets must be different",
);

export const CreateOpeningBalanceSchema = z.object({
  amount: BigIntSchema.refine((n) => n >= 0n, "Opening balance amount must be non-negative"),
  assetId: z.string().uuid("Invalid asset ID"),
});

export const BalanceAdjustmentSchema = z.object({
  amount: BigIntSchema.refine((n) => n >= 0n, "Adjusted actual amount must be non-negative"),
  assetId: z.string().uuid("Invalid asset ID"),
  description: z.string().max(255).optional().nullable(),
});

export const VoidTransactionSchema = z.object({
  transactionId: z.string().uuid("Invalid transaction ID"),
  reason: z.string().max(255).optional().nullable(),
});

export const EditTransactionSchema = z.object({
  transactionId: z.string().uuid("Invalid transaction ID"),
  patch: z.object({
    description: z.string().max(255).optional().nullable(),
    category: z.string().max(100).optional().nullable(),
    transactionDate: DateSchema.optional(),
    amount: BigIntSchema.refine((n) => n > 0n, "Amount must be positive").optional(),
    sourceAssetId: z.string().uuid().optional(),
    destinationAssetId: z.string().uuid().optional(),
  }),
});
