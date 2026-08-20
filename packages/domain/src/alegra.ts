import type { AlegraInventory, AlegraItemIdentifier } from "../../shared/src";

export function extractAlegraCustomFieldValue(item: AlegraItemIdentifier, keys: string[]): string {
  if (!Array.isArray(item.customFields)) return "";
  const lowered = keys.map((key) => key.toLowerCase());
  const match = item.customFields.find((field) => {
    const name = String(field?.name || field?.label || "").toLowerCase();
    return lowered.includes(name);
  });
  return String(match?.value || "").trim();
}

export function extractAlegraIdentifiers(item: AlegraItemIdentifier): string[] {
  const values = [
    item.code,
    item.reference,
    item.barcode,
    extractAlegraCustomFieldValue(item, ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"]),
  ]
    .map((value) => String(value || "").trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(values));
}

export function isAlegraStatusInactive(status: unknown): boolean {
  return String(status || "").trim().toLowerCase() === "inactive";
}

/**
 * Cantidad realmente VENDIBLE de una bodega: lo disponible menos la reserva
 * mínima que Alegra mantiene en ella (`minQuantity`).
 *
 * Alegra es la fuente de verdad del inventario, y si define un mínimo por
 * bodega es porque esas unidades no deben venderse. Contarlas como disponibles
 * llevaría a comprometer stock reservado, que es la sobreventa que este cliente
 * no puede permitirse.
 *
 * Nunca devuelve negativo por efecto de la reserva: si el disponible ya está
 * por debajo del mínimo, lo vendible es cero. Un disponible negativo de verdad
 * (sobreventa ya ocurrida) sí se propaga tal cual, para que quede a la vista.
 */
function cantidadVendibleEnBodega(warehouse: { availableQuantity?: unknown; minQuantity?: unknown }): number {
  const disponibleRaw = Number(warehouse.availableQuantity ?? 0);
  const disponible = Number.isFinite(disponibleRaw) ? disponibleRaw : 0;
  const minimoRaw = Number(warehouse.minQuantity ?? 0);
  const minimo = Number.isFinite(minimoRaw) && minimoRaw > 0 ? minimoRaw : 0;
  if (disponible <= 0) return disponible;
  return Math.max(0, disponible - minimo);
}

export function resolveAlegraAvailableQuantity(
  inventory: AlegraInventory | undefined,
  warehouseIds: string[] = []
): number | null {
  if (!inventory) {
    return null;
  }

  if (Array.isArray(inventory.warehouses) && inventory.warehouses.length > 0) {
    const total = inventory.warehouses
      .filter((warehouse) => (warehouseIds.length ? warehouseIds.includes(String(warehouse.id)) : true))
      .reduce((acc, warehouse) => acc + cantidadVendibleEnBodega(warehouse), 0);
    return Number.isFinite(total) ? total : null;
  }

  if (typeof inventory.availableQuantity === "number") {
    return inventory.availableQuantity;
  }

  return null;
}

export function shouldSkipAlegraInventoryByWarehouse(
  inventory: AlegraInventory | undefined,
  warehouseIds: string[]
): boolean {
  if (!warehouseIds.length) return false;
  const warehouses = Array.isArray(inventory?.warehouses) ? inventory.warehouses : [];
  if (!warehouses.length) return false;
  return !warehouses.some((warehouse) => warehouseIds.includes(String(warehouse.id)));
}

export function resolvePublishEligibility(options: {
  status?: string;
  availableQuantity: number;
  publishOnStock: boolean;
}): boolean {
  return !isAlegraStatusInactive(options.status) && (options.publishOnStock ? options.availableQuantity > 0 : true);
}
