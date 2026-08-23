import {
  buildAlegraItemDisplayName,
  coerceDecimal,
  pickShopifyVariantIdentifier,
  resolveAlegraWarehouseQuantityFromRecord,
} from "./shopify-product-sync";

describe("domain/shopify-product-sync", () => {
  it("prioriza SKU cuando la regla lo indica", () => {
    expect(pickShopifyVariantIdentifier({ sku: "SKU-1", barcode: "BAR-1" }, ["sku", "barcode"])).toEqual({
      identifier: "SKU-1",
      sku: "SKU-1",
    });
  });

  it("puede usar barcode si es la prioridad", () => {
    expect(pickShopifyVariantIdentifier({ sku: "SKU-1", barcode: "BAR-1" }, ["barcode", "sku"])).toEqual({
      identifier: "BAR-1",
      sku: "SKU-1",
    });
  });

  it("arma un nombre de item consistente para Alegra", () => {
    expect(buildAlegraItemDisplayName("Merida", "35")).toBe("Merida - 35");
    expect(buildAlegraItemDisplayName("Merida", "Default Title")).toBe("Merida");
  });

  it("resuelve cantidad de una bodega puntual", () => {
    expect(
      resolveAlegraWarehouseQuantityFromRecord(
        {
          warehouses: [
            { id: 10, availableQuantity: 4 },
            { id: 20, availableQuantity: 7 },
          ],
        },
        "20"
      )
    ).toBe(7);
  });

  it("convierte strings decimales a numero", () => {
    expect(coerceDecimal("12,5")).toBe(12.5);
    expect(coerceDecimal("")).toBeNull();
  });
});
