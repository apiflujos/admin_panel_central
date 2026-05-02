import {
  extractAlegraIdentifiers,
  isAlegraStatusInactive,
  resolveAlegraAvailableQuantity,
  resolvePublishEligibility,
  shouldSkipAlegraInventoryByWarehouse,
} from "./alegra";

describe("domain/alegra", () => {
  it("extrae identificadores sin duplicados", () => {
    expect(
      extractAlegraIdentifiers({
        code: "REF-1",
        reference: "REF-1",
        barcode: "BAR-1",
        customFields: [{ name: "Codigo de barras", value: "BAR-1" }],
      })
    ).toEqual(["REF-1", "BAR-1"]);
  });

  it("suma inventario por bodegas permitidas", () => {
    expect(
      resolveAlegraAvailableQuantity(
        {
          warehouses: [
            { id: 1, availableQuantity: 3 },
            { id: 2, availableQuantity: 5 },
          ],
        },
        ["2"]
      )
    ).toBe(5);
  });

  it("detecta cuando el item debe filtrarse por bodegas", () => {
    expect(
      shouldSkipAlegraInventoryByWarehouse(
        {
          warehouses: [{ id: 1, availableQuantity: 2 }],
        },
        ["9"]
      )
    ).toBe(true);
  });

  it("resuelve elegibilidad de publicacion segun estado y stock", () => {
    expect(isAlegraStatusInactive("inactive")).toBe(true);
    expect(
      resolvePublishEligibility({
        status: "active",
        availableQuantity: 2,
        publishOnStock: true,
      })
    ).toBe(true);
    expect(
      resolvePublishEligibility({
        status: "inactive",
        availableQuantity: 10,
        publishOnStock: false,
      })
    ).toBe(false);
  });
});
