import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * REGLA DE NEGOCIO: un pedido NUNCA deja de entrar.
 *
 * Entra con los datos que traiga. Que no se pueda facturar —falta la cédula,
 * hay un producto sin enlazar con Alegra— es otra cosa: se registra igual y se
 * le escribe el motivo.
 *
 * Antes el pedido sólo se guardaba en el modo "solo registrar" o DESPUÉS de
 * facturar con éxito. Un pedido que no se podía facturar no entraba nunca, y
 * como el motivo del bloqueo se escribe con un UPDATE sobre `orders`, ese UPDATE
 * no encontraba fila y el motivo se perdía en silencio.
 */
const FUENTE = fs.readFileSync(path.join(__dirname, "shopify-to-alegra.service.ts"), "utf8");

function cuerpoDelFlujo() {
  const ini = FUENTE.indexOf("async function syncShopifyOrderToAlegraInner(");
  expect(ini, "no se encontró el flujo del pedido").toBeGreaterThan(-1);
  const fin = FUENTE.indexOf("\nfunction buildOrderChecklist", ini);
  return FUENTE.slice(ini, fin > ini ? fin : undefined);
}

describe("un pedido siempre entra", () => {
  const cuerpo = cuerpoDelFlujo();

  it("se registra ANTES de cualquier salida temprana", () => {
    const posRegistro = cuerpo.indexOf("await upsertOrder(");
    const posPrimeraSalida = cuerpo.indexOf("return { handled: false");
    expect(posRegistro, "no se registra el pedido").toBeGreaterThan(-1);
    expect(posPrimeraSalida, "no hay salidas tempranas").toBeGreaterThan(-1);
    expect(posRegistro, "el pedido debe guardarse antes de poder salirse del flujo").toBeLessThan(posPrimeraSalida);
  });

  it("se registra incluso con la sincronización apagada", () => {
    // `orderMode === "off"` significa "no lo lleves a Alegra", no "piérdelo".
    const posRegistro = cuerpo.indexOf("await upsertOrder(");
    const posOff = cuerpo.indexOf('if (orderMode === "off")');
    expect(posOff).toBeGreaterThan(-1);
    expect(posRegistro).toBeLessThan(posOff);
  });

  it("un fallo al registrarlo no tumba el resto del flujo", () => {
    const trozo = cuerpo.slice(cuerpo.indexOf("await upsertOrder("), cuerpo.indexOf('if (orderMode === "off")'));
    expect(trozo).toContain(".catch(");
    expect(trozo).toContain("[pedidos] no se pudo registrar");
  });

  it("el motivo del bloqueo se escribe sobre un pedido que YA existe", () => {
    // `marcarPedidoNoFacturable` hace UPDATE: sin fila previa no marca nada.
    expect(FUENTE).toContain("UPDATE orders");
    const posRegistro = cuerpo.indexOf("await upsertOrder(");
    const posMarcado = cuerpo.indexOf("marcarPedidoNoFacturable(");
    expect(posMarcado).toBeGreaterThan(-1);
    expect(posRegistro).toBeLessThan(posMarcado);
  });
});
