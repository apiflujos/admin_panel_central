import { beforeEach, describe, expect, it, vi } from "vitest";

const { poolQueryMock, getPoolMock, getOrgIdMock } = vi.hoisted(() => ({
  poolQueryMock: vi.fn(),
  getPoolMock: vi.fn(),
  getOrgIdMock: vi.fn(),
}));

vi.mock("../db", () => ({
  getPool: getPoolMock,
  getOrgId: getOrgIdMock,
}));

import { resetCollisionStatsForTests, upsertProduct } from "./products.service";

describe("upsertProduct — safeguard cross-key collision (H6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // El agregador de colisiones guarda estado por tienda a nivel de módulo:
    // sin resetearlo, el segundo caso cae en la rama agrupada y no avisa.
    resetCollisionStatsForTests();
    getOrgIdMock.mockReturnValue(1);
    getPoolMock.mockReturnValue({ query: poolQueryMock });
  });

  it("preserva alegra_item_id existente cuando el SKU matched trae un id distinto", async () => {
    // SELECT existing: match por SKU pero con alegra_item_id previo distinto
    poolQueryMock.mockResolvedValueOnce({
      rows: [{ id: 42, alegra_item_id: "ALEGRA_ORIGINAL", shopify_product_id: null }],
    });
    // UPDATE: solo verificamos que los args pasados NO reemplacen el alegra_item_id
    poolQueryMock.mockResolvedValueOnce({});

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await upsertProduct({
      shopDomain: "mitienda.myshopify.com",
      alegraId: "ALEGRA_NUEVO", // distinto del existente
      sku: "SKU-COMPARTIDO",
      name: "Producto",
    });

    // La primera call es el SELECT, la segunda el UPDATE.
    expect(poolQueryMock).toHaveBeenCalledTimes(2);
    const updateArgs = poolQueryMock.mock.calls[1][1] as unknown[];
    // alegraId es param $3 → índice 2 en el array.
    expect(updateArgs[2]).toBe(null); // safeAlegraId debe ser null (preserva existente)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("cross-key collision")
    );
    warnSpy.mockRestore();
  });

  it("preserva shopify_product_id existente si el incoming es distinto", async () => {
    poolQueryMock.mockResolvedValueOnce({
      rows: [{ id: 99, alegra_item_id: null, shopify_product_id: "SHOPIFY_ORIGINAL" }],
    });
    poolQueryMock.mockResolvedValueOnce({});

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await upsertProduct({
      shopDomain: "mitienda.myshopify.com",
      shopifyId: "SHOPIFY_NUEVO",
      sku: "SKU-COMPARTIDO",
    });
    const updateArgs = poolQueryMock.mock.calls[1][1] as unknown[];
    expect(updateArgs[3]).toBe(null); // safeShopifyId debe ser null (preserva)
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("permite actualizar cuando el alegra_id incoming coincide con el existente", async () => {
    poolQueryMock.mockResolvedValueOnce({
      rows: [{ id: 1, alegra_item_id: "SAME_ID", shopify_product_id: null }],
    });
    poolQueryMock.mockResolvedValueOnce({});

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await upsertProduct({
      shopDomain: "mitienda.myshopify.com",
      alegraId: "SAME_ID",
      sku: "SKU-1",
    });
    const updateArgs = poolQueryMock.mock.calls[1][1] as unknown[];
    expect(updateArgs[2]).toBe("SAME_ID"); // se propaga (no hay conflicto)
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("skip si faltan todos los identificadores", async () => {
    const result = await upsertProduct({ shopDomain: "mitienda.myshopify.com" });
    expect(result).toEqual({ skipped: true, reason: "missing_identifiers" });
    expect(poolQueryMock).not.toHaveBeenCalled();
  });

  it("mode insert_only + row existente => skip", async () => {
    poolQueryMock.mockResolvedValueOnce({
      rows: [{ id: 5, alegra_item_id: "X", shopify_product_id: null }],
    });
    const result = await upsertProduct(
      { shopDomain: "mitienda.myshopify.com", alegraId: "X" },
      { mode: "insert_only" }
    );
    expect(result).toEqual({ skipped: true, reason: "insert_only" });
  });
});
