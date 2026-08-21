import { describe, expect, it } from "vitest";

import { DEFAULT_OUT_OF_STOCK_BEHAVIOR, OUT_OF_STOCK_BEHAVIORS, normalizeOutOfStockBehavior } from "./inventory";

describe("política de productos sin existencias", () => {
  it("por omisión marca AGOTADO, no despublica", () => {
    // Despublicar pierde el posicionamiento del producto y rompe sus enlaces.
    // Agotado cumple igual la regla de no sobrevender (el inventario queda en
    // cero) sin ese daño colateral.
    expect(DEFAULT_OUT_OF_STOCK_BEHAVIOR).toBe("mark_sold_out");
  });

  it("un valor ausente o basura cae al comportamiento menos destructivo", () => {
    expect(normalizeOutOfStockBehavior(undefined)).toBe("mark_sold_out");
    expect(normalizeOutOfStockBehavior(null)).toBe("mark_sold_out");
    expect(normalizeOutOfStockBehavior("")).toBe("mark_sold_out");
    expect(normalizeOutOfStockBehavior("despublicar")).toBe("mark_sold_out");
    expect(normalizeOutOfStockBehavior(true)).toBe("mark_sold_out");
    expect(normalizeOutOfStockBehavior(1)).toBe("mark_sold_out");
  });

  it("respeta los dos valores válidos", () => {
    expect(normalizeOutOfStockBehavior("unpublish")).toBe("unpublish");
    expect(normalizeOutOfStockBehavior("mark_sold_out")).toBe("mark_sold_out");
    expect([...OUT_OF_STOCK_BEHAVIORS]).toEqual(["mark_sold_out", "unpublish"]);
  });

  it("permite forzar otro valor por omisión de forma explícita", () => {
    expect(normalizeOutOfStockBehavior(undefined, "unpublish")).toBe("unpublish");
  });
});
