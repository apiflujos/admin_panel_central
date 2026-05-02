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
      .reduce((acc, warehouse) => {
        const rawQty = Number(warehouse.availableQuantity || 0);
        const qty = Number.isFinite(rawQty) ? rawQty : 0;
        return acc + qty;
      }, 0);
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
