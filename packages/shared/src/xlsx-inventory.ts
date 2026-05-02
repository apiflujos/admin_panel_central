import { z } from "zod";

import { priceSnapshotSchema } from "./pricing";

export const workbookWarehouseColumnSchema = z.object({
  header: z.string().trim().min(1),
  column: z.string().trim().min(1),
  warehouse: z.string().trim().min(1),
});

export const workbookWarehouseSelectionSchema = z.object({
  warehouse: z.string().trim().min(1),
  header: z.string().trim().min(1),
  column: z.string().trim(),
  components: z.array(z.string().trim().min(1)).default([]),
});

export const preparedInventoryWorkbookRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  code: z.string().trim(),
  name: z.string().trim().min(1),
  parentName: z.string().trim().min(1),
  variantLabel: z.string().trim().min(1),
  reference: z.string().trim().min(1),
  visibleInStore: z.boolean(),
  hasStockFlag: z.boolean(),
  selectedWarehouse: z.string().trim().min(1),
  selectedQuantity: z.number().finite().min(0),
  totalQuantity: z.number().finite().min(0),
  prices: priceSnapshotSchema,
  stockByWarehouse: z.record(z.string().trim().min(1), z.number().finite().min(0)),
});

export const preparedInventoryWorkbookSummarySchema = z.object({
  sourceFile: z.string().trim().min(1),
  sheet: z.string().trim().min(1),
  selectedWarehouse: z.string().trim().min(1),
  selectedWarehouseComponents: z.array(z.string().trim().min(1)),
  warehouseColumns: z.array(z.string().trim().min(1)),
  totalSheetRows: z.number().int().min(0),
  parentRows: z.number().int().min(0),
  variantRows: z.number().int().min(0),
  distinctReferences: z.number().int().min(0),
  visibleVariants: z.number().int().min(0),
  variantsWithSelectedStock: z.number().int().min(0),
  variantsWithAnyStock: z.number().int().min(0),
  readyForShopify: z.number().int().min(0),
  readyForShopifyWithSelectedStock: z.number().int().min(0),
});

export type WorkbookWarehouseColumn = z.infer<typeof workbookWarehouseColumnSchema>;
export type WorkbookWarehouseSelection = z.infer<typeof workbookWarehouseSelectionSchema>;
export type PreparedInventoryWorkbookRow = z.infer<typeof preparedInventoryWorkbookRowSchema>;
export type PreparedInventoryWorkbookSummary = z.infer<typeof preparedInventoryWorkbookSummarySchema>;
