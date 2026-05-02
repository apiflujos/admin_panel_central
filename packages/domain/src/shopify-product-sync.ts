import type {
  AlegraInventoryRecord,
  ProductSyncMatchPriority,
  ShopifyVariantIdentifier,
} from "../../shared/src";

export function coerceDecimal(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function pickShopifyVariantIdentifier(
  variant: ShopifyVariantIdentifier,
  matchPriority: ProductSyncMatchPriority[]
) {
  const sku = typeof variant.sku === "string" ? variant.sku.trim() : "";
  const barcode = typeof variant.barcode === "string" ? variant.barcode.trim() : "";

  for (const strategy of matchPriority) {
    if (strategy === "sku" && sku) {
      return { identifier: sku, sku };
    }
    if (strategy === "barcode" && barcode) {
      return { identifier: barcode, sku };
    }
  }

  return { identifier: sku || barcode, sku };
}

export function buildAlegraItemDisplayName(productTitle: string, variantTitle: string): string {
  const base = String(productTitle || "").trim() || "Producto Shopify";
  const variant = String(variantTitle || "").trim();
  if (!variant || variant.toLowerCase() === "default title") {
    return base;
  }
  return `${base} - ${variant}`.slice(0, 250);
}

export function resolveAlegraWarehouseQuantityFromRecord(
  inventory: AlegraInventoryRecord | undefined,
  warehouseId: string
): number {
  const warehouses = Array.isArray(inventory?.warehouses) ? inventory.warehouses : [];
  const match = warehouses.find(
    (warehouse) => String(warehouse?.id || "").trim() === String(warehouseId || "").trim()
  );
  const qty = coerceDecimal(match?.availableQuantity ?? match?.quantity ?? inventory?.availableQuantity ?? inventory?.quantity);
  return qty ?? 0;
}
