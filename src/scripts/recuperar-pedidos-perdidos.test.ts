import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

/**
 * La recuperación toca pedidos reales de un cliente que ya sufrió miles de
 * facturas fallidas. Estas pruebas fijan por contrato lo que NO debe hacer,
 * porque una regresión aquí se paga en facturas emitidas a la DIAN.
 */
describe("recuperar-pedidos-perdidos", () => {
  const leer = () => readFile(new URL("./recuperar-pedidos-perdidos.ts", import.meta.url), "utf8");

  it("NO factura: no llama a ninguna función de facturación", async () => {
    const fuente = await leer();
    for (const prohibido of [
      "syncShopifyOrderToAlegra",
      "retryInvoiceFromLog",
      "buildInvoicePayload",
      "createInvoice",
      "processQueuedWebhookEvent",
    ]) {
      expect(fuente).not.toContain(prohibido);
    }
  });

  it("no escribe nada sin --aplicar", async () => {
    const fuente = await leer();
    // El upsert tiene que quedar DESPUÉS de la salida temprana del modo informe.
    const salidaInforme = fuente.indexOf("if (!APLICAR)");
    const upsert = fuente.indexOf("await upsertOrder(");
    expect(salidaInforme).toBeGreaterThan(-1);
    expect(upsert).toBeGreaterThan(salidaInforme);
  });

  it("no marca un veredicto que no puede comprobar", async () => {
    const fuente = await leer();
    // Sin consultar Alegra no se sabe si el cliente ya tiene su cédula
    // guardada, así que escribir `no_facturable` produciría etiquetas falsas.
    expect(fuente).not.toContain("marcarPedidoNoFacturable");
    expect(fuente).not.toContain("sync_block_reason");
  });

  it("usa el mapeo de contacto DEL MOTOR, no una copia de la regla", async () => {
    const fuente = await leer();
    expect(fuente).toContain("mapShopifyToAlegraContact");
  });

  it("solo mira pedidos que no estan en la plataforma", async () => {
    const fuente = await leer();
    expect(fuente).toContain("o.shopify_order_id IS NULL");
    expect(fuente).toContain("'pending', 'failed'");
  });

  it("valida cada fila con Zod en vez de confiar en el payload guardado", async () => {
    const fuente = await leer();
    expect(fuente).toContain("filaSchema.safeParse");
    // Un payload ilegible no puede tumbar la recuperación entera.
    expect(fuente).toContain("continue;");
  });
});
