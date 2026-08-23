import { z } from "zod";

/**
 * Qué necesita CADA trabajo para poder hacer su tarea, declarado y verificable.
 *
 * PREVENIR EN VEZ DE FALLAR
 * -------------------------
 * Lanzar una tarea que no puede terminar produce montones de errores idénticos,
 * ensucia los registros y no arregla nada: el pedido sin cédula del cliente
 * falló 611 veces en una semana. Si no se cumplen los requisitos, la tarea NO
 * SE LANZA y se dice qué falta.
 *
 * Los requisitos se declaran con Zod para que sean UN SOLO SITIO: el mismo
 * esquema valida en ejecución y describe qué hace falta para la pantalla. Un
 * requisito nuevo se añade aquí y se aplica en los dos lados a la vez.
 */

/** Contexto observable de una tienda, tal como lo ve el motor. */
export const contextoTiendaSchema = z.object({
  shopDomain: z.string().trim().min(1),
  tieneCredencialesShopify: z.boolean(),
  tieneCuentaAlegra: z.boolean(),
  syncEnabled: z.boolean(),
  creaClienteEnAlegra: z.boolean(),
  facturaPedidos: z.boolean(),
  mandaAlegraEnInventario: z.boolean(),
  mandaAlegraEnPrecios: z.boolean(),
  mandaAlegraEnPublicacion: z.boolean(),
  updateInShopify: z.boolean(),
  createInShopify: z.boolean(),
  tieneListaDePrecios: z.boolean(),
});

export type ContextoTienda = z.infer<typeof contextoTiendaSchema>;

export type RequisitoIncumplido = {
  /** Código estable, para agrupar y contar sin depender del texto. */
  codigo: string;
  /** Qué falta, en lenguaje de negocio. */
  motivo: string;
  /** Qué hay que hacer. */
  comoSeArregla: string;
};

export type VeredictoRequisitos = {
  puedeCorrer: boolean;
  faltantes: RequisitoIncumplido[];
};

type Regla = {
  codigo: string;
  /** true si la regla APLICA a esta tienda. Si no aplica, no se exige. */
  aplica: (c: ContextoTienda) => boolean;
  /** true si el requisito SE CUMPLE. */
  cumple: (c: ContextoTienda) => boolean;
  motivo: string;
  comoSeArregla: string;
};

const CREDENCIALES_SHOPIFY: Regla = {
  codigo: "sin_credenciales_shopify",
  aplica: () => true,
  cumple: (c) => c.tieneCredencialesShopify,
  motivo: "La tienda no tiene credenciales de Shopify válidas.",
  comoSeArregla: "Volver a conectar la tienda desde Configuración.",
};

const CUENTA_ALEGRA: Regla = {
  codigo: "sin_cuenta_alegra",
  aplica: () => true,
  cumple: (c) => c.tieneCuentaAlegra,
  motivo: "La tienda no tiene cuenta de Alegra asociada.",
  comoSeArregla: "Asociarle una cuenta de Alegra. Puede ser la misma que usa otra tienda.",
};

const SYNC_ENCENDIDO: Regla = {
  codigo: "sync_apagado",
  aplica: () => true,
  cumple: (c) => c.syncEnabled,
  motivo: "La sincronización de esta tienda está apagada.",
  comoSeArregla: "Encenderla en Configuración, en las reglas de la tienda.",
};

const CREA_CLIENTE: Regla = {
  codigo: "no_crea_cliente_en_alegra",
  aplica: (c) => c.facturaPedidos,
  cumple: (c) => c.creaClienteEnAlegra,
  motivo: "No da de alta al cliente nuevo en Alegra.",
  comoSeArregla:
    'Encender "Dar de alta al cliente nuevo en Alegra": sin eso, ningún comprador nuevo se puede facturar.',
};

const PERMISO_ESCRITURA: Regla = {
  codigo: "sin_permiso_de_escritura",
  aplica: () => true,
  cumple: (c) => c.updateInShopify || c.createInShopify,
  motivo: "Esta tienda no tiene permitido que se le escriba desde Alegra.",
  comoSeArregla: "Es un freno de seguridad. Revisar las reglas de escritura de la tienda antes de encenderlo.",
};

