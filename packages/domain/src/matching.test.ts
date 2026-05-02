import { candidateSkuKeys, normalizeIdentifier, pickBestVariant, scoreVariantForReference } from "./matching";

describe("domain/matching", () => {
  const row = {
    reference: "BEAB3C0014",
    parentName: "MERIDA - CAFE",
    variantLabel: "35",
    name: "MERIDA - CAFE / 35",
  };

  const variant = {
    productId: "gid://shopify/Product/1",
    productTitle: "Merida - Cafe",
    productStatus: "ACTIVE",
    variantId: "gid://shopify/ProductVariant/1",
    variantTitle: "35",
    sku: "BEAB3C001435",
    barcode: "",
    selectedOptions: ["35"],
  };

  it("genera candidatos de SKU consistentes", () => {
    expect(candidateSkuKeys("BEAB3C0014", "35")).toContain("BEAB3C001435");
    expect(normalizeIdentifier("beab3c0014-35")).toBe("BEAB3C001435");
  });

  it("prioriza evidencia explicita de talla y nombre", () => {
    expect(scoreVariantForReference(row, variant)).toBeGreaterThan(0);
  });

  it("recupera una variante por fallback reference + talla", () => {
    expect(
      pickBestVariant(row, {
        exactSku: new Map(),
        exactBarcode: new Map(),
        byReferenceStem: new Map([["BEAB3C0014", [variant]]]),
      })
    ).toEqual({
      variant,
      strategy: "reference_size_fallback",
      score: expect.any(Number),
    });
  });
});
