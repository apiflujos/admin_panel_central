import {
  SHOPIFY_WAREHOUSE_COMPONENTS,
  SHOPIFY_WAREHOUSE_NAME,
  hasPositiveInventory,
  resolveSelectedInventoryQuantity,
  resolveInventoryWarehouseSelection,
  sumWarehouseInventory,
} from "./inventory";

describe("domain/inventory", () => {
  const stock = {
    "Bodega Granada": 2,
    "Bodega Holguines": 1,
    "Bodega La Leyenda": 3,
    "Bodega Barranquilla": 4,
    "Bodega Principal": 9,
  };

  it("suma las 4 bodegas que alimentan Shopify", () => {
    expect(sumWarehouseInventory(stock, SHOPIFY_WAREHOUSE_COMPONENTS)).toBe(10);
    expect(resolveSelectedInventoryQuantity(stock, SHOPIFY_WAREHOUSE_NAME)).toBe(10);
  });

  it("reconoce aliases de la bodega compuesta", () => {
    expect(resolveInventoryWarehouseSelection("shopify")).toEqual({
      warehouse: SHOPIFY_WAREHOUSE_NAME,
      components: SHOPIFY_WAREHOUSE_COMPONENTS,
    });
  });

  it("permite validar si existe inventario positivo", () => {
    expect(hasPositiveInventory(stock)).toBe(true);
    expect(hasPositiveInventory(stock, SHOPIFY_WAREHOUSE_COMPONENTS)).toBe(true);
    expect(hasPositiveInventory({ "Bodega Granada": 0 }, SHOPIFY_WAREHOUSE_COMPONENTS)).toBe(false);
  });
});
