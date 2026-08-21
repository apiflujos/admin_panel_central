/**
 * Catálogo de trabajos de fondo (workers).
 *
 * Es la ÚNICA fuente de verdad: la consulta el propio runtime de workers para
 * saber si debe ejecutarse cada trabajo, y la consulta la vista de Super Admin
 * para pintar los interruptores. Añadir un worker sin registrarlo aquí lo deja
 * fuera del control de encendido, que es justo lo que hay que evitar.
 */

export const WORKER_KEYS = [
  "webhook-dispatch",
  "orders-sync",
  "retry-queue",
  "alegra-reconcile",
  "products-sync",
  "inventory-adjustments",
  "billing-report",
  "log-retention",
  "health-monitor",
] as const;

export type WorkerKey = (typeof WORKER_KEYS)[number];

export type WorkerGroupKey = "facturacion" | "sincronizacion" | "mantenimiento";

export type WorkerDefinition = {
  key: WorkerKey;
  label: string;
  group: WorkerGroupKey;
  /** Qué hace, en lenguaje llano. Se muestra en la vista de Super Admin. */
  description: string;
  /** Qué pasa si se apaga. */
  impactIfOff: string;
  /** true si puede MODIFICAR la tienda (precio, stock, publicación). */
  writesToStore: boolean;
  /**
   * Estado por omisión cuando no hay fila en la base.
   *
   * Los dos que escriben en la tienda nacen APAGADOS a propósito: encenderlos es
   * una decisión explícita del cliente, no un efecto secundario de desplegar.
   */
  enabledByDefault: boolean;
};

export const WORKER_GROUPS: { key: WorkerGroupKey; label: string; description: string }[] = [
  {
    key: "facturacion",
    label: "Facturación",
    description: "Convierte los pedidos de las tiendas en facturas de Alegra. No modifica el catálogo.",
  },
  {
    key: "sincronizacion",
    label: "Sincronización de catálogo",
    description: "Lleva precios y existencias de Alegra hacia las tiendas. SÍ modifica el catálogo.",
  },
  {
    key: "mantenimiento",
    label: "Mantenimiento",
    description: "Tareas internas: limpieza de registros, vigilancia y reporte mensual.",
  },
];

export const WORKER_CATALOG: WorkerDefinition[] = [
  {
    key: "webhook-dispatch",
    label: "Recepción de pedidos (webhooks)",
    group: "facturacion",
    description:
      "Atiende los avisos que Shopify envía en el momento en que entra un pedido y genera la factura en Alegra.",
    impactIfOff: "Los pedidos nuevos dejan de facturarse en el momento. Quedan en cola.",
    writesToStore: false,
    enabledByDefault: true,
  },
  {
    key: "orders-sync",
    label: "Repaso de pedidos",
    group: "facturacion",
    description:
      "Cada pocos minutos revisa si quedó algún pedido sin facturar y lo recupera. Es la red de seguridad de los webhooks.",
    impactIfOff: "Un pedido cuyo aviso se pierda no se factura nunca.",
    writesToStore: false,
    enabledByDefault: true,
  },
  {
    key: "retry-queue",
    label: "Reintento de facturas fallidas",
    group: "facturacion",
    description: "Vuelve a intentar las facturas que fallaron por un error pasajero.",
    impactIfOff: "Las facturas que fallen se quedan fallidas hasta que alguien las reintente a mano.",
    writesToStore: false,
    enabledByDefault: true,
  },
  {
    key: "alegra-reconcile",
    label: "Verificación de facturas",
    group: "facturacion",
    description:
      "Comprueba que las facturas creadas sigan existiendo en Alegra y reporta su estado ante la DIAN. Solo lee, no modifica nada.",
    impactIfOff: "Se pierde el aviso temprano de facturas anuladas o borradas en Alegra.",
    writesToStore: false,
    enabledByDefault: true,
  },
  {
    key: "products-sync",
    label: "Precios y publicación desde Alegra",
    group: "sincronizacion",
    description:
      "Lleva a las tiendas el precio de la lista de Alegra y decide si el producto se ve o no según sus existencias.",
    impactIfOff: "Los precios de las tiendas no cambian solos. Quedan como están hoy.",
    writesToStore: true,
    enabledByDefault: false,
  },
  {
    key: "inventory-adjustments",
    label: "Existencias desde Alegra",
    group: "sincronizacion",
    description: "Ajusta las cantidades disponibles de cada tienda para que coincidan con Alegra.",
    impactIfOff: "Las tiendas siguen mostrando las cantidades que tienen hoy, aunque no cuadren con Alegra.",
    writesToStore: true,
    enabledByDefault: false,
  },
  {
    key: "billing-report",
    label: "Reporte mensual de consumo",
    group: "mantenimiento",
    description: "Envía una vez al mes el resumen de consumo del cliente.",
    impactIfOff: "No se envía el reporte mensual.",
    writesToStore: false,
    enabledByDefault: true,
  },
  {
    key: "log-retention",
    label: "Limpieza de registros",
    group: "mantenimiento",
    description: "Borra los registros de actividad más antiguos para que no crezcan sin control.",
    impactIfOff: "Los registros crecen sin límite y terminan llenando el disco del servidor.",
    writesToStore: false,
    enabledByDefault: true,
  },
  {
    key: "health-monitor",
    label: "Vigilancia del servicio",
    group: "mantenimiento",
    description: "Comprueba periódicamente que la mensajería y las conexiones sigan vivas, y avisa si algo se cae.",
    impactIfOff: "Una caída puede pasar desapercibida.",
    writesToStore: false,
    enabledByDefault: true,
  },
];

const BY_KEY = new Map<string, WorkerDefinition>(WORKER_CATALOG.map((w) => [w.key, w]));

export function isWorkerKey(value: unknown): value is WorkerKey {
  return typeof value === "string" && BY_KEY.has(value);
}

export function getWorkerDefinition(key: WorkerKey): WorkerDefinition {
  const found = BY_KEY.get(key);
  if (!found) throw new Error(`worker desconocido: ${key}`);
  return found;
}
