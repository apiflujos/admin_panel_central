import { z } from "zod";

export const shopifyVariantSnapshotSchema = z.object({
  productId: z.string().trim().min(1),
  productTitle: z.string().trim().min(1),
  productStatus: z.string().trim().min(1),
  variantId: z.string().trim().min(1),
  variantTitle: z.string().trim().min(1),
  sku: z.string().trim(),
  barcode: z.string().trim(),
  selectedOptions: z.array(z.string().trim()),
  inventoryItemId: z.string().trim().optional(),
  price: z.string().trim().nullable().optional(),
  compareAtPrice: z.string().trim().nullable().optional(),
  inventoryQuantity: z.number().nullable().optional(),
});

export type ShopifyVariantSnapshot = z.infer<typeof shopifyVariantSnapshotSchema>;
