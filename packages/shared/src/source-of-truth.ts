/**
 * Quién manda sobre cada cosa: Alegra o la tienda.
 *
 * POR QUÉ EXISTE
 * --------------
 * No todos los clientes trabajan igual:
 *
 *  - Quien lleva el inventario en Alegra necesita que la tienda NO pueda vender
 *    lo que no existe: Alegra manda y sus cantidades bajan a la tienda.
 *  - Quien opera en la tienda y usa Alegra sólo para facturar necesita lo
 *    contrario: que nadie le toque las cantidades de la tienda, y que un pedido
 *    se facture SIN MIRAR existencias.
 *
 * Antes esto estaba repartido en media docena de booleanos (`updateInShopify`,
 * `includeInventory`, `publishOnStock`, ...) que había que ajustar a mano y de
 * forma coherente entre sí. Aquí se elige UNA vez por área y de ahí se derivan.
 *
 * LO QUE NO SE ELIGE
 * ------------------
 * Los requisitos legales de facturación NO son configurables. Que una factura
 * en Colombia necesite identificación del cliente no depende de quién "mande":
 * lo exige la DIAN. Eso vive en el prever de facturación, no aquí.
 */

export const SOURCE_OF_TRUTH_AREAS = ["inventory", "prices", "publication", "catalog"] as const;
export type SourceOfTruthArea = (typeof SOURCE_OF_TRUTH_AREAS)[number];

export const SOURCE_OF_TRUTH_OWNERS = ["alegra", "shopify"] as const;
export type SourceOfTruthOwner = (typeof SOURCE_OF_TRUTH_OWNERS)[number];

export type SourceOfTruth = Record<SourceOfTruthArea, SourceOfTruthOwner>;

/**
 * Por omisión manda Alegra en todo.
 *
 * Es la opción conservadora: con Alegra al mando la tienda no puede vender lo
 * que no existe. Si el cliente lleva el inventario en la tienda, lo cambia a
 * conciencia; nunca al revés por descuido.
 */
export const DEFAULT_SOURCE_OF_TRUTH: SourceOfTruth = {
  inventory: "alegra",
  prices: "alegra",
  publication: "alegra",
  catalog: "alegra",
};

export const SOURCE_OF_TRUTH_LABELS: Record<
  SourceOfTruthArea,
  { label: string; help: Record<SourceOfTruthOwner, string> }
> = {
  inventory: {
    label: "Existencias",
    help: {
      alegra:
        "Alegra manda: sus cantidades bajan a las tiendas y un producto sin unidades deja de venderse. Es lo que impide sobrevender.",
      shopify: "La tienda manda: nadie toca sus cantidades. Los pedidos se facturan sin mirar existencias.",
    },
  },
  prices: {
    label: "Precios",
    help: {
      alegra: "El precio de la lista de Alegra se aplica a las tiendas.",
      shopify: "El precio de la tienda se respeta; Alegra no lo cambia.",
    },
  },
  publication: {
    label: "Publicación",
    help: {
      alegra: "Alegra decide si un producto se ve, según sus existencias y su estado.",
      shopify: "La tienda decide qué está publicado; la sincronización no lo toca.",
    },
  },
  catalog: {
    label: "Catálogo",
    help: {
      alegra: "Los productos nacen en Alegra y se crean en las tiendas.",
      shopify: "Los productos nacen en la tienda y se crean en Alegra.",
    },
  },
};

function normalizeOwner(value: unknown, fallback: SourceOfTruthOwner): SourceOfTruthOwner {
  return value === "alegra" || value === "shopify" ? value : fallback;
}

export function normalizeSourceOfTruth(
  value: unknown,
  fallback: SourceOfTruth = DEFAULT_SOURCE_OF_TRUTH
): SourceOfTruth {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    inventory: normalizeOwner(raw.inventory, fallback.inventory),
    prices: normalizeOwner(raw.prices, fallback.prices),
    publication: normalizeOwner(raw.publication, fallback.publication),
    catalog: normalizeOwner(raw.catalog, fallback.catalog),
  };
}

/**
 * ¿Manda Alegra en esta área?
 *
 * Acepta un valor ausente o a medio construir y lo normaliza: un contexto sin
 * este campo —una configuración vieja, un objeto armado a mano— no debe hacer
 * reventar la sincronización, y ante la duda manda Alegra, que es lo que impide
 * sobrevender.
 */
export function alegraMandaEn(sot: SourceOfTruth | null | undefined, area: SourceOfTruthArea) {
  const resuelto = sot && typeof sot === "object" ? normalizeSourceOfTruth(sot) : DEFAULT_SOURCE_OF_TRUTH;
  return resuelto[area] === "alegra";
}

/**
 * ¿Debe la facturación de un pedido depender de las existencias?
 *
 * NO cuando el inventario lo lleva la tienda: ahí el pedido se factura tal cual
 * llegó, sin importar cantidades. Es el caso de quien usa Alegra sólo para
 * facturar.
 */
export function facturarIgnorandoExistencias(sot: SourceOfTruth | null | undefined) {
  return !alegraMandaEn(sot, "inventory");
}
