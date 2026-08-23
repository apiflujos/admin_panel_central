import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * La pantalla y el motor tienen que decir LO MISMO.
 *
 * `store-config.service` es lo que el motor obedece; `store-configs.service`
 * alimenta la pantalla. Son dos módulos distintos con dos normalizadores
 * distintos, y se habían separado: para `alegraToShopify` —el ajuste que crea
 * pedidos en la tienda a partir de facturas de Alegra— la pantalla mostraba
 * "draft" en cuanto había conexión, mientras el motor resolvía "off".
 *
 * No hubo daño porque manda el motor, pero la pantalla mentía sobre lo que iba
 * a pasar, que es justo lo que hace que nadie se fíe de la configuración.
 */
const RAIZ = path.resolve(__dirname, "..", "..");
const MOTOR = fs.readFileSync(path.join(RAIZ, "src/services/store-config.service.ts"), "utf8");
const PANTALLA = fs.readFileSync(path.join(RAIZ, "src/services/store-configs.service.ts"), "utf8");

describe("los modos de pedido se resuelven igual en pantalla y en motor", () => {
  it("ninguno de los dos inventa un modo por omisión cuando no hay valor guardado", () => {
    // La forma del fallo: `x === undefined && pairConnected ? "algo" : normalizar(x)`.
    // Ese "algo" activa un comportamiento que nadie eligió.
    expect(PANTALLA).not.toMatch(/alegraToShopify === undefined && pairConnected/);
    expect(MOTOR).not.toMatch(/alegraToShopify === undefined && pairConnected/);
  });

  it("los dos normalizadores caen en 'off' ante un valor ausente o inválido", () => {
    for (const [nombre, fuente] of [
      ["motor", MOTOR],
      ["pantalla", PANTALLA],
    ] as const) {
      const ini = fuente.indexOf("normalizeAlegraOrderMode");
      const cuerpo = fuente.slice(ini, ini + 260);
      expect(cuerpo, nombre).toContain('return "off"');
    }
  });

  it("crear pedidos en la tienda nunca es el valor por omisión", () => {
    // Escribir en la tienda debe ser SIEMPRE una decisión explícita, igual que
    // createInShopify y updateInShopify.
    expect(PANTALLA).toContain("const alegraToShopify = normalizeAlegraOrderMode(orderSync.alegraToShopify);");
  });
});
