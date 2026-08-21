import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * A las escrituras de catálogo hacia las tiendas se llega por SEIS caminos, y
 * sólo UNO es un worker:
 *
 *   1. poller `products-sync`                    (worker, apagado por omisión)
 *   2. poller `inventory-adjustments`            (worker, apagado por omisión)
 *   3. webhook de Alegra item.created/updated    -> lo transporta `webhook-dispatch`
 *   4. webhook de Alegra inventory.updated       -> lo transporta `webhook-dispatch`
 *   5. cola de reintentos                        -> `retry-queue`
 *   6. asistente de IA y endpoints de productos  -> HTTP directo
 *
 * `webhook-dispatch` y `retry-queue` están ENCENDIDOS por omisión porque hacen
 * falta para facturar. Si el freno viviera sólo en el bucle de los pollers,
 * apagar la sincronización en Super Admin no impediría que un webhook de Alegra
 * cambiara precios, existencias y publicaciones.
 *
 * Por eso el freno vive en las DOS funciones donde desembocan los seis caminos.
 */
const SERVICIO = fs.readFileSync(path.join(__dirname, "alegra-to-shopify.service.ts"), "utf8");

function cuerpoDeFuncion(nombre: string) {
  const inicio = SERVICIO.indexOf(`export async function ${nombre}(`);
  expect(inicio, `no se encontró ${nombre}`).toBeGreaterThan(-1);
  const siguiente = SERVICIO.indexOf("\nexport async function ", inicio + 1);
  return SERVICIO.slice(inicio, siguiente === -1 ? undefined : siguiente);
}

describe("el freno de catálogo cubre TODOS los caminos, no sólo los pollers", () => {
  it("precio y publicación se frenan con el interruptor de products-sync", () => {
    expect(cuerpoDeFuncion("syncAlegraItemPayloadToShopify")).toContain('isWorkerEnabled("products-sync")');
  });

  it("las existencias se frenan con el interruptor de inventory-adjustments", () => {
    expect(cuerpoDeFuncion("syncAlegraInventoryPayloadToShopify")).toContain(
      'isWorkerEnabled("inventory-adjustments")'
    );
  });

  it("el freno va ANTES de cualquier llamada a Shopify", () => {
    for (const [nombre, clave] of [
      ["syncAlegraItemPayloadToShopify", "products-sync"],
      ["syncAlegraInventoryPayloadToShopify", "inventory-adjustments"],
    ] as const) {
      const cuerpo = cuerpoDeFuncion(nombre);
      const posFreno = cuerpo.indexOf(`isWorkerEnabled("${clave}")`);
      const primeraEscritura = Math.min(
        ...["ctx.shopify.", "withRetry("].map((aguja) => cuerpo.indexOf(aguja)).filter((pos) => pos > -1)
      );
      expect(posFreno, nombre).toBeGreaterThan(-1);
      expect(primeraEscritura, nombre).toBeGreaterThan(posFreno);
    }
  });

  it("los seis caminos siguen desembocando en esas dos funciones", () => {
    // Si alguien añade una función que llame a ctx.shopify sin pasar por ellas,
    // se abre un agujero nuevo. Estas son las únicas puertas permitidas.
    for (const envoltorio of ["syncAlegraItemToShopify", "syncAlegraInventoryToShopify", "syncAlegraInventoryById"]) {
      const cuerpo = cuerpoDeFuncion(envoltorio);
      expect(
        /return syncAlegraItemPayloadToShopify\(|return syncAlegraInventoryPayloadToShopify\(/.test(cuerpo),
        `${envoltorio} debe delegar en una de las dos funciones con freno`
      ).toBe(true);
    }
  });
});
