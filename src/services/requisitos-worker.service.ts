import { buildSyncContext } from "./sync-context";
import { getStoreConfigForDomain } from "./store-configs.service";
import {
  resumirRequisitos,
  verificarRequisitos,
  type ContextoTienda,
  type VeredictoRequisitos,
} from "../../packages/shared/src/requisitos-worker";

/**
 * Comprueba, ANTES de lanzar la tarea, si el trabajo puede hacerla en esta
 * tienda.
 *
 * Prevenir en vez de fallar: una tarea que no puede terminar sólo produce
 * errores repetidos. El caso medido fue 611 intentos fallidos en una semana por
 * 37 pedidos a los que les faltaba la cédula del cliente.
 */
export async function puedeCorrerEnTienda(workerKey: string, shopDomain: string): Promise<VeredictoRequisitos> {
  let contexto: ContextoTienda;
  try {
    const ctx = await buildSyncContext(shopDomain);
    const store = await getStoreConfigForDomain(shopDomain);
    const listas = store?.priceLists;
    contexto = {
      shopDomain,
      // Si el contexto se construyó, hay credenciales: `buildSyncContext`
      // lanza si no puede montar el cliente de Shopify.
      tieneCredencialesShopify: Boolean(ctx.shopDomain),
      tieneCuentaAlegra: Boolean(store?.alegraAccountId),
      syncEnabled: ctx.syncEnabled,
      creaClienteEnAlegra: Boolean(store?.sync?.contacts?.createInAlegra),
      facturaPedidos: store?.sync?.orders?.shopifyToAlegra === "invoice",
      mandaAlegraEnInventario: ctx.sourceOfTruth.inventory === "alegra",
      mandaAlegraEnPrecios: ctx.sourceOfTruth.prices === "alegra",
      mandaAlegraEnPublicacion: ctx.sourceOfTruth.publication === "alegra",
      updateInShopify: ctx.updateInShopify,
      createInShopify: ctx.createInShopify,
      tieneListaDePrecios: Boolean(listas?.generalId || listas?.wholesaleId || listas?.discountId),
    };
  } catch (error) {
    // No poder leer la configuración NO es permiso: se responde que no puede.
    console.error(
      `[requisitos] no se pudo leer la configuración de ${shopDomain} para "${workerKey}":`,
      error instanceof Error ? error.message : error
    );
    return {
      puedeCorrer: false,
      faltantes: [
        {
          codigo: "contexto_invalido",
          motivo: "No se pudo leer la configuración de la tienda.",
          comoSeArregla: "Revisar la conexión de la tienda.",
        },
      ],
    };
  }

  const veredicto = verificarRequisitos(workerKey, contexto);
  if (!veredicto.puedeCorrer) {
    // Una línea por tienda y pasada, no una por ítem: lo que ensucia el
    // registro es repetir el mismo fallo miles de veces.
    console.warn(`[requisitos] "${workerKey}" NO corre en ${shopDomain}: ${resumirRequisitos(veredicto)}`);
  }
  return veredicto;
}
