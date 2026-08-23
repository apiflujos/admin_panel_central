import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { REQUISITOS } from "../../packages/shared/src/requisitos-worker";
import { WORKER_CATALOG } from "../../packages/shared/src/workers";

/**
 * Prevenir en vez de fallar.
 *
 * Un trabajo que se lanza sin poder terminar produce montones de errores
 * idénticos y no arregla nada: 37 pedidos sin cédula generaron 611 intentos
 * fallidos en una semana.
 *
 * Estas pruebas exigen que los requisitos estén DECLARADOS y COMPROBADOS antes
 * de lanzar, no descubiertos a mitad de la tarea.
 */
const WORKERS = path.resolve(__dirname, "../../apps/workers/src");

function fuenteDe(archivo: string) {
  return fs.readFileSync(path.join(WORKERS, archivo), "utf8");
}

describe("los requisitos se comprueban ANTES de lanzar la tarea", () => {
  it.each([
    ["pollers/products-sync.ts", "products-sync"],
    ["pollers/inventory-adjustments.ts", "inventory-adjustments"],
    ["pollers/orders-sync.ts", "orders-sync"],
  ])("%s comprueba los suyos por tienda", (archivo, clave) => {
    const fuente = fuenteDe(archivo);
    expect(fuente).toContain(`puedeCorrerEnTienda("${clave}"`);
  });

  it("la comprobación va ANTES de tocar Alegra o Shopify", () => {
    for (const archivo of ["pollers/products-sync.ts", "pollers/inventory-adjustments.ts", "pollers/orders-sync.ts"]) {
      // Se descarta el bloque de imports: ahí aparecen los mismos nombres y
      // falsearían las posiciones.
      const completo = fuenteDe(archivo);
      const inicioCodigo = completo.lastIndexOf("\nimport ");
      const fuente = completo.slice(completo.indexOf("\n", inicioCodigo + 1));
      const posCheck = fuente.indexOf("puedeCorrerEnTienda(");
      const primerUso = Math.min(
        ...["ctx.alegra.", "ctx.shopify.", "syncAlegra", "syncShopifyOrderToAlegra("]
          .map((aguja) => fuente.indexOf(aguja))
          .filter((p) => p > -1)
      );
      expect(posCheck, archivo).toBeGreaterThan(-1);
      if (Number.isFinite(primerUso)) {
        expect(posCheck, `${archivo}: se comprueba después de empezar a trabajar`).toBeLessThan(primerUso);
      }
    }
  });

  it("todo trabajo del catálogo que ESCRIBE en la tienda declara requisitos", () => {
    for (const w of WORKER_CATALOG.filter((x) => x.writesToStore)) {
      expect(REQUISITOS[w.key], `${w.key} escribe en la tienda y no declara requisitos`).toBeTruthy();
    }
  });

  it("no se declara requisitos de un trabajo que no existe", () => {
    const claves = new Set(WORKER_CATALOG.map((w) => w.key));
    for (const k of Object.keys(REQUISITOS)) {
      expect(claves.has(k), `${k} no está en el catálogo de trabajos`).toBe(true);
    }
  });

  it("no poder leer la configuración NO se toma como permiso", () => {
    const servicio = fs.readFileSync(path.join(__dirname, "requisitos-worker.service.ts"), "utf8");
    expect(servicio).toContain("puedeCorrer: false");
    expect(servicio).toContain("NO es permiso");
  });
});
