import { z } from "zod";

export const productSyncMatchPrioritySchema = z.enum(["sku", "barcode"]);

export const shopifyVariantIdentifierSchema = z.object({
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
});

export const alegraWarehouseInventoryRecordSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  availableQuantity: z.number().finite().optional(),
  quantity: z.number().finite().optional(),
});

export const alegraInventoryRecordSchema = z.object({
  availableQuantity: z.number().finite().optional(),
  quantity: z.number().finite().optional(),
  warehouses: z.array(alegraWarehouseInventoryRecordSchema).optional(),
});

export type ProductSyncMatchPriority = z.infer<typeof productSyncMatchPrioritySchema>;
export type ShopifyVariantIdentifier = z.infer<typeof shopifyVariantIdentifierSchema>;
export type AlegraWarehouseInventoryRecord = z.infer<typeof alegraWarehouseInventoryRecordSchema>;
export type AlegraInventoryRecord = z.infer<typeof alegraInventoryRecordSchema>;
