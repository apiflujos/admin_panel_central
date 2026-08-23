/**
 * ¿Está funcionando la automatización, tienda por tienda?
 *
 * POR QUÉ EXISTE
 * --------------
 * Un trabajo puede estar encendido y aun así no hacer nada, porque le falta
 * algo en ESA tienda: no hay cuenta de Alegra, no está la lista de precios, o
 * los productos del pedido no están enlazados. Y al revés: puede estar todo
 * listo y el trabajo apagado.
 *
 * Hasta ahora eso había que deducirlo cruzando pantallas. Aquí se responde de
 * un vistazo, por cada cruce TIENDA × TRABAJO, y se dice qué falta.
 *
 * Es puro: se prueba sin base de datos ni navegador.
 */
export type EstadoCruce =
  /** Encendido y con todo lo que necesita. */
  | "funcionando"
  /** Tiene todo lo que necesita, pero está apagado. */
  | "apagado"
  /** Encendido, pero le falta algo para poder trabajar. */
  | "le_falta_algo"
  /** No aplica a esta tienda (p. ej. nadie manda a Alegra sobre eso). */
  | "no_aplica";

/**
 * Hacia dónde mueve las cosas este trabajo.
 *
 * Importa para entender de un vistazo qué le pasa a cada sistema: quien opera
 * en la tienda y sólo quiere facturar necesita ver que lo único que sube es el
 * pedido, y que hacia la tienda no baja nada.
 */
export type DireccionCruce = "shopify_a_alegra" | "alegra_a_shopify";

export type CruceMatriz = {
  workerKey: string;
  workerLabel: string;
  direccion: DireccionCruce;
  estado: EstadoCruce;
  /** Qué le IMPIDE trabajar. Si hay algo aquí, no va a funcionar. */
  faltantes: string[];
  /**
   * Cosas que conviene saber pero NO impiden nada.
   *
   * La distinción importa: una matriz que marca como problema algo que
   * funciona perfectamente deja de creerse, y entonces tampoco se ven los
   * problemas de verdad.
   */
  notas: string[];
  /** Datos reales: cuántas cosas están atascadas ahora mismo. */
  atascados?: { cantidad: number; detalle: string };
};

export type FilaMatriz = {
  storeId: number;
  storeName: string;
  cruces: CruceMatriz[];
};

export type DatosTienda = {
  storeId: number;
  storeName: string;
  tieneShopify: boolean;
  tieneCuentaAlegra: boolean;
  facturaPedidos: boolean;
  creaClienteEnAlegra: boolean;
  tieneListaDePrecios: boolean;
  tieneBodega: boolean;
  mandaAlegraEnPrecios: boolean;
  mandaAlegraEnPublicacion: boolean;
  mandaAlegraEnInventario: boolean;
  /** Pedidos que ahora mismo no se pueden facturar, por motivo. */
  pedidosAtascados: { sinIdentificacion: number; productoSinEnlazar: number; otros: number };
};

export type EstadoMotores = Record<string, boolean>;

export const ETIQUETA_DIRECCION: Record<DireccionCruce, { corto: string; largo: string }> = {
  shopify_a_alegra: {
    corto: "La tienda → Alegra",
    largo: "Lo que sale de la tienda y llega a Alegra.",
  },
  alegra_a_shopify: {
    corto: "Alegra → la tienda",
    largo: "Lo que Alegra decide y baja a la tienda.",
  },
};

const DIRECCIONES: Record<string, DireccionCruce> = {
  "webhook-dispatch": "shopify_a_alegra",
  "orders-sync": "shopify_a_alegra",
  "products-sync": "alegra_a_shopify",
  "inventory-adjustments": "alegra_a_shopify",
};

const ETIQUETAS: Record<string, string> = {
  "webhook-dispatch": "Recepción de pedidos",
  "orders-sync": "Repaso de pedidos",
  "products-sync": "Precios y publicación",
  "inventory-adjustments": "Existencias",
};

function resolver(encendido: boolean, aplica: boolean, faltantes: string[]): EstadoCruce {
  if (!aplica) return "no_aplica";
  if (faltantes.length) return encendido ? "le_falta_algo" : "apagado";
  return encendido ? "funcionando" : "apagado";
}

