import { z } from "zod";

import { desiredPricingSchema } from "./pricing";
import { preparedInventoryWorkbookRowSchema } from "./xlsx-inventory";
import { shopifyVariantSnapshotSchema } from "./shopify";

export const publicationMatchedRowSchema = preparedInventoryWorkbookRowSchema.extend({
  desiredPrice: z.string().nullable(),
  desiredCompareAtPrice: z.string().nullable(),
  priceStrategy: desiredPricingSchema.shape.strategy,
  productId: z.string().trim().min(1),
  inventoryItemId: z.string().trim().min(1),
  variantId: z.string().trim().min(1),
  sku: z.string().trim(),
  productTitle: z.string().trim().min(1),
  previousPrice: z.string().nullable().optional(),
  previousCompareAtPrice: z.string().nullable().optional(),
  previousInventoryQuantity: z.number().nullable().optional(),
  strategy: z.enum(["sku_exact", "barcode_exact", "reference_size_fallback"]),
});

export const publicationUnmatchedRowSchema = z.object({
  reference: z.string().trim().min(1),
  parentName: z.string().trim().min(1),
  variantLabel: z.string().trim().min(1),
  name: z.string().trim().min(1),
  selectedQuantity: z.number().finite().min(0),
  reason: z.literal("unmatched"),
});

export const publicationPlanSchema = z.object({
  consideredRows: z.number().int().min(0),
  matchedRows: z.number().int().min(0),
  unmatchedRows: z.number().int().min(0),
  inventoryUpdatesNeeded: z.number().int().min(0),
  priceUpdatesNeeded: z.number().int().min(0),
  unchangedRows: z.number().int().min(0),
  matched: z.array(publicationMatchedRowSchema),
  unmatched: z.array(publicationUnmatchedRowSchema),
});

export const shopifyProductForPublicationSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  status: z.string().trim().min(1),
  variants: z.object({
    edges: z.array(
      z.object({
        node: shopifyVariantSnapshotSchema,
      })
    ),
  }),
});

export type PublicationMatchedRow = z.infer<typeof publicationMatchedRowSchema>;
export type PublicationUnmatchedRow = z.infer<typeof publicationUnmatchedRowSchema>;
export type PublicationPlan = z.infer<typeof publicationPlanSchema>;
export type ShopifyProductForPublication = z.infer<typeof shopifyProductForPublicationSchema>;
