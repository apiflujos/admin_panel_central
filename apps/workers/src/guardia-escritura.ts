import { runWithOrg } from "../../../src/db";
import { buildSyncContext } from "../../../src/services/sync-context";
import { listConnectedShopifyDomains } from "../../../src/services/store-connections.service";
import { withEachOrganization } from "../../../src/services/organizations.service";

/**
 * Doble check automático al arrancar los workers.
 *
 * Comprueba, EJECUTANDO la resolución real de configuración, qué permisos de
 * escritura hacia Shopify tiene cada tienda, y lo deja escrito en el log.
 *
 * Existe porque leer el código no basta: el 2026-08-20 el kill switch parecía
 * correcto en `sync-context` (`updateInShopify === true`) mientras una capa
 * previa normalizaba el valor a `true`, de modo que no bloqueaba nada. Se
 * despublicaron 1.028 productos, y otros 836 después de dar el blindaje por
 * bueno mirando el binario. La única comprobación válida es resolver el
 * contexto de verdad y mirar el resultado.
 *
 * No bloquea el arranque: informa. Bloquear dejaría el sync caído por un fallo
 * de lectura de configuración, y el freno real vive en el conector.
 */
export async function verificarPermisosDeEscritura() {
  try {
    await withEachOrganization(async () => {
      const dominios = await listConnectedShopifyDomains().catch(() => [] as string[]);
      if (!dominios.length) return;
      for (const shopDomain of dominios) {
        try {
          const ctx = await buildSyncContext(shopDomain);
          const escribe = ctx.updateInShopify || ctx.createInShopify;
          const detalle =
            `updateInShopify=${ctx.updateInShopify} createInShopify=${ctx.createInShopify}` +
            ` autoPublishOnWebhook=${ctx.autoPublishOnWebhook} syncEnabled=${ctx.syncEnabled}` +
            ` outOfStockBehavior=${ctx.outOfStockBehavior} allowOversell=${ctx.allowOversell}` +
            ` trackInventory=${ctx.trackInventory}`;

          // «Agotado» sólo impide la venta si la tienda tiene PROHIBIDA la venta
          // sin existencias y lleva la cuenta del inventario. Con allowOversell
          // el producto se queda publicado Y vendible a cero: sobreventa
          // garantizada, que es justo lo que la regla de negocio prohíbe.
          if (ctx.outOfStockBehavior === "mark_sold_out" && (ctx.allowOversell || !ctx.trackInventory)) {
            console.error(
              `[guardia-escritura] ${shopDomain}: COMBINACIÓN PELIGROSA — se marca AGOTADO en vez de` +
                ` despublicar, pero allowOversell=${ctx.allowOversell} y trackInventory=${ctx.trackInventory}.` +
                " El producto quedaría publicado Y vendible sin existencias. Corrige la configuración" +
                ' de la tienda o cambia outOfStockBehavior a "unpublish".'
            );
          }
          if (escribe) {
            console.warn(
              `[guardia-escritura] ${shopDomain}: ESCRITURA HABILITADA hacia Shopify — ${detalle}.` +
                " Si no es intencionado, revísalo YA: así se despublicó el catálogo el 2026-08-20."
            );
          } else {
            console.log(`[guardia-escritura] ${shopDomain}: sólo lectura (${detalle})`);
          }
        } catch (error) {
          console.warn(
            `[guardia-escritura] ${shopDomain}: no se pudo verificar —`,
            error instanceof Error ? error.message : error
          );
        }
      }
    });
  } catch (error) {
    console.warn(
      "[guardia-escritura] no se pudo recorrer las organizaciones:",
      error instanceof Error ? error.message : error
    );
  }
}
