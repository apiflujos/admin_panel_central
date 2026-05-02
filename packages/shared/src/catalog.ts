import { z } from "zod";

export const syncVariantReferenceSchema = z.object({
  reference: z.string().trim().min(1),
  parentName: z.string().trim().min(1),
  variantLabel: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

export const preparedInventoryVariantSchema = syncVariantReferenceSchema.extend({
  rowNumber: z.number().int().positive(),
  code: z.string().trim().min(1),
  visibleInStore: z.boolean(),
  hasStockFlag: z.boolean(),
});

export type SyncVariantReference = z.infer<typeof syncVariantReferenceSchema>;
export type PreparedInventoryVariant = z.infer<typeof preparedInventoryVariantSchema>;
