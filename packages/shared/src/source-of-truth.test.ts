import { describe, expect, it } from "vitest";

import {
  DEFAULT_SOURCE_OF_TRUTH,
  SOURCE_OF_TRUTH_AREAS,
  SOURCE_OF_TRUTH_LABELS,
  alegraMandaEn,
  facturarIgnorandoExistencias,
  normalizeSourceOfTruth,
} from "./source-of-truth";

describe("dueño de la verdad", () => {
  it("por omisión manda Alegra en todo: es lo que impide sobrevender", () => {
    expect(DEFAULT_SOURCE_OF_TRUTH).toEqual({
      inventory: "alegra",
      prices: "alegra",
      publication: "alegra",
      catalog: "alegra",
    });
  });

  it("un valor ausente o basura NO cambia quién manda", () => {
    // Que la tienda pase a mandar sobre el inventario tiene que ser una
    // decisión explícita, nunca el efecto de un campo mal escrito.
    expect(normalizeSourceOfTruth(undefined)).toEqual(DEFAULT_SOURCE_OF_TRUTH);
    expect(normalizeSourceOfTruth(null)).toEqual(DEFAULT_SOURCE_OF_TRUTH);
    expect(normalizeSourceOfTruth({ inventory: "woocommerce" })).toEqual(DEFAULT_SOURCE_OF_TRUTH);
    expect(normalizeSourceOfTruth({ inventory: true })).toEqual(DEFAULT_SOURCE_OF_TRUTH);
    expect(normalizeSourceOfTruth("shopify")).toEqual(DEFAULT_SOURCE_OF_TRUTH);
  });

  it("se puede elegir área por área", () => {
    const sot = normalizeSourceOfTruth({ inventory: "shopify", prices: "alegra" });
    expect(sot.inventory).toBe("shopify");
    expect(sot.prices).toBe("alegra");
    expect(sot.publication).toBe("alegra");
  });

  it("quien lleva el inventario en la tienda factura sin mirar existencias", () => {
    // Es el caso de quien usa Alegra SÓLO para facturar.
    expect(facturarIgnorandoExistencias(normalizeSourceOfTruth({ inventory: "shopify" }))).toBe(true);
    expect(facturarIgnorandoExistencias(DEFAULT_SOURCE_OF_TRUTH)).toBe(false);
  });

  it("alegraMandaEn responde por área", () => {
    const sot = normalizeSourceOfTruth({ inventory: "shopify" });
    expect(alegraMandaEn(sot, "inventory")).toBe(false);
    expect(alegraMandaEn(sot, "prices")).toBe(true);
  });

  it("cada área tiene etiqueta y explicación para las DOS opciones", () => {
    for (const area of SOURCE_OF_TRUTH_AREAS) {
      const info = SOURCE_OF_TRUTH_LABELS[area];
      expect(info, area).toBeTruthy();
      expect(info.label.length, area).toBeGreaterThan(2);
      expect(info.help.alegra.length, area).toBeGreaterThan(25);
      expect(info.help.shopify.length, area).toBeGreaterThan(25);
    }
  });
});

describe("robustez ante configuraciones incompletas", () => {
  it("un contexto SIN dueño de la verdad no revienta: manda Alegra", () => {
    // Puede ocurrir con una configuración vieja o un objeto armado a mano.
    // Reventar aquí tumbaría la sincronización entera.
    expect(alegraMandaEn(undefined, "inventory")).toBe(true);
    expect(alegraMandaEn(null, "prices")).toBe(true);
    expect(facturarIgnorandoExistencias(undefined)).toBe(false);
  });

  it("un dueño a medio construir se completa con los valores por omisión", () => {
    const parcial = { inventory: "shopify" } as never;
    expect(alegraMandaEn(parcial, "inventory")).toBe(false);
    expect(alegraMandaEn(parcial, "publication")).toBe(true);
  });
});