const LISTA_DE_PRECIOS: Regla = {
  codigo: "sin_lista_de_precios",
  aplica: (c) => c.mandaAlegraEnPrecios,
  cumple: (c) => c.tieneListaDePrecios,
  motivo: "No hay lista de precios de Alegra elegida para esta tienda.",
  comoSeArregla: "Elegir la lista en Configuración: sin ella no hay precio que aplicar.",
};

const ALEGRA_MANDA_INVENTARIO: Regla = {
  codigo: "la_tienda_manda_en_inventario",
  aplica: () => true,
  cumple: (c) => c.mandaAlegraEnInventario,
  motivo: "El inventario lo lleva la tienda, no Alegra.",
  comoSeArregla: 'Si Alegra debe mandar, cambiarlo en "Quién manda sobre cada cosa".',
};

const ALEGRA_MANDA_CATALOGO: Regla = {
  codigo: "la_tienda_manda_en_el_catalogo",
  aplica: () => true,
  cumple: (c) => c.mandaAlegraEnPrecios || c.mandaAlegraEnPublicacion,
  motivo: "Los precios y la publicación los lleva la tienda, no Alegra.",
  comoSeArregla: 'Si Alegra debe mandar, cambiarlo en "Quién manda sobre cada cosa".',
};

/**
 * Requisitos por trabajo.
 *
 * Los de facturación NO exigen permiso de escritura en la tienda: facturar es
 * leer el pedido y escribir en Alegra, no tocar el catálogo.
 */
export const REQUISITOS: Record<string, Regla[]> = {
  "webhook-dispatch": [CREDENCIALES_SHOPIFY, CUENTA_ALEGRA, SYNC_ENCENDIDO, CREA_CLIENTE],
  "orders-sync": [CREDENCIALES_SHOPIFY, CUENTA_ALEGRA, SYNC_ENCENDIDO, CREA_CLIENTE],
  "retry-queue": [CUENTA_ALEGRA],
  "alegra-reconcile": [CUENTA_ALEGRA],
  "products-sync": [
    CREDENCIALES_SHOPIFY,
    CUENTA_ALEGRA,
    SYNC_ENCENDIDO,
    ALEGRA_MANDA_CATALOGO,
    PERMISO_ESCRITURA,
    LISTA_DE_PRECIOS,
  ],
  "inventory-adjustments": [
    CREDENCIALES_SHOPIFY,
    CUENTA_ALEGRA,
    SYNC_ENCENDIDO,
    ALEGRA_MANDA_INVENTARIO,
    PERMISO_ESCRITURA,
  ],
};

/**
 * ¿Puede este trabajo correr sobre esta tienda?
 *
 * Valida primero la FORMA del contexto: si llega incompleto no se asume nada,
 * se responde que no puede correr. Un contexto a medias es exactamente el
 * momento en el que un valor ausente se lee como permiso.
 */
export function verificarRequisitos(workerKey: string, contexto: unknown): VeredictoRequisitos {
  const parsed = contextoTiendaSchema.safeParse(contexto);
  if (!parsed.success) {
    return {
      puedeCorrer: false,
      faltantes: [
        {
          codigo: "contexto_invalido",
          motivo: "No se pudo leer la configuración de la tienda.",
          comoSeArregla: "Revisar la conexión y la configuración de la tienda; no se asume nada por defecto.",
        },
      ],
    };
  }

  const reglas = REQUISITOS[workerKey];
  // Un trabajo sin requisitos declarados corre: son los de mantenimiento, que
  // no tocan tiendas. Añadir uno nuevo que SÍ las toque exige declararlos aquí,
  // y hay una prueba que lo vigila.
  if (!reglas) return { puedeCorrer: true, faltantes: [] };

  const faltantes = reglas
    .filter((r) => r.aplica(parsed.data) && !r.cumple(parsed.data))
    .map((r) => ({ codigo: r.codigo, motivo: r.motivo, comoSeArregla: r.comoSeArregla }));

  return { puedeCorrer: faltantes.length === 0, faltantes };
}

/** Una línea para el registro. */
export function resumirRequisitos(v: VeredictoRequisitos) {
  return v.faltantes.map((f) => f.codigo).join(", ");
}
