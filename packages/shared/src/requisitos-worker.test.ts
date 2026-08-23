import { describe, expect, it } from "vitest";

import { REQUISITOS, contextoTiendaSchema, verificarRequisitos, type ContextoTienda } from "./requisitos-worker";

const TODO_OK: ContextoTienda = {
  shopDomain: "mut50d-tj.myshopify.com",
  tieneCredencialesShopify: true,
  tieneCuentaAlegra: true,
  syncEnabled: true,
  creaClienteEnAlegra: true,
  facturaPedidos: true,
  mandaAlegraEnInventario: true,
  mandaAlegraEnPrecios: true,
  mandaAlegraEnPublicacion: true,
  updateInShopify: true,
  createInShopify: true,
  tieneListaDePrecios: true,
};

const codigos = (k: string, c: Partial<ContextoTienda>) =>
  verificarRequisitos(k, { ...TODO_OK, ...c }).faltantes.map((f) => f.codigo);

describe("requisitos por trabajo", () => {
  it("con todo en orden, todos pueden correr", () => {
    for (const k of Object.keys(REQUISITOS)) {
      expect(verificarRequisitos(k, TODO_OK).puedeCorrer, k).toBe(true);
    }
  });

  it("NO se factura sin cuenta de Alegra", () => {
    expect(codigos("webhook-dispatch", { tieneCuentaAlegra: false })).toContain("sin_cuenta_alegra");
  });

  it("NO se factura si no se da de alta al cliente nuevo", () => {
    // Es el caso medido: 37 pedidos sin cédula, 611 intentos fallidos. Mejor
    // no lanzar la tarea que repetir el mismo error.
    expect(codigos("webhook-dispatch", { creaClienteEnAlegra: false })).toContain("no_crea_cliente_en_alegra");
  });

  it("ese requisito NO aplica si la tienda no factura", () => {
    // No se exige lo que no hace falta: exigir de más también paraliza.
    expect(codigos("webhook-dispatch", { creaClienteEnAlegra: false, facturaPedidos: false })).not.toContain(
      "no_crea_cliente_en_alegra"
    );
  });

  it("NO se aplican precios sin lista de precios elegida", () => {
    expect(codigos("products-sync", { tieneListaDePrecios: false })).toContain("sin_lista_de_precios");
  });

  it("NO se tocan las existencias si manda la tienda", () => {
    expect(codigos("inventory-adjustments", { mandaAlegraEnInventario: false })).toContain(
      "la_tienda_manda_en_inventario"
    );
  });

  it("NO se escribe en la tienda sin permiso de escritura", () => {
    const f = codigos("products-sync", { updateInShopify: false, createInShopify: false });
    expect(f).toContain("sin_permiso_de_escritura");
  });

  it("facturar NO exige permiso de escritura en la tienda", () => {
    // Facturar es leer el pedido y escribir en Alegra; no toca el catálogo.
    // Exigirlo dejaría sin facturar a quien tiene la escritura cerrada a
    // propósito, que es justo la configuración segura.
    const f = codigos("webhook-dispatch", { updateInShopify: false, createInShopify: false });
    expect(f).not.toContain("sin_permiso_de_escritura");
  });

  it("un contexto INCOMPLETO no se interpreta como permiso", () => {
    // Un valor ausente leído como "sí" es exactamente el fallo que despublicó
    // el catálogo el 2026-08-20.
    for (const malo of [{}, null, undefined, { shopDomain: "x" }, "texto", 42]) {
      const v = verificarRequisitos("products-sync", malo);
      expect(v.puedeCorrer, JSON.stringify(malo)).toBe(false);
      expect(v.faltantes[0].codigo).toBe("contexto_invalido");
    }
  });

  it("el esquema rechaza tipos equivocados, no sólo campos ausentes", () => {
    expect(contextoTiendaSchema.safeParse({ ...TODO_OK, syncEnabled: "sí" }).success).toBe(false);
    expect(contextoTiendaSchema.safeParse({ ...TODO_OK, shopDomain: "" }).success).toBe(false);
  });

  it("acumula TODO lo que falta, no sólo el primero", () => {
    const f = codigos("products-sync", {
      tieneCuentaAlegra: false,
      syncEnabled: false,
      tieneListaDePrecios: false,
    });
    expect(f.length).toBeGreaterThanOrEqual(3);
  });

  it("cada requisito dice cómo se arregla", () => {
    const v = verificarRequisitos("products-sync", {
      ...TODO_OK,
      tieneCuentaAlegra: false,
      tieneListaDePrecios: false,
      updateInShopify: false,
      createInShopify: false,
    });
    for (const f of v.faltantes) {
      expect(f.comoSeArregla.length, f.codigo).toBeGreaterThan(20);
      expect(f.motivo.length, f.codigo).toBeGreaterThan(15);
    }
  });

  it("todo trabajo que toca tiendas tiene requisitos declarados", () => {
    // Un trabajo nuevo que escriba sin declararlos correría a ciegas.
    for (const k of ["webhook-dispatch", "orders-sync", "products-sync", "inventory-adjustments"]) {
      expect(REQUISITOS[k], k).toBeTruthy();
      expect(REQUISITOS[k].length, k).toBeGreaterThan(0);
    }
  });
});
