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

/**
 * Qué hacer con un producto de la tienda cuando Alegra dice que no quedan
 * unidades.
 *
 * - `mark_sold_out`: se queda PUBLICADO con cero disponibles. La tienda lo
 *   muestra como «Agotado». El cliente lo sigue encontrando, conserva su
 *   posición en buscadores y sus enlaces no se rompen.
 * - `unpublish`: sale del escaparate.
 *
 * `mark_sold_out` es el valor por omisión: despublicar es destructivo y pierde
 * el posicionamiento del producto, mientras que agotado cumple igual la regla
 * de no sobrevender siempre que el inventario quede en cero y la tienda tenga
 * prohibida la venta sin existencias.
 */
export const OUT_OF_STOCK_BEHAVIORS = ["mark_sold_out", "unpublish"] as const;

export type OutOfStockBehavior = (typeof OUT_OF_STOCK_BEHAVIORS)[number];

export const DEFAULT_OUT_OF_STOCK_BEHAVIOR: OutOfStockBehavior = "mark_sold_out";

export function normalizeOutOfStockBehavior(
  value: unknown,
  fallback: OutOfStockBehavior = DEFAULT_OUT_OF_STOCK_BEHAVIOR
): OutOfStockBehavior {
  return value === "unpublish" || value === "mark_sold_out" ? value : fallback;
}
