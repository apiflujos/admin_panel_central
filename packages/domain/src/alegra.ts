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
  return (
    String(status || "")
      .trim()
      .toLowerCase() === "inactive"
  );
}

/**
 * Cantidad vendible de una bodega.
 *
 * QUÉ ES `minQuantity` Y QUÉ NO ES. En Alegra es el umbral de **alerta de
 * reposición**: avisa al facturar cuando el inventario baja de ese nivel, pero
 * NO impide vender por debajo. No es una reserva intocable.
 *   https://ayuda.alegra.com/int/gestiona-tu-inventario-en-diferentes-bodegas-almacenes-depósitos
 *
 * Por eso NO se descuenta por defecto: hacerlo dejaría fuera de la tienda
 * unidades que Alegra sí considera vendibles.
 *
 * Ahora bien, tratar ese mínimo como stock de seguridad es una decisión de
 * negocio perfectamente razonable — y como Alegra no la expresa, tiene que
 * tomarla NUESTRO sistema de forma explícita, nunca por suposición. De ahí
 * `reservarMinimo`, que el llamador activa a conciencia.
 *
 * Un disponible negativo se propaga tal cual: es sobreventa ya ocurrida y debe
 * verse, no maquillarse a cero.
 */
function cantidadVendibleEnBodega(
  warehouse: { availableQuantity?: unknown; minQuantity?: unknown },
  reservarMinimo: boolean
): number {
  const disponibleRaw = Number(warehouse.availableQuantity ?? 0);
  const disponible = Number.isFinite(disponibleRaw) ? disponibleRaw : 0;
  if (!reservarMinimo || disponible <= 0) return disponible;
  const minimoRaw = Number(warehouse.minQuantity ?? 0);
  const minimo = Number.isFinite(minimoRaw) && minimoRaw > 0 ? minimoRaw : 0;
  return Math.max(0, disponible - minimo);
}

export function resolveAlegraAvailableQuantity(
  inventory: AlegraInventory | undefined,
  warehouseIds: string[] = [],
  /** Tratar `minQuantity` como stock de seguridad no vendible. Decisión NUESTRA. */
  reservarMinimo = false
): number | null {
  if (!inventory) {
    return null;
  }

  if (Array.isArray(inventory.warehouses) && inventory.warehouses.length > 0) {
    const total = inventory.warehouses
      .filter((warehouse) => (warehouseIds.length ? warehouseIds.includes(String(warehouse.id)) : true))
      .reduce((acc, warehouse) => acc + cantidadVendibleEnBodega(warehouse, reservarMinimo), 0);
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