export function construirMatriz(tiendas: DatosTienda[], motores: EstadoMotores): FilaMatriz[] {
  return tiendas.map((t) => {
    // ── Facturar: lo que necesita para poder emitir ────────────────────────
    const faltaFacturar: string[] = [];
    if (!t.tieneShopify) faltaFacturar.push("La tienda no está conectada con Shopify.");
    if (!t.tieneCuentaAlegra) faltaFacturar.push("No tiene cuenta de Alegra asociada.");
    if (!t.creaClienteEnAlegra)
      faltaFacturar.push("No da de alta al cliente nuevo en Alegra: los compradores nuevos no se podrán facturar.");

    const atascadosFacturar = (() => {
      const p = t.pedidosAtascados;
      const total = p.sinIdentificacion + p.productoSinEnlazar + p.otros;
      if (!total) return undefined;
      const partes: string[] = [];
      if (p.sinIdentificacion) partes.push(`${p.sinIdentificacion} sin cédula del cliente`);
      if (p.productoSinEnlazar) partes.push(`${p.productoSinEnlazar} con productos sin enlazar con Alegra`);
      if (p.otros) partes.push(`${p.otros} por otros motivos`);
      return { cantidad: total, detalle: partes.join(", ") };
    })();

    const cruces: CruceMatriz[] = [
      {
        workerKey: "webhook-dispatch",
        workerLabel: ETIQUETAS["webhook-dispatch"],
        direccion: DIRECCIONES["webhook-dispatch"],
        estado: resolver(Boolean(motores["webhook-dispatch"]), t.facturaPedidos, faltaFacturar),
        faltantes: t.facturaPedidos ? faltaFacturar : [],
        notas: [],
        atascados: atascadosFacturar,
      },
      {
        workerKey: "orders-sync",
        workerLabel: ETIQUETAS["orders-sync"],
        direccion: DIRECCIONES["orders-sync"],
        estado: resolver(Boolean(motores["orders-sync"]), t.facturaPedidos, faltaFacturar),
        faltantes: t.facturaPedidos ? faltaFacturar : [],
        notas: [],
      },
    ];

    // ── Precios y publicación ──────────────────────────────────────────────
    const aplicaPrecios = t.mandaAlegraEnPrecios || t.mandaAlegraEnPublicacion;
    const faltaPrecios: string[] = [];
    if (aplicaPrecios && !t.tieneCuentaAlegra) faltaPrecios.push("No tiene cuenta de Alegra asociada.");
    if (t.mandaAlegraEnPrecios && !t.tieneListaDePrecios)
      faltaPrecios.push("No tiene lista de precios de Alegra configurada: no hay precio que aplicar.");
    cruces.push({
      workerKey: "products-sync",
      workerLabel: ETIQUETAS["products-sync"],
      direccion: DIRECCIONES["products-sync"],
      estado: resolver(Boolean(motores["products-sync"]), aplicaPrecios, faltaPrecios),
      faltantes: aplicaPrecios ? faltaPrecios : [],
      notas: [],
    });

    // ── Existencias ────────────────────────────────────────────────────────
    const faltaStock: string[] = [];
    const notasStock: string[] = [];
    if (t.mandaAlegraEnInventario && !t.tieneCuentaAlegra) faltaStock.push("No tiene cuenta de Alegra asociada.");
    // Sin bodega elegida NO se rompe nada: el motor suma TODAS las bodegas de
    // Alegra. Sólo importa si la cuenta tiene más de una y se quiere acotar.
    if (t.mandaAlegraEnInventario && !t.tieneBodega)
      notasStock.push("No hay bodega elegida: se suman las existencias de todas las bodegas de Alegra.");
    cruces.push({
      workerKey: "inventory-adjustments",
      workerLabel: ETIQUETAS["inventory-adjustments"],
      direccion: DIRECCIONES["inventory-adjustments"],
      estado: resolver(Boolean(motores["inventory-adjustments"]), t.mandaAlegraEnInventario, faltaStock),
      faltantes: t.mandaAlegraEnInventario ? faltaStock : [],
      notas: t.mandaAlegraEnInventario ? notasStock : [],
    });

    return { storeId: t.storeId, storeName: t.storeName, cruces };
  });
}

/** Una frase para encabezar: qué tan bien va la cosa. */
export function resumirMatriz(filas: FilaMatriz[]) {
  const todos = filas.flatMap((f) => f.cruces);
  return {
    funcionando: todos.filter((c) => c.estado === "funcionando").length,
    apagados: todos.filter((c) => c.estado === "apagado").length,
    conProblemas: todos.filter((c) => c.estado === "le_falta_algo").length,
    atascados: todos.reduce((acc, c) => acc + (c.atascados?.cantidad || 0), 0),
  };
}
