import { z } from "zod";

export const warehouseNameSchema = z.string().trim().min(1);

export const stockByWarehouseSchema = z.record(warehouseNameSchema, z.number().finite().min(0));

export const inventorySelectionSchema = z.object({
  selectedWarehouse: warehouseNameSchema,
  selectedQuantity: z.number().finite().min(0),
  totalQuantity: z.number().finite().min(0),
  stockByWarehouse: stockByWarehouseSchema,
});

export type StockByWarehouse = z.infer<typeof stockByWarehouseSchema>;
export type InventorySelection = z.infer<typeof inventorySelectionSchema>;
