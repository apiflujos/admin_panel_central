import { describe, expect, it } from "vitest";

import { toAdminWebOrderRowDto } from "./orders";

const BASE = {
  shopify_order_id: "7239577993446",
  shopify_order_number: "#1667",
  customer_name: "Ana Ruiz",
  alegra_status: "pendiente",
};

const pintar = (extra: Record<string, unknown>) =>
  toAdminWebOrderRowDto({
    row: { ...BASE, ...extra },
    override: null,
    einvoiceEnabled: false,
    missing: [],
  });

/**
 * Un pedido que no se puede facturar tiene que decirlo EN EL PEDIDO.
 *
 * El prever ya guarda el motivo en `orders.sync_block_reason`, pero si no llega
 * a la pantalla el pedido aparece como "pendiente" sin más: nadie sabe que le
 * falta la cédula del cliente ni que hasta que alguien la complete no avanzará.
 */
describe("el motivo de bloqueo llega hasta la fila del pedido", () => {
  it("un pedido normal no lleva bloqueo", () => {
    expect(pintar({ sync_status: "pending" }).bloqueo).toBeNull();
    expect(pintar({}).bloqueo).toBeNull();
  });

  it("un pedido marcado no facturable trae su motivo y cómo se arregla", () => {
    const fila = pintar({
      sync_status: "no_facturable",
      sync_block_reason: {
        bloqueos: [
          {
            codigo: "sin_identificacion",
            motivo: "El pedido no trae el documento de identidad del cliente.",
            comoSeArregla: "Pedir la cédula en el checkout, o cargarla a mano en el pedido.",
          },
        ],
      },
    });
    expect(fila.bloqueo?.motivos).toHaveLength(1);
    expect(fila.bloqueo?.motivos[0].motivo).toContain("documento de identidad");
    expect(fila.bloqueo?.motivos[0].comoSeArregla).toContain("cédula");
  });

  it("acumula varios motivos si hay varios", () => {
    const fila = pintar({
      sync_status: "no_facturable",
      sync_block_reason: {
        bloqueos: [
          { motivo: "Falta la cédula.", comoSeArregla: "Pedirla." },
          { motivo: "Hay productos sin enlazar.", comoSeArregla: "Enlazarlos." },
        ],
      },
    });
    expect(fila.bloqueo?.motivos).toHaveLength(2);
  });

  it("si está marcado pero sin detalle, igual avisa", () => {
    // Preferible a que el pedido aparezca como "pendiente" sin explicación.
    const fila = pintar({ sync_status: "no_facturable", sync_block_reason: null });
    expect(fila.bloqueo?.motivos[0].motivo).toBe("No se pudo facturar.");
  });

  it("un motivo guardado a medias no rompe la pantalla", () => {
    const fila = pintar({
      sync_status: "no_facturable",
      sync_block_reason: { bloqueos: [{ motivo: "" }, { motivo: "Falta la cédula." }] },
    });
    expect(fila.bloqueo?.motivos).toHaveLength(1);
    expect(fila.bloqueo?.motivos[0].comoSeArregla).toBe("");
  });
});
