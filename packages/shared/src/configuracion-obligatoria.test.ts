import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { revisarConfiguracionObligatoria, resumirRevision } from "./configuracion-obligatoria";

const BASE = {
  generateInvoice: true,
  einvoiceEnabled: false,
  resolutionId: "",
  warehouseId: "1",
  applyPayment: false,
  paymentMethod: "",
  bankAccountId: "",
};

describe("configuración obligatoria para facturar", () => {
  it("si no se factura, NO hay nada obligatorio", () => {
    // Exigirle datos a quien no va a facturar es ruido: era una de las cosas
    // que hacía la pantalla incomprensible.
    const r = revisarConfiguracionObligatoria({ ...BASE, generateInvoice: false, warehouseId: "" });
    expect(r.noAplica).toBe(true);
    expect(r.listo).toBe(true);
    expect(r.faltantes).toEqual([]);
  });

  it("factura electrónica SIN resolución bloquea", () => {
    // La DIAN exige el número de resolución. Sin él Alegra no emite.
    const r = revisarConfiguracionObligatoria({ ...BASE, einvoiceEnabled: true, resolutionId: "" });
    expect(r.listo).toBe(false);
    expect(r.faltantes.find((f) => f.codigo === "resolution_id")?.gravedad).toBe("bloquea");
  });

  it("sin factura electrónica la resolución NO es obligatoria", () => {
    // Es el borrador de pruebas: no se emite a la DIAN, así que no hace falta.
    const r = revisarConfiguracionObligatoria({ ...BASE, einvoiceEnabled: false, resolutionId: "" });
    expect(r.faltantes.some((f) => f.codigo === "resolution_id")).toBe(false);
  });

  it("registrar el pago exige forma de pago y cuenta, pero no impide facturar", () => {
    const r = revisarConfiguracionObligatoria({ ...BASE, applyPayment: true });
    const codigos = r.faltantes.map((f) => f.codigo);
    expect(codigos).toContain("payment_method");
    expect(codigos).toContain("bank_account_id");
    // La factura sale; lo que queda sin registrar es el pago.
    expect(r.listo).toBe(true);
  });

  it("sin bodega avisa, pero no bloquea: se suman todas", () => {
    const r = revisarConfiguracionObligatoria({ ...BASE, warehouseId: "" });
    expect(r.faltantes.find((f) => f.codigo === "warehouse_id")?.gravedad).toBe("incompleta");
    expect(r.listo).toBe(true);
  });

  it("cada requisito explica POR QUÉ y CÓMO se arregla", () => {
    // Un código crudo como «resolution_id» no le sirve a nadie: es lo que se
    // escribía en el registro y por eso nadie sabía qué hacer.
    const r = revisarConfiguracionObligatoria({ ...BASE, einvoiceEnabled: true, applyPayment: true, warehouseId: "" });
    expect(r.faltantes.length).toBeGreaterThan(0);
    for (const falta of r.faltantes) {
      expect(falta.que.length).toBeGreaterThan(3);
      expect(falta.porQue.length).toBeGreaterThan(20);
      expect(falta.comoSeArregla.length).toBeGreaterThan(20);
    }
  });

  it("una configuración ilegible no se da por buena", () => {
    // Falla cerrado: sin datos, `generateInvoice` es false y no aplica; lo que
    // NO puede hacer es reventar.
    expect(() => revisarConfiguracionObligatoria(null)).not.toThrow();
    expect(() => revisarConfiguracionObligatoria("basura")).not.toThrow();
    expect(revisarConfiguracionObligatoria({ generateInvoice: "sí" }).noAplica).toBe(true);
  });

  it("el resumen dice el nombre de la tienda y qué pasa", () => {
    const bloqueada = revisarConfiguracionObligatoria({ ...BASE, einvoiceEnabled: true });
    expect(resumirRevision(bloqueada, "Becam")).toContain("Becam");
    expect(resumirRevision(bloqueada, "Becam")).toContain("NO puede facturar");
  });

  it("el MOTOR usa esta regla, no una copia suya", () => {
    // Dos copias de la misma regla acaban discrepando: ya nos pasó con
    // `sourceOfTruth` y con los dos constructores de la configuración.
    const motor = readFileSync(path.resolve(__dirname, "../../../src/services/shopify-to-alegra.service.ts"), "utf8");
    expect(motor).toContain("revisarConfiguracionObligatoria");
    // Y ya no rehace las comprobaciones a mano.
    expect(motor).not.toContain('blocking.push("resolution_id")');
    expect(motor).not.toContain('warnings.push("bank_account_id")');
  });
});
