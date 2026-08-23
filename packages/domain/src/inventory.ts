import type { StockByWarehouse } from "../../shared/src";

export const SHOPIFY_WAREHOUSE_NAME = "Bodegas Shopify";
export const SHOPIFY_WAREHOUSE_COMPONENTS = [
  "Bodega Granada",
  "Bodega Holguines",
  "Bodega La Leyenda",
  "Bodega Barranquilla",
] as const;

const SHOPIFY_WAREHOUSE_LABELS = new Set([
  "bodegas shopify",
  "shopify",
  "granada+holguines+la leyenda+barranquilla",
  "granada+holguines+leyenda+barranquilla",
]);

export type InventoryWarehouseSelection = {
  warehouse: string;
  components: readonly string[];
};

export function sumWarehouseInventory(stockByWarehouse: StockByWarehouse, warehouses: readonly string[]): number {
  return warehouses.reduce((sum, warehouse) => sum + Number(stockByWarehouse[warehouse] || 0), 0);
}

export function resolveInventoryWarehouseSelection(rawWarehouse: string): InventoryWarehouseSelection {
  const normalized = String(rawWarehouse || "")
    .trim()
    .toLowerCase();
  if (SHOPIFY_WAREHOUSE_LABELS.has(normalized)) {
    return {
      warehouse: SHOPIFY_WAREHOUSE_NAME,
      components: SHOPIFY_WAREHOUSE_COMPONENTS,
    };
  }
  return {
    warehouse: String(rawWarehouse || "").trim(),
    components: [],
  };
}

export function resolveSelectedInventoryQuantity(stockByWarehouse: StockByWarehouse, rawWarehouse: string): number {
  const selection = resolveInventoryWarehouseSelection(rawWarehouse);
  if (selection.components.length) {
    return sumWarehouseInventory(stockByWarehouse, selection.components);
  }
  return Number(stockByWarehouse[selection.warehouse] || 0);
}

export function hasPositiveInventory(stockByWarehouse: StockByWarehouse, warehouses?: readonly string[]): boolean {
  if (warehouses?.length) {
    return sumWarehouseInventory(stockByWarehouse, warehouses) > 0;
  }
  return Object.values(stockByWarehouse).some((quantity) => Number(quantity) > 0);
}
