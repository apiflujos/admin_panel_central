import { describe, expect, it } from "vitest";

import { preflightDeFacturacion, resumirBloqueos } from "./invoice-preflight";

const PEDIDO_COMPLETO = {
  identificacion: "1028024790",
  nombreCliente: "Ana Ruiz",
  email: "ana@ejemplo.com",
  moneda: "COP",
  total: "150000",
  lineas: [{ alegraItemId: "2001", nombre: "Labial" }],
};

describe("prever de facturación", () => {
  it("un pedido completo se puede facturar", () => {
    const r = preflightDeFacturacion(PEDIDO_COMPLETO);
    expect(r.facturable).toBe(true);
    expect(r.bloqueos).toEqual([]);
    expect(r.permanente).toBe(false);
  });

  it("sin identificación NO se factura, y no tiene sentido reintentar", () => {
    // Es la causa nº1 en producción: 37 pedidos en 7 días. Reintentarlos 611
    // veces no los arregló ninguna vez.
    const r = preflightDeFacturacion({ ...PEDIDO_COMPLETO, identificacion: null });
    expect(r.facturable).toBe(false);
    expect(r.permanente).toBe(true);
    expect(r.bloqueos[0].codigo).toBe("sin_identificacion");
    expect(r.bloqueos[0].comoSeArregla).toContain("cédula");
  });

  it("los espacios en blanco no cuentan como identificación", () => {
    expect(preflightDeFacturacion({ ...PEDIDO_COMPLETO, identificacion: "   " }).facturable).toBe(false);
  });

  it("un artículo sin enlazar con Alegra bloquea, y dice cuáles", () => {
    const r = preflightDeFacturacion({
      ...PEDIDO_COMPLETO,
      lineas: [
        { alegraItemId: "2001", nombre: "Labial" },
        { alegraItemId: null, nombre: "Rubor Bardot" },
      ],
    });
    expect(r.facturable).toBe(false);
    expect(r.bloqueos[0].codigo).toBe("articulos_sin_mapear");
    expect(r.bloqueos[0].motivo).toContain("Rubor Bardot");
    expect(r.bloqueos[0].motivo).toContain("1 de 2");
  });

  it("un pedido sin líneas no es una factura válida", () => {
    const r = preflightDeFacturacion({ ...PEDIDO_COMPLETO, lineas: [] });
    expect(r.bloqueos.map((b) => b.codigo)).toContain("sin_lineas");
  });

  it("acumula TODOS los bloqueos, no sólo el primero", () => {
    // Para que quien lo arregle vea la lista completa de una vez.
    const r = preflightDeFacturacion({});
    const codigos = r.bloqueos.map((b) => b.codigo);
    expect(codigos).toContain("sin_identificacion");
    expect(codigos).toContain("sin_nombre");
    expect(codigos).toContain("sin_lineas");
    expect(codigos).toContain("sin_moneda");
    expect(codigos).toContain("sin_total");
  });

  it("el correo avisa pero NO bloquea: la factura puede existir sin él", () => {
    const r = preflightDeFacturacion({ ...PEDIDO_COMPLETO, email: null });
    expect(r.facturable).toBe(true);
    expect(r.avisos[0]).toContain("correo");
  });

  it("quien no emite factura electrónica puede no exigir identificación", () => {
    const r = preflightDeFacturacion({ ...PEDIDO_COMPLETO, identificacion: null }, { exigirIdentificacion: false });
    expect(r.facturable).toBe(true);
  });

  it("cada bloqueo explica cómo se arregla", () => {
    const r = preflightDeFacturacion({});
    for (const b of r.bloqueos) {
      expect(b.comoSeArregla.length, b.codigo).toBeGreaterThan(20);
      expect(b.motivo.length, b.codigo).toBeGreaterThan(10);
    }
  });

  it("resumirBloqueos da una línea para el log", () => {
    expect(resumirBloqueos(preflightDeFacturacion(PEDIDO_COMPLETO))).toBe("");
    expect(resumirBloqueos(preflightDeFacturacion({}))).toContain("documento de identidad");
  });
});
