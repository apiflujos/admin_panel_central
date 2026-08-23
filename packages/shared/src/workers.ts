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
  /** Qué hace, paso a paso, cuando le toca correr. */
  comoTrabaja: string;
  /**
   * Qué configuración OBEDECE cuando corre.
   *
   * El worker no se configura: se enciende o se apaga. Lo que se configura son
   * las reglas que sigue, y viven en otra pantalla. Sin esta relación escrita,
   * alguien ajusta una regla, no pasa nada, y no hay forma de saber que era
   * porque el motor estaba apagado.
   */
  obedeceA: string;
  /** Dónde se ajustan esas reglas. Vacío si no tiene configuración propia. */
  dondeSeAjusta: string;
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
    comoTrabaja:
      "Shopify avisa en cuanto entra un pedido. Este trabajo recoge ese aviso y lo convierte en factura de Alegra, en segundos.",
    obedeceA:
      "Las reglas de Pedidos y facturación de cada tienda: si el pedido sólo se registra, si además crea el cliente, o si se emite la factura.",
    dondeSeAjusta: "Más arriba en esta pantalla, en Pedidos y facturación",
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
    comoTrabaja: "Cada pocos minutos repasa los pedidos de la tienda y recupera los que se quedaron sin facturar.",
    obedeceA: "Las mismas reglas de Pedidos y facturación que usa la recepción de pedidos.",
    dondeSeAjusta: "Más arriba en esta pantalla, en Pedidos y facturación",
    writesToStore: false,
    enabledByDefault: true,
  },
  {
    key: "retry-queue",
    label: "Reintento de facturas fallidas",
    group: "facturacion",
    description: "Vuelve a intentar las facturas que fallaron por un error pasajero.",
    impactIfOff: "Las facturas que fallen se quedan fallidas hasta que alguien las reintente a mano.",
    comoTrabaja:
      "Toma las facturas que fallaron por un problema pasajero y las vuelve a intentar, espaciando los reintentos.",
    obedeceA: "Nada propio: repite el mismo trabajo con las reglas que ya estaban puestas.",
    dondeSeAjusta: "",
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
    comoTrabaja:
      "Repasa las facturas ya creadas y comprueba que sigan existiendo en Alegra y en qué estado están ante la DIAN.",
    obedeceA: "Nada propio. Sólo lee; nunca modifica.",
    dondeSeAjusta: "",
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
    comoTrabaja: "Recorre los productos que cambiaron en Alegra y lleva a las tiendas su precio y si deben verse o no.",
    obedeceA: "Quién manda en precios y publicación, y las listas de precios de cada tienda.",
    dondeSeAjusta: "En Configuración → Tiendas, en Quién manda sobre cada cosa",
    writesToStore: true,
    enabledByDefault: false,
  },
  {
    key: "inventory-adjustments",
    label: "Existencias desde Alegra",
    group: "sincronizacion",
    description: "Ajusta las cantidades disponibles de cada tienda para que coincidan con Alegra.",
    impactIfOff: "Las tiendas siguen mostrando las cantidades que tienen hoy, aunque no cuadren con Alegra.",
    comoTrabaja: "Lee los movimientos de inventario de Alegra y ajusta las cantidades disponibles de cada tienda.",
    obedeceA: "Quién manda sobre las existencias y qué bodegas alimentan cada tienda.",
    dondeSeAjusta: "En Configuración → Tiendas, en Quién manda sobre cada cosa",
    writesToStore: true,
    enabledByDefault: false,
  },
  {
    key: "billing-report",
    label: "Reporte mensual de consumo",
    group: "mantenimiento",
    description: "Envía una vez al mes el resumen de consumo del cliente.",
    impactIfOff: "No se envía el reporte mensual.",
    comoTrabaja: "Una vez al mes reúne el consumo del cliente y lo envía por correo.",
    obedeceA: "Nada propio.",
    dondeSeAjusta: "",
    writesToStore: false,
    enabledByDefault: true,
  },
  {
    key: "log-retention",
    label: "Limpieza de registros",
    group: "mantenimiento",
    description: "Borra los registros de actividad más antiguos para que no crezcan sin control.",
    impactIfOff: "Los registros crecen sin límite y terminan llenando el disco del servidor.",
    comoTrabaja: "Borra los registros de actividad más antiguos para que no llenen el disco.",
    obedeceA: "Nada propio.",
    dondeSeAjusta: "",
    writesToStore: false,
    enabledByDefault: true,
  },
  {
    key: "health-monitor",
    label: "Vigilancia del servicio",
    group: "mantenimiento",
    description: "Comprueba periódicamente que la mensajería y las conexiones sigan vivas, y avisa si algo se cae.",
    impactIfOff: "Una caída puede pasar desapercibida.",
    comoTrabaja:
      "Comprueba cada pocos minutos que las conexiones y la mensajería sigan vivas, y avisa si algo se cayó.",
    obedeceA: "Nada propio.",
    dondeSeAjusta: "",
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
