import { describe, expect, it } from "vitest";

import {
  normalizePriceListId,
  parsePriceValue,
  resolveAlegraInventoryQuantity,
  resolvePriceListId,
} from "./store-products-sync.service";

describe("parsePriceValue", () => {
  it("acepta números finitos", () => {
    expect(parsePriceValue(100)).toBe(100);
    expect(parsePriceValue(0)).toBe(0);
    expect(parsePriceValue(-50.5)).toBe(-50.5);
  });

  it("rechaza NaN e Infinity", () => {
    expect(parsePriceValue(NaN)).toBe(null);
    expect(parsePriceValue(Infinity)).toBe(null);
  });

  it("parsea strings numéricos con coma o punto decimal", () => {
    expect(parsePriceValue("100")).toBe(100);
    expect(parsePriceValue("100.50")).toBe(100.5);
    expect(parsePriceValue("100,50")).toBe(100.5); // formato europeo/CO
  });

  it("rechaza strings vacíos o no numéricos", () => {
    expect(parsePriceValue("")).toBe(null);
    expect(parsePriceValue("   ")).toBe(null);
    expect(parsePriceValue("abc")).toBe(null);
  });

  it("rechaza otros tipos", () => {
    expect(parsePriceValue(null)).toBe(null);
    expect(parsePriceValue(undefined)).toBe(null);
    expect(parsePriceValue({})).toBe(null);
    expect(parsePriceValue(true)).toBe(null);
  });
});

describe("normalizePriceListId", () => {
  it("string trimmed", () => {
    expect(normalizePriceListId("  10  ")).toBe("10");
  });
  it("number a string", () => {
    expect(normalizePriceListId(42)).toBe("42");
    expect(normalizePriceListId(0)).toBe("0");
  });
  it("null/undefined a empty string", () => {
    expect(normalizePriceListId(null)).toBe("");
    expect(normalizePriceListId(undefined)).toBe("");
  });
  it("otros tipos a empty string", () => {
    expect(normalizePriceListId({})).toBe("");
    expect(normalizePriceListId(true)).toBe("");
    expect(normalizePriceListId([])).toBe("");
  });
});

describe("resolvePriceListId", () => {
  it("prefiere priceListId over priceList.id over id", () => {
    expect(resolvePriceListId({ priceListId: "1", priceList: { id: "2" }, id: "3" })).toBe("1");
  });
  it("cae a priceList.id cuando priceListId falta", () => {
    expect(resolvePriceListId({ priceList: { id: "2" }, id: "3" })).toBe("2");
  });
  it("cae a id cuando faltan priceListId y priceList", () => {
    expect(resolvePriceListId({ id: "3" })).toBe("3");
  });
  it("empty string cuando no hay ninguno", () => {
    expect(resolvePriceListId({})).toBe("");
  });
  it("ignora priceListId vacío y cae al fallback", () => {
    expect(resolvePriceListId({ priceListId: "", id: "3" })).toBe("3");
  });
});

describe("resolveAlegraInventoryQuantity", () => {
  it("suma availableQuantity de todos los warehouses", () => {
    const inv = { warehouses: [{ availableQuantity: 10 }, { availableQuantity: 5 }, { availableQuantity: 3 }] };
    expect(resolveAlegraInventoryQuantity(inv)).toBe(18);
  });

  it("cae a quantity si falta availableQuantity en warehouse", () => {
    const inv = { warehouses: [{ availableQuantity: 10 }, { quantity: 7 }] };
    expect(resolveAlegraInventoryQuantity(inv)).toBe(17);
  });

  it("ignora warehouses con valores no numéricos", () => {
    const inv = { warehouses: [{ availableQuantity: 10 }, { availableQuantity: "abc" }, { availableQuantity: null }] };
    expect(resolveAlegraInventoryQuantity(inv)).toBe(10);
  });

  it("cae a inventory.availableQuantity si no hay warehouses", () => {
    expect(resolveAlegraInventoryQuantity({ availableQuantity: 42 })).toBe(42);
  });

  it("cae a inventory.quantity si no hay availableQuantity ni warehouses", () => {
    expect(resolveAlegraInventoryQuantity({ quantity: 15 })).toBe(15);
  });

  it("retorna null si inventory es null/undefined", () => {
    expect(resolveAlegraInventoryQuantity(null)).toBe(null);
    expect(resolveAlegraInventoryQuantity(undefined)).toBe(null);
  });

  it("retorna null cuando ninguna cantidad es finita", () => {
    expect(resolveAlegraInventoryQuantity({ availableQuantity: "abc" })).toBe(null);
  });

  it("array de warehouses vacío cae al fallback de top-level", () => {
    expect(resolveAlegraInventoryQuantity({ warehouses: [], availableQuantity: 25 })).toBe(25);
  });

  it("soporta cantidades negativas (correcciones de stock)", () => {
    expect(resolveAlegraInventoryQuantity({ warehouses: [{ availableQuantity: -5 }] })).toBe(-5);
  });
});
